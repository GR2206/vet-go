import { Easing, FadeInDown, Keyframe } from 'react-native-reanimated';

/** Horarios que suben con un giro de manecilla, al cambiar el día. */
export const clockRise = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ translateY: 48 }, { rotate: '-34deg' }, { scale: 0.78 }],
  },
  62: {
    opacity: 1,
    transform: [{ translateY: -7 }, { rotate: '7deg' }, { scale: 1.05 }],
  },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }, { rotate: '0deg' }, { scale: 1 }],
  },
}).duration(680);

export function cardIn(delay = 0) {
  return FadeInDown.delay(delay).duration(540).easing(Easing.out(Easing.cubic));
}
