import { useEffect, useRef } from 'react'
import { Animated, View, ViewStyle } from 'react-native'

interface SkeletonProps {
  width?: number | `${number}%`
  height: number
  borderRadius?: number
  style?: ViewStyle
}

export default function Skeleton({ width = '100%', height, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 850, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [shimmer])

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.45] })

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#2e2e2e',
          opacity,
        },
        style,
      ]}
    />
  )
}

/** Row of skeletons with a gap between them */
export function SkeletonRow({ children, gap = 8, style }: { children: React.ReactNode; gap?: number; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', gap }, style]}>
      {children}
    </View>
  )
}
