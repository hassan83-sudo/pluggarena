function AIStudyBuddyHub({
  humorMode,
  onContinue,
  onCreateQuiz,
  onExplain,
  onToggleHumor,
  onUpload,
}) {
  return (
    <section className="panel ai-hub-panel">
      <div className="ai-hub-header">
        <span className="buddy-avatar" aria-hidden="true">AI</span>
        <div>
          <p className="eyebrow">AI Study Buddy</p>
          <h2>Hjälp mig med en uppgift</h2>
          <p>Starta med AI, skapa quiz eller fortsätt där du slutade.</p>
        </div>
        <div className="humor-mode-control">
          {humorMode && <span className="humor-mode-badge">Humorläge på</span>}
          <span>Humorläge</span>
          <button
            aria-pressed={humorMode}
            className={humorMode ? 'active' : ''}
            onClick={onToggleHumor}
            type="button"
          >
            {humorMode ? 'På' : 'Av'}
          </button>
        </div>
      </div>

      <div className="ai-hub-actions">
        <button onClick={onUpload} type="button">
          Ladda upp uppgift
        </button>
        <button onClick={onCreateQuiz} type="button">Skapa quiz</button>
        <button onClick={onExplain} type="button">Förklara något</button>
        <button onClick={onContinue} type="button">
          Fortsätt senaste AI-konversation
        </button>
      </div>
    </section>
  )
}

export default AIStudyBuddyHub
