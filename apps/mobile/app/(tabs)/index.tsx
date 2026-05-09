import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { getLastPeriod, calculateGestationWeek, getBabySize, getBabyDescription, calculateDPP } from '../../utils/gestationUtils';

const { width, height } = Dimensions.get('window');

// Mapeamento das imagens das semanas
const fetusImages: { [key: string]: any } = {
  '04': require('../../assets/images/Fetus_weeks_img/04-fetaldev-E-deeptan_4x3.jpg'),
  '05': require('../../assets/images/Fetus_weeks_img/05-fetaldev-E-deeptan_4x3.jpg'),
  '06': require('../../assets/images/Fetus_weeks_img/06-fetaldev-E-deeptan_4x3.jpg'),
  '07': require('../../assets/images/Fetus_weeks_img/07-fetaldev-E-deeptan_4x3.jpg'),
  '08': require('../../assets/images/Fetus_weeks_img/08-fetaldev-E-deeptan_4x3.jpg'),
  '09': require('../../assets/images/Fetus_weeks_img/09-fetaldev-E-deeptan_4x3.jpg'),
  '10': require('../../assets/images/Fetus_weeks_img/10-fetaldev-E-deeptan_4x3.jpg'),
  '11': require('../../assets/images/Fetus_weeks_img/11-fetaldev-E-deeptan_4x3.jpg'),
  '12': require('../../assets/images/Fetus_weeks_img/12-fetaldev-E-deeptan_4x3.jpg'),
  '13': require('../../assets/images/Fetus_weeks_img/13-fetaldev-E-deeptan_4x3.jpg'),
  '14': require('../../assets/images/Fetus_weeks_img/14-fetaldev-E-deeptan_4x3.jpg'),
  '15': require('../../assets/images/Fetus_weeks_img/15-fetaldev-E-deeptan_4x3.jpg'),
  '16': require('../../assets/images/Fetus_weeks_img/16-fetaldev-E-deeptan_4x3.jpg'),
  '17': require('../../assets/images/Fetus_weeks_img/17-fetaldev-E-deeptan_4x3.jpg'),
  '18': require('../../assets/images/Fetus_weeks_img/18-fetaldev-E-deeptan_4x3.jpg'),
  '19': require('../../assets/images/Fetus_weeks_img/19-fetaldev-E-deeptan_4x3.jpg'),
  '20': require('../../assets/images/Fetus_weeks_img/20-fetaldev-E-deeptan_4x3.jpg'),
  '21': require('../../assets/images/Fetus_weeks_img/21-fetaldev-E-deeptan_4x3.jpg'),
  '22': require('../../assets/images/Fetus_weeks_img/22-fetaldev-E-deeptan_4x3.jpg'),
  '23': require('../../assets/images/Fetus_weeks_img/23-fetaldev-E-deeptan_4x3.jpg'),
  '24': require('../../assets/images/Fetus_weeks_img/24-fetaldev-E-deeptan_4x3.jpg'),
  '25': require('../../assets/images/Fetus_weeks_img/25-fetaldev-E-deeptan_4x3.jpg'),
  '26': require('../../assets/images/Fetus_weeks_img/26-fetaldev-E-deeptan_4x3.jpg'),
  '27': require('../../assets/images/Fetus_weeks_img/27-fetaldev-E-deeptan_4x3.jpg'),
  '28': require('../../assets/images/Fetus_weeks_img/28-fetaldev-E-deeptan_4x3.jpg'),
  '29': require('../../assets/images/Fetus_weeks_img/29-fetaldev-E-deeptan_4x3.jpg'),
  '30': require('../../assets/images/Fetus_weeks_img/30-fetaldev-E-deeptan_4x3.jpg'),
  '31': require('../../assets/images/Fetus_weeks_img/31-fetaldev-E-deeptan_4x3.jpg'),
  '32': require('../../assets/images/Fetus_weeks_img/32-fetaldev-E-deeptan_4x3.jpg'),
  '33': require('../../assets/images/Fetus_weeks_img/33-fetaldev-E-deeptan_4x3.jpg'),
  '34': require('../../assets/images/Fetus_weeks_img/34-fetaldev-E-deeptan_4x3.jpg'),
  '35': require('../../assets/images/Fetus_weeks_img/35-fetaldev-E-deeptan_4x3.jpg'),
  '36': require('../../assets/images/Fetus_weeks_img/36-fetaldev-E-deeptan_4x3.jpg'),
  '37': require('../../assets/images/Fetus_weeks_img/37-fetaldev-E-deeptan_4x3.jpg'),
  '38': require('../../assets/images/Fetus_weeks_img/38-fetaldev-E-deeptan_4x3.jpg'),
  '39': require('../../assets/images/Fetus_weeks_img/39-fetaldev-E-deeptan_4x3.jpg'),
  '40': require('../../assets/images/Fetus_weeks_img/40-fetaldev-E-deeptan_4x3.jpg'),
  '41': require('../../assets/images/Fetus_weeks_img/41-fetaldev-E-deeptan_4x3.jpg'),
};

