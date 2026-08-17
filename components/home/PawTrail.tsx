import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { PawMark } from '@/components/brand/PetSilhouettes';

type Heading = 'ltr' | 'rtl' | 'ttb' | 'btt' | 'se' | 'sw' | 'ne' | 'nw';

type Trail = {
  heading: Heading;
  lane: number;
};

const HEADINGS: Heading[] = ['ltr', 'rtl', 'ttb', 'btt', 'se', 'sw', 'ne', 'nw'];
const STEPS = 10;
const STEP_MS = 340;

const DIR: Record<Heading, { dx: number; dy: number }> = {
  ltr: { dx: 1, dy: 0 },
  rtl: { dx: -1, dy: 0 },
  ttb: { dx: 0, dy: 1 },
  btt: { dx: 0, dy: -1 },
  se: { dx: 1, dy: 1 },
  sw: { dx: -1, dy: 1 },
  ne: { dx: 1, dy: -1 },
  nw: { dx: -1, dy: -1 },
};

function unit(dx: number, dy: number) {
  const len = Math.hypot(dx, dy) || 1;
  return { dx: dx / len, dy: dy / len };
}

function pawPose(heading: Heading, t: number, lane: number, w: number, h: number, side: number) {
  const pad = 32;
  const { dx, dy } = unit(DIR[heading].dx, DIR[heading].dy);
  const span = Math.min(w, h) * 0.78;
  const startX =
    heading === 'rtl' || heading === 'sw' || heading === 'nw'
      ? w - pad
      : heading === 'ttb' || heading === 'btt'
        ? pad + lane * (w - pad * 2)
        : pad;
  const startY =
    heading === 'btt' || heading === 'ne' || heading === 'nw'
      ? h - pad
      : heading === 'ltr' || heading === 'rtl'
        ? pad + lane * (h - pad * 2)
        : pad;
  const stride = 11;
  const x = startX + dx * t * span + -dy * side * stride;
  const y = startY + dy * t * span + dx * side * stride;
  const rot = (Math.atan2(dx, -dy) * 180) / Math.PI + side * 7;
  return { x, y, rot };
}

function PawStep({
  index,
  trail,
  progress,
  width,
  height,
}: {
  index: number;
  trail: Trail;
  progress: SharedValue<number>;
  width: number;
  height: number;
}) {
  const t = (index + 0.15) / (STEPS - 0.2);
  const side = index % 2 === 0 ? 1 : -1;
  const { x, y, rot } = pawPose(trail.heading, t, trail.lane, width, height, side);
  const appear = (index * STEP_MS) / (STEPS * STEP_MS + 1600);
  const fadeOut = (STEPS * STEP_MS) / (STEPS * STEP_MS + 1600);

  const fade = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [appear, appear + 0.05, fadeOut, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View style={[styles.paw, { left: x - 9, top: y - 9 }, fade]}>
      <View style={{ transform: [{ rotate: `${rot}deg` }] }}>
        <PawMark size={18} color="#141414" />
      </View>
    </Animated.View>
  );
}

export function PawTrail({ active }: { active: boolean }) {
  const { width, height } = useWindowDimensions();
  const [trail, setTrail] = useState<Trail>({ heading: 'ltr', lane: 0.4 });
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(setTimeout(() => {
        if (!cancelled) fn();
      }, ms));
    };
    const rest = () => 14000 + Math.round(Math.random() * 10000);
    const visible = STEPS * STEP_MS + 1600;

    const show = () => {
      progress.value = 0;
      setTrail({
        heading: HEADINGS[Math.floor(Math.random() * HEADINGS.length)],
        lane: 0.18 + Math.random() * 0.64,
      });
      later(() => {
        progress.value = withTiming(1, {
          duration: visible,
          easing: Easing.linear,
        });
        later(() => {
          progress.value = 0;
          later(show, rest());
        }, visible + 80);
      }, 32);
    };

    later(show, 4000 + Math.round(Math.random() * 3000));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      progress.value = 0;
    };
  }, [active, progress]);

  return (
    <View pointerEvents="none" style={styles.wrap} collapsable={false}>
      {Array.from({ length: STEPS }, (_, i) => (
        <PawStep
          key={i}
          index={i}
          trail={trail}
          progress={progress}
          width={width}
          height={height}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
  },
  paw: {
    position: 'absolute',
  },
});
