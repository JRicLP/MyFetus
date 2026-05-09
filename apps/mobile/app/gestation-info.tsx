import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { calculateGestationWeek } from '../utils/gestationUtils';

const { width, height } = Dimensions.get('window');

// Mapeamento das imagens das semanas
const fetusImages: { [key: string]: any } = {
  '04': require('../assets/images/Fetus_weeks_img/04-fetaldev-E-deeptan_4x3.jpg'),
  '05': require('../assets/images/Fetus_weeks_img/05-fetaldev-E-deeptan_4x3.jpg'),
  '06': require('../assets/images/Fetus_weeks_img/06-fetaldev-E-deeptan_4x3.jpg'),
  '07': require('../assets/images/Fetus_weeks_img/07-fetaldev-E-deeptan_4x3.jpg'),
  '08': require('../assets/images/Fetus_weeks_img/08-fetaldev-E-deeptan_4x3.jpg'),
  '09': require('../assets/images/Fetus_weeks_img/09-fetaldev-E-deeptan_4x3.jpg'),
  '10': require('../assets/images/Fetus_weeks_img/10-fetaldev-E-deeptan_4x3.jpg'),
  '11': require('../assets/images/Fetus_weeks_img/11-fetaldev-E-deeptan_4x3.jpg'),
  '12': require('../assets/images/Fetus_weeks_img/12-fetaldev-E-deeptan_4x3.jpg'),
  '13': require('../assets/images/Fetus_weeks_img/13-fetaldev-E-deeptan_4x3.jpg'),
  '14': require('../assets/images/Fetus_weeks_img/14-fetaldev-E-deeptan_4x3.jpg'),
  '15': require('../assets/images/Fetus_weeks_img/15-fetaldev-E-deeptan_4x3.jpg'),
  '16': require('../assets/images/Fetus_weeks_img/16-fetaldev-E-deeptan_4x3.jpg'),
  '17': require('../assets/images/Fetus_weeks_img/17-fetaldev-E-deeptan_4x3.jpg'),
  '18': require('../assets/images/Fetus_weeks_img/18-fetaldev-E-deeptan_4x3.jpg'),
  '19': require('../assets/images/Fetus_weeks_img/19-fetaldev-E-deeptan_4x3.jpg'),
  '20': require('../assets/images/Fetus_weeks_img/20-fetaldev-E-deeptan_4x3.jpg'),
  '21': require('../assets/images/Fetus_weeks_img/21-fetaldev-E-deeptan_4x3.jpg'),
  '22': require('../assets/images/Fetus_weeks_img/22-fetaldev-E-deeptan_4x3.jpg'),
  '23': require('../assets/images/Fetus_weeks_img/23-fetaldev-E-deeptan_4x3.jpg'),
  '24': require('../assets/images/Fetus_weeks_img/24-fetaldev-E-deeptan_4x3.jpg'),
  '25': require('../assets/images/Fetus_weeks_img/25-fetaldev-E-deeptan_4x3.jpg'),
  '26': require('../assets/images/Fetus_weeks_img/26-fetaldev-E-deeptan_4x3.jpg'),
  '27': require('../assets/images/Fetus_weeks_img/27-fetaldev-E-deeptan_4x3.jpg'),
  '28': require('../assets/images/Fetus_weeks_img/28-fetaldev-E-deeptan_4x3.jpg'),
  '29': require('../assets/images/Fetus_weeks_img/29-fetaldev-E-deeptan_4x3.jpg'),
  '30': require('../assets/images/Fetus_weeks_img/30-fetaldev-E-deeptan_4x3.jpg'),
  '31': require('../assets/images/Fetus_weeks_img/31-fetaldev-E-deeptan_4x3.jpg'),
  '32': require('../assets/images/Fetus_weeks_img/32-fetaldev-E-deeptan_4x3.jpg'),
  '33': require('../assets/images/Fetus_weeks_img/33-fetaldev-E-deeptan_4x3.jpg'),
  '34': require('../assets/images/Fetus_weeks_img/34-fetaldev-E-deeptan_4x3.jpg'),
  '35': require('../assets/images/Fetus_weeks_img/35-fetaldev-E-deeptan_4x3.jpg'),
  '36': require('../assets/images/Fetus_weeks_img/36-fetaldev-E-deeptan_4x3.jpg'),
  '37': require('../assets/images/Fetus_weeks_img/37-fetaldev-E-deeptan_4x3.jpg'),
  '38': require('../assets/images/Fetus_weeks_img/38-fetaldev-E-deeptan_4x3.jpg'),
  '39': require('../assets/images/Fetus_weeks_img/39-fetaldev-E-deeptan_4x3.jpg'),
  '40': require('../assets/images/Fetus_weeks_img/40-fetaldev-E-deeptan_4x3.jpg'),
  '41': require('../assets/images/Fetus_weeks_img/41-fetaldev-E-deeptan_4x3.jpg'),
};

const getFetusImage = (week: number) => {
  const formattedWeek = week.toString().padStart(2, '0');
  return fetusImages[formattedWeek] || require('../assets/images/fetus-heart.png');
};

