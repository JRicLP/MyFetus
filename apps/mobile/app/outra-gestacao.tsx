import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSession } from '@/contexts/SessionContext';
import { getLastPeriod } from '../utils/gestationUtils';

const WEB_MAX_WIDTH = 430;

export default function OutraGestacaoScreen() {
  const { width: windowWidth, height } = useWindowDimensions();
  const width = Platform.OS === 'web' ? Math.min(windowWidth, WEB_MAX_WIDTH) : windowWidth;
  const styles = React.useMemo(() => createStyles(width, height), [width, height]);

  const [hadPreviousPregnancies, setHadPreviousPregnancies] = useState<null | boolean>(null);
  const router = useRouter();
  const { user } = useSession();
  const [checkingExistingPregnancy, setCheckingExistingPregnancy] = useState(true);

  useEffect(() => {
    let active = true;

    const checkExistingPregnancy = async () => {
      if (!user) {
        if (active) setCheckingExistingPregnancy(false);
        return;
      }

      try {
        const lastPeriod = await getLastPeriod(user.id);
        if (active && lastPeriod) {
          router.replace('/(tabs)');
          return;
        }
      } catch {
        // Se o storage local estiver indisponível, mantém o onboarding acessível.
      } finally {
        if (active) setCheckingExistingPregnancy(false);
      }
    };

    void checkExistingPregnancy();

    return () => {
      active = false;
    };
  }, [router, user]);

  if (checkingExistingPregnancy) {
    return (
      <LinearGradient
        colors={['#cce5f6', '#f8cde9']}
        style={styles.container}
      >
        <ActivityIndicator size="large" color="#20B2AA" />
      </LinearGradient>
    );
  }

  const handleSubmit = () => {
    router.push('/welcome');
  };

  return (
    <LinearGradient
      colors={['#cce5f6', '#f8cde9']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Já teve outras gestações?</Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            testID="e2e-previous-pregnancy-yes"
            style={[
              styles.optionButton,
              hadPreviousPregnancies === true && styles.optionSelected,
            ]}
            onPress={() => setHadPreviousPregnancies(true)}
          >
            <Text
              style={[
                styles.optionText,
                hadPreviousPregnancies === true && styles.optionTextSelected,
              ]}
            >
              Sim
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="e2e-previous-pregnancy-no"
            style={[
              styles.optionButton,
              hadPreviousPregnancies === false && styles.optionSelected,
            ]}
            onPress={() => setHadPreviousPregnancies(false)}
          >
            <Text
              style={[
                styles.optionText,
                hadPreviousPregnancies === false && styles.optionTextSelected,
              ]}
            >
              Não
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          testID="e2e-previous-pregnancy-continue"
          style={[
            styles.continueButton,
            hadPreviousPregnancies !== null && styles.continueButtonActive,
          ]}
          onPress={handleSubmit}
          disabled={hadPreviousPregnancies === null}
        >
          <Text style={styles.continueButtonText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const createStyles = (width: number, height: number) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: width,
    alignSelf: 'center',
  },
  title: {
    fontSize: width * 0.06,
    fontWeight: 'bold',
    color: '#20B2AA',
    textAlign: 'center',
    marginBottom: height * 0.04,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: height * 0.05,
  },
  optionButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: '#20B2AA',
    borderRadius: 25,
    backgroundColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: '#20B2AA',
  },
  optionText: {
    color: '#20B2AA',
    fontSize: width * 0.045,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#ccc',
    paddingVertical: 14,
    borderRadius: 25,
    width: '80%',
    alignItems: 'center',
  },
  continueButtonActive: {
    backgroundColor: '#20B2AA',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
  },
});
