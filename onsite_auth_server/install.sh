#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# https://github.com/nebrius/raspi-io/wiki/Getting-a-Raspberry-Pi-ready-for-NodeBots

# NVM needs to be removed Servial port requires installing as non-root but running as root
# This is done by commenting out the lines that start nvm in .profile or .bash_profile
# Then restarting the terminal session

# Setup for raspi or Debian based system
# Get Node 24 LTS from NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install exactly the project-local dependencies recorded in package-lock.json.
npm ci
npm exec -- pm2 --version
npm exec -- pm2 start ecosystem.config.js --update-env
npm exec -- pm2 save

# PM2 must generate its system-specific startup command with the application
# user's home and the current Node binary on PATH. Run the command below as the
# application user, then execute the sudo command printed by PM2 verbatim:
#
#   env PATH="$(dirname "$(command -v node)"):$PATH" npm exec -- pm2 startup systemd -u "$USER" --hp "$HOME"
#
# Finally run `npm exec -- pm2 save` again after any process-list changes.

# I think the folowing is needed for hardware serial but it might be something to try for usb serial
# raspi-config -> Interfacing Options -> Serial -> #1 No #2 Yes
