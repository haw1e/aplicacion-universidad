import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, PanResponder } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MESSAGES: Record<string, string[]> = {
  poro: [
    '¡Amo las Porogalletas! 🍪',
    '¡Huele a Porogalleta por aquí! 👃',
    '¡Qué suaves son mis bigotes! 🌸',
    '¿Me das una Porogalleta? 😋',
    '¡Vamos a ganar esta partida! 🏆',
    '¡Saltando en el Abismo de los Lamentos! ❄️',
    '¡Te acompaño en tus apuntes! 📚',
  ],
  kirby: [
    '¡Poyo! 🌸',
    '¡Tengo mucha hambre! 🍎',
    '¡Vamos a flotar! 🎈',
    '¡Habilidades de copia activas! ✨',
    '¡Qué lindo día en Dream Land! 🌈',
    '¡Eres súper especial! 💖',
    '¡A estudiar con alegría! 📚',
  ],
  junimo: [
    '¡Gibu! 🌿',
    'Los espíritus del bosque te cuidan. 🌲',
    '¿Trajiste fruta para mí? 🍇',
    'Me gusta ayudar en el centro cívico. 🏡',
    '¡Qué bonito día para cosechar apuntes! 🌱',
  ],
  kyubey: [
    '¿Quieres hacer un contrato conmigo? 🌟',
    '¡Conviértete en una chica mágica! 🪄',
    'No entiendo las emociones humanas. 👁️',
    'Tu potencial es ilimitado. ✨',
    'Estudiar aumentará tu nivel de energía. ⚡',
  ],
  morpekob: [
    '¡Tengo espacio para más comida! 🐹',
    '¡Qué rico está este snack! 🍪',
    '¡Siento mucha energía positiva! ⚡',
    '¡A estudiar con una sonrisa! 😊',
  ],
  morpekom: [
    '¡TENGO HAMBRE! 💢',
    '¡No me molestes si no hay comida! 😡',
    '¡Rueda Aural oscuro! ⚡',
    '¡Gruuuur...! 🍖',
  ],
  napstablook: [
    'oh... de verdad no quería molestarte... 👻',
    'suelo venir aquí a tumbarme en el suelo y sentirme como basura... 🎶',
    'hago música en mi computadora... si quieres escuchar...',
    'oh, perdón... ¿estoy estorbando? 💧',
    'creo que me iré flotando despacio... 🌫️',
  ],
};

const PETS: Record<string, { type: 'emoji' | 'image'; value: any }> = {
  poro: { type: 'image', value: require('../../assets/images/poro.jpg') },
  kirby: { type: 'image', value: require('../../assets/images/kirby.png') },
  junimo: { type: 'image', value: require('../../assets/images/junimo.png') },
  kyubey: { type: 'image', value: require('../../assets/images/kyubey.webp') },
  morpekob: { type: 'image', value: require('../../assets/images/Morpekob.webp') },
  morpekom: { type: 'image', value: require('../../assets/images/morpekom.png') },
  napstablook: { type: 'image', value: require('../../assets/images/Napstablook.webp') },
};

