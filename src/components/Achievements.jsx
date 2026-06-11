const achievementDefinitions = [
  {
    description: 'Lås upp efter första genomförda quiz.',
    icon: '🥇',
    key: 'first-quiz',
    title: 'Första Quizet',
    value: ({ quizCompleted }) => quizCompleted,
    target: 1,
  },
  {
    description: 'Lås upp efter 7 dagars streak.',
    icon: '🔥',
    key: 'seven-day-streak',
    title: '7 Dagars Streak',
    value: ({ streak }) => streak,
    target: 7,
  },
  {
    description: 'Lås upp vid 1000 XP.',
    icon: '⚡',
    key: 'thousand-xp',
    title: '1000 XP',
    value: ({ xp }) => xp,
    target: 1000,
  },
  {
    description: 'Lås upp efter 10 analyserade uppgifter.',
    icon: '📚',
    key: 'ten-assignments',
    title: '10 Uppgifter',
    value: ({ analyzedAssignments }) => analyzedAssignments,
    target: 10,
  },
  {
    description: 'Lås upp efter 25 AI-frågor.',
    icon: '🤖',
    key: 'ai-master',
    title: 'AI-Mästare',
    value: ({ aiQuestions }) => aiQuestions,
    target: 25,
  },
  {
    description: 'Nå förstaplatsen i en studiegrupp.',
    icon: '👑',
    key: 'class-master',
    title: 'Klassmästare',
    value: ({ classroomMaster }) => classroomMaster,
    target: 1,
  },
]

function Achievements({ stats, streak, xp }) {
  const values = { ...stats, streak, xp }
  const achievements = achievementDefinitions.map((achievement) => {
    const current = achievement.value(values)

    return {
      ...achievement,
      current,
      progress: Math.min(Math.round((current / achievement.target) * 100), 100),
      unlocked: current >= achievement.target,
    }
  })
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length

  return (
    <section className="panel achievements-panel">
      <div className="panel-heading achievements-heading">
        <div>
          <p className="eyebrow">Achievements</p>
          <h2>Dina badges</h2>
        </div>
        <strong className="achievement-count">
          {unlockedCount} / {achievements.length} upplåsta
        </strong>
      </div>

      <div className="achievement-list">
        {achievements.map((achievement) => (
          <article
            className={achievement.unlocked ? 'achievement unlocked' : 'achievement locked'}
            key={achievement.key}
          >
            <span className="achievement-icon" aria-hidden="true">
              {achievement.icon}
            </span>
            <div className="achievement-copy">
              <div>
                <strong>{achievement.title}</strong>
                <span>{achievement.unlocked ? 'Upplåst' : 'Låst'}</span>
              </div>
              <p>{achievement.description}</p>
              <div className="achievement-progress" aria-hidden="true">
                <span style={{ width: `${achievement.progress}%` }} />
              </div>
              <small>
                {Math.min(achievement.current, achievement.target)} / {achievement.target}
              </small>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default Achievements
