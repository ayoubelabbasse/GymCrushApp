import React, { useState } from 'react'
import { Image, Text, Platform, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { F, profileAvatarCircleGradient } from '../constants/theme'

interface Props {
  photoUrl?: string | null
  name: string
  size?: number
}

/** Two letters: first name + last name (multi-word), or first two letters of a single word. */
function getInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  // Strip leading emoji / punctuation so initials are always letters
  const words = trimmed.split(/\s+/).filter(Boolean)
  const letter = (w: string) => {
    const m = w.match(/[a-zA-Z0-9]/)
    return m ? m[0] : ''
  }
  if (words.length === 0) return '?'
  if (words.length === 1) {
    const w = words[0].replace(/[^a-zA-Z0-9]/g, '')
    return (w.slice(0, 2).toUpperCase() || '?')
  }
  const first = letter(words[0])
  const last = letter(words[words.length - 1])
  const pair = `${first}${last}`.toUpperCase()
  const fallback =
    pair.length >= 2 ? pair.slice(0, 2) : (words[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '?')
  return fallback || '?'
}

export default function Avatar({ photoUrl, name, size = 56 }: Props) {
  const [imgError, setImgError] = useState(false)
  const borderRadius = size / 2
  const initials = getInitials(name)
  /** Fits 2 letters inside the circle without ellipsis (avoid adjustsFontSizeToFit — it truncates with "…"). */
  const horizontalPad = Math.max(4, Math.round(size * 0.1))
  const fontSize = Math.max(11, Math.floor(size * 0.38))
  const lineHeight = Math.ceil(fontSize * 1.22)
  const textWidth = size - horizontalPad * 2

  if (photoUrl && !imgError) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius }}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={[...profileAvatarCircleGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: horizontalPad,
        }}
      >
        <Text
          allowFontScaling={false}
          maxFontSizeMultiplier={1}
          numberOfLines={1}
          ellipsizeMode="clip"
          style={{
            width: textWidth,
            color: '#fff',
            fontSize,
            lineHeight,
            fontFamily: F.extraBold,
            fontWeight: '800',
            letterSpacing: 0,
            textAlign: 'center',
            ...(Platform.OS === 'android'
              ? { includeFontPadding: false, textAlignVertical: 'center' as const }
              : {}),
          }}
        >
          {initials}
        </Text>
      </View>
    </View>
  )
}
