import {
  Fraunces_600SemiBold_Italic,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { ThemeProvider, type Theme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppProvider } from '@/store/app-store';
import { BackLink } from '@/components/ui/BackLink';
import { colors, fonts } from '@/theme/tokens';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

const navTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.gold,
    background: colors.white,
    card: colors.white,
    text: colors.ink,
    border: colors.line,
    notification: colors.gold,
  },
  fonts: {
    regular: { fontFamily: 'Manrope_400Regular', fontWeight: '400' },
    medium: { fontFamily: 'Manrope_600SemiBold', fontWeight: '600' },
    bold: { fontFamily: 'Manrope_700Bold', fontWeight: '700' },
    heavy: { fontFamily: 'Manrope_800ExtraBold', fontWeight: '800' },
  },
};

export default function RootLayout() {
  useFonts({
    Fraunces_700Bold,
    Fraunces_600SemiBold_Italic,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <AppProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: colors.white },
            headerStyle: { backgroundColor: colors.white },
            headerShadowVisible: false,
            headerTintColor: colors.ink,
            headerTitleStyle: { fontFamily: fonts.sansSemi, color: colors.ink },
            headerBackTitle: 'Atrás',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="shop" options={{ headerShown: false }} />
          <Stack.Screen name="cart" options={{ headerShown: false }} />
          <Stack.Screen
            name="booking/[placeId]"
            options={{
              headerShown: true,
              title: 'Pedir turno',
              headerTintColor: colors.ink,
              headerLeft: () => <BackLink style={{ marginBottom: 0 }} />,
            }}
          />
          <Stack.Screen
            name="plan/[id]"
            options={{
              headerShown: true,
              title: 'Plan mensual',
              headerTintColor: colors.ink,
              headerLeft: () => <BackLink style={{ marginBottom: 0 }} />,
            }}
          />
          <Stack.Screen
            name="consult"
            options={{
              headerShown: true,
              title: 'Guardia veterinaria',
              headerTintColor: colors.ink,
              headerLeft: () => <BackLink style={{ marginBottom: 0 }} />,
            }}
          />
          <Stack.Screen
            name="walkers/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="walkers/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="pending" options={{ headerShown: false }} />
          <Stack.Screen name="history" options={{ headerShown: false }} />
          <Stack.Screen name="walker-studio" options={{ headerShown: false }} />
          <Stack.Screen name="walker-join" options={{ headerShown: false }} />
          <Stack.Screen name="account" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </AppProvider>
  );
}
