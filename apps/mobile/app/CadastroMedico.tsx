import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../utils/apiClient';
import ConsentChecklist, { useConsentPolicy } from '../components/ConsentChecklist';
import {
  buildSignupConsents,
  ConsentSelection,
  getApiErrorInfo,
  getMissingRequired,
} from '../utils/consent';

const formatarData = (text: string) => {
  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
};

export default function CadastroMedicoScreen() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [crm, setCrm] = useState('');
  const [crmEstado, setCrmEstado] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  // E7-01.1: médico aceita os termos do próprio perfil e declara ciência da política.
  const { policy, reload: carregarTermos } = useConsentPolicy('medico');
  const [aceites, setAceites] = useState<ConsentSelection>({});

  const handleCriar = async () => {
    if (!nome.trim() || !email.trim() || senha.length < 8 || !dataNascimento || !crm.trim() || crmEstado.trim().length !== 2) {
      Alert.alert(
        'Atenção',
        'Preencha nome, email, senha (8+ caracteres), data de nascimento, CRM e UF do CRM (2 letras).'
      );
      return;
    }

    const [dia, mes, ano] = dataNascimento.split('/');
    if (!dia || !mes || !ano || ano.length !== 4) {
      Alert.alert('Atenção', 'Data de nascimento inválida. Use o formato DD/MM/AAAA.');
      return;
    }

    if (!policy) {
      Alert.alert('Atenção', 'Não foi possível carregar os termos. Verifique sua conexão.');
      return;
    }
    if (getMissingRequired(policy, aceites).length > 0) {
      Alert.alert('Atenção', 'Aceite os termos de uso e declare ciência da política de privacidade.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/doctors', {
        name: nome.trim(),
        email: email.trim(),
        password: senha,
        birthdate: `${ano}-${mes}-${dia}`,
        crm: crm.trim(),
        crm_estado: crmEstado.trim().toUpperCase(),
        especialidade: especialidade.trim() || undefined,
        telefone: telefone.trim() || undefined,
        consents: buildSignupConsents(policy, aceites),
      });

      Alert.alert('Sucesso', 'Sua conta de médico foi criada com sucesso! Você já pode fazer login.', [
        { text: 'OK', onPress: () => router.push('/login') },
      ]);
    } catch (error) {
      const apiError = getApiErrorInfo(error);
      if (apiError.code === 'CONSENT_VERSION_OUTDATED') {
        setAceites({});
        await carregarTermos();
        Alert.alert('Atenção', 'Os termos foram atualizados. Leia a nova versão e aceite novamente.');
      } else {
        Alert.alert('Erro', apiError.message || (error instanceof Error ? error.message : 'Erro de rede'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.title}>Cadastro de médico</Text>
          <Text style={styles.subtitle}>Preencha seus dados profissionais para criar sua conta.</Text>

          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            placeholder="Digite seu nome"
            placeholderTextColor="#6B7280"
            value={nome}
            onChangeText={setNome}
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            placeholder="Digite seu e-mail"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            placeholder="Mínimo de 8 caracteres"
            placeholderTextColor="#6B7280"
            value={senha}
            onChangeText={setSenha}
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>Data de nascimento</Text>
          <TextInput
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#6B7280"
            value={dataNascimento}
            onChangeText={(text) => setDataNascimento(formatarData(text))}
            style={styles.input}
            keyboardType="numeric"
            maxLength={10}
            editable={!loading}
          />

          <View style={styles.row}>
            <View style={styles.rowField}>
              <Text style={styles.label}>CRM</Text>
              <TextInput
                placeholder="Número"
                placeholderTextColor="#6B7280"
                value={crm}
                onChangeText={setCrm}
                style={[styles.input, styles.rowInput]}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
            <View style={styles.ufField}>
              <Text style={styles.label}>UF</Text>
              <TextInput
                placeholder="UF"
                placeholderTextColor="#6B7280"
                value={crmEstado}
                onChangeText={setCrmEstado}
                style={[styles.input, styles.ufInput]}
                maxLength={2}
                autoCapitalize="characters"
                editable={!loading}
              />
            </View>
          </View>

          <Text style={styles.label}>Especialidade <Text style={styles.optionalLabel}>(opcional)</Text></Text>
          <TextInput
            placeholder="Ex.: obstetrícia"
            placeholderTextColor="#6B7280"
            value={especialidade}
            onChangeText={setEspecialidade}
            style={styles.input}
            editable={!loading}
          />

          <Text style={styles.label}>Telefone <Text style={styles.optionalLabel}>(opcional)</Text></Text>
          <TextInput
            placeholder="(00) 00000-0000"
            placeholderTextColor="#6B7280"
            value={telefone}
            onChangeText={setTelefone}
            style={styles.input}
            keyboardType="phone-pad"
            editable={!loading}
          />

          <ConsentChecklist
            policy={policy}
            selection={aceites}
            disabled={loading}
            onToggle={(purpose) => setAceites((prev) => ({ ...prev, [purpose]: !prev[purpose] }))}
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleCriar}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Criar conta de médico</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} disabled={loading}>
            <Text style={styles.cancelText}>Voltar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#E6E0F8' },
  keyboardView: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#555', marginTop: 6, marginBottom: 20 },
  label: { color: '#374151', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  optionalLabel: { color: '#6B7280', fontWeight: '400' },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  row: { flexDirection: 'row', gap: 10 },
  rowField: { flex: 1 },
  ufField: { width: 70 },
  rowInput: { flex: 1 },
  ufInput: { width: 70 },
  submitButton: {
    backgroundColor: '#886aea',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: { backgroundColor: '#aaa' },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cancelText: { color: '#886aea', fontWeight: 'bold', textAlign: 'center', fontSize: 14 },
});
