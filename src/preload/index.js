const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jumpscare", {
  onTrigger: (handler) => {
    ipcRenderer.removeAllListeners("jumpscare:trigger");
    ipcRenderer.on("jumpscare:trigger", (_event, payload) => {
      handler(payload);
    });
  },
  complete: () => {
    ipcRenderer.send("jumpscare:complete");
  },
  test: () => {
    ipcRenderer.send("jumpscare:test");
  },
});

contextBridge.exposeInMainWorld("jumpscareSettings", {
  get: () => ipcRenderer.invoke("settings:get"),
  update: (updates) => ipcRenderer.invoke("settings:update", updates),
});

contextBridge.exposeInMainWorld("jumpscareDebug", {
  open: () => ipcRenderer.send("debug:open"),
  getLogs: () => ipcRenderer.invoke("debug:get-logs"),
  getStatus: () => ipcRenderer.invoke("debug:get-status"),
  reportError: (error) => ipcRenderer.send("debug:error", error),
  onUpdate: (callback) => {
    const subscription = (_event, log) => callback(log);
    ipcRenderer.on("debug:update", subscription);
    return () => ipcRenderer.removeListener("debug:update", subscription);
  },
});
