import Phaser from "phaser";

export class HomeScene extends Phaser.Scene {
  private loadingGameScene = false;
  private statusElement?: HTMLParagraphElement;
  private fileInput?: HTMLInputElement;
  private selectedImageId = "default-image";
  private selectedImageUrl?: string;

  constructor() {
    super("HomeScene");
  }

  create(): void {
    const centerX = this.scale.width / 2;
    this.ensureDomUi();
    this.add
      .text(centerX, 96, "Dignity Arcade", {
        color: "#FFD700",
        fontSize: "32px",
      })
      .setOrigin(0.5);
    this.add
      .text(centerX, 180, "Quick Play", { color: "#00FFFF", fontSize: "28px" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerup", () => {
        void this.startQuickPlay();
      });
    this.add
      .text(centerX, 244, "Create Room", { color: "#FFFFFF", fontSize: "24px" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerup", () => {
        void this.handleCreateRoom();
      });
    this.add
      .text(centerX, 300, "Upload Image", {
        color: "#FFFFFF",
        fontSize: "24px",
      })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerup", () => {
        this.fileInput?.click();
      });

    this.events.once("shutdown", () => {
      this.statusElement?.remove();
      this.fileInput?.remove();
    });
  }

  private ensureDomUi(): void {
    if (!this.statusElement) {
      this.statusElement = document.createElement("p");
      this.statusElement.id = "home-status";
      this.statusElement.textContent = "Ready";
      this.statusElement.style.color = "#c8a96e";
      this.statusElement.style.fontFamily = "sans-serif";
      this.statusElement.style.margin = "12px auto 0";
      this.statusElement.style.maxWidth = "390px";
      this.statusElement.style.textAlign = "center";
      document.body.appendChild(this.statusElement);
    }

    if (!this.fileInput) {
      this.fileInput = document.createElement("input");
      this.fileInput.id = "upload-input";
      this.fileInput.type = "file";
      this.fileInput.accept = "image/png,image/jpeg,image/webp";
      this.fileInput.style.position = "fixed";
      this.fileInput.style.left = "-9999px";
      this.fileInput.addEventListener("change", () => {
        const file = this.fileInput?.files?.[0] ?? null;
        if (file) {
          void this.handleUpload(file);
        }
      });
      document.body.appendChild(this.fileInput);
    }
  }

  private setStatus(message: string): void {
    if (this.statusElement) {
      this.statusElement.textContent = message;
    }
  }

  private async startQuickPlay(): Promise<void> {
    if (this.loadingGameScene) {
      return;
    }

    this.loadingGameScene = true;

    if (this.scene.get("GameScene")) {
      this.scene.start("GameScene", { imageId: this.selectedImageId });
      this.loadingGameScene = false;
      return;
    }

    const { GameScene } = await import("./GameScene");
    this.scene.add("GameScene", GameScene, true, { imageId: this.selectedImageId });
    this.loadingGameScene = false;
  }

  private async handleCreateRoom(): Promise<void> {
    this.setStatus("Creating room...");

    try {
      const { createRoomSession } = await import("../net/serverApi");
      const session = await createRoomSession(this.selectedImageId);
      this.setStatus(`Room ${session.roomId} ready (state ${session.stateVersion})`);
      await this.startGameScene({
        roomId: session.roomId,
        playerId: session.playerId,
        imageId: session.imageId,
        stateVersion: session.stateVersion,
      });
    } catch (error) {
      this.setStatus(
        error instanceof Error ? error.message : "Room creation failed.",
      );
    }
  }

  private async handleUpload(file: File): Promise<void> {
    this.setStatus("Validating upload...");

    try {
      const [{ isAcceptedImageType, validateUploadSize }, { uploadImage }] =
        await Promise.all([
          import("../upload/ImagePicker"),
          import("../net/serverApi"),
        ]);

      if (!isAcceptedImageType(file.type)) {
        this.setStatus("Upload type is not supported.");
        return;
      }

      const size = validateUploadSize(file.size);
      if (!size.ok) {
        this.setStatus(size.message);
        return;
      }

      const uploaded = await uploadImage(file, "session");
      this.selectedImageId = uploaded.imageId;
      this.selectedImageUrl = uploaded.imageUrl;
      this.setStatus(`Upload ready (${uploaded.bytes} bytes, ${uploaded.retention}).`);
    } catch (error) {
      this.setStatus(
        error instanceof Error ? error.message : "Upload failed.",
      );
    } finally {
      if (this.fileInput) {
        this.fileInput.value = "";
      }
    }
  }

  private async startGameScene(data: {
    roomId?: string;
    playerId?: string;
    imageId?: string;
    stateVersion?: number;
  }): Promise<void> {
    if (this.loadingGameScene) {
      return;
    }

    this.loadingGameScene = true;
    try {
      if (this.scene.get("GameScene")) {
        this.scene.start("GameScene", data);
        return;
      }

      const { GameScene } = await import("./GameScene");
      this.scene.add("GameScene", GameScene, true, data);
    } finally {
      this.loadingGameScene = false;
    }
  }
}
