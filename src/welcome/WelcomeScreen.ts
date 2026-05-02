export function createWelcomeScreenHtml(): string {
  return `
    <main id="launcher-shell" style="max-width: 420px; margin: 0 auto; padding: 20px 16px 28px; color: #f7edc5; font-family: Georgia, serif;">
      <section style="background: linear-gradient(180deg, rgba(21,17,33,0.96), rgba(12,10,20,0.98)); border: 1px solid rgba(255,215,0,0.28); border-radius: 16px; padding: 24px 18px; box-shadow: 0 24px 80px rgba(0,0,0,0.35);">
        <p style="margin: 0; letter-spacing: 0.12em; font-size: 12px; color: #c8a96e; text-transform: uppercase;">Dignity Arcade</p>
        <h1 id="welcome-title" style="margin: 10px 0 8px; font-size: 34px; line-height: 1.05; color: #ffd700;">Reveal, restore, and reconnect.</h1>
        <p style="margin: 0 0 18px; color: #e6dec0; line-height: 1.5;">Choose solo, create a room, join a friend, or upload a private image.</p>

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

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px;">
          <button id="settings-button" type="button">Settings</button>
          <button id="accessibility-button" type="button">Accessibility</button>
        </div>

        <p id="home-status" style="margin: 18px 0 0; min-height: 24px; color: #c8a96e; text-align: center;">Ready</p>
      </section>
    </main>
    <button id="return-to-launcher-button" type="button" style="display: none; position: fixed; top: 16px; right: 16px; z-index: 10; padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255,215,0,0.35); background: rgba(10,8,18,0.88); color: #ffd700; cursor: pointer;">Return to launcher</button>
  `;
}
