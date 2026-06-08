function Dashboard({
  assignmentsWaiting,
  children,
  hasClaimedToday,
  level,
  nextLevelXp,
  onClaimDailyReward,
  onLogout,
  quizRemaining,
  rewardXpRemaining,
  showStats,
  streak,
  username,
  xp,
}) {
  const nextLevelTarget = level === 'Rookie' ? 500 : level === 'Smart' ? 1000 : xp
  const progress = level === 'Genius'
    ? 100
    : Math.min(Math.round((xp / nextLevelTarget) * 100), 100)

  return (
    <header className={showStats ? 'dashboard' : 'dashboard dashboard-tabs-only'}>
      <div className="hero-copy">
        <div className="hero-topline">
          <p className="eyebrow">Din studiearena</p>
          <button className="ghost-button" type="button" onClick={onLogout}>
            Logga ut
          </button>
        </div>
        <h1>PluggArena</h1>
        <p className="subtitle">
          Hej {username}, redo att bygga vidare på din streak?
        </p>

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

            <div className="dashboard-quick-stats" aria-label="Snabb statistik">
              <div>
                <span>Uppgifter kvar</span>
                <strong>{assignmentsWaiting}</strong>
              </div>
              <div>
                <span>Quiz kvar</span>
                <strong>{quizRemaining}</strong>
              </div>
              <div>
                <span>XP till nästa nivå</span>
                <strong>{nextLevelXp}</strong>
              </div>
              <div>
                <span>XP till Väla-kort</span>
                <strong>{rewardXpRemaining}</strong>
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

        {children}
      </div>
    </header>
  )
}

export default Dashboard
