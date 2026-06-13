import { useCallback, useEffect, useState } from 'react'

const focusOptions = [
  { minutes: 15, reward: 20 },
  { minutes: 25, reward: 35 },
  { minutes: 45, reward: 60 },
  { minutes: 60, reward: 80 },
]

const initialStats = {
  activeSession: null,
  completedSessions: 0,
  earnedFocusXp: 0,
  totalMinutes: 0,
}

function getStorageKey(userId) {
  return `pluggarena.focusMode.${userId}`
}

function readFocusStats(userId) {
  try {
    const value = window.localStorage.getItem(getStorageKey(userId))
    const parsedValue = value ? JSON.parse(value) : null

    return parsedValue &&
      typeof parsedValue === 'object' &&
      !Array.isArray(parsedValue)
      ? { ...initialStats, ...parsedValue }
      : initialStats
  } catch {
    return initialStats
  }
}

function saveFocusStats(userId, stats) {
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(stats))
  } catch {
    // Focus state remains available for this session if storage is unavailable.
  }
}

function getTimestamp() {
  return Date.now()
}

function getRemainingSeconds(activeSession) {
  if (!activeSession) {
    return 0
  }

  if (activeSession.paused) {
    return activeSession.remainingSeconds || 0
  }

  if (!activeSession.endTime) {
    return 0
  }

  return Math.max(
    Math.ceil((activeSession.endTime - getTimestamp()) / 1000),
    0,
  )
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function FocusMode({ onComplete, userId }) {
  const [stats, setStats] = useState(() => readFocusStats(userId))
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(readFocusStats(userId).activeSession),
  )
  const [message, setMessage] = useState('')
  const activeSession = stats.activeSession

  const completeSession = useCallback(() => {
    if (!activeSession) {
      return
    }

    const nextStats = {
      activeSession: null,
      completedSessions: stats.completedSessions + 1,
      earnedFocusXp: stats.earnedFocusXp + activeSession.reward,
      totalMinutes: stats.totalMinutes + activeSession.minutes,
    }

    saveFocusStats(userId, nextStats)
    setStats(nextStats)
    setRemainingSeconds(0)
    setMessage(
      `Fokuspasset är klart. Du fick +${activeSession.reward} XP.`,
    )
    onComplete(activeSession.reward)
  }, [
    activeSession,
    onComplete,
    stats.completedSessions,
    stats.earnedFocusXp,
    stats.totalMinutes,
    userId,
  ])

  useEffect(() => {
    if (!activeSession || activeSession.paused) {
      return undefined
    }

    const timer = window.setInterval(() => {
      const nextRemaining = getRemainingSeconds(activeSession)
      setRemainingSeconds(nextRemaining)

      if (nextRemaining === 0) {
        window.clearInterval(timer)
        completeSession()
      }
    }, 250)

    return () => window.clearInterval(timer)
  }, [activeSession, completeSession])

  function startSession(option) {
    const startedAt = getTimestamp()
    const nextActiveSession = {
      endTime: startedAt + option.minutes * 60 * 1000,
      minutes: option.minutes,
      paused: false,
      remainingSeconds: option.minutes * 60,
      reward: option.reward,
      startedAt,
    }
    const nextStats = {
      ...stats,
      activeSession: nextActiveSession,
    }

    saveFocusStats(userId, nextStats)
    setStats(nextStats)
    setRemainingSeconds(option.minutes * 60)
    setMessage('')
  }

  function pauseSession() {
    if (!activeSession || activeSession.paused) {
      return
    }

    const pausedRemaining = getRemainingSeconds(activeSession)
    const nextActiveSession = {
      ...activeSession,
      endTime: null,
      paused: true,
      remainingSeconds: pausedRemaining,
    }
    const nextStats = {
      ...stats,
      activeSession: nextActiveSession,
    }

    saveFocusStats(userId, nextStats)
    setStats(nextStats)
    setRemainingSeconds(pausedRemaining)
    setMessage('Fokuspasset är pausat.')
  }

  function resumeSession() {
    if (!activeSession?.paused) {
      return
    }

    const resumedAt = getTimestamp()
    const nextActiveSession = {
      ...activeSession,
      endTime: resumedAt + remainingSeconds * 1000,
      paused: false,
      remainingSeconds,
    }
    const nextStats = {
      ...stats,
      activeSession: nextActiveSession,
    }

    saveFocusStats(userId, nextStats)
    setStats(nextStats)
    setMessage('')
  }

  function cancelSession() {
    const nextStats = {
      ...stats,
      activeSession: null,
    }

    saveFocusStats(userId, nextStats)
    setStats(nextStats)
    setRemainingSeconds(0)
    setMessage('Fokuspasset avbröts utan XP-belöning.')
  }

  const totalHours = Math.floor(stats.totalMinutes / 60)
  const extraMinutes = stats.totalMinutes % 60

  return (
    <section className="panel focus-mode-panel">
      <div className="panel-heading focus-mode-heading">
        <div>
          <p className="eyebrow">Ostörd pluggtid</p>
          <h2>Fokusläge</h2>
        </div>
        <span className={activeSession ? 'focus-status active' : 'focus-status'}>
          {activeSession?.paused
            ? 'Fokus pausat'
            : activeSession
              ? 'Fokus pågår'
              : 'Redo'}
        </span>
      </div>

      <div className="focus-mode-layout">
        <div className="focus-timer">
          <span>Återstående tid</span>
          <strong>{formatTime(remainingSeconds)}</strong>
          <p>
            {activeSession
              ? `${activeSession.minutes} min fokus · +${activeSession.reward} XP vid mål`
              : 'Välj längd för att starta ett nytt fokuspass.'}
          </p>
        </div>

        <div className="focus-options">
          {focusOptions.map((option) => (
            <button
              disabled={Boolean(activeSession)}
              key={option.minutes}
              onClick={() => startSession(option)}
              type="button"
            >
              <strong>{option.minutes} min</strong>
              <span>+{option.reward} XP</span>
            </button>
          ))}
        </div>
      </div>

      {activeSession && (
        <div className="focus-session-actions">
          <button
            className="focus-pause-button"
            onClick={activeSession.paused ? resumeSession : pauseSession}
            type="button"
          >
            {activeSession.paused ? 'Återuppta fokuspass' : 'Pausa fokuspass'}
          </button>
          <button
            className="focus-stop-button"
            onClick={cancelSession}
            type="button"
          >
            Avbryt fokuspass
          </button>
        </div>
      )}

      {message && (
        <p className="focus-message" role="status">
          {message}
        </p>
      )}

      <div className="focus-stats">
        <article>
          <span>Genomförda pass</span>
          <strong>{stats.completedSessions}</strong>
        </article>
        <article>
          <span>Total fokustid</span>
          <strong>
            {totalHours > 0 ? `${totalHours} h ${extraMinutes} min` : `${extraMinutes} min`}
          </strong>
        </article>
        <article>
          <span>Intjänad fokus-XP</span>
          <strong>{stats.earnedFocusXp} XP</strong>
        </article>
      </div>
    </section>
  )
}

export default FocusMode
