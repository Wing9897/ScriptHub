# 🎯 ScriptHub

English | [繁體中文](README.md) | [简体中文](README.zh-CN.md)

A cross-platform command script manager — efficiently store, organize and share your frequently used commands.

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![License](https://img.shields.io/badge/License-MIT-green)

![ScriptHub Banner](assets/ScriptHub_banner.png)

## ✨ Features

### Script Management
- 📝 Create, edit and delete scripts with multi-step command workflows
- 📋 One-click copy for individual commands or entire scripts
- ⭐ Favorite frequently used scripts for quick access
- 🔍 Real-time search across titles, descriptions and command content
- 🔀 Drag-and-drop to reorder scripts

![Category Page](assets/folder_page.png)

### Categories & Tags
- 📁 Folder-style category management with 34 built-in icons and custom icon upload
- 🖼️ Icon library — uploaded icons can be reused across categories
- 🏷️ Color-coded tag system for flexible filtering
- 🔀 Drag-and-drop to reorder categories
- ⋮ Context menu on category cards (edit, delete, sync subscription)

### Subscription & Sync
- 🔗 Subscribe to GitHub script repositories and auto-import scripts
- 🔄 One-click sync to update subscribed content
- 📦 Efficient ZIP-based downloads

### Data Management
- 💾 Local SQLite database storage
- 📤 Export as JSON backup or folder structure
- 📥 Import from backups or external folders
- 🗂️ Per-category export

![Settings Page](assets/setting_page.png)

### Interface & Experience
- 🌓 Light / Dark / System theme
- 📱 Grid and list view toggle
- 🌐 Traditional Chinese / English bilingual support
- 🖥️ Dynamic sidebar that adapts to the current view
- 🖱️ Right-click context menus on categories and script cards
- 🚀 Launch on startup (optional)
- 🔽 Minimize to system tray on close

## 🚀 Getting Started

### Download

Head to the [Releases](../../releases) page to download the latest version:
- **Windows**: `.msi` installer or `.exe` setup
- **macOS**: `.dmg` disk image
- **Linux**: `.deb`, `.rpm` or `.AppImage`

### Build from Source

#### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Rust](https://www.rust-lang.org/tools/install)
- Windows: [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Linux: `build-essential`, `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

#### Install & Develop

```bash
# Clone the repo
git clone https://github.com/Wing9897/ScriptHub.git
cd ScriptHub

# Install dependencies
npm install

# Dev mode (with Tauri desktop window)
npm run tauri dev

# Frontend only (browser preview)
npm run dev
```

#### Build for Production

```bash
npm run tauri build
```

Output is located at `src-tauri/target/release/bundle/`.

## 🎨 Usage

### Create a Script

1. Click "New Script" in the top-right corner
2. Enter a title, description, and select a platform
3. Add commands step by step, with optional descriptions for each
4. Choose a category and tags
5. Click "Create Script"

### Subscribe to a GitHub Repository

1. Click the "Subscribe" button in the sidebar
2. Enter a GitHub repository URL (subdirectory paths supported)
3. Scan and select scripts to import
4. Use the ⋮ menu on the category card to sync updates later

## � Data Format

ScriptHub uses a V2 unified format for import/export with the following structure:

```
scripthub-export-2025-02-08/
├── scripthub.json              # Root manifest
├── global/
│   ├── tags.json               # Global tags
│   ├── variables.json          # Global variables
│   └── custom_icons.json       # Custom icon library
├── categories/
│   └── [category-name]/
│       ├── category.json       # Category metadata + script list
│       ├── icon.png            # Custom icon (if any)
│       └── scripts/
│           ├── script-a.sh
│           └── script-b.ps1
└── uncategorized/
    ├── category.json
    └── scripts/
```

### scripthub.json

```json
{
  "manifest_version": "2.0",
  "exported_at": "2025-02-08T12:00:00.000Z",
  "app_version": "1.0.0",
  "stats": {
    "categories": 3,
    "scripts": 15,
    "tags": 5,
    "variables": 0
  }
}
```

### category.json

```json
{
  "id": "uuid",
  "name": "My Scripts",
  "description": "Common deploy scripts",
  "icon": "terminal",
  "customIcon": "icon.png",
  "order": 0,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "isSubscription": false,
  "sourceUrl": null,
  "scripts": [
    {
      "id": "uuid",
      "title": "Deploy",
      "description": "Deploy to production",
      "file": "scripts/deploy.sh",
      "platform": "linux",
      "tags": ["tag-id-1"],
      "variables": [],
      "isFavorite": true,
      "order": 0,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

Supported platform values: `cross`, `windows`, `linux`, `macos`

## 📁 Project Structure

```
ScriptHub/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── layout/         # Layout (Sidebar, TopBar, MainLayout)
│   │   ├── category/       # Category management
│   │   ├── script/         # Script-related
│   │   ├── tag/            # Tag management
│   │   ├── import/         # File import
│   │   ├── subscription/   # Subscription feature
│   │   ├── settings/       # Settings page
│   │   └── ui/             # Shared UI components
│   ├── stores/             # Zustand state management
│   ├── services/           # Database, GitHub, file services
│   ├── hooks/              # Custom hooks
│   ├── i18n/               # Internationalization (zh-HK, en-US)
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── src-tauri/              # Tauri Rust backend
│   ├── src/                # Rust source
│   ├── capabilities/       # Permission config
│   └── tauri.conf.json     # Tauri config
├── public/                 # Static assets
└── package.json
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [Tauri 2](https://tauri.app/) | Desktop app framework |
| [React 18](https://react.dev/) | UI framework |
| [TypeScript 5](https://www.typescriptlang.org/) | Type safety |
| [Zustand 5](https://zustand.surge.sh/) | State management |
| [Tailwind CSS 3](https://tailwindcss.com/) | CSS framework |
| [Vite 6](https://vitejs.dev/) | Build tool |
| [SQLite](https://www.sqlite.org/) | Local database |
| [i18next](https://www.i18next.com/) | Internationalization |
| [Lucide React](https://lucide.dev/) | Icon library |

## 📄 License

[MIT License](LICENSE)
