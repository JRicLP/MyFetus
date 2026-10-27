import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AccessibleText as Text } from '../../components/AccessibleText';
import { api } from '../../utils/apiClient';
import { DoctorApprovalRecord, DoctorApprovalStatus } from '../../types/api.types';

type Filter = 'all' | DoctorApprovalStatus;

const statusLabel: Record<DoctorApprovalStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  revoked: 'Revogado',
};

export default function DoctorApprovalsScreen() {
  const [doctors, setDoctors] = useState<DoctorApprovalRecord[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<DoctorApprovalRecord[]>('/doctors');
      setDoctors(response.data);
      setError(null);
    } catch {
      setError('Não foi possível carregar os médicos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadDoctors();
  }, [loadDoctors]));

  const decide = async (
    doctor: DoctorApprovalRecord,
    decision: 'approve' | 'reject' | 'revoke'
  ) => {
    const reason = reasons[doctor.id]?.trim() || '';
    if (decision !== 'approve' && !reason) {
      setError('Informe o motivo antes de rejeitar ou revogar.');
      return;
    }
    try {
      setSavingId(doctor.id);
      await api.post(`/doctors/${doctor.id}/approval`, { decision, reason: reason || undefined });
      await loadDoctors();
      setReasons((current) => ({ ...current, [doctor.id]: '' }));
      setError(null);
    } catch {
      setError('Não foi possível registrar a decisão.');
    } finally {
      setSavingId(null);
    }
  };

  const visibleDoctors = filter === 'all'
    ? doctors
    : doctors.filter((doctor) => doctor.approval_status === filter);

  const renderDoctor = ({ item }: { item: DoctorApprovalRecord }) => {
    const status = item.approval_status || 'pending';
    const isSaving = savingId === item.id;
    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.detail}>{item.email}</Text>
        <Text style={styles.detail}>CRM: {item.crm} / {item.crm_estado}</Text>
        <Text style={[styles.status, styles[`status_${status}`]]}>{statusLabel[status]}</Text>
        {item.approval_reason ? <Text style={styles.reason}>Motivo anterior: {item.approval_reason}</Text> : null}
        {status !== 'approved' || filter === 'approved' ? (
          <TextInput
            value={reasons[item.id] || ''}
            onChangeText={(value) => setReasons((current) => ({ ...current, [item.id]: value }))}
            placeholder="Motivo (obrigatório para rejeitar/revogar)"
            placeholderTextColor="#777"
            maxLength={500}
            multiline
            style={styles.reasonInput}
            accessibilityLabel={`Motivo para ${item.name}`}
          />
        ) : null}
        <View style={styles.actions}>
          {status === 'pending' ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.approveButton]}
                onPress={() => void decide(item, 'approve')}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel={`Aprovar ${item.name}`}
              >
                <Text style={styles.buttonText}>Aprovar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.rejectButton]}
                onPress={() => void decide(item, 'reject')}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel={`Rejeitar ${item.name}`}
              >
                <Text style={styles.buttonText}>Rejeitar</Text>
              </TouchableOpacity>
            </>
          ) : status === 'approved' ? (
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={() => void decide(item, 'revoke')}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel={`Revogar ${item.name}`}
            >
              <Text style={styles.buttonText}>Revogar</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {isSaving ? <ActivityIndicator color="#6F52A2" /> : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Aprovação de médicos</Text>
        <Text style={styles.subtitle}>Confira o CRM no CFM antes de aprovar o acesso clínico.</Text>
        <View style={styles.filters}>
          {(['pending', 'approved', 'rejected', 'revoked', 'all'] as Filter[]).map((value) => (
            <TouchableOpacity
              key={value}
              onPress={() => setFilter(value)}
              style={[styles.filterButton, filter === value && styles.activeFilter]}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar ${value === 'all' ? 'todos' : statusLabel[value]}`}
            >
              <Text style={filter === value ? styles.activeFilterText : styles.filterText}>
                {value === 'all' ? 'Todos' : statusLabel[value]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator size="large" color="#6F52A2" style={styles.loader} />
        ) : (
          <FlatList
            data={visibleDoctors}
            renderItem={renderDoctor}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={<Text style={styles.empty}>Nenhum médico nesta situação.</Text>}
            contentContainerStyle={visibleDoctors.length === 0 ? styles.emptyContainer : undefined}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F5FC' },
  container: { flex: 1, padding: 20 },
  title: { color: '#3D315B', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#555', fontSize: 15, lineHeight: 21, marginTop: 8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  filterButton: { borderColor: '#C7BCE0', borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  activeFilter: { backgroundColor: '#6F52A2' },
  filterText: { color: '#5B4B7A', fontSize: 13 },
  activeFilterText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: '#FFF', borderRadius: 14, elevation: 2, marginBottom: 14, padding: 16 },
  name: { color: '#3D315B', fontSize: 18, fontWeight: '700' },
  detail: { color: '#555', fontSize: 14, marginTop: 5 },
  status: { alignSelf: 'flex-start', borderRadius: 10, fontSize: 13, fontWeight: '700', marginTop: 10, paddingHorizontal: 9, paddingVertical: 5 },
  status_pending: { backgroundColor: '#FFF1C7', color: '#745500' },
  status_approved: { backgroundColor: '#DDF5E4', color: '#1B6B36' },
  status_rejected: { backgroundColor: '#FFE0E0', color: '#8B2020' },
  status_revoked: { backgroundColor: '#E9E1F8', color: '#5B3C86' },
  reason: { color: '#6A5D7C', fontSize: 13, lineHeight: 19, marginTop: 10 },
  reasonInput: { borderColor: '#D7D0E5', borderRadius: 8, borderWidth: 1, color: '#333', minHeight: 44, marginTop: 12, padding: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  button: { alignItems: 'center', borderRadius: 9, flex: 1, padding: 12 },
  approveButton: { backgroundColor: '#2E8B57' },
  rejectButton: { backgroundColor: '#B33A3A' },
  buttonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  error: { color: '#A52828', fontSize: 14, marginBottom: 10 },
  loader: { marginTop: 45 },
  empty: { color: '#666', fontSize: 16, textAlign: 'center' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
});