const getFetusImage = (week: number) => {
  const formattedWeek = week.toString().padStart(2, '0');
  return fetusImages[formattedWeek];
};

export default function HomeScreen() {
  const [gestationWeek, setGestationWeek] = useState(0);
  const [babySize, setBabySize] = useState('');
  const [babyDescription, setBabyDescription] = useState('');
  const [dpp, setDPP] = useState('');

  useEffect(() => {
    const loadGestationData = async () => {
      const lastPeriod = await getLastPeriod();
      if (lastPeriod) {
        console.log('Index - Data última menstruação:', lastPeriod);
        const result = calculateGestationWeek(lastPeriod);
        console.log('Index - Semana calculada:', result.weeks);
        setGestationWeek(result.weeks);
        setBabySize(getBabySize(result.weeks));
        setBabyDescription(getBabyDescription(result.weeks));
        setDPP(calculateDPP(lastPeriod));
      }
    };

    loadGestationData();
  }, []);

  return (
    <LinearGradient
      colors={['#cce5f6', '#f8cde9']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Meu Bebê</Text>
          <Text style={styles.subtitle}>Semana {gestationWeek}</Text>
        </View>

        <View style={styles.imageContainer}>
          <View style={styles.imageWrapper}>
            <Image
              source={getFetusImage(gestationWeek)}
              style={styles.fetusImage}
              resizeMode="cover"
            />
          </View>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoCard}>
            <FontAwesome name="calendar" size={24} color="#20B2AA" />
            <Text style={styles.infoTitle}>Data Prevista do Parto</Text>
            <Text style={styles.infoValue}>{dpp}</Text>
          </View>

          <View style={styles.infoCard}>
            <FontAwesome name="arrows-alt" size={24} color="#20B2AA" />
            <Text style={styles.infoTitle}>Tamanho do Bebê</Text>
            <Text style={styles.infoValue}>{babySize}</Text>
          </View>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>Desenvolvimento</Text>
          <Text style={styles.descriptionText}>{babyDescription}</Text>
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
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: width * 0.05,
    marginBottom: height * 0.03,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    width: width * 0.4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  infoTitle: {
    fontSize: width * 0.035,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: width * 0.04,
    color: '#20B2AA',
    fontWeight: 'bold',
    marginTop: 5,
    textAlign: 'center',
  },
  descriptionContainer: {
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
  descriptionTitle: {
    fontSize: width * 0.05,
    fontWeight: 'bold',
    color: '#20B2AA',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: width * 0.035,
    color: '#666',
    lineHeight: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: height * 0.03,
    paddingHorizontal: width * 0.05,
  },
  imageWrapper: {
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
  },
  fetusImage: {
    width: '100%',
    height: '100%',
  },
});
