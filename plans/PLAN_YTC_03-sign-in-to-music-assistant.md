# PLAN_YTC_03 - "Sign in to Music Assistant" makes the token itself, then release to the store

**Status:** built (corrected 2026-10-04, end of session). Home Assistant sign-in measured end to
end on desktop; 1.2.1 revokes the add-on's own previous token on re-sign-in. The release this plan
described went out with PLAN_YTC_04 as listed 1.2.1 (awaiting review). Not measured: the Music
Assistant username/password sign-in (Adrian has no such account), and sign-in on the phone.

## Goal

Adrian's request (2026-10-04): no device should ever need a token pasted in. Firefox for Android
has no add-on sync (measured, PLAN_YTC_02), so the phone needs its own way in. The settings page
gets a **Sign in to Music Assistant** button: the user signs in the normal way (through Home
Assistant, or with an MA username and password) and the add-on makes its own long-lived token.
After build and test, this version goes into production: the public AMO listing (left open in
PLAN_YTC_01) and a full GitHub release.

## What the server offers (measured 2026-10-04 on Adrian's MA 2.10.5)

- `auth/providers` (no login needed) answers
  `[{"provider_id":"builtin","requires_redirect":false},
    {"provider_id":"homeassistant","requires_redirect":true}]`.
- `auth/authorization_url {provider_id: "homeassistant", return_url}` (no login needed) answers
  `{"authorization_url": "https://<ha>/auth/authorize?client_id=https://<ma>&redirect_uri=
  https://<ma>/auth/callback?provider_id=homeassistant&state=..."}` - HA's own sign-in page.
- After the HA sign-in, MA's `/auth/callback` makes an MA token for that user and sends the browser
  to `return_url` with `?code=<token>` added (`controller.py:1051-1110`,
  `helpers/redirect_validation.py:109`, fork). That token is short-lived (30-day sliding,
  `auth.py:625`).
- `return_url` on the MA server's own address, a private IP, or the configured base URL is
  "trusted" and needs no extra click; any other site gets MA's "allow redirect?" consent page
  (`helpers/redirect_validation.py:29-53`).
- `auth/login {username, password, provider_id: "builtin"}` returns
  `{"success": true, "access_token": ...}` for a Music Assistant username/password account.
- `auth/token/create {name}` (needs a logged-in token) makes a **long-lived** token for the same
  user (1 year in 2.10.5's server code; the newer frontend text says 10 years - whichever the
  server does).
- `auth/logout` ends the session the short-lived token belongs to.

## Design

### Settings page (`addon/options.html` / `options.js`)

- Address field stays first. Under it, one button: **Sign in to Music Assistant**.
- The token field moves under a "Paste a token instead" disclosure (kept as the fallback; Show
  button stays).
