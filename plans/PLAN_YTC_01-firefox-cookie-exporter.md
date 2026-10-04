# PLAN_YTC_01 - Firefox add-on that copies the YouTube Music cookie for Music Assistant

**Status:** proposed (2026-10-04). Nothing built.

## Goal

One click in Firefox puts the exact text Music Assistant's YouTube Music provider asks for on the
clipboard, ready to paste into the provider's "cookie" field.

## What Music Assistant wants (measured 2026-10-04, from the provider docs)

Source: https://www.music-assistant.io/music-providers/youtube-music/

- The **value of the `Cookie` request header** sent by a logged-in request to
  `music.youtube.com` (the docs say: dev tools > Network > filter `/browse` > open a library page >
  Request Headers > `Cookie` > copy the value). Shape: `name1=value1; name2=value2; ...` on one
  line, no leading/trailing space.
- NOT a Netscape `cookies.txt` file (what the exporters Adrian tried produce - one cookie per line,
  tab-separated, with domain/path/expiry columns). That is why those did not work.
- Taken in a **private window**, so normal browsing does not make YouTube rotate the session
  cookies and invalidate the copy.
- When it expires, MA shows `401: Unauthorized`; the fix is to repeat the copy.
- A PO token generator is a separate MA prerequisite; out of scope here.

## Design

Firefox WebExtension, Manifest V3, no build step, no dependencies. Files at the project root under
`addon/`:

- `addon/manifest.json`
  - `manifest_version: 3`, `name: "YT Music Cookie for Music Assistant"`.
  - `permissions: ["cookies", "clipboardWrite", "activeTab"]`.
  - `host_permissions: ["https://music.youtube.com/*", "https://*.youtube.com/*"]` (the cookies API
    only returns cookies for hosts the add-on has permission for).
  - `incognito: "spanning"` (Firefox default; one add-on instance sees both normal and private
    cookie stores).
  - `browser_specific_settings.gecko.id: "ytc@quadcom.ca"` (fixed id - needed for signing and so
    updates replace rather than duplicate). `strict_min_version: "128.0"`.
  - `action.default_popup: "popup.html"`.
- `addon/popup.html` + `addon/popup.js` + `addon/popup.css` - the only UI.

### How the value is built (reasoned; to be checked against the real header in testing)

1. `browser.tabs.query({active: true, currentWindow: true})` -> the tab's `cookieStoreId`. This is
   `firefox-private` in a private window, a container id in a container tab, otherwise
   `firefox-default`. Using the tab's own store means the cookie comes from the same session the
   user just logged into.
2. `browser.cookies.getAll({url: "https://music.youtube.com/", storeId, firstPartyDomain: null})`.
   Passing a URL makes Firefox return exactly the cookies it would send to that URL (domain,
   path, secure all applied). `firstPartyDomain: null` keeps it working if first-party isolation
   is switched on.
3. Sort the way the browser orders the header (longer path first, then older creation first;
   the API gives no creation time, so keep API order within a path length).
4. Join as `name=value` with `"; "`. No trailing separator, no whitespace at either end.
5. `navigator.clipboard.writeText(value)` from the button's click handler.

### Popup contents

- One line each: "Window: private" / "Window: normal - cookie will expire sooner", "Signed in:
  yes/no", "Cookies found: N".
- Button: "Copy cookie for Music Assistant". After copying: "Copied. Paste it into Music
  Assistant > Settings > Providers > YouTube Music. Then close this private window without
  signing out."
- No display of the value itself (it is a full login to the Google account).

## Refusals

- **No cookies for music.youtube.com** -> no copy; says "Open music.youtube.com in this window and
  sign in first."
- **No `SAPISID` / `__Secure-3PAPISID` cookie** -> no copy; says "You are not signed in to YouTube
  Music in this window." (ytmusicapi, which MA uses, derives its auth header from SAPISID; without
  it the cookie cannot work.)
- **Add-on not allowed in private windows** -> a private window cannot run it at all; the popup in
  a normal window says "To copy from a private window, allow this add-on in private windows:
  Add-ons > YT Music Cookie > Run in Private Windows > Allow."
- **Normal window** -> still copies, with the warning line above (Adrian may choose to).
- The value is never stored, logged, or sent anywhere by the add-on.

## Checking it works

- Compare the copied value against the real header from dev tools (the manual MA steps) in the
  same private window: same set of `name=value` pairs. Order difference is acceptable if MA
  accepts it - the final check is pasting into MA and playing a track.
- `web-ext lint` on `addon/` (Mozilla's checker).

## Installing it

Release Firefox only keeps add-ons that Mozilla has signed. Options:

1. **Mozilla-signed, unlisted** (recommended): `web-ext sign --channel unlisted` with a free AMO
   API key. Mozilla signs it automatically within minutes; it is not published on the add-on
   store. Result: an `.xpi` that installs permanently. Outward-facing (uploads the code to
   Mozilla) - Adrian decides.
2. **Temporary load** via `about:debugging` - no account, but removed at every Firefox restart.
3. **Developer Edition / Nightly** with `xpinstall.signatures.required = false`.

## Project files on build

- `addon/` as above.
- `README.md` - what it does, how to install, how to use (the 5 steps a user follows).
- `CHANGELOG.md` - first entry with the first build.
- `.gitignore` gains `web-ext-artifacts/` and `.amo-credentials` (or wherever the API key lives).

## Open questions (waiting on Adrian)

1. Which Firefox does he use day to day - release, ESR, or Developer Edition? Decides install
   route.
2. OK to get a free Mozilla add-ons account and sign it unlisted (install option 1)?
3. GitHub repo for it (private, under quadcom)? Not created yet.
4. Later idea, not in this plan: send the cookie straight into Music Assistant's provider
   settings through the MA server's API, so no paste is needed. Worth a plan of its own?
5. Fallback method if the built value does not match: capture the real `Cookie` header from the
   next `music.youtube.com/youtubei/v1/browse` request via `webRequest.onBeforeSendHeaders`.
   Needs the `webRequest` permission and a page reload. Only if step-by-step testing shows the
   built value is wrong.
