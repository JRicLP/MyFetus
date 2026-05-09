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


export default function AntecedentesClinicosScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams();

  // --- Estados do Formulário (Iniciados vazios) ---
  const [diabetes, setDiabetes] = useState(false);
  const [infeccaoUrinaria, setInfeccaoUrinaria] = useState(false);
  const [infertilidade, setInfertilidade] = useState(false);
  const [dificulAmamentacao, setDificulAmamentacao] = useState(false);
  const [cardiopatia, setCardiopatia] = useState(false);
  const [tromboembolismo, setTromboembolismo] = useState(false);
  const [hipertensao, setHipertensao] = useState(false);
  const [cirurgiaPelvica, setCirurgiaPelvica] = useState(false);
  const [cirurgia, setCirurgia] = useState(false);
  const [outros, setOutros] = useState(false);
  const [outrosTexto, setOutrosTexto] = useState('');

  // --- Estados de Controle ---
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        setDiabetes(data.antecedentes_clinicos_diabetes || false);
        setInfeccaoUrinaria(data.antecedentes_clinicos_infeccao_urinaria || false);
        setInfertilidade(data.antecedentes_clinicos_infertilidade || false);
        setDificulAmamentacao(data.antecedentes_clinicos_dific_amamentacao || false);
        setCardiopatia(data.antecedentes_clinicos_cardiopatia || false);
        setTromboembolismo(data.antecedentes_clinicos_tromboembolismo || false);
        setHipertensao(data.antecedentes_clinicos_hipertensao_arterial || false); // (Nome longo no DB)
        setCirurgiaPelvica(data.antecedentes_clinicos_cirur_per_uterina || false); // (Nome longo no DB)
        setCirurgia(data.antecedentes_clinicos_cirurgia || false);
        setOutros(data.antecedentes_clinicos_outros || false);
        setOutrosTexto(data.antecedentes_clinicos_outros_texto || '');

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
      // (A função 'updatePregnant' no backend JÁ ESPERA por esses campos)
      const response = await fetch(`http://localhost:3000/api/pregnants/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          antecedentes_clinicos_diabetes: diabetes,
          antecedentes_clinicos_infeccao_urinaria: infeccaoUrinaria,
          antecedentes_clinicos_infertilidade: infertilidade,
          antecedentes_clinicos_dific_amamentacao: dificulAmamentacao,
          antecedentes_clinicos_cardiopatia: cardiopatia,
          antecedentes_clinicos_tromboembolismo: tromboembolismo,
          antecedentes_clinicos_hipertensao_arterial: hipertensao,
          antecedentes_clinicos_cirur_per_uterina: cirurgiaPelvica,
          antecedentes_clinicos_cirurgia: cirurgia,
          antecedentes_clinicos_outros: outros,
          antecedentes_clinicos_outros_texto: outrosTexto,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar os dados');
      }

      // 2. NAVEGANDO
      router.push(`/doctor/${patientId}/gestacao_atual`);

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
        
        <ToggleButton label="Diabetes" value={diabetes} onToggle={setDiabetes} />
        <ToggleButton label="Infecção Urinária" value={infeccaoUrinaria} onToggle={setInfeccaoUrinaria} />
        <ToggleButton label="Infertilidade" value={infertilidade} onToggle={setInfertilidade} />
        <ToggleButton label="Dificul. Amamentação" value={dificulAmamentacao} onToggle={setDificulAmamentacao} />
        <ToggleButton label="Cardiopatia" value={cardiopatia} onToggle={setCardiopatia} />
        <ToggleButton label="Tromboembolismo" value={tromboembolismo} onToggle={setTromboembolismo} />
        <ToggleButton label="Hipertensão Arterial" value={hipertensao} onToggle={setHipertensao} />
        <ToggleButton label="Cir. Pélv. Uterina" value={cirurgiaPelvica} onToggle={setCirurgiaPelvica} />
        <ToggleButton label="Cirurgia" value={cirurgia} onToggle={setCirurgia} />
        <ToggleButton label="Outros" value={outros} onToggle={setOutros} />

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
            <Text style={styles.buttonText}>Gestação Atual (Tela 9)</Text>
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