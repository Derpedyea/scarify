import React, { useEffect, useMemo, useState } from "react";

// Dynamic glob imports for images, audio, and videos
const imageAssets = import.meta.glob("./assets/img/*.{png,jpg,jpeg,gif,svg,webp}", {
  eager: true,
  import: "default",
});
const audioAssets = import.meta.glob("./assets/audio/*.{mp3,wav,ogg,m4a,aac}", {
  eager: true,
  import: "default",
});
const videoAssets = import.meta.glob("./assets/video/*.{mp4,webm,ogg}", {
  eager: true,
  import: "default",
});

const visualList = [
  ...Object.values(imageAssets).map((url) => ({ url, type: "image" })),
  ...Object.values(videoAssets).map((url) => ({ url, type: "video" })),
];

const audioList = Object.values(audioAssets);

const getRandomAsset = (list) => {
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
};

const getView = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("view") || "settings";
};

const defaultSettings = {
  chanceDenominator: 10000,
  durationMs: 2000,
  audioEnabled: true,
  enabled: true,
};

const playAudio = (audioUrl) => {
  try {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch((error) => {
        window.jumpscareDebug?.reportError({
          context: "playAudio",
          message: error.message,
          url: audioUrl,
        });
        // Fallback to generated audio if playback fails
        playGeneratedAudio();
      });
      return;
    }
    playGeneratedAudio();
  } catch (error) {
    window.jumpscareDebug?.reportError({
      context: "playAudio catch",
      message: error.message,
    });
    // Audio is optional; keep visuals even if playback fails.
  }
};

const playGeneratedAudio = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const duration = 0.6;

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(700, now);
    oscillator.frequency.exponentialRampToValueAtTime(1200, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.6, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(now + duration);
    oscillator.onended = () => {
      context.close();
    };
  } catch (error) {
    // Fallback failed
  }
};

const OverlayView = () => {
  const [active, setActive] = useState(false);
  const [currentVisual, setCurrentVisual] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    const handler = (payload) => {
      if (active) {
        return;
      }

      // Pick random assets for this trigger
      const selectedVisual = getRandomAsset(visualList);
      const selectedAudio = getRandomAsset(audioList);

      setAudioEnabled(payload?.audioEnabled ?? true);
      setCurrentVisual(selectedVisual);
      setActive(true);

      if (payload?.audioEnabled) {
        playAudio(selectedAudio);
      }

      const durationMs = payload?.durationMs ?? 2000;
      window.setTimeout(() => {
        setActive(false);
        setCurrentVisual(null);
        window.jumpscare?.complete();
      }, durationMs);
    };

    window.jumpscare?.onTrigger(handler);
  }, [active]);

  if (!currentVisual && !active) return null;

  return (
    <div className={`overlay ${active ? "active" : ""}`}>
      {currentVisual?.type === "image" && (
        <img
          className="overlay-image"
          src={currentVisual.url}
          alt="Jumpscare"
          onError={(e) =>
            window.jumpscareDebug?.reportError({
              context: "OverlayView image load",
              url: currentVisual.url,
            })
          }
        />
      )}
      {currentVisual?.type === "video" && (
        <video
          className="overlay-image"
          src={currentVisual.url}
          autoPlay
          muted={!audioEnabled}
          loop
          playsInline
          onError={(e) =>
            window.jumpscareDebug?.reportError({
              context: "OverlayView video load",
              url: currentVisual.url,
            })
          }
        />
      )}
    </div>
  );
};

