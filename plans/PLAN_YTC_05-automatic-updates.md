# PLAN_YTC_05 - Keep Music Assistant up to date automatically

**Status:** part-built (2026-10-04, end of session). In 1.2.1 (submitted). Measured: the first
automatic push on Adrian's desktop, and the smoke test. Not yet seen in real use: a push triggered
by YouTube rotating the login, the idle wait, and the fresh-login background tab.

## Goal

Adrian's idea (2026-10-04), from Tube Archivist's companion add-on, which pushes each new YouTube
cookie to its server in the background: instead of the private-window routine, the add-on watches
the YouTube cookies in the user's normal Firefox and, when they change, sends the new set to
Music Assistant. The cookie MA holds then never goes stale while the user keeps using YouTube.

Opt-in, off by default. The private-window Copy/Send stays as it is.

## Why the private-window routine exists, and why this replaces it

Google rotates the session cookies (`__Secure-1PSIDTS` / `__Secure-3PSIDTS` and the `*SIDCC`
family) while YouTube is in use; a copy taken from a browser that keeps browsing goes stale, so
the usual advice is a private window that is closed afterwards. If the add-on follows every
rotation, the browser can keep browsing and MA still always has the latest set.

## Facts

Measured / read 2026-10-04:
- `browser.cookies.onChanged` delivers `{removed, cookie, cause}` for every cookie set or removed,
  with the cookie's `storeId` (MDN, cookies/onChanged).
- MA's reconfigure finish reloads the provider (`load_provider_config`) and, if the reload fails,
  restores the previous setup data (`music_assistant/controllers/config/flows.py:452-470`, fork),
  so a bad push leaves MA on its last working cookie.
- The YouTube Music provider needs `__Secure-3PAPISID` (upstream 2.10.5) - already checked by the
  existing refusal.
Reasoned, to be measured:
- How often the relevant cookies change during normal use (minutes or hours).
- Whether a provider reload interrupts a YouTube Music track that MA is playing.
- Whether Firefox for Android keeps a background listener alive.

## Step 0 - probes before building the push logic

1. **Playback probe** (Adrian present): start a YouTube Music track on an MA player, press Send
   in the add-on (1.1.0 on desktop already does a reconfigure), note whether playback stops,
   skips or carries on. Decides how aggressive the throttle may be.
2. **Rotation probe**: the build ships a counter first (see "Settings"), "YouTube cookie changes
   seen" with the time of the last one, so a day of Adrian's normal use shows the real rate
   before the defaults are final.

## Design

### Background (`background.js`, event page)
- Top-level `browser.cookies.onChanged` listener (wakes the event page). Ignore unless:
  automatic updates are on, the cookie's domain ends in `youtube.com`, `cookie.storeId` is the
  watched store (`firefox-default` unless the user picks a container), and the cookie name is in
  the relevant set: `SID`, `HSID`, `SSID`, `APISID`, `SAPISID`, `__Secure-1PAPISID`,
  `__Secure-3PAPISID`, `__Secure-1PSID`, `__Secure-3PSID`, `__Secure-1PSIDTS`,
  `__Secure-3PSIDTS`, `LOGIN_INFO`. The `*SIDCC` cookies change on almost every request and are
  carried along when a push happens but never trigger one.
- **Debounce**: a change starts (or restarts) a 2-minute `browser.alarms` timer, so a burst of
  rotations becomes one push.
- **Throttle**: when the timer fires, push only if the last push was at least `minHours` ago
  (default 1, set from the playback probe; was 6 before it) **and** the built cookie differs from the last one sent
  (compared by SHA-256 of the header string via `crypto.subtle.digest`; the cookie itself is
  never stored, only its hash and the push time, in `storage.local`).
- **Health check**: a `browser.alarms` alarm every 5 minutes calls `MA.providerError`; if MA
  reports an error on the YouTube Music provider, push at once (no throttle, no idle wait), at
  most once per 30 minutes, so an expired cookie is replaced without waiting (see "Fresh login"
  below when the browser has nothing newer). Changed from 30 to 5 minutes for the phone fix.
- **Idle wait** (from the playback probe): a due push waits while any MA player is playing
  YouTube Music, re-checking on the next alarm.
- The push itself reuses `MA.pushCookie` with the saved settings and the provider chosen in
  settings (or the only one). The cookie is built with the same code as the popup's (moved into
  a shared `cookie.js` used by both), from the watched store.
- Refusals: settings missing, no site permission, not signed in to YouTube (no SAPISID) -> no
  push, and the reason is recorded for the settings page; never retried in a loop (the next
  cookie change or health check tries again).
