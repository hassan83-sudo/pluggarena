import { useState } from 'react'

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getStorageKey(userId, date = getTodayKey()) {
  return `pluggarena.studyPlan.${userId}.${date}`
}

function readStoredPlan(userId) {
  try {
    const value = window.localStorage.getItem(getStorageKey(userId))
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function createStudyPlan({
  assignmentsWaiting,
  nextLevelXp,
  quizRemaining,
  streak,
}) {
  const assignmentStep = assignmentsWaiting > 0
    ? {
      duration: assignmentsWaiting > 2 ? 15 : 10,
      text: 'Repetera din senaste uppgift och markera det som känns svårt.',
    }
    : {
      duration: 10,
      text: 'Repetera en tidigare uppgift för att hålla kunskapen färsk.',
    }
  const quizStep = {
    duration: quizRemaining > 2 ? 15 : 10,
    text: quizRemaining > 0
      ? `Gör ett quiz. Du har ${quizRemaining} kvar i dagens mål.`
      : 'Gör ett bonusquiz och försök slå ditt senaste resultat.',
  }
  const aiStep = {
    duration: nextLevelXp <= 100 ? 15 : 20,
    text: nextLevelXp <= 100
      ? 'Fråga AI om ett svårt moment och ta de sista stegen mot nästa nivå.'
      : 'Fråga AI om det du inte förstår och skriv ner en användbar ledtråd.',
  }
  const reflectionStep = {
    duration: 5,
    text: streak > 0
      ? `Sammanfatta vad du lärt dig och håll din ${streak}-dagars streak vid liv.`
      : 'Sammanfatta vad du lärt dig och starta din nya streak.',
  }

  return {
    createdAt: new Date().toISOString(),
    date: getTodayKey(),
    items: [assignmentStep, quizStep, aiStep, reflectionStep],
  }
}

function StudyPlan({
  assignmentsWaiting,
  nextLevelXp,
  quizRemaining,
  streak,
  userId,
}) {
  const [plan, setPlan] = useState(() => readStoredPlan(userId))

  function generatePlan() {
    const nextPlan = createStudyPlan({
      assignmentsWaiting,
      nextLevelXp,
      quizRemaining,
      streak,
    })

    try {
      window.localStorage.setItem(
        getStorageKey(userId, nextPlan.date),
        JSON.stringify(nextPlan),
      )
    } catch {
      // The generated plan should still be usable if localStorage is unavailable.
    }

    setPlan(nextPlan)
  }

  const totalMinutes = plan?.items.reduce(
    (total, item) => total + item.duration,
    0,
  ) || 0

  return (
    <section className="panel study-plan-panel">
      <div className="panel-heading study-plan-heading">
        <div>
          <p className="eyebrow">AI Pluggschema</p>
          <h2>Dagens pluggplan</h2>
        </div>
        {plan && <span className="study-plan-duration">{totalMinutes} min</span>}
      </div>

      {plan ? (
        <ol className="study-plan-list">
          {plan.items.map((item, index) => (
            <li key={`${item.duration}-${item.text}`}>
              <span>{index + 1}</span>
              <div>
                <strong>{item.duration} min</strong>
                <p>{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="study-plan-empty">
          <strong>Redo för ett smartare pluggpass?</strong>
          <p>
            Planen anpassas efter dina uppgifter, quiz, nästa nivå och streak.
          </p>
        </div>
      )}

      <button className="study-plan-button" type="button" onClick={generatePlan}>
        {plan ? 'Uppdatera pluggplan' : 'Skapa pluggplan'}
      </button>
    </section>
  )
}

export default StudyPlan
