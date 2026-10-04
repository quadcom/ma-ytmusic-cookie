# PLAN_YTC_04 - One design for the popup, settings and welcome pages, plus the store page

**Status:** part-built (2026-10-04). 1.2.0 written to the build spec, reviewed, `web-ext lint`
clean (0/0/0), loaded temporarily in the build box's Firefox (welcome page opened on install).
Held, unsigned, at Adrian's request: it ships together with PLAN_YTC_05. Store screenshots and
Adrian's desktop/phone test still to do.

## Goal

Adrian's request (2026-10-04): the add-on's pages get a design of our choosing instead of the plain
look of 1.0-1.1. One look shared by:

- the **popup** (toolbar button; narrow on desktop, full page on Android),
- the **settings page** (`options.html`, its own tab),
- a new **welcome page** the add-on opens once after install (`runtime.onInstalled`, reason
  `install`), walking through: allow private windows, enter the address, sign in,
- the **AMO store listing** (description text, screenshots of the new pages).

Facts that bound the design (reasoned from the WebExtension rules, measured where noted):
- Pages are our own HTML/CSS; everything must ship inside the add-on (no web fonts or remote
  images - the extension page policy blocks them). System font stack or a bundled font file.
- Must work at phone width and in light and dark mode.
- The black screen Firefox shows when an `.xpi` is opened directly is Firefox's own and cannot be
  changed; users installing from the store see the store page instead.

## Design session (2026-10-04)

Three sample directions shown to Adrian as one comparison page; he picks one and it is tweaked
from there. Decisions are logged below as they are made.

### Decisions

- 2026-10-04: mockups served from the build box (`/work/out/ytc-design`, `python3 -m http.server
  8770`) and shown in its desktop Chrome, at Adrian's request (not a claude.ai artifact). Three
  directions: A Studio (dark, red `#e0312b`, Space Grotesk, flat cards, no step numbers),
  B Clear (light, blue, IBM Plex Sans, numbered steps), C Vinyl (navy, amber, Fraunces + DM Sans,
  rounded). Mockup sources in the session scratchpad `ytc-design/`.
- 2026-10-04: **Adrian picked A (Studio)**, and asked to add the Home Assistant and Music
  Assistant logos.
- 2026-10-04: partner logos added to the mockup from the MA frontend's own assets
  (`music-assistant-frontend/src/assets/icon.svg` = MA house with sound bars,
  `home-assistant-logo.svg`): HA mark on "Sign in with Home Assistant" (white chip on the red
  button), MA mark on the server step heading, the "Music Assistant account" button, the popup's
  MA row (with a green version pill) and the Send button. Before the store release: check both
  projects' logo-use terms (Open Home Foundation brand rules for HA; MA's licence) - showing a
  partner's mark beside the thing it names is the usual "sign in with" use, but it is their call.
- 2026-10-04: Adrian asked for an add-on logo mixing the YouTube play symbol and the MA logo.
  Four options drawn as inline SVG at 96/48/20 px and on a light toolbar: 1 Cookie play (red
  cookie with a bite and a white play triangle), 2 House play (red house holding a play
  triangle), 3 Play to bars (red rounded square, play triangle turning into three sound bars,
  echoing MA's bars), 4 Exact mashup (YouTube-style play button with the MA logo on top) -
  flagged personal-use only: YouTube's logo rules forbid altering it and AMO policy rejects
  listings that borrow another brand's mark, so 4 is not for the store.
- 2026-10-04: Adrian liked 2 (house). Variants 2A-2C drawn in HA/MA blue `#18bcf2` (both partner
  logos use exactly that blue). Adrian: "more like 2A, but the play symbol should be white, and
  the house is missing the Music Assistant inner white logo lines". Built **2D**: MA's own icon
  (`icon.svg` house path with its bar and chevron cut-outs over the `#f2f4f9` base, 240x240)
  plus a white rounded play triangle in the roof peak (`M104 50 L146 75 L104 100 Z`, stroke 10,
  round joins). Saved as mockup `logo-2d.svg`. It is a derivative of MA's logo: before the store
  release, ask the Music Assistant project (or fall back to 2A with a white play).
- 2026-10-04: Adrian noted the add-on is for YouTube Music, whose mark is a ring with a play
  triangle on a red disc, not YouTube's rounded rectangle. Drawn: **2E** (MA house, white ring +
  play in the peak: `circle cx120 cy80 r27 stroke 7`, triangle `M111 67 L135 80 L111 93 Z`) and
  **2F** (same on a red `#ff0033` disc r36, ring r24). Mockup files `logo-2e.svg`, `logo-2f.svg`.

