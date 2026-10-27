// app/sobre.tsx — Tela Sobre (E7-09). Disponível com e sem login.
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSession } from '@/contexts/SessionContext';
import { ABOUT_DRAFT_NOTICE, ABOUT_IS_DRAFT, ABOUT_SECTIONS } from '@/constants/aboutContent';
import { isClinicianRole, isPatientRole } from '@/types/session';
import {
  ACADEMIC_CYCLE,
  formatBuildDate,
  getAppVersionInfo,
  getEnvironmentLabel,
  readBuildInfo,
} from '@/utils/appVersion';

export default function AboutScreen() {
  const router = useRouter();
  const { user } = useSession();
  const versionInfo = getAppVersionInfo(Constants.expoConfig, Platform.OS);
  const buildInfo = readBuildInfo();
  const environmentLabel = getEnvironmentLabel(buildInfo.environment);
  const buildDate = formatBuildDate(buildInfo.buildDate);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (user && isClinicianRole(user.role)) {
      router.replace('/doctor/dashboard');
    } else if (user && isPatientRole(user.role)) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  };

  return (
    <LinearGradient colors={['#cce5f6', '#f8cde9']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={handleBack}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#20B2AA" />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>

          <Text accessibilityRole="header" style={styles.title}>
            Sobre o MyFetus
          </Text>
          <Text style={styles.version}>Versão do aplicativo: {versionInfo.label}</Text>
          {buildDate && <Text style={styles.version}>Data da compilação: {buildDate}</Text>}
          <Text style={styles.version}>Ciclo acadêmico: {ACADEMIC_CYCLE}</Text>
          {environmentLabel && <Text style={styles.environment}>{environmentLabel}</Text>}

          {ABOUT_IS_DRAFT && (
            <View style={styles.draftBadge}>
              <Text style={styles.draftText}>{ABOUT_DRAFT_NOTICE}</Text>
            </View>
          )}

          {ABOUT_SECTIONS.map((section) => (
            <View key={section.id} style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {section.title}
              </Text>
              {section.paragraphs.map((paragraph) => (
                <Text key={paragraph} style={styles.paragraph}>
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    alignSelf: 'center',
    maxWidth: 600,
    paddingBottom: 32,
    paddingHorizontal: 20,
    width: '100%',
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingVertical: 8,
  },
  backText: { color: '#20B2AA', fontSize: 16, fontWeight: '600' },
  title: { color: '#20B2AA', fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  version: { color: '#333', fontSize: 16, marginTop: 4 },
  environment: { color: '#8a3b12', fontSize: 15, fontWeight: '600', marginTop: 6 },
  draftBadge: {
    backgroundColor: '#fff4d6',
    borderColor: '#8a6100',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
    padding: 12,
  },
  draftText: { color: '#5c4100', fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    elevation: 2,
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: { color: '#b34d7a', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  paragraph: { color: '#333', fontSize: 15, lineHeight: 22, marginTop: 4 },
});
