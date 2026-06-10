import { useEffect, useState } from 'react'
import { getLevelProgress } from '../lib/levels.js'

const statusLabels = {
  offline: 'Offline',
  online: 'Online',
  studying: 'Pluggar',
}

function FriendsPanel({ friends, onChallenge }) {
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!notice) {
      return undefined
    }

    const timer = window.setTimeout(() => setNotice(''), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  function challengeFriend(friend) {
    onChallenge(friend)
    setNotice(`Utmaning skickad till ${friend.name}`)
  }

  return (
    <section className="panel friends-panel">
      <div className="panel-heading friends-heading">
        <div>
          <p className="eyebrow">Friends</p>
          <h2>Kompisar</h2>
        </div>
        <span className="friends-count">{friends.length} kompisar</span>
      </div>

      {notice && (
        <div className="friend-challenge-notice" role="status">
          <span aria-hidden="true">⚔</span>
          <strong>{notice}</strong>
        </div>
      )}

      <div className="friends-list">
        {friends.map((friend) => {
          const level = getLevelProgress(friend.xp).currentLevel

          return (
            <article className="friend-row" key={friend.name}>
              <span className="friend-avatar" aria-hidden="true">
                {friend.name.slice(0, 1)}
              </span>
              <div className="friend-info">
                <strong>{friend.name}</strong>
                <span>Nivå {level} · {friend.xp} XP</span>
              </div>
              <span className={`friend-status ${friend.status}`}>
                {statusLabels[friend.status]}
              </span>
              <button type="button" onClick={() => challengeFriend(friend)}>
                Utmana
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default FriendsPanel
