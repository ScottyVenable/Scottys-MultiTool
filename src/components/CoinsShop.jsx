import React, { useState } from 'react'
import { ShoppingBag, Check, Lock, Coins, Award, Target, Moon, Trees, Flower, PartyPopper, Flame } from 'lucide-react'
import { useCurrency } from './CurrencyContext'
import { useToast } from './Toast'

// Catalog of purchasable cosmetic rewards. Icons use lucide-react components
// (no emoji) so they respect theme colors and match the rest of the UI.
const CATALOG = [
  {
    id: 'title-early-backer',
    category: 'Titles',
    name: 'Early Backer',
    description: 'Show "Early Backer" under your avatar in social features.',
    cost: 200,
    Icon: Award,
  },
  {
    id: 'title-focus-master',
    category: 'Titles',
    name: 'Focus Master',
    description: 'Show "Focus Master" for completing 10 focus sessions.',
    cost: 500,
    Icon: Target,
  },
  {
    id: 'theme-midnight',
    category: 'Themes',
    name: 'Midnight',
    description: 'Deep dark variant with midnight-blue accent.',
    cost: 300,
    Icon: Moon,
  },
  {
    id: 'theme-forest',
    category: 'Themes',
    name: 'Forest',
    description: 'Earthy tones with green accent.',
    cost: 300,
    Icon: Trees,
  },
  {
    id: 'theme-rose',
    category: 'Themes',
    name: 'Rose',
    description: 'Warm rose-pink accent on dark bg.',
    cost: 300,
    Icon: Flower,
  },
  {
    id: 'effect-confetti',
    category: 'Effects',
    name: 'Confetti on complete',
    description: 'Burst of confetti when you finish a focus session.',
    cost: 150,
    Icon: PartyPopper,
  },
  {
    id: 'effect-streak-badge',
    category: 'Effects',
    name: 'Streak Badge',
    description: 'Show a flame badge on your avatar after 3 days in a row.',
    cost: 250,
    Icon: Flame,
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
      toast?.show?.({ type: 'error', title: 'Not enough coins', message: `Need ${item.cost - coins} more` })
      return
    }
    const ok = purchase(item.id, item.name, item.cost)
    if (ok) toast?.show?.({ type: 'success', title: 'Unlocked', message: item.name })
    else toast?.show?.({ type: 'error', title: 'Purchase failed' })
  }

  return (
    <div className="shop-panel">
      <div className="shop-header">
        <div className="shop-title-row">
          <ShoppingBag size={16} /> Rewards Shop
          <span className="shop-balance">
            <Coins size={13} />
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
          const ItemIcon = item.Icon || Award
          return (
            <div key={item.id} className={`shop-card${owned ? ' owned' : ''}`}>
              <div className="shop-card-icon"><ItemIcon size={22} /></div>
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
                    <Coins size={11} /> {item.cost.toLocaleString()}
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
