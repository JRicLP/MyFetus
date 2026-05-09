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

// --- COMPONENTE REUTILIZÁVEL 'ToggleButton'  ---
type ToggleButtonProps = {
  label: string;
  value: boolean;
  onToggle: (newValue: boolean) => void;
};

const ToggleButton: React.FC<ToggleButtonProps> = ({ label, value, onToggle }) => {
  return (
    <View style={styles.toggleContainer}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={styles.toggleButtons}>
        <TouchableOpacity
          style={[styles.toggleBtn, value ? styles.toggleBtnActive : {}]}
          onPress={() => onToggle(true)}
        >
          <Text style={[styles.toggleText, value ? styles.toggleTextActive : {}]}>
            SIM
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, !value ? styles.toggleBtnActive : {}]}
          onPress={() => onToggle(false)}
        >
          <Text style={[styles.toggleText, !value ? styles.toggleTextActive : {}]}>
            NÃO
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
// --- FIM DO COMPONENTE ---


export default function AntecedentesFamiliaresScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams();

  // --- Estados do Formulário  ---
  const [diabetes, setDiabetes] = useState(false);
  const [hipertensao, setHipertensao] = useState(false);
  const [gemelar, setGemelar] = useState(false);
  const [outros, setOutros] = useState(false);
  const [outrosTexto, setOutrosTexto] = useState('');

  // --- Estados de Controle  ---
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- useEffect para LER os dados ---
  useEffect(() => {
    if (!patientId) return;

    const fetchPatientData = async () => {
      try {
        setLoading(true);
        // 1. LENDO OS DADOS da API
        const response = await fetch(`http://localhost:3000/api/pregnants/${patientId}`);
        if (!response.ok) {
          throw new Error('Não foi possível buscar os dados da paciente');
        }
        const data = await response.json();
        
        // Dados da Tabela 'pregnants'
        setDiabetes(data.antecedentes_diabetes || false);
        setHipertensao(data.antecedentes_hipertensao || false);
        setGemelar(data.antecedentes_gemelar || false);
        setOutros(data.antecedentes_outros || false);
        setOutrosTexto(data.antecedentes_texto || ''); 

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
      // Usando a rota de update de gestante
      const response = await fetch(`http://localhost:3000/api/pregnants/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          antecedentes_diabetes: diabetes,
          antecedentes_hipertensao: hipertensao,
          antecedentes_gemelar: gemelar,
          antecedentes_outros: outros,
          antecedentes_texto: outrosTexto 
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar os dados');
      }

      // 2. NAVEGANDO
      router.push(`/doctor/${patientId}/gestacao_anterior`);

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
        
        <ToggleButton
          label="Diabetes"
          value={diabetes}
          onToggle={setDiabetes}
        />

        <ToggleButton
          label="Hipertensão Arterial"
          value={hipertensao}
          onToggle={setHipertensao}
        />

        <ToggleButton
          label="Gemelar"
          value={gemelar}
          onToggle={setGemelar}
        />

        <ToggleButton
          label="Outros"
          value={outros}
          onToggle={setOutros}
        />

        {/* A caixa de texto só aparece se "Outros" for SIM */}
        {outros && (
          <View style={styles.outrosContainer}>
            <Text style={styles.label}>Que antecedentes relevantes a paciente tem?</Text>
            <TextInput
              style={styles.textInputArea}
              value={outrosTexto}
              onChangeText={setOutrosTexto}
              placeholder="Descreva aqui..."
              multiline
              editable={!isSaving}
            />
          </View>
        )}

        {/* Botão para a próxima tela */}
        <TouchableOpacity 
          style={[styles.button, isSaving && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Gestações Anteriores (Tela 7)</Text>
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
    marginBottom: 20,
    backgroundColor: '#FFF',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  toggleLabel: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
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
  outrosContainer: {
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  textInputArea: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#886aea',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 40,
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