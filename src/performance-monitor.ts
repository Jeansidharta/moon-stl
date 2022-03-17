export class PerformanceMonitor {
	static MARKS_COUNT = 10;

	private startDate: number = 0;
	private lastRecordings: number[] = [];

	constructor() {}

	startRecordingChunk() {
		this.startDate = Date.now();
	}

	endRecordingChunk() {
		const record = Date.now() - this.startDate;
		this.startDate = 0;
		this.lastRecordings.push(record);
		if (this.lastRecordings.length > PerformanceMonitor.MARKS_COUNT) {
			this.lastRecordings.shift();
		}
	}

	/**
	 * Estimative is measured in milisseconds
	 */
	estimateChunkProcessingTime() {
		return (
			this.lastRecordings.reduce((count, record) => count + record, 0) / this.lastRecordings.length
		);
	}
}
