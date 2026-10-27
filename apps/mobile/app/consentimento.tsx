import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ConsentChecklist, { useConsentPolicy } from '../components/ConsentChecklist';
import { useSession } from '../contexts/SessionContext';
import { api } from '../utils/apiClient';
import { getLastPeriod } from '../utils/gestationUtils';
import {
  ConsentSelection,
  ConsentStatus,
  getApiErrorInfo,
  getMissingRequired,
} from '../utils/consent';

type ConsentRole = 'gestante' | 'medico';

function selectionFromStatus(nextStatus: ConsentStatus): ConsentSelection {
  return Object.fromEntries(
    (nextStatus.purposes || [])
      .filter((item) => item.status === 'accepted' && item.decided_version === item.current_version)
      .map((item) => [item.purpose, true])
  );
}

function roleForUser(role: string): ConsentRole | null {
  return role === 'gestante' || role === 'medico' ? role : null;
}

export default function ConsentimentoScreen() {
  const router = useRouter();
  const { user } = useSession();
  const role = user ? roleForUser(user.role) : null;
  const { policy, reload } = useConsentPolicy(role || 'gestante');
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [selection, setSelection] = useState<ConsentSelection>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !role) {
      router.replace('/login');
      return undefined;
    }
    let active = true;
    api.get('/consents/me')
      .then((response) => {
        if (!active) return;
        const nextStatus = response.data as ConsentStatus;
        setStatus(nextStatus);
        setSelection(selectionFromStatus(nextStatus));
      })
      .catch(() => {
        if (active) Alert.alert('Não foi possível carregar', 'Tente novamente para consultar os termos vigentes.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router, role, user]);

  const missing = useMemo(
    () => (policy ? getMissingRequired(policy, selection) : []),
    [policy, selection]
  );

  const finish = async () => {
    if (!user || !role || !policy || !status) return;
    if (missing.length > 0) {
      Alert.alert('Aceites obrigatórios', 'Marque todas as finalidades obrigatórias para continuar.');
      return;
    }

    setSaving(true);
    try {
      const currentByPurpose = new Map(status.purposes.map((item) => [item.purpose, item]));
      for (const item of policy.purposes) {
        if (selection[item.purpose] && currentByPurpose.get(item.purpose)?.status !== 'accepted') {
          await api.post('/consents', {
            purpose: item.purpose,
            decision: 'accepted',
            version: item.version,
          });
        }
      }

      const refreshed = (await api.get('/consents/me')).data as ConsentStatus;
      setStatus(refreshed);
      if (refreshed.required) {
        Alert.alert('Atualização incompleta', 'Ainda há uma finalidade obrigatória pendente.');
        return;
      }

      if (role === 'medico' && user.doctor_approval_status !== 'approved') {
        router.replace('/doctor/aguardando-aprovacao');
      } else if (role === 'medico') {
        router.replace('/doctor/dashboard');
      } else {
        const lastPeriod = await getLastPeriod(user.id);
        router.replace(lastPeriod ? '/(tabs)' : '/outra-gestacao');
      }
    } catch (error) {
      const info = getApiErrorInfo(error);
      if (info.code === 'CONSENT_VERSION_OUTDATED') {
        await reload();
        const refreshed = (await api.get('/consents/me')).data as ConsentStatus;
        setStatus(refreshed);
        setSelection(selectionFromStatus(refreshed));
        Alert.alert('Termos atualizados', 'Os termos mudaram. Revise a versão vigente e envie novamente.');
      } else {
        Alert.alert('Não foi possível atualizar', info.message || 'Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user || !role) return null;

  return (
    <LinearGradient colors={['#cce5f6', '#f8cde9']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Atualização necessária</Text>
          <Text style={styles.subtitle}>
            Para continuar usando os recursos clínicos do MyFetus, revise e confirme os termos vigentes.
          </Text>
          {loading ? (
            <ActivityIndicator color="#20B2AA" />
          ) : (
            <>
              <ConsentChecklist
                policy={policy}
                selection={selection}
                disabled={saving}
                onToggle={(purpose) => setSelection((previous) => ({
                  ...previous,
                  [purpose]: !previous[purpose],
                }))}
              />
              <TouchableOpacity
                style={[styles.button, saving && styles.buttonDisabled]}
                onPress={finish}
                disabled={saving || !status || !policy}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continuar</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  title: { color: '#8c3f6b', fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: '#374151', fontSize: 16, lineHeight: 23, marginBottom: 18 },
  button: { alignItems: 'center', backgroundColor: '#20B2AA', borderRadius: 25, marginTop: 20, paddingVertical: 14 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
