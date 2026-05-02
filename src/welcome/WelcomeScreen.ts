export function createWelcomeScreenHtml(): string {
  return `
    <main id="launcher-shell" data-launcher-surface="welcome">
      <section data-launcher-card="shell">
        <div id="launcher-ember-layer" aria-hidden="true"></div>
        <div data-launcher-content="body">
          <header data-launcher-copy="intro">
            <p data-launcher-kicker="brand">Dignity Arcade</p>
            <h1 id="welcome-title">Reveal, restore, and reconnect.</h1>
            <p data-launcher-copy-role="summary">Choose solo, create a room, join a friend, or upload a private image.</p>
          </header>

          <div data-launcher-actions="primary">
            <button id="quick-play-button" type="button">Quick Play</button>
            <button id="create-room-button" type="button">Create Room</button>
          </div>

          <section aria-label="Room controls" data-launcher-section="room">
            <label for="room-id-input">Join an existing room</label>
            <div data-launcher-room-controls="row">
              <input id="room-id-input" type="text" placeholder="room-1" />
              <button id="join-room-button" type="button">Join</button>
            </div>
            <p id="current-room-label">No room created yet.</p>
          </section>

          <section aria-label="Image upload" data-launcher-section="upload">
            <div data-launcher-upload-head="row">
              <div>
                <p data-launcher-upload-label="title">Uploaded image preview</p>
                <p id="upload-filename">Using default hidden image.</p>
              </div>
              <button id="upload-trigger-button" type="button">Upload Image</button>
            </div>
            <img id="upload-preview" alt="Selected upload preview" style="display: none;" />
            <input id="upload-input" type="file" accept="image/png,image/jpeg,image/webp" style="display: none;" />
          </section>

          <div data-launcher-actions="secondary">
            <button id="settings-button" type="button">Settings</button>
            <button id="accessibility-button" type="button">Accessibility</button>
          </div>

          <p id="home-status" data-launcher-status-region="home" role="status" aria-live="polite" aria-atomic="true">Ready</p>
        </div>
      </section>
    </main>
    <button id="return-to-launcher-button" type="button" style="display: none;">Return to launcher</button>
  `;
}
