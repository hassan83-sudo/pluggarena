import { useState } from 'react'

const emptyForm = {
  date: '',
  note: '',
  subject: '',
  time: '',
}

function getStorageKey(userId) {
  return `pluggarena.studyCalendar.${userId}`
}

function readActivities(userId) {
  try {
    const value = window.localStorage.getItem(getStorageKey(userId))
    const parsedValue = value ? JSON.parse(value) : []

    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

function saveActivities(userId, activities) {
  try {
    window.localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(activities),
    )
  } catch {
    // Activities remain available for this session if storage is unavailable.
  }
}

function createActivityId() {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getSortValue(activity) {
  return `${activity.date}T${activity.time || '23:59'}`
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${dateValue}T12:00:00`))
}

function ActivityCard({ activity, onDelete, onEdit, onToggle }) {
  return (
    <article className={activity.completed ? 'calendar-activity completed' : 'calendar-activity'}>
      <div className="calendar-activity-date">
        <span>{formatDate(activity.date)}</span>
        <strong>{activity.time}</strong>
      </div>
      <div className="calendar-activity-copy">
        <span>{activity.subject}</span>
        <h3>{activity.note}</h3>
        <small>{activity.completed ? 'Klar' : 'Planerad'}</small>
      </div>
      <div className="calendar-activity-actions">
        <button
          className="calendar-complete-button"
          onClick={() => onToggle(activity.id)}
          type="button"
        >
          {activity.completed ? 'Ångra klar' : 'Markera klar'}
        </button>
        <button onClick={() => onEdit(activity)} type="button">
          Redigera
        </button>
        <button
          className="calendar-delete-button"
          onClick={() => onDelete(activity.id)}
          type="button"
        >
          Ta bort
        </button>
      </div>
    </article>
  )
}

function StudyCalendar({ userId }) {
  const [activities, setActivities] = useState(() => readActivities(userId))
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const todayKey = getTodayKey()
  const sortedActivities = [...activities].sort(
    (a, b) => getSortValue(a).localeCompare(getSortValue(b)),
  )
  const todayActivities = sortedActivities.filter(
    (activity) => activity.date === todayKey,
  )
  const upcomingActivities = sortedActivities.filter(
    (activity) => activity.date > todayKey,
  )
  const earlierActivities = sortedActivities.filter(
    (activity) => activity.date < todayKey,
  )
  const upcomingCount = upcomingActivities.filter(
    (activity) => !activity.completed,
  ).length

  function updateActivities(nextActivities) {
    setActivities(nextActivities)
    saveActivities(userId, nextActivities)
  }

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
  }

  function submitActivity(event) {
    event.preventDefault()

    if (!form.date || !form.time || !form.subject.trim() || !form.note.trim()) {
      setError('Fyll i datum, tid, ämne och aktivitet.')
      return
    }

    if (editingId) {
      updateActivities(
        activities.map((activity) => (
          activity.id === editingId
            ? {
              ...activity,
              date: form.date,
              note: form.note.trim(),
              subject: form.subject.trim(),
              time: form.time,
            }
            : activity
        )),
      )
    } else {
      updateActivities([
        ...activities,
        {
          completed: false,
          date: form.date,
          id: createActivityId(),
          note: form.note.trim(),
          subject: form.subject.trim(),
          time: form.time,
        },
      ])
    }

    resetForm()
  }

  function editActivity(activity) {
    setEditingId(activity.id)
    setForm({
      date: activity.date,
      note: activity.note,
      subject: activity.subject,
      time: activity.time,
    })
    setError('')
  }

  function deleteActivity(activityId) {
    updateActivities(
      activities.filter((activity) => activity.id !== activityId),
    )

    if (editingId === activityId) {
      resetForm()
    }
  }

  function toggleActivity(activityId) {
    updateActivities(
      activities.map((activity) => (
        activity.id === activityId
          ? { ...activity, completed: !activity.completed }
          : activity
      )),
    )
  }

  function renderActivityList(items, emptyMessage) {
    if (items.length === 0) {
      return <p className="calendar-empty">{emptyMessage}</p>
    }

    return (
      <div className="calendar-activity-list">
        {items.map((activity) => (
          <ActivityCard
            activity={activity}
            key={activity.id}
            onDelete={deleteActivity}
            onEdit={editActivity}
            onToggle={toggleActivity}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="study-calendar-page">
      <section className="panel calendar-header-panel">
        <div>
          <p className="eyebrow">Planera dina studier</p>
          <h2>Studiekalender</h2>
          <p>Samla prov, uppgifter och pluggpass på ett ställe.</p>
        </div>
        <div className="calendar-upcoming-count">
          <span>Kommande</span>
          <strong>{upcomingCount}</strong>
        </div>
      </section>

      <section className="panel calendar-form-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{editingId ? 'Uppdatera plan' : 'Ny plan'}</p>
            <h2>{editingId ? 'Redigera aktivitet' : 'Lägg till aktivitet'}</h2>
          </div>
        </div>

        <form className="calendar-form" onSubmit={submitActivity}>
          <label>
            <span>Datum</span>
            <input min={todayKey} name="date" onChange={updateField} type="date" value={form.date} />
          </label>
          <label>
            <span>Tid</span>
            <input name="time" onChange={updateField} type="time" value={form.time} />
          </label>
          <label>
            <span>Ämne</span>
            <input maxLength="40" name="subject" onChange={updateField} placeholder="Till exempel: Matematik" type="text" value={form.subject} />
          </label>
          <label className="calendar-note-field">
            <span>Anteckning</span>
            <input maxLength="100" name="note" onChange={updateField} placeholder="Till exempel: Matteprov kapitel 4" type="text" value={form.note} />
          </label>
          <div className="calendar-form-actions">
            <button type="submit">
              {editingId ? 'Spara ändringar' : 'Skapa aktivitet'}
            </button>
            {editingId && (
              <button className="calendar-cancel-button" onClick={resetForm} type="button">
                Avbryt
              </button>
            )}
          </div>
        </form>
        {error && <p className="calendar-error" role="alert">{error}</p>}
      </section>

      <section className="panel calendar-list-panel">
        <div className="calendar-section-heading">
          <div><span>Idag</span><h2>Dagens aktiviteter</h2></div>
          <strong>{todayActivities.length}</strong>
        </div>
        {renderActivityList(todayActivities, 'Inget planerat för idag.')}
      </section>

      <section className="panel calendar-list-panel">
        <div className="calendar-section-heading">
          <div><span>Framåt</span><h2>Kommande aktiviteter</h2></div>
          <strong>{upcomingCount}</strong>
        </div>
        {renderActivityList(upcomingActivities, 'Inga kommande aktiviteter.')}
      </section>

      {earlierActivities.length > 0 && (
        <section className="panel calendar-list-panel">
          <div className="calendar-section-heading">
            <div><span>Historik</span><h2>Tidigare aktiviteter</h2></div>
            <strong>{earlierActivities.length}</strong>
          </div>
          {renderActivityList(earlierActivities, '')}
        </section>
      )}
    </div>
  )
}

export default StudyCalendar
