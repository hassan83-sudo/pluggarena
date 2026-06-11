import { useEffect, useState } from 'react'

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

const mockStudents = [
  { name: 'Elev 1', xp: 280 },
  { name: 'Elev 2', xp: 190 },
  { name: 'Elev 3', xp: 120 },
  { name: 'Elev 4', xp: 80 },
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

function buildRanking(username, xp) {
  return [
    { isCurrentUser: true, name: username, xp },
    ...mockStudents.map((student) => ({
      ...student,
      isCurrentUser: false,
    })),
  ]
    .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name, 'sv-SE'))
    .map((student, index) => ({
      ...student,
      rank: index + 1,
    }))
}

function Classroom({
  onFirstJoinBonus,
  onUnlockClassMaster,
  userId,
  username,
  xp,
}) {
  const [memberships, setMemberships] = useState(() =>
    readMemberships(userId),
  )
  const [bonusClaimed, setBonusClaimed] = useState(() =>
    hasReceivedBonus(userId),
  )
  const [message, setMessage] = useState('')
  const ranking = buildRanking(username, xp)
  const currentUserRank = ranking.find((student) => student.isCurrentUser)?.rank
  const groupXp = ranking.reduce((total, student) => total + student.xp, 0)

  useEffect(() => {
    if (memberships.length > 0 && currentUserRank === 1) {
      onUnlockClassMaster()
    }
  }, [currentUserRank, memberships.length, onUnlockClassMaster])

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
              <div className="classroom-group-summary">
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
              </div>

              {isMember && (
                <div className="classroom-ranking">
                  <div className="classroom-ranking-heading">
                    <div>
                      <span aria-hidden="true">🏆</span>
                      <strong>Topp 5 elever</strong>
                    </div>
                    <div>
                      <span>Gruppens XP</span>
                      <strong>{groupXp} XP</strong>
                    </div>
                  </div>

                  <ol>
                    {ranking.map((student) => (
                      <li
                        className={student.isCurrentUser ? 'current-user' : ''}
                        key={student.name}
                      >
                        <span>{student.rank}</span>
                        <strong>{student.name}</strong>
                        {student.isCurrentUser && <small>Du</small>}
                        <em>{student.xp} XP</em>
                      </li>
                    ))}
                  </ol>

                  <p>
                    Din placering: <strong>#{currentUserRank}</strong>
                    {currentUserRank === 1 && (
                      <span> 👑 Klassmästare</span>
                    )}
                  </p>
                </div>
              )}
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
