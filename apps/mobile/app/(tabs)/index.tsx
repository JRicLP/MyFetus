import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLastPeriod, calculateGestationWeek, getBabySize, getBabyDescription, calculateDPP } from '../../utils/gestationUtils';
import { useRouter } from 'expo-router';
import { useSession } from '@/contexts/SessionContext';
import { FetusWeekImage } from '../../components/FetusWeekImage';
import { AccessibleText as Text } from '../../components/AccessibleText';
import { ACCESSIBLE_COLORS } from '../../theme/accessibility';

const WEB_MAX_WIDTH = 430;

export default function HomeScreen() {
  const { width: windowWidth, height } = useWindowDimensions();
  const width = Platform.OS === 'web' ? Math.min(windowWidth, WEB_MAX_WIDTH) : windowWidth;
  const styles = React.useMemo(() => createStyles(width, height), [width, height]);
  const router = useRouter();
  const { user, signOut } = useSession();

  const [gestationWeek, setGestationWeek] = useState(0);
  const [babySize, setBabySize] = useState('');
  const [babyDescription, setBabyDescription] = useState('');
  const [dpp, setDPP] = useState('');

  useEffect(() => {
    const loadGestationData = async () => {
      if (!user) return;
      const lastPeriod = await getLastPeriod(user.id);
      if (lastPeriod) {
        const result = calculateGestationWeek(lastPeriod);
        setGestationWeek(result.weeks);
        setBabySize(getBabySize(result.weeks));
        setBabyDescription(getBabyDescription(result.weeks));
        setDPP(calculateDPP(lastPeriod));
      }
    };

    loadGestationData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <LinearGradient
      colors={['#cce5f6', '#f8cde9']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.title}>Meu Bebê</Text>
              <Text style={styles.subtitle}>Semana {gestationWeek}</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  accessibilityLabel="Sobre o MyFetus"
                  accessibilityRole="link"
                  onPress={() => router.push('/sobre')}
                  style={styles.signOutButton}
                >
                  <FontAwesome name="info-circle" size={18} color={ACCESSIBLE_COLORS.primary} />
                  <Text style={styles.signOutText}>Sobre</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="e2e-patient-sign-out"
                  accessibilityLabel="Sair da conta"
                  accessibilityRole="button"
                  accessibilityHint="Encerra a sessão atual"
                  onPress={handleSignOut}
                  style={styles.signOutButton}
                >
                  <FontAwesome name="sign-out" size={18} color={ACCESSIBLE_COLORS.primary} />
                  <Text style={styles.signOutText}>Sair</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="e2e-patient-my-data"
                  accessibilityLabel="Meus dados"
                  accessibilityRole="button"
                  accessibilityHint="Abre a exportação dos seus dados pessoais"
                  onPress={() => router.push('/meus-dados' as never)}
                  style={styles.signOutButton}
                >
                  <FontAwesome name="download" size={18} color={ACCESSIBLE_COLORS.primary} />
                  <Text style={styles.signOutText}>Meus dados</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.imageContainer}>
              <View style={styles.imageWrapper}>
                <FetusWeekImage
                  week={gestationWeek}
                  style={styles.fetusImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.infoCard}>
                <FontAwesome name="calendar" size={24} color={ACCESSIBLE_COLORS.primary} />
                <Text style={styles.infoTitle}>Data Prevista do Parto</Text>
                <Text style={styles.infoValue}>{dpp}</Text>
              </View>

              <View style={styles.infoCard}>
                <FontAwesome name="arrows-alt" size={24} color={ACCESSIBLE_COLORS.primary} />
                <Text style={styles.infoTitle}>Tamanho do Bebê</Text>
                <Text style={styles.infoValue}>{babySize}</Text>
              </View>
            </View>

            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>Desenvolvimento</Text>
              <Text style={styles.descriptionText}>{babyDescription}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (width: number, height: number) => StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  page: {
    width: '100%',
    maxWidth: width,
    alignSelf: 'center',
  },
  header: {
    paddingTop: height * 0.05,
    paddingBottom: height * 0.02,
    alignItems: 'center',
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    color: ACCESSIBLE_COLORS.primary,
  },
  subtitle: {
    fontSize: width * 0.045,
    color: ACCESSIBLE_COLORS.muted,
    marginTop: 5,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  signOutButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signOutText: {
    color: ACCESSIBLE_COLORS.primary,
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: width * 0.05,
    marginBottom: height * 0.03,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    width: width * 0.4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  infoTitle: {
    fontSize: width * 0.035,
    color: ACCESSIBLE_COLORS.muted,
    marginTop: 10,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: width * 0.04,
    color: ACCESSIBLE_COLORS.primary,
    fontWeight: 'bold',
    marginTop: 5,
    textAlign: 'center',
  },
  descriptionContainer: {
    backgroundColor: '#fff',
    margin: width * 0.05,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  descriptionTitle: {
    fontSize: width * 0.05,
    fontWeight: 'bold',
    color: ACCESSIBLE_COLORS.primary,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: width * 0.035,
    color: ACCESSIBLE_COLORS.muted,
    lineHeight: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: height * 0.03,
    paddingHorizontal: width * 0.05,
  },
  imageWrapper: {
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
  },
  fetusImage: {
    width: '100%',
    height: '100%',
  },
});
