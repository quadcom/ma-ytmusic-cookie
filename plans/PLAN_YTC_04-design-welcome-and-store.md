# PLAN_YTC_04 - One design for the popup, settings and welcome pages, plus the store page

**Status:** proposed (2026-10-04). Design session in progress with Adrian; nothing built.

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

## Open questions (waiting on Adrian)

1. ~~Which direction?~~ A (Studio), 2026-10-04.
2. Which add-on logo (1-4)? 4 is personal-use only.
3. Install page on GitHub Pages as well (optional, from the earlier discussion)?
