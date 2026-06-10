const questDefinitions = [
  { icon: '⭐', key: 'quizCompleted', label: 'Gör 1 quiz', target: 1 },
  { icon: '⭐', key: 'aiQuestions', label: 'Ställ 3 AI-frågor', target: 3 },
  { icon: '⭐', key: 'analyzedAssignments', label: 'Analysera 1 uppgift', target: 1 },
  { icon: '⭐', key: 'xpEarned', label: 'Tjäna 100 XP', target: 100 },
]

function DailyQuests({ quests }) {
  const completedCount = questDefinitions.filter(
    (quest) => quests[quest.key] >= quest.target,
  ).length
  const allComplete = completedCount === questDefinitions.length

  return (
    <section className={`panel daily-quests-panel ${allComplete ? 'all-complete' : ''}`}>
      <div className="panel-heading daily-quests-heading">
        <div>
          <p className="eyebrow">Daily Quests</p>
          <h2>Dagens uppdrag</h2>
        </div>
        <strong className="daily-quests-count">
          {completedCount} / {questDefinitions.length} klara
        </strong>
      </div>

      <div className="daily-quest-list">
        {questDefinitions.map((quest) => {
          const current = Math.min(quests[quest.key], quest.target)
          const complete = current >= quest.target
          const progress = Math.round((current / quest.target) * 100)

          return (
            <article className={complete ? 'daily-quest complete' : 'daily-quest'} key={quest.key}>
              <span className="daily-quest-icon" aria-hidden="true">
                {complete ? '✓' : quest.icon}
              </span>
              <div>
                <strong>{quest.label}</strong>
                <div className="daily-quest-progress" aria-hidden="true">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
              <small>{complete ? 'Klar' : `${current} / ${quest.target}`}</small>
            </article>
          )
        })}
      </div>

      <div className="daily-quests-reward">
        <span>{allComplete ? 'Alla uppdrag klara' : 'Dagens bonus'}</span>
        <strong>{quests.rewardClaimed ? '+50 XP utdelat' : '+50 XP'}</strong>
      </div>
    </section>
  )
}

export default DailyQuests
