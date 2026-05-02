import "./welcome/WelcomeScreen.css";
import {
  getStandardLayout,
  resolveLayoutWithPreference,
} from "./display/DeviceLayout";
import { readDisplayProfileFromWindow } from "./display/DisplayProfile";
import { loadLayoutPreference } from "./display/LayoutPreferences";
import type { GameLaunchData } from "./session";
import { createWelcomeScreenHtml } from "./welcome/WelcomeScreen";

type LauncherState = {
  roomId: string;
  selectedImageId: string;
  selectedImageUrl?: string;
  selectedFileName?: string;
};

function formatRoomFailureStatus(error: unknown, action: "join" | "create"): string {
  if (error instanceof Error) {
    if (error.message.includes("VITE_SERVER_URL")) {
      return "Online rooms need the backend.";
    }
    if (action === "join" && error.message.toLowerCase().includes("full")) {
      return "Join failed. Room is full.";
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

export function mountLauncher(): void {
  const app = document.createElement("div");
  app.id = "app-shell";
  app.innerHTML = createWelcomeScreenHtml();
  document.body.prepend(app);

  const state: LauncherState = {
    roomId: "",
    selectedImageId: "default-image",
  };

  const displayProfile = readDisplayProfileFromWindow();
  const layout = getStandardLayout(displayProfile);
  const savedLayout = loadLayoutPreference(displayProfile.deviceClass);
  const resolvedLayout = resolveLayoutWithPreference(displayProfile, savedLayout);
  const resolvedLayoutId = resolvedLayout.id;

  const shell = document.querySelector<HTMLElement>("#launcher-shell");
  const motionMode = resolveMotionMode();
  const isReducedMotion = motionMode === "reduced";
  if (shell) {
    shell.dataset.deviceClass = displayProfile.deviceClass;
    shell.dataset.layoutId = resolvedLayoutId;
    shell.dataset.motionMode = motionMode;
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
  const returnButton = document.querySelector<HTMLButtonElement>(
    "#return-to-launcher-button",
  );
  const quickPlayButton = document.querySelector<HTMLButtonElement>(
    "#quick-play-button",
  );
  const createRoomButton = document.querySelector<HTMLButtonElement>(
    "#create-room-button",
  );
  const joinRoomButton = document.querySelector<HTMLButtonElement>(
    "#join-room-button",
  );
  const uploadTriggerButton = document.querySelector<HTMLButtonElement>(
    "#upload-trigger-button",
  );

  let activeCueTimer = 0;
  let statusToneTimer = 0;

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

  const showPreview = (url: string, fileName: string): void => {
    if (!uploadPreview || !uploadFilename) return;
    uploadPreview.src = url;
    uploadPreview.style.display = "block";
    uploadFilename.textContent = fileName;
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

  returnButton?.addEventListener("click", async () => {
    const { stopGameSession } = await import("./bootstrap");
    stopGameSession();
    if (shell) {
      shell.style.display = "block";
    }
    returnButton.style.display = "none";
    setStatus("Ready", "cool");
  });

  const bindCue = (
    element: HTMLButtonElement | null,
    cue: string,
  ): void => {
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

  quickPlayButton?.addEventListener("click", () => {
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
        state.selectedImageId = session.imageId;
        if (session.imageUrl) {
          state.selectedImageUrl = session.imageUrl;
          showPreview(
            session.imageUrl,
            state.selectedFileName ?? session.imageId,
          );
        }
        if (roomInput) {
          roomInput.value = session.roomId;
        }
        updateRoomLabel(`Room ready: ${session.roomId}`);
        setStatus(`Room ${session.roomId} ready.`);
        await startGame({
          roomId: session.roomId,
          playerId: session.playerId,
          imageId: session.imageId,
          imageUrl: state.selectedImageUrl,
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
        const { joinRoomSession } = await import("./net/serverApi");
        const session = await joinRoomSession(roomId);
        state.roomId = session.roomId;
        state.selectedImageId = session.imageId;
        if (session.imageUrl) {
          state.selectedImageUrl = session.imageUrl;
          showPreview(session.imageUrl, session.imageId);
        }
        updateRoomLabel(`Joined room: ${session.roomId}`);
        setStatus(`Joined ${session.roomId}.`);
        await startGame({
          roomId: session.roomId,
          playerId: session.playerId,
          imageId: state.selectedImageId,
          imageUrl: state.selectedImageUrl,
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
        setStatus(
          `Upload ready (${uploaded.bytes} bytes, ${uploaded.retention}).`,
          "cool",
        );
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

  updateRoomLabel();
}
