export const levelThresholds = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 250 },
  { level: 4, xp: 500 },
  { level: 5, xp: 1000 },
  { level: 6, xp: 2000 },
  { level: 7, xp: 3500 },
  { level: 8, xp: 5000 },
]

export function getLevelProgress(xp) {
  const currentIndex = levelThresholds.findLastIndex(
    (entry) => xp >= entry.xp,
  )
  const current = levelThresholds[Math.max(currentIndex, 0)]
  const next = levelThresholds[currentIndex + 1] || null
  const progress = next
    ? Math.min(
      Math.round(
        ((xp - current.xp) / (next.xp - current.xp)) * 100,
      ),
      100,
    )
    : 100

  return {
    currentLevel: current.level,
    nextLevel: next?.level || null,
    progress,
    xpToNext: next ? Math.max(next.xp - xp, 0) : 0,
  }
}
