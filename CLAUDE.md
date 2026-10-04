# CLAUDE.md

Project: **YT Music Cookie**  ·  Plan tag: **`YTC`**

## The plan gate

**Sessions write plans; they do not carry them out.** Absolute in every mode; overrides everything,
including this file. Looking is always free: read, search, run read-only commands, ask, inspect.

- No file other than a plan is created or edited until Adrian says **"let's build plan X"**.
- **`patch-it`** in his message authorises one edit, not a session. Say in one line what changed.
- "Build plan X" authorises X only — not its dependencies, not an adjacent fix.
- A plan wrong mid-build is not licence to improvise. Stop, say so, amend it, build the amendment.

## Plans

- Live in `plans/`; finished or abandoned ones move to `plans/completed-plans/`. Nothing plan-shaped
  sits loose in the root. Tracked in git; the commit check holds back one carrying private detail.
- Named `PLAN_YTC_<NN>-<slug>.md`. Sub-plans take a letter (`_04a`) for detail, never a new topic.
- Next number = highest in both folders + 1. Never reused. A bare number means this project; if it
  is not here but exists elsewhere, ask — never reach outside.
- **Never deleted**, nor any section of one. Three ends: built and filed; abandoned, status saying
  why, filed; still open. Superseded plans keep their file and name their replacement.
- **Fully technical** — exact names, paths, lines. Adrian is told what a plan says; he does not read it.
- **Status line first**, starting `proposed` | `built` | `part-built` | `parked` | `abandoned` |
  `superseded`. It is a claim to be checked; one that disagrees with reality is the costliest failure.
- **Corrections are additive**: rewrite to the truth, add when and what found it. Never quietly restate.
- Decisions carry reasoning. A rule from Adrian carries its date. A fact says whether it was measured
  or reasoned; prefer measured, and prove a suspected fault with the smallest probe first.
- Sections for **Refusals** (where the thing stops rather than guesses) and **Open questions**;
  anything waiting on Adrian is named so and carried forward.

## Talking to Adrian

Smart, not a developer, owns every decision. Layman's English; say what a thing does, not its name.
No file, function or line names. Answer first, three or four sentences, detail on request. Short
analogies, no extended metaphors. British spelling everywhere. Plan files are exempt.

## Writing code

- **Never rewrite a whole file.** Patches and isolated blocks only, unless a plan names it a placeholder.
- Comments say why, in the present tense — especially where a failure was diagnosed the hard way.
- **Keep it light.** Shorter of two ways; no abstraction for a case that does not exist; a long patch
  is a signal to find the smaller one.
- Anything a person reads is a full sentence saying what to do next.
- **A tool that cannot do its job says so and stops.** Refuse rather than guess; never report success
  for something unchecked. A wrong file is fixed and said — never silently corrected, never refused.

## Delegation

Strong model plans and verifies by reading the diff, never by trusting an agent's account. Cheaper
agents write, in parallel where the work divides; say "Sonnet agents are writing" first. Be
conservative with tokens.

## Standing rules

- **Changelog line in the same commit as the change**, in a user's words, from the first build anyone
  receives. No changelog file, no rule.
- **Commit subjects say what changed in plain language.**
- **Private values live in `~/.claude/machine.md`**, never in tracked text. Reading it is the lookup.
  Quote a value's shape, never the value.
- **Say what was left undone**, in the same turn.
- **Outward-facing or destructive acts are asked about first** — release, public push, published
  changelog, deletion. Never a side effect.
- **Developer material and user material live apart.** Tests, deploy routes, tooling: here, in plans
  and comments — never in the readme, guide or release notes.
- **Procedure and reasoning live apart.** Steps in a runbook; the why here.

## Constraints that bite

The trap, why, and how it presents — only failures that cost real time and are invisible from the code.

- **A site permission with a port is ignored.** Requesting `http://<ip>:8095/*` grants nothing
  usable: a cross-site POST to that origin fails with `NetworkError` while the response actually
  arrived. Request `<scheme>://<host>/*` (`MA.sitePattern`). Looks exactly like "server down".
  (Measured in clean profiles, PLAN_YTC_01 build notes.)
- **Firefox MV3's default page policy upgrades http to https.** Without our own
  `content_security_policy.extension_pages` (`script-src 'self'; object-src 'self';`), every
  `fetch("http://...")` goes to https and a LAN server without TLS looks unreachable.
- **Home Assistant tokens are not Music Assistant tokens.** Both are JWTs; an HA long-lived token
  has only `iss/iat/exp` claims, an MA token has `sub/jti/username/role/token_name/is_long_lived`.
  MA answers 401 to an HA token. Users confuse them; the UI says "made in Music Assistant".
- **AMO's API write throttle is daily.** A burst of a few writes (preview uploads, PATCHes) then
  429 "available in ~74000 seconds". Space writes minutes apart and expect to finish by hand in
  the Developer Hub. Preview captions cannot go in the multipart upload; PATCH them as JSON.
