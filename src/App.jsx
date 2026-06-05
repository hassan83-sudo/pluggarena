import { useEffect, useMemo, useState } from 'react'
import './App.css'
import AIStudyBuddy from './components/AIStudyBuddy.jsx'
import BattleMode from './components/BattleMode.jsx'
import Dashboard from './components/Dashboard.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import Login from './components/Login.jsx'
import ProfileSettings from './components/ProfileSettings.jsx'
import Progress from './components/Progress.jsx'
import Quiz from './components/Quiz.jsx'
import Rewards from './components/Rewards.jsx'
import Squad from './components/Squad.jsx'
import { questionBank, subjects } from './data/questions.js'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'

const storageKeys = {
  demoUsers: 'pluggarena.demoUsers',
  localAuth: 'pluggarena.localAuth',
  progress: 'pluggarena.progress',
  quizResults: 'pluggarena.quizResults',
  squad: 'pluggarena.squad',
}

const defaultDemoUsers = [
  { name: 'Sara', xp: 1240 },
  { name: 'Optical', xp: 980 },
  { name: 'Rana', xp: 760 },
  { name: 'admin', xp: 640 },
]

const initialProgress = {
  correctAnswers: 0,
  lastRewardDate: '',
  streak: 0,
  username: '',
  xp: 320,
}

function getUserKey(user) {
  return user?.id || user?.email || 'local'
}

function getScopedKey(baseKey, user) {
  return `${baseKey}.${getUserKey(user)}`
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function migrateDemoNames(value) {
  const legacyNames = {
    [['A', 'li'].join('')]: 'Optical',
    [['Em', 'ma'].join('')]: 'Rana',
  }

  if (typeof value === 'string' && legacyNames[value]) {
    return legacyNames[value]
  }

  if (Array.isArray(value)) {
    return value.map(migrateDemoNames)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, migrateDemoNames(entry)]),
    )
  }

  return value
}

function readStoredValue(key, fallback) {
  try {
    const storedValue = window.localStorage.getItem(key)
    const parsedValue = storedValue
      ? migrateDemoNames(JSON.parse(storedValue))
      : null

    if (!storedValue) {
      return fallback
    }

    writeStoredValue(key, parsedValue)

    if (Array.isArray(fallback)) {
      return Array.isArray(parsedValue) ? parsedValue : fallback
    }

    if (fallback && typeof fallback === 'object') {
      return parsedValue && typeof parsedValue === 'object'
        ? { ...fallback, ...parsedValue }
        : fallback
    }

    return parsedValue ?? fallback
  } catch {
    return fallback
  }
}

function writeStoredValue(key, value) {
  try {
    if (value === null) {
      window.localStorage.removeItem(key)
      return
    }

    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Local progress should never block the app if storage is unavailable.
  }
}

function clearPluggArenaStorage() {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('pluggarena.'))
      .forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // Settings should still reset the in-memory state if storage is unavailable.
  }
}

function readProgress(user) {
  return readStoredValue(
    getScopedKey(storageKeys.progress, user),
    readStoredValue(storageKeys.progress, initialProgress),
  )
}

function writeProgress(user, value) {
  writeStoredValue(getScopedKey(storageKeys.progress, user), value)
  writeStoredValue(storageKeys.progress, value)
}

function readSquad(user) {
  return readStoredValue(
    getScopedKey(storageKeys.squad, user),
    readStoredValue(storageKeys.squad, { name: '' }),
  ).name
}

function writeSquad(user, name) {
  writeStoredValue(getScopedKey(storageKeys.squad, user), { name })
  writeStoredValue(storageKeys.squad, { name })
}

function getLevel(xp) {
  if (xp >= 1000) {
    return 'Genius'
  }

  if (xp >= 500) {
    return 'Smart'
  }

  return 'Rookie'
}

function getBadges({ correctAnswers, streak, xp }) {
  return [
    { name: 'Rookie Badge', unlocked: xp >= 100 },
    { name: 'Math Master Badge', unlocked: correctAnswers >= 10 },
    { name: '7 Day Streak Badge', unlocked: streak >= 7 },
  ]
}

function getUnlockedBadgeNames(progress) {
  return getBadges(progress)
    .filter((badge) => badge.unlocked)
    .map((badge) => badge.name)
}

