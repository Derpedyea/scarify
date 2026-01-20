const path = require("path");
const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  screen,
  shell,
} = require("electron");

const JUMPSCARE_INTERVAL_MS = 1000;
const DEFAULT_SETTINGS = {
  chanceDenominator: 10000,
  durationMs: 2000,
  audioEnabled: true,
};

const overlayWindows = new Map();
let jumpscareActive = false;
let jumpscareEnabled = true;
let settingsWindow = null;
let debugWindow = null;
const settings = { ...DEFAULT_SETTINGS };

const debugLogs = [];
const MAX_DEBUG_LOGS = 500;

const logToDebug = (type, message, data = null) => {
  const entry = {
    timestamp: new Date().toISOString(),
    type, // 'info', 'warn', 'error', 'trigger'
    message,
    data,
  };
  debugLogs.unshift(entry);
  if (debugLogs.length > MAX_DEBUG_LOGS) {
    debugLogs.pop();
  }

  // Notify debug window if it's open
  if (debugWindow && !debugWindow.isDestroyed()) {
    debugWindow.webContents.send("debug:update", entry);
  }
};

process.on("uncaughtException", (error) => {
  logToDebug("error", "Main process uncaught exception", {
    message: error.message,
    stack: error.stack,
  });
});

process.on("unhandledRejection", (reason) => {
  logToDebug("error", "Main process unhandled rejection", {
    reason: String(reason),
  });
});

const devServerUrl = process.env.ELECTRON_RENDERER_URL;
const isDev = Boolean(devServerUrl);

const getRendererUrl = (view, displayId) => {
  const query = new URLSearchParams({ view });
  if (displayId) {
    query.set("displayId", String(displayId));
  }

  if (isDev) {
    return `${devServerUrl}/?${query.toString()}`;
  }

  const indexPath = path.join(__dirname, "../renderer/index.html");
  return `file://${indexPath}?${query.toString()}`;
};

const createOverlayWindow = (display) => {
  const bounds = display.bounds;
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    show: false,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: "no-user-gesture-required",
      backgroundThrottling: false,
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.setFocusable(false);

  const url = getRendererUrl("overlay", display.id);
  if (isDev) {
    win.loadURL(url);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"), {
      query: { view: "overlay", displayId: String(display.id) },
    });
  }

  win.once("ready-to-show", () => {
    win.showInactive();
  });

  return win;
};

const syncDisplays = () => {
  const displays = screen.getAllDisplays();
  const displayIds = new Set(displays.map((display) => display.id));

  for (const [id, win] of overlayWindows.entries()) {
    if (!displayIds.has(id)) {
      win.close();
      overlayWindows.delete(id);
    }
  }

  for (const display of displays) {
    const existing = overlayWindows.get(display.id);
    if (!existing) {
      overlayWindows.set(display.id, createOverlayWindow(display));
      continue;
    }

    existing.setBounds(display.bounds, false);
  }
};

const createSettingsWindow = () => {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 460,
    height: 520,
    resizable: false,
    show: false,
    title: "Scarify Settings",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWindow.setMenuBarVisibility(false);

  if (isDev) {
    settingsWindow.loadURL(getRendererUrl("settings"));
  } else {
    settingsWindow.loadFile(path.join(__dirname, "../renderer/index.html"), {
      query: { view: "settings" },
    });
  }

  settingsWindow.once("ready-to-show", () => {
    settingsWindow.show();
  });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
};

const createDebugWindow = () => {
  if (debugWindow) {
    debugWindow.focus();
    return;
  }

  debugWindow = new BrowserWindow({
    width: 600,
    height: 700,
    title: "Scarify Debug Console",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  debugWindow.setMenuBarVisibility(false);

  if (isDev) {
    debugWindow.loadURL(getRendererUrl("debug"));
  } else {
    debugWindow.loadFile(path.join(__dirname, "../renderer/index.html"), {
      query: { view: "debug" },
    });
  }

  debugWindow.on("closed", () => {
    debugWindow = null;
  });
};

const triggerJumpscare = (force = false) => {
  if ((!jumpscareEnabled && !force) || jumpscareActive) {
    logToDebug("info", "Trigger blocked", {
      jumpscareEnabled,
      force,
      jumpscareActive,
    });
    return;
  }

  logToDebug("trigger", "Jumpscare triggered", {
    force,
    displays: overlayWindows.size,
  });

  jumpscareActive = true;
  for (const win of overlayWindows.values()) {
    // Ensure the window is at the very top before triggering
    win.setAlwaysOnTop(true, "screen-saver");
    win.showInactive();
    win.moveTop();

    win.webContents.send("jumpscare:trigger", {
      durationMs: settings.durationMs,
      audioEnabled: settings.audioEnabled,
    });
  }
};

const startJumpscareTimer = () => {
  setInterval(() => {
    if (!jumpscareEnabled) {
      return;
    }
    const chance = 1 / Math.max(1, settings.chanceDenominator);
    const roll = Math.random();
    const success = roll < chance;

    if (success) {
      logToDebug("info", "Roll success", { roll, chance });
      triggerJumpscare();
    } else {
      logToDebug("tick", "Periodic roll check", { roll, chance });
    }
  }, JUMPSCARE_INTERVAL_MS);
};

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  syncDisplays();
  createSettingsWindow();
  startJumpscareTimer();

  screen.on("display-added", syncDisplays);
  screen.on("display-removed", syncDisplays);
  screen.on("display-metrics-changed", syncDisplays);

  globalShortcut.register("Control+Shift+J", () => {
    jumpscareEnabled = !jumpscareEnabled;
    logToDebug("info", `Jumpscare status changed: ${jumpscareEnabled}`);
  });

  globalShortcut.register("Control+Shift+D", () => {
    createDebugWindow();
  });
});

ipcMain.on("jumpscare:complete", () => {
  jumpscareActive = false;
  logToDebug("info", "Jumpscare completed");
});

ipcMain.on("jumpscare:test", () => {
  logToDebug("info", "Manual test trigger");
  triggerJumpscare(true);
});

ipcMain.on("debug:open", () => {
  createDebugWindow();
});

ipcMain.on("debug:error", (_event, error) => {
  logToDebug("error", "Renderer error reported", error);
});

ipcMain.handle("debug:get-logs", () => debugLogs);

ipcMain.handle("debug:get-status", () => ({
  jumpscareActive,
  jumpscareEnabled,
  overlayWindowCount: overlayWindows.size,
  settings,
}));

ipcMain.handle("settings:get", () => ({ ...settings, enabled: jumpscareEnabled }));
ipcMain.handle("settings:update", (_event, updates) => {
  if (typeof updates?.chanceDenominator === "number") {
    settings.chanceDenominator = Math.max(1, Math.round(updates.chanceDenominator));
  }
  if (typeof updates?.durationMs === "number") {
    settings.durationMs = Math.max(100, Math.round(updates.durationMs));
  }
  if (typeof updates?.audioEnabled === "boolean") {
    settings.audioEnabled = updates.audioEnabled;
  }
  if (typeof updates?.enabled === "boolean") {
    jumpscareEnabled = updates.enabled;
  }

  return { ...settings, enabled: jumpscareEnabled };
});

app.on("window-all-closed", () => {
  globalShortcut.unregisterAll();
  app.quit();
});
