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

### Logo rights (researched 2026-10-04)

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
3. Install page on GitHub Pages as well (optional, from the earlier discussion)?