function getUsernameFromUser(user) {
  return (
    user?.user_metadata?.username ||
    user?.email?.split('@')[0] ||
    'Elev'
  )
}

function mapProfileToProgress(profile, user) {
  return {
    ...initialProgress,
    correctAnswers: profile?.correct_answers ?? initialProgress.correctAnswers,
    lastRewardDate: profile?.last_reward_date ?? initialProgress.lastRewardDate,
    streak: profile?.streak ?? initialProgress.streak,
    username: profile?.username || getUsernameFromUser(user),
    xp: profile?.xp ?? initialProgress.xp,
  }
}

async function loadSupabaseProfile(user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, xp, streak, correct_answers, last_reward_date, badges, squad')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    throw error
  }

  const progress = mapProfileToProgress(data, user)
  const squad = data?.squad ?? ''

  if (!data) {
    await saveSupabaseProfile(user, progress, squad)
  }

  return { progress, squad }
}

async function saveSupabaseProfile(user, progress, squad) {
  if (!isSupabaseConfigured || !user?.id) {
    return
  }

  const { error } = await supabase.from('profiles').upsert(
    {
      badges: getUnlockedBadgeNames(progress),
      correct_answers: progress.correctAnswers,
      email: user.email,
      id: user.id,
      last_reward_date: progress.lastRewardDate,
      squad,
      streak: progress.streak,
      updated_at: new Date().toISOString(),
      username: progress.username || getUsernameFromUser(user),
      xp: progress.xp,
    },
    { onConflict: 'id' },
  )

  if (error) {
    throw error
  }
}

async function saveSupabaseQuizResult(user, result) {
  if (!isSupabaseConfigured || !user?.id) {
    return
  }

  const { error } = await supabase.from('quiz_results').insert({
    correct_answer: result.correctAnswer,
    is_correct: result.isCorrect,
    question: result.question,
    selected_answer: result.selectedAnswer,
    subject: result.subject,
    user_id: user.id,
    xp_delta: result.xpDelta,
  })

  if (error) {
    throw error
  }
}