- 2026-10-04: Adrian, simplifying: option 2 with MA's lines **behind** the play symbol and a
  thin red stroke round the play. Drawn **2G** (red `#e0312b` house, MA's white lines, white play
  `M96 108 L166 152 L96 196 Z` with a 7-unit red stroke in front) and **2H** (same, blue house).
  Files `logo-2g.svg`, `logo-2h.svg`. Still uses MA's lines, so the OHF question stands.
- 2026-10-04: **Adrian chose 2G** and tuned it: play bigger, higher, rounder corners, then a
  little higher again and nudged right to sit centred under the roof peak. Current 2G play
  (240x240 box): triangle `M105 68 L169 116 L105 164 Z`, drawn twice - red `#e0312b` with a
  38-unit round-joined stroke (the outline), then white with a 24-unit round-joined stroke (the
  rounded body, corner radius 12) - over MA's house lines recoloured red on a white base.

- 2026-10-04: 2G placed in the mockup's popup and settings headers, bare (no tile); Adrian
  approved the layout. Mockup saved with this plan: `plans/PLAN_YTC_04-mockup/` (`index.html`,
  `base.css`, `a.css` = the approved look; `b.css`/`c.css` kept as the rejected directions;
  `logo-2g.svg`, unmodified partner marks `ma.svg`, `ha.svg`).
- 2026-10-04: Adrian added **Find my server** (see build spec).

## Find my server (added 2026-10-04)

Measured 2026-10-04 from Adrian's PC: `GET /info` on MA answers with
`Access-Control-Allow-Origin: *`, so an extension page can read it with no site permission;
`http://homeassistant.local:8095/info` and `http://homeassistant:8095/info` both answer 200
(HAOS's default host name; the MA add-on's default port). Reasoned, not tested: whether Firefox
for Android resolves `.local` names.

Why not more: Firefox add-ons have no mDNS/zeroconf API, so MA's own network announcement cannot
be heard; scanning address ranges is slow, needs the device's own subnet (not available to an
add-on), and risks AMO rejection as port scanning. A short list of default names is the honest
version.

## Build spec (final, 2026-10-04)

Version **1.2.0**. Source of truth for every visual detail: `plans/PLAN_YTC_04-mockup/`
(`index.html` + `base.css` + `a.css`). Copy the CSS rules needed, not the mockup's direction
switcher or its logo-options section.

### Assets
- `addon/icons/logo.svg` = `logo-2g.svg`. Manifest `icons` and `action.default_icon` use it plus
  PNG renders at 16, 32, 48, 96 and 128 px (`addon/icons/icon-<n>.png`; the old icon PNGs are
  deleted). Render the PNGs from the SVG in the build box's Chrome (`bb-shot.mjs` on a page
  showing the SVG at each size, transparent background); no new tools on Windows.
- `addon/icons/partners/ha.svg`, `addon/icons/partners/ma.svg`: the unmodified marks from the MA
  frontend (`src/assets/home-assistant-logo.svg`, `src/assets/icon.svg`).
- Font: Space Grotesk (SIL OFL 1.1), bundled as `addon/fonts/SpaceGrotesk.woff2` (variable,
  Latin subset) with `addon/fonts/OFL.txt`; `@font-face` in a shared `addon/theme.css`. No
  remote font loads (the extension page policy blocks them).
- `addon/theme.css`: the design-A variables and shared rules from `base.css` + `a.css`, loaded by
  the popup, settings and welcome pages. `popup.css` / `options.css` keep only page-specific bits.

### Popup (`popup.html`, `popup.css`, `popup.js`)
- Header: 2G logo, "YT Music Cookie", "for Music Assistant".
- Three status rows (`.checks`): Private window; Signed in to YouTube Music; Music Assistant
  (MA mark, and a version pill from `MA.serverInfo` when settings exist and the site permission
  is granted; a "Not set up" pill linking to settings otherwise). Each row shows a green tick, or
  an amber warning icon with the existing warning text when it fails.
- Primary button "Send to Music Assistant" with the MA mark in a white chip (hidden when not set
  up, as now); secondary "Copy cookie"; message line; "Music Assistant settings" link. Provider
  picker styled as an input. All existing logic unchanged.

### Settings (`options.html`, `options.css`, `options.js`)
- Header: 2G logo, "Music Assistant settings", one-line sub.
- Card "Music Assistant server" (MA mark in the heading): address field + Save, and a
  **Find my server** button. Hint line as in the mockup.
