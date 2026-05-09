import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput, 
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList, 
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

//  input de data
const formatarDataInput = (text: string) => {
  const cleaned = text.replace(/\D/g, ''); // Remove tudo que não for dígito
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  } else if (cleaned.length > 2) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
  }
  return cleaned;
};
//  Interface para os dados do exame
interface Exame {
  id: string;
  data_evento: string;
  descricao: string;
}

export default function ExamesScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [exames, setExames] = useState<Exame[]>([]); 
  const [pregnancyId, setPregnancyId] = useState<string | null>(null); 

  // Estados para o novo exame
  const [novaData, setNovaData] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');

  // --- useEffect para LER os dados ---
  useEffect(() => {
    if (!patientId) return;

    const fetchAllData = async () => {
      try {
        setLoading(true);
        // 1. ID da GESTAÇÃO (pregnancyId)
        const pregResponse = await fetch(`http://localhost:3000/api/pregnants/${patientId}`);
        if (!pregResponse.ok) {
          throw new Error('Não foi possível buscar os dados da paciente');
        }
        const data = await pregResponse.json();
        
        if (data.latest_pregnancy && data.latest_pregnancy.id) {
          const currentPregnancyId = data.latest_pregnancy.id;
          setPregnancyId(currentPregnancyId);

          // 2. Agora, buscamos os exames dessa gestação
          const eventsResponse = await fetch(`http://localhost:3000/api/pregnancyEvents?pregnancy_id=${currentPregnancyId}`);
          if (!eventsResponse.ok) {
            throw new Error('Não foi possível buscar os exames');
          }
          const eventsData = await eventsResponse.json();
          setExames(eventsData);
        } else {
          Alert.alert('Erro', 'Nenhuma gestação ativa encontrada para esta paciente.');
        }

      } catch (error) {
        console.error(error);
        Alert.alert('Erro', error instanceof Error ? error.message : 'Erro de rede');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [patientId]);
  
  // ---  handleAddExame para SALVAR ---
  const handleAddExame = async () => {
    if (isSaving || !pregnancyId || !novaData || !novaDescricao) {
      Alert.alert('Erro', 'Por favor, preencha a data e a descrição do novo exame.');
      return;
    }
    setIsSaving(true);

    try {
      // Converte a data para AAAA-MM-DD
      const [dia, mes, ano] = novaData.split('/');
      const dataParaSalvar = `${ano}-${mes}-${dia}`;

      const response = await fetch(`http://localhost:3000/api/pregnancyEvents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pregnancy_id: pregnancyId,
          descricao: novaDescricao,
          data_evento: dataParaSalvar,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar o novo exame');
      }

      const novoExame = await response.json();
      
      // Adiciona o novo exame no topo da lista 
      setExames([novoExame, ...exames]);
      
      // Limpa os campos
      setNovaData('');
      setNovaDescricao('');

    } catch (error) {
      console.error(error);
      Alert.alert('Erro ao Salvar', error instanceof Error ? error.message : 'Erro de rede');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    router.push(`/doctor/${patientId}/informacoes_gerais`);
  };

  const formatarData = (dataISO: string) => {
    if (!dataISO) return "Data Inválida";
    const dataObj = new Date(dataISO);
    const dia = String(dataObj.getUTCDate()).padStart(2, '0');
    const mes = String(dataObj.getUTCMonth() + 1).padStart(2, '0');
    const ano = dataObj.getUTCFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#886aea" style={{ marginTop: 50 }} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={exames}
        contentContainerStyle={styles.container}
        keyExtractor={(item) => item.id.toString()}
        
        // ---  Formulário de Adicionar ---
        ListHeaderComponent={(
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>Adicionar Novo Exame</Text>
            <TextInput
              style={styles.input}
              placeholder="Data (DD/MM/AAAA)"
              value={novaData}
              onChangeText={(text) => setNovaData(formatarDataInput(text))} 
              keyboardType="numeric"
              maxLength={10}
            />
            <TextInput
              style={styles.input}
              placeholder="Descrição do exame"
              value={novaDescricao}
              onChangeText={setNovaDescricao}
              multiline
            />
            <TouchableOpacity 
              style={[styles.addButton, isSaving && styles.addButtonDisabled]} 
              onPress={handleAddExame}
              disabled={isSaving}
            >
              <Text style={styles.addButtonText}>{isSaving ? "Salvando..." : "Adicionar Exame"}</Text>
            </TouchableOpacity>
          </View>
        )}
        
        // --- Lista de Exames Salvos ---
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardData}>{formatarData(item.data_evento)}</Text>
            <View style={styles.descricaoBox}>
              <Text style={styles.descricaoText}>{item.descricao}</Text>
            </View>
          </View>
        )}
        
        // --- Botão de Navegação ---
        ListFooterComponent={(
          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Informações Gerais (Tela 13)</Text>
          </TouchableOpacity>
        )}
      />
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
  // --- Estilos do Formulário de Adicionar ---
  addCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    elevation: 3,
  },
  addTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#F0EFFF',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#27ae60', 
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonDisabled: {
    backgroundColor: '#aaa',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // --- Estilos da Lista de Exames ---
  card: {
    backgroundColor: '#F0EFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  cardData: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  descricaoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
  },
  descricaoText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
  },
  // --- Botão de Navegação ---
  button: {
    backgroundColor: '#886aea',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});