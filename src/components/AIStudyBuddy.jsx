import { useState } from 'react'

function makeFallbackHint(question, subject, humorMode) {
  if (!question) {
    return 'Välj en fråga först, så kan jag ge en kort hint.'
  }

  return `Titta på nyckelorden i ${subject} och uteslut svar som inte passar. Försök hitta metoden innan du väljer alternativ.${humorMode ? ' Hjärnan är uppvärmd, pennan får hänga med!' : ''}`
}

function AIStudyBuddy({
  humorMode = false,
  question,
  standalone = false,
  subject = 'Skolarbete',
}) {
  const [prompt, setPrompt] = useState('')
  const [hint, setHint] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function requestHint() {
    setError('')
    const activeQuestion = standalone
      ? { answer: '', options: [], question: prompt.trim() }
      : question

    if (!activeQuestion?.question) {
      setError(standalone ? 'Skriv en fråga först.' : '')
      setHint(standalone ? '' : makeFallbackHint(question, subject, humorMode))
      return
    }

    setIsLoading(true)
    setStatus('AI Study Buddy tänker...')

    try {
      const response = await fetch('/api/study-buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: activeQuestion.answer,
          humorMode,
          options: activeQuestion.options,
          question: activeQuestion.question,
          subject,
        }),
      })

      if (!response.ok) {
        throw new Error(`Study Buddy API failed with status ${response.status}`)
      }

      const data = await response.json()

      if (typeof data.hint === 'string' && data.hint.trim()) {
        setHint(data.hint.trim())
        setStatus(data.source === 'openai' ? 'AI-genererad hint.' : 'Mockad fallback-hint.')
        setError(typeof data.message === 'string' ? data.message : '')
        return
      }

      throw new Error('Study Buddy API returned no hint')
    } catch (requestError) {
      setError('Kunde inte nå AI just nu. Visar fallback-hint.')
      setHint(makeFallbackHint(activeQuestion, subject, humorMode))
      setStatus(
        requestError instanceof Error
          ? requestError.message
          : 'Fallback används.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className={`panel buddy-panel ${standalone ? 'buddy-main-panel' : ''}`} id="ai-study-buddy">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">AI Coach</p>
          <h2>AI Study Buddy</h2>
        </div>
        {humorMode && <span className="humor-mode-badge">Humorläge på</span>}
      </div>

      <div className="buddy-card">
        <span className="buddy-avatar">AI</span>
        <div>
          <strong>Behöver du en knuff?</strong>
          <p>
            {standalone
              ? 'Beskriv vad du fastnat på. Du får en kort ledtråd som hjälper dig vidare utan att avslöja hela svaret.'
              : question
              ? `Få en kort pedagogisk hint i ${subject}.`
              : 'Starta quizet igen så kan Study Buddy hjälpa dig med nästa fråga.'}
          </p>
        </div>
      </div>

      {standalone && (
        <label className="buddy-question-field">
          <span>Din fråga</span>
          <textarea
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Till exempel: Hur börjar jag lösa den här ekvationen?"
            rows="4"
            value={prompt}
          />
        </label>
      )}

      <button
        className="hint-button"
        type="button"
        onClick={requestHint}
        disabled={isLoading}
      >
        {isLoading ? 'AI Study Buddy tänker...' : standalone ? 'Fråga AI' : 'Få en hint'}
      </button>

      {(hint || error || status) && (
        <div className="hint-box">
          {error && <p className="hint-error">{error}</p>}
          {hint && <p>{hint}</p>}
          {status && <small>{status}</small>}
        </div>
      )}
    </section>
  )
}

export default AIStudyBuddy
