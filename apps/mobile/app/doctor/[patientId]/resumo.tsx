import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator, 
  Alert, 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; 

// ---  Funções de Cálculo e Formatação ---
const calcularIdade = (dataNasc: Date) => {
  const hoje = new Date();
  let idade = hoje.getFullYear() - dataNasc.getFullYear();
  const m = hoje.getMonth() - dataNasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
    idade--;
  }
  return idade;
};
const formatarData = (dataISO: string) => {
  if (!dataISO) return "N/A";
  const dataObj = new Date(dataISO);
  const dia = String(dataObj.getUTCDate()).padStart(2, '0');
  const mes = String(dataObj.getUTCMonth() + 1).padStart(2, '0');
  const ano = dataObj.getUTCFullYear();
  return `${dia}/${mes}/${ano}`;
};
const calcularIMC = (peso: number, altura: number) => {
  if (!peso || !altura) return 0;
  return peso / (altura * altura);
};
const classificarIMC = (imc: number) => {
  if (imc === 0) return '';
  if (imc < 18.5) return 'Abaixo do peso';
  if (imc < 24.9) return 'Normal';
  if (imc < 29.9) return 'Sobrepeso';
  return 'Obesidade';
};
const classificarPA = (sistole: number, diastole: number) => {
  if (!sistole || !diastole) return 'N/A';
  if (sistole < 90 || diastole < 60) return 'Hipotensão';
  if (sistole <= 120 && diastole <= 80) return 'Normal';
  if (sistole <= 139 || diastole <= 89) return 'Pré-hipertensão';
  return 'Hipertensão';
};
// --- Fim das Funções ---

// -- Componente de Título de Seção  --
const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

// -- Componente de Item  --
const InfoItem: React.FC<{ label: string; value: string; isSim: boolean }> = ({ label, value, isSim }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, isSim ? styles.valueSim : styles.valueNao]}>
      {value}
    </Text>
  </View>
);
// --- Fim dos Componentes ---

//  Interface para os Exames (Tela 12)
interface Exame {
  id: string;
  descricao: string;
  data_evento: string;
}

// Interface para os dados 
interface PacienteCompleto {
  patient_name: string;
  birthdate: string;
  altura: number;
  peso_pregestacional: number;
  peso_atual: number;
  temperatura_materna: number;
  pressao_sistole: number;
  pressao_diastole: number;
  
  latest_pregnancy: {
    id: string;
    weeks: number;
    dum: string; 
    dpp: string; 
    glicemia: number;
    frequencia_cardiaca: number; 
    altura_uterina: number;
  };
  
  all_events: Exame[] | null; 
  
  // Tela 6
  antecedentes_diabetes: boolean;
  antecedentes_hipertensao: boolean;
  antecedentes_gemelar: boolean;
  antecedentes_outros: boolean;
  antecedentes_texto: string;
  
  // Tela 7
  gestacao_partos: number;
  gestacao_vaginal: number;
  gestacao_cesarea: number;
  gestacao_bebe_maior_45: boolean;
  gestacao_bebe_maior_25: boolean;
  gestacao_eclampsia_pre_eclampsia: boolean;
  gestacao_gestas: boolean;
  gestacao_abortos: number;
  gestacao_mais_tres_abortos: boolean;
  gestacao_nascidos_vivos: number;
  gestacao_nascidos_mortos: number;
  gestacao_vivem: number;
  gestacao_mortos_primeira_semana: number;
  gestacao_mortos_depois_primeira_semana: number;
  gestacao_final_gestacao_anterior_1ano: boolean;
  
  // Tela 8
  antecedentes_clinicos_diabetes: boolean;
  antecedentes_clinicos_infeccao_urinaria: boolean;
  antecedentes_clinicos_infertilidade: boolean;
  antecedentes_clinicos_dific_amamentacao: boolean;
  antecedentes_clinicos_cardiopatia: boolean;
  antecedentes_clinicos_tromboembolismo: boolean;
  antecedentes_clinicos_hipertensao_arterial: boolean;
  antecedentes_clinicos_cirur_per_uterina: boolean;
  antecedentes_clinicos_cirurgia: boolean;
  antecedentes_clinicos_outros: boolean;
  antecedentes_clinicos_outros_texto: string;
  
