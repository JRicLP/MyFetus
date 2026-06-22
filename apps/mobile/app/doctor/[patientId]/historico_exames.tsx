import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiUrl, fetchWithAuth } from '../../../utils/api';

type StoredUser = {
  id: number;
  role: string;
};

type PregnantDocument = {
  id: number;
  pregnant_id: number;
  document_name: string;
  document_type: string | null;
  uploaded_at: string;
  status: 'pending' | 'reviewed' | string;
  report_comment: string | null;
  reviewed_at: string | null;
  download_url?: string | null;
};

export default function ExamesScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [docs, setDocs] = useState<PregnantDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [reportText, setReportText] = useState('');
  const [doctorUserId, setDoctorUserId] = useState<number | null>(null);

  const selectedDoc = useMemo(
    () => (selectedDocId ? docs.find((d) => d.id === selectedDocId) : undefined),
    [docs, selectedDocId]
  );

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('userData');
        if (!raw) return;
        const parsed = JSON.parse(raw) as StoredUser;
        if (parsed?.id) setDoctorUserId(parsed.id);
      } catch {
        // ignore
      }
    })();
  }, []);

  const fetchDocs = useCallback(async () => {
    if (!patientId) return;
    const res = await fetchWithAuth(apiUrl(`/api/documents/documents?pregnant_id=${patientId}`));
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'Não foi possível buscar os exames enviados');
    }
    setDocs(Array.isArray(data) ? data : []);
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      setLoading(true);
      try {
        await fetchDocs();
      } catch (err) {
        Alert.alert('Erro', err instanceof Error ? err.message : 'Erro de rede');
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId, fetchDocs]);

  const formatDate = useCallback((iso: string) => {
    if (!iso) return '';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString();
  }, []);

  const handleSelect = useCallback((doc: PregnantDocument) => {
    setSelectedDocId(doc.id);
    setReportText(doc.report_comment || '');
  }, []);

  const handleSaveReport = useCallback(async () => {
    if (isSaving || !selectedDocId) return;
    if (!reportText.trim()) {
      Alert.alert('Erro', 'Escreva o comentário/relatório do médico.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/documents/documents/${selectedDocId}/report`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_comment: reportText.trim(),
          doctor_user_id: doctorUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao salvar relatório');
      }

      const updated = data?.document;
      if (updated?.id) {
        setDocs((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
      } else {
        await fetchDocs();
      }

      Alert.alert('Sucesso', 'Relatório enviado para a paciente.');
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro de rede');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, selectedDocId, reportText, doctorUserId, fetchDocs]);

  const openDownload = useCallback(async (docId: number) => {
    const url = apiUrl(`/api/documents/documents/${docId}/download`);
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o exame');
    }
  }, []);

  const handleNext = () => {
    router.push(`/doctor/${patientId}/informacoes_gerais`);
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#886aea" style={{ marginTop: 50 }} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={docs}
        contentContainerStyle={styles.container}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={(
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>Exames Enviados pela Paciente</Text>
            <Text style={styles.helperText}>Selecione um exame para escrever o relatório.</Text>

            {selectedDoc ? (
              <View style={styles.reportEditor}>
                <Text style={styles.selectedTitle}>{selectedDoc.document_name}</Text>
                <Text style={styles.meta}>Enviado em: {formatDate(selectedDoc.uploaded_at)}</Text>
                <TouchableOpacity style={styles.openButton} onPress={() => openDownload(selectedDoc.id)}>
                  <Text style={styles.openButtonText}>Abrir exame</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Escreva o relatório/comentário para a paciente"
                  value={reportText}
                  onChangeText={setReportText}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.addButton, isSaving && styles.addButtonDisabled]}
                  onPress={handleSaveReport}
                  disabled={isSaving}
                >
                  <Text style={styles.addButtonText}>{isSaving ? 'Enviando...' : 'Enviar relatório'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.noSelection}>Nenhum exame selecionado.</Text>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum exame enviado ainda.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleSelect(item)}>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{item.document_name}</Text>
                <Text style={styles.cardStatus}>{item.status === 'reviewed' ? 'Respondido' : 'Pendente'}</Text>
              </View>
              <Text style={styles.cardData}>Enviado em: {formatDate(item.uploaded_at)}</Text>
              <Text style={styles.previewText} numberOfLines={2}>
                {item.report_comment?.trim() ? item.report_comment : 'Sem relatório ainda.'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
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
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  noSelection: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 12,
  },
  reportEditor: {
    marginTop: 12,
    backgroundColor: '#F0EFFF',
    borderRadius: 16,
    padding: 14,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  openButton: {
    borderWidth: 1,
    borderColor: '#27ae60',
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  openButtonText: {
    color: '#27ae60',
    fontSize: 14,
    fontWeight: 'bold',
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
  card: {
    backgroundColor: '#F0EFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#886aea',
  },
  cardData: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#444',
    marginTop: 10,
    lineHeight: 20,
  },
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