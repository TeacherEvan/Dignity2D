import "./welcome/WelcomeScreen.css";
import {
  getStandardLayout,
  resolveLayoutWithPreference,
} from "./display/DeviceLayout";
import { readDisplayProfileFromWindow } from "./display/DisplayProfile";
import {
  loadLayoutPreference,
  saveLayoutPreference,
  type Handedness,
} from "./display/LayoutPreferences";
import { createEventTracker } from "./diagnostics/EventTracker";
import type { GameLaunchData } from "./session";
import { createWelcomeScreenHtml } from "./welcome/WelcomeScreen";

type LauncherState = {
  roomId: string;
  playerId?: string;
  roomPlayerIds?: string[];
  stateVersion?: number;
  selectedImageId: string;
  selectedImageUrl?: string;
  selectedFileName?: string;
};

type LauncherDiagnosticsOptions = {
  sink?: (
    events: Array<{
      name: string;
      at: number;
      payload: Record<string, string | number | boolean>;
    }>,
  ) => void;
  now?: () => number;
};

function formatRoomFailureStatus(
  error: unknown,
  action: "join" | "create",
): string {
  if (error instanceof Error) {
    if (error.message.includes("VITE_SERVER_URL")) {
      return "Online rooms need the backend.";
    }
  }

  return action === "join"
    ? "Join failed. Check the room ID."
    : "Room setup failed.";
}

