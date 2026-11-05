#!/usr/bin/env bash
# Installs every Expo package at the exact version that matches the project's Expo SDK.
set -euo pipefail
npm install
npx expo install \
  expo-router expo-linking expo-constants expo-status-bar expo-splash-screen expo-font \
  expo-image-picker expo-image-manipulator expo-crypto \
  react-native-svg react-native-safe-area-context react-native-screens \
  @react-native-async-storage/async-storage react-native-url-polyfill \
  @expo-google-fonts/big-shoulders-display @expo-google-fonts/instrument-sans @expo-google-fonts/jetbrains-mono
npx expo install --fix
echo "Setup done. Run: npx expo start"
