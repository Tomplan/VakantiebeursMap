// Node.js/Express backend with GitHub push (octokit)
// Save as server.js
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { Octokit } = require("@octokit/rest");
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration and environment
// GITHUB_TOKEN (required): an OAuth personal access token (PAT) with repo permissions set in the environment.
// GITHUB_OWNER / GITHUB_REPO: repository owner and name where markers.json will be pushed.
// GITHUB_FILEPATH / GITHUB_BRANCH: file path inside the repo and branch where we write markers.
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Set your PAT in env
const GITHUB_OWNER = "Tomplan";
const GITHUB_REPO = "VakantiebeursMap";
const GITHUB_FILEPATH = "markers.json";
const GITHUB_BRANCH = "development";

// Middleware: accept JSON and serve the client static files from repo root
app.use(express.json());
app.use(express.static(__dirname)); // Serve index.html and markers.json

// POST /save-markers
// Purpose: receive the serialized markers array from the client, persist it to disk (markers.json),
// keep a rotating backup set on disk, and attempt to push the change to GitHub.
// Input: request body must be an array of marker objects. Expected shape is described in markers.json (id, lat, lng, name, img, standnr, websitelink, angle).
// Output: JSON response { status: 'saved' } on success, or { status: 'error', error: '...' } on failure (500).
// Side-effects: writes files to disk and makes network calls to GitHub.
app.post('/save-markers', async (req, res) => {
  // Maintain a small on-disk backup history inside the `markers-backups/` folder.
  // Benefits: keeps repository root clean and avoids accidental commits of stray files.
  const backupsDir = path.join(__dirname, 'markers-backups');
  if (!fs.existsSync(backupsDir)) {
    try { fs.mkdirSync(backupsDir); } catch (e) { /* ignore mkdir errors */ }
  }
  const backupFiles = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('markers-backup-') && f.endsWith('.json'))
    .sort(); // alphabetical sorting works because filenames include a timestamp prefix
  if (backupFiles.length > 100) {
    const toDelete = backupFiles.slice(0, backupFiles.length - 100);
    toDelete.forEach(f => {
      try { fs.unlinkSync(path.join(backupsDir, f)); } catch(e) { /* ignore unlink errors */ }
    });
  }

  const jsonPath = path.join(__dirname, 'markers.json');
  // Create a timestamped backup inside markers-backups before overwriting the canonical markers.json
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 15); // YYYYMMDDHHMMSS
  const backupPath = path.join(backupsDir, `markers-backup-${ts}.json`);
  if (fs.existsSync(jsonPath)) {
    fs.copyFileSync(jsonPath, backupPath);
  }

  // Persist the new markers file locally with pretty printing to ease diffs when reviewing backups.
  fs.writeFileSync(jsonPath, JSON.stringify(req.body, null, 2));

  try {
    // Push to GitHub using octokit. This requires a valid token in GITHUB_TOKEN.
    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    // Retrieve the existing file to obtain its SHA; necessary for updates on GitHub.
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: GITHUB_FILEPATH,
      ref: GITHUB_BRANCH
    });
    const sha = data.sha;
    // Create or update the file contents on the specified branch.
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: GITHUB_FILEPATH,
      message: "Update markers.json from map editor",
      content: Buffer.from(JSON.stringify(req.body, null, 2)).toString('base64'),
      branch: GITHUB_BRANCH,
      sha: sha
    });
    res.json({ status: 'saved' });
  } catch (err) {
    // If GitHub push fails, we still return an error but keep the local markers.json and backup intact for manual recovery.
    console.error("GitHub push error:", err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Start the HTTP server. The application uses simple static file serving and one POST API for saving markers.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
