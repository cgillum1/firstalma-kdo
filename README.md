# Kids Day Out (First Baptist Alma) preview site

Static site: `index.html`, `register.html`, `apply.html`, `styles.css`, `app.js`, `assets/`, `docs/`.
No build step. Host anywhere that serves static files, or copy the pages into firstalma.com.

Forms post JSON (as text/plain) to a Google Apps Script web app (`SCRIPT_URL` in `app.js`), which writes to the KDO Google Sheet
(tabs: Summary, Kids, Leaders). The script source is in `../Sheet/Code.gs` and `../Sheet/allocate.js`.
To move ownership: copy the Sheet into the new account, open Extensions > Apps Script, Deploy > New deployment (Web app, Execute as me, Anyone),
and paste the new URL into `SCRIPT_URL`.

Pages carry `noindex` and `robots.txt` disallows all crawlers until the church approves a public launch.
