const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
  },
  macros: {
    list: () => ipcRenderer.invoke('macro:list'),
    save: (macro) => ipcRenderer.invoke('macro:save', macro),
    delete: (id) => ipcRenderer.invoke('macro:delete', id),
    run: (id) => ipcRenderer.invoke('macro:run', id),
    stop: (id) => ipcRenderer.invoke('macro:stop', id),
  },
  hotkeys: {
    list: () => ipcRenderer.invoke('hotkey:list'),
    save: (hotkey) => ipcRenderer.invoke('hotkey:save', hotkey),
    delete: (id) => ipcRenderer.invoke('hotkey:delete', id),
  },
  autoClicker: {
    start: (opts) => ipcRenderer.invoke('autoclicker:start', opts),
    stop: () => ipcRenderer.invoke('autoclicker:stop'),
  },
  system: {
    info: () => ipcRenderer.invoke('system:info'),
    disk: () => ipcRenderer.invoke('system:disk'),
    processes: () => ipcRenderer.invoke('system:processes'),
    windows: () => ipcRenderer.invoke('system:windows'),
  },
  clipboard: {
    history: () => ipcRenderer.invoke('clipboard:history'),
    write: (text) => ipcRenderer.invoke('clipboard:write', text),
    clear: () => ipcRenderer.invoke('clipboard:clear'),
    delete: (id) => ipcRenderer.invoke('clipboard:delete', id),
  },
  mobile: {
    start: (port) => ipcRenderer.invoke('mobile:start', port),
    stop: () => ipcRenderer.invoke('mobile:stop'),
    ip: () => ipcRenderer.invoke('mobile:ip'),
    status: () => ipcRenderer.invoke('mobile:status'),
  },
  expander: {
    start: () => ipcRenderer.invoke('expander:start'),
    stop: () => ipcRenderer.invoke('expander:stop'),
    restart: () => ipcRenderer.invoke('expander:restart'),
    status: () => ipcRenderer.invoke('expander:status'),
  },
  windowTools: {
    snap: (position) => ipcRenderer.invoke('window:snap', position),
    list: () => ipcRenderer.invoke('window:list'),
    activate: (title) => ipcRenderer.invoke('window:activate', title),
  },
  scheduler: {
    list: () => ipcRenderer.invoke('scheduler:list'),
    save: (task) => ipcRenderer.invoke('scheduler:save', task),
    delete: (id) => ipcRenderer.invoke('scheduler:delete', id),
  },
  notes: {
    list: () => ipcRenderer.invoke('notes:list'),
    save: (note) => ipcRenderer.invoke('notes:save', note),
    delete: (id) => ipcRenderer.invoke('notes:delete', id),
    exportPdf: (opts) => ipcRenderer.invoke('notes:exportPdf', opts),
    exportFile: (opts) => ipcRenderer.invoke('notes:exportFile', opts),
  },
  volume: {
    set: (level) => ipcRenderer.invoke('volume:set', level),
    get: () => ipcRenderer.invoke('volume:get'),
    getLevel: () => ipcRenderer.invoke('volume:getLevel'),
    mute: () => ipcRenderer.invoke('volume:mute'),
  },
  ai: {
    query: (opts) => ipcRenderer.invoke('ai:query', opts),
    models: (endpoint) => ipcRenderer.invoke('ai:models', endpoint),
    buildContext: (query) => ipcRenderer.invoke('ai:buildContext', query),
  },
  color: {
    pick: (delay) => ipcRenderer.invoke('color:pick', delay),
  },
  app: {
    launch: (path) => ipcRenderer.invoke('app:launch', path),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  mouse: {
    pos: () => ipcRenderer.invoke('mouse:pos'),
  },
  journal: {
    list: () => ipcRenderer.invoke('journal:list'),
    save: (entry) => ipcRenderer.invoke('journal:save', entry),
    delete: (id) => ipcRenderer.invoke('journal:delete', id),
    search: (query) => ipcRenderer.invoke('journal:search', query),
  },
  reminders: {
    list: () => ipcRenderer.invoke('reminders:list'),
    save: (reminder) => ipcRenderer.invoke('reminders:save', reminder),
    delete: (id) => ipcRenderer.invoke('reminders:delete', id),
    dismiss: (id) => ipcRenderer.invoke('reminders:dismiss', id),
  },
  notifications: {
    show: (opts) => ipcRenderer.invoke('notifications:show', opts),
  },
  fs: {
    homedir: () => ipcRenderer.invoke('fs:homedir'),
    readdir: (p) => ipcRenderer.invoke('fs:readdir', p),
    stat: (p) => ipcRenderer.invoke('fs:stat', p),
    readfile: (p, maxBytes) => ipcRenderer.invoke('fs:readfile', p, maxBytes),
    copy: (src, dest) => ipcRenderer.invoke('fs:copy', src, dest),
    move: (src, dest) => ipcRenderer.invoke('fs:move', src, dest),
    delete: (p) => ipcRenderer.invoke('fs:delete', p),
    deletedir: (p) => ipcRenderer.invoke('fs:deletedir', p),
    mkdir: (p) => ipcRenderer.invoke('fs:mkdir', p),
    rename: (oldP, newP) => ipcRenderer.invoke('fs:rename', oldP, newP),
    open: (p) => ipcRenderer.invoke('fs:open', p),
    search: (dir, q) => ipcRenderer.invoke('fs:search', dir, q),
  },
  shell: {
    spawn: () => ipcRenderer.invoke('shell:spawn'),
    write: (text) => ipcRenderer.invoke('shell:write', text),
    kill: () => ipcRenderer.invoke('shell:kill'),
  },
  aiSettings: {
    get: () => ipcRenderer.invoke('aiSettings:get'),
    set: (val) => ipcRenderer.invoke('aiSettings:set', val),
  },
  screen: {
    sources: () => ipcRenderer.invoke('screen:sources'),
    capture: (sourceId) => ipcRenderer.invoke('screen:capture', sourceId),
  },
  action: {
    execute: (action) => ipcRenderer.invoke('action:execute', action),
  },
  media: {
    list: () => ipcRenderer.invoke('media:list'),
    import: (filePaths) => ipcRenderer.invoke('media:import', filePaths),
    delete: (id) => ipcRenderer.invoke('media:delete', id),
    update: (id, patch) => ipcRenderer.invoke('media:update', id, patch),
    open: (id) => ipcRenderer.invoke('media:open', id),
    pick: () => ipcRenderer.invoke('media:pick'),
  },
  bookmarks: {
    list: () => ipcRenderer.invoke('bookmarks:list'),
    save: (bm) => ipcRenderer.invoke('bookmarks:save', bm),
    delete: (id) => ipcRenderer.invoke('bookmarks:delete', id),
  },
  chores: {
    list: () => ipcRenderer.invoke('chores:list'),
    save: (chore) => ipcRenderer.invoke('chores:save', chore),
    delete: (id) => ipcRenderer.invoke('chores:delete', id),
    profile: () => ipcRenderer.invoke('chores:profile'),
    setProfile: (p) => ipcRenderer.invoke('chores:setProfile', p),
    complete: (id, owner) => ipcRenderer.invoke('chores:complete', id, owner),
  },
  backup: {
    export: () => ipcRenderer.invoke('settings:export'),
    import: () => ipcRenderer.invoke('settings:import'),
  },
  on: (channel, callback) => {
    const allowed = ['macro:status','macro:progress','system:update','clipboard:update','autoclicker:tick','autoclicker:stopped','scheduler:ran','reminder:due','shell:data','shell:closed','toast:push']
    if (allowed.includes(channel)) ipcRenderer.on(channel, (_, ...args) => callback(...args))
  },
  off: (channel, callback) => ipcRenderer.removeListener(channel, callback),
})
