export const colors = {
  navy: '#141E2E',
  navyMid: '#1C2A3C',
  navyMetal: '#2A3F54',
  ink: '#33383F',
  teal: '#5A7388',
  tealBright: '#7A93A8',
  tealSoft: '#F0F3F6',
  gold: '#9AADC0',
  goldHi: '#D2DCE6',
  goldMid: '#9AADC0',
  goldDeep: '#5C7388',
  goldInk: '#F7F6F3',
  coral: '#9AADC0',
  cream: '#F5F4F1',
  creamDeep: '#ECEBE7',
  white: '#FBFAF8',
  muted: '#81868E',
  line: 'rgba(18, 18, 20, 0.28)',
  lineStrong: 'rgba(18, 18, 20, 0.42)',
  danger: '#E25555',
  success: '#5BBF7A',
  overlay: 'rgba(20,30,46,0.42)',
  blue: '#9AADC0',
  blueSoft: '#F0F3F6',
  orange: '#9AADC0',
  orangeSoft: '#F0F3F6',
  lavender: '#9B97E8',
  lavenderSoft: '#F3F2FF',
  mint: '#86D4A8',
};

/** Soft night-blue metal, no 3D gleam. */
export const metalGradient = ['#3A5168', '#1C2C3E', '#243848'] as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 40,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 22,
  xl: 28,
  sheet: 32,
  pill: 999,
};

/** Rounded card with a square cut on the top-left corner. */
export function cardShape(r: number = radius.md) {
  return {
    borderTopLeftRadius: 0,
    borderTopRightRadius: r,
    borderBottomRightRadius: r,
    borderBottomLeftRadius: r,
  };
}

export const shadow = {
  card: {
    shadowColor: '#141E2E',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  float: {
    shadowColor: '#141E2E',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};

export const surface = {
  backgroundColor: colors.white,
  ...cardShape(radius.md),
  borderWidth: 1,
  borderColor: colors.line,
  ...shadow.card,
};

export const fonts = {
  display: 'Fraunces_700Bold',
  displayItalic: 'Fraunces_600SemiBold_Italic',
  sans: 'Manrope_400Regular',
  sansMedium: 'Manrope_500Medium',
  sansSemi: 'Manrope_600SemiBold',
  sansBold: 'Manrope_700Bold',
  sansExtra: 'Manrope_800ExtraBold',
};
