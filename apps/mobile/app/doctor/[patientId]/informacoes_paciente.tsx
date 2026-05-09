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

// --- Funções de Classificação ---
const classificarPA = (sistole: number, diastole: number) => {
  if (!sistole || !diastole) return '';
  if (sistole < 90 || diastole < 60) return 'Hipotensão';
  if (sistole <= 120 && diastole <= 80) return 'Normal';
  if (sistole <= 139 || diastole <= 89) return 'Pré-hipertensão';
  return 'Hipertensão';
};
const classificarGlicemia = (glicemia: number) => {
  if (!glicemia) return '';
  if (glicemia < 70) return 'Hipoglicemia';
  if (glicemia < 100) return 'Normal';
  if (glicemia < 126) return 'Acima da Normalidade';
  return 'Diabetes';
};
const classificarBCF = (bcf: number) => {
  if (!bcf) return '';
  if (bcf < 110) return 'Bradicardia Fetal';
  if (bcf > 160) return 'Taquicardia Fetal';
  return 'Normal';
};
const classificarAlturaUterina = (altura: number) => {
  if (!altura) return '';
  if (altura < 10) return 'Normal'; 
  return 'Acima da Normalidade';
};
// --- Fim das Funções ---


export default function InfoPacienteScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams(); 

  // --- Estados do Formulário ---
  const [sistole, setSistole] = useState('');
  const [diastole, setDiastole] = useState('');
  const [glicemia, setGlicemia] = useState('');
  const [alturaUterina, setAlturaUterina] = useState('');
  const [bcf, setBcf] = useState(''); 

  // --- Estados das Classificações ---
  const [classPA, setClassPA] = useState('');
  const [classGlicemia, setClassGlicemia] = useState('');
  const [classAltura, setClassAltura] = useState('');
  const [classBcf, setClassBcf] = useState('');
  
  // --- Estados de Controle ---
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pregnancyId, setPregnancyId] = useState<string | null>(null);

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
        setSistole(data.pressao_sistole ? String(data.pressao_sistole) : '');
        setDiastole(data.pressao_diastole ? String(data.pressao_diastole) : '');

        // Dados da Tabela 'pregnancies' 
        if (data.latest_pregnancy) {
          setPregnancyId(data.latest_pregnancy.id);
          setGlicemia(data.latest_pregnancy.glicemia ? String(data.latest_pregnancy.glicemia) : '');
          setBcf(data.latest_pregnancy.frequencia_cardiaca ? String(data.latest_pregnancy.frequencia_cardiaca) : '');
          setAlturaUterina(data.latest_pregnancy.altura_uterina ? String(data.latest_pregnancy.altura_uterina) : '');
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
    const numSistole = parseInputInt(sistole);
    const numDiastole = parseInputInt(diastole);
    const numGlicemia = parseInputFloat(glicemia);
    const numAltura = parseInputFloat(alturaUterina);
    const numBcf = parseInputInt(bcf);

    setClassPA(classificarPA(numSistole, numDiastole));
    setClassGlicemia(classificarGlicemia(numGlicemia));
    setClassAltura(classificarAlturaUterina(numAltura));
    setClassBcf(classificarBCF(numBcf));

  }, [sistole, diastole, glicemia, alturaUterina, bcf]);

  
  // --- handleNext faz DOIS SALVAMENTOS ---
  const handleNext = async () => {
    if (isSaving || !pregnancyId) {
      if (!pregnancyId) Alert.alert('Erro', 'ID da gestação não encontrado. Não é possível salvar.');
      return;
    }
    setIsSaving(true);
    
    try {
      // --- SALVAMENTO 1: Tabela 'pregnants' ---
      // (Sistole / Diastole)
      const pregnantResponse = await fetch(`http://localhost:3000/api/pregnants/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pressao_sistole: parseInputInt(sistole),
          pressao_diastole: parseInputInt(diastole)
        }),
      });
      if (!pregnantResponse.ok) {
        throw new Error('Falha ao salvar os dados de pressão');
      }

      // --- SALVAMENTO 2: Tabela 'pregnancies' ---
      // (Glicemia / BCF / Altura Uterina)
      const pregnancyResponse = await fetch(`http://localhost:3000/api/pregnancies/${pregnancyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          glicemia: parseInputFloat(glicemia),
          frequencia_cardiaca: parseInputInt(bcf),
          altura_uterina: parseInputFloat(alturaUterina)
        }),
      });
      if (!pregnancyResponse.ok) {
        throw new Error('Falha ao salvar os dados da gestação');
      }

      // 3. NAVEGANDO
      router.push(`/doctor/${patientId}/antecedentes_familiares`);

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
    if (classificacao.includes('Acima') || classificacao.includes('Pré-hipertensão')) return styles.classAmarelo;
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
        
        {/* --- Pressão Arterial  --- */}
        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <Text style={styles.label}>Sístole</Text>
            <TextInput style={styles.input} value={sistole} onChangeText={setSistole} placeholder="mmHg" keyboardType="numeric" editable={!isSaving}/>
          </View>
          <View style={styles.inputHalf}>
            <Text style={styles.label}>Diástole</Text>
            <TextInput style={styles.input} value={diastole} onChangeText={setDiastole} placeholder="mmHg" keyboardType="numeric" editable={!isSaving}/>
          </View>
        </View>
        <View style={styles.calcBox}>
          <Text style={styles.calcTitle}>Classificação:</Text>
          <Text style={[styles.calcClass, getClassStyle(classPA)]}>
            {classPA}
          </Text>
        </View>

        {/* --- Glicemia --- */}
        <Text style={styles.label}>Glicemia em Jejum</Text>
        <TextInput style={styles.input} value={glicemia} onChangeText={setGlicemia} placeholder="mg/dL" keyboardType="numeric" editable={!isSaving} />
        <View style={styles.calcBox}>
          <Text style={styles.calcTitle}>Classificação:</Text>
          <Text style={[styles.calcClass, getClassStyle(classGlicemia)]}>
            {classGlicemia}
          </Text>
        </View>

        {/* --- Informações do Feto --- */}
        <Text style={styles.sectionTitle}>Informações sobre o feto</Text>

        {/* --- Altura Uterina  --- */}
        <Text style={styles.label}>Altura uterina</Text>
        <TextInput style={styles.input} value={alturaUterina} onChangeText={setAlturaUterina} placeholder="cm" keyboardType="numeric" editable={!isSaving}/>
        <View style={styles.calcBox}>
          <Text style={styles.calcTitle}>Classificação:</Text>
          <Text style={[styles.calcClass, getClassStyle(classAltura)]}>
            {classAltura}
          </Text>
        </View>

        {/* --- Batimentos cardíacos fetais  --- */}
        <Text style={styles.label}>Batimentos cardíacos fetais</Text>
        <TextInput style={styles.input} value={bcf} onChangeText={setBcf} placeholder="bpm" keyboardType="numeric" editable={!isSaving} />
        <View style={styles.calcBox}>
          <Text style={styles.calcTitle}>Classificação:</Text>
          <Text style={[styles.calcClass, getClassStyle(classBcf)]}>
            {classBcf}
          </Text>
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
            <Text style={styles.buttonText}>Antecedentes Familiares (Tela 6)</Text>
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
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputHalf: {
    width: '48%',
  },
  calcBox: {
    alignItems: 'flex-end',
    marginVertical: 5,
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  calcTitle: {
    fontSize: 16,
    color: '#555',
  },
  calcClass: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#CCC',
    paddingTop: 15,
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