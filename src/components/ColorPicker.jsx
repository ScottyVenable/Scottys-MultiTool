import React, { useState, useEffect, useRef } from 'react'
import { Pipette, Copy, Check, Trash2, Clock } from 'lucide-react'

const HISTORY_KEY = 'color-picker-history'
const MAX_HISTORY = 20

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function parseHexInput(val) {
  const cleaned = val.replace(/[^0-9a-fA-F]/g, '')
  if (cleaned.length === 6) return `#${cleaned}`
  if (cleaned.length === 3) return `#${cleaned[0]}${cleaned[0]}${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}`
  return null
}

function ColorSwatch({ color, size = 80 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 'var(--r)',
      background: color,
      border: '2px solid var(--border)',
      flexShrink: 0,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }} />
  )
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button className="btn btn-secondary btn-sm" onClick={copy} style={{ flex: 1 }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

export default function ColorPicker() {
  const [picking, setPicking]   = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [color, setColor]       = useState('#3b82f6')
  const [hexInput, setHexInput] = useState('')
  const [history, setHistory]   = useState([])
  const [inputError, setInputError] = useState('')
  const countdownRef = useRef(null)
  const isElectron = !!window.api

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
      setHistory(Array.isArray(saved) ? saved : [])
    } catch {}
  }, [])

  const saveHistory = (hex) => {
    setHistory(prev => {
      const next = [hex, ...prev.filter(c => c !== hex)].slice(0, MAX_HISTORY)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }

  const applyColor = (hex) => {
    setColor(hex)
    setHexInput('')
    saveHistory(hex)
  }

  const startPick = async () => {
    if (!isElectron) {
      // Demo: pick a random color
      const demo = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
      applyColor(demo)
      return
    }
    setPicking(true)
    setCountdown(3)
    let c = 3
    countdownRef.current = setInterval(() => {
      c--
      setCountdown(c)
      if (c <= 0) {
        clearInterval(countdownRef.current)
      }
    }, 1000)
    try {
      const result = await window.api.color.pick(3)
      if (result?.hex) applyColor(result.hex)
    } catch (e) {
      console.error('Color pick failed:', e)
    }
    setPicking(false)
    setCountdown(0)
  }

  const handleHexInput = (val) => {
    setHexInput(val)
    setInputError('')
    const parsed = parseHexInput(val)
    if (parsed) { setColor(parsed) }
  }

  const confirmHexInput = () => {
    const parsed = parseHexInput(hexInput)
    if (parsed) { applyColor(parsed); setHexInput('') }
    else if (hexInput.trim()) setInputError('Invalid hex color')
  }

  const rgb = hexToRgb(color)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)

  const isLight = hsl.l > 60
  const textOnColor = isLight ? '#000000' : '#ffffff'

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Color Picker</div>
          <div className="page-subtitle">Pick any color from your screen and copy it in any format</div>
        </div>
      </div>

      {/* Main picker card */}
      <div className="card mb-16">
        <div className="flex items-start gap-20">
          {/* Swatch */}
          <ColorSwatch color={color} size={100} />

          {/* Color values */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text-0)', letterSpacing: '0.05em', marginBottom: 12 }}>
              {color.toUpperCase()}
            </div>

            <div className="grid-3 gap-8 mb-12">
              <CopyButton text={color.toUpperCase()} label={`HEX ${color.toUpperCase()}`} />
              <CopyButton text={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`} label={`RGB`} />
              <CopyButton text={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} label={`HSL`} />
            </div>

            <div className="grid-3 gap-8" style={{ fontSize: 11.5, color: 'var(--text-2)' }}>
              <div style={{ background: 'var(--bg-3)', borderRadius: 'var(--r)', padding: '6px 10px', fontFamily: 'var(--mono)' }}>
                R: {rgb.r}  G: {rgb.g}  B: {rgb.b}
              </div>
              <div style={{ background: 'var(--bg-3)', borderRadius: 'var(--r)', padding: '6px 10px', fontFamily: 'var(--mono)' }}>
                H: {hsl.h}°  S: {hsl.s}%  L: {hsl.l}%
              </div>
              <div style={{ background: color, borderRadius: 'var(--r)', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: textOnColor }}>Preview</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pick button */}
        <div className="flex items-center gap-12 mt-16">
          <button
            className={`btn ${picking ? 'btn-secondary' : 'btn-primary'}`}
            style={{ minWidth: 160 }}
            onClick={startPick}
            disabled={picking}
          >
            <Pipette size={14} />
            {picking && countdown > 0 ? `Picking in ${countdown}…` : picking ? 'Move your cursor…' : 'Pick from Screen'}
          </button>
          {picking && (
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
              Position your cursor over the color you want to pick
            </div>
          )}
        </div>
      </div>

      {/* Manual hex input */}
      <div className="card mb-16">
        <div className="card-title mb-12"><Pipette size={14} className="card-title-icon" /> Enter Hex Color</div>
        <div className="flex gap-8 items-center">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 4, background: color,
              border: '1.5px solid var(--border)', flexShrink: 0,
              position: 'absolute', left: 8,
            }} />
            <input
              className={`input mono ${inputError ? 'input-error' : ''}`}
              style={{ paddingLeft: 44, width: 180 }}
              value={hexInput}
              onChange={e => handleHexInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmHexInput()}
              placeholder="#3B82F6"
              maxLength={7}
            />
          </div>
          <button className="btn btn-secondary" onClick={confirmHexInput}>Apply</button>
          {inputError && <span style={{ fontSize: 12, color: 'var(--red)' }}>{inputError}</span>}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Clock size={14} className="card-title-icon" /> Color History ({history.length})</div>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => { setHistory([]); localStorage.removeItem(HISTORY_KEY) }}
              title="Clear history"
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {history.map((hex, i) => (
              <button
                key={i}
                title={hex.toUpperCase()}
                onClick={() => setColor(hex)}
                style={{
                  width: 36, height: 36, borderRadius: 'var(--r)',
                  background: hex,
                  border: `2px solid ${hex === color ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  outline: hex === color ? '2px solid var(--accent)' : 'none',
                  outlineOffset: 2,
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                onMouseLeave={e => e.currentTarget.style.transform = ''}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
