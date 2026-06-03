#!/usr/bin/env bash
set -euo pipefail

# MarkDocs CLI Installer
# Usage: curl -fsSL https://markdocs.sh/install.sh | bash

REPO="thakurkharel/markdocs-cli"
VERSION="${MARKDOCS_VERSION:-latest}"
INSTALL_DIR="${MARKDOCS_INSTALL_DIR:-/usr/local/bin}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
DIM='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

info()  { echo -e "${BLUE}>${RESET} $1"; }
ok()    { echo -e "${GREEN}✓${RESET} $1"; }
err()   { echo -e "${RED}✗${RESET} $1" >&2; }
dim()   { echo -e "${DIM}$1${RESET}"; }

echo ""
echo -e "${BOLD}  MarkDocs CLI Installer${RESET}"
echo -e "  ${DIM}──────────────────────${RESET}"
echo ""

# ── Check Node.js ──────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  err "Node.js is required but not installed."
  dim "  Install it from https://nodejs.org or via your package manager."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  err "Node.js 18+ is required (found v$(node -v))."
  exit 1
fi

ok "Node.js $(node -v) detected"

# ── Resolve version ───────────────────────────────────────────
if [ "$VERSION" = "latest" ]; then
  info "Fetching latest release..."
  VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep '"tag_name"' | head -1 | sed 's/.*"v\?\([^"]*\)".*/\1/')
  if [ -z "$VERSION" ]; then
    err "Failed to fetch latest version. Set MARKDOCS_VERSION manually."
    exit 1
  fi
fi

info "Installing MarkDocs CLI v${VERSION}"

# ── Download binaries ─────────────────────────────────────────
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/v${VERSION}"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

info "Downloading CLI..."
curl -fsSL "${DOWNLOAD_URL}/markdocs.cjs" -o "${TMP_DIR}/markdocs" || {
  err "Failed to download markdocs CLI."
  dim "  URL: ${DOWNLOAD_URL}/markdocs.cjs"
  dim "  Make sure the release exists at github.com/${REPO}"
  exit 1
}

info "Downloading MCP server..."
curl -fsSL "${DOWNLOAD_URL}/markdocs-mcp.cjs" -o "${TMP_DIR}/markdocs-mcp" || {
  err "Failed to download markdocs-mcp."
  exit 1
}

chmod +x "${TMP_DIR}/markdocs" "${TMP_DIR}/markdocs-mcp"

# ── Install ───────────────────────────────────────────────────
info "Installing to ${INSTALL_DIR}..."

if [ -w "$INSTALL_DIR" ]; then
  mv "${TMP_DIR}/markdocs" "${INSTALL_DIR}/markdocs"
  mv "${TMP_DIR}/markdocs-mcp" "${INSTALL_DIR}/markdocs-mcp"
else
  sudo mv "${TMP_DIR}/markdocs" "${INSTALL_DIR}/markdocs"
  sudo mv "${TMP_DIR}/markdocs-mcp" "${INSTALL_DIR}/markdocs-mcp"
fi

# ── Verify ────────────────────────────────────────────────────
if command -v markdocs &>/dev/null; then
  ok "markdocs installed successfully"
else
  err "Installation completed but 'markdocs' not found in PATH."
  dim "  Make sure ${INSTALL_DIR} is in your PATH."
  exit 1
fi

echo ""
echo -e "${BOLD}  Setup${RESET}"
echo -e "  ${DIM}──────${RESET}"
echo ""
echo -e "  ${DIM}1.${RESET} Set your API key:"
echo -e "     ${DIM}export MARKDOCS_API_KEY=your-api-key${RESET}"
echo ""
echo -e "  ${DIM}2.${RESET} Point to your server (optional):"
echo -e "     ${DIM}export MARKDOCS_URL=https://your-instance.com${RESET}"
echo ""
echo -e "  ${DIM}3.${RESET} Try it out:"
echo -e "     ${DIM}markdocs list${RESET}"
echo ""
echo -e "  ${DIM}MCP server for Claude:${RESET}"
echo -e "     ${DIM}markdocs-mcp${RESET}"
echo ""
echo -e "  ${DIM}Docs: https://markdocs.sh/docs/cli${RESET}"
echo ""
