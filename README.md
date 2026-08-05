<div align="center">

<img src="https://github.com/bantikumarsatlokashram/LinkStream/blob/main/app-icon.png" alt="LinkStream Logo" width="auto" height="200px" />

# LinkStream

### ⚡ Fastest LAN & WiFi File Transfer App for Windows

Transfer files of **any size** between PCs on the same network at **full wire speed** — no internet, no cloud, no limits.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows)](https://github.com/bantikumarsatlokashram/LinkStream/releases)
[![Built with Electron](https://img.shields.io/badge/Built%20with-Electron-47848F?logo=electron)](https://www.electronjs.org/)
[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?logo=react)](https://react.dev/)

**[⬇️ Download Latest Release](https://github.com/bantikumarsatlokashram/LinkStream/releases)**

</div>

---

## 📸 Screenshots

> Fast, beautiful, and simple — transfer any file over your local network in seconds.
<img src="https://github.com/bantikumarsatlokashram/LinkStream/blob/main/Screenshot.png" alt="Screenshot" width="auto" height="auto" />
---

## ✨ Features

| Feature | Description |
|---------|-------------|
| ⚡ **Wire-Speed Transfer** | Uses raw HTTP streaming — achieves full LAN/WiFi speed (up to 10 Gbps on supported hardware) |
| 📁 **Unlimited File Size** | Send files of any size — GBs, TBs — with zero memory buffering |
| 🌐 **LAN & WiFi** | Works on wired Ethernet AND same-WiFi networks automatically |
| 🔍 **Auto Discovery** | PCs on the same network find each other instantly — no IP addresses needed |
| 💾 **Save Before Transfer** | Choose save location before transfer starts — data goes straight to disk |
| 🔔 **Background Notifications** | Receive file requests even when the app is minimized to the system tray |
| 🚀 **Auto Startup** | Starts with Windows — always ready in the background |
| 🖥️ **Real PC Names** | Shows your actual Windows computer name (hostname) for easy identification |
| 🎨 **Modern UI** | Beautiful dark-mode interface with real-time transfer progress |

---

## 🚀 Quick Start

### Download & Install
1. Download **`LinkStream LAN Share Setup 1.0.0.exe`** from [Releases](https://github.com/bantikumarsatlokashram/LinkStream/releases)
2. Run the installer on **all PCs** you want to connect
3. Open LinkStream — PCs on the same network appear automatically
4. Select a PC → drop files → click **Send**

### That's it. No configuration needed.

---

## 🔧 How It Works

```
PC A (Sender)                    PC B (Receiver)
──────────────                   ────────────────
1. Drop file(s)                  
2. Select target PC              
3. Click Send ──────────────────► File request appears
                                 4. Choose save location
                                 5. Click Accept & Save
                                    ↓
         Data flows: Sender → HTTP Stream → Node.js → Disk
                     (No cloud, no internet, no buffering)
```

### Discovery Protocol
- Uses **UDP broadcast** on port `41235` across all network interfaces (Ethernet + WiFi)
- First PC to open the app becomes the **LAN server**
- Other PCs discover it and connect automatically
- All file data streams peer-to-peer through the local server

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Shell** | [Electron](https://www.electronjs.org/) 43 |
| **UI** | [React](https://react.dev/) 19 + TypeScript |
| **Styling** | Vanilla CSS + Tailwind-inspired utility classes |
| **Server** | [Express](https://expressjs.com/) + WebSocket (`ws`) |
| **Transfer** | Raw HTTP streaming (`http.get` → `fs.WriteStream`) |
| **Discovery** | Node.js `dgram` UDP broadcast |
| **Build** | [Vite](https://vitejs.dev/) + [electron-builder](https://www.electron.build/) |

---

## 🛠️ Build from Source

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [npm](https://www.npmjs.com/)

### Steps

```bash
# Clone the repository
git clone https://github.com/bantikumarsatlokashram/LinkStream.git
cd LinkStream

# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Build Windows installer (.exe)
npm run build:win
```

The installer will be output to `release/LinkStream LAN Share Setup 1.0.0.exe`.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server only |
| `npm run electron:dev` | Start Electron app in dev mode |
| `npm run build` | Build frontend + server bundle |
| `npm run build:win` | Build + package Windows NSIS installer |

---

## 📂 Project Structure

```
LinkStream/
├── electron/
│   ├── main.cjs          # Electron main process (tray, IPC, auto-launch)
│   └── preload.cjs       # Context bridge (exposes APIs to renderer)
├── src/
│   ├── components/
│   │   ├── DeviceScanner.tsx       # Active nodes / peer discovery UI
│   │   ├── FileDropzone.tsx        # Drag & drop file selector
│   │   ├── IncomingTransferModal.tsx # Accept/decline with save picker
│   │   ├── TransferManager.tsx     # Active transfers + history
│   │   ├── Header.tsx              # App header with device name
│   │   └── ...
│   ├── lib/
│   │   └── wsClient.ts   # WebSocket client + peer discovery
│   └── App.tsx           # Main application component
├── server.ts             # Express server (WebSocket + HTTP transfer pipe)
├── electron-builder.json # Build/packaging configuration
└── package.json
```

---

## 🔒 Privacy & Security

- ✅ **100% Local** — No data ever leaves your network
- ✅ **No Internet Required** — Works completely offline
- ✅ **No Accounts** — No sign-up, no login, no tracking
- ✅ **No Cloud** — Files transfer directly between PCs on your LAN/WiFi

---

## 🖥️ System Requirements

| | Minimum |
|-|---------|
| **OS** | Windows 10 / 11 (64-bit) |
| **RAM** | 256 MB |
| **Network** | LAN (Ethernet) or WiFi — both devices on same network |
| **Disk** | 200 MB for installation |

---

## 📋 Changelog

### v1.0.0
- ✨ Initial release
- ⚡ Wire-speed HTTP streaming for unlimited file sizes
- 🔍 Automatic LAN/WiFi peer discovery via UDP broadcast
- 💾 Native save dialog in accept modal (before transfer starts)
- 🔔 Background system tray with Windows notifications
- 🚀 Auto-launch on Windows startup
- 🖥️ Real PC hostname display in Active Nodes

---

## 👤 Author

**Banti Kumar**
- GitHub: [@bantikumarsatlokashram](https://github.com/bantikumarsatlokashram)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by **Banti Kumar**

⭐ **Star this repo if it helped you!**

</div>
