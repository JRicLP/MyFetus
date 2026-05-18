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

// --- Funções de Cálculo ---
const calcularIdade = (dataNasc: Date) => {
  const hoje = new Date();
  let idade = hoje.getFullYear() - dataNasc.getFullYear();
  const m = hoje.getMonth() - dataNasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
    idade--;
  }
  return idade;
};

// Formata AAAA-MM-DD (do banco) para DD/MM/AAAA (para exibir)
const formatarDataParaExibir = (dataISO: string) => {
  if (!dataISO) return "";
  const dataObj = new Date(dataISO);
  const dia = String(dataObj.getUTCDate()).padStart(2, '0');
  const mes = String(dataObj.getUTCMonth() + 1).padStart(2, '0');
  const ano = dataObj.getUTCFullYear();
  return `${dia}/${mes}/${ano}`;
};

// Converte DD/MM/AAAA (do input) para AAAA-MM-DD (para o banco)
const formatarDataParaSalvar = (dataDisplay: string) => {
  if (dataDisplay.length !== 10) return null; // Formato inválido
  const [dia, mes, ano] = dataDisplay.split('/');
  return `${ano}-${mes}-${dia}`;
};

//  A "Máscara" de input de data
const formatarDataInput = (text: string) => {
  const cleaned = text.replace(/\D/g, ''); // Remove tudo que não for dígito
  const match = cleaned.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (match) {
    return `${match[1]}/${match[2]}/${match[3]}`;
  }
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  } else if (cleaned.length > 2) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
  }
  return cleaned;
};
// --- Fim das Funções ---


export default function IdentificacaoScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams(); 

  // --- Estados do Formulário ---
  const [nome, setNome] = useState('');
  const [displayDate, setDisplayDate] = useState(''); // (NOVO) O que o usuário vê: DD/MM/AAAA
  
  // --- Estados de Controle ---
  const [idade, setIdade] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // --- useEffect para BUSCAR os dados ---
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
        
        setNome(data.patient_name || ''); 
        setUserId(data.user_id);
        
        // Preenche a data de exibição
        if (data.birthdate) {
          const dataFormatada = formatarDataParaExibir(data.birthdate);
          setDisplayDate(dataFormatada);
          setIdade(calcularIdade(new Date(data.birthdate)));
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

  // Atualiza a idade dinamicamente enquanto digita
  const handleDateChange = (text: string) => {
    const formatted = formatarDataInput(text);
    setDisplayDate(formatted);

    // Recalcula a idade se a data estiver completa
    if (formatted.length === 10) {
      const dataISO = formatarDataParaSalvar(formatted);
      if (dataISO) {
        setIdade(calcularIdade(new Date(dataISO)));
      }
    }
  };

  // --- handleNext  SALVA NOME E DATA ---
  const handleNext = async () => {
    if (isSaving) return;
    if (!nome || displayDate.length !== 10) {
      Alert.alert('Erro', 'Por favor, preencha o nome e a data de nascimento completa (DD/MM/AAAA).');
      return;
    }
    if (!userId) {
       Alert.alert('Erro', 'ID do usuário não encontrado. Não é possível salvar.');
       return;
    }

    //  Converte a data para o formato do banco
    const dataParaSalvar = formatarDataParaSalvar(displayDate);
    if (!dataParaSalvar) {
      Alert.alert('Erro', 'Data inválida.');
      return;
    }

    setIsSaving(true);
    try {
      // ALIMENTANDO O BD com NOME e DATA
      const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: nome,
          birthdate: dataParaSalvar // Enviando a data no formato AAAA-MM-DD
        }), 
      });

      if (!response.ok) {
        const erroData = await response.json();
        throw new Error(erroData.error || 'Falha ao salvar os dados da paciente');
      }

      router.push(`/doctor/${patientId}/informacoes_iniciais`);

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
        <Text style={styles.label}>Nome da paciente</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Nome completo"
          editable={!isSaving}
        />

        <Text style={styles.label}>Data de Nascimento</Text>
        <TextInput
          style={styles.input}
          value={displayDate} 
          onChangeText={handleDateChange} 
          placeholder="DD/MM/AAAA"
          editable={!isSaving} 
          keyboardType="numeric"
          maxLength={10}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>A idade da Paciente é</Text>
          <Text style={styles.infoValue}>{idade} anos</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={[
              styles.infoValue, 
              (idade >= 35 || idade <= 15) ? styles.riscoAlto : styles.riscoNormal
            ]}>
            {(idade >= 35 || idade <= 15) ? 'Considerado Gravidez de Risco' : 'Não é considerado gravidez de Risco'}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, isSaving && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Informações da Paciente (Tela 3)</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ESTILOS 
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E6E0F8',
  },
  container: {
    flexGrow: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    marginLeft: 10,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  infoBox: {
    alignItems: 'center',
    marginVertical: 15,
  },
  infoTitle: {
    fontSize: 20,
    color: '#555',
  },
  infoValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  riscoAlto: {
    color: '#e74c3c',
  },
  riscoNormal: {
    color: '#27ae60',
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