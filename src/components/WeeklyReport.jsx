import { useState } from 'react'

function getStorageKey(userId, weekKey) {
  return `pluggarena.weeklyReport.${userId}.${weekKey}`
}

function readStoredReport(userId, weekKey) {
  try {
    const value = window.localStorage.getItem(getStorageKey(userId, weekKey))
    const parsedValue = value ? JSON.parse(value) : null

    return parsedValue &&
      typeof parsedValue === 'object' &&
      !Array.isArray(parsedValue) &&
      parsedValue.activity &&
      typeof parsedValue.activity === 'object'
      ? parsedValue
      : null
  } catch {
    return null
  }
}

function createSummary(activity, streak) {
  const categories = [
    { count: activity.quizCompleted, label: 'quiz', focus: 'quiz' },
    {
      count: activity.analyzedAssignments,
      label: 'uppgifter',
      focus: 'uppgifter',
    },
    { count: activity.aiQuestions, label: 'AI-frågor', focus: 'AI-stöd' },
  ]
  const totalActivities = categories.reduce(
    (total, category) => total + category.count,
    0,
  )
  const mostActive = [...categories].sort((a, b) => b.count - a.count)[0]
  const leastActive = [...categories].sort((a, b) => a.count - b.count)[0]

  if (totalActivities === 0) {
    return {
      focus: 'Börja med ett kort quiz och analysera en uppgift nästa vecka.',
      motivation:
        'En ny vecka är en ny chans. Små pluggpass räcker för att komma igång.',
    }
  }

  return {
    focus: `Nästa vecka kan du fokusera mer på ${leastActive.focus}.`,
    motivation: `Bra jobbat! Du har varit mest aktiv med ${mostActive.label}${streak > 1 ? ` och håller en streak på ${streak} dagar` : ''}.`,
  }
}

function buildReport(activity, streak, weekKey) {
  return {
    ...createSummary(activity, streak),
    activity,
    createdAt: new Date().toISOString(),
    streak,
    weekKey,
  }
}

function WeeklyReport({ activity, streak, userId, weekKey }) {
  const [savedReport, setSavedReport] = useState(() =>
    readStoredReport(userId, weekKey),
  )
  const report = savedReport || buildReport(activity, streak, weekKey)
  const metrics = [
    { label: 'XP denna vecka', value: report.activity.xpEarned },
    { label: 'Quiz genomförda', value: report.activity.quizCompleted },
    {
      label: 'Analyserade uppgifter',
      value: report.activity.analyzedAssignments,
    },
    { label: 'AI-frågor', value: report.activity.aiQuestions },
    { label: 'Nuvarande streak', value: `${report.streak} dagar` },
  ]

  function updateReport() {
    const nextReport = buildReport(activity, streak, weekKey)

    try {
      window.localStorage.setItem(
        getStorageKey(userId, weekKey),
        JSON.stringify(nextReport),
      )
    } catch {
      // The current summary remains visible if localStorage is unavailable.
    }

    setSavedReport(nextReport)
  }

  return (
    <section className="panel weekly-report-panel">
      <div className="panel-heading weekly-report-heading">
        <div>
          <p className="eyebrow">Progress Summary</p>
          <h2>Veckorapport</h2>
        </div>
        <span className="weekly-report-period">Denna vecka</span>
      </div>

      <div className="weekly-report-metrics">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>

      <div className="weekly-report-summary">
        <div>
          <span>Din utveckling</span>
          <p>{report.motivation}</p>
        </div>
        <div>
          <span>Fokus nästa vecka</span>
          <p>{report.focus}</p>
        </div>
      </div>

      <button
        className="weekly-report-button"
        type="button"
        onClick={updateReport}
      >
        Uppdatera rapport
      </button>
    </section>
  )
}

export default WeeklyReport
