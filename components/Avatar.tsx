import React from 'react'
import { Image, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

interface Props {
  photoUrl?: string | null
  name: string
  size?: number
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Avatar({ photoUrl, name, size = 56 }: Props) {
  const borderRadius = size / 2

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius }}
      />
    )
  }

  return (
    <LinearGradient
      colors={['#FF6B00', '#FF3D6B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '800' }}>
        {getInitials(name)}
      </Text>
    </LinearGradient>
  )
}
