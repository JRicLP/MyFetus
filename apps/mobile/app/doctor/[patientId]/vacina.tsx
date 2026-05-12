import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator, 
  Alert, 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';




const formatarDataInput = (text: string) => {
  const cleaned = text.replace(/\D/g, ''); 
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  } else if (cleaned.length > 2) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
  }
  return cleaned;
};
// --- COMPONENTE REUTILIZÁVEL 'DateInput' ---
type DateInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
};
const DateInput: React.FC<DateInputProps> = ({ label, value, onChangeText, placeholder = "DD/MM/AAAA", editable }) => (
  <View style={styles.dateInputContainer}>
    <Text style={styles.dateLabel}>{label}</Text>
    <TextInput
      style={[styles.dateInput, !editable && styles.dateInputDisabled]}
      value={value}
      onChangeText={(text) => onChangeText(formatarDataInput(text))} 
      placeholder={placeholder}
      keyboardType="numeric"
      maxLength={10}
      editable={editable}
    />
  </View>
);

// --- COMPONENTE REUTILIZÁVEL 'ToggleSwitch'  ---
type ToggleSwitchProps = {
  label: string;
  value: boolean;
  onToggle: (newValue: boolean) => void;
};
const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, value, onToggle }) => (
  <View style={styles.toggleContainer}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <View style={styles.toggleButtons}>
      <TouchableOpacity
        style={[styles.toggleBtn, value ? styles.toggleBtnActive : {}]}
        onPress={() => onToggle(true)}
      >
        <Text style={[styles.toggleText, value ? styles.toggleTextActive : {}]}>SIM</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleBtn, !value ? styles.toggleBtnActive : {}]}
        onPress={() => onToggle(false)}
      >
        <Text style={[styles.toggleText, !value ? styles.toggleTextActive : {}]}>NÃO</Text>
      </TouchableOpacity>
    </View>
  </View>
);


