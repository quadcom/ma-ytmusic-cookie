# PLAN_YTC_02 - Reuse the Music Assistant settings on another Firefox

**Status:** part-built (2026-10-04). 1.0.3 written to the build spec, lint clean, storage logic
measured in a headless Firefox (seed from old local copy, sync wins, sync off removes the synced
copy, Forget clears both). Android measured: no add-on sync there (see build notes). Not yet measured:
real sync between two desktop Firefox installs.

## Goal

Adrian's request (2026-10-04): set the add-on up on a second Firefox (phone, another computer)
without making a new Music Assistant token. Two ways, both on the settings page:

1. **Copy / show the saved token** - works on any Firefox, any account.
2. **Sync** - opt-in; the address and token follow the user's Firefox account to every Firefox
   signed in to it.

Not "across users": Firefox Sync only moves data between installs signed in to the same Firefox
account. Sharing with another person stays a manual copy.

## Decision (Adrian, 2026-10-04)

"An automatic sync is preferable to a manual copy." Sync (part 2) is the main route.
Confirmed by Adrian 2026-10-04 ("yes to both"): sync **on by default**; part 1 shrinks to just the **Show**
toggle on the token field (so the token can still be copied by hand if sync does not reach the
phone); the `ytc1:` Copy/Paste settings line and the `clipboardRead` permission are dropped.

## 1. Copy and show (superseded in part by the decision above - only the Show toggle stays)

`addon/options.html` / `addon/options.js`:

- A **Show** toggle next to the token field: switches `type="password"` <-> `type="text"`.
- A **Copy settings** button: puts one line on the clipboard,
  `ytc1:<base64url of JSON {"address": ..., "token": ...}>`. One paste carries both fields.
- A **Paste settings** button: reads the clipboard (`navigator.clipboard.readText()`, needs the
  `clipboardRead` permission) and fills both fields when the text starts with `ytc1:`; the user
  still presses Save (Save is where Firefox asks for the site permission, which has to come from a
  click). If the clipboard has no `ytc1:` line: "The clipboard does not hold settings copied from
  this add-on. Copy them on the other Firefox first."
- The `ytc1:` prefix is a version tag so a future format change can be told apart.
- Line under the buttons: "This line contains your token. Paste it only into your own Firefox."

Reasoning: base64 is not protection, and does not pretend to be; it only keeps the line in one
piece through chat apps and notes.

## 2. Sync across the user's own Firefox installs

- Checkbox **"Sync these settings to my other Firefox devices"**, on by default (per the decision
  above; was "off" in the first draft).
- On: settings are written to `browser.storage.sync` key `"ma"` (as well as `storage.local`);
  `MA.loadSettings()` reads local first, then sync. Off: the sync copy is removed.
- On a new install, if `storage.sync` already has `"ma"`, the settings page fills in from it and
  says "Settings arrived from your other Firefox. Press Save to let this Firefox reach the server."
  (The site permission is per install and cannot sync; it still needs one click.)
- The popup's Send button also appears when only the sync copy exists, but the send refuses with
  that same sentence until Save has granted the permission (existing "Press Save first" check moved
  into a shared helper in `ma.js`).
- Help text: "Firefox Sync encrypts this with your Firefox account before it leaves the device. It
  only reaches Firefox installs signed in to the same account with add-on data sync turned on."

Facts (reasoned from Mozilla docs, not yet tested here):
- `storage.sync` data is end-to-end encrypted by Firefox Sync with the account's keys.
- It needs the user signed in to a Firefox account with sync on; otherwise it behaves as local
  storage, so nothing breaks.
- Limits: 8 KB per item, 100 KB total; the settings are about 0.5 KB.
- Android: Firefox for Android's support for syncing `storage.sync` is **unverified**; test with
  Adrian's Pixel. If it does not sync there, the Copy/Paste route still covers the phone.

## Refusals

- Paste with a malformed `ytc1:` line (bad base64, missing field) -> no fields changed; "That
  settings line is damaged. Copy it again on the other Firefox."
- Sync never pushes settings that fail `MA.saveSettings` validation.

## Version and changelog

Ships as the next version (1.0.3 if built before the AMO listing, so the store gets it from day
one). Changelog lines (corrected 2026-10-04 after the decision): "Your Music Assistant settings now
follow your Firefox account to your other Firefox devices." and "A Show button lets you see the
saved token."

## Open questions (waiting on Adrian)

