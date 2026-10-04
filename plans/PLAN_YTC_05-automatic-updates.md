# PLAN_YTC_05 - Keep Music Assistant up to date automatically

**Status:** proposed (2026-10-04). Nothing built. To ship in the same **1.2.0** release as
PLAN_YTC_04 (Adrian, 2026-10-04: "include it in the 1.2.0 push"); 1.2.0 is held, unsigned, until
both are built and tested.

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
  (default 6, set from the probes) **and** the built cookie differs from the last one sent
  (compared by SHA-256 of the header string via `crypto.subtle.digest`; the cookie itself is
  never stored, only its hash and the push time, in `storage.local`).
- **Health check**: a `browser.alarms` alarm every 30 minutes calls `MA.providerError`; if MA
  reports an error on the YouTube Music provider, push at once (no throttle), at most once per
  30 minutes, so an expired cookie is replaced without waiting.
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

1. Run the playback probe (Step 0.1) with Adrian before the throttle default is fixed?
2. Default minimum gap between pushes: 6 hours suggested; shorter if the probe shows a reload
   does not interrupt playback.
3. Container picker now, or default store only for 1.2.0 (recommended: default store only)?
4. Android: offer the toggle there too (untested background behaviour), or desktop only for now?
