import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { useApp } from '@/store/app-store';
import { colors, fonts } from '@/theme/tokens';

export default function IntroScreen() {
  const router = useRouter();
  const { ready, onboarded, loggedIn, ensureOrigin } = useApp();

  const goNext = useCallback(() => {
    if (!ready) return;
    Haptics.selectionAsync().catch(() => undefined);
    if (!loggedIn) {
      router.replace('/login' as never);
      return;
    }
    router.replace(onboarded ? '/(tabs)' : '/(onboarding)');
  }, [loggedIn, onboarded, ready, router]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      await ensureOrigin();
      if (cancelled) return;
      const wait = onboarded && loggedIn ? 700 : 1100;
      t = setTimeout(goNext, wait);
    })();
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [ensureOrigin, goNext, loggedIn, onboarded, ready]);

  return (
    <Pressable style={styles.root} onPress={goNext}>
      <StatusBar style="dark" />
      <Animated.View entering={FadeIn.duration(700)} style={styles.mark}>
        <Image
          source={require('../assets/images/petsgo-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>
      <Animated.Text entering={FadeInUp.duration(500).delay(280)} style={styles.tag}>
        Cuidado veterinario y petshop
      </Animated.Text>
      <View style={styles.footer}>
        <Text style={styles.company}>GR PRODUCCIONES</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  mark: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  tag: {
    marginTop: 8,
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 42,
    alignItems: 'center',
    gap: 4,
  },
  company: {
    fontFamily: fonts.sansSemi,
    color: colors.teal,
    letterSpacing: 3,
    fontSize: 11,
  },
});
