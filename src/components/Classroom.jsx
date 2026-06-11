import { useState } from 'react'

const studyGroups = [
  {
    icon: '📚',
    id: 'matematik',
    members: 25,
    name: 'Matematik',
  },
  {
    icon: '🧪',
    id: 'naturkunskap',
    members: 18,
    name: 'Naturkunskap',
  },
  {
    icon: '🌍',
    id: 'geografi',
    members: 12,
    name: 'Geografi',
  },
  {
    icon: '🇸🇪',
    id: 'svenska',
    members: 20,
    name: 'Svenska',
  },
]

function getMembershipKey(userId) {
  return `pluggarena.classroomMemberships.${userId}`
}

function getBonusKey(userId) {
  return `pluggarena.classroomFirstJoinBonus.${userId}`
}

function readMemberships(userId) {
  try {
    const value = window.localStorage.getItem(getMembershipKey(userId))
    const parsedValue = value ? JSON.parse(value) : []

    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

function hasReceivedBonus(userId) {
  try {
    return window.localStorage.getItem(getBonusKey(userId)) === 'true'
  } catch {
    return false
  }
}

function saveMemberships(userId, memberships) {
  try {
    window.localStorage.setItem(
      getMembershipKey(userId),
      JSON.stringify(memberships),
    )
  } catch {
    // Memberships remain visible for this session if storage is unavailable.
  }
}

function saveBonusClaimed(userId) {
  try {
    window.localStorage.setItem(getBonusKey(userId), 'true')
  } catch {
    // The in-memory flag still prevents another bonus in this session.
  }
}

function Classroom({ onFirstJoinBonus, userId }) {
  const [memberships, setMemberships] = useState(() =>
    readMemberships(userId),
  )
  const [bonusClaimed, setBonusClaimed] = useState(() =>
    hasReceivedBonus(userId),
  )
  const [message, setMessage] = useState('')

  function joinGroup(group) {
    if (memberships.includes(group.id)) {
      return
    }

    const nextMemberships = [...memberships, group.id]
    saveMemberships(userId, nextMemberships)
    setMemberships(nextMemberships)

    if (!bonusClaimed) {
      saveBonusClaimed(userId)
      setBonusClaimed(true)
      onFirstJoinBonus()
      setMessage(`Du gick med i ${group.name} och fick din första gruppbonus: +50 XP.`)
      return
    }

    setMessage(`Du är nu medlem i studiegruppen ${group.name}.`)
  }

  function leaveGroup(group) {
    const nextMemberships = memberships.filter((id) => id !== group.id)
    saveMemberships(userId, nextMemberships)
    setMemberships(nextMemberships)
    setMessage(`Du lämnade studiegruppen ${group.name}.`)
  }

  return (
    <div className="classroom-page">
      <section className="panel classroom-header-panel">
        <div>
          <p className="eyebrow">Studiegrupper</p>
          <h2>Klassrum</h2>
          <p>
            Hitta en grupp för ditt ämne och plugga tillsammans med andra.
          </p>
        </div>

        <div className="classroom-membership-count">
          <span>Dina grupper</span>
          <strong>{memberships.length}</strong>
        </div>
      </section>

      {message && (
        <p className="classroom-message" role="status">
          {message}
        </p>
      )}

      <section className="classroom-group-grid" aria-label="Studiegrupper">
        {studyGroups.map((group) => {
          const isMember = memberships.includes(group.id)

          return (
            <article
              className={isMember ? 'classroom-group joined' : 'classroom-group'}
              key={group.id}
            >
              <div className="classroom-group-icon" aria-hidden="true">
                {group.icon}
              </div>
              <div className="classroom-group-copy">
                <span>{isMember ? 'Medlem' : 'Öppen grupp'}</span>
                <h3>{group.name}</h3>
                <p>{group.members + (isMember ? 1 : 0)} medlemmar</p>
              </div>
              <button
                className={isMember ? 'leave' : ''}
                onClick={() => (
                  isMember ? leaveGroup(group) : joinGroup(group)
                )}
                type="button"
              >
                {isMember ? 'Lämna' : 'Gå med'}
              </button>
            </article>
          )
        })}
      </section>

      <section className="panel classroom-bonus-panel">
        <div>
          <span aria-hidden="true">+50</span>
          <div>
            <strong>Första gruppbonusen</strong>
            <p>
              {bonusClaimed
                ? 'Bonus mottagen. Fortsätt utforska grupperna.'
                : 'Gå med i din första studiegrupp och få 50 XP en gång.'}
            </p>
          </div>
        </div>
        <strong>{bonusClaimed ? 'Utdelad' : '50 XP'}</strong>
      </section>
    </div>
  )
}

export default Classroom
