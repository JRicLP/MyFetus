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

// --- COMPONENTE REUTILIZÁVEL 'TextAreaInput' ---
type TextAreaInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
};
const TextAreaInput: React.FC<TextAreaInputProps> = ({ label, value, onChangeText, editable }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.textInputArea, !editable && styles.textInputAreaDisabled]}
      value={value}
      onChangeText={onChangeText}
      placeholder="Descreva aqui..."
      multiline
      editable={editable}
    />
  </View>
);
// --- FIM DO COMPONENTE ---


export default function InformacoesGeraisScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams(); 

  // --- Estados do Formulário ---
  const [edemas, setEdemas] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [estadoGeral1, setEstadoGeral1] = useState('');
  const [estadoGeral2, setEstadoGeral2] = useState('');
  const [nutricional, setNutricional] = useState('');
  const [psicossocial, setPsicossocial] = useState('');

  // --- Estados de Controle ---
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        
        // Carregando dados da Tabela 'pregnants'
        setEdemas(data.info_gerais_edemas || '');
        setSintomas(data.info_gerais_sintomas || '');
        setEstadoGeral1(data.info_gerais_estado_geral_1 || '');
        setEstadoGeral2(data.info_gerais_estado_geral_2 || '');
        setNutricional(data.info_gerais_nutricional || '');
        setPsicossocial(data.info_gerais_psicossocial || '');

      } catch (error) {
        console.error(error);
        Alert.alert('Erro', error instanceof Error ? error.message : 'Erro de rede');
      } finally {
        setLoading(false);
      }
    };
    fetchPatientData();
  }, [patientId]);

  // ---  handleNext agora SALVA os dados ---
  const handleNext = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      // 1. ALIMENTANDO O BD (Tabela 'pregnants')
      const response = await fetch(`http://localhost:3000/api/pregnants/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          info_gerais_edemas: edemas,
          info_gerais_sintomas: sintomas,
          info_gerais_estado_geral_1: estadoGeral1,
          info_gerais_estado_geral_2: estadoGeral2,
          info_gerais_nutricional: nutricional,
          info_gerais_psicossocial: psicossocial,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar os dados');
      }

      // 2. NAVEGANDO 
      
      router.push(`/doctor/${patientId}/resumo`);

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
        
        <TextAreaInput
          label="Edemas em membros inferiores"
          value={edemas}
          onChangeText={setEdemas}
          editable={!isSaving}
        />
        <TextAreaInput
          label="Sintomas/ Sinais de complicações"
          value={sintomas}
          onChangeText={setSintomas}
          editable={!isSaving}
        />
        <TextAreaInput
          label="Estado Geral da Gestante"
          value={estadoGeral1}
          onChangeText={setEstadoGeral1}
          editable={!isSaving}
        />
        <TextAreaInput
          label="Estado Geral da Gestante"
          value={estadoGeral2}
          onChangeText={setEstadoGeral2}
          editable={!isSaving}
        />
        <TextAreaInput
          label="Avaliação nutricional"
          value={nutricional}
          onChangeText={setNutricional}
          editable={!isSaving}
        />
        <TextAreaInput
          label="Avaliação Psicossocial e emocional"
          value={psicossocial}
          onChangeText={setPsicossocial}
          editable={!isSaving}
        />

        {/* Botão para a próxima tela */}
        <TouchableOpacity 
          style={[styles.button, isSaving && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Dashboard da Paciente</Text>
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    fontWeight: '500',
  },
  textInputArea: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    elevation: 2,
  },
  textInputAreaDisabled: {
    backgroundColor: '#E0E0E0',
    color: '#999',
  },
  button: {
    backgroundColor: '#886aea',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
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