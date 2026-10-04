# PLAN_YTC_01 - Firefox add-on that copies the YouTube Music cookie for Music Assistant

**Status:** part-built (2026-10-04). Code written and passing `web-ext lint` (0 errors, 0 warnings);
not yet run in a browser. Waiting on: Adrian's Mozilla add-ons account (signing + listing), and
the first real test on his phone and against his MA.

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
    updates replace rather than duplicate). `strict_min_version: "142.0"`.
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

## Send straight to Music Assistant (added 2026-10-04, Adrian's request)

Adrian's rule (2026-10-04): he gives the add-on his MA server's address once, and the add-on pushes
the cookie into the YouTube Music provider itself, so no paste is needed. Copy stays as a fallback.

### What the server offers (measured 2026-10-04)

- Adrian's MA: version **2.10.5**, HA add-on, port 8095 open on the LAN; `GET /info` answers
  without login. `GET /api-docs/commands.json` on the live server lists `config/providers`,
  `config/providers/reconfigure`, `config/flows/submit`, `config/flows/get`,
  `config/flows/abort`, `auth/token/create` (345 commands in all).
- `POST /api` takes one JSON command `{"message_id": "...", "command": "...", "args": {...}}`
  with `Authorization: Bearer <token>`
  (`music_assistant/controllers/webserver/controller.py:634`, Adrian's `ma-server` fork; upstream
  2.10.5 has the same route).
- The YouTube Music cookie is a **setup value**, not an ordinary setting: provider domain
  `ytmusic`, key `cookie`, type secure string; the same form also holds `username` (required)
  and `po_token_server_url` (`music_assistant/providers/ytmusic/setup_flow.py:22-35`). Upstream
  2.10.5 reads it with `get_setup_value("cookie")` (fetched from GitHub 2026-10-04). So it is
  changed through the **reconfigure flow**, the same form MA's own UI shows for "re-authenticate",
  not through `config/providers/save`.
- Secure values are never sent back by the server: a reconfigure form arrives with the cookie
  field empty and the other fields prefilled (`music_assistant/models/setup_flow.py:561-564`).
- The provider itself refuses a cookie without `__Secure-3PAPISID` (upstream 2.10.5 provider
  code), which matches this plan's sign-in check.

### MA login (added 2026-10-04)

Adrian's MA runs as a Home Assistant add-on and he signs in to it through Home Assistant. That
still makes him an MA user: MA keeps its own user list and links the HA login to it. Changing a
provider's sign-in needs the **admin** role (`ROLE_SCOPES` in
`music_assistant/controllers/webserver/helpers/auth_middleware.py:54`, fork; the user role only
reads provider settings). So:

- **Option A (recommended): a token from his existing admin user.** No new account. Made from his
  MA profile (`auth/token/create`, one-year expiry, shown once). Exact menu location to be checked
  in MA 2.10.5's UI at build time.
- **Option B: a separate MA account just for the add-on.** It must also be admin to do the job,
  so it is no safer; only benefit is a separate name in MA's user list to revoke.

Port 8095 accepts a bearer token directly; Home Assistant's login is not involved in the API
call.

### Settings page (`addon/options.html` + `addon/options.js`)

- Two fields: **Music Assistant address** (e.g. `http://<ip>:8095`) and **access token**.
- Token: a long-lived token made in MA's own UI (user profile > tokens; MA calls it
  `auth/token/create`, lasts one year). The page says where to make one. The add-on never asks
  for the MA password.
- "Test connection" button: `GET <address>/info` (no login) then `config/providers` with the
  token. Reports "Connected to Music Assistant 2.10.5; YouTube Music found." or what failed.
- Stored in `browser.storage.local` (stays in this Firefox profile, not synced). Stated on the
  page: anyone with this Firefox profile can use the token.
- Manifest gains `"options_ui": {"page": "options.html"}`, `"storage"` permission, and
  `"optional_host_permissions": ["http://*/*", "https://*/*"]`. On save, the page calls
  `browser.permissions.request({origins: ["<address>/*"]})` for that one server only, so the
  add-on can reach it (Firefox lets an add-on with host permission skip the cross-site block).

### Push steps (popup button "Send to Music Assistant")

Shown only when settings are filled in. Same cookie-building and refusals as the copy button.

1. `config/providers` -> keep entries with `domain == "ytmusic"`.
   None -> refuse: "YouTube Music is not set up in Music Assistant yet. Add it there once, then
   use this button." More than one -> a picker by name.
2. `config/providers/reconfigure {instance_id}` -> a step of type form with a `flow_id` and the
   entries `username`, `cookie`, `po_token_server_url`.
3. `config/flows/submit {flow_id, values}` where `values` = every entry's current value from the
   step, with `cookie` set to the new value. Nothing else is changed.
4. Result: finish -> "Sent. Music Assistant is reloading YouTube Music." Same form back with
   errors -> show MA's error text and stop. Abort -> show its reason and stop. Anything else
   (network, 401, unknown step) -> `config/flows/abort {flow_id}` if a flow was opened, then show
   the error.
5. Then `config/providers/get {instance_id}` a few seconds later; if `last_error` is set, show it
   ("Music Assistant says: ...").

### Refusals added

