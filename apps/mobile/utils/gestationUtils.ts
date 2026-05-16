import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_PERIOD_KEY = '@myFetus:lastPeriod';

const formatDateToISO = (date: string): string => {
  // Se a data já estiver no formato YYYY-MM-DD, retorna ela mesma
  if (date.includes('-')) {
    return date;
  }
  
  // Se estiver no formato DD/MM/YYYY, converte para YYYY-MM-DD
  const [day, month, year] = date.split('/');
  return `${year}-${month}-${day}`;
};

export const saveLastPeriod = async (date: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_PERIOD_KEY, date);
  } catch (error) {
    console.error('Erro ao salvar data da última menstruação:', error);
  }
};

export const getLastPeriod = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LAST_PERIOD_KEY);
  } catch (error) {
    console.error('Erro ao recuperar data da última menstruação:', error);
    return null;
  }
};

type GestationResult = {
  weeks: number;
  warning?: string;
};

export const calculateGestationWeek = (lastPeriod: string): GestationResult => {
  const today = new Date();
  const formattedDate = formatDateToISO(lastPeriod);
  const lastPeriodDate = new Date(formattedDate);
  
  console.log('GestationUtils - Data atual:', today.toISOString());
  console.log('GestationUtils - Data última menstruação (original):', lastPeriod);
  console.log('GestationUtils - Data última menstruação (formatada):', formattedDate);
  console.log('GestationUtils - Data última menstruação (objeto Date):', lastPeriodDate.toISOString());
  
  // Calcula a diferença em milissegundos
  const diffTime = Math.abs(today.getTime() - lastPeriodDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  console.log('GestationUtils - Diferença em dias:', diffDays);
  
  // Converte dias em semanas (dividindo por 7 e arredondando para baixo)
  const weeks = Math.floor(diffDays / 7);
  
  console.log('GestationUtils - Semanas calculadas:', weeks);
  
  const result: GestationResult = {
    weeks: weeks
  };

  if (weeks > 42) {
    result.warning = 'Atenção: A gestação está com mais de 42 semanas. Consulte seu médico imediatamente.';
  }

  return result;
};

export const calculateDPP = (lastPeriod: string): string => {
  const formattedDate = formatDateToISO(lastPeriod);
  const lastPeriodDate = new Date(formattedDate);
  
  // Adiciona 280 dias (40 semanas) à data da última menstruação
  const dpp = new Date(lastPeriodDate);
  dpp.setDate(dpp.getDate() + 280);
  
  // Formata a data para o padrão brasileiro (DD/MM/YYYY)
  const day = dpp.getDate().toString().padStart(2, '0');
  const month = (dpp.getMonth() + 1).toString().padStart(2, '0');
  const year = dpp.getFullYear();
  
  return `${day}/${month}/${year}`;
};

export const getBabySize = (week: number): string => {
  const sizes: { [key: number]: string } = {
    4: 'Grão de lentilha',
    5: 'Grão de feijão',
    6: 'Grão de ervilha',
    7: 'Mirtilo',
    8: 'Framboesa',
    9: 'Azeitona',
    10: 'Morango',
    11: 'Lima',
    12: 'Limão',
    13: 'Pêssego',
    14: 'Maçã',
    15: 'Laranja',
    16: 'Abacate',
    17: 'Pera',
    18: 'Batata doce',
    19: 'Manga',
    20: 'Banana',
    21: 'Cenoura',
    22: 'Milho',
    23: 'Manga grande',
    24: 'Milho grande',
    25: 'Nabo',
    26: 'Cebola',
    27: 'Couve-flor',
    28: 'Berinjela',
    29: 'Abóbora',
    30: 'Repolho',
    31: 'Coco',
    32: 'Jicama',
    33: 'Abacaxi',
    34: 'Melão',
    35: 'Melão cantaloupe',
    36: 'Alface romana',
    37: 'Acelga',
    38: 'Abóbora',
    39: 'Melancia pequena',
    40: 'Melancia',
    41: 'Melancia grande',
  };

  return sizes[week] || 'Desconhecido';
};

export const getBabyDescription = (week: number): string => {
  const descriptions: { [key: number]: string } = {
    4: 'Nesta fase inicial, o embrião está se formando e o coração começa a bater. O tamanho é similar a um grão de lentilha.',
    5: 'O embrião está crescendo rapidamente. O coração está batendo e os principais órgãos começam a se desenvolver.',
    6: 'O embrião já tem um formato mais definido. O coração está batendo regularmente e os membros começam a se formar.',
    7: 'O embrião agora é chamado de feto. Os dedos das mãos e pés começam a se formar, e o rosto está mais definido.',
    8: 'O feto está se movendo, embora você ainda não sinta. Todos os órgãos principais estão presentes.',
    9: 'O feto está mais ativo, com movimentos espontâneos. As características faciais estão mais definidas.',
    10: 'O feto já tem unhas e cabelos começando a crescer. Os órgãos genitais externos estão se desenvolvendo.',
    11: 'O feto está mais proporcional e os ossos começam a endurecer. Os movimentos são mais coordenados.',
    12: 'O feto já tem todas as estruturas básicas formadas. Os órgãos genitais externos estão mais definidos.',
    13: 'O feto está mais ativo e os movimentos são mais frequentes. A pele está mais espessa e menos transparente.',
    14: 'O feto já tem sobrancelhas e cabelos. Os movimentos são mais coordenados e os músculos estão mais fortes.',
    15: 'O feto já pode fazer expressões faciais e os ossos estão mais fortes. O sistema nervoso está mais desenvolvido.',
    16: 'O feto já tem unhas completas e a pele está mais espessa. Os movimentos são mais vigorosos.',
    17: 'O feto está mais proporcional e os movimentos são mais coordenados. A gordura começa a se acumular.',
    18: 'O feto já tem um padrão de sono definido. Os sentidos estão mais desenvolvidos.',
    19: 'O feto está mais ativo e os movimentos são mais perceptíveis. A pele está mais espessa e menos enrugada.',
    20: 'Metade da gestação! O feto já tem todos os órgãos formados e está crescendo rapidamente.',
    21: 'O feto está mais ativo e os movimentos são mais frequentes. A pele está mais espessa e menos transparente.',
    22: 'O feto já tem unhas completas e a pele está mais espessa. Os movimentos são mais vigorosos.',
    23: 'O feto está mais proporcional e os movimentos são mais coordenados. A gordura começa a se acumular.',
    24: 'O feto já tem um padrão de sono definido. Os sentidos estão mais desenvolvidos.',
    25: 'O feto está mais ativo e os movimentos são mais perceptíveis. A pele está mais espessa e menos enrugada.',
    26: 'O feto já tem todos os órgãos formados e está crescendo rapidamente. Os pulmões estão se desenvolvendo.',
    27: 'O feto está mais ativo e os movimentos são mais frequentes. O cérebro está em rápido desenvolvimento.',
    28: 'O feto já tem unhas completas e a pele está mais espessa. Os movimentos são mais vigorosos.',
    29: 'O feto está mais proporcional e os movimentos são mais coordenados. A gordura está se acumulando.',
    30: 'O feto já tem um padrão de sono definido. Os sentidos estão mais desenvolvidos.',
    31: 'O feto está mais ativo e os movimentos são mais perceptíveis. A pele está mais espessa e menos enrugada.',
    32: 'O feto já tem todos os órgãos formados e está crescendo rapidamente. Os pulmões estão mais desenvolvidos.',
    33: 'O feto está mais ativo e os movimentos são mais frequentes. O cérebro está em rápido desenvolvimento.',
    34: 'O feto já tem unhas completas e a pele está mais espessa. Os movimentos são mais vigorosos.',
    35: 'O feto está mais proporcional e os movimentos são mais coordenados. A gordura está se acumulando.',
    36: 'O feto já tem um padrão de sono definido. Os sentidos estão mais desenvolvidos.',
    37: 'O feto está mais ativo e os movimentos são mais perceptíveis. A pele está mais espessa e menos enrugada.',
    38: 'O feto já tem todos os órgãos formados e está crescendo rapidamente. Os pulmões estão mais desenvolvidos.',
    39: 'O feto está mais ativo e os movimentos são mais frequentes. O cérebro está em rápido desenvolvimento.',
    40: 'O bebê está pronto para nascer! Todos os órgãos estão completamente desenvolvidos.',
    41: 'O bebê está pronto para nascer! Todos os órgãos estão completamente desenvolvidos.',
  };

  return descriptions[week] || 'Seu bebê está se desenvolvendo a cada dia!';
}; 