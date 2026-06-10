import { getLevelProgress } from '../lib/levels.js'

const levelRewards = [
  { icon: '🏅', level: 3, title: 'Rookie Student' },
  { icon: '📚', level: 5, title: 'Study Pro' },
  { icon: '👑', level: 8, title: 'Arena Master' },
]

function LevelRewards({ levelNotice, xp }) {
  const levelProgress = getLevelProgress(xp)

  return (
    <section className="panel level-rewards-panel">
      <div className="panel-heading level-rewards-heading">
        <div>
          <p className="eyebrow">Levels & Rewards</p>
          <h2>Belöningar</h2>
        </div>
        <strong className="level-number">Nivå {levelProgress.currentLevel}</strong>
      </div>

      {levelNotice && (
        <div className="level-up-notice" role="status">
          <span aria-hidden="true">✦</span>
          <strong>Nivå upp! Du nådde nivå {levelNotice}.</strong>
        </div>
      )}

      <div className="level-overview">
        <div>
          <span>Aktuell nivå</span>
          <strong>{levelProgress.currentLevel}</strong>
        </div>
        <div>
          <span>Total XP</span>
          <strong>{xp}</strong>
        </div>
        <div>
          <span>XP till nästa nivå</span>
          <strong>
            {levelProgress.nextLevel ? levelProgress.xpToNext : 'Maxnivå'}
          </strong>
        </div>
      </div>

      <div className="level-progress-copy">
        <span>
          {levelProgress.nextLevel
            ? `Mot nivå ${levelProgress.nextLevel}`
            : 'Alla nivåer upplåsta'}
        </span>
        <small>{levelProgress.progress}%</small>
      </div>
      <div className="level-progress-track" aria-hidden="true">
        <span style={{ width: `${levelProgress.progress}%` }} />
      </div>

      <div className="level-reward-list">
        {levelRewards.map((reward) => {
          const unlocked = levelProgress.currentLevel >= reward.level

          return (
            <article
              className={unlocked ? 'level-reward unlocked' : 'level-reward locked'}
              key={reward.level}
            >
              <span aria-hidden="true">{reward.icon}</span>
              <div>
                <small>Nivå {reward.level}</small>
                <strong>{reward.title}</strong>
              </div>
              <em>{unlocked ? 'Upplåst' : 'Låst'}</em>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default LevelRewards
