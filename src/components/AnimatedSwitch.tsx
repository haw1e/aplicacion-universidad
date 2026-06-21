import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

interface AnimatedSwitchProps {
  value: 'tasks' | 'pendings';
  onChange: (val: 'tasks' | 'pendings') => void;
}

const SWITCH_WIDTH = 300;
const PADDING = 4;
const CAPSULE_WIDTH = (SWITCH_WIDTH - PADDING * 2) / 2; // 146px

export default function AnimatedSwitch({ value, onChange }: AnimatedSwitchProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  // Offset shared value: 0 for tasks (left), CAPSULE_WIDTH for pendings (right)
  const translateX = useSharedValue(value === 'tasks' ? 0 : CAPSULE_WIDTH);

  useEffect(() => {
    translateX.value = withTiming(value === 'tasks' ? 0 : CAPSULE_WIDTH, {
      duration: 220,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });
  }, [value, translateX]);

  const capsuleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
      {/* Sliding Capsule */}
      <Animated.View
        style={[
          styles.capsule,
          {
            width: CAPSULE_WIDTH,
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
          capsuleAnimatedStyle,
        ]}
      />

      {/* Button for Tareas */}
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => onChange('tasks')}
      >
        <Text
          style={[
            styles.label,
            {
              color: value === 'tasks' ? '#FFFFFF' : colors.textSecondary,
              fontWeight: value === 'tasks' ? '700' : '500',
            },
          ]}
        >
          Tareas
        </Text>
      </TouchableOpacity>

      {/* Button for Pendientes */}
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => onChange('pendings')}
      >
        <Text
          style={[
            styles.label,
            {
              color: value === 'pendings' ? '#FFFFFF' : colors.textSecondary,
              fontWeight: value === 'pendings' ? '700' : '500',
            },
          ]}
        >
          Pendientes
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SWITCH_WIDTH,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    position: 'relative',
    borderWidth: 1,
    alignSelf: 'center',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  capsule: {
    height: 44,
    borderRadius: 22,
    position: 'absolute',
    left: PADDING,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  button: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  label: {
    fontSize: 15,
  },
});
