export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  type: 'exam' | 'consultation' | 'test' | 'monitoring';
  completed: boolean;
}

export interface WeekChecklist {
  weekRange: string;
  items: ChecklistItem[];
}

export const checklistData: WeekChecklist[] = [
  // Primeiro Trimestre (1-13 semanas)
  {
    weekRange: "1-4",
    items: [
      {
        id: "1-4-1",
        title: "Teste de gravidez",
        description: "Teste de farmácia ou Beta-hCG sanguíneo, caso haja suspeita",
        type: "test",
        completed: false
      },
      {
        id: "1-4-2",
        title: "Agendar primeira consulta pré-natal",
        description: "Após confirmação da gravidez",
        type: "consultation",
        completed: false
      },
      {
        id: "1-4-3",
        title: "Iniciar suplementação de ácido fólico",
        description: "Se ainda não estiver tomando",
        type: "monitoring",
        completed: false
      }
    ]
  },
  {
    weekRange: "5-8",
    items: [
      {
        id: "5-8-1",
        title: "Primeira consulta pré-natal",
        description: "Anamnese completa, exame físico e cálculo da DPP",
        type: "consultation",
        completed: false
      },
      {
        id: "5-8-2",
        title: "Exames laboratoriais iniciais",
        description: "Tipagem sanguínea, Fator Rh, Hemograma, Glicemia, Sorologias (HIV, Sífilis, Hepatite B, Toxoplasmose, Rubéola, Citomegalovírus)",
        type: "exam",
        completed: false
      },
      {
        id: "5-8-3",
        title: "Ultrassonografia inicial",
        description: "Confirmar gravidez intrauterina, número de embriões, batimentos cardíacos",
        type: "exam",
        completed: false
      },
      {
        id: "5-8-4",
        title: "Avaliação odontológica",
        description: "Primeira consulta com dentista",
        type: "consultation",
        completed: false
      }
    ]
  },
  {
    weekRange: "9-13",
    items: [
      {
        id: "9-13-1",
        title: "Ultrassonografia morfológica de 1º trimestre",
        description: "Translucência nucal, osso nasal, ducto venoso",
        type: "exam",
        completed: false
      },
      {
        id: "9-13-2",
        title: "Consulta de rotina",
        description: "Avaliação de peso, pressão arterial e bem-estar geral",
        type: "consultation",
        completed: false
      },
      {
        id: "9-13-3",
        title: "Exame de urina",
        description: "Urocultura para detecção de bacteriúria assintomática",
        type: "exam",
        completed: false
      }
    ]
  },

  // Segundo Trimestre (14-26 semanas)
  {
    weekRange: "14-17",
    items: [
      {
        id: "14-17-1",
        title: "Consulta de rotina",
        description: "Avaliação de peso, pressão arterial e bem-estar geral",
        type: "consultation",
        completed: false
      },
      {
        id: "14-17-2",
        title: "Exame de urina",
        description: "Urocultura para detecção de bacteriúria assintomática",
        type: "exam",
        completed: false
      },
      {
        id: "14-17-3",
        title: "Ultrassonografia",
        description: "Avaliação do crescimento fetal",
        type: "exam",
        completed: false
      }
    ]
  },
  {
    weekRange: "18-22",
    items: [
      {
        id: "18-22-1",
        title: "Ultrassonografia morfológica de 2º trimestre",
        description: "Avaliação anatômica completa do bebê",
        type: "exam",
        completed: false
      },
      {
        id: "18-22-2",
        title: "Medida do colo uterino",
        description: "Ultrassonografia transvaginal se necessário",
        type: "exam",
        completed: false
      },
      {
        id: "18-22-3",
        title: "Consulta de rotina",
        description: "Avaliação de peso, pressão arterial e bem-estar geral",
        type: "consultation",
        completed: false
      }
    ]
  },
  {
    weekRange: "23-26",
    items: [
      {
        id: "23-26-1",
        title: "Teste de Tolerância à Glicose",
        description: "TOTG 75g para rastreamento de diabetes gestacional",
        type: "test",
        completed: false
      },
      {
        id: "23-26-2",
        title: "Repetição de exames",
        description: "Hemograma e sorologias",
        type: "exam",
        completed: false
      },
      {
        id: "23-26-3",
        title: "Consulta de rotina",
        description: "Avaliação de peso, pressão arterial e bem-estar geral",
        type: "consultation",
        completed: false
      }
    ]
  },

  // Terceiro Trimestre (27-40 semanas)
  {
    weekRange: "27-30",
    items: [
      {
        id: "27-30-1",
        title: "Consulta de rotina",
        description: "Avaliação de peso, pressão arterial e bem-estar geral",
        type: "consultation",
        completed: false
      },
      {
        id: "27-30-2",
        title: "Ultrassonografia",
        description: "Avaliação do crescimento fetal",
        type: "exam",
        completed: false
      },
      {
        id: "27-30-3",
        title: "Exame de urina",
        description: "Urocultura para detecção de bacteriúria assintomática",
        type: "exam",
        completed: false
      }
    ]
  },
  {
    weekRange: "31-34",
    items: [
      {
        id: "31-34-1",
        title: "Ultrassonografia do 3º trimestre",
        description: "Crescimento fetal, posição, líquido amniótico",
        type: "exam",
        completed: false
      },
      {
        id: "31-34-2",
        title: "Consulta de rotina",
        description: "Avaliação de peso, pressão arterial e bem-estar geral",
        type: "consultation",
        completed: false
      },
      {
        id: "31-34-3",
        title: "Repetição de exames",
        description: "Hemograma e sorologias",
        type: "exam",
        completed: false
      }
    ]
  },
  {
    weekRange: "35-37",
    items: [
      {
        id: "35-37-1",
        title: "Pesquisa de Streptococcus do Grupo B",
        description: "Coleta entre 35ª e 37ª semana",
        type: "test",
        completed: false
      },
      {
        id: "35-37-2",
        title: "Consulta de rotina",
        description: "Avaliação de peso, pressão arterial e bem-estar geral",
        type: "consultation",
        completed: false
      },
      {
        id: "35-37-3",
        title: "Ultrassonografia",
        description: "Avaliação final do crescimento fetal",
        type: "exam",
        completed: false
      }
    ]
  },
  {
    weekRange: "38-40",
    items: [
      {
        id: "38-40-1",
        title: "Consultas semanais",
        description: "Monitoramento do bem-estar fetal",
        type: "consultation",
        completed: false
      },
      {
        id: "38-40-2",
        title: "Cardiotocografia",
        description: "Se indicado pelo médico",
        type: "monitoring",
        completed: false
      },
      {
        id: "38-40-3",
        title: "Ultrassonografia final",
        description: "Avaliação da posição fetal e líquido amniótico",
        type: "exam",
        completed: false
      }
    ]
  }
];

export function getChecklistForWeek(currentWeek: number): WeekChecklist | null {
  return checklistData.find(checklist => {
    const [start, end] = checklist.weekRange.split("-").map(Number);
    return currentWeek >= start && currentWeek <= end;
  }) || null;
} 