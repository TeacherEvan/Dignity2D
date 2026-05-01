import type { GameLaunchData } from "./session";

type LauncherState = {
  roomId: string;
  selectedImageId: string;
  selectedImageUrl?: string;
  selectedFileName?: string;
};

function createShell(): string {
  return `
    <main id="launcher-shell" style="max-width: 420px; margin: 0 auto; padding: 20px 16px 28px; color: #f7edc5; font-family: Georgia, serif;">
      <section style="background: linear-gradient(180deg, rgba(21,17,33,0.96), rgba(12,10,20,0.98)); border: 1px solid rgba(255,215,0,0.28); border-radius: 24px; padding: 24px 18px; box-shadow: 0 24px 80px rgba(0,0,0,0.35);">
        <p style="margin: 0; letter-spacing: 0.12em; font-size: 12px; color: #c8a96e; text-transform: uppercase;">Dignity Arcade</p>
        <h1 style="margin: 10px 0 8px; font-size: 34px; line-height: 1.05; color: #ffd700;">Reveal, restore, and reconnect.</h1>
        <p style="margin: 0 0 18px; color: #e6dec0; line-height: 1.5;">Room creation, joining, and upload happen here before Phaser boots, so the heavy runtime only loads when the game actually starts.</p>

        <div style="display: grid; gap: 12px; margin-bottom: 18px;">
          <button id="quick-play-button" type="button" style="padding: 14px 16px; border-radius: 14px; border: 0; background: #00ffff; color: #0a0812; font-size: 18px; font-weight: 700; cursor: pointer;">Quick Play</button>
          <button id="create-room-button" type="button" style="padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.06); color: white; font-size: 18px; cursor: pointer;">Create Room</button>
        </div>

        <section aria-label="Room controls" style="display: grid; gap: 10px; margin-bottom: 18px;">
          <label for="room-id-input" style="font-size: 14px; color: #c8a96e;">Join an existing room</label>
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px;">
            <input id="room-id-input" type="text" placeholder="room-1" style="padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.16); background: rgba(0,0,0,0.18); color: white;" />
            <button id="join-room-button" type="button" style="padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,215,0,0.32); background: rgba(255,215,0,0.08); color: #ffd700; cursor: pointer;">Join</button>
          </div>
          <p id="current-room-label" style="margin: 0; min-height: 20px; color: #e6dec0; font-size: 14px;">No room created yet.</p>
        </section>

        <section aria-label="Image upload" style="display: grid; gap: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <div>
              <p style="margin: 0; color: #c8a96e; font-size: 14px;">Uploaded image preview</p>
              <p id="upload-filename" style="margin: 4px 0 0; color: #e6dec0; font-size: 13px; min-height: 18px;">Using default hidden image.</p>
            </div>
            <button id="upload-trigger-button" type="button" style="padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(0,255,255,0.35); background: rgba(0,255,255,0.08); color: #00ffff; cursor: pointer;">Upload Image</button>
          </div>
          <img id="upload-preview" alt="Selected upload preview" style="display: none; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 16px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04);" />
          <input id="upload-input" type="file" accept="image/png,image/jpeg,image/webp" style="display: none;" />
        </section>

        <p id="home-status" style="margin: 18px 0 0; min-height: 24px; color: #c8a96e; text-align: center;">Ready</p>
      </section>
    </main>
    <button id="return-to-launcher-button" type="button" style="display: none; position: fixed; top: 16px; right: 16px; z-index: 10; padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255,215,0,0.35); background: rgba(10,8,18,0.88); color: #ffd700; cursor: pointer;">Return to launcher</button>
  `;
}

export function mountLauncher(): void {
  const app = document.createElement("div");
  app.id = "app-shell";
  app.innerHTML = createShell();
  document.body.prepend(app);

  const state: LauncherState = {
    roomId: "",
    selectedImageId: "default-image",
  };

  const status = document.querySelector<HTMLParagraphElement>("#home-status");
  const roomInput = document.querySelector<HTMLInputElement>("#room-id-input");
  const roomLabel = document.querySelector<HTMLParagraphElement>("#current-room-label");
  const uploadInput = document.querySelector<HTMLInputElement>("#upload-input");
  const uploadPreview = document.querySelector<HTMLImageElement>("#upload-preview");
  const uploadFilename = document.querySelector<HTMLParagraphElement>("#upload-filename");
  const returnButton = document.querySelector<HTMLButtonElement>("#return-to-launcher-button");

  const setStatus = (message: string): void => {
    if (status) status.textContent = message;
  };

  const updateRoomLabel = (message?: string): void => {
    if (!roomLabel) return;
    roomLabel.textContent = message ?? (state.roomId ? `Current room: ${state.roomId}` : "No room created yet.");
  };

  const showPreview = (url: string, fileName: string): void => {
    if (!uploadPreview || !uploadFilename) return;
    uploadPreview.src = url;
    uploadPreview.style.display = "block";
    uploadFilename.textContent = fileName;
  };

  const startGame = async (data: GameLaunchData): Promise<void> => {
    setStatus(state.roomId ? `Launching ${state.roomId}...` : "Launching game...");
    const { startGameSession } = await import("./bootstrap");
    await startGameSession({
      imageId: state.selectedImageId,
      imageUrl: state.selectedImageUrl,
      ...data,
    });
    const shell = document.querySelector<HTMLElement>("#launcher-shell");
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
    const shell = document.querySelector<HTMLElement>("#launcher-shell");
    if (shell) {
      shell.style.display = "block";
    }
    returnButton.style.display = "none";
    setStatus("Ready");
  });

  document
    .querySelector<HTMLButtonElement>("#quick-play-button")
    ?.addEventListener("click", () => {
      void startGame({ imageId: state.selectedImageId, imageUrl: state.selectedImageUrl });
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
          showPreview(session.imageUrl, state.selectedFileName ?? session.imageId);
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
        });
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Room creation failed.");
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
        const [{ isAcceptedImageType, validateUploadSize }, { uploadImage }] = await Promise.all([
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
        setStatus(`Upload ready (${uploaded.bytes} bytes, ${uploaded.retention}).`);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Upload failed.");
      } finally {
        uploadInput.value = "";
      }
    })();
  });

  updateRoomLabel();
}