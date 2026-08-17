import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const WALK = require('../../assets/images/dox-walk.gif');
const GLASS = require('../../assets/images/dox-glass.png');

const FIRST_MS = 12_000;
const EVERY_MS = 40 * 60 * 1000;
const JITTER_MS = 8 * 60 * 1000;
const TOTAL_MS = 3000;
const IN_MS = 620;
const OUT_START_MS = 2320;
const ACTOR_W = 108;
const ACTOR_H = 96;

function nextWait(base: number) {
  return Math.max(12_000, base + Math.round((Math.random() * 2 - 1) * JITTER_MS));
}

export function GlassPup() {
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);
  const bob = useSharedValue(0);
  const startX = useSharedValue(-ACTOR_W);
  const restX = useSharedValue(12);
  const endX = useSharedValue(-ACTOR_W);
  const restY = useSharedValue(180);
  const flipIn = useSharedValue(-1);
  const flipOut = useSharedValue(1);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(
        setTimeout(() => {
          if (!cancelled) fn();
        }, ms),
      );
    };

    const play = () => {
      const padX = 16;
      const padY = 56;
      const maxX = Math.max(padX, width - ACTOR_W - padX);
      const maxY = Math.max(padY, height - ACTOR_H - padY - 80);
      const rest = padX + Math.random() * Math.max(8, maxX - padX);
      const y = padY + Math.random() * Math.max(8, maxY - padY);
      const fromLeft = rest < width / 2;
      const off = fromLeft ? -ACTOR_W - 8 : width + 8;
      startX.value = off;
      restX.value = rest;
      endX.value = off;
      restY.value = y;
      flipIn.value = fromLeft ? -1 : 1;
      flipOut.value = fromLeft ? 1 : -1;
      t.value = 0;
      cancelAnimation(bob);
      bob.value = 0;
      bob.value = withRepeat(withTiming(1, { duration: 150, easing: Easing.linear }), -1, true);
      t.value = withTiming(1, { duration: TOTAL_MS, easing: Easing.linear });
      later(() => {
        cancelAnimation(bob);
        bob.value = 0;
      }, IN_MS);
      later(() => {
        bob.value = withRepeat(withTiming(1, { duration: 150, easing: Easing.linear }), -1, true);
      }, OUT_START_MS);
      later(() => {
        cancelAnimation(bob);
        bob.value = 0;
        schedule();
      }, TOTAL_MS + 40);
    };

    const schedule = () => later(play, nextWait(EVERY_MS));
    later(play, FIRST_MS);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      cancelAnimation(bob);
      cancelAnimation(t);
      t.value = 0;
      bob.value = 0;
    };
  }, [bob, endX, flipIn, flipOut, height, restX, restY, startX, t, width]);

  const actor = useAnimatedStyle(() => {
    const onGlass = interpolate(t.value, [0.2, 0.3, 0.7, 0.8], [0, 1, 1, 0], Extrapolation.CLAMP);
    const x = interpolate(
      t.value,
      [0, 0.22, 0.82, 1],
      [startX.value, restX.value, restX.value, endX.value],
      Extrapolation.CLAMP,
    );
    const walkBob = Math.sin(bob.value * Math.PI) * 2.2 * (1 - onGlass);
    return {
      transform: [{ translateX: x }, { translateY: restY.value + walkBob }],
    };
  });

  const walkStyle = useAnimatedStyle(() => {
    const face = interpolate(t.value, [0.76, 0.82], [flipIn.value, flipOut.value], Extrapolation.CLAMP);
    return {
      opacity: interpolate(t.value, [0.2, 0.32, 0.68, 0.8], [1, 0, 0, 1], Extrapolation.CLAMP),
      transform: [{ scaleX: face }],
    };
  });

  const glassStyle = useAnimatedStyle(() => {
    const on = interpolate(t.value, [0.2, 0.34, 0.68, 0.8], [0, 1, 1, 0], Extrapolation.CLAMP);
    return {
      opacity: on,
      transform: [{ scale: interpolate(on, [0, 1], [0.86, 1], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View pointerEvents="none" style={styles.root} collapsable={false}>
      <Animated.View style={[styles.actor, actor]} collapsable={false}>
        <Animated.View style={[styles.layer, walkStyle]}>
          <Image source={WALK} style={styles.walk} contentFit="contain" autoplay />
        </Animated.View>
        <Animated.View style={[styles.layer, glassStyle]}>
          <Image source={GLASS} style={styles.glass} contentFit="contain" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
  },
  actor: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ACTOR_W,
    height: ACTOR_H,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  walk: {
    width: ACTOR_W,
    height: 54,
  },
  glass: {
    width: 78,
    height: 96,
  },
});