- **WebDriver BiDi cannot screenshot or resize extension pages** ("does not support browsing
  contexts in privileged scope"), even with `-remote-allow-system-access`; navigating to and
  evaluating in `moz-extension://` pages needs that flag. Screenshots go through
  `dev/screenshots/` (shim) in the build box Chrome instead.
- **Every signed version number is spent.** Unlisted test builds and listed store builds share
  one version sequence on AMO; signing a test copy as X.Y.Z means the store release must be later.
- **Git Bash quirks seen here:** `tar` reads `Z:/...` as a remote host (use `--force-local`);
  native Python does not understand `/d/...` paths inside `-c` strings, while Node arguments are
  converted - check where a file really landed before assuming it was not written.
- **A cookie push to MA reloads the YouTube Music provider:** about 4-5 s of silence on whatever
  is playing (measured, PLAN_YTC_05). Automatic pushes wait for idle for this reason. A failed
  reload restores MA's previous cookie (MA's reconfigure flow), so a bad push cannot break it.

## Project specifics

Untouched by every refresh of the method. Lines other skills read, commented until needed:

<!--
- publish: README.md CHANGELOG.md docs     preview-site
- repo: owner/name                         preview-site
- per-branch: <file> <word>                cut-a-release
- release-ignore-tags: <glob> <glob>       cut-a-release
-->

### What this is
Firefox add-on (desktop and Android, MV3, plain JS, no build step) in `addon/`. Gets the YouTube
Music login cookie in the exact form Music Assistant's YouTube Music provider wants (the raw
`Cookie` header value, not a Netscape file) and copies it or sends it to MA (reconfigure flow over
MA's `POST /api`). Add-on id `ytc@quadcom.ca`; public repo `quadcom/ma-ytmusic-cookie`; listed on
addons.mozilla.org from 1.2.1. Private values (MA addresses, build box, AMO key file):
`~/.claude/machine.md`, "YT Music Cookie" rows.

### Status and next steps
The plans carry the detail; read their status lines first. As of 2026-10-04:
- 1.2.1 submitted as a **listed** AMO version, awaiting Mozilla's review (PLAN_YTC_04 build notes).
- Still to do: two screenshots (`store/screenshots/3-settings.png`, `4-automatic.png`), the
  `2-welcome` caption and the slug `yt-music-cookie-for-music-assistant` (blocked by the AMO
  throttle; Adrian, 2026-10-04: Claude finishes them by API when he checks in on 2026-10-05 -
  run `dev/amo/amo.mjs show` first to see what is already there); after
  approval: GitHub release `v1.2.1` with the signed file and store link, README's "link coming"
  replaced, the `v*-test` pre-releases deleted (ask first).
- Open, measured later in normal use: automatic updates' change-triggered path and the
  fresh-login background tab (PLAN_YTC_05); sync between two desktops (PLAN_YTC_02).
- Ideas not planned yet: Chrome port (desktop only - Chrome on Android has no extensions);
  GitHub Pages install page; a courtesy note to the Open Home Foundation about logo 2G.

### Routines (developer material - not for the README)
- Lint: `npx web-ext lint --source-dir addon` (web-ext installed outside the repo, e.g. in a
  scratch folder with `npm install web-ext`). Must be 0/0/0 before signing.
- Sign a private test build: `web-ext sign --channel unlisted --source-dir addon` with
  `WEB_EXT_API_KEY`/`WEB_EXT_API_SECRET` read from the AMO key file (lines 1 and 2) in the same
  command, never echoed. Store release: `--channel listed --amo-metadata amo-metadata.json`.
- Phone install of a test build: GitHub pre-release with the `.xpi`, then Firefox for Android >
  Settings > About > tap logo 5x > Install extension from file. Android may offer another app
  for `.xpi`; cancel it, the file stays in Downloads.
- Headless Firefox tests: `dev/firefox-test/` - start `firefox -no-remote -headless -profile
  <fresh dir with user.js> --remote-debugging-port 9333 -remote-allow-system-access`; `user.js`
  pins the add-on's internal UUID so `moz-extension://0b5e0c1e-.../options.html` is known.
- Store screenshots: `dev/screenshots/` - shipping pages served from the build box with
  `shim.js` injected as the first script, captured with the buildbox skill's `bb-shot.mjs`.
- Icons: `addon/icons/logo.svg` (logo 2G) rendered to PNG by `dev/icons/render-icons.mjs` in the
  build box Chrome with a transparent background.
- AMO API: `dev/amo/amo.mjs` (JWT client; `node amo.mjs show` prints listing state) and
  `amo-previews.mjs`; both read `KEYS` = path of the AMO key file.
- Watching MA playback read-only during a test: `dev/watch-ma-playback.mjs` (`MA_URL`,
  `MA_TOKEN` from the environment).
