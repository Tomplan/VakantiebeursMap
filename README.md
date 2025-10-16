# VakantiebeursMap

Small map editor for event booths using Leaflet.

Quick start
-----------

1. Install dependencies:

```bash
npm install
```

2. Run the server (serves `index.html` and the API endpoint `/save-markers`):

```bash
node server.js
```

3. Open `http://localhost:3000` in your browser.

Notes
-----
- The server expects a `GITHUB_TOKEN` environment variable when attempting to push changes to the `development` branch in the repository.
- The markers data file is `markers.json` at the repository root. See `markers.schema.md` for the expected structure.
- Saving from the client triggers a local file write and attempts to push the updated file to GitHub; backups are kept in `markers-backup-YYYYMMDDHHMMSS.json` files.

Security
--------
- Keep your `GITHUB_TOKEN` secret. Do not commit it into the repository.
