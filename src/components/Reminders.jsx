import { useState } from 'react'

function getStorageKey(userId) {
  return `pluggarena.reminders.${userId}`
}

function readReminders(userId) {
  try {
    const value = window.localStorage.getItem(getStorageKey(userId))
    const parsedValue = value ? JSON.parse(value) : []

    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

function saveReminders(userId, reminders) {
  try {
    window.localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(reminders),
    )
  } catch {
    // Reminders remain available for this session if storage is unavailable.
  }
}

function createReminderId() {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function Reminders({ userId }) {
  const [reminders, setReminders] = useState(() => readReminders(userId))
  const [text, setText] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState('')

  function updateReminders(nextReminders) {
    setReminders(nextReminders)
    saveReminders(userId, nextReminders)
  }

  function addReminder(event) {
    event.preventDefault()
    const trimmedText = text.trim()

    if (!trimmedText || !time) {
      setError('Skriv en påminnelse och välj en tid.')
      return
    }

    updateReminders([
      ...reminders,
      {
        active: true,
        id: createReminderId(),
        text: trimmedText,
        time,
      },
    ])
    setText('')
    setTime('')
    setError('')
  }

  function toggleReminder(reminderId) {
    updateReminders(
      reminders.map((reminder) => (
        reminder.id === reminderId
          ? { ...reminder, active: !reminder.active }
          : reminder
      )),
    )
  }

  function removeReminder(reminderId) {
    updateReminders(
      reminders.filter((reminder) => reminder.id !== reminderId),
    )
  }

  const activeCount = reminders.filter((reminder) => reminder.active).length

  return (
    <section className="panel reminders-panel">
      <div className="panel-heading reminders-heading">
        <div>
          <p className="eyebrow">Lokal planering</p>
          <h2>Påminnelser</h2>
        </div>
        <span className="reminders-count">
          {activeCount} aktiva
        </span>
      </div>

      <form className="reminders-form" onSubmit={addReminder}>
        <label>
          <span>Påminnelsetext</span>
          <input
            maxLength="80"
            onChange={(event) => setText(event.target.value)}
            placeholder="Till exempel: Plugga matte"
            type="text"
            value={text}
          />
        </label>
        <label>
          <span>Tid</span>
          <input
            onChange={(event) => setTime(event.target.value)}
            type="time"
            value={time}
          />
        </label>
        <button type="submit">Lägg till påminnelse</button>
      </form>

      {error && (
        <p className="reminders-error" role="alert">
          {error}
        </p>
      )}

      {reminders.length > 0 ? (
        <div className="reminders-list">
          {reminders.map((reminder) => (
            <article
              className={reminder.active ? 'reminder active' : 'reminder'}
              key={reminder.id}
            >
              <div className="reminder-time">
                <span aria-hidden="true">◷</span>
                <strong>{reminder.time}</strong>
              </div>
              <div className="reminder-copy">
                <strong>{reminder.text}</strong>
                <span>{reminder.active ? 'Aktiv' : 'Inaktiv'}</span>
              </div>
              <div className="reminder-actions">
                <button
                  className="reminder-toggle"
                  onClick={() => toggleReminder(reminder.id)}
                  type="button"
                >
                  {reminder.active ? 'Stäng av' : 'Slå på'}
                </button>
                <button
                  className="reminder-remove"
                  onClick={() => removeReminder(reminder.id)}
                  type="button"
                >
                  Ta bort
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="reminders-empty">
          Inga påminnelser ännu. Lägg till ditt nästa pluggpass ovan.
        </p>
      )}

      <p className="reminders-note">
        Påminnelserna visas bara i appen. Push-notiser är inte aktiverade.
      </p>
    </section>
  )
}

export default Reminders
