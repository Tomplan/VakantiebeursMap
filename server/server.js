// Node.js/Express backend with GitHub push (octokit)
// Save as server.js
require('dotenv').config();
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Set your PAT in env
console.log('Loaded GITHUB_TOKEN:', GITHUB_TOKEN ? 'Exists' : 'Missing');
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
const GITHUB_OWNER = "Tomplan";
const GITHUB_REPO = "VakantiebeursMap";
const GITHUB_FILEPATH = "markers.json";
const GITHUB_BRANCH = "development";

// Middleware: accept JSON and serve the client static files from repo root
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Serve index.html and assets from project root

// GET /list-backups - Return list of available backup files
app.get('/list-backups', (req, res) => {
  const backupsDir = path.join(__dirname, 'markers-backups');
  
  if (!fs.existsSync(backupsDir)) {
    return res.json({ backups: [] });
  }
  
  try {
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('markers-backup-') && f.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first

    let result = [];
    let prevMarkers = null;
    files.forEach(f => {
      const backupPath = path.join(backupsDir, f);
      let markers = [];
      let count = 0;
      try {
        const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        markers = Array.isArray(data) ? data : [];
        count = markers.length;
      } catch (e) {}

      // Diff per veld berekenen
      let diff = { added: 0, removed: 0, changed: 0, fields: {} };
      if (prevMarkers) {
        const prevById = Object.fromEntries(prevMarkers.map(m => [m.id, m]));
        const currById = Object.fromEntries(markers.map(m => [m.id, m]));
        // Added
        diff.added = markers.filter(m => !(m.id in prevById)).length;
        // Removed
        diff.removed = prevMarkers.filter(m => !(m.id in currById)).length;
        // Changed
        let changedMarkers = markers.filter(m => {
          const prev = prevById[m.id];
          if (!prev) return false;
          return JSON.stringify(m) !== JSON.stringify(prev);
        });
        diff.changed = changedMarkers.length;
        // Detail per veld
        let fieldChanges = {};
        changedMarkers.forEach(m => {
          const prev = prevById[m.id];
          if (!prev) return;
          // Verzamel alle unieke keys uit beide objecten
          const allKeys = Array.from(new Set([...Object.keys(m), ...Object.keys(prev)]));
          allKeys.forEach(k => {
            if (JSON.stringify(m[k]) !== JSON.stringify(prev[k])) {
              fieldChanges[k] = (fieldChanges[k] || 0) + 1;
            }
          });
        });
        diff.fields = fieldChanges;
      }
      result.push({ filename: f, count, diff });
      prevMarkers = markers;
    });

    res.json({ backups: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// GET /load-backup/:filename - Load a specific backup file
app.get('/load-backup/:filename', (req, res) => {
  const filename = req.params.filename;
  const backupsDir = path.join(__dirname, 'markers-backups');
  const backupPath = path.join(backupsDir, filename);
  
  // Security: only allow files that match the expected pattern
  if (!filename.startsWith('markers-backup-') || !filename.endsWith('.json')) {
    return res.status(400).json({ error: 'Invalid backup filename' });
  }
  
  try {
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    const backupData = fs.readFileSync(backupPath, 'utf8');
    const markers = JSON.parse(backupData);
    res.json(markers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load backup' });
  }
});

// POST /save-markers
// Purpose: receive the serialized markers array from the client, persist it to disk (markers.json),
// keep a rotating backup set on disk, and attempt to push the change to GitHub.
// Input: request body must be an array of marker objects. Expected shape is described in markers.json (id, lat, lng, name, img, standnr, websitelink, angle).
// Output: JSON response { status: 'saved' } on success, or { status: 'error', error: '...' } on failure (500).
// Side-effects: writes files to disk and makes network calls to GitHub.
app.post('/save-markers', async (req, res) => {
  console.log('Received save request with', req.body.length, 'markers');
  console.log('First marker data:', req.body[0]);
  
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

  const jsonPath = path.join(__dirname, '../data/markers.json');
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

// GET /backups
// Returns a JSON array of available backup filenames (sorted newest first)
app.get('/backups', (req, res) => {
  const backupsDir = path.join(__dirname, 'markers-backups');
  if (!fs.existsSync(backupsDir)) return res.json([]);
  const files = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('markers-backup-') && f.endsWith('.json'))
    .sort()
    .reverse();
  res.json(files);
});

// POST /restore-backup
// Body: { filename: "markers-backup-YYYY...json" }
// Server will copy the chosen backup file over markers.json, create its own timestamped backup of the current markers.json,
// and then attempt to push the restored markers.json to GitHub (same flow as save-markers).
app.post('/restore-backup', async (req, res) => {
  try {
    const backupsDir = path.join(__dirname, 'markers-backups');
    const filename = req.body && req.body.filename;
    if (!filename) return res.status(400).json({ status: 'error', error: 'filename required' });
    const src = path.join(backupsDir, filename);
    if (!fs.existsSync(src)) return res.status(404).json({ status: 'error', error: 'backup not found' });

    const jsonPath = path.join(__dirname, '../data/markers.json');
    // create a timestamped backup of current markers.json
    const now = new Date();
    const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 15);
    const newBackupPath = path.join(backupsDir, `markers-backup-${ts}.json`);
    if (fs.existsSync(jsonPath)) fs.copyFileSync(jsonPath, newBackupPath);

    // copy chosen backup into place
    fs.copyFileSync(src, jsonPath);

    // attempt to push to GitHub (same logic as in save-markers)
    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: GITHUB_FILEPATH,
      ref: GITHUB_BRANCH
    });
    const sha = data.sha;
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: GITHUB_FILEPATH,
      message: `Restore markers.json from backup ${filename}`,
      content: Buffer.from(fs.readFileSync(jsonPath)).toString('base64'),
      branch: GITHUB_BRANCH,
      sha: sha
    });

    res.json({ status: 'restored' });
  } catch (err) {
    console.error('Restore error:', err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Start the HTTP server. The application uses simple static file serving and one POST API for saving markers.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
