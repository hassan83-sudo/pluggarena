import { useState } from 'react'

const shopItems = [
  {
    description: 'En färgstark cyan/lila ram för din profil.',
    icon: '🎨',
    id: 'color-profile-frame',
    name: 'Ny profilram',
    price: 500,
  },
  {
    description: 'Visa din streak med en glödande eldprofilram.',
    icon: '🔥',
    id: 'fire-profile-frame',
    name: 'Eldprofilram',
    price: 1000,
  },
  {
    description: 'En exklusiv ram för spelare som dominerar arenan.',
    icon: '👑',
    id: 'arena-master-frame',
    name: 'Arena Master-ram',
    price: 2500,
  },
  {
    description: 'En premiumstjärna som visar din XP-prestation.',
    icon: '⭐',
    id: 'premium-badge',
    name: 'Premium-badge',
    price: 5000,
  },
]

function getStorageKey(userId) {
  return `pluggarena.xpShop.${userId}`
}

function readOwnedItems(userId) {
  try {
    const value = window.localStorage.getItem(getStorageKey(userId))
    const parsedValue = value ? JSON.parse(value) : []

    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

function saveOwnedItems(userId, itemIds) {
  try {
    window.localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(itemIds),
    )
  } catch {
    // Purchased items remain visible for this session if storage is unavailable.
  }
}

function XPShop({ onPurchase, userId, xp }) {
  const [ownedItems, setOwnedItems] = useState(() => readOwnedItems(userId))
  const [purchaseMessage, setPurchaseMessage] = useState('')

  function buyItem(item) {
    if (ownedItems.includes(item.id)) {
      return
    }

    if (xp < item.price) {
      setPurchaseMessage(
        `Du behöver ${item.price - xp} XP till för ${item.name}.`,
      )
      return
    }

    const purchased = onPurchase(item)

    if (!purchased) {
      setPurchaseMessage('Köpet kunde inte genomföras. Försök igen.')
      return
    }

    const nextOwnedItems = [...ownedItems, item.id]
    saveOwnedItems(userId, nextOwnedItems)
    setOwnedItems(nextOwnedItems)
    setPurchaseMessage(`${item.name} är nu upplåst för ${item.price} XP.`)
  }

  return (
    <section className="panel xp-shop-panel">
      <div className="panel-heading xp-shop-heading">
        <div>
          <p className="eyebrow">Endast XP, inga riktiga pengar</p>
          <h2>XP Shop</h2>
        </div>
        <div className="xp-shop-balance">
          <span>Ditt saldo</span>
          <strong>{xp} XP</strong>
        </div>
      </div>

      {purchaseMessage && (
        <p className="xp-shop-message" role="status">
          {purchaseMessage}
        </p>
      )}

      <div className="xp-shop-grid">
        {shopItems.map((item) => {
          const owned = ownedItems.includes(item.id)
          const canAfford = xp >= item.price

          return (
            <article
              className={owned ? 'xp-shop-item owned' : 'xp-shop-item'}
              key={item.id}
            >
              <span className="xp-shop-item-icon" aria-hidden="true">
                {item.icon}
              </span>
              <div className="xp-shop-item-copy">
                <strong>{item.name}</strong>
                <p>{item.description}</p>
              </div>
              <div className="xp-shop-item-action">
                <span>{item.price} XP</span>
                <button
                  disabled={owned}
                  onClick={() => buyItem(item)}
                  type="button"
                >
                  {owned ? 'Ägd' : canAfford ? 'Köp' : 'För lite XP'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default XPShop
