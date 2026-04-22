import React, { useState } from 'react'
import { ShoppingBag, Check, Lock, Coins } from 'lucide-react'
import { useCurrency } from './CurrencyContext'
import { useToast } from './Toast'

// Catalog of purchasable cosmetic rewards.
// `effect` is optional — just metadata the app can query via the purchases array.
const CATALOG = [
  {
    id: 'title-early-backer',
    category: 'Titles',
    name: 'Early Backer',
    description: 'Show "Early Backer" under your avatar in social features.',
    cost: 200,
    icon: '🎖️',
  },
  {
    id: 'title-focus-master',
    category: 'Titles',
    name: 'Focus Master',
    description: 'Show "Focus Master" for completing 10 focus sessions.',
    cost: 500,
    icon: '🎯',
  },
  {
    id: 'theme-midnight',
    category: 'Themes',
    name: 'Midnight',
    description: 'Deep dark variant with midnight-blue accent.',
    cost: 300,
    icon: '🌙',
  },
  {
    id: 'theme-forest',
    category: 'Themes',
    name: 'Forest',
    description: 'Earthy tones with green accent.',
    cost: 300,
    icon: '🌲',
  },
  {
    id: 'theme-rose',
    category: 'Themes',
    name: 'Rose',
    description: 'Warm rose-pink accent on dark bg.',
    cost: 300,
    icon: '🌹',
  },
  {
    id: 'effect-confetti',
    category: 'Effects',
    name: 'Confetti on complete',
    description: 'Burst of confetti when you finish a focus session.',
    cost: 150,
    icon: '🎉',
  },
  {
    id: 'effect-streak-badge',
    category: 'Effects',
    name: 'Streak Badge',
    description: 'Show a flame badge on your avatar after 3 days in a row.',
    cost: 250,
    icon: '🔥',
  },
]

const CATEGORIES = ['All', ...Array.from(new Set(CATALOG.map(i => i.category)))]

export default function CoinsShop() {
  const { coins, purchases = [], purchase } = useCurrency()
  const toast = useToast()
  const [filter, setFilter] = useState('All')

  const visible = filter === 'All' ? CATALOG : CATALOG.filter(i => i.category === filter)

  function handleBuy(item) {
    if (purchases.includes(item.id)) return
    if (coins < item.cost) {
      toast?.({ message: `Not enough coins — need ${item.cost - coins} more`, type: 'error' })
      return
    }
    const ok = purchase(item.id, item.name, item.cost)
    if (ok) toast?.({ message: `Unlocked: ${item.name}!`, type: 'success' })
    else toast?.({ message: 'Purchase failed', type: 'error' })
  }

  return (
    <div className="shop-panel">
      <div className="shop-header">
        <div className="shop-title-row">
          <ShoppingBag size={16} /> Rewards Shop
          <span className="shop-balance">
            <span className="shop-coin-icon">🪙</span>
            {coins.toLocaleString()} coins
          </span>
        </div>
        <div className="shop-filters">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`shop-filter-btn${filter === cat ? ' active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="shop-grid">
        {visible.map(item => {
          const owned = purchases.includes(item.id)
          const canAfford = coins >= item.cost
          return (
            <div key={item.id} className={`shop-card${owned ? ' owned' : ''}`}>
              <div className="shop-card-icon">{item.icon}</div>
              <div className="shop-card-body">
                <div className="shop-card-category">{item.category}</div>
                <div className="shop-card-name">{item.name}</div>
                <div className="shop-card-desc">{item.description}</div>
              </div>
              <div className="shop-card-footer">
                {owned ? (
                  <span className="shop-owned-badge"><Check size={12} /> Owned</span>
                ) : (
                  <button
                    className={`shop-buy-btn${!canAfford ? ' locked' : ''}`}
                    onClick={() => handleBuy(item)}
                    disabled={!canAfford}
                    title={!canAfford ? `Need ${item.cost - coins} more coins` : undefined}
                  >
                    {canAfford ? null : <Lock size={11} />}
                    🪙 {item.cost.toLocaleString()}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