function resolveMotionMode(): "full" | "reduced" {
  if (typeof window.matchMedia !== "function") {
    return "full";
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "reduced"
    : "full";
}

export function mountLauncher(options?: {
  diagnostics?: LauncherDiagnosticsOptions;
}): void {
  let app = document.querySelector<HTMLDivElement>("#app-shell");
  const hadPreRenderedShell = Boolean(app?.querySelector("#launcher-shell"));
  if (!app) {
    app = document.createElement("div");
    app.id = "app-shell";
    document.body.prepend(app);
  }
  if (!app.querySelector("#launcher-shell")) {
    app.innerHTML = createWelcomeScreenHtml();
  }

  const diagnostics = options?.diagnostics
    ? createEventTracker(options.diagnostics)
    : null;

  const state: LauncherState = {
    roomId: "",
    selectedImageId: "default-image",
  };

  const displayProfile = readDisplayProfileFromWindow();
  const layout = getStandardLayout(displayProfile);
  const savedLayout = loadLayoutPreference(displayProfile.deviceClass);
  const resolvedLayout = resolveLayoutWithPreference(
    displayProfile,
    savedLayout,
  );
  const resolvedLayoutId = resolvedLayout.id;
  let activeLayoutPreference = savedLayout ?? {
    layoutId: layout.id,
    joystickScale: 1,
    handedness: "left" as Handedness,
  };

  const shell = document.querySelector<HTMLElement>("#launcher-shell");
  const motionMode = resolveMotionMode();
  const isReducedMotion = motionMode === "reduced";
  if (shell) {
    shell.dataset.deviceClass = displayProfile.deviceClass;
    shell.dataset.layoutId = resolvedLayoutId;
    shell.dataset.motionMode = motionMode;
    shell.dataset.launchPhase = hadPreRenderedShell ? "ready" : "igniting";
    shell.dataset.uploadState = "empty";
  }

  const status = document.querySelector<HTMLParagraphElement>("#home-status");
  const roomInput = document.querySelector<HTMLInputElement>("#room-id-input");
  const roomLabel = document.querySelector<HTMLParagraphElement>(
    "#current-room-label",
  );
  const uploadInput = document.querySelector<HTMLInputElement>("#upload-input");
  const uploadPreview =
    document.querySelector<HTMLImageElement>("#upload-preview");
  const uploadFilename =
    document.querySelector<HTMLParagraphElement>("#upload-filename");
  const uploadTitle = document.querySelector<HTMLParagraphElement>(
    '[data-launcher-upload-label="title"]',
  );
  const returnButton = document.querySelector<HTMLButtonElement>(
    "#return-to-launcher-button",
  );
  const quickPlayButton =
    document.querySelector<HTMLButtonElement>("#quick-play-button");
  const createRoomButton = document.querySelector<HTMLButtonElement>(
    "#create-room-button",
  );
  const joinRoomButton =
    document.querySelector<HTMLButtonElement>("#join-room-button");
  const uploadTriggerButton = document.querySelector<HTMLButtonElement>(
    "#upload-trigger-button",
  );
  const settingsButton =
    document.querySelector<HTMLButtonElement>("#settings-button");
  const accessibilityButton = document.querySelector<HTMLButtonElement>(
    "#accessibility-button",
  );
  const settingsPanel = document.querySelector<HTMLElement>("#settings-panel");
  const accessibilityPanel = document.querySelector<HTMLElement>(
    "#accessibility-panel",
  );
  const settingsHandedness = document.querySelector<HTMLSelectElement>(
    "#settings-handedness",
  );
  const settingsJoystickScale = document.querySelector<HTMLInputElement>(
    "#settings-joystick-scale",
  );
  const settingsJoystickScaleReadout = document.querySelector<HTMLElement>(
    "#settings-joystick-scale-readout",
  );
  const accessibilityMotionMode = document.querySelector<HTMLElement>(
    "#accessibility-motion-mode",
  );
  const accessibilityGuidance = document.querySelector<HTMLElement>(
    "#accessibility-guidance",
  );

  let activeCueTimer = 0;
  let statusToneTimer = 0;

  const trackLauncherEvent = (
    name:
      | "welcome_viewed"
      | "display_detected"
      | "layout_loaded"
      | "layout_saved"
      | "solo_started",
    payload: Record<string, string | number | boolean> = {},
  ): void => {
    diagnostics?.track(name, payload);
    diagnostics?.flush();
  };

  const setActiveCue = (cue: string): void => {
    if (!shell || isReducedMotion) return;

    shell.dataset.activeCue = cue;
    window.clearTimeout(activeCueTimer);
    activeCueTimer = window.setTimeout(() => {
      if (shell.dataset.activeCue === cue) {
        delete shell.dataset.activeCue;
      }
    }, 1200);
  };

  const setStatusTone = (tone: "warm" | "cool"): void => {
    if (!status || isReducedMotion) return;

    status.dataset.emberTone = tone;
    setActiveCue("status");
    window.clearTimeout(statusToneTimer);
    statusToneTimer = window.setTimeout(() => {
      if (status.dataset.emberTone === tone) {
        delete status.dataset.emberTone;
      }
    }, 1400);
  };

  const setStatus = (message: string, tone: "warm" | "cool" = "warm"): void => {
    if (status) status.textContent = message;
    setStatusTone(tone);
  };

  const updateRoomLabel = (message?: string): void => {
    if (!roomLabel) return;
    roomLabel.textContent =
      message ??
      (state.roomId ? `Current room: ${state.roomId}` : "No room created yet.");
  };

  const clearPreview = (): void => {
    if (!uploadPreview) return;
    uploadPreview.removeAttribute("src");
    uploadPreview.style.display = "none";
  };

  const setUploadPresentation = (
    mode: "empty" | "veiled" | "chosen",
    fileName?: string,
    imageUrl?: string,
  ): void => {
    if (uploadTitle) {
      uploadTitle.textContent =
        mode === "chosen" ? "Chosen image" : "Veiled image";
    }

    if (uploadFilename) {
      uploadFilename.textContent =
        fileName ??
        (mode === "chosen"
          ? "Chosen image ready."
          : "Default concealed image in use.");
    }

    if (shell) {
      shell.dataset.uploadState = mode;
    }

    if (mode === "chosen" && imageUrl && uploadPreview) {
      uploadPreview.src = imageUrl;
      uploadPreview.style.display = "block";
      return;
    }

    clearPreview();
  };

  const resetRoomSessionState = (): void => {
    state.roomId = "";
    state.playerId = undefined;
    state.roomPlayerIds = undefined;
    state.stateVersion = undefined;
  };

  const showPreview = (url: string, fileName: string): void => {
    if (!uploadPreview || !uploadFilename) return;
    uploadPreview.src = url;
    uploadPreview.style.display = "block";
    uploadFilename.textContent = fileName;
    if (uploadTitle) {
      uploadTitle.textContent = "Chosen image";
    }
    if (shell) {
      shell.dataset.uploadState = "chosen";
    }
  };

  const startGame = async (data: GameLaunchData): Promise<void> => {
    setStatus(
      state.roomId ? `Launching ${state.roomId}...` : "Launching game...",
      "cool",
    );
    const { startGameSession } = await import("./bootstrap");
    await startGameSession({
      imageId: state.selectedImageId,
      imageUrl: state.selectedImageUrl,
      layoutId: resolvedLayoutId,
      motionMode,
      ...data,
    });
    if (shell) {
      shell.style.display = "none";
    }
    if (returnButton) {
      returnButton.style.display = "block";
    }
  };

  const updateSettingsReadout = (value: number): void => {
    if (settingsJoystickScaleReadout) {
      settingsJoystickScaleReadout.textContent = `${value.toFixed(2)}x`;
    }
  };

  const syncSettingsControls = (): void => {
    if (settingsHandedness) {
      settingsHandedness.value = activeLayoutPreference.handedness;
    }
    if (settingsJoystickScale) {
      settingsJoystickScale.value =
        activeLayoutPreference.joystickScale.toFixed(2);
    }
    updateSettingsReadout(activeLayoutPreference.joystickScale);
  };

  const saveCurrentLayoutPreference = (): void => {
    saveLayoutPreference(displayProfile.deviceClass, {
      layoutId: layout.id,
      joystickScale: activeLayoutPreference.joystickScale,
      handedness: activeLayoutPreference.handedness,
    });
    trackLauncherEvent("layout_saved", { layoutId: layout.id });
    setStatus("Settings saved for this device.", "cool");
  };

  const setPanelVisibility = (
    panel: HTMLElement | null,
    visible: boolean,
  ): void => {
    if (!panel) return;
    panel.hidden = !visible;
    if (shell) {
      if (visible) {
        shell.dataset.openPanel = panel.id;
      } else if (shell.dataset.openPanel === panel.id) {
        delete shell.dataset.openPanel;
      }
    }
  };

  const closePanels = (): void => {
    setPanelVisibility(settingsPanel, false);
    setPanelVisibility(accessibilityPanel, false);
  };

  const renderAccessibilityPanel = (): void => {
    if (accessibilityMotionMode) {
      accessibilityMotionMode.textContent = isReducedMotion
        ? "Reduced motion active"
        : "Full motion active";
    }
    if (accessibilityGuidance) {
      accessibilityGuidance.textContent = isReducedMotion
        ? "Motion is kept steady and signal cues stay readable without animated drift."
        : "Motion uses slow drift and signal cues to reinforce state without crowding the play surface.";
    }
  };

  syncSettingsControls();
  renderAccessibilityPanel();
  setUploadPresentation("empty");

  trackLauncherEvent("welcome_viewed");
  trackLauncherEvent("display_detected", {
    deviceClass: displayProfile.deviceClass,
    orientation: displayProfile.orientation,
    compactHud: displayProfile.compactHud,
  });
  trackLauncherEvent("layout_loaded", { layoutId: resolvedLayoutId });

  if (!hadPreRenderedShell) {
    window.setTimeout(() => {
      if (shell?.dataset.launchPhase === "igniting") {
        shell.dataset.launchPhase = "ready";
      }
    }, 820);
  }

  returnButton?.addEventListener("click", async () => {
    const { stopGameSession } = await import("./bootstrap");
    stopGameSession();
    if (shell) {
      shell.style.display = "block";
    }
    returnButton.style.display = "none";
    closePanels();
    setStatus("Ready", "cool");
  });

  const bindCue = (element: HTMLButtonElement | null, cue: string): void => {
    if (!element || isReducedMotion) return;

    const activateCue = () => {
      setActiveCue(cue);
    };

    element.addEventListener("pointerenter", activateCue);
    element.addEventListener("focus", activateCue);
    element.addEventListener("click", activateCue);
  };

  bindCue(quickPlayButton, "quick-play");
  bindCue(createRoomButton, "create-room");
  bindCue(joinRoomButton, "join-room");
  bindCue(uploadTriggerButton, "upload");

  settingsButton?.addEventListener("click", () => {
    const willOpen = settingsPanel ? settingsPanel.hidden === true : true;
    closePanels();
    syncSettingsControls();
    setPanelVisibility(settingsPanel, willOpen);
  });

  accessibilityButton?.addEventListener("click", () => {
    const willOpen = accessibilityPanel
      ? accessibilityPanel.hidden === true
      : true;
    closePanels();
    renderAccessibilityPanel();
    setPanelVisibility(accessibilityPanel, willOpen);
  });

  settingsHandedness?.addEventListener("change", () => {
    activeLayoutPreference = {
      ...activeLayoutPreference,
      layoutId: layout.id,
      handedness: settingsHandedness.value === "right" ? "right" : "left",
    };
    saveCurrentLayoutPreference();
  });

  settingsJoystickScale?.addEventListener("input", () => {
    const nextScale = Number.parseFloat(settingsJoystickScale.value);
    activeLayoutPreference = {
      ...activeLayoutPreference,
      layoutId: layout.id,
      joystickScale: Number.isFinite(nextScale) ? nextScale : 1,
    };
    updateSettingsReadout(activeLayoutPreference.joystickScale);
    saveCurrentLayoutPreference();
  });

  quickPlayButton?.addEventListener("click", () => {
    resetRoomSessionState();
    trackLauncherEvent("solo_started", { mode: "solo" });
    void startGame({
      imageId: state.selectedImageId,
      imageUrl: state.selectedImageUrl,
      layoutId: resolvedLayoutId,
    });
  });

  createRoomButton?.addEventListener("click", async () => {
    setStatus("Creating room...");
    try {
      const { createRoomSession } = await import("./net/serverApi");
      const session = await createRoomSession(state.selectedImageId);
      state.roomId = session.roomId;
      state.playerId = session.playerId;
      state.roomPlayerIds = session.playerIds;
      state.stateVersion = session.stateVersion;
      state.selectedImageId = session.imageId;
      if (session.imageUrl) {
        setUploadPresentation("chosen", session.imageId, session.imageUrl);
      } else {
        setUploadPresentation("veiled");
      }
      if (roomInput) {
        roomInput.value = session.roomId;
      }
      updateRoomLabel(`Room ready: ${session.roomId}`);
      setStatus(`Room ${session.roomId} ready.`);
      await startGame({
        roomId: session.roomId,
        playerId: session.playerId,
        roomPlayerIds: session.playerIds,
        imageId: session.imageId,
        imageUrl: undefined,
        stateVersion: session.stateVersion,
        layoutId: resolvedLayoutId,
      });
    } catch (error) {
      setStatus(formatRoomFailureStatus(error, "create"));
    }
  });

  joinRoomButton?.addEventListener("click", async () => {
    const roomId = roomInput?.value.trim() ?? "";
    if (!roomId) {
      setStatus("Enter a room ID first.");
      return;
    }

    setStatus(`Joining ${roomId}...`);
    try {
      const session =
        state.roomId === roomId && state.playerId
          ? await (await import("./net/serverApi"))
              .reconnectRoom(roomId, state.playerId)
              .then((reconnected) => ({
                roomId,
                playerId: state.playerId!,
                playerIds: reconnected.playerIds,
                playerCount: reconnected.playerIds.length,
                imageId: reconnected.imageId,
                stateVersion: reconnected.stateVersion,
                imageUrl: null,
                bytes: null,
                retention: null,
              }))
          : await (await import("./net/serverApi")).joinRoomSession(roomId);
      state.roomId = session.roomId;
      state.playerId = session.playerId;
      state.roomPlayerIds = session.playerIds;
      state.stateVersion = session.stateVersion;
      state.selectedImageId = session.imageId;
      state.selectedImageUrl = undefined;
      state.selectedFileName = undefined;
      setUploadPresentation("veiled");
      updateRoomLabel(`Joined room: ${session.roomId}`);
      setStatus(`Joined ${session.roomId}.`);
      await startGame({
        roomId: session.roomId,
        playerId: session.playerId,
        roomPlayerIds: session.playerIds,
        imageId: state.selectedImageId,
        imageUrl: undefined,
        stateVersion: session.stateVersion,
        layoutId: resolvedLayoutId,
      });
    } catch (error) {
      setStatus(formatRoomFailureStatus(error, "join"));
    }
  });

  uploadTriggerButton?.addEventListener("click", () => {
    uploadInput?.click();
  });

  uploadInput?.addEventListener("change", () => {
    const file = uploadInput.files?.[0] ?? null;
    if (!file) return;

    void (async () => {
      setStatus("Validating upload...", "cool");
      try {
        const [{ isAcceptedImageType, validateUploadSize }, { uploadImage }] =
          await Promise.all([
            import("./upload/ImagePicker"),
            import("./net/serverApi"),
          ]);

        if (!isAcceptedImageType(file.type)) {
          setStatus("Upload type is not supported.");
          return;
        }

        const size = validateUploadSize(file.size);
        if (!size.ok) {
          setStatus(size.message);
          return;
        }

        const uploaded = await uploadImage(file, "session");
        state.selectedImageId = uploaded.imageId;
        state.selectedImageUrl = uploaded.imageUrl;
        state.selectedFileName = file.name;
        showPreview(state.selectedImageUrl, file.name);
        setStatus("Upload ready.", "cool");
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Upload failed.",
          "warm",
        );
      } finally {
        uploadInput.value = "";
      }
    })();
  });

  startTraceScope(isReducedMotion);
  updateRoomLabel();
}

