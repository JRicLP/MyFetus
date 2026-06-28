import React, { useState, useEffect } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiUrl, fetchWithAuth } from '../../../utils/api';
import NutritionalGrowthChart from '../../../components/NutritionalGrowthChart';
import UterineHeightChart from '../../../components/UterineHeightChart';
import PatientVsPopulationComparison from '../../../components/PatientVsPopulationComparison';
import { getIMCPopulationAverage, getAlturaUterinaPopulationAverage } from '../../../utils/growthChartData';

export default function GraficoScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState(0);
  const [imc, setImc] = useState(0);
  const [alturaUterina, setAlturaUterina] = useState(0);

  useEffect(() => {
    if (!patientId) return;

    const fetchPatientData = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth(apiUrl(`/api/pregnants/${patientId}`));
        if (!response.ok) {
          throw new Error('Não foi possível buscar os dados da paciente');
        }
        const data = await response.json();

        const altura = Number(data.altura) || 0;
        const pesoAtual = Number(data.peso_atual) || 0;
        setImc(altura > 0 && pesoAtual > 0 ? pesoAtual / (altura * altura) : 0);

        if (data.latest_pregnancy) {
          setWeek(Number(data.latest_pregnancy.weeks) || 0);
          setAlturaUterina(Number(data.latest_pregnancy.altura_uterina) || 0);
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Erro', error instanceof Error ? error.message : 'Erro de rede');
      } finally {
        setLoading(false);
      }
    };
    fetchPatientData();
  }, [patientId]);

  const handleNext = () => {
    router.push(`/doctor/${patientId}/informacoes_paciente`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#886aea" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <NutritionalGrowthChart week={week} imc={imc} />
        <PatientVsPopulationComparison
          title="IMC: Paciente vs. Média Populacional"
          unit="kg/m²"
          patientValue={imc}
          averageValue={getIMCPopulationAverage(week)}
        />

        <UterineHeightChart week={week} alturaUterina={alturaUterina} />
        <PatientVsPopulationComparison
          title="Altura uterina: Paciente vs. Média Populacional"
          unit="cm"
          patientValue={alturaUterina}
          averageValue={getAlturaUterinaPopulationAverage(week)}
        />

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
  button: {
    backgroundColor: '#886aea',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
