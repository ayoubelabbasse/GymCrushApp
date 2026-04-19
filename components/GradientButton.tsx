import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { F, lineHeightFor } from '../constants/theme'

interface Props {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  small?: boolean
}

export default function GradientButton({
  label, onPress, loading, disabled, small,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.wrapper, (disabled || loading) && styles.disabled]}
    >
      <LinearGradient
        colors={['#FF5722', '#FF3D6B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.button, small && styles.small]}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={[styles.label, small && styles.labelSmall]}>{label}</Text>
        }
      </LinearGradient>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  disabled: { opacity: 0.4 },
  button: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 24,
  },
  small: { height: 44 },
  label: { color: '#fff', fontSize: 17, lineHeight: lineHeightFor(17), fontFamily: F.bold },
  labelSmall: { fontSize: 14, lineHeight: lineHeightFor(14) },
})
