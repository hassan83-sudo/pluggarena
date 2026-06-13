import { useState } from 'react'
import { buildGeneratedQuiz } from '../lib/generatedQuiz.js'

const storagePrefix = 'pluggarena.generatedQuizzes'

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
}

function readStoredQuizzes(userId) {
  try {
    const value = window.localStorage.getItem(`${storagePrefix}.${userId}`)
    const parsedValue = value ? JSON.parse(value) : []
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

function saveStoredQuiz(userId, quiz) {
  const quizzes = readStoredQuizzes(userId)
  const nextQuizzes = [
    quiz,
    ...quizzes.filter((item) => item.id !== quiz.id),
  ].slice(0, 30)

  window.localStorage.setItem(
    `${storagePrefix}.${userId}`,
    JSON.stringify(nextQuizzes),
  )
}

function GeneratedAssignmentQuiz({
  analysis,
  assignment,
  onComplete = () => {},
  userId,
}) {
  const [quiz, setQuiz] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)

  function startQuiz() {
    const nextQuiz = {
      assignmentId: assignment?.id || null,
      assignmentTitle:
        assignment?.title || assignment?.fileName || 'Analyserad uppgift',
      createdAt: new Date().toISOString(),
      id: createId(),
      questions: buildGeneratedQuiz(analysis, assignment),
      subject: analysis.subject,
    }

    saveStoredQuiz(userId, nextQuiz)
    setQuiz(nextQuiz)
    setQuestionIndex(0)
    setSelectedAnswer('')
    setAnswers([])
    setResult(null)
  }

  function submitAnswer() {
    if (!selectedAnswer || !quiz) {
      return
    }

    const currentQuestion = quiz.questions[questionIndex]
    const nextAnswers = [
      ...answers,
      {
        answer: selectedAnswer,
        isCorrect: selectedAnswer === currentQuestion.answer,
        questionId: currentQuestion.id,
      },
    ]

    if (questionIndex < quiz.questions.length - 1) {
      setAnswers(nextAnswers)
      setQuestionIndex((index) => index + 1)
      setSelectedAnswer('')
      return
    }

    const correctAnswers = nextAnswers.filter((answer) => answer.isCorrect).length
    const totalQuestions = quiz.questions.length
    const percentage = Math.round((correctAnswers / totalQuestions) * 100)
    const xp = correctAnswers * 10
    const completedQuiz = {
      ...quiz,
      answers: nextAnswers,
      completedAt: new Date().toISOString(),
      correctAnswers,
      percentage,
      totalQuestions,
      xp,
    }

    saveStoredQuiz(userId, completedQuiz)
    setAnswers(nextAnswers)
    setResult({ correctAnswers, percentage, totalQuestions, xp })
    onComplete({ correctAnswers, percentage, totalQuestions, xp })
  }

  if (!quiz) {
    return (
      <section className="generated-quiz-card">
        <div>
          <p className="eyebrow">AI Quiz Generator</p>
          <h3>Gör analysen till ett quiz</h3>
          <p>
            Skapa 5–10 frågor lokalt från ämnet, innehållet och lösningsstegen.
          </p>
        </div>
        <button onClick={startQuiz} type="button">
          Generera och starta quiz
        </button>
      </section>
    )
  }

  if (result) {
    return (
      <section className="generated-quiz-card generated-quiz-result">
        <p className="eyebrow">Quiz klart</p>
        <h3>{result.percentage}% rätt</h3>
        <p>
          Du fick {result.correctAnswers} av {result.totalQuestions} rätt och
          tjänade <strong>+{result.xp} XP</strong>.
        </p>
        <button onClick={startQuiz} type="button">
          Skapa nytt quiz
        </button>
      </section>
    )
  }

  const currentQuestion = quiz.questions[questionIndex]

  return (
    <section className="generated-quiz-card generated-quiz-active">
      <div className="generated-quiz-progress">
        <div>
          <p className="eyebrow">AI Quiz Generator</p>
          <h3>{quiz.subject}</h3>
        </div>
        <span>
          {questionIndex + 1} / {quiz.questions.length}
        </span>
      </div>

      <p className="generated-quiz-question">{currentQuestion.question}</p>
      <div className="generated-quiz-options">
        {currentQuestion.options.map((option) => (
          <button
            className={selectedAnswer === option ? 'selected' : ''}
            key={option}
            onClick={() => setSelectedAnswer(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      <div className="generated-quiz-footer">
        <small>{currentQuestion.hint}</small>
        <button disabled={!selectedAnswer} onClick={submitAnswer} type="button">
          {questionIndex === quiz.questions.length - 1
            ? 'Visa resultat'
            : 'Nästa fråga'}
        </button>
      </div>
    </section>
  )
}

export default GeneratedAssignmentQuiz
