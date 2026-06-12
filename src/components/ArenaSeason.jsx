import { useEffect } from 'react'

const mockPlayers = [
  { name: 'Spelare 1', xp: 1480 },
  { name: 'Spelare 2', xp: 1260 },
  { name: 'Spelare 3', xp: 1040 },
  { name: 'Spelare 4', xp: 870 },
  { name: 'Spelare 5', xp: 720 },
  { name: 'Spelare 6', xp: 590 },
  { name: 'Spelare 7', xp: 430 },
  { name: 'Spelare 8', xp: 260 },
  { name: 'Spelare 9', xp: 140 },
]

const seasonRewards = [
  { place: '1:a', title: 'Arena Legend' },
  { place: '2:a', title: 'Arena Elite' },
  { place: '3:a', title: 'Arena Challenger' },
]

function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

function getDaysRemaining(date = new Date()) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return lastDay.getDate() - date.getDate() + 1
}

function getSeasonName(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function getStorageKey(userId, monthKey) {
  return `pluggarena.arenaSeason.${userId}.${monthKey}`
}

function ArenaSeason({ seasonXp, userId, username }) {
  const monthKey = getMonthKey()
  const seasonName = getSeasonName()
  const daysRemaining = getDaysRemaining()
  const ranking = [
    ...mockPlayers.map((player) => ({
      ...player,
      isCurrentUser: false,
    })),
    {
      isCurrentUser: true,
      name: username,
      xp: seasonXp,
    },
  ]
    .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name, 'sv-SE'))
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }))
  const currentUser = ranking.find((player) => player.isCurrentUser)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        getStorageKey(userId, monthKey),
        JSON.stringify({
          daysRemaining,
          monthKey,
          rank: currentUser.rank,
          seasonXp,
          updatedAt: new Date().toISOString(),
        }),
      )
    } catch {
      // The season remains visible if localStorage is unavailable.
    }
  }, [currentUser.rank, daysRemaining, monthKey, seasonXp, userId])

  return (
    <section className="panel arena-season-panel">
      <div className="panel-heading arena-season-heading">
        <div>
          <p className="eyebrow">Månadens tävling</p>
          <h2>Arena-säsong</h2>
        </div>
        <span className="arena-season-name">{seasonName}</span>
      </div>

      <div className="arena-season-summary">
        <article>
          <span aria-hidden="true">🏆</span>
          <div>
            <small>Aktuell säsong</small>
            <strong>{seasonName}</strong>
          </div>
        </article>
        <article>
          <span aria-hidden="true">📈</span>
          <div>
            <small>Säsongs-XP</small>
            <strong>{seasonXp} XP</strong>
          </div>
        </article>
        <article>
          <span aria-hidden="true">🥇</span>
          <div>
            <small>Placering</small>
            <strong>#{currentUser.rank}</strong>
          </div>
        </article>
        <article>
          <span aria-hidden="true">⏳</span>
          <div>
            <small>Dagar kvar</small>
            <strong>{daysRemaining}</strong>
          </div>
        </article>
      </div>

      <div className="arena-season-content">
        <div className="arena-season-ranking">
          <div className="arena-season-section-heading">
            <strong>Topp 10</strong>
            <span>Återställs nästa månad</span>
          </div>
          <ol>
            {ranking.map((player) => (
              <li
                className={player.isCurrentUser ? 'current-user' : ''}
                key={player.name}
              >
                <span>{player.rank}</span>
                <strong>{player.name}</strong>
                {player.isCurrentUser && <small>Du</small>}
                <em>{player.xp} XP</em>
              </li>
            ))}
          </ol>
        </div>

        <div className="arena-season-rewards">
          <div className="arena-season-section-heading">
            <strong>Belöningar</strong>
            <span>Topp 3</span>
          </div>
          {seasonRewards.map((reward) => (
            <article key={reward.place}>
              <span>{reward.place}</span>
              <strong>{reward.title}</strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ArenaSeason
