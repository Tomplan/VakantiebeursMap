# How to restore old marker backups

This document describes safe, repeatable methods for restoring an older `markers.json` from the `markers-backups/` folder.

Make a local safety snapshot before any restore:

```bash
cp markers.json markers.json.bak.$(date +%Y%m%d%H%M%S)
```

Method A — Quick local restore (dev/test)
1. Validate the backup file JSON:

```bash
jq empty markers-backups/markers-backup-YYYYMMDDHHMMSS.json && echo OK || echo INVALID
```

2. Copy the backup into place and test locally:

```bash
cp markers-backups/markers-backup-YYYYMMDDHHMMSS.json markers.json
# open the webapp and refresh
```

3. Optionally commit the restored markers.json (recommended when you want the change in Git history):

```bash
git add markers.json
git commit -m "Restore markers.json from markers-backup-YYYYMMDDHHMMSS"
git push
```

Method B — Restore via server API (recommended for audited restores)
- Advantage: the server creates another timestamped backup before overwriting, and attempts to push to GitHub.

```bash
curl -X POST -H "Content-Type: application/json" --data-binary @markers-backups/markers-backup-YYYYMMDDHHMMSS.json http://localhost:3000/save-markers
```

Method C — Create an auditable Git branch for the restore
1. Make a safety snapshot (see above)
2. Create a branch and replace markers.json with the backup

```bash
git checkout -b restore/markers-YYYYMMDD
cp markers-backups/markers-backup-YYYYMMDDHHMMSS.json markers.json
git add markers.json
git commit -m "Restore markers.json from markers-backup-YYYYMMDDHHMMSS"
git push -u origin restore/markers-YYYYMMDD
```

Then create a PR for review and merge.

Notes and safety
- ALWAYS make a local backup of the current `markers.json` before any restore.
- Prefer Method B or C for production usage so changes are auditable and the server creates an additional backup.
- If you need me to perform the restore for you, tell me which backup filename you want to restore and which method you'd like me to use.
