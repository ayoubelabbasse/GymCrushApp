import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, radius, F, lineHeightFor } from '../constants/theme'

interface Props {
  icon: string
  value: string | number
  label: string
  color?: string
}

export default function StatCard({ icon, value, label, color = colors.primary }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    fontSize: 24,
    lineHeight: lineHeightFor(24),
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    lineHeight: lineHeightFor(24),
    fontFamily: F.extraBold,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    fontFamily: F.semiBold,
    color: colors.muted,
    textAlign: 'center',
  },
})
