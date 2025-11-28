# Alarm Pi Installer

A cyberpunk-styled desktop application for installing and configuring Raspberry Pi alarm systems.

## Features

- 🔌 **Connect** to Raspberry Pi via SSH over Tailscale
- 📝 **Edit Mode** - Automatically detects existing alarms and allows configuration updates
- 🚀 **Fresh Install** - Deploy complete alarm system to new Pis
- ⚙️ **Configure** site, room, contacts, GPIO settings

## Building

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Windows

```bash
git clone https://github.com/bearmyob/alarm-pi-installer.git
cd alarm-pi-installer
npm install
npm run build
npx electron-builder --win portable
```

The `.exe` will be in the `dist-build` folder.

### Mac

```bash
git clone https://github.com/bearmyob/alarm-pi-installer.git
cd alarm-pi-installer
npm install
npm run build
npx electron-builder --mac
```

The `.dmg` will be in the `dist-build` folder.

**Note for Mac users**: You may need to right-click and select "Open" the first time to bypass Gatekeeper.

### Linux

```bash
git clone https://github.com/bearmyob/alarm-pi-installer.git
cd alarm-pi-installer
npm install
npm run build
npx electron-builder --linux
```

## Usage

1. Ensure you're on the same Tailscale network as your Raspberry Pi
2. Enter the Pi's Tailscale IP address (100.xxx.xxx.xxx)
3. The app will detect if an alarm is already installed
4. Configure or update settings as needed
5. Deploy!

## Default Credentials

- **Username**: pi
- **Password**: mimichou

## Tech Stack

- React + TypeScript
- Vite
- Electron
- SSH2 for remote connections
