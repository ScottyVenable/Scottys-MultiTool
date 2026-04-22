import React from 'react'

// Tokenize inline markdown: **bold**, *italic*, `code`, plain text
function tokenizeInline(text) {
  const tokens = []
  let i = 0, current = ''
  while (i < text.length) {
    if (text.slice(i, i + 2) === '**') {
      if (current) { tokens.push({ type: 'text', content: current }); current = '' }
      const end = text.indexOf('**', i + 2)
      if (end !== -1) { tokens.push({ type: 'bold', content: text.slice(i + 2, end) }); i = end + 2 }
      else { current += text[i++] }
    } else if (text[i] === '`' && text[i + 1] !== '`') {
      if (current) { tokens.push({ type: 'text', content: current }); current = '' }
      const end = text.indexOf('`', i + 1)
      if (end !== -1) { tokens.push({ type: 'code', content: text.slice(i + 1, end) }); i = end + 1 }
      else { current += text[i++] }
    } else if (text[i] === '*' && text[i + 1] !== '*') {
      if (current) { tokens.push({ type: 'text', content: current }); current = '' }
      const end = text.indexOf('*', i + 1)
      if (end !== -1) { tokens.push({ type: 'italic', content: text.slice(i + 1, end) }); i = end + 1 }
      else { current += text[i++] }
    } else {
      current += text[i++]
    }
  }
  if (current) tokens.push({ type: 'text', content: current })
  return tokens
}

function renderInline(text, baseKey = 0) {
  return tokenizeInline(text).map((t, i) => {
    const k = `${baseKey}-${i}`
    if (t.type === 'bold') return <strong key={k}>{t.content}</strong>
    if (t.type === 'italic') return <em key={k}>{t.content}</em>
    if (t.type === 'code') return <code key={k} style={{ fontFamily: 'var(--mono)', fontSize: '0.9em', background: 'rgba(99,102,241,0.15)', padding: '1px 5px', borderRadius: 3, color: 'var(--accent-h)' }}>{t.content}</code>
    return t.content
  })
}

export function MarkdownRenderer({ content, style, className }) {
  const lines = (content || '').split('\n')
  const elements = []
  let i = 0, key = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      elements.push(
        <pre key={key++} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', overflowX: 'auto', margin: '8px 0', fontSize: 12, fontFamily: 'var(--mono)', lineHeight: 1.5, color: 'var(--text-1)' }}>
          {lang && <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase' }}>{lang}</div>}
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      i++; continue
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} style={{ fontSize: 13, fontWeight: 700, margin: '12px 0 4px', color: 'var(--text-0)' }}>{renderInline(line.slice(4), key)}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} style={{ fontSize: 15, fontWeight: 700, margin: '14px 0 6px', color: 'var(--text-0)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 4 }}>{renderInline(line.slice(3), key)}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={key++} style={{ fontSize: 17, fontWeight: 800, margin: '14px 0 6px', color: 'var(--text-0)' }}>{renderInline(line.slice(2), key)}</h1>)

    // Horizontal rule
    } else if (line.match(/^[-*]{3,}$/)) {
      elements.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />)

    // Unordered list (collect runs)
    } else if (line.match(/^[-*+] /)) {
      const items = []
      while (i < lines.length && lines[i].match(/^[-*+] /)) { items.push(lines[i].slice(2)); i++ }
      elements.push(
        <ul key={key++} style={{ paddingLeft: 18, margin: '6px 0', listStyleType: 'disc' }}>
          {items.map((item, j) => <li key={j} style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-1)', marginBottom: 2 }}>{renderInline(item, j)}</li>)}
        </ul>
      )
      continue

    // Ordered list
    } else if (/^\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++ }
      elements.push(
        <ol key={key++} style={{ paddingLeft: 20, margin: '6px 0' }}>
          {items.map((item, j) => <li key={j} style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-1)', marginBottom: 2 }}>{renderInline(item, j)}</li>)}
        </ol>
      )
      continue

    // Blockquote
    } else if (line.startsWith('> ')) {
      elements.push(
        <div key={key++} style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 12, margin: '6px 0', color: 'var(--text-2)', fontStyle: 'italic', fontSize: 13 }}>
          {renderInline(line.slice(2), key)}
        </div>
      )

    // Table header row (simplified)
    } else if (line.startsWith('| ')) {
      const headers = line.split('|').filter(c => c.trim()).map(c => c.trim())
      i++ // skip separator
      const rows = []
      while (i < lines.length && lines[i].startsWith('| ')) {
        rows.push(lines[i].split('|').filter(c => c.trim()).map(c => c.trim()))
        i++
      }
      elements.push(
        <div key={key++} style={{ overflowX: 'auto', margin: '8px 0' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
            <thead>
              <tr>{headers.map((h, j) => <th key={j} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {row.map((cell, ci) => <td key={ci} style={{ padding: '6px 10px', color: 'var(--text-1)' }}>{renderInline(cell, ci)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue

    // Empty line
    } else if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: 6 }} />)

    // Paragraph
    } else {
      elements.push(<p key={key++} style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-1)', margin: '3px 0' }}>{renderInline(line, key)}</p>)
    }

    i++
  }

  return <div className={className} style={{ ...style, userSelect: 'text' }}>{elements}</div>
}
