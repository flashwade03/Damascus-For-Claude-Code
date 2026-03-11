#!/bin/bash
# Toggle dev mode: symlink plugin cache to local development directory
set -euo pipefail

DEV_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALLED_PLUGINS="$HOME/.claude/plugins/installed_plugins.json"
PLUGIN_ID="damascus@planner"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

usage() {
  echo "Usage: $0 [--enable|--disable|--status]"
  echo ""
  echo "  --enable   Replace plugin cache with symlink to dev directory"
  echo "  --disable  Restore original plugin cache from backup"
  echo "  --status   Show current dev mode state"
  echo ""
  echo "After toggling, restart your Claude Code session for changes to take effect."
}

get_install_path() {
  if [ ! -f "$INSTALLED_PLUGINS" ]; then
    echo ""
    return
  fi
  # Extract installPath for damascus@planner (first entry)
  node -e "
    const data = JSON.parse(require('fs').readFileSync('$INSTALLED_PLUGINS', 'utf-8'));
    const entries = data.plugins?.['$PLUGIN_ID'] || [];
    if (entries.length > 0) console.log(entries[0].installPath);
  " 2>/dev/null || echo ""
}

do_status() {
  local install_path
  install_path=$(get_install_path)

  if [ -z "$install_path" ]; then
    echo -e "${RED}Damascus plugin not installed.${NC}"
    echo "Install it first: claude plugin install damascus@planner"
    exit 1
  fi

  # Resolve ~ to $HOME
  install_path="${install_path/#\~/$HOME}"

  if [ -L "$install_path" ]; then
    local target
    target=$(readlink "$install_path")
    echo -e "${GREEN}Dev mode: ENABLED${NC}"
    echo "  Symlink: $install_path -> $target"
    echo "  Dev root: $DEV_ROOT"
  elif [ -d "$install_path" ]; then
    echo -e "${YELLOW}Dev mode: DISABLED${NC}"
    echo "  Plugin cache: $install_path"
    echo "  Dev root: $DEV_ROOT"
    if [ -d "${install_path}.bak" ]; then
      echo "  Backup exists: ${install_path}.bak"
    fi
  else
    echo -e "${RED}Plugin path does not exist: $install_path${NC}"
    exit 1
  fi
}

do_enable() {
  local install_path
  install_path=$(get_install_path)

  if [ -z "$install_path" ]; then
    echo -e "${RED}Damascus plugin not installed.${NC}"
    echo "Install it first, then run this script."
    exit 1
  fi

  install_path="${install_path/#\~/$HOME}"

  if [ -L "$install_path" ]; then
    echo -e "${YELLOW}Dev mode already enabled.${NC}"
    echo "  Symlink: $install_path -> $(readlink "$install_path")"
    exit 0
  fi

  if [ ! -d "$install_path" ]; then
    echo -e "${RED}Plugin cache directory not found: $install_path${NC}"
    exit 1
  fi

  # Back up the original cache
  local backup="${install_path}.bak"
  if [ -d "$backup" ]; then
    echo -e "${YELLOW}Backup already exists at ${backup}${NC}"
    echo "Removing old cache directory..."
    rm -rf "$install_path"
  else
    echo "Backing up: $install_path -> $backup"
    mv "$install_path" "$backup"
  fi

  # Create symlink
  ln -s "$DEV_ROOT" "$install_path"

  echo -e "${GREEN}Dev mode enabled!${NC}"
  echo "  Symlink: $install_path -> $DEV_ROOT"
  echo ""
  echo "Restart your Claude Code session for changes to take effect."
}

do_disable() {
  local install_path
  install_path=$(get_install_path)

  if [ -z "$install_path" ]; then
    echo -e "${RED}Damascus plugin not installed.${NC}"
    exit 1
  fi

  install_path="${install_path/#\~/$HOME}"

  if [ ! -L "$install_path" ]; then
    echo -e "${YELLOW}Dev mode is not enabled (not a symlink).${NC}"
    exit 0
  fi

  local backup="${install_path}.bak"

  # Remove symlink
  rm "$install_path"

  if [ -d "$backup" ]; then
    echo "Restoring backup: $backup -> $install_path"
    mv "$backup" "$install_path"
    echo -e "${GREEN}Dev mode disabled. Original plugin restored.${NC}"
  else
    echo -e "${YELLOW}Symlink removed but no backup found.${NC}"
    echo "You may need to reinstall: claude plugin install damascus@planner"
  fi

  echo ""
  echo "Restart your Claude Code session for changes to take effect."
}

case "${1:-}" in
  --enable)  do_enable ;;
  --disable) do_disable ;;
  --status)  do_status ;;
  *)         usage ;;
esac
