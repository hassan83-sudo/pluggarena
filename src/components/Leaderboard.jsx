import { getLevelProgress } from '../lib/levels.js'

function Leaderboard({ currentUser, entries }) {
  const normalizedCurrentUser = (currentUser || '').toLocaleLowerCase('sv-SE')

  return (
    <section className="panel leaderboard-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Ranking</p>
          <h2>Leaderboard</h2>
        </div>
        <span className="leaderboard-size">Topp {entries.length}</span>
      </div>

      <ol className="leaderboard-list">
        {entries.map((entry, index) => {
          const isCurrentUser =
            entry.name.toLocaleLowerCase('sv-SE') ===
            normalizedCurrentUser
          const level = getLevelProgress(entry.xp).currentLevel

          return (
            <li className={isCurrentUser ? 'current-user' : ''} key={entry.name}>
              <span className={`leaderboard-rank rank-${index + 1}`}>
                {index + 1}
              </span>
              <div className="leaderboard-player">
                <strong>
                  {entry.name}
                  {isCurrentUser && <small>Du</small>}
                </strong>
                <span>Nivå {level}</span>
              </div>
              <em>{entry.xp} XP</em>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default Leaderboard
