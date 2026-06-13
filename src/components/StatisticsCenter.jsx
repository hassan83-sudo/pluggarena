import { getLevelProgress } from '../lib/levels.js'

const emptyActivity = {
  aiQuestions: 0,
  analyzedAssignments: 0,
  quizCompleted: 0,
  xpEarned: 0,
}

function readValue(key, fallback) {
  try {
    const value = window.localStorage.getItem(key)
    const parsedValue = value ? JSON.parse(value) : fallback

    if (Array.isArray(fallback)) {
      return Array.isArray(parsedValue) ? parsedValue : fallback
    }

    if (fallback && typeof fallback === 'object') {
      return parsedValue &&
        typeof parsedValue === 'object' &&
        !Array.isArray(parsedValue)
        ? { ...fallback, ...parsedValue }
        : fallback
    }

    return parsedValue ?? fallback
  } catch {
    return fallback
  }
}

function readPeriodData(prefix, periodKey) {
  try {
    return Object.keys(window.localStorage)
      .filter((key) => key.startsWith(prefix))
      .map((key) => readValue(key, null))
      .filter((value) => value && typeof value === 'object')
      .sort((a, b) => (a[periodKey] || '').localeCompare(b[periodKey] || ''))
      .slice(-6)
  } catch {
    return []
  }
}

function getBattleStats(userId) {
  const results = readValue('pluggarena.battleResults', [])
    .filter((result) => result.userId === userId)
  const wins = results.filter((result) => result.outcome === 'win').length
  const draws = results.filter((result) => result.outcome === 'draw').length
  const losses = results.filter((result) => result.outcome === 'loss').length

  return {
    draws,
    losses,
    total: results.length,
    winRate: results.length ? Math.round((wins / results.length) * 100) : 0,
    wins,
  }
}

function getQuizStats(userId) {
  const quizResults = readValue(`pluggarena.quizResults.${userId}`, [])
  const examResults = readValue(`pluggarena.examResults.${userId}`, [])
  const correctAnswers = quizResults.filter((result) => result.isCorrect).length

  return {
    accuracy: quizResults.length
      ? Math.round((correctAnswers / quizResults.length) * 100)
      : 0,
    bestExam: examResults.length
      ? Math.max(...examResults.map((result) => result.percentage))
      : 0,
    exams: examResults.length,
    questions: quizResults.length,
  }
}

function getQuestStats(userId) {
  const quests = readValue(`pluggarena.dailyQuests.${userId}`, {})
  const completed = [
    quests.quizCompleted >= 1,
    quests.aiQuestions >= 3,
    quests.analyzedAssignments >= 1,
    quests.xpEarned >= 100,
  ].filter(Boolean).length

  return {
    completed,
    rewardClaimed: Boolean(quests.rewardClaimed),
  }
}

