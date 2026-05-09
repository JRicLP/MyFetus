import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function OutraGestacaoScreen() {
  const [hadPreviousPregnancies, setHadPreviousPregnancies] = useState<null | boolean>(null);
  const router = useRouter();

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
