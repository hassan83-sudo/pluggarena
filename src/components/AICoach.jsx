import { useState } from 'react'

const dailyQuestTargets = {
  aiQuestions: 3,
  analyzedAssignments: 1,
  quizCompleted: 1,
  xpEarned: 100,
}

function getStorageKey(userId, date) {
  return `pluggarena.aiCoachTips.${userId}.${date}`
}

function readSavedTips(userId, date) {
  try {
    const value = window.localStorage.getItem(getStorageKey(userId, date))
    const parsedValue = value ? JSON.parse(value) : null

    return Array.isArray(parsedValue?.tips) ? parsedValue : null
  } catch {
    return null
  }
}

function saveTips(userId, date, tips) {
  const result = {
    createdAt: new Date().toISOString(),
    date,
    tips,
  }

  try {
    window.localStorage.setItem(
      getStorageKey(userId, date),
      JSON.stringify(result),
    )
  } catch {
    // Tips remain available for this session if localStorage is unavailable.
  }

  return result
}

function getQuestProgress(quests) {
  return Object.entries(dailyQuestTargets).filter(
    ([key, target]) => quests[key] >= target,
  ).length
}

function buildTips({
  dailyQuests,
  nextLevelXp,
  stats,
  streak,
  weeklyActivity,
}) {
  const candidates = []
  const completedQuests = getQuestProgress(dailyQuests)
  const weeklyTotal =
    weeklyActivity.quizCompleted +
    weeklyActivity.analyzedAssignments +
    weeklyActivity.aiQuestions

  if (streak === 0) {
    candidates.push({
      priority: 100,
      text: 'Starta din streak idag med ett kort quiz eller dagens bonus. Ett litet pass räcker.',
      title: 'Bygg första dagen',
    })
  } else if (streak < 7) {
    candidates.push({
      priority: 88,
      text: `Du har ${streak} dagar i rad. Gör en snabb aktivitet idag för att ta nästa steg mot 7 dagar.`,
      title: 'Skydda din streak',
    })
  } else {
    candidates.push({
      priority: 62,
      text: `${streak} dagars streak är starkt. Behåll rytmen med ett kort repetitionspass idag.`,
      title: 'Behåll rytmen',
    })
  }

  if (completedQuests < 4) {
    const remaining = 4 - completedQuests
    candidates.push({
      priority: 96 - completedQuests * 8,
      text: `Du har ${remaining} av dagens uppdrag kvar. Börja med det minsta för snabb fart framåt.`,
      title: 'Fokusera på Daily Quests',
    })
  } else {
    candidates.push({
      priority: 45,
      text: 'Alla Daily Quests är klara. Använd resten av passet till repetition eller ett bonusquiz.',
      title: 'Dagens mål är säkrat',
    })
  }

  if (nextLevelXp > 0) {
    const quizEstimate = Math.max(Math.ceil(nextLevelXp / 100), 1)
    candidates.push({
      priority: nextLevelXp <= 300 ? 92 : 68,
      text: `Du har ${nextLevelXp} XP till nästa nivå. Cirka ${quizEstimate} rätta quizsvar kan ta dig dit.`,
      title: 'Närma dig nästa nivå',
    })
  } else {
    candidates.push({
      priority: 40,
      text: 'Du är på toppnivån i nuvarande nivåsystem. Samla XP för rewards och utmana ditt eget rekord.',
      title: 'Sätt ett eget XP-mål',
    })
  }

  if (stats.quizCompleted === 0) {
    candidates.push({
      priority: 94,
      text: 'Du har inget genomfört quiz ännu. Börja med ett ämne du känner dig trygg i.',
      title: 'Gör ditt första quiz',
    })
  } else if (stats.quizCompleted < 5) {
    candidates.push({
      priority: 72,
      text: `Du har genomfört ${stats.quizCompleted} quiz. Ett till idag bygger både vana och XP.`,
      title: 'Fortsätt quizrytmen',
    })
  }

  if (stats.analyzedAssignments === 0) {
    candidates.push({
      priority: 90,
      text: 'Analysera en uppgift för att få en tydlig startpunkt och konkreta nästa steg.',
      title: 'Lås upp uppgiftsinsikter',
    })
  } else if (stats.aiQuestions < Math.max(stats.analyzedAssignments * 2, 3)) {
    candidates.push({
      priority: 76,
      text: `Du har analyserat ${stats.analyzedAssignments} uppgifter. Följ upp med en AI-fråga om det svåraste steget.`,
      title: 'Följ upp din analys',
    })
  }

  if (stats.aiQuestions === 0) {
    candidates.push({
      priority: 86,
      text: 'Ställ en konkret AI-fråga om något du fastnat på och be om en förklaring steg för steg.',
      title: 'Använd din AI-tränare',
    })
  }

  if (weeklyTotal === 0) {
    candidates.push({
      priority: 98,
      text: 'Veckorapporten väntar på första aktiviteten. Ett quiz idag ger dig något att bygga vidare på.',
      title: 'Starta veckorapporten',
    })
  } else {
    const weakestArea = [
      { label: 'quiz', value: weeklyActivity.quizCompleted },
      { label: 'uppgiftsanalys', value: weeklyActivity.analyzedAssignments },
      { label: 'AI-frågor', value: weeklyActivity.aiQuestions },
    ].sort((a, b) => a.value - b.value)[0]

    candidates.push({
      priority: 80,
      text: `Veckorapporten visar minst aktivitet inom ${weakestArea.label}. Lägg nästa korta pass där för bättre balans.`,
      title: 'Balansera veckan',
    })
  }

  return candidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, completedQuests === 4 && weeklyTotal > 0 ? 2 : 3)
    .map(({ text, title }) => ({ text, title }))
}

function AICoach({
  dailyQuests,
  nextLevelXp,
  stats,
  streak,
  userId,
  weeklyActivity,
}) {
  const date = new Date().toISOString().slice(0, 10)
  const [coachResult, setCoachResult] = useState(() => {
    const savedTips = readSavedTips(userId, date)

    return savedTips || saveTips(
      userId,
      date,
      buildTips({
        dailyQuests,
        nextLevelXp,
        stats,
        streak,
        weeklyActivity,
      }),
    )
  })

  function updateTips() {
    setCoachResult(
      saveTips(
        userId,
        date,
        buildTips({
          dailyQuests,
          nextLevelXp,
          stats,
          streak,
          weeklyActivity,
        }),
      ),
    )
  }

  return (
    <section className="panel ai-coach-panel">
      <div className="panel-heading ai-coach-heading">
        <div>
          <p className="eyebrow">Lokal smart coach</p>
          <h2>AI Coach</h2>
        </div>
        <span className="ai-coach-badge">Dagens tips</span>
      </div>

      <div className="ai-coach-intro">
        <span className="ai-coach-icon" aria-hidden="true">AI</span>
        <p>
          Personliga nästa steg baserade på din streak, aktivitet och
          veckorapport.
        </p>
      </div>

      <ol className="ai-coach-tips">
        {coachResult.tips.map((tip, index) => (
          <li key={`${tip.title}-${index}`}>
            <span>{index + 1}</span>
            <div>
              <strong>{tip.title}</strong>
              <p>{tip.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <button className="ai-coach-button" type="button" onClick={updateTips}>
        Uppdatera tips
      </button>
    </section>
  )
}

export default AICoach