- Card "Sign in": green badge "Signed in. This Firefox has its own Music Assistant token." when a
  token is saved; buttons "Sign in with Home Assistant" (HA mark in a white chip, primary) and
  "Music Assistant account" (MA mark, secondary), replacing the separate `#signin` -> choice
  step: both show when `auth/providers` lists both, one when only one is offered; providers are
  fetched when the page opens with a saved, permitted address, and again after Save.
  Account form and "Paste a token instead" as now.
- Card "Sync": the toggle styled as in the mockup; text "Sync these settings to my other Firefox
  computers" and "Firefox encrypts them first. Firefox on phones does not sync add-on data, so
  sign in there once."
- Footer: Test connection, Forget, status line.
- Small line at the bottom: "Not affiliated with Google, YouTube, Home Assistant, Music
  Assistant or the Open Home Foundation."

### Find my server (`ma.js` + settings)
- `MA.findServer()`: in parallel, `GET <c>/info` for each `c` in
  `["http://homeassistant.local:8095", "http://homeassistant:8095",
  "http://music-assistant.local:8095", "http://localhost:8095"]`, each with a 3-second
  `AbortController` timeout; a candidate counts when its JSON has `server_id` and
  `server_version`. Returns the first in list order that answered, with its `base_url`, or null.
- Settings: on success, fill the address field and say "Found Music Assistant <version> at
  <address>. Press Save." If `base_url` is https and differs, also show a button "Use <base_url>
  instead (works away from home)". On failure: "No Music Assistant found at the usual
  addresses. Type its address instead, for example http://192.168.1.10:8095."
- Runs only on the button press, never automatically, so the add-on makes no network calls the
  user did not ask for.

### Welcome page (`welcome.html`, `welcome.css`, `welcome.js`, `background.js`)
- `manifest.json` gains `"background": {"scripts": ["background.js"]}`; `background.js` opens
  `welcome.html` in a tab on `runtime.onInstalled` with `reason === "install"` only.
- Content, design A: 2G logo and "Welcome to YT Music Cookie"; three cards:
  1. "Allow private windows": a live tick from `browser.extension.isAllowedIncognitoAccess()`,
     else the how-to for desktop and Android; re-checks when the tab regains focus.
  2. "Connect Music Assistant": a button opening the settings page.
  3. "Send your login": private window, music.youtube.com, sign in, open a playlist, press the
     add-on, Send; then close the private window without signing out.
  Footer: link to the GitHub README and the not-affiliated line.

### Store listing
- `amo-metadata.json` description refreshed to the 1.2.0 features (sign-in, Find my server,
  phone support).
- Screenshots: popup, settings and welcome page rendered at 1280x800 with `bb-shot.mjs` (example
  address only, no private values) into `store/screenshots/` (tracked), uploaded to the AMO
  listing (API v5 previews, or by Adrian in the Developer Hub) with the listed release.

### Version, changelog, release
- `manifest.json` 1.2.0. Changelog 1.2.0: "A new look, with its own logo." / "Find my server
  looks for Music Assistant at the usual addresses." / "A welcome page walks you through setup
  after install."
- Release as PLAN_YTC_03 describes (listed on AMO, GitHub release), now as 1.2.0, after Adrian
  tests it on desktop and phone. Plan 03's 1.1.0 sign-in test is still outstanding and is
  covered by this test.

### Not changed
- Cookie building, Send, sync and sign-in logic: restyled only.

## Logo rights (researched 2026-10-04)

Measured (fetched and read):
- Home Assistant logo, https://github.com/home-assistant/assets/blob/master/logo/README.md:
  trademark of the Open Home Foundation (OHF); "not available for commercial use without express
  written permission"; commercial = "anything designed to market or promote a product, software
  or service that is for sale". Says nothing on modification. Contact partner@openhomefoundation.org.
- https://github.com/OpenHomeFoundation/brand-assets: same notice; covers Open Home Foundation,
  Home Assistant, **Music Assistant** and ESPHome. Full rules at brands.openhomefoundation.io,
  which did not resolve on 2026-10-04.
From a research agent (sources named, not re-read here):
- Google's YouTube branding guidelines (developers.google.com/youtube/terms/branding-guidelines):
  no changing YouTube logos or their colours, no implying endorsement.
- home-assistant/brands: custom integrations may not use HA's own imagery (implies official).
- Mozilla's add-on policies: names and descriptions must not mislead; icons not addressed directly.
Reading: this add-on is free (MIT), so it is not "commercial" by OHF's definition; the plain,
unmodified HA and MA logos as labels next to what they name is the low-risk use. A modified MA
logo as the add-on's own icon (2D/2E/2F) is not covered and reads as official - needs OHF's
written yes. YouTube Music's ring inside our icon conflicts with Google's no-modification rule.