const SettingsView = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    let mounted = true;
    window.jumpscareSettings
      ?.get()
      .then((data) => {
        if (mounted && data) {
          setSettings(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setStatus("Unable to load settings");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const chanceLabel = useMemo(() => {
    return `1 in ${settings.chanceDenominator}`;
  }, [settings.chanceDenominator]);

  const updateSettings = (next) => {
    setSettings(next);
    setStatus("Saving...");
    window.jumpscareSettings
      ?.update(next)
      .then((data) => {
        if (data) {
          setSettings(data);
        }
        setStatus("Saved");
      })
      .catch(() => {
        setStatus("Save failed");
      });
  };

  return (
    <div className="settings">
      <header className="settings-header">
        <h1>Scarify Settings</h1>
        <p>Control the jumpscare frequency, duration, and audio.</p>
      </header>

      <section className="settings-section">
        <label className="settings-label" htmlFor="chance">
          Chance per second
        </label>
        <div className="settings-row">
          <input
            id="chance"
            type="number"
            min="1"
            value={settings.chanceDenominator}
            onChange={(event) =>
              updateSettings({
                ...settings,
                chanceDenominator: Number(event.target.value || 1),
              })
            }
          />
          <span className="settings-hint">{chanceLabel}</span>
        </div>
      </section>

      <section className="settings-section">
        <label className="settings-label" htmlFor="duration">
          Duration (ms)
        </label>
        <input
          id="duration"
          type="number"
          min="100"
          value={settings.durationMs}
          onChange={(event) =>
            updateSettings({
              ...settings,
              durationMs: Number(event.target.value || 100),
            })
          }
        />
      </section>

      <section className="settings-section">
        <label className="settings-label" htmlFor="app-enabled">
          App status
        </label>
        <div className="settings-row">
          <label className="psu-switch">
            <input
              id="app-enabled"
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) =>
                updateSettings({
                  ...settings,
                  enabled: event.target.checked,
                })
              }
            />
            <span className="psu-switch-inner">
              <span className="psu-switch-i">I</span>
              <span className="psu-switch-o">O</span>
            </span>
          </label>
          <span className="settings-hint">
            {settings.enabled ? "System Online" : "System Offline"}
          </span>
        </div>
      </section>

      <section className="settings-section">
        <label className="settings-label" htmlFor="audio-enabled">
          Audio effect
        </label>
        <div className="settings-row">
          <label className="psu-switch">
            <input
              id="audio-enabled"
              type="checkbox"
              checked={settings.audioEnabled}
              onChange={(event) =>
                updateSettings({
                  ...settings,
                  audioEnabled: event.target.checked,
                })
              }
            />
            <span className="psu-switch-inner">
              <span className="psu-switch-i">I</span>
              <span className="psu-switch-o">O</span>
            </span>
          </label>
          <span className="settings-hint">
            {settings.audioEnabled ? "Audio Sting Enabled" : "Silent Mode"}
          </span>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-buttons">
          <button className="test-button" onClick={() => window.jumpscare?.test()}>
            Test Jumpscare
          </button>
          <button
            className="debug-button"
            onClick={() => window.jumpscareDebug?.open()}
          >
            Open Debug Menu
          </button>
        </div>
      </section>

      <footer className="settings-footer">{status}</footer>
    </div>
  );
};

const DebugView = () => {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // Initial fetch
    window.jumpscareDebug?.getLogs().then(setLogs);
    window.jumpscareDebug?.getStatus().then(setStatus);

    // Subscribe to updates
    const unsubscribe = window.jumpscareDebug?.onUpdate((newLog) => {
      setLogs((prev) => [newLog, ...prev].slice(0, 500));
      // Refresh status on every log just in case
      window.jumpscareDebug?.getStatus().then(setStatus);
    });

    return () => unsubscribe?.();
  }, []);

  if (!status) return <div className="debug-loading">Loading debug data...</div>;

  return (
    <div className="debug-view">
      <header className="debug-header">
        <h1>Debug Console</h1>
        <div className="debug-status-grid">
          <div className="debug-status-item">
            <span className="label">Enabled:</span>
            <span className={`value ${status.jumpscareEnabled ? "on" : "off"}`}>
              {status.jumpscareEnabled ? "YES" : "NO"}
            </span>
          </div>
          <div className="debug-status-item">
            <span className="label">Active:</span>
            <span className={`value ${status.jumpscareActive ? "on" : "off"}`}>
              {status.jumpscareActive ? "RUNNING" : "IDLE"}
            </span>
          </div>
          <div className="debug-status-item">
            <span className="label">Displays:</span>
            <span className="value">{status.overlayWindowCount}</span>
          </div>
          <div className="debug-status-item">
            <span className="label">Chance:</span>
            <span className="value">1 in {status.settings.chanceDenominator}</span>
          </div>
        </div>
      </header>

      <div className="debug-logs">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i} className={`log-row type-${log.type}`}>
                <td className="time">
                  {new Date(log.timestamp).toLocaleTimeString([], {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td className="type">[{log.type.toUpperCase()}]</td>
                <td className="message">
                  {log.message}
                  {log.data && (
                    <pre className="log-data">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const App = () => {
  const view = getView();
  useEffect(() => {
    document.body.dataset.view = view;
  }, [view]);

  if (view === "overlay") return <OverlayView />;
  if (view === "debug") return <DebugView />;
  return <SettingsView />;
};

export default App;
