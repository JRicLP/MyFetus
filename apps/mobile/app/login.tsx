import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router'; 
import { api } from '../utils/apiClient';
import { useSession } from '@/contexts/SessionContext';
import { parseSessionUser } from '@/types/session';


export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter(); 
  const { signIn } = useSession();

  const handleLogin = async () => {
    if (!email || !senha) {
      Alert.alert("Erro", "Por favor, preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/users/login', { email, password: senha });
      const payload = response.data as { error?: string; message?: string; token?: unknown; user?: unknown };
      const user = parseSessionUser(payload.user);
      if (typeof payload.token !== 'string' || !user) {
        throw new Error('A resposta de autenticação é inválida.');
      }
      await signIn(payload.token, user);

      if (user.role === 'admin' || user.role === 'medico') {
        router.replace('/doctor/dashboard');
      } else {
        router.replace('/outra-gestacao');
      }

    } catch (error) {
      Alert.alert('Erro no Login', error instanceof Error ? error.message : 'Tente novamente');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    router.push('/Cadastro?role=gestante');
  };

  const handleCreateDoctorAccount = () => {
    router.push('/CadastroMedico');
  };

  return (
    <LinearGradient colors={["#cce5f6", "#f8cde9"]} style={styles.container}>
      <View style={styles.headerContainer}>
        <Image
          source={require("../assets/images/myfetus-logo.png")}
          style={styles.logoMain}
          resizeMode="contain"
        />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.formBox}>
          <Image
            source={require("../assets/images/fetus-heart.png")}
            style={styles.heartImage}
            resizeMode="contain"
          />
          <TextInput
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { marginTop: 60 }]}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#f9a9a7"
            editable={!loading}
          />
          <TextInput
            placeholder="Senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#f9a9a7"
            editable={!loading}
          />

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCreateAccount} disabled={loading}>
            <Text style={styles.createAccountText}>Crie uma conta (Paciente)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleCreateDoctorAccount} disabled={loading} style={{ marginTop: 10 }}>
            <Text style={styles.doctorAccountText}>Sou médico. Cadastrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footerContainer}>
        <Image
          source={require("../assets/images/poli-upe-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </LinearGradient>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 30,
  },
  headerContainer: {
    width: "100%",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  contentContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  footerContainer: {
    width: "100%",
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMain: {
    width: 250,
    height: 160,
    alignSelf: "center",
  },
  heartImage: {
    width: 120,
    height: 120,
    position: "absolute",
    top: -60,
    zIndex: 3,
  },
  formBox: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    alignItems: "center",
    marginTop: 80,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#fff",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    width: "100%",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#fff",
  },
  loginButton: {
    backgroundColor: "#f9a9a7",
    paddingVertical: 12,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
  },
  loginButtonDisabled: {
    backgroundColor: "#f9a9a7aa",
  },
  loginText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  createAccountText: {
    color: "#20B2AA",
    fontWeight: "bold",
    fontSize: 14,
  },
  doctorAccountText: {
    color: "#b34d7a",
    fontWeight: "bold",
    fontSize: 14,
  },
  logo: {
    width: 240,
    height: 80,
  },
});
