// Node.js/Express backend with GitHub push (octokit)
// Save as server.js
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { Octokit } = require("@octokit/rest");
const app = express();
const PORT = process.env.PORT || 3000;

// Set these:
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Set your PAT in env
const GITHUB_OWNER = "Tomplan";
const GITHUB_REPO = "VakantiebeursMap";
const GITHUB_FILEPATH = "markers.json";
const GITHUB_BRANCH = "development";

app.use(express.json());
app.use(express.static(__dirname)); // Serve index.html and markers.json

app.post('/save-markers', async (req, res) => {
  // Opruimen: maximaal 100 backups bewaren
  const backupFiles = fs.readdirSync(__dirname)
    .filter(f => f.startsWith('markers-backup-') && f.endsWith('.json'))
    .sort(); // alfabetisch = chronologisch door tijdstempel in naam
  if (backupFiles.length > 100) {
    const toDelete = backupFiles.slice(0, backupFiles.length - 100);
    toDelete.forEach(f => {
      try { fs.unlinkSync(path.join(__dirname, f)); } catch(e) { /* negeer fout */ }
    });
  }
  const jsonPath = path.join(__dirname, 'markers.json');
  // Backup markers.json met tijdstempel vóór overschrijven
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 15); // YYYYMMDDHHMMSS
  const backupPath = path.join(__dirname, `markers-backup-${ts}.json`);
  if (fs.existsSync(jsonPath)) {
    fs.copyFileSync(jsonPath, backupPath);
  }
  fs.writeFileSync(jsonPath, JSON.stringify(req.body, null, 2));
  try {
    // Push to GitHub
    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    // Get current file SHA
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: GITHUB_FILEPATH,
      ref: GITHUB_BRANCH
    });
    const sha = data.sha;
    // Commit new content
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
    console.error("GitHub push error:", err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
