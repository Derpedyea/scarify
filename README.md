# Scarify 😱

## **THIS PROJECT IS COMPLETLY VIBECODED**

Scarify is a prank-oriented Electron application that triggers randomized jumpscares on your desktop. It uses transparent, high-priority overlays to ensure the jumpscares appear above most other windows and across all connected monitors.

## 🚀 Features

- **Multi-Monitor Support:** Automatically detects and covers all connected displays with transparent overlays.
- **Randomized Content:** Dynamically selects from a collection of images, GIFs, and videos stored in the assets folder.
- **Configurable Frequency:** Adjust the "Chance per second" to control how often a jumpscare might trigger.
- **Audio Stings:** Includes randomized audio effects to maximize the scare factor.
- **Global Shortcuts:** 
  - `Ctrl + Shift + J`: Toggle the jumpscare system on/off globally.
  - `Ctrl + Shift + D`: Open the Debug Console to monitor triggers and logs.
- **Stealth Design:** No taskbar icon for overlays, transparent backgrounds, and "always-on-top" behavior.

## 🛠️ Tech Stack

- **Framework:** [Electron](https://www.electronjs.org/)
- **Frontend:** [React](https://reactjs.org/)
- **Build Tool:** [electron-vite](https://electron-vite.org/)
- **Package Manager:** [Bun](https://bun.sh/)

## 📥 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/scarify.git
   cd scarify
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Run in development mode:**
   ```bash
   bun run dev
   ```

4. **Build for production:**
   ```bash
   bun run dist
   ```
   *The portable Windows executable will be generated in `dist/installers`.*

## ⚙️ Configuration

Upon launching, the **Scarify Settings** window will appear. Here you can:

- **Chance per second:** Set the denominator for the trigger chance (e.g., `10000` means a 1 in 10,000 chance every second).
- **Duration (ms):** How long the jumpscare stays on screen.
- **App Status:** Enable or disable the background trigger system.
- **Audio Effect:** Toggle whether sound plays during jumpscares.
- **Test Jumpscare:** Immediately trigger a jumpscare for testing.

## 📁 Project Structure

- `src/main/`: Main process logic, window management, and global shortcuts.
- `src/renderer/`: React frontend for settings, overlays, and debug views.
- `src/renderer/src/assets/`:
  - `audio/`: MP3/WAV files for jumpscare sounds.
  - `img/`: Images, GIFs, and videos for visual jumpscares.

### 🖼️ Adding Your Own Assets

You can easily customize the jumpscares by adding your own files to the following directories:
- **Images/GIFs/Videos:** Place them in `src/renderer/src/assets/img/`.
- **Audio:** Place them in `src/renderer/src/assets/audio/`.

The application uses dynamic imports, so any new files added to these folders (with supported extensions) will automatically be included in the randomized pool.

## ⚠️ Disclaimer

This application is intended for **harmless pranks only**. Please use it responsibly and do not use it on individuals with heart conditions, epilepsy (due to flashing visuals), or anyone who may be genuinely distressed by jumpscares. Use at your own risk.

---

*Built with terror and code.*