export default function VacinasScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams();

  // --- Estados do Formulário ---
  const [antitetanica, setAntitetanica] = useState(false);
  const [antiDose1, setAntiDose1] = useState('');
  const [antiDose2, setAntiDose2] = useState('');
  const [antiDTpa, setAntiDTpa] = useState('');

  const [hepatiteB, setHepatiteB] = useState(false);
  const [hepDose1, setHepDose1] = useState('');
  const [hepDose2, setHepDose2] = useState('');
  const [hepDose3, setHepDose3] = useState('');

  const [influenza, setInfluenza] = useState(false);
  const [fluData, setFluData] = useState('');

  const [covid, setCovid] = useState(false);
  const [covidDose1, setCovidDose1] = useState('');
  const [covidDose2, setCovidDose2] = useState('');

  // --- Estados de Controle ---
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  //  Helper para formatar datas (lendo do BD)
  const formatarDataParaExibir = (dataISO: string) => {
    if (!dataISO) return "";
    const dataObj = new Date(dataISO);
    const dia = String(dataObj.getUTCDate()).padStart(2, '0');
    const mes = String(dataObj.getUTCMonth() + 1).padStart(2, '0');
    const ano = dataObj.getUTCFullYear();
    return `${dia}/${mes}/${ano}`;
  };
  
  // Helper para salvar datas (enviando para o BD)
  const formatarDataParaSalvar = (dataDisplay: string) => {
    if (!dataDisplay || dataDisplay.length !== 10) return null; // Envia nulo se incompleto
    const [dia, mes, ano] = dataDisplay.split('/');
    // Validação simples
    if (parseInt(mes) > 12 || parseInt(dia) > 31) return null;
    return `${ano}-${mes}-${dia}`;
  };

  // ---  useEffect para LER os dados ---
  useEffect(() => {
    if (!patientId) return;
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3000/api/pregnants/${patientId}`);
        if (!response.ok) {
          throw new Error('Não foi possível buscar os dados da paciente');
        }
        const data = await response.json();
        
        // Carregando dados da Tabela 'pregnants' (Vacinas)
        setAntitetanica(data.vacina_antitetanica || false);
        setAntiDose1(formatarDataParaExibir(data.vacina_antitetanica_1dose));
        setAntiDose2(formatarDataParaExibir(data.vacina_antitetanica_2dose));
        setAntiDTpa(formatarDataParaExibir(data.vacina_antitetanica_dtpa));

        setHepatiteB(data.vacina_hepatite_b || false);
        setHepDose1(formatarDataParaExibir(data.vacina_hepatite_b_1dose));
        setHepDose2(formatarDataParaExibir(data.vacina_hepatite_b_2dose));
        setHepDose3(formatarDataParaExibir(data.vacina_hepatite_b_3dose));

        setInfluenza(data.vacina_influenza || false);
        setFluData(formatarDataParaExibir(data.vacina_influenza_1dose));

        setCovid(data.vacina_covid19 || false);
        setCovidDose1(formatarDataParaExibir(data.vacina_covid19_1dose));
        setCovidDose2(formatarDataParaExibir(data.vacina_covid19_2dose));

      } catch (error) {
        console.error(error);
        Alert.alert('Erro', error instanceof Error ? error.message : 'Erro de rede');
      } finally {
        setLoading(false);
      }
    };
    fetchPatientData();
  }, [patientId]);

  
  // ---  handleNext  SALVA os dados ---
  const handleNext = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      // 1. ALIMENTANDO O BD (Tabela 'pregnants')
      const response = await fetch(`http://localhost:3000/api/pregnants/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vacina_antitetanica: antitetanica,
          vacina_antitetanica_1dose: formatarDataParaSalvar(antiDose1),
          vacina_antitetanica_2dose: formatarDataParaSalvar(antiDose2),
          vacina_antitetanica_dtpa: formatarDataParaSalvar(antiDTpa),
          vacina_hepatite_b: hepatiteB,
          vacina_hepatite_b_1dose: formatarDataParaSalvar(hepDose1),
          vacina_hepatite_b_2dose: formatarDataParaSalvar(hepDose2),
          vacina_hepatite_b_3dose: formatarDataParaSalvar(hepDose3),
          vacina_influenza: influenza,
          vacina_influenza_1dose: formatarDataParaSalvar(fluData),
          vacina_covid19: covid,
          vacina_covid19_1dose: formatarDataParaSalvar(covidDose1),
          vacina_covid19_2dose: formatarDataParaSalvar(covidDose2),
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar os dados');
      }

      // 2. NAVEGANDO
      router.push(`/doctor/${patientId}/historico_ultrassons`);

    } catch (error) {
      console.error(error);
      Alert.alert('Erro ao Salvar', error instanceof Error ? error.message : 'Erro de rede');
    } finally {
      setIsSaving(false);
    }
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
        
        {/* --- Antitetânica --- */}
        <View style={styles.card}>
        
          <ToggleSwitch label="Antitetânica" value={antitetanica} onToggle={setAntitetanica} />
          <View style={styles.dateRow}>
            <DateInput label="1ª dose" value={antiDose1} onChangeText={setAntiDose1} editable={antitetanica && !isSaving} />
            <DateInput label="2ª dose" value={antiDose2} onChangeText={setAntiDose2} editable={antitetanica && !isSaving} />
            <DateInput label="Vacinas dTpa" value={antiDTpa} onChangeText={setAntiDTpa} editable={antitetanica && !isSaving} />
          </View>
        </View>

        {/* --- Hepatite B --- */}
        <View style={styles.card}>
          <ToggleSwitch label="Hepatite B" value={hepatiteB} onToggle={setHepatiteB} />
          <View style={styles.dateColumn}>
            <DateInput label="1ª dose" value={hepDose1} onChangeText={setHepDose1} editable={hepatiteB && !isSaving} />
            <DateInput label="2ª dose (1mês)" value={hepDose2} onChangeText={setHepDose2} editable={hepatiteB && !isSaving} />
            <DateInput label="3ª dose (6meses)" value={hepDose3} onChangeText={setHepDose3} editable={hepatiteB && !isSaving} />
          </View>
        </View>

        {/* --- Influenza --- */}
        <View style={styles.card}>
          <ToggleSwitch label="Influenza" value={influenza} onToggle={setInfluenza} />
          <DateInput label="Data" value={fluData} onChangeText={setFluData} editable={influenza && !isSaving} />
        </View>

        {/* --- Covid-19 --- */}
        <View style={styles.card}>
          <ToggleSwitch label="Covid-19" value={covid} onToggle={setCovid} />
          <View style={styles.dateRow}>
            <DateInput label="1ª dose" value={covidDose1} onChangeText={setCovidDose1} editable={covid && !isSaving} />
            <DateInput label="2ª dose" value={covidDose2} onChangeText={setCovidDose2} editable={covid && !isSaving} />
          </View>
        </View>

        {/* Botão para a próxima tela */}
        <TouchableOpacity 
          style={[styles.button, isSaving && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Histórico de Ultrassons (Tela 11)</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// Estilos 
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E6E0F8',
  },
  container: {
    flexGrow: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 1,
    marginRight: 10,
  },
  toggleButtons: {
    flexDirection: 'row',
    backgroundColor: '#F0EFFF',
    borderRadius: 20,
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  toggleBtnActive: {
    backgroundColor: '#886aea',
  },
  toggleText: {
    fontSize: 14,
    color: '#888',
    fontWeight: 'bold',
  },
  toggleTextActive: {
    color: '#FFF',
  },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  dateColumn: {
    marginTop: 15,
  },
  dateInputContainer: {
    width: '48%',
    marginBottom: 10,
    minWidth: '48%', 
  },
  dateLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  dateInput: {
    backgroundColor: '#F0EFFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  dateInputDisabled: {
    backgroundColor: '#E0E0E0',
    color: '#999',
  },
  button: {
    backgroundColor: '#886aea',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#aaa',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});