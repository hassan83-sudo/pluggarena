const metrics = [
  { icon: '📈', key: 'xpEarned', label: 'XP denna månad' },
  { icon: '📚', key: 'quizCompleted', label: 'Quiz denna månad' },
  { icon: '🤖', key: 'aiQuestions', label: 'AI-frågor denna månad' },
  {
    icon: '📝',
    key: 'analyzedAssignments',
    label: 'Uppgifter analyserade',
  },
  { icon: '🔥', key: 'highestStreak', label: 'Högsta streak' },
  { icon: '🏆', key: 'levelsAchieved', label: 'Nivåer uppnådda' },
]

function getSummary(activity) {
  if (activity.xpEarned >= 400) {
    return `Du har haft en stark månad och tjänat ${activity.xpEarned} XP.`
  }

  if (
    activity.quizCompleted +
    activity.aiQuestions +
    activity.analyzedAssignments >
    0
  ) {
    return `Du har kommit igång bra och tjänat ${activity.xpEarned} XP denna månad.`
  }

  return 'Din månad har precis börjat. Gör en aktivitet för att bygga din översikt.'
}

function MonthlyOverview({ activity }) {
  const monthLabel = new Intl.DateTimeFormat('sv-SE', {
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <section className="panel monthly-overview-panel">
      <div className="panel-heading monthly-overview-heading">
        <div>
          <p className="eyebrow">Din utveckling</p>
          <h2>Månadsöversikt</h2>
        </div>
        <span className="monthly-overview-period">{monthLabel}</span>
      </div>

      <div className="monthly-overview-grid">
        {metrics.map((metric) => (
          <article key={metric.key}>
            <span className="monthly-overview-icon" aria-hidden="true">
              {metric.icon}
            </span>
            <div>
              <span>{metric.label}</span>
              <strong>{activity[metric.key] || 0}</strong>
            </div>
          </article>
        ))}
      </div>

      <div className="monthly-overview-summary">
        <span>Sammanfattning</span>
        <p>{getSummary(activity)}</p>
      </div>
    </section>
  )
}

export default MonthlyOverview