function App() {
  const [user, setUser] = useState(null)
  const [authStatus, setAuthStatus] = useState('loading')
  const [authError, setAuthError] = useState('')
  const [progress, setProgress] = useState(initialProgress)
  const [squad, setSquad] = useState('')
  const [demoUsers, setDemoUsers] = useState(() =>
    readStoredValue(storageKeys.demoUsers, defaultDemoUsers),
  )
  const [activeView, setActiveView] = useState('arena')
  const [selectedSubject, setSelectedSubject] = useState('Matematik')
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const todayKey = getTodayKey()
  const level = getLevel(progress.xp)
  const badges = getBadges(progress)
  const hasClaimedToday = progress.lastRewardDate === todayKey
  const leaderboard = useMemo(
    () => [
      { name: progress.username, xp: progress.xp },
      ...demoUsers,
    ].filter(
      (entry, index, entries) =>
        entries.findIndex(
          (candidate) =>
            candidate.name.toLocaleLowerCase('sv-SE') ===
            entry.name.toLocaleLowerCase('sv-SE'),
        ) === index,
    ).sort((a, b) => b.xp - a.xp),
    [demoUsers, progress.username, progress.xp],
  )

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      setAuthStatus('loading')
      setAuthError('')

      if (!isSupabaseConfigured) {
        const localUser = readStoredValue(storageKeys.localAuth, null)

        if (isMounted && localUser?.email) {
          setUser(localUser)
          setProgress(readProgress(localUser))
          setSquad(readSquad(localUser))
        }

        if (isMounted) {
          setAuthStatus('ready')
        }

        return
      }

      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        const sessionUser = data.session?.user ?? null

        if (sessionUser) {
          const loadedData = await loadSupabaseProfile(sessionUser)

          if (isMounted) {
            setUser(sessionUser)
            setProgress(loadedData.progress)
            setSquad(loadedData.squad)
            writeProgress(sessionUser, loadedData.progress)
            writeSquad(sessionUser, loadedData.squad)
          }
        }
      } catch (error) {
        if (isMounted) {
          setAuthError(
            error instanceof Error
              ? error.message
              : 'Kunde inte läsa Supabase-sessionen.',
          )
        }
      } finally {
        if (isMounted) {
          setAuthStatus('ready')
        }
      }
    }

    loadSession()

    if (!isSupabaseConfigured) {
      return () => {
        isMounted = false
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const sessionUser = session?.user ?? null

        if (!isMounted) {
          return
        }

        if (!sessionUser) {
          setUser(null)
          setProgress(initialProgress)
          setSquad('')
          return
        }

        try {
          const loadedData = await loadSupabaseProfile(sessionUser)

          if (isMounted) {
            setUser(sessionUser)
            setProgress(loadedData.progress)
            setSquad(loadedData.squad)
            writeProgress(sessionUser, loadedData.progress)
            writeSquad(sessionUser, loadedData.squad)
          }
        } catch (error) {
          if (isMounted) {
            setAuthError(
              error instanceof Error
                ? error.message
                : 'Kunde inte läsa Supabase-profilen.',
            )
          }
        }
      },
    )

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  function persistProgress(nextProgress, nextSquad = squad) {
    setProgress(nextProgress)
    writeProgress(user, nextProgress)

    if (isSupabaseConfigured && user?.id) {
      saveSupabaseProfile(user, nextProgress, nextSquad).catch((error) => {
        setAuthError(
          error instanceof Error
            ? error.message
            : 'Kunde inte spara profilen i Supabase.',
        )
      })
    }
  }

  async function handleLogin({ email, mode, password, username }) {
    setAuthError('')

    if (!isSupabaseConfigured) {
      const localUser = {
        email,
        id: email,
        user_metadata: { username: username || email.split('@')[0] },
      }
      const nextProgress = {
        ...readProgress(localUser),
        username: username || email.split('@')[0],
      }

      writeStoredValue(storageKeys.localAuth, localUser)
      setUser(localUser)
      setProgress(nextProgress)
      setSquad(readSquad(localUser))
      writeProgress(localUser, nextProgress)
      return
    }

    const response =
      mode === 'register'
        ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        })
        : await supabase.auth.signInWithPassword({ email, password })

    if (response.error) {
      throw response.error
    }

    if (mode === 'register' && !response.data.session) {
      setAuthError('Kontot är skapat. Bekräfta e-posten innan du loggar in.')
      return
    }

    const nextUser = response.data.session?.user ?? response.data.user

    if (!nextUser) {
      setAuthError('Kunde inte läsa användaren från Supabase.')
      return
    }

    const loadedData = await loadSupabaseProfile(nextUser)

    setUser(nextUser)
    setProgress({
      ...loadedData.progress,
      username: loadedData.progress.username || username || email.split('@')[0],
    })
    setSquad(loadedData.squad)
  }

  async function handleLogout() {
    if (isSupabaseConfigured && user?.id) {
      const { error } = await supabase.auth.signOut()

      if (error) {
        setAuthError(error.message)
      }
    }

    writeStoredValue(storageKeys.localAuth, null)
    setUser(null)
    setProgress(initialProgress)
    setSquad('')
  }

  function saveQuizResult(result) {
    const nextResult = {
      ...result,
      createdAt: new Date().toISOString(),
    }
    const resultsKey = getScopedKey(storageKeys.quizResults, user)
    const storedResults = readStoredValue(resultsKey, [])

    writeStoredValue(resultsKey, [nextResult, ...storedResults].slice(0, 100))

    if (isSupabaseConfigured && user?.id) {
      saveSupabaseQuizResult(user, nextResult).catch((error) => {
        setAuthError(
          error instanceof Error
            ? error.message
            : 'Kunde inte spara quizresultatet i Supabase.',
        )
      })
    }
  }

  function handleAnswerResult(result) {
    const xpDelta = result.isCorrect ? 100 : 0
    const nextProgress = result.isCorrect ? {
      ...progress,
      correctAnswers: progress.correctAnswers + 1,
      xp: progress.xp + 100,
    } : progress

    saveQuizResult({ ...result, xpDelta })

    if (result.isCorrect) {
      persistProgress(nextProgress)
    }
  }

  function claimDailyReward() {
    if (hasClaimedToday) {
      return
    }

    persistProgress({
      ...progress,
      lastRewardDate: todayKey,
      streak: progress.streak + 1,
      xp: progress.xp + 50,
    })
  }

  function saveSquad(name) {
    setSquad(name)
    writeSquad(user, name)

    if (isSupabaseConfigured && user?.id) {
      saveSupabaseProfile(user, progress, name).catch((error) => {
        setAuthError(
          error instanceof Error
            ? error.message
            : 'Kunde inte spara squad i Supabase.',
        )
      })
    }
  }

  function awardBattleXp(xp) {
    persistProgress({
      ...progress,
      xp: progress.xp + xp,
    })
  }

  function resetDemoData() {
    const nextProgress = {
      ...initialProgress,
      username: progress.username || getUsernameFromUser(user),
    }
    const nextSquad = 'PluggSquad'

    clearPluggArenaStorage()
    writeStoredValue(storageKeys.demoUsers, defaultDemoUsers)
    writeProgress(user, nextProgress)
    writeSquad(user, nextSquad)
    writeStoredValue(getScopedKey(storageKeys.quizResults, user), [])
    writeStoredValue('pluggarena.battles', [])
    writeStoredValue('pluggarena.battleResults', [])

    if (!isSupabaseConfigured) {
      writeStoredValue(storageKeys.localAuth, user)
    }

    setProgress(nextProgress)
    setSquad(nextSquad)
    setDemoUsers(defaultDemoUsers)
    setSelectedSubject('Matematik')
    setCurrentQuestion(null)
    setActiveView('arena')
  }

  if (authStatus === 'loading') {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">PluggArena</p>
          <h1>Laddar...</h1>
        </section>
      </main>
    )
  }

  if (!user) {
    return (
      <Login
        authError={authError}
        authProvider={isSupabaseConfigured ? 'supabase' : 'local'}
        onLogin={handleLogin}
      />
    )
  }

  return (
    <main className="app-shell">
      <Dashboard
        hasClaimedToday={hasClaimedToday}
        level={level}
        onClaimDailyReward={claimDailyReward}
        onLogout={handleLogout}
        streak={progress.streak}
        username={progress.username}
        xp={progress.xp}
      />

      <nav className="app-view-tabs" aria-label="PluggArena vy">
        <button
          className={activeView === 'arena' ? 'active' : ''}
          onClick={() => setActiveView('arena')}
          type="button"
        >
          Arena
        </button>
        <button
          className={activeView === 'battle' ? 'active' : ''}
          onClick={() => setActiveView('battle')}
          type="button"
        >
          Battle Mode
        </button>
      </nav>

      {activeView === 'battle' ? (
        <BattleMode
          onAwardXp={awardBattleXp}
          questionBank={questionBank}
          subjects={subjects}
          user={{ id: user.id, name: progress.username }}
        />
      ) : (
        <>
          <section className="app-grid" aria-label="PluggArena innehåll">
            <section className="panel battle-entry-panel">
              <div>
                <p className="eyebrow">Battle Mode</p>
                <h2>1 mot 1 Battle</h2>
                <p>
                  Utmana en vän i Matematik, Engelska eller Svenska. Först till
                  10 rätt svar vinner.
                </p>
              </div>
              <div className="battle-entry-actions">
                <button type="button" onClick={() => setActiveView('battle')}>
                  Skapa battle
                </button>
                <button type="button" onClick={() => setActiveView('battle')}>
                  Gå med via kod
                </button>
              </div>
            </section>
            <Quiz
              key={selectedSubject}
              onAnswerResult={handleAnswerResult}
              onQuestionChange={setCurrentQuestion}
              questionBank={questionBank}
              selectedSubject={selectedSubject}
              subjects={subjects}
              onSubjectChange={setSelectedSubject}
            />
            <AIStudyBuddy question={currentQuestion} subject={selectedSubject} />
            <Progress
              badges={badges}
              correctAnswers={progress.correctAnswers}
              level={level}
              xp={progress.xp}
            />
            <Leaderboard currentUser={progress.username} entries={leaderboard} />
            <Squad
              members={demoUsers.map((entry) => entry.name)}
              onCreateSquad={saveSquad}
              onJoinSquad={saveSquad}
              squad={squad}
              userXp={progress.xp}
            />
            <Rewards xp={progress.xp} />
          </section>
          <ProfileSettings onResetDemoData={resetDemoData} />
        </>
      )}
    </main>
  )
}

export default App
