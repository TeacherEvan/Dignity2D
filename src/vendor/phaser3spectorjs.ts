export class Spector {
	readonly onCapture = {
		add: () => undefined,
	};

	captureCanvas(): void {}

	captureNextFrame(): void {}

	getFps(): number {
		return 0;
	}
}

export default { Spector };