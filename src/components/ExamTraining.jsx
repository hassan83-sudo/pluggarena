import { useState } from 'react'

function getStorageKey(userId) {
  return `pluggarena.examResults.${userId}`
}

function readResults(userId) {
  try {
    const value = window.localStorage.getItem(getStorageKey(userId))
    const parsedValue = value ? JSON.parse(value) : []

    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

function saveResults(userId, results) {
  try {
    window.localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(results),
    )
  } catch {
    // Results remain available for this session if storage is unavailable.
  }
}

function createResultId() {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getXpReward(percentage) {
  if (percentage >= 90) {
    return 100
  }

  if (percentage >= 75) {
    return 75
  }

  if (percentage >= 50) {
    return 50
  }

  return 25
}

function ExamTraining({
  onComplete,
  questionBank,
  subjects,
  userId,
}) {
  const [results, setResults] = useState(() => readResults(userId))
  const [selectedSubject, setSelectedSubject] = useState(subjects[0])
  const [examQuestions, setExamQuestions] = useState([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [finishedResult, setFinishedResult] = useState(null)
  const isRunning = examQuestions.length > 0 && !finishedResult
  const currentQuestion = examQuestions[questionIndex]
  const completedCount = results.length
  const bestResult = completedCount
    ? Math.max(...results.map((result) => result.percentage))
    : 0
  const averageResult = completedCount
    ? Math.round(
      results.reduce((total, result) => total + result.percentage, 0) /
      completedCount,
    )
    : 0

  function startExam() {
    setExamQuestions(questionBank[selectedSubject].slice(0, 10))
    setQuestionIndex(0)
    setAnswers([])
    setSelectedAnswer('')
    setFinishedResult(null)
  }

  function chooseAnswer(option) {
    if (selectedAnswer) {
      return
    }

    setSelectedAnswer(option)
  }

  function submitAnswer() {
    if (!selectedAnswer || !currentQuestion) {
      return
    }

    const nextAnswers = [
      ...answers,
      {
        correct: selectedAnswer === currentQuestion.answer,
        question: currentQuestion.question,
        selectedAnswer,
      },
    ]

    if (questionIndex < examQuestions.length - 1) {
      setAnswers(nextAnswers)
      setQuestionIndex((current) => current + 1)
      setSelectedAnswer('')
      return
    }

    const correctAnswers = nextAnswers.filter((answer) => answer.correct).length
    const percentage = Math.round(
      (correctAnswers / examQuestions.length) * 100,
    )
    const xpReward = getXpReward(percentage)
    const result = {
      correctAnswers,
      createdAt: new Date().toISOString(),
      id: createResultId(),
      percentage,
      subject: selectedSubject,
      totalQuestions: examQuestions.length,
      xpReward,
    }
    const nextResults = [result, ...results]

    saveResults(userId, nextResults)
    setResults(nextResults)
    setAnswers(nextAnswers)
    setFinishedResult(result)
    setSelectedAnswer('')
    onComplete(xpReward)
  }

  function resetExam() {
    setExamQuestions([])
    setQuestionIndex(0)
    setAnswers([])
    setSelectedAnswer('')
    setFinishedResult(null)
  }

  const progress = isRunning
    ? Math.round(((questionIndex + 1) / examQuestions.length) * 100)
    : 0

  return (
    <div className="exam-training-page">
      <section className="panel exam-header-panel">
        <div>
          <p className="eyebrow">Träna inför provet</p>
          <h2>Provträning</h2>
          <p>Genomför 10 frågor och få en samlad bedömning efteråt.</p>
        </div>
        <span className={isRunning ? 'exam-status active' : 'exam-status'}>
          {isRunning ? `Fråga ${questionIndex + 1} av 10` : 'Redo'}
        </span>
      </section>

      <section className="exam-stat-grid" aria-label="Provstatistik">
        <article>
          <span>Bästa resultat</span>
          <strong>{bestResult}%</strong>
        </article>
        <article>
          <span>Genomförda prov</span>
          <strong>{completedCount}</strong>
        </article>
        <article>
          <span>Genomsnitt</span>
          <strong>{averageResult}%</strong>
        </article>
      </section>

      {!isRunning && !finishedResult && (
        <section className="panel exam-start-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Välj ämne</p>
              <h2>Starta ett nytt prov</h2>
            </div>
          </div>
          <div className="exam-subjects">
            {subjects.map((subject) => (
              <button
                className={selectedSubject === subject ? 'active' : ''}
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                type="button"
              >
                {subject}
              </button>
            ))}
          </div>
          <button className="exam-start-button" onClick={startExam} type="button">
            Starta prov i {selectedSubject}
          </button>
        </section>
      )}

      {isRunning && (
        <section className="panel exam-question-panel">
          <div className="exam-progress" aria-label="Provprogress">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="exam-question-heading">
            <span>{selectedSubject}</span>
            <strong>{questionIndex + 1} / {examQuestions.length}</strong>
          </div>
          <h2>{currentQuestion.question}</h2>
          <div className="exam-answer-grid">
            {currentQuestion.options.map((option) => (
              <button
                className={selectedAnswer === option ? 'selected' : ''}
                key={option}
                onClick={() => chooseAnswer(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
          <button
            className="exam-next-button"
            disabled={!selectedAnswer}
            onClick={submitAnswer}
            type="button"
          >
            {questionIndex === examQuestions.length - 1
              ? 'Lämna in prov'
              : 'Nästa fråga'}
          </button>
        </section>
      )}

      {finishedResult && (
        <section className="panel exam-result-panel">
          <span className="exam-result-icon" aria-hidden="true">✓</span>
          <div>
            <p className="eyebrow">Provresultat</p>
            <h2>{finishedResult.percentage}% rätt</h2>
            <p>
              {finishedResult.correctAnswers} av {finishedResult.totalQuestions}
              {' '}rätt i {finishedResult.subject}.
            </p>
          </div>
          <div className="exam-result-xp">
            <span>Belöning</span>
            <strong>+{finishedResult.xpReward} XP</strong>
          </div>
          <button onClick={resetExam} type="button">
            Gör ett nytt prov
          </button>
        </section>
      )}
    </div>
  )
}

export default ExamTraining