- On click (after Save has granted the site permission - same check as Test):
  1. `auth/providers`. If `homeassistant` is present -> Home Assistant sign-in (below). If only
     `builtin` -> show username and password fields and a second **Sign in** button.
     If both, show both choices: "Sign in with Home Assistant" and "Sign in with a Music Assistant
     account".
  2. On success: `auth/token/create {name: "YT Music Cookie add-on (<os>)"}` with the short-lived
     token, where `<os>` is `browser.runtime.getPlatformInfo().os` (so the user can tell the
     phone's token from the desktop's in MA's token list). Save the long-lived token through
     `MA.saveSettings` (so sync still carries it between desktops).
  3. `auth/logout` with the short-lived token, so no extra session is left behind. Failure here
     is ignored.
  4. Status: "Signed in. This Firefox now has its own Music Assistant token." Then run the same
     check as Test connection.

### Home Assistant sign-in (works on desktop and Android)

- `return_url` = `<address>/?ytc_signin=<random>` - the MA server's own address, so MA treats it
  as trusted (no consent page) and the random value ties the answer to this attempt.
- `browser.tabs.create({url: authorization_url})` opens HA's sign-in page in a normal tab.
- `browser.tabs.onUpdated` watches that one tab id; when its URL starts with the `return_url` and
  carries `code=`, the add-on reads the code, closes the tab, and carries on with step 2.
  (`tabs` permission, already held, lets the add-on read the tab's address.)
- Chosen over `browser.identity.launchWebAuthFlow` because Firefox for Android does not support
  the `identity` API (reasoned from MDN's compatibility table; not probed). One method for both.
- The tab is closed and the listener removed after 5 minutes with no answer: "Sign-in timed out.
  Press Sign in to try again."
- `return_url` uses the address the user typed. If that is the IP and MA's configured base URL is
  the HTTPS name, the HA page and callback still use the base URL (MA builds them), then come back
  to the IP - both are trusted.

### Music Assistant account sign-in

- `auth/login {username, password, provider_id: "builtin", device_name: "YT Music Cookie add-on"}`.
  `success: false` -> show MA's `error` text. The password is used once and never stored.

## Refusals

- No address, or Save not yet pressed -> "Enter the address and press Save first, then sign in."
- `auth/providers` lists neither provider -> "This Music Assistant offers no sign-in this add-on
  knows. Paste a token instead."
- User is not an admin -> the sign-in succeeds but Send will be refused by MA; after sign-in the
  add-on calls `auth/me` and, if `role` is not `admin`, says "Signed in, but this account is not a
  Music Assistant admin, so it cannot change YouTube Music's sign-in. Sign in with an admin
  account."
- `code` missing or malformed in the returned URL -> "Sign-in did not finish. Press Sign in to try
  again."
- The short-lived token is never stored.

## Release to production (after build and test)

- Version **1.1.0**.
- Test first: desktop (HA sign-in, then Send) and the Pixel (HA sign-in in a tab, then Send).
- AMO listing, public: `web-ext sign --channel listed` with an `--amo-metadata` file holding the
  summary, categories (`Music` / `Other`), licence `MIT`, and the support URL (the GitHub repo).
  Listed versions go through Mozilla review before they appear; the signed file for 1.1.0 comes
  from AMO once approved. Check at build time whether AMO wants a privacy policy for an add-on
  that sends a login cookie to a user-named server (the manifest already declares
  `authenticationInfo`).
- GitHub release `v1.1.0` (full release, not pre-release) with the signed `.xpi`; README gets the
  store link and the sign-in steps, replacing the token-making steps.
- Changelog 1.1.0: "Sign in to Music Assistant from the add-on - no token to make or paste." and
  "Works the same on your phone."

## Open questions (waiting on Adrian)

All answered by Adrian 2026-10-04 ("yes to all three"):
1. Both sign-ins: Home Assistant and Music Assistant username/password.
2. "Paste a token instead" stays as a hidden fallback.
3. Store name stays "YT Music Cookie for Music Assistant".

## Build notes (2026-10-04)

- Measured in a headless Firefox (WebDriver BiDi, add-on temporarily installed, address the HTTPS
  proxy name): `MA.loginProviders` -> `["builtin","homeassistant"]`; `signInWithHomeAssistant`
  opened a tab on HA's `/auth/authorize` page; navigating that tab to the `return_url` with
  `code=FAKE123` resolved the sign-in with that code and closed the tab; closing the tab early
  rejected with the "closed before it finished" sentence. The real HA login, `auth/token/create`,
  `auth/me` and `auth/logout` are not yet run (need Adrian's sign-in).
- Choices made by the writer, kept at review: `signInWithAccount` turns MA's `error` into a full
  sentence with a next step; a non-string `auth/token/create` answer fails as "did not finish".
- `amo-metadata.json` category `photos-music-videos` checked against
  `https://addons.mozilla.org/api/v5/addons/categories/` (2026-10-04): categories there no longer
  carry an application, so the `android` key may be rejected - check on the listed upload.
- 1.1.0 is signed unlisted for Adrian's test; the store listing takes the next version.
- Measured 2026-10-04 (Adrian, signed 1.2.0): **Sign in with Home Assistant** worked end to end
  on desktop - HA login tab, closed by itself, "Signed in". The new long-lived token appears in
  MA's Settings > Profile > Long-lived access tokens as "YT Music Cookie add-on (win)" (not in
  HA, and no new user - it belongs to his existing HA-linked MA user). A second, older token of
  the same name (created 9:43, from an earlier sign-in) was left behind.
- Patch (Adrian: "patch-it", 2026-10-04), shipped as 1.2.1: on a new sign-in the add-on revokes
  its previous token with `auth/logout` sent under that token, but only when the old token's JWT
  `token_name` claim starts with "YT Music Cookie add-on" (`MA.tokenName`, `MA.revokeOwnToken`
  in `ma.js`, called from `completeSignIn` in `options.js`) - a token the user pasted in may be in
  use elsewhere and is never touched. Measured: MA 2.10.5 tokens carry `token_name` (claim names
  of Adrian's earlier MA token: exp, iat, is_long_lived, jti, role, sub, token_name, username);
  the decode/guard logic unit-tested in Node (own name -> revoked, other name or non-JWT -> left).

