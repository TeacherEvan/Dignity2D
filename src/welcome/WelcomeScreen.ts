export function createWelcomeScreenHtml(): string {
  return `
    <main id="launcher-shell" data-launcher-surface="welcome">
      <section data-launcher-card="shell">
        <div id="launcher-ember-layer" aria-hidden="true"></div>
        <div data-launcher-frame="outer" aria-hidden="true"></div>
        <div data-launcher-frame="inner" aria-hidden="true"></div>
        <div data-launcher-signal-line aria-hidden="true"></div>
        <div data-launcher-content="body">
          <header data-launcher-copy="intro" data-launcher-zone="hero" data-launcher-reveal="hero">
            <p data-launcher-kicker="brand">Dignity Arcade</p>
            <h1 id="welcome-title">Trace the line. Hold the ground.</h1>
            <p data-launcher-copy-role="summary">Play solo, open a room, join a friend, or bring a private image into the run.</p>
          </header>

          <div data-launcher-divider="hero" data-launcher-reveal="divider" aria-hidden="true">
            <span></span>
          </div>

          <div data-launcher-actions="primary" data-launcher-reveal="primary-actions">
            <button id="quick-play-button" type="button">Quick Play</button>
            <button id="create-room-button" type="button">Create Room</button>
          </div>

          <section data-launcher-band="operations" data-launcher-reveal="operations" aria-label="Room and image controls">
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
                  <p data-launcher-upload-label="title">Veiled image</p>
                  <p id="upload-filename">Default concealed image in use.</p>
                </div>
                <button id="upload-trigger-button" type="button">Upload Image</button>
              </div>
              <img id="upload-preview" alt="Selected upload preview" style="display: none;" />
              <input id="upload-input" type="file" accept="image/png,image/jpeg,image/webp" style="display: none;" />
            </section>
          </section>

          <div data-launcher-actions="secondary" data-launcher-reveal="secondary-actions">
            <button id="settings-button" type="button">Settings</button>
            <button id="accessibility-button" type="button">Accessibility</button>
          </div>

          <section id="settings-panel" data-launcher-panel="settings" data-launcher-reveal="settings-panel" hidden>
            <p data-launcher-panel-title="settings">Control layout</p>
            <label data-launcher-field="label" for="settings-handedness">Primary hand</label>
            <select id="settings-handedness">
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
            <label data-launcher-field="label" for="settings-joystick-scale">Joystick scale</label>
            <input id="settings-joystick-scale" type="range" min="0.8" max="1.5" step="0.05" value="1.00" />
            <p id="settings-joystick-scale-readout">1.00x</p>
          </section>

          <section id="accessibility-panel" data-launcher-panel="accessibility" data-launcher-reveal="accessibility-panel" hidden>
            <p data-launcher-panel-title="accessibility">Accessibility</p>
            <p id="accessibility-motion-mode">Full motion active</p>
            <p id="accessibility-guidance">Motion uses subtle drift and signal cues.</p>
          </section>

          <p id="home-status" data-launcher-status-region="home" data-launcher-reveal="status" role="status" aria-live="polite" aria-atomic="true">Ready</p>
        </div>
      </section>
    </main>
    <button id="return-to-launcher-button" type="button" style="display: none;">Return to launcher</button>
  `;
}
