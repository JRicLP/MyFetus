import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { calculateGestationWeek } from '../utils/gestationUtils';
import { FetusWeekImage } from '../components/FetusWeekImage';
import { AccessibleText as Text } from '../components/AccessibleText';
import { ACCESSIBLE_COLORS } from '../theme/accessibility';

const WEB_MAX_WIDTH = 430;

export default function GestationInfoScreen() {
  const { width: windowWidth, height } = useWindowDimensions();
  const width = Platform.OS === 'web' ? Math.min(windowWidth, WEB_MAX_WIDTH) : windowWidth;
  const styles = React.useMemo(() => createStyles(width, height), [width, height]);

  const router = useRouter();
  const params = useLocalSearchParams();
  const gestationWeeks = params.lastMenstruation
    ? calculateGestationWeek(params.lastMenstruation as string).weeks
    : 0;
  
  // Animações para as ondas
  const [wave1Anim] = useState(() => new Animated.Value(0));
  const [wave2Anim] = useState(() => new Animated.Value(0));
  const [wave3Anim] = useState(() => new Animated.Value(0));
  const [rotationAnim] = useState(() => new Animated.Value(0));

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
  }, [rotationAnim, wave1Anim, wave2Anim, wave3Anim]);

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
          <FetusWeekImage
            week={gestationWeeks}
            style={styles.fetusImage}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.description}>
          Seu bebê está se desenvolvendo a cada dia!
        </Text>

        <TouchableOpacity 
          testID="e2e-gestation-continue"
          style={styles.continueButton}
          onPress={handleContinue}
          accessibilityLabel="Continuar para o início"
          accessibilityRole="button"
        >
          <Text style={styles.continueButtonText}>
            Continuar
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const createStyles = (width: number, height: number) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    width: '100%',
    maxWidth: width,
    alignSelf: 'center',
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: ACCESSIBLE_COLORS.primary,
    textAlign: 'center',
    marginBottom: height * 0.02,
  },
  weeksText: {
    fontSize: width * 0.06,
    color: ACCESSIBLE_COLORS.muted,
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
    color: ACCESSIBLE_COLORS.muted,
    textAlign: 'center',
    marginBottom: height * 0.04,
  },
  continueButton: {
    backgroundColor: ACCESSIBLE_COLORS.primary,
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
