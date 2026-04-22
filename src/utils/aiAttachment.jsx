import React, { createContext, useContext, useState } from 'react'

const AIAttachmentContext = createContext(null)

export function AIAttachmentProvider({ children }) {
  const [attachments, setAttachments] = useState([]) // [{id, type, dataUrl, path, name}]

  const add = (att) => setAttachments(prev => [...prev, { id: `att-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, ...att }])
  const remove = (id) => setAttachments(prev => prev.filter(a => a.id !== id))
  const clear = () => setAttachments([])

  return (
    <AIAttachmentContext.Provider value={{ attachments, add, remove, clear }}>
      {children}
    </AIAttachmentContext.Provider>
  )
}

export function useAIAttachments() {
  const ctx = useContext(AIAttachmentContext)
  if (!ctx) return { attachments: [], add: () => {}, remove: () => {}, clear: () => {} }
  return ctx
}