  // Tela 9
  gestacao_atual_fumante: boolean;
  gestacao_atual_quant_cigarros: number;
  gestacao_atual_alcool: boolean;
  gestacao_atual_outras_drogas: boolean;
  gestacao_atual_hiv_aids: boolean;
  gestacao_atual_sifilis: boolean;
  gestacao_atual_toxoplasmose: boolean;
  gestacao_atual_infeccao_urinaria: boolean;
  gestacao_atual_anemia: boolean;
  gestacao_atual_inc_istmocervical: boolean;
  gestacao_atual_ameaca_parto_premat: boolean;
  gestacao_atual_imuniz_rh: boolean;
  gestacao_atual_oligo_polidramio: boolean;
  gestacao_atual_rut_prem_membrana: boolean;
  gestacao_atual_ciur: boolean;
  gestacao_atual_pos_datismo: boolean;
  gestacao_atual_febre: boolean;
  gestacao_atual_hipertensao_arterial: boolean;
  gestacao_atual_pre_eclamp_eclamp: boolean;
  gestacao_atual_cardiopatia: boolean;
  gestacao_atual_diabete_gestacional: boolean;
  gestacao_atual_uso_insulina: boolean;
  gestacao_atual_hemorragia_1trim: boolean;
  gestacao_atual_hemorragia_2trim: boolean;
  gestacao_atual_hemorragia_3trim: boolean;
  exantema_rash: boolean;
  
  // Tela 10 
  vacina_antitetanica: boolean;
  vacina_antitetanica_1dose: string;
  vacina_antitetanica_2dose: string;
  vacina_antitetanica_dtpa: string;
  vacina_hepatite_b: boolean;
  vacina_hepatite_b_1dose: string;
  vacina_hepatite_b_2dose: string;
  vacina_hepatite_b_3dose: string;
  vacina_influenza: boolean;
  vacina_influenza_1dose: string;
  vacina_covid19: boolean;
  vacina_covid19_1dose: string;
  vacina_covid19_2dose: string;

  // Tela 13
  info_gerais_edemas: string;
  info_gerais_sintomas: string;
  info_gerais_estado_geral_1: string;
  info_gerais_estado_geral_2: string;
  info_gerais_nutricional: string;
  info_gerais_psicossocial: string;
}


