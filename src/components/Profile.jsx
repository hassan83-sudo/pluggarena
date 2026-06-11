import { getLevelProgress } from '../lib/levels.js'

const achievementTargets = {
  aiQuestions: 25,
  analyzedAssignments: 10,
  classroomMaster: 1,
  quizCompleted: 1,
  streak: 7,
  xp: 1000,
}

const shopItemNames = {
  'arena-master-frame': 'Arena Master-ram',
  'color-profile-frame': 'Ny profilram',
  'fire-profile-frame': 'Eldprofilram',
  'premium-badge': 'Premium-badge',
}

function readStoredArray(key) {
  try {
    const value = window.localStorage.getItem(key)
    const parsedValue = value ? JSON.parse(value) : []

    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

function readAchievementStats(userId) {
  try {
    const value = window.localStorage.getItem(
      `pluggarena.achievementStats.${userId}`,
    )
    const parsedValue = value ? JSON.parse(value) : {}

    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {}
  } catch {
    return {}
  }
}

function getAchievementCount(userId, streak, xp) {
  const stats = readAchievementStats(userId)
  const values = {
    aiQuestions: stats.aiQuestions || 0,
    analyzedAssignments: stats.analyzedAssignments || 0,
    classroomMaster: stats.classroomMaster || 0,
    quizCompleted: stats.quizCompleted || 0,
    streak,
    xp,
  }

  return Object.entries(achievementTargets).filter(
    ([key, target]) => values[key] >= target,
  ).length
}

function getFrameClass(ownedItems) {
  if (ownedItems.includes('arena-master-frame')) {
    return 'arena-master'
  }

  if (ownedItems.includes('fire-profile-frame')) {
    return 'fire'
  }

  if (ownedItems.includes('color-profile-frame')) {
    return 'color'
  }

  return 'default'
}

function getBattleSummary(userId) {
  const history = readStoredArray('pluggarena.battleResults')
    .filter((result) => result.userId === userId)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  return {
    draws: history.filter((result) => result.outcome === 'draw').length,
    latest: history[0] || null,
    losses: history.filter((result) => result.outcome === 'loss').length,
    total: history.length,
    wins: history.filter((result) => result.outcome === 'win').length,
  }
}

function getOutcomeLabel(outcome) {
  if (outcome === 'win') {
    return 'Vinst'
  }

  if (outcome === 'loss') {
    return 'Förlust'
  }

  return 'Oavgjort'
}

function Profile({ streak, userId, username, xp }) {
  const levelProgress = getLevelProgress(xp)
  const ownedItems = readStoredArray(`pluggarena.xpShop.${userId}`)
  const achievementCount = getAchievementCount(userId, streak, xp)
  const battleSummary = getBattleSummary(userId)
  const frameClass = getFrameClass(ownedItems)
  const initial = username?.trim().charAt(0).toLocaleUpperCase('sv-SE') || 'P'

  return (
    <div className="profile-page">
      <section className="panel profile-hero-panel">
        <div className={`profile-avatar-frame ${frameClass}`}>
          <div className="profile-avatar">{initial}</div>
        </div>

        <div className="profile-hero-copy">
          <p className="eyebrow">Din profil</p>
          <h2>{username}</h2>
          <span>Nivå {levelProgress.currentLevel}</span>
        </div>

        <div className="profile-xp-total">
          <span>Total XP</span>
          <strong>{xp}</strong>
        </div>
      </section>

      <section className="profile-stat-grid" aria-label="Profilstatistik">
        <article>
          <span>Nivå</span>
          <strong>{levelProgress.currentLevel}</strong>
          <small>
            {levelProgress.nextLevel
              ? `${levelProgress.xpToNext} XP till nivå ${levelProgress.nextLevel}`
              : 'Maxnivå'}
          </small>
        </article>
        <article>
          <span>Streak</span>
          <strong>{streak} dagar</strong>
          <small>Fortsätt plugga regelbundet</small>
        </article>
        <article>
          <span>Achievements</span>
          <strong>{achievementCount} / 6</strong>
          <small>Upplåsta prestationer</small>
        </article>
      </section>

      <section className="panel profile-collection-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">XP Shop</p>
            <h2>Din samling</h2>
          </div>
          <span className="profile-collection-count">
            {ownedItems.length} ägda
          </span>
        </div>

        {ownedItems.length > 0 ? (
          <div className="profile-owned-items">
            {ownedItems.map((itemId) => (
              <article key={itemId}>
                <span aria-hidden="true">
                  {itemId === 'premium-badge' ? '★' : '◇'}
                </span>
                <strong>{shopItemNames[itemId] || itemId}</strong>
                <small>Upplåst</small>
              </article>
            ))}
          </div>
        ) : (
          <p className="profile-empty-state">
            Du har inte köpt något ännu. Besök XP Shop på Hem för att låsa upp
            profilramar och badges.
          </p>
        )}
      </section>

      <section className="panel profile-battle-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Senaste battle-statistik</p>
            <h2>Arenaresultat</h2>
          </div>
          <span className="profile-battle-total">
            {battleSummary.total} matcher
          </span>
        </div>

        <div className="profile-battle-stats">
          <article>
            <span>Vinster</span>
            <strong>{battleSummary.wins}</strong>
          </article>
          <article>
            <span>Oavgjorda</span>
            <strong>{battleSummary.draws}</strong>
          </article>
          <article>
            <span>Förluster</span>
            <strong>{battleSummary.losses}</strong>
          </article>
        </div>

        {battleSummary.latest ? (
          <div className="profile-latest-battle">
            <div>
              <span>Senaste matchen</span>
              <strong>
                {getOutcomeLabel(battleSummary.latest.outcome)} mot{' '}
                {battleSummary.latest.opponentName || 'motståndare'}
              </strong>
            </div>
            <div>
              <span>{battleSummary.latest.subject}</span>
              <strong>+{battleSummary.latest.xp || 0} XP</strong>
            </div>
          </div>
        ) : (
          <p className="profile-empty-state">
            Ingen battlehistorik ännu. Dina senaste lokala arenaresultat visas
            här.
          </p>
        )}
      </section>
    </div>
  )
}

export default Profile