- No address or token saved -> the send button is hidden; the copy button still works.
- `/info` does not answer -> "Can't reach Music Assistant at <address>." No retry loop.
- 401 / 403 -> "Music Assistant refused the token. Make a new one in your MA profile."
- The flow's form does not contain a `cookie` field -> refuse and abort the flow: "This Music
  Assistant version changed how YouTube Music signs in; use Copy instead." (Guards against a
  future MA renaming the field.)

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
- Send to MA on Adrian's server, then play a YouTube Music track in MA.
- `web-ext lint` on `addon/` (Mozilla's checker).

## Installing it

Correction 2026-10-04 (Adrian's answers): the main target is **Firefox for Android** (latest
release, auto-updating, on a Pixel 11), with desktop Firefox as well. The repo may be **public**
(Adrian, 2026-10-04). This replaces the earlier "unlisted" recommendation.

Facts (from Mozilla's Extension Workshop, fetched 2026-10-04 - reasoned, not yet tried here):
- Release Firefox, desktop and Android, only installs add-ons signed by Mozilla. Signing is free.
- Android release can install a signed `.xpi` from a file, through a hidden menu: Settings >
  About Firefox > tap the logo 5 times > back to Settings > "Install extension from file".
  Unsigned files are refused there too.
- An add-on **listed** on addons.mozilla.org (AMO) and marked Android-compatible installs from the
  store page on the phone in one tap, and gets updates automatically.

Recommended: **listed on AMO** (public), since the repo is public anyway. Easiest on the phone,
updates itself, and anyone else with the same Music Assistant problem can find it. Listed add-ons
go through Mozilla review (automatic checks immediately; a human review may follow). Fallback while
waiting for review: sign the same build **unlisted** (`web-ext sign --channel unlisted`) and
install the `.xpi` from file on the phone. Both upload the code to Mozilla - outward-facing,
Adrian confirms before the first upload.

Manifest additions for this: `browser_specific_settings.gecko_android: {"strict_min_version":
"142.0"}`; the AMO data-collection declaration
(`browser_specific_settings.gecko.data_collection_permissions`) - check at build time which value
fits an add-on that sends a login cookie only to a server the user names (likely
`required: ["authenticationInfo"]`).

### Android-specific behaviour to check in testing (reasoned)

- The toolbar popup opens as a full page on Android; layout must fit a phone width.
- `browser.cookies` and private tabs (`cookieStoreId == "firefox-private"`) are supported on
  Android; the add-on must be allowed in private browsing there too (add-on settings > "Run in
  private browsing").
- music.youtube.com on a phone may push the app or a mobile layout. Whether that session's
  cookie works in MA is untested; "Request desktop site" may be needed. First Android test answers
  this.

## Project files on build

- `addon/` as above.
- `README.md` - what it does, how to install, how to use (the 5 steps a user follows).
- `CHANGELOG.md` - first entry with the first build.
- `.gitignore` gains `web-ext-artifacts/` and `.amo-credentials` (or wherever the API key lives).

## Open questions (waiting on Adrian)

1. ~~Which Firefox?~~ Answered 2026-10-04: Firefox for Android, latest, on a Pixel 11.
2. OK to create a free Mozilla add-ons account and list it publicly on AMO? (Recommended above.)
3. ~~GitHub repo?~~ Answered 2026-10-04: public is fine. Not created yet; creating it is
   outward-facing, so it waits for "build".
4. ~~Send the cookie straight into MA.~~ Adrian asked for it 2026-10-04; now in this plan, see
   "Send straight to Music Assistant".
5. Fallback method if the built value does not match: capture the real `Cookie` header from the
   next `music.youtube.com/youtubei/v1/browse` request via `webRequest.onBeforeSendHeaders`.
   Needs the `webRequest` permission and a page reload. Only if testing shows the built value is
   wrong.
6. MA address to use in settings: the LAN `http://<ip>:8095` form or the HTTPS proxy name - both
   answer `/info` (measured 2026-10-04). On a phone away from home, only an address reachable from
   there works; at home either does.
7. Which MA account owns the token (see "MA login" below).

## Build notes (2026-10-04)

- Correction: minimum Firefox raised from 128 to **142** on desktop and Android. Found by
  `web-ext lint`: `data_collection_permissions` (required for AMO) only exists from Firefox 140
  desktop / 142 Android, so 128 would declare a key older versions ignore.
- `data_collection_permissions.required` set to `["authenticationInfo"]`, as reasoned above.
- Built as planned except: with more than one YouTube Music provider, the first Send shows a
  picker and asks for Send again; the settings page's Test refuses until Save has granted the
  site permission (otherwise Firefox's block looks like a dead server).
- Untested risk: on Android the popup may open as its own tab, in which case "active tab" is the
  popup, not YouTube Music, and the cookie store would be wrong. First phone test checks this.
- Linting: `npx web-ext lint --source-dir addon` (web-ext 10.7.0, installed outside the repo).
- 2026-10-04, measured on Adrian's desktop Firefox: 1.0.0 signed unlisted (web-ext sign, minutes).
  "Test connection" to `http://<ip>:8095` failed as unreachable although the site permission was
  granted and the server answered `/info` from curl. Cause: Firefox's default MV3 policy for
  extension pages includes `upgrade-insecure-requests`, so the fetch went to `https://<ip>:8095`,
  where MA has no TLS (curl exit 35). Fix in 1.0.1: `content_security_policy.extension_pages` set
  to `script-src 'self'; object-src 'self';` (the default minus the upgrade).
- MA's `/api` needs an **MA** token; a Home Assistant token is a different thing. (Reasoned; not
  probed - Adrian first tried the token he uses for VS Code.)
