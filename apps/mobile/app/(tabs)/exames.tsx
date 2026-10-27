import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../../utils/apiClient';
import { useSession } from '@/contexts/SessionContext';
import { downloadDocument } from '@/utils/downloadDocument';
import { AccessibleText as Text } from '../../components/AccessibleText';
import { ACCESSIBLE_COLORS } from '../../theme/accessibility';

type PregnantDocument = {
  id: number;
  pregnant_id: number;
  document_name: string;
  document_type: string | null;
  uploaded_at: string;
  updated_at: string;
  status: 'pending' | 'reviewed' | string;
  report_comment: string | null;
  reviewed_by_user_id: number | null;
  reviewed_at: string | null;
  download_url?: string | null;
};

type ExamRequest = {
  id: number;
  exam_name: string;
  instructions: string | null;
  status: 'pending' | 'submitted' | 'reviewed' | 'cancelled' | string;
  requested_at: string;
};

export default function ExamesTabScreen() {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<PregnantDocument[]>([]);
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);
  const [selectedExamRequestId, setSelectedExamRequestId] = useState<number | null>(null);

  const pregnantId = user?.pregnant_id ?? null;

  const fetchDocs = useCallback(async () => {
    if (!pregnantId) {
      setDocs([]);
      return;
    }

    const response = await api.get(`/documents/?pregnant_id=${pregnantId}`);
    const data = response.data;

    setDocs(Array.isArray(data) ? data : []);
  }, [pregnantId]);

  const fetchExamRequests = useCallback(async () => {
    if (!pregnantId) {
      setExamRequests([]);
      return;
    }
    const res = await api.get(`/exam-requests/pregnant/${pregnantId}`);
    const data = res.data;
    setExamRequests(Array.isArray(data) ? data : []);
  }, [pregnantId]);

  useEffect(() => {
    if (!user) return;

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
  }, [user, fetchDocs, fetchExamRequests]);

  const handlePickAndUpload = useCallback(async () => {
    if (!pregnantId) {
      Alert.alert(
        'Sessão desatualizada',
        'Seu login não trouxe o identificador da gestante. Faça logout/login novamente.'
      );
      return;
    }

    if (uploading) return;
    if (!selectedExamRequestId) {
      Alert.alert('Selecione uma solicitação', 'Escolha o pedido do médico antes de enviar o arquivo.');
      return;
    }

    try {
      setUploading(true);

      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picked.canceled) return;

      const asset = picked.assets?.[0];
      if (!asset?.uri) {
        throw new Error('Arquivo inválido');
      }

      const name = asset.name || 'exame';
      const type = asset.mimeType || 'application/octet-stream';

      const form = new FormData();
      form.append('pregnant_id', String(pregnantId));
      form.append('exam_request_id', String(selectedExamRequestId));
      form.append('document_name', name);
      form.append('document_type', type);

      if (Platform.OS === 'web') {
        const anyAsset: any = asset as any;
        let file: any = anyAsset?.file;

        // Fallback: em alguns browsers o picker retorna apenas `uri` (blob:...).
        if (!file) {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          if (typeof File !== 'undefined') {
            file = new File([blob], name, { type });
          } else {
            file = blob;
          }
        }

        // No Web, FormData precisa de File/Blob, não {uri,name,type}.
        form.append('document', file, name);
      } else {
        // No React Native, o formato { uri, name, type } é o esperado.
        form.append(
          'document',
          {
            uri: asset.uri,
            name,
            type,
          } as any
        );
      }

      const response = await api.post('/documents/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = response.data;
      const created: PregnantDocument | undefined = data?.document;
      if (created) {
        setDocs((prev) => [created, ...prev]);
      } else {
        await fetchDocs();
      }
      await fetchExamRequests();
      setSelectedExamRequestId(null);

      Alert.alert('Sucesso', 'Exame enviado. Aguarde o relatório do médico.');
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setUploading(false);
    }
  }, [pregnantId, uploading, selectedExamRequestId, fetchDocs, fetchExamRequests]);

  const openDownload = useCallback(async (doc: PregnantDocument) => {
    try {
      await downloadDocument(doc.id, doc.document_name, doc.document_type);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível abrir o exame');
    }
  }, []);

  const formatDate = useCallback((iso: string) => {
    if (!iso) return '';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString();
  }, []);

  const emptyState = useMemo(() => {
    if (!pregnantId) {
      return 'Faça logout/login para carregar seu perfil de gestante.';
    }
    return 'Nenhum exame enviado ainda.';
  }, [pregnantId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator
          accessibilityLabel="Carregando exames"
          size="large"
          color={ACCESSIBLE_COLORS.primary}
          style={{ marginTop: 40 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={docs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <Text style={styles.title}>Exames</Text>
            <Text style={styles.subtitle}>Envie um exame e aguarde o relatório do médico.</Text>

            <View style={styles.requestsBox}>
              <Text style={styles.requestsTitle}>Solicitações do médico</Text>
              {examRequests.length === 0 ? (
                <Text style={styles.emptyRequestText}>Nenhuma solicitação pendente.</Text>
              ) : examRequests.map((request) => (
                <TouchableOpacity
                  key={request.id}
                  testID={`e2e-exam-request-${request.id}`}
                  style={[styles.requestCard, selectedExamRequestId === request.id && styles.requestCardSelected]}
                  onPress={() => request.status === 'pending' && setSelectedExamRequestId(request.id)}
                  disabled={request.status !== 'pending'}
                  accessibilityRole="button"
                  accessibilityLabel={`${request.exam_name}, status ${request.status === 'pending' ? 'pendente' : request.status === 'cancelled' ? 'cancelada' : request.status === 'reviewed' ? 'revisada' : 'enviada'}`}
                  accessibilityHint={request.status === 'pending' ? 'Seleciona esta solicitação para enviar o resultado' : 'Solicitação indisponível para envio'}
                  accessibilityState={{
                    disabled: request.status !== 'pending',
                    selected: selectedExamRequestId === request.id,
                  }}
                >
                  <View style={styles.rowBetween}>
                    <Text style={styles.requestName}>{request.exam_name}</Text>
                    <Text style={styles.requestStatus}>
                      {request.status === 'pending' ? 'Pendente' : request.status === 'cancelled' ? 'Cancelada' : request.status === 'reviewed' ? 'Revisada' : 'Enviada'}
                    </Text>
                  </View>
                  {!!request.instructions && <Text style={styles.requestInstructions}>{request.instructions}</Text>}
                  {request.status === 'pending' && <Text style={styles.requestHint}>Envie o resultado usando o botão abaixo.</Text>}
                </TouchableOpacity>
              ))}
              {!!selectedExamRequestId && <Text style={styles.selectedRequestText}>Solicitação selecionada para envio.</Text>}
            </View>

            <TouchableOpacity
              testID="e2e-upload-exam"
              style={[styles.primaryButton, uploading && styles.primaryButtonDisabled]}
              onPress={handlePickAndUpload}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel={uploading ? 'Enviando exame' : 'Enviar exame solicitado'}
              accessibilityHint="Abre o seletor de arquivos para enviar o resultado da solicitação selecionada"
              accessibilityState={{ disabled: uploading, busy: uploading }}
            >
              <Text style={styles.primaryButtonText}>{uploading ? 'Enviando...' : 'Enviar exame solicitado'}</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>{emptyState}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.docName}>{item.document_name}</Text>
              <Text style={styles.status}>{item.status === 'reviewed' ? 'Respondido' : 'Aguardando'}</Text>
            </View>

            <Text style={styles.metaText}>Enviado em: {formatDate(item.uploaded_at)}</Text>
            {!!item.document_type && <Text style={styles.metaText}>Tipo: {item.document_type}</Text>}

            <View style={styles.reportBox}>
              <Text style={styles.reportTitle}>Relatório do médico</Text>
              <Text style={styles.reportText}>
                {item.report_comment?.trim()
                  ? item.report_comment
                  : 'Aguardando comentário do médico.'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => openDownload(item)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir exame ${item.document_name}`}
              accessibilityHint="Abre o arquivo do exame"
            >
              <Text style={styles.secondaryButtonText}>Abrir exame</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E6E0F8',
  },
  container: {
    padding: 16,
    paddingBottom: 24,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: ACCESSIBLE_COLORS.primary,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: ACCESSIBLE_COLORS.muted,
  },
  requestsBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F2FBFA',
  },
  requestsTitle: {
    color: '#176B66',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyRequestText: {
    color: '#667085',
    fontSize: 13,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  requestCardSelected: {
    borderWidth: 2,
    borderColor: ACCESSIBLE_COLORS.primary,
  },
  requestName: {
    color: '#202020',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  requestStatus: {
    color: '#176B66',
    fontSize: 12,
    fontWeight: '700',
  },
  requestInstructions: {
    color: '#475467',
    fontSize: 13,
    marginTop: 6,
  },
  requestHint: {
    color: '#667085',
    fontSize: 12,
    marginTop: 6,
  },
  selectedRequestText: {
    color: '#176B66',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: ACCESSIBLE_COLORS.primary,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#9ad6cf',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: ACCESSIBLE_COLORS.muted,
    marginTop: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  docName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    color: '#886aea',
  },
  metaText: {
    marginTop: 6,
    fontSize: 12,
    color: '#777',
  },
  reportBox: {
    marginTop: 12,
    backgroundColor: '#F0EFFF',
    borderRadius: 12,
    padding: 12,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  reportText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: ACCESSIBLE_COLORS.primary,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: ACCESSIBLE_COLORS.primary,
    fontWeight: '700',
  },
});
