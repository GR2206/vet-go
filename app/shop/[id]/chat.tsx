import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { places } from '@/data/mock';
import type { ShopMessage } from '@/data/types';
import { threadPetFromCartilla } from '@/lib/active-pet';
import { chatTutorKey } from '@/lib/chat-tutor-key';
import { chatThreadId, fetchLiveCatalog, isFirebaseConfigured, pushThreadPet } from '@/lib/live-catalog';
import { resolvePlace } from '@/lib/place';
import { responseSpeedLabel } from '@/lib/shop';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export default function ShopChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, placePhotos, placeAvatars, shopChats, sendShopMessage, mergeShopChatFromLive, pet } =
    useApp();
  const [text, setText] = useState('');
  const [syncIssue, setSyncIssue] = useState(false);
  const listRef = useRef<FlatList<ShopMessage>>(null);
  const petStamp = useRef('');
  const raw = places.find((p) => p.id === id);
  const shop = raw ? resolvePlace(raw, placePhotos, placeAvatars) : undefined;
  const thread = shop ? (shopChats[shop.id] ?? []) : [];
  const me = user?.name?.split(' ')[0] || 'Vos';

  const scrollToEnd = useCallback(() => {
    if (!thread.length) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [thread.length]);

  const pullThread = useCallback(async () => {
    if (!shop) return;
    const tutorKey = chatTutorKey(user, me);
    try {
      const file = await fetchLiveCatalog();
      setSyncIssue(false);
      const threads = file.shops[shop.id]?.threads ?? [];
      const threadId = chatThreadId(shop.id, tutorKey);
      const own = threads.find((t) => t.id === threadId);
      if (own?.messages?.length) mergeShopChatFromLive(shop.id, own.messages);
      const petMeta = threadPetFromCartilla(pet);
      if (own && petMeta) {
        const key = `${own.id}:${petMeta.petName}:${petMeta.petSpecies ?? ''}`;
        if (petStamp.current !== key && (own.petName !== petMeta.petName || own.petSpecies !== petMeta.petSpecies)) {
          petStamp.current = key;
          void pushThreadPet({
            shopId: shop.id,
            threadId: own.id,
            petName: petMeta.petName,
            petSpecies: petMeta.petSpecies,
          });
        }
      }
    } catch {
      setSyncIssue(true);
    }
  }, [shop, user, me, pet, mergeShopChatFromLive]);

  useEffect(() => {
    void pullThread();
    const t = setInterval(() => void pullThread(), 2500);
    return () => clearInterval(t);
  }, [pullThread]);

  useEffect(() => {
    scrollToEnd();
  }, [thread, scrollToEnd]);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', scrollToEnd);
    return () => sub.remove();
  }, [scrollToEnd]);

  if (!shop) {
    return (
      <View style={styles.missing}>
        <Text style={styles.meta}>No encontramos este local.</Text>
      </View>
    );
  }

  const send = () => {
    const body = text.trim();
    if (body.length < 2) return;
    sendShopMessage(shop.id, { from: 'user', author: me, text: body });
    setText('');
    scrollToEnd();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackLink />
        <View style={styles.headRow}>
          <Image source={{ uri: shop.avatarUri }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{shop.name}</Text>
            <Text style={styles.speed}>{responseSpeedLabel(shop.responseMins)}</Text>
          </View>
        </View>
        <Text style={styles.legend}>
          Chat con el local. Responden dueños o empleados desde su panel (PIN del comercio).
        </Text>
        {syncIssue ? (
          <Text style={styles.syncWarn}>
            {isFirebaseConfigured()
              ? 'Sin conexión a Firebase. Revisá EXPO_PUBLIC_FIREBASE_* en .env y reiniciá Expo.'
              : 'Sin conexión al panel. Activá Firebase en .env para usar la app fuera de tu casa.'}
          </Text>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <FlatList
          ref={listRef}
          data={thread}
          keyExtractor={(m) => m.id}
          style={styles.flex}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={scrollToEnd}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Todavía no hay mensajes</Text>
              <Text style={styles.meta}>
                Escribí por stock, envío o un pedido. El local ve la conversación y responde desde su acceso.
              </Text>
            </View>
          }
          renderItem={({ item: m }) => {
            const mine = m.from === 'user';
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.who, mine && styles.whoMine]}>{mine ? m.author : shop.name}</Text>
                <Text style={[styles.msg, mine && styles.msgMine]}>{m.text}</Text>
                <Text style={[styles.time, mine && styles.timeMine]}>
                  {new Date(m.at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escribile al local…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            maxLength={800}
            onFocus={scrollToEnd}
          />
          <Button compact label="Enviar" onPress={send} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.cream,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  avatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.creamDeep },
  title: { fontFamily: fonts.sansExtra, fontSize: 18, color: colors.ink },
  speed: { fontFamily: fonts.sansSemi, color: colors.teal, marginTop: 2, fontSize: 12 },
  legend: { fontFamily: fonts.sans, color: colors.muted, marginTop: 10, fontSize: 13, lineHeight: 18 },
  syncWarn: {
    fontFamily: fonts.sansSemi,
    color: '#B42318',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  thread: { padding: 16, paddingBottom: 12, gap: 10, flexGrow: 1 },
  empty: { ...surface, padding: 16 },
  emptyTitle: { fontFamily: fonts.sansBold, color: colors.ink, marginBottom: 6 },
  meta: { fontFamily: fonts.sans, color: colors.muted, lineHeight: 20 },
  bubble: {
    maxWidth: '86%',
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 10,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.navy,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  who: { fontFamily: fonts.sansBold, color: colors.teal, fontSize: 11, marginBottom: 4 },
  whoMine: { color: 'rgba(255,255,255,0.72)' },
  msg: { fontFamily: fonts.sans, color: colors.ink, lineHeight: 20 },
  msgMine: { color: colors.white },
  time: { fontFamily: fonts.sans, color: colors.muted, fontSize: 11, marginTop: 6 },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    color: colors.ink,
    backgroundColor: colors.white,
  },
});
