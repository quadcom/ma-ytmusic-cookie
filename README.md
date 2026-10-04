# YT Music Cookie for Music Assistant

**Get your YouTube Music login into Music Assistant without the fuss.**

Music Assistant's YouTube Music provider needs your login "cookie" as one line of text. Other cookie exporters produce a Netscape `cookies.txt` file, and Music Assistant cannot use that. This Firefox add-on gives you the right format instead. You can copy it, or send it straight into Music Assistant.

It helps anyone who runs Music Assistant and wants YouTube Music in it, especially people doing this from a phone.

## Install

- **Firefox Add-ons store (link coming).** Once it is listed, tap Install on the store page. This works on Android and desktop.
- **On Android, before it is listed:**
  1. Download the signed `.xpi` file from the [GitHub Releases page](https://github.com/quadcom/ma-ytmusic-cookie/releases).
  2. In Firefox, open Settings > About Firefox.
  3. Tap the Firefox logo 5 times.
  4. Go back to Settings and tap "Install extension from file".
  5. Choose the `.xpi` file.

Then allow it in private windows: open the add-on's settings in Firefox and turn on "Run in private windows" (on Android, "Run in private browsing"). The add-on cannot see a private window until you do.

## Use it in one minute

1. Open a **private window** (or private tab).
2. Go to music.youtube.com and sign in.
3. Open any playlist in your library.
4. Tap the add-on's button, then choose **Copy** or **Send**.
   - **Copy** puts the login on your clipboard. Paste it into Music Assistant > Settings > Providers > YouTube Music.
   - **Send** puts it straight into Music Assistant for you.
5. Close the private window **without signing out**. Signing out, or browsing normally with the same account, can make Google replace the cookie and stop your copy working.

## Set up Send (once)

Open the add-on's settings and fill in two things:

- **Music Assistant address**, for example `http://192.168.1.10:8095`.
- **A long-lived token.** Make one in Music Assistant from an admin profile. It lasts a year and is shown only once, so copy it straight away.

Press **Test connection** to check both. The address and token stay only in this Firefox profile. They are not synced anywhere.

## Good to know

- **Android:** if the mobile site misbehaves, use "Request desktop site" in Firefox's menu.
- **"401 Unauthorized" in Music Assistant** means the cookie has expired. Repeat the steps above to get a fresh one.

## Privacy

The cookie is a full login to your Google account. Treat it like a password.

- The add-on never stores the cookie.
- It only sends the cookie to the Music Assistant address you set, and only when you press Send.
- It does not send anything anywhere else.

## Licence

MIT. See [LICENSE](LICENSE).
