# 🖼️ `img` (ImgUtil CLI)

A lightweight, high-speed CLI tool for uploading, searching, and managing images on cloud CDN storage directly from your terminal.

Designed with **Ubuntu GNOME Keyring security** (fetch-on-demand via `secret-tool`, zero plaintext API keys on disk) and seamless **clipboard integration**.

---

## 🚀 Features

- 🔐 **Zero Plaintext Secrets**: API keys live securely in the OS Keyring (GNOME Keyring / Secret Service API). No `.env` or plaintext token files.
- ⚡ **Instant Upload & Clipboard Copy**: Run `img up <file>` to upload to global CDN and immediately paste the URL into Markdown, HTML, or chat.
- 🔍 **Interactive Terminal Fuzzy Finder**: Run `img find` to search past uploads by filename or `#tag`, copy raw/transformed CDN links, or download locally.
- 🎨 **On-The-Fly CDN Transformations**: Generate resized (`-w`, `-h`), compressed (`-q`), or format-converted (`-f webp|avif`) URLs instantly.
- 🧙 **Interactive Onboarding Wizard**: Single command `img init` guides you through setup and validates keys live.

---

## 📦 Installation

### Global Install via NPM:
```bash
npm install -g img-cli-util
```

### Local Linking (Development):
```bash
git clone https://github.com/your-username/imgutilapp.git
cd imgutilapp
npm install
npm link
```

### System Requirements (Linux/Ubuntu):
- `libsecret-tools` (`secret-tool`): Usually pre-installed on Ubuntu desktop. If missing:
  ```bash
  sudo apt install libsecret-tools
  ```
- `xclip` (or Wayland compositor) for clipboard integration:
  ```bash
  sudo apt install xclip
  ```

---

## ⚡ Quick Start & Onboarding

Run the onboarding wizard to securely store your [ImageKit](https://imagekit.io) API credentials in your keyring:

```bash
img init
```

The wizard prompts for your **Public Key**, **URL Endpoint**, and **Private Key** (masked input), validates them live against the ImageKit API, and stores them in your OS Keyring.

---

## 📖 Command Reference

### 1. Upload Image (`img up`)
Upload an image to cloud CDN and copy the link to your clipboard automatically:

```bash
# Upload a file
img up ./screenshot.png

# Upload with tags for easy searching
img up ./diagram.png -t architecture backend v1

# Upload to a specific cloud folder with custom name
img up ./logo.png -n company_logo.png -f /branding

# Upload and immediately open the CDN link in your browser
img up ./preview.png --open
```

### 2. Interactive Fuzzy Search & Explorer (`img find`)
Launch an interactive fuzzy search in your terminal to search all uploaded assets by name or `#tag`:

```bash
# Search across 100 most recent assets
img find

# Search across your entire cloud library
img find --all
```
Selecting an image gives you instant actions:
- 📋 **Copy Raw CDN URL**
- 🎨 **Copy Transformed CDN URL** (resize width, height, quality, format)
- 💾 **Download locally** (supports `~/Downloads/`, relative paths, and automatic folder creation)
- 🌐 **Open in Browser**
- ℹ️ **View Details & Metadata**
- 🗑️ **Delete Image**

### 3. Fetch / Transform / Download (`img get`)
Download an image locally or generate transformed CDN URLs:

```bash
# Download by filename or ID directly into ~/Downloads/
img get diagram.png -o ~/Downloads/

# Resize width to 800px and compress to quality 80:
img get diagram.png -w 800 -q 80 -o ./thumb.png

# Copy transformed WebP URL to clipboard instead of downloading:
img get diagram.png -w 500 -f webp --copy-url
```

### 4. List Recent Uploads (`img ls`)
Display a clean table of recent uploads in your terminal with full clickable CDN URLs:

```bash
# List recent 20 images
img ls

# List recent 50 images filtered by tag
img ls -l 50 -t architecture

# List all cloud images
img ls -a

# Export as JSON for scripting
img ls --json
```

### 5. Delete an Image (`img del`)
Permanently remove an asset from cloud storage:

```bash
img del diagram.png
img del 65123456789abcdef0123456 -y
```

### 6. Authentication & Keyring Status (`img auth`)
```bash
# Check current keyring storage status and test connection
img auth status

# Re-authenticate or update keys
img auth login

# Clear keys from keyring
img auth logout
```

---

## 🔒 Security & Architecture

1. **GNOME Keyring / Secret Service**: ImgUtil calls `secret-tool` directly to query secrets from memory/keyring on demand. At no point are API keys written to `.env`, `.bashrc`, or disk files.
2. **Environment Variable Fallback**: For headless environments (e.g. CI/CD or Docker), ImgUtil also supports reading `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, and `IMAGEKIT_URL_ENDPOINT` from the environment if no keyring entry exists.
3. **Preferences**: Non-sensitive settings (like default upload folders) are saved in `~/.config/imgutil/config.json`.

---

## 🧪 Testing

Run the test suite using Vitest:

```bash
npm test
```

---

## 📄 License

MIT
