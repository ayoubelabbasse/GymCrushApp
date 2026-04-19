import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { F, lineHeightFor } from '../constants/theme'

interface Props { size?: number }

export default function GCLogo({ size = 80 }: Props) {
  return (
    <View style={{ width: size, height: size, overflow: 'visible' }}>
      {/* Orange box — stays fixed size */}
      <LinearGradient
        colors={['#FF5722', '#FF3D6B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: size * 0.275 }]}
      />
      {/* GC text — 3× wide container centered over box so letters never wrap */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={false}
        style={{
          position: 'absolute',
          zIndex: 999,
          width: size * 3,
          left: -size,
          top: size * 0.23,
          textAlign: 'center',
          color: '#FFFFFF',
          fontSize: size * 0.45,
          lineHeight: lineHeightFor(size * 0.45),
          fontFamily: F.extraBold,
          fontWeight: '900',
          letterSpacing: -1,
        }}
      >
        GC
      </Text>
    </View>
  )
}
