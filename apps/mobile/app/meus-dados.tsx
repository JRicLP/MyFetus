import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AccountDeletionCard from '../components/AccountDeletionCard';
import { AccessibleText as Text } from '../components/AccessibleText';
import { useSession } from '../contexts/SessionContext';
import { ACCESSIBLE_COLORS } from '../theme/accessibility';
import { api } from '../utils/apiClient';
import {
  EXPORT_GENERIC_ERROR,
  ExportSectionCount,
  exportFileName,
  getExportErrorMessage,
  parseDataExport,
  summarizeExport,
} from '../utils/dataExport';
import { saveDataExport } from '../utils/saveDataExport';

// Direitos do titular (E7-02): exportação dos próprios dados em JSON e exclusão da conta.
export default function MeusDadosScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [password, setPassword] = useState('');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExportSectionCount[] | null>(null);

  const handleExport = async () => {
    if (!password) {
      setError('Digite sua senha para confirmar a exportação.');
      return;
    }

    setExporting(true);
    setError(null);
    setSummary(null);
    try {
      let data;
      try {
        data = parseDataExport((await api.post('/privacy/export', { password })).data);
      } catch (apiError) {
        setError(getExportErrorMessage(apiError));
        return;
      }
      if (!data) {
        setError(EXPORT_GENERIC_ERROR);
        return;
      }

      try {
        await saveDataExport(JSON.stringify(data, null, 2), exportFileName(data.gerado_em));
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o arquivo.');
        return;
      }
      setSummary(summarizeExport(data));
      setPassword('');
    } finally {
      setExporting(false);
    }
  };

  if (!user) return null;

  return (
    <LinearGradient colors={['#cce5f6', '#f8cde9']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <FontAwesome name="chevron-left" size={16} color={ACCESSIBLE_COLORS.primary} />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>

          <Text style={styles.title} accessibilityRole="header">Meus dados</Text>
          <Text style={styles.subtitle}>
            Você pode baixar uma cópia dos seus dados guardados no MyFetus ou excluir sua conta, conforme a LGPD.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>O que vem no arquivo</Text>
            <Text style={styles.cardText}>
              {user.role === 'gestante'
                ? 'Sua conta, seus consentimentos, o prontuário, as gestações, os eventos, as medidas, os pedidos de exame, os documentos (com o texto lido dos exames) e os vínculos com médicos.'
                : 'Sua conta, seus consentimentos e o seu perfil profissional. Dados de pacientes não fazem parte da sua exportação.'}
            </Text>
            <Text style={styles.cardText}>
              Não vêm senhas, registros internos de segurança nem dados de outras pessoas.
              {user.role === 'gestante' ? ' Os arquivos originais dos exames continuam disponíveis na tela de exames.' : ''}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Confirme sua senha</Text>
            <TextInput
              testID="data-export-password"
              accessibilityLabel="Senha da sua conta"
              value={password}
              onChangeText={setPassword}
              placeholder="Senha"
              placeholderTextColor={ACCESSIBLE_COLORS.muted}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              editable={!exporting}
              onSubmitEditing={handleExport}
              style={styles.input}
            />
            {error && (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">{error}</Text>
            )}
            <TouchableOpacity
              testID="data-export-submit"
              accessibilityRole="button"
              accessibilityState={{ disabled: exporting, busy: exporting }}
              onPress={handleExport}
              disabled={exporting}
              style={[styles.button, exporting && styles.buttonDisabled]}
            >
              {exporting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Exportar meus dados</Text>}
            </TouchableOpacity>
          </View>

          {summary && (
            <View style={styles.card} accessibilityLiveRegion="polite">
              <Text style={styles.cardTitle}>Arquivo gerado</Text>
              {summary.map((item) => (
                <Text key={item.label} style={styles.cardText}>{item.label}: {item.count}</Text>
              ))}
              <Text style={styles.warningText}>
                O arquivo tem dados de saúde. Guarde-o em local seguro e só compartilhe com quem você confia.
              </Text>
            </View>
          )}

          <AccountDeletionCard />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: 24, paddingBottom: 40, width: '100%', maxWidth: 520, alignSelf: 'center' },
  backButton: { alignSelf: 'flex-start', alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 12, paddingVertical: 8 },
  backText: { color: ACCESSIBLE_COLORS.primary, fontSize: 16, fontWeight: '600' },
  title: { color: '#8c3f6b', fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: ACCESSIBLE_COLORS.body, fontSize: 16, lineHeight: 23, marginBottom: 18 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, padding: 18 },
  cardTitle: { color: ACCESSIBLE_COLORS.secondary, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  cardText: { color: ACCESSIBLE_COLORS.body, fontSize: 15, lineHeight: 22, marginBottom: 6 },
  input: { borderColor: '#D0D5DD', borderRadius: 12, borderWidth: 1, color: ACCESSIBLE_COLORS.body, fontSize: 16, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 12 },
  errorText: { color: ACCESSIBLE_COLORS.danger, fontSize: 15, marginBottom: 10 },
  warningText: { color: ACCESSIBLE_COLORS.warning, fontSize: 15, lineHeight: 22, marginTop: 8 },
  button: { alignItems: 'center', backgroundColor: ACCESSIBLE_COLORS.primary, borderRadius: 25, marginTop: 6, paddingVertical: 14 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