export default function CompanionPet() {
  const { companionPet, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const companionPetRef = useRef(companionPet);
  companionPetRef.current = companionPet;

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const dimensionsRef = React.useRef({ width: screenWidth, height: screenHeight });

  React.useEffect(() => {
    dimensionsRef.current = { width: screenWidth, height: screenHeight };
  }, [screenWidth, screenHeight]);

  // Shared Animation Values
  const xPos = useSharedValue(screenWidth - 80);
  const yPos = useSharedValue(0); // Vertical drag displacement
  const jumpY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const bubbleOpacity = useSharedValue(0);
  const bubbleScale = useSharedValue(0);
  
  // Heart/star effects shared values
  const effectY1 = useSharedValue(0);
  const effectOpacity1 = useSharedValue(0);
  const effectY2 = useSharedValue(0);
  const effectOpacity2 = useSharedValue(0);

  // States & Refs
  const [bubbleText, setBubbleText] = useState('');
  const walkTimer = useRef<any>(null);
  
  // Starting positions for PanResponder dragging
  const startX = useRef(0);
  const startY = useRef(0);

  // Start breathing / floating animation
  const bobY = useSharedValue(0);
  useEffect(() => {
    if (companionPet === 'none' || !PETS[companionPet]) {
      return;
    }

    // Subtle bobbing up and down to look "alive"
    bobY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // infinite
      true // reverse
    );

    // Initial positioning
    xPos.value = screenWidth - 80;
    yPos.value = 0;

    // Periodic behavior loop (every 14 seconds: walk to random X)
    const runBehavior = () => {
      // Don't walk if the user has dragged it away from the bottom line
      if (Math.abs(yPos.value) > 15) return;

      const isWalk = Math.random() > 0.3;
      if (isWalk) {
        const targetX = Math.max(30, Math.random() * (screenWidth - 90));
        const distance = Math.abs(targetX - xPos.value);
        const duration = Math.max(2000, distance * 8);

        // Determine face direction
        if (targetX < xPos.value) {
          scaleX.value = 1; // Left
        } else {
          scaleX.value = -1; // Right (flip)
        }

        // Animate walk
        xPos.value = withTiming(targetX, {
          duration,
          easing: Easing.inOut(Easing.ease),
        });

        // Wiggle rotation during walk
        rotation.value = withRepeat(
          withSequence(
            withTiming(-8, { duration: 250 }),
            withTiming(8, { duration: 250 })
          ),
          Math.ceil(duration / 500),
          true,
          () => {
            rotation.value = withTiming(0);
          }
        );
      } else {
        triggerBubble();
      }
    };

    const intervalId = setInterval(runBehavior, 14000);

    return () => {
      clearInterval(intervalId);
      if (walkTimer.current) clearTimeout(walkTimer.current);
      cancelAnimation(bobY);
      cancelAnimation(xPos);
      cancelAnimation(rotation);
    };
  }, [companionPet, screenWidth]);

  // Trigger speech bubble
  const triggerBubble = () => {
    const list = MESSAGES[companionPetRef.current] || ['¡Poyo! 🌸'];
    const randomMsg = list[Math.floor(Math.random() * list.length)];
    setBubbleText(randomMsg);

    // Fade in
    bubbleOpacity.value = withTiming(1, { duration: 300 });
    bubbleScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.5)) });

    // Fade out after 4 seconds
    if (walkTimer.current) clearTimeout(walkTimer.current);
    walkTimer.current = setTimeout(() => {
      bubbleOpacity.value = withTiming(0, { duration: 300 });
      bubbleScale.value = withTiming(0, { duration: 300 });
    }, 4000);
  };

  // Tap handler (jumps and emits heart/stars)
  const handleTap = () => {
    jumpY.value = withSequence(
      withTiming(-35, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) })
    );

    triggerBubble();

    // Heart burst effect 1
    effectY1.value = 0;
    effectOpacity1.value = 1;
    effectY1.value = withTiming(-60, { duration: 1000, easing: Easing.out(Easing.quad) });
    effectOpacity1.value = withTiming(0, { duration: 1000 });

    // Star burst effect 2
    effectY2.value = 0;
    effectOpacity2.value = 1;
    effectY2.value = withTiming(-55, { duration: 800, easing: Easing.out(Easing.quad) });
    effectOpacity2.value = withTiming(0, { duration: 800 });
  };

  // PanResponder to enable dragging the pet around
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Stop walk and bobbing animations during drag
        cancelAnimation(xPos);
        cancelAnimation(bobY);
        startX.current = xPos.value;
        startY.current = yPos.value;
      },
      onPanResponderMove: (_, gestureState) => {
        const nextX = startX.current + gestureState.dx;
        const nextY = startY.current + gestureState.dy;
        const currentWidth = dimensionsRef.current.width;
        const currentHeight = dimensionsRef.current.height;

        // Boundary constraints to keep the pet visible on the screen
        xPos.value = Math.max(10, Math.min(currentWidth - 60, nextX));
        yPos.value = Math.max(-currentHeight + 160, Math.min(50, nextY));
      },
      onPanResponderRelease: (_, gestureState) => {
        // Resume bobbing animation
        bobY.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );

        // Differentiate tap from drag
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          handleTap();
        }
      },
    })
  ).current;

  // Reanimated styles
  const animatedPetStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: xPos.value },
        { translateY: bobY.value + jumpY.value + yPos.value },
        { rotate: `${rotation.value}deg` },
        { scaleX: scaleX.value },
      ],
    };
  });

  const animatedBubbleStyle = useAnimatedStyle(() => {
    return {
      opacity: bubbleOpacity.value,
      transform: [
        { translateX: xPos.value - 55 },
        { translateY: yPos.value },
        { scale: bubbleScale.value },
      ],
    };
  });

  const animatedEffect1 = useAnimatedStyle(() => {
    return {
      opacity: effectOpacity1.value,
      transform: [
        { translateX: xPos.value - 15 },
        { translateY: effectY1.value - 15 + yPos.value },
      ],
    };
  });

  const animatedEffect2 = useAnimatedStyle(() => {
    return {
      opacity: effectOpacity2.value,
      transform: [
        { translateX: xPos.value + 25 },
        { translateY: effectY2.value - 15 + yPos.value },
      ],
    };
  });
  if (companionPet === 'none' || !PETS[companionPet]) {
    return null;
  }

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      
      {/* Speech Bubble */}
      <Animated.View style={[
        styles.bubbleCard, 
        { bottom: 120 + insets.bottom },
        animatedBubbleStyle, 
        { backgroundColor: colors.backgroundCard, borderColor: colors.primary }
      ]}>
        <Text style={[styles.bubbleText, { color: colors.text }]}>{bubbleText}</Text>
        <View style={[styles.bubbleArrow, { borderTopColor: colors.primary }]} />
      </Animated.View>

      {/* Burst Effect 1 */}
      <Animated.Text style={[styles.effectText, { bottom: 85 + insets.bottom }, animatedEffect1]}>💖</Animated.Text>

      {/* Burst Effect 2 */}
      <Animated.Text style={[styles.effectText, { bottom: 85 + insets.bottom }, animatedEffect2]}>✨</Animated.Text>

      {/* The Animated Pet (Draggable Wrapper) */}
      <Animated.View 
        {...panResponder.panHandlers}
        style={[styles.petWrapper, { bottom: 65 + insets.bottom }, animatedPetStyle]}
      >
        <View style={styles.petTouch}>
          <Animated.Image
            source={PETS[companionPet].value}
            style={styles.petImage}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999, // Float above everything
  },
  petWrapper: {
    position: 'absolute',
    left: 0,
    bottom: 90, // Sit right above bottom tabs
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer', // Web pointer hint
  },
  petTouch: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petImage: {
    width: 48,
    height: 48,
  },
  bubbleCard: {
    position: 'absolute',
    left: 0,
    bottom: 145, // Hover above pet
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    maxWidth: 160,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 14,
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderLeftColor: 'transparent',
    borderRightWidth: 6,
    borderRightColor: 'transparent',
    borderTopWidth: 8,
  },
  effectText: {
    position: 'absolute',
    left: 0,
    bottom: 110,
    fontSize: 18,
  },
});
