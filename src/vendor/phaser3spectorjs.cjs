class Spector {
  constructor() {
    this.onCapture = {
      add: () => undefined,
    };
  }

  captureCanvas() {}

  captureNextFrame() {}

  getFps() {
    return 0;
  }
}

module.exports = { Spector };