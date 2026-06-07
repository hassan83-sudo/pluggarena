function Dashboard({
  children,
  hasClaimedToday,
  level,
  onClaimDailyReward,
  onLogout,
  showStats,
  streak,
  username,
  xp,
}) {
  const nextLevelXp = level === 'Rookie' ? 500 : level === 'Smart' ? 1000 : xp
  const progress = level === 'Genius'
    ? 100
    : Math.min(Math.round((xp / nextLevelXp) * 100), 100)

  return (
    <header className={showStats ? 'dashboard' : 'dashboard dashboard-tabs-only'}>
      <div className="hero-copy">
        <div className="hero-topline">
          <p className="eyebrow">PluggArena v2</p>
          <button className="ghost-button" type="button" onClick={onLogout}>
            Logga ut
          </button>
        </div>
        <h1>PluggArena</h1>
        <p className="subtitle">
          Hej {username}, välj ämne, samla XP och bygg streak med ditt squad.
        </p>
        {children}
      </div>

      {showStats && (
        <article className="stat-card arena-status-card" aria-label="Din status">
          <div className="arena-status-values">
            <div>
              <span>XP</span>
              <strong>{xp}</strong>
            </div>
            <div>
              <span>Nivå</span>
              <strong>{level}</strong>
            </div>
            <div>
              <span>Streak</span>
              <strong>{streak} dagar</strong>
            </div>
          </div>

          <div className="arena-status-progress">
            <div>
              <span>Progress till nästa nivå</span>
              <small>
                {level === 'Genius' ? 'Maxnivå' : `${progress}%`}
              </small>
            </div>
            <div className="progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="arena-status-action">
            <small>Daglig bonus</small>
            <button type="button" onClick={onClaimDailyReward} disabled={hasClaimedToday}>
              {hasClaimedToday ? 'Bonus hämtad' : 'Hämta +50 XP'}
            </button>
          </div>
        </article>
      )}
    </header>
  )
}

export default Dashboard