- Manifest: add `"alarms"` permission. No new host permission (MA's site permission is already
  granted at Save; YouTube hosts are already declared).

### Settings - new card "Automatic updates"
- Toggle "Send new YouTube cookies to Music Assistant automatically", off by default.
- Plain explanation under it: "Uses your normal Firefox YouTube login, not a private window.
  Whenever YouTube refreshes your login, the add-on sends the new one to Music Assistant - at
  most every few hours, and at once if Music Assistant reports the old one has stopped working."
- Status lines: "Last sent: <time>" (or "Not sent yet"), "Last problem: <reason>" when there is
  one, and the probe counter "YouTube cookie changes seen: <n> (last <time>)".
- A "Send now" button (same as the popup's Send but from the normal store).
- Watched container picker, shown only when the user has Firefox containers (`contextualIdentities`
  API, needs the `contextualIdentities` permission only if the picker ships - decide after build
  review; default store otherwise).

### Popup
- When automatic updates are on, a fourth status row: "Automatic updates on - last sent <time>".

## Refusals

- Off by default; nothing is watched or sent until the user turns it on.
- Private-window cookie stores are never watched (they vanish when the window closes).
- The cookie value is never written to storage, logs or the settings page.
- If the MA push fails, the reason is shown in settings and the popup row turns amber; no
  retry storm.

## Store and docs

- `amo-metadata.json` and README: explain the option, that it uses the everyday login, is off by
  default, and sends only to the user's own server.
- Changelog 1.2.0 gains: "Optional automatic updates: keep Music Assistant's YouTube Music login
  fresh while you use YouTube."

## Open questions (waiting on Adrian)

Answered by Adrian 2026-10-04:
1. Playback probe: yes, run it together (in progress).
2. Minimum gap: set it from the probe's result; 6 hours if the probe cannot decide.
3. Containers: Adrian was unsure what they are (Firefox's Multi-Account Containers - separate
   logins per tab group); default store only for 1.2.0, no picker, no `contextualIdentities`.
4. Android: no automatic updates on the phone - the settings card is hidden when
   `runtime.getPlatformInfo().os === "android"`. Reason (Adrian): on a phone people use the
   YouTube Music app, not the browser, so there are no browser cookie changes to follow. The
   phone keeps the manual Send, which Adrian uses when MA shows a cookie error while he is away
   from his desk.
5. Phone fix: self-healing from the desktop (below), accepted 2026-10-04; desktop Firefox stays
   running (Adrian).
6. Fresh-login background tab: accepted 2026-10-04 ("add that to plan 5").

## Probe results (2026-10-04)

- **Playback probe (measured, Adrian listening; MA polled read-only once a second):** a YouTube
  Music track ("Balthus Bemused By Color") playing on the Lower Greatroom player; Adrian pressed
  Send (a provider reconfigure + reload). Playback **stopped and resumed by itself after about
  4-5 seconds** (Adrian's ears). MA's `playback_state` did not change and the provider reported
  no error during it (the poll saw nothing, so the gap is a stall inside "playing").
- Consequence for the design: a push is audible, so automatic pushes **wait until no MA player
  is playing YouTube Music** (`players/all`: any player `playing` whose `current_media.uri`
  starts with the YouTube Music provider's instance id). Exception: if the provider is already
  in error, playback from it is broken anyway, so the push goes at once.
- With pushes deferred to idle moments, the minimum gap drops from 6 hours to **1 hour**
  (Adrian, 2026-10-04: set it from the probe).

## Fresh login when the browser's copy is old (added 2026-10-04, Adrian)

Google only rotates the login while YouTube is being used in the browser; with no YouTube tab
open, the browser's cookie stays the same as the one MA holds. If MA reports the provider in
error and the built cookie's hash equals the last one sent (nothing newer to send), the add-on
opens `https://music.youtube.com/` in a background tab (`tabs.create({active: false})`), waits
for the cookie set to change (onChanged on the relevant names) or 60 seconds, closes the tab,
then pushes. At most once per hour; reason recorded if no new cookie arrives ("YouTube did not
give a fresh login; open music.youtube.com and sign in."). Reasoned, not tested: whether a page
load alone makes Google rotate the session cookies - measured the first time it runs.

## Phone fix (proposed 2026-10-04)

With automatic updates on in the desktop Firefox, the health check already pushes a fresh cookie
as soon as MA reports the YouTube Music provider in error. Shortening that check from 30 to
5 minutes (one small read-only API call) makes MA heal itself within minutes, from wherever
Adrian is, as long as the desktop Firefox is running - so the phone usually needs to do nothing.
The phone's manual Send stays as the fallback for when the desktop is off.

## Build contract (2026-10-04, written at build start)

Build authorised by Adrian 2026-10-04 ("let's build plan 05"). Ships in 1.2.0 (manifest version
stays 1.2.0).

- `addon/cookie.js` (written by the session model at build start): `YT_COOKIE.build(storeId)`
  -> `{signedIn, count, value}` (moved out of `popup.js`, which now uses it) and
  `YT_COOKIE.hash(value)` -> SHA-256 hex.
- Manifest: `"permissions"` gains `"alarms"`; `"background": {"scripts": ["cookie.js", "ma.js",
  "background.js"]}`.
- State in `storage.local` key `"auto"`:
  `{enabled: false, lastPushAt: 0, lastHash: "", lastProblem: "", lastProblemAt: 0,
  changesSeen: 0, lastChangeAt: 0, lastHealthPushAt: 0, lastFreshTabAt: 0}` (times in ms).
  Only the background writes it, except that nothing else may write it at all; pages read it and
  follow `storage.onChanged`.
- Messages to the background (`runtime.sendMessage`):
  `{type: "auto-set", enabled: bool}` -> persists `enabled`, creates or clears the alarms,
  answers `{ok: true}`;
  `{type: "auto-push-now"}` -> one push from the normal store now, skipping throttle and idle
  wait (the user asked), answers `{ok, message}` with a user-facing sentence.
- Alarms: `"ytc-debounce"` (2 minutes after the last relevant cookie change), `"ytc-health"`
  (every 5 minutes while enabled).
- The YouTube Music provider pushed to: the first from `MA.findYtProviders(settings)`.
- `MA.ytMusicPlaying(settings, instanceId)` (new, `ma.js`): true when any player from
  `players/all` has `playback_state` (or `state`) `"playing"` and a `current_media.uri` starting
  with `instanceId` (measured format on Adrian's MA: `ytmusic--YMu8ov9w://...`).
- Android: the settings card and the popup row are hidden when
  `(await browser.runtime.getPlatformInfo()).os === "android"`, and the background ignores
  `auto-set` there.

## Build notes (2026-10-04)

- Added at review: switching automatic updates on schedules `ytc-debounce` 1 minute later, so
  the first send does not wait for YouTube's next rotation (which could be hours away).
- Writers' choices kept: `auto-set` / `auto-push-now` answer through a shared `guarded()` that
  also holds the overlap flag ("A push is already running."); the health check exits quietly
  when MA, permission or the provider is missing; a failed `auto-set` reverts the toggle; the
  "Last problem" line uses a `.warn-text` class.
- Smoke test (measured, headless Firefox, add-on installed temporarily, no MA configured):
  welcome tab opened on install; the settings card shows on desktop; `auto-set` on -> alarms
  `ytc-health` (every 5 min) and `ytc-debounce` (once); setting `__Secure-3PSIDTS` counted one
  change while a `SIDCC` change was ignored; `auto-push-now` refused with "Music Assistant is not
  set up in this add-on yet." and the settings card showed it as the last problem; `auto-set`
  off cleared both alarms.
- Known limit (reasoned): Firefox may suspend an idle event page after about 30 s; the
  fresh-login step's 60-second wait relies on the tab's cookie events keeping it awake or
  ending the wait early. Measured the first time the step runs for real.
- Measured 2026-10-04 on Adrian's desktop, signed 1.2.0 (unlisted): automatic updates switched
  on; the first push went out on its own ("Last sent: 4 Oct, 11:12"), from the normal store,
  about a minute after switching on; MA's YouTube Music provider afterwards: enabled, no
  `last_error` (read via the API). "YouTube cookie changes seen: 0" at that point - no rotation
  yet, so the change-triggered path is still to be seen in normal use.
- Patch 2026-10-04 (Adrian: "patch-it, both"), in 1.2.1, after Adrian pointed out that a normal
  window is fine now: the popup's window row no longer tells everyone to use a private window.
  Private -> tick "Private window"; normal on Android or with automatic updates on -> tick
  ("Normal window" / "Normal window - automatic updates keep it fresh"); normal on desktop with
  them off -> amber "turn on automatic updates in settings to keep it fresh". Adrian also asked
  that it be clear automatic updates are desktop-only and run while Firefox with the add-on is
  open: the card is titled "Automatic updates (desktop)" with a line saying so, and the README,
  store description and welcome page say the same; the README/store/welcome sending steps now
  say a normal window is fine and a private window is optional.

