import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GlassPup } from '@/components/home/GlassPup';
import { PlusArc, QuickActions, type WheelOrigin } from '@/components/home/QuickActions';
import { MetalFill } from '@/components/ui/MetalFill';
import { useApp } from '@/store/app-store';
import { colors, fonts } from '@/theme/tokens';

function Icon(props: { name: ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={18} {...props} />;
}

export default function TabLayout() {
  const { cart, pet } = useApp();
  const count = cart.reduce((n, i) => n + i.qty, 0);
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<WheelOrigin>({ x: 0, y: 0 });
  const wellRef = useRef<View>(null);
  const breath = useSharedValue(1);
  const cover = useSharedValue(0);

  useEffect(() => {
    cover.value = open ? 1 : withTiming(0, { duration: 160 });
    if (open) {
      cancelAnimation(breath);
      breath.value = withTiming(1, { duration: 140 });
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1.09, { duration: 1680, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1880, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [open, breath, cover]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: 1 - cover.value,
  }));

  const wellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [1, 1.09], [0.4, 0], Extrapolation.CLAMP) * (1 - cover.value),
    transform: [{ scale: interpolate(breath.value, [1, 1.09], [1, 1.34], Extrapolation.CLAMP) }],
  }));

  const openWheel = () => {
    if (open) {
      setOpen(false);
      return;
    }
    cancelAnimation(breath);
    breath.value = 1;
    cover.value = 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    const fallback = () => {
      const { width, height } = Dimensions.get('window');
      setOrigin({ x: width / 2, y: height - 62 });
      setOpen(true);
    };
    wellRef.current?.measureInWindow((x, y, w, h) => {
      if (!w || !h) {
        fallback();
        return;
      }
      setOrigin({ x: x + w / 2, y: y + h / 2 });
      setOpen(true);
    });
  };

  return (
    <>
      <Tabs
        sceneContainerStyle={{ backgroundColor: colors.navy }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.white,
          tabBarInactiveTintColor: colors.gold,
          tabBarLabelStyle: { fontFamily: fonts.sansSemi, fontSize: 10, marginBottom: 2 },
          tabBarStyle: {
            backgroundColor: colors.navy,
            borderTopColor: 'transparent',
            borderTopWidth: 0,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            height: 76,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Inicio', tabBarIcon: ({ color }) => <Icon name="home" color={color} /> }}
        />
        <Tabs.Screen
          name="map"
          options={{ title: 'Cerca', tabBarIcon: ({ color }) => <Icon name="map-marker" color={color} /> }}
        />
        <Tabs.Screen
          name="action"
          options={{
            title: '',
            tabBarButton: () => (
              <Pressable
                onPress={openWheel}
                style={styles.fabWrap}
                accessibilityRole="button"
                accessibilityLabel="Acciones"
              >
                <Animated.View
                  ref={wellRef}
                  style={[styles.fabHalo, wrapStyle]}
                  collapsable={false}
                >
                  <Animated.View style={[styles.breathRing, ringStyle]} pointerEvents="none" />
                  <Animated.View style={[styles.fabCore, wellStyle]} pointerEvents={open ? 'none' : 'auto'}>
                    <MetalFill style={styles.fab} contentStyle={styles.fabInner}>
                      <Text style={styles.fabPlus}>+</Text>
                    </MetalFill>
                    <PlusArc />
                  </Animated.View>
                </Animated.View>
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="locate"
          options={{
            title: pet?.name ?? 'Max',
            tabBarIcon: ({ color }) => <Icon name="location-arrow" color={color} />,
          }}
        />
        <Tabs.Screen
          name="market"
          options={{
            title: 'Market',
            tabBarBadge: count || undefined,
            tabBarBadgeStyle: { backgroundColor: colors.goldHi, color: colors.navy },
            tabBarIcon: () => <Text style={styles.cartTab}>🛒</Text>,
          }}
        />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="bookings" options={{ href: null }} />
      </Tabs>
      <QuickActions open={open} origin={origin} onClose={() => setOpen(false)} />
      <GlassPup />
    </>
  );
}

const styles = StyleSheet.create({
  fabWrap: { flex: 1, alignItems: 'center', top: -14 },
  fabHalo: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  breathRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  fabCore: { width: 56, height: 56 },
  fab: { width: 56, height: 56, borderRadius: 28 },
  fabInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fabPlus: { color: colors.white, fontSize: 30, marginTop: -2, fontWeight: '700' },
  cartTab: { fontSize: 16, marginTop: -1 },
});
