import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { heroLandscapes } from '@/data/media';
import { dayPart } from '@/lib/today';
import { colors } from '@/theme/tokens';

export type HeroBackdropKind = 'landscapes' | 'linear';

const HOUR_TINT = {
  morning: 'rgba(255, 196, 140, 0.16)',
  afternoon: 'transparent',
  evening: 'rgba(232, 120, 64, 0.2)',
  night: 'rgba(8, 16, 32, 0.42)',
} as const;

export function HeroBackdrop({
  kind,
  scrollY,
}: {
  kind: HeroBackdropKind;
  scrollY?: SharedValue<number>;
}) {
  const [index, setIndex] = useState(0);
  const [part, setPart] = useState(dayPart);
  const [height, setHeight] = useState(Math.round(Dimensions.get('window').height * 0.5));

  useEffect(() => {
    Image.prefetch(heroLandscapes[0]).catch(() => undefined);
  }, []);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setHeight(Math.round(window.height * 0.5));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (kind !== 'landscapes') return;
    const t = setInterval(() => setIndex((i) => (i + 1) % heroLandscapes.length), 7000);
    return () => clearInterval(t);
  }, [kind]);

  useEffect(() => {
    const t = setInterval(() => setPart(dayPart()), 60_000);
    return () => clearInterval(t);
  }, []);

  const tint = HOUR_TINT[part];
  const rest = useSharedValue(0);
  const y = scrollY ?? rest;
  const drift = useAnimatedStyle(() => ({
    transform: [{ translateY: -y.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, { height }, drift]} pointerEvents="none" collapsable={false}>
      <View style={styles.scene}>
        {kind === 'linear' ? (
          <LinearSky />
        ) : (
          <Image
            source={{ uri: heroLandscapes[index] }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={{ duration: 900, effect: 'cross-dissolve', timing: 'ease-in-out' }}
          />
        )}
        {tint !== 'transparent' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
        ) : null}
      </View>
      <LinearGradient
        colors={['rgba(10,22,40,0.42)', 'rgba(10,22,40,0.16)', 'rgba(251,250,248,0.42)', colors.white]}
        locations={[0, 0.42, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function LinearSky() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#12263C', '#2A5A82', '#6FA0C4', '#D7E4EE', colors.white]}
        locations={[0, 0.28, 0.52, 0.78, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'transparent', 'rgba(10,22,40,0.18)']}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scene: {
    position: 'absolute',
    top: -16,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
