import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, type ComponentProps } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { MetalFill } from '@/components/ui/MetalFill';
import { openContactEmail } from '@/lib/contact';
import { colors, fonts } from '@/theme/tokens';

export type WheelOrigin = { x: number; y: number };

const RADIUS = 122;
const ITEM = 62;
const DOT = 53;
const HUB = 56;
const TWO_PI = Math.PI * 2;
const SOFT = { damping: 20, stiffness: 150, mass: 0.72 };

const ACTIONS = [
  { label: 'Turno', icon: 'calendar' as const, to: '/booking/san-martin' },
  { label: 'Guardia', icon: 'stethoscope' as const, to: '/consult' },
  { label: 'Pasear', icon: 'paw' as const, to: '/walkers' },
  { label: 'Avisos', icon: 'bell' as const, to: '/pending' },
  { label: 'Perfil', icon: 'user' as const, to: '/account' },
  { label: 'Contacto', icon: 'envelope' as const, to: 'contact' },
];

const N = ACTIONS.length;
const STEP = TWO_PI / N;

export function PlusArc({ size = HUB }: { size?: number }) {
  const mid = size / 2;
  const r = mid - 1.5;
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path
        d={`M 1.5 ${mid} A ${r} ${r} 0 0 0 ${size - 1.5} ${mid}`}
        stroke="rgba(255,255,255,0.92)"
        strokeWidth={1.35}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function QuickActions({
  open,
  origin,
  onClose,
}: {
  open: boolean;
  origin: WheelOrigin;
  onClose: () => void;
}) {
  const router = useRouter();
  const progress = useSharedValue(0);
  const rot = useSharedValue(0);
  const dragStart = useRef(0);

  useEffect(() => {
    progress.value = open
      ? withSpring(1, SOFT)
      : withTiming(0, { duration: 220, easing: Easing.inOut(Easing.cubic) });
    if (open) rot.value = 0;
  }, [open, progress, rot]);

  const go = (to: string) => {
    onClose();
    if (to === 'contact') {
      openContactEmail();
      return;
    }
    router.push(to as never);
  };

  const snap = (value: number) => {
    const next = Math.round(value / STEP) * STEP;
    rot.value = withSpring(next, SOFT);
    Haptics.selectionAsync().catch(() => undefined);
  };

  const rotateTo = (index: number) => {
    const k = Math.round((rot.value - index * STEP) / TWO_PI);
    const target = index * STEP + k * TWO_PI;
    const front = Math.cos(index * STEP - rot.value) > 0.82;
    if (front) {
      go(ACTIONS[index].to);
      return;
    }
    rot.value = withSpring(target, SOFT);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStart.current = rot.value;
        },
        onPanResponderMove: (_, g) => {
          rot.value = dragStart.current - (g.dx / 72) * STEP;
        },
        onPanResponderRelease: (e, g) => {
          if (Math.abs(g.dx) < 12 && Math.abs(g.dy) < 12) {
            const { pageX, pageY } = e.nativeEvent;
            let best = -1;
            let bestD = 50;
            for (let i = 0; i < N; i += 1) {
              const a = i * STEP - rot.value;
              if (Math.cos(a) < 0.12) continue;
              const x = origin.x + Math.sin(a) * RADIUS;
              const y = origin.y - Math.cos(a) * RADIUS;
              const d = Math.hypot(pageX - x, pageY - y);
              if (d < bestD) {
                bestD = d;
                best = i;
              }
            }
            if (best >= 0) rotateTo(best);
            return;
          }
          snap(rot.value - (g.vx / 10) * STEP);
        },
      }),
    [origin.x, origin.y],
  );

  const dimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const hubStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.14, 1], [0, 1, 1]),
  }));

  return (
    <View
      style={styles.root}
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityViewIsModal={open}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[styles.dim, dimStyle]} />
      </Pressable>

      <View
        {...pan.panHandlers}
        style={[
          styles.pad,
          { left: origin.x - 170, top: origin.y - 200, width: 340, height: 220, zIndex: 3 },
        ]}
      />

      <Halo progress={progress} origin={origin} />

      {ACTIONS.map((a, i) => (
        <Spoke
          key={a.label}
          index={i}
          progress={progress}
          rot={rot}
          origin={origin}
          icon={a.icon}
          label={a.label}
        />
      ))}

      <Animated.View
        style={[styles.hub, hubStyle, { left: origin.x - HUB / 2, top: origin.y - HUB / 2 }]}
      >
        <Pressable onPress={onClose} style={styles.hubHit} accessibilityLabel="Cerrar">
          <MetalFill style={styles.fab} contentStyle={styles.fabInner}>
            <Text style={styles.plus}>+</Text>
          </MetalFill>
          <PlusArc />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Halo({
  progress,
  origin,
}: {
  progress: SharedValue<number>;
  origin: WheelOrigin;
}) {
  const pad = 28;
  const size = RADIUS * 2 + pad * 2;
  const cx = size / 2;
  const r = RADIUS;
  const d = `M ${cx - r} ${cx} A ${r} ${r} 0 0 1 ${cx + r} ${cx}`;
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.86, 1]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.halo, { left: origin.x - cx, top: origin.y - cx, width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        <Path d={d} stroke="rgba(255,255,255,0.06)" strokeWidth={28} fill="none" strokeLinecap="round" />
        <Path d={d} stroke="rgba(255,255,255,0.1)" strokeWidth={16} fill="none" strokeLinecap="round" />
        <Path d={d} stroke="rgba(255,255,255,0.16)" strokeWidth={7} fill="none" strokeLinecap="round" />
        <Path d={d} stroke="rgba(255,255,255,0.28)" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

function Spoke({
  index,
  progress,
  rot,
  origin,
  icon,
  label,
}: {
  index: number;
  progress: SharedValue<number>;
  rot: SharedValue<number>;
  origin: WheelOrigin;
  icon: ComponentProps<typeof FontAwesome>['name'];
  label: string;
}) {
  const flicker = useSharedValue(0);

  useEffect(() => {
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 480, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.28, { duration: 720, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.82, { duration: 360, easing: Easing.out(Easing.sin) }),
        withTiming(0.4, { duration: 540, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [flicker]);

  const style = useAnimatedStyle(() => {
    const a = index * STEP - rot.value;
    const front = Math.cos(a);
    const p = progress.value;
    const show = interpolate(front, [-0.12, 0.4, 1], [0, 0.35, 1]);
    const scale = interpolate(front, [-0.12, 1], [0.5, 1.08]);
    const active = interpolate(front, [0.78, 0.94, 1], [0, 0.7, 1], Extrapolation.CLAMP);
    return {
      opacity: show * p,
      zIndex: front > 0 ? 2 : 0,
      transform: [
        { translateX: Math.sin(a) * RADIUS * p },
        { translateY: -Math.cos(a) * RADIUS * p },
        { scale: scale * (0.62 + 0.38 * p) * (1 + active * 0.06) },
      ],
    };
  });

  const aura = useAnimatedStyle(() => {
    const front = Math.cos(index * STEP - rot.value);
    const active = interpolate(front, [0.72, 0.92, 1], [0, 0.55, 1], Extrapolation.CLAMP);
    const pulse = 0.74 + flicker.value * 0.38;
    return {
      opacity: interpolate(active * progress.value * pulse, [0, 0.83], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(front, [0.72, 1], [0.78, 1.12], Extrapolation.CLAMP) }],
    };
  });

  const ring = useAnimatedStyle(() => {
    const front = Math.cos(index * STEP - rot.value);
    return {
      borderColor: interpolateColor(front, [-1, 0.75, 0.96, 1], [
        'rgba(255,255,255,0.22)',
        'rgba(255,255,255,0.22)',
        'rgba(255, 228, 150, 0.66)',
        'rgba(255, 236, 176, 1)',
      ]),
    };
  });

  const capStyle = useAnimatedStyle(() => {
    const front = Math.cos(index * STEP - rot.value);
    const active = interpolate(front, [0.8, 0.95, 1], [0, 0.55, 1], Extrapolation.CLAMP);
    return { opacity: active * progress.value };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.spoke, { left: origin.x - ITEM / 2, top: origin.y - ITEM / 2 }, style]}
    >
      <View style={styles.dotWrap}>
        <Animated.Text style={[styles.caption, capStyle]}>{label}</Animated.Text>
        <Animated.View style={[styles.auraWrap, aura]}>
          <GoldAura mark={`g${index}`} />
        </Animated.View>
        <Animated.View style={[styles.dot, ring]}>
          <FontAwesome name={icon} size={19} color={colors.white} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function GoldAura({ mark }: { mark: string }) {
  const size = DOT + 46;
  const mid = size / 2;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={mark} cx="50%" cy="48%" r="50%">
          <Stop offset="0%" stopColor="#FFFBE8" stopOpacity="1" />
          <Stop offset="18%" stopColor="#FFE9A3" stopOpacity="0.84" />
          <Stop offset="38%" stopColor="#F0C45A" stopOpacity="0.38" />
          <Stop offset="62%" stopColor="#E0A030" stopOpacity="0.14" />
          <Stop offset="100%" stopColor="#C98418" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={mid} cy={mid} r={mid} fill={`url(#${mark})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 80, elevation: 80 },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 22, 38, 0.38)',
  },
  pad: {
    position: 'absolute',
    zIndex: 1,
  },
  halo: {
    position: 'absolute',
    zIndex: 1,
  },
  hub: {
    position: 'absolute',
    width: HUB,
    height: HUB,
    zIndex: 4,
  },
  hubHit: { flex: 1 },
  fab: { width: HUB, height: HUB, borderRadius: HUB / 2 },
  fabInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  plus: { color: colors.white, fontSize: 30, marginTop: -2, fontWeight: '700' },
  spoke: {
    position: 'absolute',
    width: ITEM,
    alignItems: 'center',
    zIndex: 2,
  },
  dotWrap: {
    width: DOT + 46,
    height: DOT + 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.navy,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    position: 'absolute',
    top: -2,
    left: -28,
    right: -28,
    zIndex: 5,
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 11.5,
    color: colors.white,
  },
});