function ActivityChart({ data, label, periodKey }) {
  const chartData = data.length > 0
    ? data
    : [{ ...emptyActivity, [periodKey]: 'Ingen data' }]
  const maxXp = Math.max(...chartData.map((entry) => entry.xpEarned || 0), 1)

  return (
    <div className="statistics-chart">
      <div className="statistics-chart-heading">
        <strong>{label}</strong>
        <span>XP-utveckling</span>
      </div>
      <div className="statistics-bars">
        {chartData.map((entry) => {
          const height = Math.max(
            Math.round(((entry.xpEarned || 0) / maxXp) * 100),
            4,
          )

          return (
            <div className="statistics-bar-item" key={entry[periodKey]}>
              <strong>{entry.xpEarned || 0}</strong>
              <div>
                <span style={{ height: `${height}%` }} />
              </div>
              <small>{entry[periodKey]}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatisticsCenter({ streak, userId, xp }) {
  const achievementStats = readValue(
    `pluggarena.achievementStats.${userId}`,
    {},
  )
  const focusStats = readValue(`pluggarena.focusMode.${userId}`, {})
  const calendar = readValue(`pluggarena.studyCalendar.${userId}`, [])
  const memberships = readValue(
    `pluggarena.classroomMemberships.${userId}`,
    [],
  )
  const levelProgress = getLevelProgress(xp)
  const levelHistory = readValue(`pluggarena.levelProgress.${userId}`, {})
  const quizStats = getQuizStats(userId)
  const battleStats = getBattleStats(userId)
  const questStats = getQuestStats(userId)
  const weeklyData = readPeriodData(
    `pluggarena.weeklyActivity.${userId}.`,
    'weekKey',
  )
  const monthlyData = readPeriodData(
    `pluggarena.monthlyActivity.${userId}.`,
    'monthKey',
  )
  const currentMonth = monthlyData.at(-1) || emptyActivity
  const completedCalendar = calendar.filter((item) => item.completed).length
  const personalRecords = [
    { label: 'Högsta nivå', value: levelHistory.highestLevel || levelProgress.currentLevel },
    { label: 'Bästa prov', value: `${quizStats.bestExam}%` },
    { label: 'Högsta månads-XP', value: Math.max(...monthlyData.map((item) => item.xpEarned || 0), 0) },
    { label: 'Battle-vinster', value: battleStats.wins },
  ]

  const overviewCards = [
    { icon: '📈', label: 'Total XP', value: xp },
    { icon: '🏆', label: 'Nivåhistorik', value: `Nivå ${levelProgress.currentLevel}` },
    { icon: '🔥', label: 'Streak-historik', value: `${streak} dagar` },
    { icon: '📚', label: 'Quiz-statistik', value: `${quizStats.accuracy}% rätt` },
    { icon: '📝', label: 'Uppgiftsstatistik', value: achievementStats.analyzedAssignments || 0 },
    { icon: '🤖', label: 'AI-användning', value: achievementStats.aiQuestions || 0 },
    { icon: '⚔️', label: 'Battle-statistik', value: `${battleStats.wins} vinster` },
    { icon: '🎯', label: 'Daily Quests', value: `${questStats.completed} / 4` },
    { icon: '⏱️', label: 'Fokuspass', value: focusStats.completedSessions || 0 },
    { icon: '📅', label: 'Studiekalender', value: `${completedCalendar} klara` },
    { icon: '🏫', label: 'Klassrum', value: `${memberships.length} grupper` },
  ]

  return (
    <div className="statistics-center-page">
      <section className="panel statistics-header-panel">
        <div>
          <p className="eyebrow">All din utveckling</p>
          <h2>Statistikcenter</h2>
          <p>En samlad bild av dina studier, aktiviteter och personliga rekord.</p>
        </div>
        <div className="statistics-header-level">
          <span>Aktuell nivå</span>
          <strong>{levelProgress.currentLevel}</strong>
        </div>
      </section>

      <section className="statistics-overview-grid">
        {overviewCards.map((card) => (
          <article key={card.label}>
            <span aria-hidden="true">{card.icon}</span>
            <div>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="panel statistics-charts-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Utveckling över tid</p>
            <h2>Diagram</h2>
          </div>
        </div>
        <div className="statistics-chart-grid">
          <ActivityChart data={weeklyData} label="Veckovis utveckling" periodKey="weekKey" />
          <ActivityChart data={monthlyData} label="Månadsvis utveckling" periodKey="monthKey" />
        </div>
      </section>

      <section className="panel statistics-details-panel">
        <div className="statistics-detail-card">
          <strong>Quiz och prov</strong>
          <span>{quizStats.questions} quizfrågor besvarade</span>
          <span>{quizStats.exams} genomförda prov</span>
          <span>Personligt rekord: {quizStats.bestExam}%</span>
        </div>
        <div className="statistics-detail-card">
          <strong>Battle</strong>
          <span>{battleStats.total} matcher</span>
          <span>{battleStats.wins} V · {battleStats.draws} O · {battleStats.losses} F</span>
          <span>Vinstprocent: {battleStats.winRate}%</span>
        </div>
        <div className="statistics-detail-card">
          <strong>Fokus och planering</strong>
          <span>{focusStats.totalMinutes || 0} fokusminuter</span>
          <span>{focusStats.earnedFocusXp || 0} fokus-XP</span>
          <span>{calendar.length} kalenderaktiviteter</span>
        </div>
        <div className="statistics-detail-card">
          <strong>Denna månad</strong>
          <span>{currentMonth.xpEarned || 0} XP</span>
          <span>{currentMonth.quizCompleted || 0} quiz</span>
          <span>{currentMonth.aiQuestions || 0} AI-frågor</span>
        </div>
      </section>

      <section className="panel statistics-records-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Dina toppnoteringar</p>
            <h2>Personliga rekord</h2>
          </div>
        </div>
        <div className="statistics-record-grid">
          {personalRecords.map((record) => (
            <article key={record.label}>
              <span>{record.label}</span>
              <strong>{record.value}</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default StatisticsCenter
