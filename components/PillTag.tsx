import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { colors, F } from '../constants/theme'

interface ColorSet {
  bg: string
  text: string
  border: string
}

interface Props {
  label: string
  colorSet?: ColorSet
  active?: boolean
  onPress?: () => void
  small?: boolean
}

const defaultColor: ColorSet = {
  bg: 'rgba(255,107,0,0.15)',
  text: '#FF6B00',
  border: 'rgba(255,107,0,0.3)',
}

export default function PillTag({
  label, colorSet = defaultColor, active, onPress, small,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={[
        styles.pill,
        small && styles.small,
        active
          ? { backgroundColor: colorSet.bg, borderColor: colorSet.border }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[
        styles.text,
        small && styles.textSmall,
        { color: active ? colorSet.text : colors.muted },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  small: { paddingHorizontal: 10, paddingVertical: 5 },
  text: { fontSize: 13, fontFamily: F.semiBold },
  textSmall: { fontSize: 11 },
})
