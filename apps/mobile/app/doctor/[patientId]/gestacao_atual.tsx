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


export default function GestacaoAtualScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams(); 

  // --- Estados do Formulário ---
  const [fuma, setFuma] = useState(false);
  const [quantCigarros, setQuantCigarros] = useState('0');
  const [alcool, setAlcool] = useState(false);
  const [outrasDrogas, setOutrasDrogas] = useState(false);
  const [hiv, setHiv] = useState(false);
  const [sifilis, setSifilis] = useState(false);
  const [toxoplasmose, setToxoplasmose] = useState(false);
  const [infeccaoUrinaria, setInfeccaoUrinaria] = useState(false);
  const [anemia, setAnemia] = useState(false);
  const [incIstmo, setIncIstmo] = useState(false);
  const [ameacaParto, setAmeacaParto] = useState(false);
  const [isoimunizacaoRh, setIsoimunizacaoRh] = useState(false);
  const [oligoPoli, setOligoPoli] = useState(false);
  const [rutPrem, setRutPrem] = useState(false);
  const [ciur, setCiur] = useState(false);
  const [posDatismo, setPosDatismo] = useState(false);
  const [febre, setFebre] = useState(false);
  const [hipertensao, setHipertensao] = useState(false);
  const [preEclampsia, setPreEclampsia] = useState(false);
  const [cardiopatia, setCardiopatia] = useState(false);
  const [diabetesGest, setDiabetesGest] = useState(false);
  const [usoInsulina, setUsoInsulina] = useState(false);
  const [hemorragia1, setHemorragia1] = useState(false);
  const [hemorragia2, setHemorragia2] = useState(false);
  const [hemorragia3, setHemorragia3] = useState(false);
  const [exantema, setExantema] = useState(false);
  
  // --- Estados de Controle ---
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Helper
  const intToString = (val: number) => val ? String(val) : "0";
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
        const response = await fetch(`http://localhost:3000/api/pregnants/${patientId}`);
        if (!response.ok) { throw new Error('Erro ao buscar dados'); }
        const data = await response.json();
        
        // Carregando dados 
        setFuma(data.gestacao_atual_fumante || false);
        setQuantCigarros(intToString(data.gestacao_atual_qtd_cigarros)); 
        setAlcool(data.gestacao_atual_alcool || false);
        setOutrasDrogas(data.gestacao_atual_outras_drogas || false);
        setHiv(data.gestacao_atual_hiv_aids || false); 
        setSifilis(data.gestacao_atual_sifilis || false);
        setToxoplasmose(data.gestacao_atual_toxoplasmose || false);
        setInfeccaoUrinaria(data.gestacao_atual_infeccao_urinaria || false);
        setAnemia(data.gestacao_atual_anemia || false);
        setIncIstmo(data.gestacao_atual_inc_istmocervical || false);
        setAmeacaParto(data.gestacao_atual_ameaca_parto_premat || false); 
        setIsoimunizacaoRh(data.gestacao_atual_imuniz_rh || false); 
        setOligoPoli(data.gestacao_atual_oligo_polidramio || false); 
        setRutPrem(data.gestacao_atual_rut_prem_membrana || false); 
        setCiur(data.gestacao_atual_ciur || false);
        setPosDatismo(data.gestacao_atual_pos_datismo || false);
        setFebre(data.gestacao_atual_febre || false);
        setHipertensao(data.gestacao_atual_hipertensao_arterial || false); 
        setPreEclampsia(data.gestacao_atual_pre_eclamp_eclamp || false); 
        setCardiopatia(data.gestacao_atual_cardiopatia || false);
        setDiabetesGest(data.gestacao_atual_diabete_gestacional || false);
        setUsoInsulina(data.gestacao_atual_uso_insulina || false);
        setHemorragia1(data.gestacao_atual_hemorragia_1trim || false);
        setHemorragia2(data.gestacao_atual_hemorragia_2trim || false); 
        setHemorragia3(data.gestacao_atual_hemorragia_3trim || false);
        setExantema(data.exantema_rash || false); 

      } catch (error) {
        console.error(error);
        Alert.alert('Erro', error instanceof Error ? error.message : 'Erro de rede');
      } finally {
        setLoading(false);
      }
    };
    fetchPatientData();
  }, [patientId]);


  // --- handleNext SALVA os dados ---
  const handleNext = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const response = await fetch(`http://localhost:3000/api/pregnants/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gestacao_atual_fumante: fuma,
          gestacao_atual_quant_cigarros: parseInputInt(quantCigarros), 
          gestacao_atual_alcool: alcool,
          gestacao_atual_outras_drogas: outrasDrogas,
          gestacao_atual_hiv_aids: hiv, 
          gestacao_atual_sifilis: sifilis,
          gestacao_atual_toxoplasmose: toxoplasmose,
          gestacao_atual_infeccao_urinaria: infeccaoUrinaria,
          gestacao_atual_anemia: anemia,
          gestacao_atual_inc_istmocervical: incIstmo, 
          gestacao_atual_ameaca_parto_premat: ameacaParto, 
          gestacao_atual_imuniz_rh: isoimunizacaoRh, 
          gestacao_atual_oligo_polidramio: oligoPoli,
          gestacao_atual_rut_prem_membrana: rutPrem, 
          gestacao_atual_ciur: ciur,
          gestacao_atual_pos_datismo: posDatismo,
          gestacao_atual_febre: febre,
          gestacao_atual_hipertensao_arterial: hipertensao, 
          gestacao_atual_pre_eclamp_eclamp: preEclampsia,
          gestacao_atual_cardiopatia: cardiopatia,
          gestacao_atual_diabete_gestacional: diabetesGest,
          gestacao_atual_uso_insulina: usoInsulina,
          gestacao_atual_hemorragia_1trim: hemorragia1, 
          gestacao_atual_hemorragia_2trim: hemorragia2, 
          gestacao_atual_hemorragia_3trim: hemorragia3,
          exantema_rash: exantema, 
        }),
      });

      if (!response.ok) { throw new Error('Falha ao salvar os dados'); }
      router.push(`/doctor/${patientId}/vacina`);

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
          label="Fuma"
          value={fuma}
          onToggle={setFuma}
        />

        {fuma && (
          <View style={styles.textInputContainer}>
            <Text style={styles.label}>Quantos cigarros em média</Text>
            <TextInput
              style={styles.input}
              value={quantCigarros}
              onChangeText={setQuantCigarros}
              keyboardType="numeric"
              editable={!isSaving}
            />
          </View>
        )}

        <ToggleButton label="Álcool" value={alcool} onToggle={setAlcool} />
        <ToggleButton label="Outras Drogas" value={outrasDrogas} onToggle={setOutrasDrogas} />
        <ToggleButton label="HIV/Aids" value={hiv} onToggle={setHiv} />
        <ToggleButton label="Sífilis" value={sifilis} onToggle={setSifilis} />
        <ToggleButton label="Toxoplasmose" value={toxoplasmose} onToggle={setToxoplasmose} />
        <ToggleButton label="Infecção urinária" value={infeccaoUrinaria} onToggle={setInfeccaoUrinaria} />
        <ToggleButton label="Anemia" value={anemia} onToggle={setAnemia} />
        <ToggleButton label="Inc. Istmocervical" value={incIstmo} onToggle={setIncIstmo} />
        <ToggleButton label="Ameaça de Part prem." value={ameacaParto} onToggle={setAmeacaParto} />
        <ToggleButton label="Isoimunização Rh" value={isoimunizacaoRh} onToggle={setIsoimunizacaoRh} />
        <ToggleButton label="Oligo/Polidrâmnio" value={oligoPoli} onToggle={setOligoPoli} />
        <ToggleButton label="Rut. prem. Membrana" value={rutPrem} onToggle={setRutPrem} />
        <ToggleButton label="CIUR" value={ciur} onToggle={setCiur} />
        <ToggleButton label="Pós-Datismo" value={posDatismo} onToggle={setPosDatismo} />
        <ToggleButton label="Febre" value={febre} onToggle={setFebre} />
        <ToggleButton label="Hipertensão Arterial" value={hipertensao} onToggle={setHipertensao} />
        <ToggleButton label="Pré-eclamp/Eclâmp" value={preEclampsia} onToggle={setPreEclampsia} />
        <ToggleButton label="Cardiopatia" value={cardiopatia} onToggle={setCardiopatia} />
        <ToggleButton label="Diabetes Gestacional" value={diabetesGest} onToggle={setDiabetesGest} />
        <ToggleButton label="Uso de Insulina" value={usoInsulina} onToggle={setUsoInsulina} />
        <ToggleButton label="Hemorragia 1º trim." value={hemorragia1} onToggle={setHemorragia1} />
        <ToggleButton label="Hemorragia 2º trim." value={hemorragia2} onToggle={setHemorragia2} />
        <ToggleButton label="Hemorragia 3º trim." value={hemorragia3} onToggle={setHemorragia3} />
        <ToggleButton label="Exantema/ rash cutâneo" value={exantema} onToggle={setExantema} />

        {/* Botão para a próxima tela */}
        <TouchableOpacity 
          style={[styles.button, isSaving && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Vacinas (Tela 10)</Text>
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
  textInputContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F0EFFF',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
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