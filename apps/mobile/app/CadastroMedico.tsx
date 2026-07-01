import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiUrl, fetchWithAuth } from '../utils/api';

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

    setLoading(true);
    try {
      const response = await fetchWithAuth(apiUrl('/api/doctors'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nome.trim(),
          email: email.trim(),
          password: senha,
          birthdate: `${ano}-${mes}-${dia}`,
          crm: crm.trim(),
          crm_estado: crmEstado.trim().toUpperCase(),
          especialidade: especialidade.trim() || undefined,
          telefone: telefone.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Não foi possível criar a conta de médico');
      }

      Alert.alert('Sucesso', 'Sua conta de médico foi criada com sucesso! Você já pode fazer login.', [
        { text: 'OK', onPress: () => router.push('/login') },
      ]);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro de rede');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Cadastro de médico</Text>
        <Text style={styles.subtitle}>Preencha seus dados profissionais para criar sua conta.</Text>

        <TextInput
          placeholder="Nome completo"
          value={nome}
          onChangeText={setNome}
          style={styles.input}
          editable={!loading}
        />
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        <TextInput
          placeholder="Senha (mín. 8 caracteres)"
          value={senha}
          onChangeText={setSenha}
          style={styles.input}
          secureTextEntry
          editable={!loading}
        />
        <TextInput
          placeholder="Data de nascimento (DD/MM/AAAA)"
          value={dataNascimento}
          onChangeText={(text) => setDataNascimento(formatarData(text))}
          style={styles.input}
          keyboardType="numeric"
          maxLength={10}
          editable={!loading}
        />

        <View style={styles.row}>
          <TextInput
            placeholder="CRM"
            value={crm}
            onChangeText={setCrm}
            style={[styles.input, styles.rowInput]}
            keyboardType="numeric"
            editable={!loading}
          />
          <TextInput
            placeholder="UF"
            value={crmEstado}
            onChangeText={setCrmEstado}
            style={[styles.input, styles.ufInput]}
            maxLength={2}
            autoCapitalize="characters"
            editable={!loading}
          />
        </View>

        <TextInput
          placeholder="Especialidade (opcional)"
          value={especialidade}
          onChangeText={setEspecialidade}
          style={styles.input}
          editable={!loading}
        />
        <TextInput
          placeholder="Telefone (opcional)"
          value={telefone}
          onChangeText={setTelefone}
          style={styles.input}
          keyboardType="phone-pad"
          editable={!loading}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#E6E0F8' },
  container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#555', marginTop: 6, marginBottom: 20 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', gap: 10 },
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
