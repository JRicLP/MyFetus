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

export default function GraficoScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams(); // Pega o ID do paciente

  const handleNext = () => {
    // Navega para a Tela 5, mantendo o ID do paciente
    router.push(`/doctor/${patientId}/informacoes_paciente`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <Text style={styles.title}>Gráfico de acordo com o resultado do IMC</Text>

        {/* --- (PLACEHOLDER) --- */}

        <View style={styles.chartPlaceholder}>
          <Ionicons name="bar-chart-outline" size={80} color="#B0A8D0" />
          <Text style={styles.chartText}>
            (Componente de Gráfico será inserido aqui)
          </Text>
          <Text style={styles.chartAxisLabelX}>Semana de Gestação</Text>
          <Text style={styles.chartAxisLabelY}>Ganho de Peso (kg)</Text>
        </View>
        {/* ---  --- */}


        {/* Botão para a próxima tela */}
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Pressão Arterial (Tela 5)</Text>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  chartPlaceholder: {
    width: '100%',
    height: 300,
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
    top: '40%',
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