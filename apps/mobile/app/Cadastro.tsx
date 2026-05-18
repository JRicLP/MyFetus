import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
// IMPORTANTE: Adicionado useLocalSearchParams
import { useRouter, useLocalSearchParams } from 'expo-router'; 

export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const router = useRouter();
  
  // Lê os parâmetros da URL ( role=admin)
  const { role } = useLocalSearchParams();
  const isMedico = role === 'admin';

  const validarEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validarData = (data: string) => {
    const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    if (!regex.test(data)) return false;

    const [dia, mes, ano] = data.split('/').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    
    return dataObj.getDate() === dia &&
           dataObj.getMonth() === mes - 1 &&
           dataObj.getFullYear() === ano;
  };

  const validarSenha = (senha: string) => {
    return senha.length >= 6;
  };

  const validarFormulario = () => {
    const novosErros: {[key: string]: string} = {};

    if (!nome.trim()) {
      novosErros.nome = 'Nome é obrigatório';
    }

    if (!email.trim()) {
      novosErros.email = 'E-mail é obrigatório';
    } else if (!validarEmail(email)) {
      novosErros.email = 'E-mail inválido';
    }

    
    if (!dataNascimento) {
      novosErros.dataNascimento = 'Data de nascimento é obrigatória';
    } else if (!validarData(dataNascimento)) {
      novosErros.dataNascimento = 'Data inválida';
    }

    if (!senha) {
      novosErros.senha = 'Senha é obrigatória';
    } else if (!validarSenha(senha)) {
      novosErros.senha = 'A senha deve ter pelo menos 6 caracteres';
    }

    if (!confirmarSenha) {
      novosErros.confirmarSenha = 'Confirme sua senha';
    } else if (senha !== confirmarSenha) {
      novosErros.confirmarSenha = 'As senhas não coincidem';
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const formatarData = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = '';

    if (cleaned.length <= 2) {
      formatted = cleaned;
    } else if (cleaned.length <= 4) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    } else if (cleaned.length <= 8) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4);
    } else {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
    }

    return formatted;
  };

  const handleCadastro = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      setLoading(true);

      const [dia, mes, ano] = dataNascimento.split('/');
      const dataFormatada = `${ano}-${mes}-${dia}`;

      // Prepara o objeto de dados, incluindo a 'role'
      const dadosCadastro = {
        name: nome,
        email: email,
        password: senha,
        birthdate: dataFormatada, // O campo é enviado sempre
        role: isMedico ? 'admin' : 'user' 
      };

      const response = await fetch('http://localhost:3000/api/users', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosCadastro),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar conta');
      }

      Alert.alert(
        'Sucesso!',
        'Sua conta foi criada com sucesso! Você será redirecionado para a página de login.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/login')
          }
        ]
      );
    } catch (error) {
      let mensagemErro = 'Erro ao criar conta';
      
      if (error instanceof Error) {
        if (error.message.includes('email')) {
          mensagemErro = 'Este e-mail já está cadastrado';
        } else if (error.message.includes('network')) {
          mensagemErro = 'Erro de conexão. Verifique sua internet';
        } else {
          mensagemErro = error.message;
        }
      }

      Alert.alert('Erro', mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  const handleVoltarLogin = () => {
    router.push('/login');
  };

  return (
    <LinearGradient
      colors={["#cce5f6", "#f8cde9"]}
      style={styles.container}
    >
      <View style={styles.formBox}>
        <Image
          source={require("../assets/images/fetus-heart.png")}
          style={styles.heartImage}
          resizeMode="contain"
        />
        
        {/* Título dinâmico */}
        <Text style={styles.title}>{isMedico ? 'Cadastro Médico' : 'Crie sua Conta'}</Text>
        
        <TextInput
          placeholder="Nome"
          value={nome}
          onChangeText={(text) => {
            setNome(text);
            setErrors(prev => ({...prev, nome: ''}));
          }}
          style={[styles.input, errors.nome && styles.inputError]}
          placeholderTextColor="#f9a9a7"
          editable={!loading}
        />
        {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}

        <TextInput
          placeholder="E-mail"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrors(prev => ({...prev, email: ''}));
          }}
          style={[styles.input, errors.email && styles.inputError]}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#f9a9a7"
          editable={!loading}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        {/* Campo de Data de Nascimento agora é obrigatório para todos */}
        <TextInput
          placeholder="Data de Nascimento (DD/MM/AAAA)"
          value={dataNascimento}
          onChangeText={(text) => {
            setDataNascimento(formatarData(text));
            setErrors(prev => ({...prev, dataNascimento: ''}));
          }}
          style={[styles.input, errors.dataNascimento && styles.inputError]}
          keyboardType="numeric"
          maxLength={10}
          placeholderTextColor="#f9a9a7"
          editable={!loading}
        />
        {errors.dataNascimento && <Text style={styles.errorText}>{errors.dataNascimento}</Text>}

        <TextInput
          placeholder="Senha"
          value={senha}
          onChangeText={(text) => {
            setSenha(text);
            setErrors(prev => ({...prev, senha: ''}));
          }}
          secureTextEntry
          style={[styles.input, errors.senha && styles.inputError]}
          placeholderTextColor="#f9a9a7"
          editable={!loading}
        />
        {errors.senha && <Text style={styles.errorText}>{errors.senha}</Text>}

        <TextInput
          placeholder="Confirmar Senha"
          value={confirmarSenha}
          onChangeText={(text) => {
            setConfirmarSenha(text);
            setErrors(prev => ({...prev, confirmarSenha: ''}));
          }}
          secureTextEntry
          style={[styles.input, errors.confirmarSenha && styles.inputError]}
          placeholderTextColor="#f9a9a7"
          editable={!loading}
        />
        {errors.confirmarSenha && <Text style={styles.errorText}>{errors.confirmarSenha}</Text>}

        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
          onPress={handleCadastro}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>Cadastrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleVoltarLogin} disabled={loading}>
          <Text style={styles.createAccountText}>Voltar para Login</Text>
        </TouchableOpacity>
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

// Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  footerContainer: {
    width: "100%",
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20
  },
  formBox: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fff",
    paddingVertical: 40
  },
  heartImage: {
    width: 120,
    height: 120,
    position: "absolute",
    top: -60,
    zIndex: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 20,
    marginTop: 60,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    width: "100%",
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#fff"
  },
  inputError: {
    borderColor: '#ff6b6b',
    borderWidth: 1,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginBottom: 10,
    alignSelf: 'flex-start',
    marginLeft: 15,
  },
  loginButton: {
    backgroundColor: "#f9a9a7",
    paddingVertical: 12,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginBottom: 10
  },
  loginButtonDisabled: {
    backgroundColor: "#f9a9a7aa",
  },
  loginText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  },
  createAccountText: {
    color: "#20B2AA",
    fontWeight: "bold",
    fontSize: 14
  },
  logo: {
    width: 240,
    height: 80
  }
});