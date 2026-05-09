import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WaterTrackingScreen() {
  const [waterCount, setWaterCount] = useState(0);
  const dailyGoal = 8; // 8 copos de água por dia

  const addWater = () => {
    if (waterCount < dailyGoal) {
      setWaterCount(waterCount + 1);
    }
  };

  const removeWater = () => {
    if (waterCount > 0) {
      setWaterCount(waterCount - 1);
    }
  };

  return (
    <LinearGradient
      colors={['#cce5f6', '#f8cde9']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Controle de Água</Text>
        
        <View style={styles.waterContainer}>
          <Text style={styles.waterCount}>{waterCount}</Text>
          <Text style={styles.waterLabel}>copos de água</Text>
          <Text style={styles.goalText}>Meta diária: {dailyGoal} copos</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.removeButton]}
            onPress={removeWater}
            disabled={waterCount === 0}
          >
            <FontAwesome name="minus" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.addButton]}
            onPress={addWater}
            disabled={waterCount === dailyGoal}
          >
            <FontAwesome name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progress,
                { width: `${(waterCount / dailyGoal) * 100}%` },
              ]}
            />
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    color: '#20B2AA',
    marginTop: height * 0.05,
    marginBottom: height * 0.05,
  },
  waterContainer: {
    alignItems: 'center',
    marginBottom: height * 0.05,
  },
  waterCount: {
    fontSize: width * 0.2,
    fontWeight: 'bold',
    color: '#20B2AA',
  },
  waterLabel: {
    fontSize: width * 0.05,
    color: '#666',
    marginTop: 10,
  },
  goalText: {
    fontSize: width * 0.04,
    color: '#666',
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: height * 0.05,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  addButton: {
    backgroundColor: '#20B2AA',
  },
  removeButton: {
    backgroundColor: '#f9a9a7',
  },
  progressContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  progressBar: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#20B2AA',
    borderRadius: 10,
  },
}); 