type TraceScopeColors = {
  void: string;
  cyan: string;
  gold: string;
  amber: string;
};

function startTraceScope(reduced: boolean): void {
  const canvas = document.querySelector<HTMLCanvasElement>(
    "[data-launcher-scope-canvas]",
  );
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const readVars = (): TraceScopeColors => {
    const shell = document.querySelector<HTMLElement>("#launcher-shell");
    const style = getComputedStyle(shell ?? document.documentElement);
    const value = (name: string, fallback: string): string => {
      const v = style.getPropertyValue(name).trim();
      return v || fallback;
    };
    return {
      void: value("--launcher-void", "#09070f"),
      cyan: value("--launcher-cyan", "#93dddd"),
      gold: value("--launcher-gold", "#e4c26a"),
      amber: value("--launcher-amber", "#d7792b"),
    };
  };

  const resize = (): { w: number; h: number } => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { w, h };
  };

  if (reduced) {
    // Static, fully-resolved capture: a glowing territory + a settled tracer.
    const { w, h } = resize();
    const c = readVars();
    const m = 14;
    ctx.fillStyle = c.void;
    ctx.fillRect(0, 0, w, h);
    const region = [
      { x: m, y: m },
      { x: w * 0.58, y: m },
      { x: w * 0.58, y: h * 0.62 },
      { x: m, y: h * 0.62 },
    ];
    ctx.beginPath();
    region.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = "rgba(147, 221, 221, 0.12)";
    ctx.fill();
    ctx.lineWidth = 3 * (window.devicePixelRatio || 1);
    ctx.strokeStyle = c.cyan;
    ctx.shadowColor = c.cyan;
    ctx.shadowBlur = 12 * (window.devicePixelRatio || 1);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = c.cyan;
    ctx.beginPath();
    ctx.arc(w * 0.58, h * 0.62, 4 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Animated: a tracer traces a closing loop, locks a territory, then a chaser
  // drifts across. Loops on a slow cycle.
  const loopMs = 5200;
  let raf = 0;
  const tick = (t: number): void => {
    const { w, h } = resize();
    const c = readVars();
    const dpr = window.devicePixelRatio || 1;
    const progress = (t % loopMs) / loopMs;
    ctx.fillStyle = c.void;
    ctx.fillRect(0, 0, w, h);

    const m = 14 * dpr;
    const pts = [
      { x: m, y: m },
      { x: w - m, y: m },
      { x: w - m, y: h * 0.66 },
      { x: w * 0.34, y: h * 0.66 },
      { x: w * 0.34, y: h - m },
      { x: m, y: h - m },
    ];
    const segCount = pts.length - 1;
    const drawUpTo = (frac: number): Array<{ x: number; y: number }> => {
      const f = Math.max(0, Math.min(1, frac));
      const scaled = f * segCount;
      const out = pts.slice(0, Math.floor(scaled) + 1);
      const tail = scaled - Math.floor(scaled);
      const a = pts[Math.floor(scaled)]!;
      const b = pts[Math.min(segCount, Math.floor(scaled) + 1)]!;
      out[out.length - 1] = {
        x: a.x + (b.x - a.x) * tail,
        y: a.y + (b.y - a.y) * tail,
      };
      return out;
    };

    const tracePhase = 0.62;
    const holdPhase = 0.82;
    const tracer = drawUpTo(progress / tracePhase);
    const head = tracer[tracer.length - 1]!;

    // Faint dot grid for the "instrument" feel.
    ctx.fillStyle = "rgba(228, 194, 106, 0.08)";
    const step = 16 * dpr;
    for (let x = step; x < w; x += step) {
      for (let y = step; y < h; y += step) {
        ctx.fillRect(x, y, dpr, dpr);
      }
    }

    // Committed territory once the loop closes.
    if (progress > tracePhase) {
      const lock = Math.min(1, (progress - tracePhase) / (holdPhase - tracePhase));
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = "rgba(147, 221, 221, 0.1)";
      ctx.fill();
      ctx.lineWidth = 2.5 * dpr;
      ctx.strokeStyle = c.cyan;
      ctx.shadowColor = c.cyan;
      ctx.shadowBlur = (6 + 10 * lock) * dpr;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Gold tracer line + glowing tip.
    if (tracer.length > 1) {
      ctx.beginPath();
      tracer.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = c.gold;
      ctx.shadowColor = c.gold;
      ctx.shadowBlur = 8 * dpr;
      ctx.stroke();
      ctx.shadowBlur = 0;
      const pulse = 0.5 + 0.5 * Math.sin(t / 160);
      ctx.beginPath();
      ctx.arc(head.x, head.y, (3 + 2 * pulse) * dpr, 0, Math.PI * 2);
      ctx.fillStyle = c.cyan;
      ctx.shadowColor = c.cyan;
      ctx.shadowBlur = 10 * dpr;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // A chaser drifts along the bottom edge.
    const cx = m + ((w - 2 * m) * ((t / 2600) % 1));
    ctx.beginPath();
    ctx.moveTo(cx - 7 * dpr, head ? h - m * 0.4 : h - m);
    ctx.lineTo(cx + 7 * dpr, h - m * 0.4);
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = c.amber;
    ctx.shadowColor = c.amber;
    ctx.shadowBlur = 6 * dpr;
    ctx.stroke();
    ctx.shadowBlur = 0;

    raf = window.requestAnimationFrame(tick);
  };

  raf = window.requestAnimationFrame(tick);
  window.addEventListener(
    "beforeunload",
    () => window.cancelAnimationFrame(raf),
    { once: true },
  );
}
