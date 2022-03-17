import fs from 'fs/promises';
import { Triangle } from './models/triangle';

const HEADER_SIZE = 80;
export class STLWriter {
	private numberOfTrianglesWriten = 0;

	private constructor(public file: fs.FileHandle) {}

	static async create(fileName: string) {
		const file = await fs.open(fileName, 'w');
		const stlWriter = new STLWriter(file);

		await stlWriter.writeHeader();

		return stlWriter;
	}

	private async writeHeader() {
		const buffer = Buffer.alloc(HEADER_SIZE + 4, 0);
		return await this.file.write(buffer);
	}

	async writeTriangle(triangle: Triangle) {
		const buffer = Buffer.alloc(50);
		buffer.writeFloatLE(triangle.normal.x, 0x0);
		buffer.writeFloatLE(triangle.normal.y, 0x04);
		buffer.writeFloatLE(triangle.normal.z, 0x08);
		buffer.writeFloatLE(triangle.p1.x, 0x0c);
		buffer.writeFloatLE(triangle.p1.y, 0x10);
		buffer.writeFloatLE(triangle.p1.z, 0x14);
		buffer.writeFloatLE(triangle.p2.x, 0x18);
		buffer.writeFloatLE(triangle.p2.y, 0x1c);
		buffer.writeFloatLE(triangle.p2.z, 0x20);
		buffer.writeFloatLE(triangle.p3.x, 0x24);
		buffer.writeFloatLE(triangle.p3.y, 0x28);
		buffer.writeFloatLE(triangle.p3.z, 0x2c);
		buffer.writeUInt16LE(0, 0x30);
		await this.file.write(buffer, 0, undefined, this.numberOfTrianglesWriten * 0x32 + HEADER_SIZE);
		this.numberOfTrianglesWriten++;
	}

	async close() {
		const buffer = Buffer.alloc(4);
		buffer.writeUInt32LE(this.numberOfTrianglesWriten);
		await this.file.write(buffer, 0, undefined, HEADER_SIZE);
		await this.file.close();
	}
}