1. ~~Both parts, or only one?~~ Answered 2026-10-04: sync preferred over manual copy.
2. ~~Confirm sync on by default, Show toggle only?~~ Yes to both, 2026-10-04.

## Build spec (final, 2026-10-04)

Version **1.0.3**. Supersedes the Copy/Paste parts of section 1 and fills in section 2.

### `addon/ma.js`
- `MA.sitePattern(address)` -> `<scheme>://<host>/*` (moved from `options.js`, same comment about
  Firefox ignoring a port in a site permission).
- `MA.hasPermission(address)` -> `browser.permissions.contains({origins: [MA.sitePattern(address)]})`.
- Storage: `storage.local` key `"ma"` = `{address, token, sync}`; `storage.sync` key `"ma"` =
  `{address, token}`.
- `MA.loadSettings()` -> `{address, token, sync, fromSync}` or null:
  local `ma.sync === false` -> local copy only. Otherwise the sync copy wins when complete (so a
  new token saved on one device reaches the others), `fromSync: true`; else the local copy.
  `sync` defaults to true when nothing says otherwise.
- `MA.saveSettings({address, token, sync})`: same validation as now; writes local; `sync` true ->
  writes the sync copy, false -> `storage.sync.remove("ma")`.
- `MA.forget()`: removes local `"ma"`; removes the sync copy too when sync was on.
- `MA.pushCookie` / `MA.findYtProviders` unchanged.

### `addon/options.html` / `options.js`
- Token field gets a **Show** button toggling `type` password/text (label switches Show/Hide).
- Checkbox `#sync`, checked by default, label "Sync these settings to my other Firefox devices".
- Help line under it: "Firefox encrypts these before they leave this device. They reach only
  Firefox installs signed in to the same Firefox account with add-on data sync turned on."
- On load: fill fields and checkbox from `loadSettings()`. If `fromSync` and
  `!hasPermission(address)`: status "Settings arrived from your other Firefox. Press Save to let
  this Firefox reach the server."
- Save: unchanged order (permission request first, inside the click), passes `sync`.
- Test: uses `MA.hasPermission`.
- Forget: `MA.forget()`; message says whether it also cleared the synced copy.

### `addon/popup.js`
- Send button shows when `loadSettings()` returns settings (either copy). On click, before any
  MA call: if `!(await MA.hasPermission(address))` -> "Open this add-on's Music Assistant settings
  and press Save to let this Firefox reach the server." and stop.

### Other
- `manifest.json` version 1.0.3. No new permissions (`storage` covers `storage.sync`).
- `CHANGELOG.md` 1.0.3 with the two lines above. `README.md` "Set up Send" gains one short
  paragraph on sync and the one Save click on each new Firefox.

### Build notes (2026-10-04)

- Added beyond the spec, at review: `MA.loadSettings()` seeds the synced copy from a 1.0.2-era local
  copy on first read; without it an upgraded install syncs nothing until Save is pressed again.
- The options page help line "stored only in this Firefox profile" became "Anyone using this
  Firefox profile can use the token." (no longer only local once sync is on).
- 1.0.3 is signed unlisted for testing, so the AMO listing ships as the next version up; the store
  still gets sync from its first version.
- Measured 2026-10-04 (Adrian, Pixel 11, latest Firefox for Android): Firefox for Android's Sync
  settings have **no Add-ons option**, so `storage.sync` does not leave the phone; the settings page
  there came up empty. Sync works only between desktop Firefox installs. The phone falls back to
  the Show button (copy the token on desktop, paste once on the phone). Desktop side: on 1.0.3 the
  synced copy is only written when the popup or settings page first opens after the update
  (desktop `storage-sync-v2.sqlite` held nothing for the add-on before that).
- Idea raised for a later plan, not built: a "Sign in to Music Assistant" button on the settings
  page that makes the token itself, so no device ever needs a token pasted in.
- Proposed 2026-10-04 (Adrian, testing 1.2.0 on his Pixel): hide the Sync card on Android, as the
  automatic-updates card already is - Firefox for Android has no add-on sync, so the switch does
  nothing there and its own hint says so. Change: in `options.js`, when
  `runtime.getPlatformInfo().os === "android"`, hide the Sync card (sync stays on internally; on
  Android `storage.sync` behaves as local storage, so nothing else changes). Built 2026-10-04
  ("patch-it, both"), in 1.2.1: `#sync-card` hidden in `options.js` on Android.

