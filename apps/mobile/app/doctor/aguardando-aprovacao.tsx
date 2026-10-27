import React from 'react';
import { SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AccessibleText as Text } from '../../components/AccessibleText';
import { useSession } from '../../contexts/SessionContext';

const statusCopy = {
  pending: {
    title: 'Cadastro aguardando aprovação',
    message: 'Seu cadastro foi recebido. O administrador precisa conferir o CRM no CFM antes de liberar o acesso clínico.',
  },
  rejected: {
    title: 'Cadastro precisa de correção',
    message: 'O administrador rejeitou o cadastro. Consulte o motivo e corrija os dados profissionais antes de reenviar.',
  },
  revoked: {
    title: 'Acesso clínico revogado',
    message: 'O acesso clínico foi revogado pelo administrador. Corrija os dados, se necessário, e aguarde uma nova análise.',
  },
};

export default function DoctorApprovalScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();
  const status = user?.doctor_approval_status === 'rejected' || user?.doctor_approval_status === 'revoked'
    ? user.doctor_approval_status
    : 'pending';
  const copy = statusCopy[status];

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.message}>{copy.message}</Text>
        {user?.doctor_approval_reason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Motivo informado</Text>
            <Text style={styles.reason}>{user.doctor_approval_reason}</Text>
          </View>
        ) : null}
        <Text style={styles.note}>
          Você ainda pode sair da conta. O acesso aos dados clínicos só será liberado depois da aprovação.
        </Text>
        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
        >
          <Text style={styles.buttonText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F5FC' },
  container: { flex: 1, justifyContent: 'center', padding: 28 },
  title: { color: '#3D315B', fontSize: 25, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  message: { color: '#4D4D4D', fontSize: 17, lineHeight: 25, textAlign: 'center' },
  reasonBox: { backgroundColor: '#FFF', borderRadius: 12, marginTop: 24, padding: 16 },
  reasonLabel: { color: '#5B4B7A', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  reason: { color: '#333', fontSize: 15, lineHeight: 22 },
  note: { color: '#666', fontSize: 14, lineHeight: 21, marginTop: 24, textAlign: 'center' },
  button: { alignItems: 'center', backgroundColor: '#6F52A2', borderRadius: 12, marginTop: 28, padding: 15 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