export default function GestationInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [gestationWeeks, setGestationWeeks] = useState(0);
  
  // Animações para as ondas
  const wave1Anim = useRef(new Animated.Value(0)).current;
  const wave2Anim = useRef(new Animated.Value(0)).current;
  const wave3Anim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (params.lastMenstruation) {
      console.log('Gestation Info - Data última menstruação:', params.lastMenstruation);
      const result = calculateGestationWeek(params.lastMenstruation as string);
      console.log('Gestation Info - Semana calculada:', result.weeks);
      setGestationWeeks(result.weeks);
    }
  }, [params.lastMenstruation]);

  useEffect(() => {
    const startWaveAnimation = () => {
      const createAnimation = (value: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(value, {
              toValue: 1,
              duration: 4000,
              easing: Easing.bezier(0.4, 0, 0.2, 1),
              useNativeDriver: true,
            }),
            Animated.timing(value, {
              toValue: 0,
              duration: 4000,
              easing: Easing.bezier(0.4, 0, 0.2, 1),
              useNativeDriver: true,
            }),
          ])
        );
      };

      // Animação de rotação contínua mais suave
      Animated.loop(
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 15000,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        })
      ).start();

      Animated.parallel([
        createAnimation(wave1Anim, 0),
        createAnimation(wave2Anim, 1300),
        createAnimation(wave3Anim, 2600),
      ]).start();
    };

    startWaveAnimation();
  }, []);

  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const wave1Style = {
    transform: [
      {
        scale: wave1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.3],
        }),
      },
      { rotate: rotation },
    ],
    opacity: wave1Anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 0.6, 0.3],
    }),
  };

  const wave2Style = {
    transform: [
      {
        scale: wave2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.3],
        }),
      },
      { rotate: rotation },
    ],
    opacity: wave2Anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 0.6, 0.3],
    }),
  };

  const wave3Style = {
    transform: [
      {
        scale: wave3Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.3],
        }),
      },
      { rotate: rotation },
    ],
    opacity: wave3Anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 0.6, 0.3],
    }),
  };

  const createOrganicPath = (size: number) => {
    const center = size / 2;
    const radius = size * 0.4;
    const points = 8;
    let path = '';

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const nextAngle = ((i + 1) / points) * Math.PI * 2;
      
      const x1 = center + radius * Math.cos(angle);
      const y1 = center + radius * Math.sin(angle);
      const x2 = center + radius * Math.cos(nextAngle);
      const y2 = center + radius * Math.sin(nextAngle);
      
      const controlX1 = center + (radius * 1.2) * Math.cos(angle + Math.PI / points);
      const controlY1 = center + (radius * 1.2) * Math.sin(angle + Math.PI / points);
      const controlX2 = center + (radius * 1.2) * Math.cos(nextAngle - Math.PI / points);
      const controlY2 = center + (radius * 1.2) * Math.sin(nextAngle - Math.PI / points);

      if (i === 0) {
        path += `M ${x1} ${y1} `;
      }
      path += `C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${x2} ${y2} `;
    }

    return path;
  };

  return (
    <LinearGradient
      colors={['#cce5f6', '#f8cde9']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          Parabéns!
        </Text>

        <Text style={styles.weeksText}>
          Você está na {gestationWeeks}ª semana de gestação
        </Text>

        <View style={styles.imageContainer}>
          <Animated.View style={[styles.wave, wave1Style]}>
            <Svg width={width * 0.8} height={width * 0.8}>
              <Path
                d={createOrganicPath(width * 0.8)}
                stroke="rgba(255, 255, 255, 0.5)"
                strokeWidth="3"
                fill="none"
              />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.wave, wave2Style]}>
            <Svg width={width * 0.8} height={width * 0.8}>
              <Path
                d={createOrganicPath(width * 0.8)}
                stroke="rgba(255, 255, 255, 0.5)"
                strokeWidth="3"
                fill="none"
              />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.wave, wave3Style]}>
            <Svg width={width * 0.8} height={width * 0.8}>
              <Path
                d={createOrganicPath(width * 0.8)}
                stroke="rgba(255, 255, 255, 0.5)"
                strokeWidth="3"
                fill="none"
              />
            </Svg>
          </Animated.View>
          <Image
            source={getFetusImage(gestationWeeks)}
            style={styles.fetusImage}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.description}>
          Seu bebê está se desenvolvendo a cada dia!
        </Text>

        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>
            Continuar
          </Text>
        </TouchableOpacity>
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
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: '#20B2AA',
    textAlign: 'center',
    marginBottom: height * 0.02,
  },
  weeksText: {
    fontSize: width * 0.06,
    color: '#666',
    textAlign: 'center',
    marginBottom: height * 0.04,
    fontWeight: '500',
  },
  imageContainer: {
    width: width * 0.7,
    height: width * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: height * 0.04,
    position: 'relative',
    
  },
  wave: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    marginTop: -height * 0.02,
  },
  fetusImage: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: '#fff',
    zIndex: 1,
    overflow: 'hidden',
    transform: [{ scale: 1.1 }],
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -(width * 0.3),
    marginTop: -(width * 0.3),
  },
  description: {
    fontSize: width * 0.045,
    color: '#666',
    textAlign: 'center',
    marginBottom: height * 0.04,
  },
  continueButton: {
    backgroundColor: '#20B2AA',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    width: '80%',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '500',
  },
}); 