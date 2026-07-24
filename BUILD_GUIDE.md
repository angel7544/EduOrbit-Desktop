# EduOrbit Desktop & Web App Build Guide (v8.0.0)

This guide provides step-by-step instructions for setting up, building, running, and bundling the **EduOrbit Desktop (Tauri)** and **Web Application**.

---

## 📋 System Requirements

### General Requirements
- **Node.js**: `v20.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Git**

### Additional Requirements for Tauri Desktop Build
To compile the Tauri desktop application into native installers (`.exe`, `.msi`, `.nsis`, `.dmg`, `.deb`), Rust and platform build tools are required:

- **Windows**:
  - **Rust Toolchain**: Install via [Rustup](https://rustup.rs/) (`rustc`, `cargo`).
  - **C++ Build Tools**: Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (select "Desktop development with C++").
- **macOS**:
  - Xcode Command Line Tools (`xcode-select --install`).
  - Rust via Rustup.
- **Linux**:
  - Packages: `build-essential`, `curl`, `wget`, `file`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `webkit2gtk-4.1`.

---

## ⚙️ Environment Configuration (`.env`)

Create or update the `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_KEY=
EXPO_PUBLIC_SUPABASE_ANON_KEY=...

EXPO_PUBLIC_BUNNY_STREAM_LIBRARY_ID=60
EXPO_PUBLIC_BUNNY_STREAM_CDN_HOST=ht
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=doalguvvw
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=e
EXPO_PUBLIC_CLOUDINARY_API_KEY=431834

EXPO_PUBLIC_RAZORPAY_KEY_ID=rz
EXPO_PUBLIC_API_URL=https://lms-mobile-b
```

---

## 🌐 1. Building & Running the Web App

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```
- Opens local Vite server at `http://localhost:5173`.

### Production Web Build
```bash
npm run build
```
- Runs TypeScript typecheck (`tsc`) and bundles production assets with Vite.
- Output directory: `./dist`.

### Preview Production Web Build
```bash
npm run preview
```
- Serves the compiled production build from `./dist` locally.

---

## 🖥️ 2. Building & Running the Tauri Desktop App

### Step 1: Verify Rust Installation
Before building Tauri desktop binaries, ensure Rust is installed and available in your environment path:

```bash
rustc --version
cargo --version
```
> *If `cargo` is not recognized, install Rust from [https://rustup.rs/](https://rustup.rs/) and restart your terminal.*

### Step 2: Start Desktop App in Development Mode
```bash
npm run tauri dev
```
- Launches the Vite frontend and opens the Tauri native desktop window with hot-reload enabled.

### Step 3: Package Desktop Application (Release Build)
```bash
npm run tauri build
```

This command will:
1. Compile the production web frontend into `./dist`.
2. Compile the Rust backend in `./src-tauri`.
3. Bundle native desktop installers.

#### Installer Output Locations:
- **Windows**: `src-tauri/target/release/bundle/nsis/` (`EduOrbit Desktop_8.0.0_x64-setup.exe`) and `src-tauri/target/release/bundle/msi/`.
- **macOS**: `src-tauri/target/release/bundle/dmg/` and `.app`.
- **Linux**: `src-tauri/target/release/bundle/deb/` and `.AppImage`.

---

## 📌 App Version Synchronization

App version is standardized to `8.0.0` across the codebase:

| Location | File | Value |
| :--- | :--- | :--- |
| Central Config | `src/config/version.ts` | `export const APP_VERSION = '8.0.0';` |
| Node Package | `package.json` | `"version": "8.0.0"` |
| Rust Manifest | `src-tauri/Cargo.toml` | `version = "8.0.0"` |
| Tauri Config | `src-tauri/tauri.conf.json` | `"version": "8.0.0"` |

---

## 🔍 Troubleshooting & FAQs

### Error: `failed to run 'cargo metadata'... program not found`
- **Cause**: Rust toolchain (`cargo`) is not installed or not added to your system `PATH`.
- **Solution**: Install Rust via [https://rustup.rs/](https://rustup.rs/). After installation, restart your terminal and verify with `cargo --version`.

### Image Upload Issues in Desktop/Web
- Image uploads use direct Cloudinary unsigned upload (`api.cloudinary.com`) with fallback to backend `/api/upload` and Supabase Storage.
- Make sure `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=doalguvvw` and `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=eduorbit` are set in `.env`.

### Clearing Build Cache
If you encounter caching issues during build:
```bash
# Clean web build dist
rm -rf dist

# Clean cargo release target (desktop)
cd src-tauri
cargo clean
cd ..
```
