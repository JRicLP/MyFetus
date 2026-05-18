import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Para o placeholder

export default function UltrassonsScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams(); // Pega o ID do paciente

  const handleNext = () => {
    router.push(`/doctor/${patientId}/historico_exames`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* --- GRÁFICO FALSO (PLACEHOLDER) --- */}
        {/* Mesmo placeholder da Tela 4, mas com labels diferentes */}
        <View style={styles.chartPlaceholder}>
          <Ionicons name="analytics-outline" size={80} color="#B0A8D0" />
          <Text style={styles.chartText}>
            (Componente de Gráfico de Peso Fetal)
          </Text>
          <Text style={styles.chartAxisLabelX}>Data</Text>
          <Text style={styles.chartAxisLabelY}>Peso Fetal</Text>
        </View>
        {/* --- FIM DO GRÁFICO FALSO --- */}


        {/* Botão para a próxima tela */}
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Histórico de Exames (Tela 12)</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E6E0F8', 
  },
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center', 
  },
  chartPlaceholder: {
    width: '100%',
    height: 350, 
    backgroundColor: '#F0EFFF', 
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D8D0F0',
    marginBottom: 40,
    position: 'relative', 
  },
  chartText: {
    color: '#B0A8D0',
    fontSize: 16,
    marginTop: 10,
  },
  chartAxisLabelX: {
    position: 'absolute',
    bottom: 10,
    color: '#888',
    fontSize: 14,
  },
  chartAxisLabelY: {
    position: 'absolute',
    left: 10,
    top: '45%',
    color: '#888',
    fontSize: 14,
    transform: [{ rotate: '-90deg' }],
  },
  button: {
    backgroundColor: '#886aea', 
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%', 
    marginTop: 30,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});