import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { useSession } from '@/contexts/SessionContext';
import { getScopedItem, setScopedItem } from '@/utils/scopedStorage';
import { localDateKey } from '@/utils/gestationDate';
import { AccessibleText as Text } from '../../components/AccessibleText';
import { ACCESSIBLE_COLORS } from '../../theme/accessibility';
import {
  getWaterAmountForDate,
  parseWaterHistory,
  updateWaterEntry,
  WaterEntry,
} from '@/utils/waterTracking';

const WEB_MAX_WIDTH = 430;

const WATER_HISTORY_KEY = '@myFetus:waterHistory';
const WATER_HISTORY_SCOPED_KEY = 'waterHistory';

// Constantes para conversão
const COPO_ML = 200; // 1 copo = 200ml
const GARRAFA_ML = 500; // 1 garrafa = 500ml
const GARRAFAO_ML = 1000; // 1 garrafão = 1L

export default function WaterTrackingScreen() {
  const { width: windowWidth, height } = useWindowDimensions();
  const width = Platform.OS === 'web' ? Math.min(windowWidth, WEB_MAX_WIDTH) : windowWidth;
  const styles = React.useMemo(() => createStyles(width, height), [width, height]);
  const { user } = useSession();

  const [waterAmount, setWaterAmount] = useState(0);
  const [waterHistory, setWaterHistory] = useState<WaterEntry[]>([]);
  const dailyGoal = 2000; // 2 litros por dia

  useEffect(() => {
    let active = true;
    if (!user) return;

    getScopedItem(user.id, WATER_HISTORY_SCOPED_KEY, WATER_HISTORY_KEY)
      .then(history => {
        if (!active) return;
        const parsed = parseWaterHistory(history);
        setWaterHistory(parsed);
        setWaterAmount(getWaterAmountForDate(parsed, localDateKey()));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [user]);

  const saveWaterHistory = async (newHistory: WaterEntry[]) => {
    try {
      if (user) {
        await setScopedItem(user.id, WATER_HISTORY_SCOPED_KEY, JSON.stringify(newHistory));
      }
    } catch {
      // erro tratado na UI; sem log para não expor dados
    }
  };

  const addWater = (amount: number) => {
    const newAmount = waterAmount + amount;
    const newHistory = updateWaterEntry(waterHistory, localDateKey(), newAmount);
    setWaterAmount(newAmount);
    setWaterHistory(newHistory);
    void saveWaterHistory(newHistory);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatWaterAmount = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}L`;
    }
    return `${amount}ml`;
  };

  const getProgressColor = (amount: number) => {
    const percentage = (amount / dailyGoal) * 100;
    if (percentage < 50) return ACCESSIBLE_COLORS.danger;
    if (percentage < 80) return ACCESSIBLE_COLORS.warning;
    return ACCESSIBLE_COLORS.success;
  };

  return (
    <LinearGradient
      colors={['#cce5f6', '#f8cde9']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Controle de Água</Text>
            <Text style={styles.subtitle}>Meta diária: 2L</Text>
          </View>

          <View style={styles.progressContainer}>
            <View
              style={styles.progressBar}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Progresso da meta diária de água"
              accessibilityValue={{ min: 0, max: dailyGoal, now: waterAmount }}
            >
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min((waterAmount / dailyGoal) * 100, 100)}%`,
                    backgroundColor: getProgressColor(waterAmount)
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {formatWaterAmount(waterAmount)} / {formatWaterAmount(dailyGoal)}
            </Text>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={styles.waterButton}
              onPress={() => addWater(COPO_ML)}
              accessibilityRole="button"
              accessibilityLabel={`Adicionar ${COPO_ML} mililitros de água`}
              accessibilityHint="Atualiza o total consumido hoje"
            >
              <FontAwesome name="glass" size={24} color={ACCESSIBLE_COLORS.primary} />
              <Text style={styles.buttonText}>1 Copo</Text>
              <Text style={styles.buttonSubtext}>{COPO_ML}ml</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.waterButton}
              onPress={() => addWater(GARRAFA_ML)}
              accessibilityRole="button"
              accessibilityLabel={`Adicionar ${GARRAFA_ML} mililitros de água`}
              accessibilityHint="Atualiza o total consumido hoje"
            >
              <FontAwesome name="tint" size={24} color={ACCESSIBLE_COLORS.primary} />
              <Text style={styles.buttonText}>1 Garrafa</Text>
              <Text style={styles.buttonSubtext}>{GARRAFA_ML}ml</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.waterButton}
              onPress={() => addWater(GARRAFAO_ML)}
              accessibilityRole="button"
              accessibilityLabel={`Adicionar ${GARRAFAO_ML} mililitros de água`}
              accessibilityHint="Atualiza o total consumido hoje"
            >
              <FontAwesome name="tint" size={24} color={ACCESSIBLE_COLORS.primary} />
              <Text style={styles.buttonText}>1 Garrafão</Text>
              <Text style={styles.buttonSubtext}>{GARRAFAO_ML}ml</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Histórico Diário</Text>
            {waterHistory.length > 0 ? (
              waterHistory.map((entry, index) => (
                <View key={index} style={styles.historyItem}>
                  <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
                  <View style={styles.historyProgress}>
                    <View 
                      style={[
                        styles.historyProgressFill,
                        { 
                          width: `${Math.min((entry.amount / dailyGoal) * 100, 100)}%`,
                          backgroundColor: getProgressColor(entry.amount)
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.historyAmount}>{formatWaterAmount(entry.amount)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noHistoryText}>Nenhum registro encontrado</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const createStyles = (width: number, height: number) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  page: {
    width: '100%',
    maxWidth: width,
    alignSelf: 'center',
  },
  header: {
    paddingTop: height * 0.05,
    paddingBottom: height * 0.02,
    alignItems: 'center',
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    color: ACCESSIBLE_COLORS.primary,
  },
  subtitle: {
    fontSize: width * 0.045,
    color: ACCESSIBLE_COLORS.muted,
    marginTop: 5,
  },
  progressContainer: {
    alignItems: 'center',
    marginVertical: height * 0.02,
  },
  progressBar: {
    width: width * 0.8,
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  progressText: {
    marginTop: 10,
    fontSize: width * 0.04,
    color: ACCESSIBLE_COLORS.muted,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: width * 0.05,
    marginBottom: height * 0.03,
  },
  waterButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    width: width * 0.25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonText: {
    marginTop: 5,
    color: ACCESSIBLE_COLORS.primary,
    fontSize: width * 0.035,
    fontWeight: '500',
  },
  buttonSubtext: {
    fontSize: width * 0.03,
    color: ACCESSIBLE_COLORS.muted,
    marginTop: 2,
  },
  historyContainer: {
    backgroundColor: '#fff',
    margin: width * 0.05,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  historyTitle: {
    fontSize: width * 0.05,
    fontWeight: 'bold',
    color: ACCESSIBLE_COLORS.primary,
    marginBottom: 15,
  },
  historyItem: {
    marginBottom: 15,
  },
  historyDate: {
    fontSize: width * 0.035,
    color: ACCESSIBLE_COLORS.muted,
    marginBottom: 5,
  },
  historyProgress: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 5,
  },
  historyProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  historyAmount: {
    fontSize: width * 0.035,
    color: ACCESSIBLE_COLORS.muted,
    textAlign: 'right',
  },
  noHistoryText: {
    fontSize: width * 0.035,
    color: ACCESSIBLE_COLORS.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
