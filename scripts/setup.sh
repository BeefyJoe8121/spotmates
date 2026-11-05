#!/usr/bin/env bash
# Installs everything, then lines every Expo package up with the project's Expo SDK.
set -euo pipefail
npm install
npx expo install --fix
echo "Setup done. Run: npx expo start"
