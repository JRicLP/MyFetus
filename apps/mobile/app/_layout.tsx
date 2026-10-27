// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SessionProvider, useSession } from '@/contexts/SessionContext';
import { isClinicianRole, isPatientRole } from '@/types/session';
import { subscribeToConsentRequired } from '@/utils/consentEvents';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { user, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => subscribeToConsentRequired(() => {
    if (user) router.replace('/consentimento' as never);
  }), [router, user]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20B2AA" />
      </View>
    );
  }

  const isPatient = user ? isPatientRole(user.role) : false;
  const isClinician = user ? isClinicianRole(user.role) : false;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTransparent: true,
          headerTintColor: '#20B2AA',
          headerTitle: '',
          headerShadowVisible: false,
        }}
      >
        <Stack.Protected guard={!user}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="Cadastro" options={{ headerShown: false }} />
          <Stack.Screen name="CadastroMedico" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={Boolean(user)}>
          <Stack.Screen name="consentimento" options={{ headerShown: false }} />
          <Stack.Screen name="meus-dados" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={isPatient}>
          <Stack.Screen name="outra-gestacao" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="gestation-info" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={isClinician}>
          <Stack.Screen name="doctor" options={{ headerShown: false }} />
        </Stack.Protected>

        {/* Tela Sobre (E7-09): fora dos guards, acessível com e sem login.
            Fica por último para nunca virar a tela inicial de quem está logado. */}
        <Stack.Screen name="sobre" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'center',
  },
});
