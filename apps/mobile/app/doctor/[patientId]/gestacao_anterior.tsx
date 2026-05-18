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

// --- COMPONENTE REUTILIZÁVEL 'ToggleButton' ---
type ToggleButtonProps = {
  label: string;
  value: boolean;
  onToggle: (newValue: boolean) => void;
};
const ToggleButton: React.FC<ToggleButtonProps> = ({ label, value, onToggle }) => (
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
// --- FIM DO COMPONENTE ---

// --- COMPONENTE REUTILIZÁVEL 'NumberInput' ---
type NumberInputProps = {
  label: string;
  value: string;
  onChangeText: (newValue: string) => void;
};
const NumberInput: React.FC<NumberInputProps> = ({ label, value, onChangeText }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      keyboardType="numeric"
    />
  </View>
);
// --- FIM DO COMPONENTE ---


export default function GestacaoAnteriorScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams();

  // --- Estados do Formulário  ---
  const [partos, setPartos] = useState('0');
  const [vaginal, setVaginal] = useState('0');
  const [cesarea, setCesarea] = useState('0');
  const [bebeMaior45, setBebeMaior45] = useState(false);
  const [bebeMenor25, setBebeMenor25] = useState(false); 
  const [preEclampsia, setPreEclampsia] = useState(false);
  const [gestas, setGestas] = useState(false); 
  const [abortos, setAbortos] = useState('0');
  const [tresOuMaisAbortos, setTresOuMaisAbortos] = useState(false);
  const [nascidosVivos, setNascidosVivos] = useState('0');
  const [nascidosMortos, setNascidosMortos] = useState('0');
  const [vivem, setVivem] = useState('0');
  const [mortos1Semana, setMortos1Semana] = useState('0');
  const [finalGestacao1Ano, setFinalGestacao1Ano] = useState(false);
  const [mortosApos1Semana, setMortosApos1Semana] = useState('0');

  // --- Estados de Controle  ---
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Helper
  const parseInputInt = (input: string) => {
    if (input === '') return 0;
    return parseInt(input, 10);
  }
  const boolToString = (val: boolean) => val ? "1" : "0";
  const intToString = (val: number) => val ? String(val) : "0";

  // --- useEffect para LER os dados ---
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
        
        // Carregando dados da Tabela 'pregnants'
        setPartos(intToString(data.gestacao_partos));
        setVaginal(intToString(data.gestacao_vaginal));
        setCesarea(intToString(data.gestacao_cesarea));
        setBebeMaior45(data.gestacao_bebe_maior_45 || false);
        setBebeMenor25(data.gestacao_bebe_maior_25 || false);
        setPreEclampsia(data.gestacao_eclampsia_pre_eclampsia || false); 
        setGestas(data.gestacao_gestas || false);
        setAbortos(intToString(data.gestacao_abortos));
        setTresOuMaisAbortos(data.gestacao_mais_tres_abortos || false);
        setNascidosVivos(intToString(data.gestacao_nascidos_vivos));
        setNascidosMortos(intToString(data.gestacao_nascidos_mortos));
        setVivem(intToString(data.gestacao_vivem));
        setMortos1Semana(intToString(data.gestacao_mortos_primeira_semana));
        setMortosApos1Semana(intToString(data.gestacao_mortos_depois_primeira_semana));
        setFinalGestacao1Ano(data.gestacao_final_gestacao_anterior_1ano || false);

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
          gestacao_partos: parseInputInt(partos),
          gestacao_vaginal: parseInputInt(vaginal),
          gestacao_cesarea: parseInputInt(cesarea),
          gestacao_bebe_maior_45: bebeMaior45,
          gestacao_bebe_maior_25: bebeMenor25,
          gestacao_eclampsia_pre_eclampsia: preEclampsia,
          gestacao_gestas: gestas,
          gestacao_abortos: parseInputInt(abortos),
          gestacao_mais_tres_abortos: tresOuMaisAbortos,
          gestacao_nascidos_vivos: parseInputInt(nascidosVivos),
          gestacao_nascidos_mortos: parseInputInt(nascidosMortos),
          gestacao_vivem: parseInputInt(vivem),
          gestacao_mortos_primeira_semana: parseInputInt(mortos1Semana),
          gestacao_mortos_depois_primeira_semana: parseInputInt(mortosApos1Semana),
          gestacao_final_gestacao_anterior_1ano: finalGestacao1Ano,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar os dados');
      }

      // 2. NAVEGANDO
      router.push(`/doctor/${patientId}/antecedentes_clinicos`);

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
        
        {/* (Removido 'Gestação anterior', pois todos os campos dependem dele) */}

        {/* --- Linha 1 de Inputs --- */}
        <View style={styles.inputRow}>
          <NumberInput label="Partos" value={partos} onChangeText={setPartos} />
        </View>
        <View style={styles.inputRow}>
          <NumberInput label="Vaginal" value={vaginal} onChangeText={setVaginal} />
          <NumberInput label="Cesárea" value={cesarea} onChangeText={setCesarea} />
        </View>
        
        {/* --- Linha 2 de Toggles --- */}
        <View style={styles.inputRow}>
          <ToggleButton label="Bebê > 4,5kg" value={bebeMaior45} onToggle={setBebeMaior45} />
          <ToggleButton label="Bebê > 2,5kg" value={bebeMenor25} onToggle={setBebeMenor25} />
        </View>
        <View style={styles.inputRow}>
          <ToggleButton label="Pré-eclamp." value={preEclampsia} onToggle={setPreEclampsia} />
          <ToggleButton label="Gestas" value={gestas} onToggle={setGestas} />
        </View>

        {/* --- Linha 3 de Inputs --- */}
        <View style={styles.inputRow}>
          <NumberInput label="Abortos" value={abortos} onChangeText={setAbortos} />
        </View>
        
        <ToggleButton label="3 ou + Abortos" value={tresOuMaisAbortos} onToggle={setTresOuMaisAbortos} />

        {/* --- Linha 4 de Inputs --- */}
        <View style={styles.inputRow}>
          <NumberInput label="Nascidos Vivos" value={nascidosVivos} onChangeText={setNascidosVivos} />
          <NumberInput label="Nascidos Mortos" value={nascidosMortos} onChangeText={setNascidosMortos} />
        </View>
        <View style={styles.inputRow}>
          <NumberInput label="Vivem" value={vivem} onChangeText={setVivem} />
          <NumberInput label="Mortos na 1ª sem." value={mortos1Semana} onChangeText={setMortos1Semana} />
        </View>

        {/* --- Linha 5 Final --- */}
        <ToggleButton label="Final da Gestação anterior há 1 ano" value={finalGestacao1Ano} onToggle={setFinalGestacao1Ano} />
        <View style={styles.inputRow}>
          <NumberInput label="Mortos depois da 1ª sem." value={mortosApos1Semana} onChangeText={setMortosApos1Semana} />
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
            <Text style={styles.buttonText}>Antecedentes Clínicos (Tela 8)</Text>
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
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#FFF',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    flex: 1,
    minWidth: '48%',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flexShrink: 1,
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
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10,
  },
  inputContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flex: 1,
    minWidth: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  inputLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  input: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 0,
  },
  button: {
    backgroundColor: '#886aea',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 30,
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