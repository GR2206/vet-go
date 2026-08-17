import { LinearGradient } from 'expo-linear-gradient';
import { Children, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

function rgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

type Props = {
  children: ReactNode;
  fadeColor?: string;
  fadeOpacity?: number;
  /** Fade only the chip that meets the edge, not a rectangular veil. */
  fadeItems?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export function EdgeFadeRow({
  children,
  fadeColor = '#FFFFFF',
  fadeOpacity = 1,
  fadeItems,
  contentContainerStyle,
  style,
}: Props) {
  const [x, setX] = useState(0);
  const [viewW, setViewW] = useState(0);
  const [contentW, setContentW] = useState(0);
  const scrollX = useSharedValue(0);
  const viewWidth = useSharedValue(0);
  const overflow = contentW > viewW + 8;
  const showLeft = !fadeItems && overflow && x > 6;
  const showRight = !fadeItems && overflow && x + viewW < contentW - 6;
  const items = Children.toArray(children);

  const onAnimScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  return (
    <View
      style={style}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setViewW(w);
        viewWidth.value = w;
      }}
    >
      {fadeItems ? (
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onAnimScroll}
          onContentSizeChange={(w) => setContentW(w)}
          contentContainerStyle={contentContainerStyle}
        >
          {items.map((child, i) => (
            <FadeChip key={i} scrollX={scrollX} viewW={viewWidth}>
              {child}
            </FadeChip>
          ))}
        </Animated.ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => setX(e.nativeEvent.contentOffset.x)}
          onContentSizeChange={(w) => setContentW(w)}
          contentContainerStyle={contentContainerStyle}
        >
          {children}
        </ScrollView>
      )}
      {showLeft ? (
        <LinearGradient
          pointerEvents="none"
          colors={[rgba(fadeColor, fadeOpacity), rgba(fadeColor, 0)] as const}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.left}
        />
      ) : null}
      {showRight ? (
        <LinearGradient
          pointerEvents="none"
          colors={[rgba(fadeColor, 0), rgba(fadeColor, fadeOpacity)] as const}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.right}
        />
      ) : null}
    </View>
  );
}

function FadeChip({
  children,
  scrollX,
  viewW,
}: {
  children: ReactNode;
  scrollX: SharedValue<number>;
  viewW: SharedValue<number>;
}) {
  const lx = useSharedValue(0);
  const lw = useSharedValue(1);

  const style = useAnimatedStyle(() => {
    const left = lx.value - scrollX.value;
    const right = left + lw.value;
    const visible = Math.max(0, Math.min(right, viewW.value) - Math.max(left, 0));
    const ratio = lw.value > 0 ? visible / lw.value : 1;
    return {
      opacity: interpolate(ratio, [0, 0.18, 0.55, 1], [0, 0.28, 0.78, 1], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View
      style={style}
      onLayout={(e) => {
        lx.value = e.nativeEvent.layout.x;
        lw.value = e.nativeEvent.layout.width;
      }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  left: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 42 },
  right: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 42 },
});
