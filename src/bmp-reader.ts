import fs from 'fs/promises';
import { BMPHeader } from './models/bmp';
import { Pixel } from './models/pixel';

async function readHeader(file: fs.FileHandle) {
	const { buffer } = await file.read(Buffer.alloc(0x36), 0, 0x36, 0);
	return {
		fileSize: buffer.readUInt32LE(0x2),
		reserved: buffer.readUInt32LE(0x6),
		dataOffset: buffer.readUInt32LE(0xa),
		infoHeaderSize: buffer.readUInt32LE(0xe),
		imageWidth: buffer.readUInt32LE(0x12),
		imageHeight: buffer.readUInt32LE(0x16),
		imagePlanes: buffer.readUInt16LE(0x1a),
		bitsPerPixel: buffer.readUInt16LE(0x1c),
		compression: buffer.readUInt32LE(0x1e),
		imageSize: buffer.readUInt32LE(0x22),
		XpixelsPerM: buffer.readUInt32LE(0x26),
		YpixelsPerM: buffer.readUInt32LE(0x2a),
		colorsUsed: buffer.readUInt32LE(0x2e),
		importantColors: buffer.readUInt32LE(0x32),
	};
}

export class BMPReader {
	static CHUNK_SIZE = 128 * 3;

	get totalNumberOfChunks() {
		return Math.ceil(this.header.imageSize / BMPReader.CHUNK_SIZE);
	}

	get bytesPerPixel() {
		return this.header.bitsPerPixel / 8;
	}

	get bytesPerChunk() {
		return BMPReader.CHUNK_SIZE;
	}

	get pixelsPerChunk() {
		return BMPReader.CHUNK_SIZE / this.bytesPerPixel;
	}

	get widthChunks() {
		return (this.header.imageWidth * this.bytesPerPixel) / BMPReader.CHUNK_SIZE;
	}

	get heightChunks() {
		return (this.header.imageHeight * this.bytesPerPixel) / BMPReader.CHUNK_SIZE;
	}

	private constructor(private file: fs.FileHandle, public header: BMPHeader) {
		if (this.header.bitsPerPixel !== 24) throw new Error('Only 24 bits per pixel is supported');
		if (this.totalNumberOfChunks !== Math.floor(this.totalNumberOfChunks))
			throw new Error('this.totalNumberOfChunks must be whole');
		if (this.pixelsPerChunk !== Math.floor(this.pixelsPerChunk))
			throw new Error('A chunk must have a whole number of pixels');
		if (this.widthChunks !== Math.floor(this.widthChunks))
			throw new Error('this.widthChunks must be whole');
		if (this.heightChunks !== Math.floor(this.heightChunks))
			throw new Error('this.heightChunks must be whole');
	}

	static async from(filePath: string) {
		const file = await fs.open(filePath, 'r');
		const header = await readHeader(file);
		return new BMPReader(file, header);
	}

	async close() {
		await this.file.close();
	}

	async readChunk(chunkX: number, chunkY: number) {
		const buffers: Buffer[] = [];
		if (chunkX >= this.widthChunks)
			throw new Error(`Chunk out of bounds. X is ${chunkX}, where maxX is ${this.widthChunks}`);
		if (chunkY >= this.heightChunks)
			throw new Error(`Chunk out of bounds. Y is ${chunkY}, where maxY is ${this.heightChunks}`);

		let maxY: number;
		if (chunkY < this.heightChunks - 1) maxY = this.pixelsPerChunk + 1;
		else maxY = this.pixelsPerChunk;

		for (let offsetY = -1; offsetY < this.pixelsPerChunk + 1; offsetY++) {
			const boundedOffsetY = Math.max(offsetY, 0);

			const linesOffset = this.header.imageWidth * (boundedOffsetY + chunkY * this.pixelsPerChunk);
			const columnsOffset = Math.max(chunkX * this.pixelsPerChunk - 1, 0);
			const bytesOffset = (linesOffset + columnsOffset) * this.bytesPerPixel;
			const start = bytesOffset + this.header.dataOffset;

			let bytesToAlloc: number;
			if (chunkX < this.widthChunks - 1) bytesToAlloc = this.bytesPerChunk + 2 * this.bytesPerPixel;
			else bytesToAlloc = this.bytesPerChunk + 2 * this.bytesPerPixel;

			const buffer = Buffer.alloc(bytesToAlloc);
			await this.file.read(buffer, 0, buffer.length, start);
			buffers.push(buffer);
		}
		return buffers;
	}

	async readChunkAsPixels(chunkX: number, chunkY: number) {
		const chunkBuffers = await this.readChunk(chunkX, chunkY);
		const pixelsArray: Pixel[][] = [];
		const startX = chunkX * this.pixelsPerChunk;
		const startY = chunkY * this.pixelsPerChunk;
		chunkBuffers.forEach((buffer, offsetY) => {
			const pixelsArrayX: Pixel[] = [];
			pixelsArray.push(pixelsArrayX);
			for (let offsetX = 0; offsetX < buffer.length; offsetX += this.bytesPerPixel) {
				const b = buffer.readUInt8(offsetX + 0);
				const g = buffer.readUInt8(offsetX + 1);
				const r = buffer.readUInt8(offsetX + 2);
				pixelsArrayX.push({
					color: {
						b,
						g,
						r,
					},
					grayscale: (r + g + b) / 3,
					coords: {
						x: startX + offsetX / this.bytesPerPixel,
						y: startY + offsetY,
					},
				});
			}
		});
		return pixelsArray;
	}
}
