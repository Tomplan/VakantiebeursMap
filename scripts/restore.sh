#!/usr/bin/env bash
# Helper script to restore markers.json from backups in markers-backups/
# Usage examples:
#   ./scripts/restore.sh --list
#   ./scripts/restore.sh --show markers-backup-YYYYMMDDHHMMSS.json
#   ./scripts/restore.sh --local markers-backup-YYYYMMDDHHMMSS.json
#   ./scripts/restore.sh --server markers-backup-YYYYMMDDHHMMSS.json [--url http://localhost:3000/save-markers]
#   ./scripts/restore.sh --branch markers-backup-YYYYMMDDHHMMSS.json

set -u
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/markers-backups"
MARKERS_FILE="$ROOT_DIR/markers.json"
DEFAULT_SERVER_URL="http://localhost:3000/save-markers"

usage() {
  cat <<EOF
Usage: $0 [--list | --show FILE | --local FILE | --server FILE [--url URL] | --branch FILE]

Options:
  --list                   List available backup files (sorted oldest->newest)
  --show FILE              Pretty-print a backup file to stdout (uses jq if available)
  --local FILE             Replace local markers.json with FILE (creates markers.json.bak.TIMESTAMP first)
  --server FILE [--url]   POST FILE to the server endpoint (server will create its own backup and optionally push to GitHub)
  --branch FILE            Create a git branch named restore/markers-<timestamp>, commit FILE as markers.json and push the branch

Examples:
  $0 --list
  $0 --show markers-backup-20251015202440..json
  $0 --local markers-backup-20251015202440..json
  $0 --server markers-backup-20251015202440..json --url http://localhost:3000/save-markers
  $0 --branch markers-backup-20251015202440..json
EOF
}

ensure_backup_exists() {
  local f="$1"
  if [ ! -f "$BACKUP_DIR/$f" ]; then
    echo "ERROR: backup file not found: $BACKUP_DIR/$f" >&2
    exit 2
  fi
}

list_backups() {
  mkdir -p "$BACKUP_DIR"
  ls -1 "$BACKUP_DIR"/markers-backup-*.json 2>/dev/null | sort || echo "(no backups)"
}

pretty_print() {
  local f="$1"
  ensure_backup_exists "$f"
  if command -v jq >/dev/null 2>&1; then
    jq . "$BACKUP_DIR/$f" | less -R
  else
    less "$BACKUP_DIR/$f"
  fi
}

local_restore() {
  local f="$1"
  ensure_backup_exists "$f"
  local ts
n  ts=$(date +%Y%m%d%H%M%S)
  cp "$MARKERS_FILE" "$MARKERS_FILE.bak.$ts" 2>/dev/null || true
  echo "Created safety snapshot: $MARKERS_FILE.bak.$ts"
  cp "$BACKUP_DIR/$f" "$MARKERS_FILE"
  echo "Restored $f -> markers.json (local)."
  echo "You may want to validate JSON and then commit:"
  echo "  git add markers.json && git commit -m \"Restore markers.json from $f\" && git push"
}

server_restore() {
  local f="$1"
  local url="${2:-$DEFAULT_SERVER_URL}"
  ensure_backup_exists "$f"
  echo "Will POST $BACKUP_DIR/$f to $url"
  if command -v curl >/dev/null 2>&1; then
    curl -v -X POST -H "Content-Type: application/json" --data-binary "@$BACKUP_DIR/$f" "$url"
    echo
    echo "If the server responds with success, it created a server-side backup and attempted to push to GitHub."
  else
    echo "ERROR: curl not available on this system." >&2
    exit 3
  fi
}

git_branch_restore() {
  local f="$1"
  ensure_backup_exists "$f"
  local branch="restore/markers-$(date +%Y%m%d%H%M%S)"
  echo "Creating branch: $branch"
  git checkout -b "$branch"
  cp "$BACKUP_DIR/$f" "$MARKERS_FILE"
  git add "$MARKERS_FILE"
  git commit -m "Restore markers.json from $f"
  git push -u origin "$branch"
  echo "Branch pushed: $branch. Open a PR to merge if desired."
}

# Main argument parsing
if [ $# -eq 0 ]; then
  usage
  exit 1
fi

case "$1" in
  --list)
    list_backups
    ;;
  --show)
    [ $# -lt 2 ] && { usage; exit 1; }
    pretty_print "$2"
    ;;
  --local)
    [ $# -lt 2 ] && { usage; exit 1; }
    local_restore "$2"
    ;;
  --server)
    [ $# -lt 2 ] && { usage; exit 1; }
    if [ "$#" -ge 4 ] && [ "$2" = "$2" ] && [ "$3" = "--url" ]; then
      server_restore "$2" "$4"
    else
      server_restore "$2"
    fi
    ;;
  --branch)
    [ $# -lt 2 ] && { usage; exit 1; }
    git_branch_restore "$2"
    ;;
  *)
    usage
    exit 1
    ;;
esac
