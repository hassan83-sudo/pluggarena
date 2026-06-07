function AIStudyBuddyHub({ onAsk, onContinue, onUpload }) {
  return (
    <section className="panel ai-hub-panel">
      <div className="ai-hub-copy">
        <span className="buddy-avatar">AI</span>
        <div>
          <p className="eyebrow">AI Study Buddy</p>
          <h2>Vad vill du ha hjälp med?</h2>
          <p>Fråga direkt eller ta med en skoluppgift till Study Buddy.</p>
        </div>
      </div>

      <div className="ai-hub-actions">
        <button onClick={onAsk} type="button">Fråga AI</button>
        <button onClick={onUpload} type="button">Ladda upp uppgift</button>
        <button onClick={onContinue} type="button">
          Fortsätt senaste AI-konversation
        </button>
      </div>
    </section>
  )
}

export default AIStudyBuddyHub
