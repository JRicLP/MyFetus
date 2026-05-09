import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const WATER_HISTORY_KEY = '@myFetus:waterHistory';

type WaterEntry = {
  date: string;
  amount: number;
};

// Constantes para conversão
const COPO_ML = 200; // 1 copo = 200ml
const GARRAFA_ML = 500; // 1 garrafa = 500ml
const GARRAFAO_ML = 1000; // 1 garrafão = 1L

export default function WaterTrackingScreen() {
  const [waterAmount, setWaterAmount] = useState(0);
  const [waterHistory, setWaterHistory] = useState<WaterEntry[]>([]);
  const dailyGoal = 2000; // 2 litros por dia

  useEffect(() => {
    loadWaterHistory();
  }, []);

  const loadWaterHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(WATER_HISTORY_KEY);
      if (history) {
        setWaterHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de água:', error);
    }
  };

  const saveWaterHistory = async (newHistory: WaterEntry[]) => {
    try {
      await AsyncStorage.setItem(WATER_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Erro ao salvar histórico de água:', error);
    }
  };

  const addWater = (amount: number) => {
    const newAmount = waterAmount + amount;
    setWaterAmount(newAmount);

    const today = new Date().toISOString().split('T')[0];
    const existingEntry = waterHistory.find(entry => entry.date === today);

    let newHistory;
    if (existingEntry) {
      newHistory = waterHistory.map(entry =>
        entry.date === today ? { ...entry, amount: newAmount } : entry
      );
    } else {
      newHistory = [...waterHistory, { date: today, amount: newAmount }];
    }

    setWaterHistory(newHistory);
    saveWaterHistory(newHistory);
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
    if (percentage < 50) return '#FF6B6B';
    if (percentage < 80) return '#FFD93D';
    return '#4CAF50';
  };

  return (
    <LinearGradient
      colors={['#cce5f6', '#f8cde9']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Controle de Água</Text>
          <Text style={styles.subtitle}>Meta diária: 2L</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
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
          >
            <FontAwesome name="glass" size={24} color="#20B2AA" />
            <Text style={styles.buttonText}>1 Copo</Text>
            <Text style={styles.buttonSubtext}>{COPO_ML}ml</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.waterButton}
            onPress={() => addWater(GARRAFA_ML)}
          >
            <FontAwesome name="tint" size={24} color="#20B2AA" />
            <Text style={styles.buttonText}>1 Garrafa</Text>
            <Text style={styles.buttonSubtext}>{GARRAFA_ML}ml</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.waterButton}
            onPress={() => addWater(GARRAFAO_ML)}
          >
            <FontAwesome name="tint" size={24} color="#20B2AA" />
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
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: height * 0.05,
    paddingBottom: height * 0.02,
    alignItems: 'center',
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    color: '#20B2AA',
  },
  subtitle: {
    fontSize: width * 0.045,
    color: '#666',
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
    color: '#666',
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
    color: '#20B2AA',
    fontSize: width * 0.035,
    fontWeight: '500',
  },
  buttonSubtext: {
    fontSize: width * 0.03,
    color: '#666',
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
    color: '#20B2AA',
    marginBottom: 15,
  },
  historyItem: {
    marginBottom: 15,
  },
  historyDate: {
    fontSize: width * 0.035,
    color: '#666',
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
    color: '#666',
    textAlign: 'right',
  },
  noHistoryText: {
    fontSize: width * 0.035,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 