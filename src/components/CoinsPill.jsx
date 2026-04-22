import React, { useState } from 'react'
import { Coins, Trophy, Check } from 'lucide-react'
import { useCurrency } from './CurrencyContext'

// Topbar pill that shows the current coin balance. Clicking opens a small
// panel with today's challenges and recent transactions. All local-only.
export default function CoinsPill() {
  const { coins, challenges, transactions } = useCurrency()
  const [open, setOpen] = useState(false)

  return (
    <div className="coins-pill-wrap">
      <button type="button" className="coins-pill" onClick={() => setOpen(v => !v)} title={`${coins} coins`}>
        <Coins size={12} />
        <span className="coins-pill-val">{coins}</span>
      </button>
      {open && (
        <div className="coins-panel" onMouseLeave={() => setOpen(false)}>
          <div className="coins-panel-head">
            <Trophy size={12} /> <span>Today's challenges</span>
          </div>
          <div className="coins-panel-list">
            {challenges.length === 0 && <div className="coins-empty">No challenges yet.</div>}
            {challenges.map(c => {
              const done = c.progress >= c.goal
              const pct = Math.min(100, Math.round((c.progress / c.goal) * 100))
              return (
                <div key={c.id} className={`coins-chal ${done ? 'done' : ''}`}>
                  <div className="coins-chal-row">
                    <span className="coins-chal-title">{c.title}</span>
                    <span className="coins-chal-reward">+{c.reward}</span>
                  </div>
                  <div className="coins-chal-bar"><div className="coins-chal-fill" style={{ width: pct + '%' }} /></div>
                  <div className="coins-chal-meta">
                    {done ? <><Check size={10} /> Complete</> : `${c.progress} / ${c.goal}`}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="coins-panel-head" style={{ marginTop: 8 }}>Recent</div>
          <div className="coins-tx-list">
            {transactions.slice(0, 6).length === 0 && <div className="coins-empty">No activity yet.</div>}
            {transactions.slice(0, 6).map(t => (
              <div key={t.id} className="coins-tx">
                <span className="coins-tx-label">{t.label}</span>
                <span className={`coins-tx-amt ${t.amount < 0 ? 'neg' : 'pos'}`}>{t.amount > 0 ? '+' : ''}{t.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
