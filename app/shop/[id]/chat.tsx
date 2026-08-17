import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { places } from '@/data/mock';
import { resolvePlace } from '@/lib/place';
import { responseSpeedLabel } from '@/lib/shop';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export default function ShopChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, placePhotos, placeAvatars, shopChats, sendShopMessage } = useApp();
  const [text, setText] = useState('');
  const raw = places.find((p) => p.id === id);
  const shop = raw ? resolvePlace(raw, placePhotos, placeAvatars) : undefined;
  const thread = shop ? (shopChats[shop.id] ?? []) : [];
  const me = user?.name?.split(' ')[0] || 'Vos';

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
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <BackLink />
        <View style={styles.headRow}>
          <Image source={{ uri: shop.avatarUri }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{shop.name}</Text>
            <Text style={styles.speed}>{responseSpeedLabel(shop.responseMins)}</Text>
          </View>
        </View>
        <Text style={styles.legend}>
          Chat con el local. Responden dueños o empleados desde su panel (PIN del comercio).{' '}
          {responseSpeedLabel(shop.responseMins)}.
        </Text>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
          {thread.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Todavía no hay mensajes</Text>
              <Text style={styles.meta}>
                Escribí por stock, envío o un pedido. El local ve la conversación y responde desde su acceso.
              </Text>
            </View>
          ) : (
            thread.map((m) => {
              const mine = m.from === 'user';
              return (
                <View key={m.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.who, mine && styles.whoMine]}>{mine ? m.author : shop.name}</Text>
                  <Text style={[styles.msg, mine && styles.msgMine]}>{m.text}</Text>
                  <Text style={[styles.time, mine && styles.timeMine]}>
                    {new Date(m.at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escribile al local…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
          <Button compact label="Enviar" onPress={send} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.cream,
  },
  back: { fontFamily: fonts.sansSemi, color: colors.teal, marginBottom: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.creamDeep },
  title: { fontFamily: fonts.sansExtra, fontSize: 18, color: colors.ink },
  speed: { fontFamily: fonts.sansSemi, color: colors.teal, marginTop: 2, fontSize: 12 },
  legend: { fontFamily: fonts.sans, color: colors.muted, marginTop: 10, fontSize: 13, lineHeight: 18 },
  thread: { padding: 16, paddingBottom: 20, gap: 10 },
  empty: { ...surface, padding: 16 },
  emptyTitle: { fontFamily: fonts.sansBold, color: colors.ink, marginBottom: 6 },
  meta: { fontFamily: fonts.sans, color: colors.muted, lineHeight: 20 },
  bubble: {
    maxWidth: '86%',
    padding: 12,
    borderRadius: radius.md,
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
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    color: colors.ink,
  },
});
