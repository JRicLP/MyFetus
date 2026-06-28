import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiUrl, fetchWithAuth } from '../../utils/api';

type SearchResult = {
  pregnant_id: number;
  patient_name: string;
  patient_email: string;
  already_linked: boolean;
};

export default function VincularPacienteScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Atenção', 'Digite o email da paciente para buscar.');
      return;
    }

    setSearching(true);
    setResult(null);
    setNotFound(false);

    try {
      const response = await fetchWithAuth(
        apiUrl(`/api/doctor-patient-links/search?email=${encodeURIComponent(trimmedEmail)}`)
      );

      if (response.status === 404) {
        setNotFound(true);
        return;
      }

      if (!response.ok) {
        throw new Error('Não foi possível buscar a paciente');
      }

      const data: SearchResult = await response.json();
      setResult(data);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro de rede');
    } finally {
      setSearching(false);
    }
  };

  const handleLink = async () => {
    if (!result || linking) return;

    setLinking(true);
    try {
      const response = await fetchWithAuth(apiUrl('/api/doctor-patient-links'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregnant_id: result.pregnant_id }),
      });

      if (!response.ok) {
        throw new Error('Não foi possível vincular a paciente');
      }

      Alert.alert(
        'Sucesso',
        `${result.patient_name} foi vinculada à sua lista de pacientes.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro de rede');
    } finally {
      setLinking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Vincular paciente</Text>
        <Text style={styles.subtitle}>Busque pela gestante usando o email cadastrado por ela.</Text>

        <View style={styles.searchRow}>
          <TextInput
            placeholder="email@exemplo.com"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!searching}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={searching}>
            {searching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="search-outline" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {notFound && (
          <Text style={styles.notFoundText}>Nenhuma gestante encontrada com esse email.</Text>
        )}

        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultName}>{result.patient_name}</Text>
            <Text style={styles.resultEmail}>{result.patient_email}</Text>

            {result.already_linked ? (
              <View style={styles.alreadyLinkedBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#27ae60" />
                <Text style={styles.alreadyLinkedText}>Já vinculada a você</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.linkButton, linking && styles.linkButtonDisabled]}
                onPress={handleLink}
                disabled={linking}
              >
                {linking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.linkButtonText}>Vincular paciente</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#E6E0F8' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#555', marginTop: 6, marginBottom: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#886aea',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: { color: '#e74c3c', marginTop: 20, textAlign: 'center', fontSize: 15 },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 25,
    elevation: 3,
  },
  resultName: { fontSize: 18, fontWeight: 'bold', color: '#b34d7a' },
  resultEmail: { fontSize: 14, color: '#555', marginTop: 4, marginBottom: 16 },
  alreadyLinkedBadge: { flexDirection: 'row', alignItems: 'center' },
  alreadyLinkedText: { marginLeft: 6, color: '#27ae60', fontWeight: 'bold' },
  linkButton: {
    backgroundColor: '#886aea',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  linkButtonDisabled: { backgroundColor: '#aaa' },
  linkButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
