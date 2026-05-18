import { Stack } from 'expo-router';

export default function DoctorLayout() {
  return (
    <Stack
      // 1. Opções PADRÃO para todas as telas do Doutor
      screenOptions={{
        headerStyle: { backgroundColor: '#E6E0F8' }, 
        // Cor do título e da seta de voltar
        headerTintColor: '#333', 
        headerBackTitleVisible: false, 
      }}
    >
      {/* 2. Opção ESPECIAL para o Dashboard */}
      <Stack.Screen
        name="dashboard"
        options={{
          headerShown: false,
        }}
      />

      {/* 3. Opções para as telas do Prontuário */}
      
      <Stack.Screen name="[patientId]/identificacao" options={{ title: 'Identificação' }} />
      <Stack.Screen name="[patientId]/informacoes_iniciais" options={{ title: 'Informações Iniciais' }} />
      <Stack.Screen name="[patientId]/grafico" options={{ title: 'Gráfico de Acompanhamento' }} />
      <Stack.Screen name="[patientId]/informacoes_paciente" options={{ title: 'Informações da Paciente' }} />
      <Stack.Screen name="[patientId]/antecedentes_familiares" options={{ title: 'Antecedentes Familiares' }} />
      <Stack.Screen name="[patientId]/gestacao_anterior" options={{ title: 'Gestação Anterior' }} />
      <Stack.Screen name="[patientId]/antecedentes_clinicos" options={{ title: 'Antecedentes Clínicos' }} />
      <Stack.Screen name="[patientId]/gestacao_atual" options={{ title: 'Gestação Atual' }} />
      <Stack.Screen name="[patientId]/vacina" options={{ title: 'Vacinas' }} />
      <Stack.Screen name="[patientId]/historico_exames" options={{ title: 'Exames' }} />
      <Stack.Screen name="[patientId]/historico_ultrassons" options={{ title: 'Ultrassons' }} />
      <Stack.Screen name="[patientId]/informacoes_gerais" options={{ title: 'Geral' }} /> 
      <Stack.Screen name="[patientId]/resumo" options={{ title: 'Resumo' }} />
    </Stack>
  );
}