export default function ResumoScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams(); 

  // --- Estados de Dados ---
  const [paciente, setPaciente] = useState<PacienteCompleto | null>(null);
  const [loading, setLoading] = useState(true);

  // ---  useEffect para LER TUDO ---
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
        setPaciente(data);
      } catch (error) {
        console.error(error);
        Alert.alert('Erro', error instanceof Error ? error.message : 'Erro de rede');
      } finally {
        setLoading(false);
      }
    };
    fetchPatientData();
  }, [patientId]);


  const handleBackToStart = () => {
    router.push(`/doctor/dashboard`);
  };

  // ---  Cálculos derivados ---
  const idade = paciente ? calcularIdade(new Date(paciente.birthdate)) : 0;
  const risco = (idade >= 35 || idade <= 15) ? "é considerada gravidez de Risco" : "não é considerada gravidez de Risco";
  const imc = paciente ? calcularIMC(paciente.peso_pregestacional, paciente.altura) : 0;
  const classImc = classificarIMC(imc);
  const ganhoPeso = paciente ? paciente.peso_atual - paciente.peso_pregestacional : 0;
  const pa = paciente ? `${paciente.pressao_sistole}/${paciente.pressao_diastole} mmHg` : 'N/A';
  const classPa = paciente ? classificarPA(paciente.pressao_sistole, paciente.pressao_diastole) : '';

  // ---  Telas de Loading / Erro ---
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#886aea" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }
  if (!paciente) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.textGrave}>Não foi possível carregar os dados da paciente.</Text>
      </SafeAreaView>
    );
  }

  // --- JSX  ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* --- CABEÇALHO --- */}
        <View style={styles.header}>
          <Text style={styles.headerNome}>{paciente.patient_name} [{idade} anos]</Text>
          <Text style={styles.headerSub}>A paciente {risco}</Text>
        </View>

        {/* --- SEÇÃO DE GESTAÇÃO (COM DPP) --- */}
        <View style={styles.card}>
          <SectionTitle title="Gestação Atual" />
          {paciente.latest_pregnancy ? (
            <View style={styles.gestacaoInfo}>
              <View>
                <Text style={styles.gestacaoLabel}>Data da Última Menstruação (DUM):</Text>
                <Text style={styles.gestacaoSemanas}>{formatarData(paciente.latest_pregnancy.dum)}</Text>
                <Text style={styles.gestacaoLabel}>Data prevista para o parto (DPP):</Text>
                <Text style={styles.gestacaoDPP}>{formatarData(paciente.latest_pregnancy.dpp)}</Text>
                <Text style={styles.gestacaoSemanas}>{paciente.latest_pregnancy.weeks} semanas</Text>
              </View>
              <View style={styles.fetoPlaceholder}>
                <Ionicons name="body-outline" size={60} color="#b34d7a" />
                <Text style={{color: '#b34d7a'}}>Imagem do Feto</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.infoText}>Nenhuma gestação registrada.</Text>
          )}
          
          {paciente.latest_pregnancy && (
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>Altura uterina: {paciente.latest_pregnancy.altura_uterina} cm</Text>
              <Text style={styles.infoText}>Batimentos cardíacos fetais: {paciente.latest_pregnancy.frequencia_cardiaca} bpm</Text>
            </View>
          )}
        </View>

        {/* --- SEÇÃO DE DADOS ATUAIS (Tela 3 e 5) --- */}
        <View style={styles.card}>
          <SectionTitle title="Dados da Consulta" />
          <Text style={styles.infoText}>IMC pré-gestacional: {imc.toFixed(1)} kg/m² ({classImc})</Text>
          <Text style={styles.infoText}>Ganho de peso: {ganhoPeso.toFixed(0)} kg</Text>
          <Text style={styles.infoText}>Pressão Arterial: {pa} ({classPa})</Text>
          <Text style={styles.infoText}>Frequência Cardíaca: {paciente.latest_pregnancy?.frequencia_cardiaca} bpm</Text>
          <Text style={styles.infoText}>Glicemia em Jejum: {paciente.latest_pregnancy?.glicemia} mg/dL</Text>
          <Text style={styles.infoText}>Temperatura materna: {paciente.temperatura_materna} °C</Text>
        </View>

        {/* --- SEÇÃO DA TELA 6 --- */}
        <View style={styles.card}> 
          <SectionTitle title="Antecedentes Familiares" />
          <InfoItem label="Diabetes" value={paciente.antecedentes_diabetes ? "SIM" : "NÃO"} isSim={paciente.antecedentes_diabetes} /> 
          <InfoItem label="Hipertensão Arterial" value={paciente.antecedentes_hipertensao ? "SIM" : "NÃO"} isSim={paciente.antecedentes_hipertensao} /> 
          <InfoItem label="Gemelar" value={paciente.antecedentes_gemelar ? "SIM" : "NÃO"} isSim={paciente.antecedentes_gemelar} />  
          <InfoItem label="Outros" value={paciente.antecedentes_outros ? `SIM (${paciente.antecedentes_texto})` : "NÃO"} isSim={paciente.antecedentes_outros} />  
        </View> 

        {/* --- SEÇÃO DA TELA 7 --- */}
        <View style={styles.card}>
          <SectionTitle title="Gestações Anteriores" />
          <InfoItem label="Partos" value={paciente.gestacao_partos.toString()} isSim={false} />
          <InfoItem label="Abortos" value={paciente.gestacao_abortos.toString()} isSim={false} />
          <InfoItem label="Bebê > 4,5kg" value={paciente.gestacao_bebe_maior_45 ? "SIM" : "NÃO"} isSim={paciente.gestacao_bebe_maior_45} />
          <InfoItem label="Pré-eclampsia" value={paciente.gestacao_eclampsia_pre_eclampsia ? "SIM" : "NÃO"} isSim={paciente.gestacao_eclampsia_pre_eclampsia} />
          <InfoItem label="Nascidos Vivos" value={paciente.gestacao_nascidos_vivos.toString()} isSim={false} />
          <InfoItem label="Nascidos Mortos" value={paciente.gestacao_nascidos_mortos.toString()} isSim={false} />
          <InfoItem label="Mortos na 1ª Semana" value={paciente.gestacao_mortos_primeira_semana.toString()} isSim={false} />
          <InfoItem label="Mortos após 1ª Semana" value={paciente.gestacao_mortos_depois_primeira_semana.toString()} isSim={false} /> 
          <InfoItem label="Mais de 3 Abortos" value={paciente.gestacao_mais_tres_abortos ? "SIM" : "NÃO"} isSim={paciente.gestacao_mais_tres_abortos} />
          <InfoItem label="Finalização Gestação Anterior em até 1 ano" value={paciente.gestacao_final_gestacao_anterior_1ano ? "SIM" : "NÃO"} isSim={paciente.gestacao_final_gestacao_anterior_1ano} />
          <InfoItem label="Partos Vaginais" value={paciente.gestacao_vaginal.toString()} isSim={false} />
          <InfoItem label="Partos Cesáreas" value={paciente.gestacao_cesarea.toString()} isSim={false} />
          <InfoItem label="Gestações" value={paciente.gestacao_gestas.toString()} isSim={false} />
          <InfoItem label="Vivem" value={paciente.gestacao_vivem.toString()} isSim={false} />
          <InfoItem label="Abortos" value={paciente.gestacao_abortos.toString()} isSim={false} />   
        </View>

        {/* --- SEÇÃO DA TELA 8 --- */}
        <View style={styles.card}>
          <SectionTitle title="Antecedentes Clínicos" />
          <InfoItem label="Diabetes" value={paciente.antecedentes_clinicos_diabetes ? "SIM" : "NÃO"} isSim={paciente.antecedentes_clinicos_diabetes} />
          <InfoItem label="Cardiopatia" value={paciente.antecedentes_clinicos_cardiopatia ? "SIM" : "NÃO"} isSim={paciente.antecedentes_clinicos_cardiopatia} />
          <InfoItem label="Hipertensão" value={paciente.antecedentes_clinicos_hipertensao_arterial ? "SIM" : "NÃO"} isSim={paciente.antecedentes_clinicos_hipertensao_arterial} />
          <InfoItem label="Tromboembolismo" value={paciente.antecedentes_clinicos_tromboembolismo ? "SIM" : "NÃO"} isSim={paciente.antecedentes_clinicos_tromboembolismo} />
          <InfoItem label="Cirurgia Periuterina" value={paciente.antecedentes_clinicos_cirur_per_uterina ? "SIM" : "NÃO"} isSim={paciente.antecedentes_clinicos_cirur_per_uterina} />
          <InfoItem label="Infecção Urinária" value={paciente.antecedentes_clinicos_infeccao_urinaria ? "SIM" : "NÃO"} isSim={paciente.antecedentes_clinicos_infeccao_urinaria} />
          <InfoItem label="Infertilidade" value={paciente.antecedentes_clinicos_infertilidade ? "SIM" : "NÃO"} isSim={paciente.antecedentes_clinicos_infertilidade} />
          <InfoItem label="Dificuldade na Amamentação" value={paciente.antecedentes_clinicos_dific_amamentacao ? "SIM" : "NÃO"} isSim={paciente.antecedentes_clinicos_dific_amamentacao} />
          <InfoItem label="Cirurgia" value={paciente.antecedentes_clinicos_cirurgia ? "SIM" : "NÃO"} isSim={paciente.antecedentes_clinicos_cirurgia} />
          <InfoItem label="Outros" value={paciente.antecedentes_clinicos_outros ? `SIM (${paciente.antecedentes_clinicos_outros_texto})` : "NÃO"} isSim={paciente.antecedentes_clinicos_outros} />
          
        </View>

        {/* --- SEÇÃO DA TELA 9 --- */}
        <View style={styles.card}>
          <SectionTitle title="Gestação Atual (Riscos)" />
          <InfoItem label="Fumante" value={paciente.gestacao_atual_fumante ? `SIM (${paciente.gestacao_atual_quant_cigarros}/dia)` : "NÃO"} isSim={paciente.gestacao_atual_fumante} />
          <InfoItem label="Álcool" value={paciente.gestacao_atual_alcool ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_alcool} />
          <InfoItem label="Anemia" value={paciente.gestacao_atual_anemia ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_anemia} />
          <InfoItem label="Diabetes Gestacional" value={paciente.gestacao_atual_diabete_gestacional ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_diabete_gestacional} />
          <InfoItem label="Hemorragia 1º Trim" value={paciente.gestacao_atual_hemorragia_1trim ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_hemorragia_1trim} />
          <InfoItem label="Hemorragia 2º Trim" value={paciente.gestacao_atual_hemorragia_2trim ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_hemorragia_2trim} />
          <InfoItem label="Hemorragia 3º Trim" value={paciente.gestacao_atual_hemorragia_3trim ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_hemorragia_3trim} />
          <InfoItem label="HIV/AIDS" value={paciente.gestacao_atual_hiv_aids ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_hiv_aids} />
          <InfoItem label="Sífilis" value={paciente.gestacao_atual_sifilis ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_sifilis} />
          <InfoItem label="Toxoplasmose" value={paciente.gestacao_atual_toxoplasmose ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_toxoplasmose} />
          <InfoItem label="Infecção Urinária" value={paciente.gestacao_atual_infeccao_urinaria ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_infeccao_urinaria} />  
          <InfoItem label="Hipertensão Arterial" value={paciente.gestacao_atual_hipertensao_arterial ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_hipertensao_arterial} /> 
          <InfoItem label="Pré-eclâmpsia/Eclâmpsia" value={paciente.gestacao_atual_pre_eclamp_eclamp ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_pre_eclamp_eclamp} />  
          <InfoItem label="Cardiopatia" value={paciente.gestacao_atual_cardiopatia ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_cardiopatia} />
          <InfoItem label="Uso de Insulina" value={paciente.gestacao_atual_uso_insulina ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_uso_insulina} />
          <InfoItem label="Exantema/Rash" value={paciente.exantema_rash ? "SIM" : "NÃO"} isSim={paciente.exantema_rash} />  
          <InfoItem label="Outras Drogas" value={paciente.gestacao_atual_outras_drogas ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_outras_drogas} />  
          <InfoItem label="Imunização Rh" value={paciente.gestacao_atual_imuniz_rh ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_imuniz_rh} />  
          <InfoItem label="Ameaça de Parto Prematuro" value={paciente.gestacao_atual_ameaca_parto_premat ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_ameaca_parto_premat} />  
          <InfoItem label="Oligo/Polidramnio" value={paciente.gestacao_atual_oligo_polidramio ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_oligo_polidramio} />
          <InfoItem label="Ruptura Prematura de Membranas" value={paciente.gestacao_atual_rut_prem_membrana ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_rut_prem_membrana} />  
          <InfoItem label="CIUR" value={paciente.gestacao_atual_ciur ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_ciur} />  
          <InfoItem label="Pos-datismo" value={paciente.gestacao_atual_pos_datismo ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_pos_datismo} />  
          <InfoItem label="Febre" value={paciente.gestacao_atual_febre ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_febre} />  
          <InfoItem label="Diabetes Gestacional" value={paciente.gestacao_atual_diabete_gestacional ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_diabete_gestacional} /> 
          <InfoItem label="Uso de Insulina" value={paciente.gestacao_atual_uso_insulina ? "SIM" : "NÃO"} isSim={paciente.gestacao_atual_uso_insulina} />  
        

        </View>
        
        {/* --- SEÇÃO DA TELA 10 (COM DATAS) --- */}
        <View style={styles.card}>
          <SectionTitle title="Vacinas" />
          <InfoItem label="Antitetânica" value={paciente.vacina_antitetanica ? `SIM (1ª: ${formatarData(paciente.vacina_antitetanica_1dose)} 2ª ${formatarData(paciente.vacina_antitetanica_2dose)})` : "NÃO"} isSim={paciente.vacina_antitetanica} />
          <InfoItem label="Hepatite B" value={paciente.vacina_hepatite_b ? `SIM (1ª: ${formatarData(paciente.vacina_hepatite_b_1dose)} 2ª: ${formatarData(paciente.vacina_hepatite_b_2dose)} 3ª: ${formatarData(paciente.vacina_hepatite_b_3dose)})` : "NÃO"} isSim={paciente.vacina_hepatite_b} />
          <InfoItem label="Influenza" value={paciente.vacina_influenza ? `SIM (1ª Data: ${formatarData(paciente.vacina_influenza_1dose)} )` : "NÃO"} isSim={paciente.vacina_influenza} />
          <InfoItem label="Covid-19" value={paciente.vacina_covid19 ? `SIM (1ª: ${formatarData(paciente.vacina_covid19_1dose)})` : "NÃO"} isSim={paciente.vacina_covid19} />
        </View>

        {/* --- SEÇÃO DE GRÁFICOS (Placeholders) --- */}
        <View style={styles.card}>
          <SectionTitle title="Gráficos" />
          <View style={styles.graficoPlaceholder}>
            <Text style={styles.graficoLabel}>Gráfico de Ganho de Peso (Tela 4)</Text>
          </View>
          <View style={styles.graficoPlaceholder}>
            <Text style={styles.graficoLabel}>Histórico de Ultrassons (Tela 11)</Text>
          </View>
        </View>

        {/* --- SEÇÃO DA TELA  (EXAMES) --- */}
        <View style={styles.card}>
          <SectionTitle title="Histórico de Exames" />
          {paciente.all_events && paciente.all_events.length > 0 ? (
            paciente.all_events.map((exame) => (
              <View key={exame.id} style={styles.exameItem}>
                <Text style={styles.exameData}>{formatarData(exame.data_evento)}</Text>
                <Text style={styles.infoText}>{exame.descricao}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.infoText}>(Nenhum exame registrado)</Text>
          )}
        </View>

        {/* --- SEÇÃO DA TELA (INFO GERAIS) --- */}
         <View style={styles.card}>
          <SectionTitle title="Informações Gerais" />
          
          <Text style={styles.infoLabel}>Edemas em membros inferiores:</Text>
          <Text style={styles.infoText}>{paciente.info_gerais_edemas || "(Vazio)"}</Text>
          
          <Text style={styles.infoLabel}>Sintomas/ Sinais de complicações:</Text>
          <Text style={styles.infoText}>{paciente.info_gerais_sintomas || "(Vazio)"}</Text>
          
          <Text style={styles.infoLabel}>Estado Geral da Gestante (Campo 1):</Text>
          <Text style={styles.infoText}>{paciente.info_gerais_estado_geral_1 || "(Vazio)"}</Text>
          
          <Text style={styles.infoLabel}>Estado Geral da Gestante (Campo 2):</Text>
          <Text style={styles.infoText}>{paciente.info_gerais_estado_geral_2 || "(Vazio)"}</Text>
          
          <Text style={styles.infoLabel}>Avaliação Nutricional:</Text>
          <Text style={styles.infoText}>{paciente.info_gerais_nutricional || "(Vazio)"}</Text>
          
          <Text style={styles.infoLabel}>Avaliação Psicossocial e emocional:</Text>
          <Text style={styles.infoText}>{paciente.info_gerais_psicossocial || "(Vazio)"}</Text>
        </View>

        {/* Botão para VOLTAR AO INÍCIO */}
        <TouchableOpacity style={styles.button} onPress={handleBackToStart}>
          <Text style={styles.buttonText}>Voltar ao Início</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// Estilos (Adicionado 'exameItem' e 'exameData')
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF', 
  },
  container: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerNome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSub: {
    fontSize: 16,
    color: '#555',
  },
  card: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b34d7a',
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 5,
  },
  gestacaoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gestacaoLabel: {
    fontSize: 16, // Aumentado
    color: '#555',
    fontWeight: '500',
  },
  gestacaoDPP: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  gestacaoSemanas: {
    fontSize: 18,
    color: '#555',
    marginTop: 5,
  },
  fetoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 15,
    backgroundColor: '#fceef5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    marginTop: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 5,
    lineHeight: 22,
  },
  textGrave: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500', 
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  valueSim: {
    color: '#e74c3c',
  },
  valueNao: {
    color: '#27ae60',
  },
  graficoPlaceholder: {
    height: 150,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  graficoLabel: {
    fontSize: 16,
    color: '#aaa',
  },
  //  Estilos para Tela 12
  exameItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  exameData: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  // --- Fim Estilos Tela 12 ---
  button: {
    backgroundColor: '#886aea',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});