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
    listDetailed: () => ipcRenderer.invoke('window:listDetailed'),
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
  marketplace: {
    list: () => ipcRenderer.invoke('marketplace:list'),
    install: (pack) => ipcRenderer.invoke('marketplace:install', pack),
    uninstall: (name) => ipcRenderer.invoke('marketplace:uninstall', name),
    importFromFile: () => ipcRenderer.invoke('marketplace:importFromFile'),
    importFromGithub: (url) => ipcRenderer.invoke('marketplace:importFromGithub', url),
    export: (pack) => ipcRenderer.invoke('marketplace:export', pack),
  },
  customComponents: {
    list: () => ipcRenderer.invoke('customComponents:list'),
    save: (comp) => ipcRenderer.invoke('customComponents:save', comp),
    delete: (id) => ipcRenderer.invoke('customComponents:delete', id),
  },
  fs: {
    homedir: () => ipcRenderer.invoke('fs:homedir'),
    readdir: (p) => ipcRenderer.invoke('fs:readdir', p),
    stat: (p) => ipcRenderer.invoke('fs:stat', p),
    readfile: (p, maxBytes) => ipcRenderer.invoke('fs:readfile', p, maxBytes),
    writefile: (p, content) => ipcRenderer.invoke('fs:writefile', p, content),
    copy: (src, dest) => ipcRenderer.invoke('fs:copy', src, dest),
    move: (src, dest) => ipcRenderer.invoke('fs:move', src, dest),
    delete: (p) => ipcRenderer.invoke('fs:delete', p),
    deletedir: (p) => ipcRenderer.invoke('fs:deletedir', p),
    mkdir: (p) => ipcRenderer.invoke('fs:mkdir', p),
    rename: (oldP, newP) => ipcRenderer.invoke('fs:rename', oldP, newP),
    open: (p) => ipcRenderer.invoke('fs:open', p),
    search: (dir, q) => ipcRenderer.invoke('fs:search', dir, q),
  },
  ide: {
    projectsDir: () => ipcRenderer.invoke('ide:projectsDir'),
  },
  cdp: {
    detect: () => ipcRenderer.invoke('cdp:detect'),
    launch: (opts) => ipcRenderer.invoke('cdp:launch', opts),
    attach: (opts) => ipcRenderer.invoke('cdp:attach', opts),
    listTargets: () => ipcRenderer.invoke('cdp:listTargets'),
    navigate: (opts) => ipcRenderer.invoke('cdp:navigate', opts),
    screenshot: () => ipcRenderer.invoke('cdp:screenshot'),
    action: (opts) => ipcRenderer.invoke('cdp:action', opts),
    close: () => ipcRenderer.invoke('cdp:close'),
  },
  shell: {
    spawn: () => ipcRenderer.invoke('shell:spawn'),
    write: (text) => ipcRenderer.invoke('shell:write', text),
    kill: () => ipcRenderer.invoke('shell:kill'),
  },
  cli: {
    open: () => ipcRenderer.invoke('cli:open'),
  },
  shellIntegration: {
    register: (exts) => ipcRenderer.invoke('shell:registerFileAssoc', exts),
    unregister: (exts) => ipcRenderer.invoke('shell:unregisterFileAssoc', exts),
    getLaunchFile: () => ipcRenderer.invoke('shell:getLaunchFile'),
  },
  aiSettings: {
    get: () => ipcRenderer.invoke('aiSettings:get'),
    set: (val) => ipcRenderer.invoke('aiSettings:set', val),
  },
  screen: {
    sources: () => ipcRenderer.invoke('screen:sources'),
    capture: (sourceId, opts) => ipcRenderer.invoke('screen:capture', sourceId, opts),
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
  mediaPlayer: {
    status:  () => ipcRenderer.invoke('media:status'),
    control: (action) => ipcRenderer.invoke('media:control', action),
  },
  bookmarks: {
    list: () => ipcRenderer.invoke('bookmarks:list'),
    save: (bm) => ipcRenderer.invoke('bookmarks:save', bm),
    delete: (id) => ipcRenderer.invoke('bookmarks:delete', id),
  },
  backup: {
    export: () => ipcRenderer.invoke('settings:export'),
    import: () => ipcRenderer.invoke('settings:import'),
  },
  auth: {
    listUsers: () => ipcRenderer.invoke('auth:listUsers'),
    currentUser: () => ipcRenderer.invoke('auth:currentUser'),
    register: (payload) => ipcRenderer.invoke('auth:register', payload),
    login: (payload) => ipcRenderer.invoke('auth:login', payload),
    logout: () => ipcRenderer.invoke('auth:logout'),
    updateProfile: (patch) => ipcRenderer.invoke('auth:updateProfile', patch),
    changePassword: (payload) => ipcRenderer.invoke('auth:changePassword', payload),
    deleteAccount: (payload) => ipcRenderer.invoke('auth:deleteAccount', payload),
    recoveryLogin: (payload) => ipcRenderer.invoke('auth:recoveryLogin', payload),
    verifyRecoveryCode: (payload) => ipcRenderer.invoke('auth:verifyRecoveryCode', payload),
  },
  splash: {
    onProgress: (cb) => ipcRenderer.on('splash:progress', (_, p) => cb(p)),
    onDone: (cb) => ipcRenderer.on('splash:done', () => cb()),
  },
  chores: {
    list: () => ipcRenderer.invoke('chores:list'),
    save: (chore) => ipcRenderer.invoke('chores:save', chore),
    delete: (id) => ipcRenderer.invoke('chores:delete', id),
    profile: () => ipcRenderer.invoke('chores:profile'),
    setProfile: (p) => ipcRenderer.invoke('chores:setProfile', p),
    complete: (id, owner) => ipcRenderer.invoke('chores:complete', id, owner),
    achievements: () => ipcRenderer.invoke('chores:achievements'),
  },
  on: (channel, callback) => {
    const allowed = ['macro:status','macro:progress','system:update','clipboard:update','autoclicker:tick','autoclicker:stopped','scheduler:ran','reminder:due','shell:data','shell:closed','toast:push','auth:changed','splash:progress','splash:done']
    if (allowed.includes(channel)) ipcRenderer.on(channel, (_, ...args) => callback(...args))
  },
  off: (channel, callback) => ipcRenderer.removeListener(channel, callback),
})
