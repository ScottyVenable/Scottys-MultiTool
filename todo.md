# Todo

## Next

- Local server + launcher CLI (menu to run tests, start app, start server, tail logs) with dedicated console and structured logging. App gets a bottom status bar with server-state pill (red / yellow / green) and other component indicators.
- Browser takes over most of the screen: pinned-component sidebar on the left, compact header with controls, exit button back to main menu, splash before entering, and a "fetched info" summary surface with a "View in Browser" action.
- Fix the occasional security / suspicious-content warning the browser shows when fetching remote info.
- Universal currency + challenges: earn coins from focus sessions / chores / reminders / daily challenges, spend in a small rewards panel, pill in topbar. Local-only until the social layer lands.

## Needs server (scaffold once local server exists)

- Friends list + presence (dynamic status like "focusing on ...", "playing ...", "relaxing").
- Household invites and chore assignment across friends.
- Messages center (separate from notifications bell) with click-to-open conversation view.
- Focus-with-friends: shared timers, quorum-pause, leaderboards, badges.
- Premium currency tier + referral rewards.

## Known bugs

- VS Code `ptyHost heartbeat` / `ERR_NETWORK_IO_SUSPENDED` - not this app; occurs in the editor while offline.

## Done

- Welcome tab as its own component - 0246c7fe / a998c0cc
- Logo + wordmark + concepts doc - 781a8827
- Detachable CLI window - 3a469d07
- Browser splash overlay - 72bc0f35
- Chore households, members, month calendar - c0a92d92
- Chore auto-reminders + scoped leaderboard - d51de3ef
- Windows Open-With registration - 0e66f3f7
- Component marketplace (.mbcomp + GitHub import) - f46e346b
- Visual create wizard - d7a43b0b
- Monaco IDE with file tree, terminal, AI panel - f60f968e
- Chrome DevTools Protocol target - 867e0b2d
- Media Library rendering, LM Studio error banner, rounded chat avatars, Notifications Center - 24652326
