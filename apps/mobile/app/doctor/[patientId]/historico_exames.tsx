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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../utils/apiClient';
import { useSession } from '@/contexts/SessionContext';
import { downloadDocument } from '@/utils/downloadDocument';

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

type ExamRequest = {
  id: number;
  pregnant_id: number;
  doctor_id: number;
  exam_name: string;
  instructions: string | null;
  status: 'pending' | 'submitted' | 'reviewed' | 'cancelled' | string;
  requested_at: string;
};

export default function ExamesScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [docs, setDocs] = useState<PregnantDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [reportText, setReportText] = useState('');
  const doctorUserId = user?.id ?? null;
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);
  const [examName, setExamName] = useState('');
  const [examInstructions, setExamInstructions] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  const selectedDoc = useMemo(
    () => (selectedDocId ? docs.find((d) => d.id === selectedDocId) : undefined),
    [docs, selectedDocId]
  );

  const fetchDocs = useCallback(async () => {
   const res = await api.get(`/documents/?pregnant_id=${patientId}`);
    const data = res.data;
    setDocs(Array.isArray(data) ? data : []);
  }, [patientId]);

  const fetchExamRequests = useCallback(async () => {
    if (!patientId) return;
    const res = await api.get(`/exam-requests/pregnant/${patientId}`);
    const data = res.data;
    setExamRequests(Array.isArray(data) ? data : []);
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([fetchDocs(), fetchExamRequests()]);
        const failure = results.find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected') throw failure.reason;
      } catch (err) {
        Alert.alert('Erro', err instanceof Error ? err.message : 'Erro de rede');
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId, fetchDocs, fetchExamRequests]);

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
      const res = await api.put(`/documents/${selectedDocId}/report`, {
        report_comment: reportText.trim(),
        doctor_user_id: doctorUserId,
      });
      const data = res.data;

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

  const handleCreateRequest = useCallback(async () => {
    if (isRequesting || !patientId || !examName.trim()) {
      if (!examName.trim()) Alert.alert('Atenção', 'Informe o exame solicitado.');
      return;
    }

    setIsRequesting(true);
    try {
      const res = await api.post('/exam-requests', {
          pregnant_id: Number(patientId),
          exam_name: examName.trim(),
          instructions: examInstructions.trim() || undefined,
      });
      const data = res.data;
      setExamRequests((prev) => [data, ...prev]);
      setExamName('');
      setExamInstructions('');
      Alert.alert('Sucesso', 'Solicitação enviada para a gestante.');
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro de rede');
    } finally {
      setIsRequesting(false);
    }
  }, [isRequesting, patientId, examName, examInstructions]);

  const handleCancelRequest = useCallback(async (requestId: number) => {
    try {
      const res = await api.delete(`/exam-requests/${requestId}`);
      const data = res.data;
      setExamRequests((prev) => prev.map((item) => item.id === requestId ? data : item));
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro de rede');
    }
  }, []);

  const openDownload = useCallback(async (doc: PregnantDocument) => {
    try {
      await downloadDocument(doc.id, doc.document_name, doc.document_type);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível abrir o exame');
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
            <Text style={styles.addTitle}>Solicitar exame</Text>
            <Text style={styles.helperText}>A solicitação ficará pendente para a gestante enviar o arquivo.</Text>
            <TextInput
              testID="e2e-doctor-exam-name"
              style={styles.input}
              placeholder="Nome do exame"
              value={examName}
              onChangeText={setExamName}
            />
            <TextInput
              testID="e2e-doctor-exam-instructions"
              style={styles.input}
              placeholder="Orientações (opcional)"
              value={examInstructions}
              onChangeText={setExamInstructions}
              multiline
            />
            <TouchableOpacity
              testID="e2e-create-exam-request"
              style={[styles.addButton, isRequesting && styles.addButtonDisabled]}
              onPress={handleCreateRequest}
              disabled={isRequesting}
            >
              <Text style={styles.addButtonText}>{isRequesting ? 'Enviando...' : 'Solicitar exame'}</Text>
            </TouchableOpacity>

            <Text style={styles.addTitle}>Solicitações registradas</Text>
            {examRequests.length === 0 ? (
              <Text style={styles.noSelection}>Nenhuma solicitação registrada.</Text>
            ) : examRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.selectedTitle}>{request.exam_name}</Text>
                  <Text style={styles.cardStatus}>{request.status === 'pending' ? 'Pendente' : request.status === 'cancelled' ? 'Cancelada' : request.status === 'reviewed' ? 'Revisada' : 'Enviada'}</Text>
                </View>
                {!!request.instructions && <Text style={styles.meta}>{request.instructions}</Text>}
                {request.status === 'pending' && (
                  <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelRequest(request.id)}>
                    <Text style={styles.cancelButtonText}>Cancelar solicitação</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <Text style={styles.addTitle}>Exames Enviados pela Paciente</Text>
            <Text style={styles.helperText}>Selecione um exame para escrever o relatório.</Text>

            {selectedDoc ? (
              <View style={styles.reportEditor}>
                <Text style={styles.selectedTitle}>{selectedDoc.document_name}</Text>
                <Text style={styles.meta}>Enviado em: {formatDate(selectedDoc.uploaded_at)}</Text>
                <TouchableOpacity style={styles.openButton} onPress={() => openDownload(selectedDoc)}>
                  <Text style={styles.openButtonText}>Abrir exame</Text>
                </TouchableOpacity>

                <TextInput
                  testID="e2e-doctor-report"
                  style={styles.input}
                  placeholder="Escreva o relatório/comentário para a paciente"
                  value={reportText}
                  onChangeText={setReportText}
                  multiline
                />
                <TouchableOpacity
                  testID="e2e-save-doctor-report"
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
          <TouchableOpacity testID={`e2e-document-${item.id}`} onPress={() => handleSelect(item)}>
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
  requestCard: {
    backgroundColor: '#F8F7FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  cancelButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FCE8E8',
  },
  cancelButtonText: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '600',
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
