// Minimal preload for the splash window: forwards splash:* IPC events to
// DOM CustomEvents on window so splash.html can listen without nodeIntegration.
const { ipcRenderer } = require('electron')

ipcRenderer.on('splash:progress', (_, payload) => {
  window.dispatchEvent(new CustomEvent('splash-progress', { detail: payload }))
})
ipcRenderer.on('splash:done', () => {
  window.dispatchEvent(new CustomEvent('splash-done'))
})
