import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { F, lineHeightFor, gradients } from '../constants/theme'

/** Compact “Pro” pill with orange → pink gradient (matches web reference). */
export default function ProBadge() {
  return (
    <LinearGradient
      colors={[...gradients.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <Text style={styles.text}>⚡ Pro</Text>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    fontFamily: F.bold,
    fontWeight: '700',
  },
})
