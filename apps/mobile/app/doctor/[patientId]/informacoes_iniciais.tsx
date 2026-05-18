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

// --- Funções de Cálculo  ---
const calcularIMC = (peso: number, altura: number) => {
  if (!peso || !altura) return 0;
  return peso / (altura * altura);
};
const classificarIMC = (imc: number) => {
  if (imc < 18.5) return 'Abaixo do peso';
  if (imc < 24.9) return 'Normal';
  if (imc < 29.9) return 'Sobrepeso';
  return 'Obesidade';
};
const classificarGanhoPeso = (ganho: number) => {
  if (ganho <= 0) return 'Normal';
  if (ganho < 5) return 'Normal';
  return 'Acima da Normalidade';
};
const classificarFC = (fc: number) => {
  if (!fc) return '';
  if (fc < 60) return 'Bradicardia';
  if (fc > 100) return 'Taquicardia';
  return 'Normal';
};
const classificarTemp = (temp: number) => {
  if (!temp) return '';
  if (temp >= 37.8) return 'Febre';
  if (temp >= 37.3) return 'Febril';
  return 'Normal';
};
// --- Fim das Funções ---


export default function InfoIniciaisScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams(); 

  // --- Estados do Formulário  ---
  const [altura, setAltura] = useState('');
  const [pesoPre, setPesoPre] = useState('');
  const [pesoAtual, setPesoAtual] = useState('');
  const [freqCardiaca, setFreqCardiaca] = useState(''); // (AGORA É REAL)
  const [temperatura, setTemperatura] = useState(''); // (AGORA É REAL)

  // --- Estados dos Cálculos ---
  const [imc, setImc] = useState(0);
  const [classImc, setClassImc] = useState('');
  const [ganhoPeso, setGanhoPeso] = useState(0);
  const [classGanhoPeso, setClassGanhoPeso] = useState('');
  const [classFc, setClassFc] = useState('');
  const [classTemp, setClassTemp] = useState('');

  // --- Estados de Controle ---
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pregnancyId, setPregnancyId] = useState<string | null>(null); // (NOVO)

  // Helper
  const parseInputFloat = (input: string) => {
    if (input === '') return 0;
    return parseFloat(input.replace(',', '.'));
  }
  const parseInputInt = (input: string) => {
    if (input === '') return 0;
    return parseInt(input, 10);
  }

  // --- useEffect para LER os dados ---
  useEffect(() => {
    if (!patientId) return;

    const fetchPatientData = async () => {
      try {
        setLoading(true);
        // 1. LENDO OS DADOS 
        const response = await fetch(`http://localhost:3000/api/pregnants/${patientId}`);
        if (!response.ok) {
          throw new Error('Não foi possível buscar os dados da paciente');
        }
        const data = await response.json();
        
        // Dados da Tabela 'pregnants'
        setAltura(data.altura ? String(data.altura) : '');
        setPesoPre(data.peso_pregestacional ? String(data.peso_pregestacional) : '');
        setPesoAtual(data.peso_atual ? String(data.peso_atual) : '');
        setTemperatura(data.temperatura_materna ? String(data.temperatura_materna) : ''); // (NOVO)

        // Dados da Tabela 'pregnancies' 
        if (data.latest_pregnancy) {
          setPregnancyId(data.latest_pregnancy.id);
          setFreqCardiaca(data.latest_pregnancy.frequencia_cardiaca ? String(data.latest_pregnancy.frequencia_cardiaca) : ''); // (NOVO)
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


  // --- useEffect para RECALCULAR ---
  useEffect(() => {
    const numAltura = parseInputFloat(altura);
    const numPesoPre = parseInputFloat(pesoPre);
    const numPesoAtual = parseInputFloat(pesoAtual);
    const numFc = parseInputInt(freqCardiaca); 
    const numTemp = parseInputFloat(temperatura); 

    // ... (cálculos de IMC e Ganho de Peso)
    const novoImc = calcularIMC(numPesoPre, numAltura);
    setImc(novoImc);
    setClassImc(classificarIMC(novoImc));

    if (numPesoPre > 0 && numPesoAtual > 0) {
      const novoGanho = numPesoAtual - numPesoPre;
      setGanhoPeso(novoGanho);
      setClassGanhoPeso(classificarGanhoPeso(novoGanho));
    } else {
      setGanhoPeso(0);
      setClassGanhoPeso('');
    }

    
    setClassFc(classificarFC(numFc));
    setClassTemp(classificarTemp(numTemp));
    
  }, [altura, pesoPre, pesoAtual, freqCardiaca, temperatura]);

  
  // ---  handleNext faz DOIS SALVAMENTOS ---
  const handleNext = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      // --- SALVAMENTO 1: Tabela 'pregnants' ---
      const pregnantResponse = await fetch(`http://localhost:3000/api/pregnants/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          altura: parseInputFloat(altura),
          peso_pregestacional: parseInputFloat(pesoPre),
          peso_atual: parseInputFloat(pesoAtual),
          temperatura_materna: parseInputFloat(temperatura)
        }),
      });
      if (!pregnantResponse.ok) {
        throw new Error('Falha ao salvar os dados da gestante');
      }
      
      // --- SALVAMENTO 2: Tabela 'pregnancies' ---
      if (pregnancyId) { // Só salva se tivermos um ID de gestação
        const pregnancyResponse = await fetch(`http://localhost:3000/api/pregnancies/${pregnancyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frequencia_cardiaca: parseInputInt(freqCardiaca) 
          }),
        });
        if (!pregnancyResponse.ok) {
          throw new Error('Falha ao salvar os dados da gestação');
        }
      } else {
        console.warn("Não foi possível salvar Frequência Cardíaca: ID da gestação não encontrado.");
      }

      // 3. NAVEGANDO
      router.push(`/doctor/${patientId}/grafico`);

    } catch (error) {
      console.error(error);
      Alert.alert('Erro ao Salvar', error instanceof Error ? error.message : 'Erro de rede');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper de cor 
  const getClassStyle = (classificacao: string) => {
    if (classificacao === 'Normal') return styles.classNormal;
    if (classificacao.includes('Acima') || classificacao === 'Taquicardia' || classificacao === 'Febre') return styles.classAmarelo;
    if (classificacao === 'Abaixo do peso') return styles.classAmarelo;
    if (classificacao === 'Bradicardia') return styles.classAmarelo;
    return styles.classVermelho;
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
        
        {/* --- DADOS REAIS --- */}
        <Text style={styles.label}>Altura da paciente (m)</Text>
        <TextInput style={styles.input} value={altura} onChangeText={setAltura} placeholder="Ex: 1.65" keyboardType="numeric" editable={!isSaving} />
        <Text style={styles.label}>Peso pré-gestacional da paciente (kg)</Text>
        <TextInput style={styles.input} value={pesoPre} onChangeText={setPesoPre} placeholder="Ex: 60" keyboardType="numeric" editable={!isSaving} />
        <View style={styles.calcBox}>
          <Text style={styles.calcTitle}>IMC pré-gestacional</Text>
          <Text style={styles.calcValue}>{imc.toFixed(1)} kg/m²</Text>
          <Text style={[styles.calcClass, getClassStyle(classImc)]}>{classImc}</Text>
        </View>
        <Text style={styles.label}>Peso atual (kg)</Text>
        <TextInput style={styles.input} value={pesoAtual} onChangeText={setPesoAtual} placeholder="Ex: 64" keyboardType="numeric" editable={!isSaving} />
        <View style={styles.calcBox}>
          <Text style={styles.calcTitle}>O ganho de peso foi</Text>
          <Text style={styles.calcValue}>{ganhoPeso.toFixed(0)} kg</Text>
          <Text style={[styles.calcClass, getClassStyle(classGanhoPeso)]}>{classGanhoPeso}</Text>
        </View>

        {/* --- DADOS REAIS  --- */}
        <Text style={styles.label}>Frequência Cardíaca</Text>
        <TextInput
          style={styles.input}
          value={freqCardiaca}
          onChangeText={setFreqCardiaca}
          placeholder="bpm"
          keyboardType="numeric"
          editable={!isSaving}
        />
        <View style={styles.calcBox}>
          <Text style={styles.calcTitle}>Classificação:</Text>
          <Text style={[styles.calcClass, getClassStyle(classFc)]}>
            {classFc}
          </Text>
        </View>
        <Text style={styles.label}>Temperatura Materna</Text>
        <TextInput
          style={styles.input}
          value={temperatura}
          onChangeText={setTemperatura}
          placeholder="°C"
          keyboardType="numeric"
          editable={!isSaving}
        />
        <View style={styles.calcBox}>
          <Text style={styles.calcTitle}>Classificação:</Text>
          <Text style={[styles.calcClass, getClassStyle(classTemp)]}>
            {classTemp}
          </Text>
        </View>
        
        {/* --- BOTÃO  --- */}
        <TouchableOpacity 
          style={[styles.button, isSaving && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Gráfico de Acompanhamento (Tela 4)</Text>
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
    marginBottom: 10,
  },
  calcBox: {
    alignItems: 'center',
    marginVertical: 10,
    marginBottom: 20,
  },
  calcTitle: {
    fontSize: 18,
    color: '#555',
  },
  calcValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 4,
  },
  calcClass: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  classNormal: {
    color: '#27ae60',
  },
  classAmarelo: {
    color: '#f39c12',
  },
  classVermelho: {
    color: '#e74c3c',
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