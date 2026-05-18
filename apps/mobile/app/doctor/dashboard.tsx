import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Ícones para os status
const statusIcons: { [key: string]: any } = {
  normal: 'happy-outline',
  risco: 'alert-circle-outline',
};
const statusColors: { [key: string]: any } = {
  normal: '#2ecc71', // Verde
  risco: '#e74c3c',  // Vermelho
};

// Estrutura dos dados que vêm da API melhorada
type Patient = {
  pregnant_id: string;
  patient_name: string;
  birthdate: string;     // Vamos usar para calcular risco
  semanas_gestacao: number | null; // Vem da subquery
};

export default function DashboardScreen() {
  const router = useRouter();
  const [doctorName, setDoctorName] = useState('Dr.');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para calcular idade e definir risco
  const getStatus = (birthdate: string) => {
    if (!birthdate) return 'normal';
    const hoje = new Date();
    const nasc = new Date(birthdate);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--;
    }
    // Regra: Acima de 35 anos é risco 
    return idade >= 35 || idade <= 15 ? 'risco' : 'normal';
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 1. Nome do Médico
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          const firstName = userData.name.split(' ')[0];
          setDoctorName(`Dr. ${firstName}`);
        }

        // 2. Lista de Pacientes (API Melhorada)
        const response = await fetch(`http://localhost:3000/api/pregnants`);
        if (!response.ok) throw new Error('Erro ao buscar pacientes');
        const data = await response.json();
        setPatients(data);

      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Erro de rede');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handlePatientPress = (patientId: string) => {
    router.push(`/doctor/${patientId}/identificacao`);
  };

  const renderPatientCard = ({ item }: { item: Patient }) => {
    const status = getStatus(item.birthdate);
    
    return (
      <TouchableOpacity
        style={styles.patientCard}
        onPress={() => handlePatientPress(item.pregnant_id)}
      >
        <View>
          <Text style={styles.patientName}>{item.patient_name}</Text>
          
          {/* Mostra as semanas reais ou um aviso se não tiver gestação iniciada */}
          <Text style={styles.patientWeeks}>
            {item.semanas_gestacao 
              ? `${item.semanas_gestacao} semanas de gestação` 
              : 'Gestação não iniciada'}
          </Text>
          
          <Text style={styles.patientNotification}>
            {status === 'risco' ? 'Gravidez de Risco (Idade)' : 'Acompanhamento Normal'}
          </Text>
        </View>
        
        <Ionicons
          name={statusIcons[status]}
          size={28}
          color={statusColors[status]}
        />
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) return <ActivityIndicator size="large" color="#886aea" style={{ marginTop: 50 }} />;
    if (error) return <Text style={styles.errorText}>Erro: {error}</Text>;
    if (patients.length === 0) return <Text style={styles.errorText}>Nenhum paciente encontrado.</Text>;
    
    return (
      <FlatList
        data={patients}
        renderItem={renderPatientCard}
        keyExtractor={(item) => item.pregnant_id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Olá {doctorName}!</Text>
          <TouchableOpacity>
            <Ionicons name="filter-outline" size={28} color="#555" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subHeader}>Qual paciente você quer ver?</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" style={{ marginLeft: 10 }}/>
          <TextInput placeholder="Pesquisar..." style={styles.searchInput} placeholderTextColor="#999" />
        </View>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#E6E0F8' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  subHeader: { fontSize: 16, color: '#555', marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, height: 50, marginBottom: 20, elevation: 2 },
  searchInput: { flex: 1, height: '100%', paddingHorizontal: 10, fontSize: 16 },
  list: { flex: 1 },
  patientCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3 },
  patientName: { fontSize: 18, fontWeight: 'bold', color: '#b34d7a' },
  patientWeeks: { fontSize: 14, color: '#555', marginVertical: 4 },
  patientNotification: { fontSize: 12, color: '#777' },
  errorText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#e74c3c' },
});