## Open questions (waiting on Adrian)

1. ~~Which direction?~~ A (Studio), 2026-10-04.
2. ~~Which add-on logo?~~ 2G (2026-10-04). Adrian's position (2026-10-04): 2G is far enough
   from both marks to ship - it is red, not MA's blue; MA's lines are broken up and covered by
   the play symbol; and the play is not YouTube's shape, only reminiscent of it. Decision: ship
   2G without asking OHF first. Remaining risk (reasoned): the bar-and-chevron lines are still
   recognisable, so OHF or Mozilla could ask for a change; the fix would be a new icon in an
   update. A courtesy note to partner@openhomefoundation.org stays optional.
3. ~~Find my server?~~ Added 2026-10-04.
4. Install page on GitHub Pages as well (optional, from the earlier discussion)?

## Build notes (2026-10-04)

- Icons rendered from `logo.svg` in the build box's Chrome over CDP with a transparent default
  background (`Emulation.setDefaultBackgroundColorOverride` alpha 0), 16/32/48/96/128 px, RGBA.
- Space Grotesk latin variable woff2 fetched from Google Fonts' CSS API (v22) plus the OFL text
  from google/fonts.
- Fixed at review: the settings status line lost its `status` class whenever a message coloured
  it (`say()` replaced `className`); README steps still named the removed "Sign in to Music
  Assistant" button.
- Changed at review: tick/warning icons were assigned through `innerHTML` (three `web-ext lint`
  `UNSAFE_VAR_ASSIGNMENT` warnings, which AMO review flags); now built as DOM nodes by a shared
  `addon/icons.js` (`iconSvg("ok"|"warn")`) loaded by the popup and welcome page.
- Writers' choices kept: the popup's "Cookies found" row is gone (three rows per the spec);
  the not-signed-in row reads "Not signed in to YouTube Music in this window."; providers are
  refetched after Save and Forget.
- Measured 2026-10-04 on Adrian's desktop, signed 1.2.0 (unlisted): **Find my server** filled
  the LAN address and offered the HTTPS base URL as the away-from-home choice ("a great
  unexpected benefit" - Adrian). Phone check of the new look still to do.
- Store screenshots made 2026-10-04 (1280x800, example data only: address `http://192.168.1.10:8095`,
  fake "last sent" times): `store/screenshots/1-popup.png` (popup in an iframe beside a headline),
  `2-welcome.png`, `3-settings.png`, `4-automatic.png`. How: Firefox's WebDriver BiDi refuses
  `setViewport`/`captureScreenshot` on extension pages ("does not support browsing contexts in
  privileged scope"), so the shipping pages were served from the build box with a screenshot-only
  `shim.js` standing in for the WebExtension API (storage, permissions, cookies, MA fetches) and
  captured with `bb-shot.mjs` in the box's Chrome. The shim lives only in the scratchpad.
- **Submitted 2026-10-04** (Adrian: "submit it all"): `web-ext sign --channel listed
  --amo-metadata amo-metadata.json` uploaded 1.2.1 as the first listed version (AMO version id
  6540944); it passed automatic validation and the add-on status is `nominated` (awaiting
  Mozilla's review). The metadata landed: name, summary, description, category
  `photos-music-videos`, homepage, support URL, licence MIT. Listing URL until the slug changes:
  https://addons.mozilla.org/en-US/firefox/addon/b246d3f55b284de591d0/
- Screenshots via API v5 previews (JWT from the AMO key; script `amo.mjs`/`amo-previews.mjs` in
  the session scratchpad): `1-popup` uploaded with its caption; `2-welcome` uploaded, caption not
  set; `3-settings`, `4-automatic`, the `2-welcome` caption and the slug change to
  `yt-music-cookie-for-music-assistant` were **refused by AMO's write throttle** (429, "available
  in 73942 seconds" - a daily limit, about 20 hours). Measured: AMO allows only a few API writes
  in a burst, then locks writes for the day; captions cannot go in the multipart upload
  ("You must provide an object of {lang-code:value}") and need a JSON PATCH afterwards.
- Left to do: the two remaining screenshots, the welcome caption and the slug - in the Developer
  Hub by hand, or by API after the throttle lifts; then, once Mozilla approves, the GitHub
  release v1.2.1 with the store link and the README's "link coming" replaced.

