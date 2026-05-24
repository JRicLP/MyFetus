import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { apiUrl } from '../../utils/api';

type StoredUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  pregnant_id?: number | null;
};

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

export default function ExamesTabScreen() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [docs, setDocs] = useState<PregnantDocument[]>([]);

  const pregnantId = user?.pregnant_id ?? null;

  const loadUser = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      if (!raw) {
        setUser(null);
        return;
      }
      setUser(JSON.parse(raw));
    } catch {
      setUser(null);
    }
  }, []);

  const fetchDocs = useCallback(async () => {
    if (!pregnantId) {
      setDocs([]);
      return;
    }

    const res = await fetch(apiUrl(`/api/documents/documents?pregnant_id=${pregnantId}`));
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || 'Não foi possível carregar os exames');
    }

    setDocs(Array.isArray(data) ? data : []);
  }, [pregnantId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadUser();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadUser]);

  useEffect(() => {
    if (!user) return;

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
  }, [user, fetchDocs]);

  const handlePickAndUpload = useCallback(async () => {
    if (!pregnantId) {
      Alert.alert(
        'Sessão desatualizada',
        'Seu login não trouxe o identificador da gestante. Faça logout/login novamente.'
      );
      return;
    }

    if (uploading) return;

    try {
      setUploading(true);

      const picked = await DocumentPicker.getDocumentAsync({
        type: '*/*',
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

      const res = await fetch(apiUrl('/api/documents/documents'), {
        method: 'POST',
        body: form,
      });

      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || raw || 'Falha ao enviar exame');
      }

      const created: PregnantDocument | undefined = data?.document;
      if (created) {
        setDocs((prev) => [created, ...prev]);
      } else {
        await fetchDocs();
      }

      Alert.alert('Sucesso', 'Exame enviado. Aguarde o relatório do médico.');
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setUploading(false);
    }
  }, [pregnantId, uploading, fetchDocs]);

  const openDownload = useCallback(async (docId: number) => {
    const url = apiUrl(`/api/documents/documents/${docId}/download`);
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o exame');
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
    return <ActivityIndicator size="large" color="#20B2AA" style={{ marginTop: 40 }} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={docs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <Text style={styles.title}>Exames</Text>
            <Text style={styles.subtitle}>Envie um exame e aguarde o relatório do médico.</Text>

            <TouchableOpacity
              style={[styles.primaryButton, uploading && styles.primaryButtonDisabled]}
              onPress={handlePickAndUpload}
              disabled={uploading}
            >
              <Text style={styles.primaryButtonText}>{uploading ? 'Enviando...' : 'Enviar exame'}</Text>
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

            <TouchableOpacity style={styles.secondaryButton} onPress={() => openDownload(item.id)}>
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
    color: '#20B2AA',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#666',
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: '#20B2AA',
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
    color: '#666',
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
    borderColor: '#20B2AA',
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#20B2AA',
    fontWeight: '700',
  },
});
