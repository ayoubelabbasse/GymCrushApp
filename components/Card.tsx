import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius } from '../constants/theme'

interface Props {
  children: React.ReactNode
  style?: ViewStyle
  glow?: boolean
}

export default function Card({ children, style, glow }: Props) {
  return (
    <View style={[
      styles.card,
      glow && styles.glow,
      style,
    ]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  glow: {
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
})
