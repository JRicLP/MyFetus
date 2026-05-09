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
import AsyncStorage from '@react-native-async-storage/async-storage';



export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter(); 

  const handleLogin = async () => {
    if (!email || !senha) {
      Alert.alert("Erro", "Por favor, preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email, password: senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'E-mail ou senha inválidos');
      }

      console.log('Usuário autenticado:', data);
      
      try {
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
    } catch (e) {
      console.error('Erro ao salvar dados do usuário', e);
    }
      
     

      // admin ou user
      if (data.user.role === 'admin') {
        // admin (médico)
        router.push('/doctor/dashboard'); 
      } else {
        // É um paciente (user)
        router.push('/outra-gestacao'); // A tela padrão do paciente
      }

    } catch (error) {
      console.error('Erro no login:', error);
      Alert.alert('Erro no Login', error instanceof Error ? error.message : 'Tente novamente');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    router.push('/Cadastro?role=user');
  };

  const handleCreateDoctorAccount = () => {
    router.push('/Cadastro?role=admin');
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
