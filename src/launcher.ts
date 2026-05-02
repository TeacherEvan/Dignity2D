import { getStandardLayout } from "./display/DeviceLayout";
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
  const resolvedLayoutId = savedLayout?.layoutId ?? layout.id;

  const shell = document.querySelector<HTMLElement>("#launcher-shell");
  if (shell) {
    shell.dataset.deviceClass = displayProfile.deviceClass;
    shell.dataset.layoutId = resolvedLayoutId;
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

  const setStatus = (message: string): void => {
    if (status) status.textContent = message;
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
    );
    const { startGameSession } = await import("./bootstrap");
    await startGameSession({
      imageId: state.selectedImageId,
      imageUrl: state.selectedImageUrl,
      layoutId: resolvedLayoutId,
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
    setStatus("Ready");
  });

  document
    .querySelector<HTMLButtonElement>("#quick-play-button")
    ?.addEventListener("click", () => {
      void startGame({
        imageId: state.selectedImageId,
        imageUrl: state.selectedImageUrl,
        layoutId: resolvedLayoutId,
      });
    });

  document
    .querySelector<HTMLButtonElement>("#create-room-button")
    ?.addEventListener("click", async () => {
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
        setStatus(
          error instanceof Error ? error.message : "Room creation failed.",
        );
      }
    });

  document
    .querySelector<HTMLButtonElement>("#join-room-button")
    ?.addEventListener("click", async () => {
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
        setStatus(error instanceof Error ? error.message : "Join failed.");
      }
    });

  document
    .querySelector<HTMLButtonElement>("#upload-trigger-button")
    ?.addEventListener("click", () => {
      uploadInput?.click();
    });

  uploadInput?.addEventListener("change", () => {
    const file = uploadInput.files?.[0] ?? null;
    if (!file) return;

    void (async () => {
      setStatus("Validating upload...");
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
        );
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Upload failed.");
      } finally {
        uploadInput.value = "";
      }
    })();
  });

  updateRoomLabel();
}
