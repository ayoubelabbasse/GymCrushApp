import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { colors, spacing, F } from '../constants/theme'
import { GymSession } from '../lib/types'

const GAP = 3
const DAY_LABEL_W = 12   // left column for M / W / F letters
const CARD_H_PADDING = 32

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
// Row 0 = Mon … Row 6 = Sun; only label Mon / Wed / Fri
const DAY_LETTERS = ['M', '', 'W', '', 'F', '', '']

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function cellColor(count: number): string {
  if (count <= 0) return '#1e1e1e'
  if (count === 1) return 'rgba(255,107,0,0.18)'
  if (count <= 3) return 'rgba(255,107,0,0.42)'
  return 'rgba(255,107,0,0.72)'
}

export interface HeatmapProps {
  sessions: GymSession[]
  weeks?: number
}

export default function Heatmap({ sessions, weeks = 4 }: HeatmapProps) {
  const { width: screenW } = useWindowDimensions()

  // Auto-size: fill ~90 % of card content width, capped at 14 px so 7 rows
  // never exceed ~110 px tall (no "tall building").
  const availW = screenW - spacing.xl * 2 - CARD_H_PADDING - DAY_LABEL_W - GAP
  const rawCell = Math.floor((availW * 0.90 - (weeks - 1) * GAP) / weeks)
  const cell = Math.max(10, Math.min(14, rawCell))

  const today = startOfDay(new Date())
  const todayTs = today.getTime()

  const counts = new Map<number, number>()
  for (const s of sessions) {
    const key = startOfDay(new Date(s.checked_in_at)).getTime()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  // Align grid: today in last column at its correct weekday row (Mon=0…Sun=6)
  const jsDay = today.getDay()
  const todayRow = jsDay === 0 ? 6 : jsDay - 1
  const lastColStart = new Date(todayTs - todayRow * 86400000)
  const firstColStart = new Date(lastColStart.getTime() - (weeks - 1) * 7 * 86400000)

  type Cell = { count: number; isFuture: boolean }
  const cols: Cell[][] = []
  const monthLabels: (string | null)[] = []

  for (let w = 0; w < weeks; w++) {
    const col: Cell[] = []
    for (let d = 0; d < 7; d++) {
      const ts = firstColStart.getTime() + (w * 7 + d) * 86400000
      const norm = startOfDay(new Date(ts)).getTime()
      col.push({ count: counts.get(norm) ?? 0, isFuture: norm > todayTs })
    }
    cols.push(col)

    // Month label: show only when the month changes vs previous column
    const colDate = new Date(firstColStart.getTime() + w * 7 * 86400000)
    const prevDate = w > 0 ? new Date(firstColStart.getTime() + (w - 1) * 7 * 86400000) : null
    monthLabels.push(
      !prevDate || colDate.getMonth() !== prevDate.getMonth()
        ? MONTH_ABBR[colDate.getMonth()]
        : null
    )
  }

  const activeDays = counts.size
  const totalSessions = sessions.length
  const r = Math.max(2, Math.round(cell * 0.22))

  return (
    <View style={styles.root}>
      {/* ── Month labels row ── */}
      <View style={[styles.monthRow, { paddingLeft: DAY_LABEL_W + GAP }]}>
        {monthLabels.map((label, i) => (
          <View key={i} style={{ width: cell, marginRight: i < cols.length - 1 ? GAP : 0 }}>
            {label ? <Text style={styles.monthLabel}>{label}</Text> : null}
          </View>
        ))}
      </View>

      {/* ── Grid + day labels ── */}
      <View style={styles.gridRow}>
        {/* Day-of-week letters */}
        <View style={{ width: DAY_LABEL_W, marginRight: GAP }}>
          {DAY_LETTERS.map((letter, i) => (
            <View
              key={i}
              style={{ height: cell, marginBottom: i < 6 ? GAP : 0, justifyContent: 'center' }}
            >
              <Text style={styles.dayLabel}>{letter}</Text>
            </View>
          ))}
        </View>

        {/* Cells */}
        {cols.map((col, ci) => (
          <View key={ci} style={{ marginRight: ci < cols.length - 1 ? GAP : 0 }}>
            {col.map((c, ri) => (
              <View
                key={ri}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: r,
                  marginBottom: ri < 6 ? GAP : 0,
                  backgroundColor: c.isFuture ? 'transparent' : cellColor(c.count),
                }}
              />
            ))}
          </View>
        ))}
      </View>

      {/* ── Footer stat ── */}
      <Text style={styles.stat}>
        {activeDays} active day{activeDays !== 1 ? 's' : ''} · {totalSessions} session{totalSessions !== 1 ? 's' : ''}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {},
  monthRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  monthLabel: {
    color: '#555',
    fontSize: 9,
    lineHeight: 11,
    fontFamily: F.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dayLabel: {
    color: '#555',
    fontSize: 9,
    lineHeight: 10,
    fontFamily: F.regular,
    textAlign: 'right',
  },
  stat: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: F.regular,
  },
})
