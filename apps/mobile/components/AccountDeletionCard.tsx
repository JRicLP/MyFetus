import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AccessibleText as Text } from './AccessibleText';
import { useSession } from '../contexts/SessionContext';
import { ACCESSIBLE_COLORS } from '../theme/accessibility';
import { api } from '../utils/apiClient';
import { clearScopedItems } from '../utils/scopedStorage';
import {
  DELETION_CONFIRMATION,
  DELETION_RETENTION_NOTE,
  canSelfDelete,
  getDeletionDescription,
  getDeletionErrorMessage,
  isDeletionConfirmed,
} from '../utils/accountDeletion';

// Direitos do titular (E7-02): exclusão da própria conta, com senha e a palavra EXCLUIR.
export default function AccountDeletionCard() {
  const router = useRouter();
  const { user, signOut } = useSession();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  const confirmed = isDeletionConfirmed(confirmation);

  const handleDelete = async () => {
    if (!password) {
      setError('Digite sua senha para confirmar a exclusão.');
      return;
    }
    if (!confirmed) {
      setError(`Digite ${DELETION_CONFIRMATION} para confirmar.`);
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await api.post('/privacy/delete', { password, confirmation: DELETION_CONFIRMATION });
    } catch (apiError) {
      setError(getDeletionErrorMessage(apiError));
      setDeleting(false);
      return;
    }

    // A conta já foi excluída no servidor: limpar o aparelho não pode impedir a saída.
    await clearScopedItems(user.id).catch(() => undefined);
    await signOut();
    router.replace('/login');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Excluir minha conta</Text>
      {getDeletionDescription(user.role).map((paragraph) => (
        <Text key={paragraph} style={styles.text}>{paragraph}</Text>
      ))}

      {canSelfDelete(user.role) && (
        <>
          <Text style={styles.note}>{DELETION_RETENTION_NOTE}</Text>
          <TextInput
            testID="account-deletion-password"
            accessibilityLabel="Senha para excluir a conta"
            value={password}
            onChangeText={setPassword}
            placeholder="Senha"
            placeholderTextColor={ACCESSIBLE_COLORS.muted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            editable={!deleting}
            style={styles.input}
          />
          <TextInput
            testID="account-deletion-confirmation"
            accessibilityLabel={`Digite ${DELETION_CONFIRMATION} para confirmar`}
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder={`Digite ${DELETION_CONFIRMATION}`}
            placeholderTextColor={ACCESSIBLE_COLORS.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deleting}
            onSubmitEditing={handleDelete}
            style={styles.input}
          />
          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>
          )}
          <TouchableOpacity
            testID="account-deletion-submit"
            accessibilityRole="button"
            accessibilityState={{ disabled: deleting || !confirmed, busy: deleting }}
            onPress={handleDelete}
            disabled={deleting || !confirmed}
            style={[styles.button, (deleting || !confirmed) && styles.buttonDisabled]}
          >
            {deleting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Excluir minha conta</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderColor: '#FDA29B', borderRadius: 16, borderWidth: 1, marginBottom: 16, padding: 18 },
  title: { color: ACCESSIBLE_COLORS.danger, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  text: { color: ACCESSIBLE_COLORS.body, fontSize: 15, lineHeight: 22, marginBottom: 6 },
  note: { color: ACCESSIBLE_COLORS.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  input: { borderColor: '#D0D5DD', borderRadius: 12, borderWidth: 1, color: ACCESSIBLE_COLORS.body, fontSize: 16, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 12 },
  error: { color: ACCESSIBLE_COLORS.danger, fontSize: 15, marginBottom: 10 },
  button: { alignItems: 'center', backgroundColor: ACCESSIBLE_COLORS.danger, borderRadius: 25, marginTop: 6, paddingVertical: 14 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
