import { BMPReader } from './bmp-reader';
import { crossProduct, normalize } from './libs/vector';
import { Coords2 } from './models/coords';
import { Pixel } from './models/pixel';
import { Triangle } from './models/triangle';
import { PerformanceMonitor } from './performance-monitor';
import { STLWriter } from './stl-writer';

type LatLngAlt = {
	lat: number;
	lng: number;
	alt: number;
};

const bmpFileName = 'sldem2015_512_00n_30n_000_045.bmp';
const stlFileName = 'stl.stl';

const bmpFilePath = bmpFileName;
const stlFilePath = stlFileName;

const MIN_MOON_ALTITUDE = -9830.677734375; // Meters
const MAX_MOON_ALTITUDE = 6965.677734375; // Meters
const MOON_RADIUS = 1_737_100; // Meters

const degreesPerPixel = 1 / 512;

const MIN_LAT = 0;
const MAX_LAT = 30;
const MIN_LNG = 0;
const MAX_LNG = 45;

const WHOLE_MODEL_OFFSET = 0;

function getLatLngAltFromPixel({ coords: { x, y }, grayscale }: Pixel) {
	const lat = MAX_LAT - y * degreesPerPixel + MIN_LAT;
	const lng = MAX_LNG - x * degreesPerPixel + MIN_LNG;
	const alt = grayscale * (MAX_MOON_ALTITUDE - MIN_MOON_ALTITUDE) + MIN_MOON_ALTITUDE;
	return { lat, lng, alt };
}

function getCoordsFromLatLngAlt({ alt, lat, lng }: LatLngAlt) {
	const radLat = (Math.PI * lat) / 180;
	const radLng = (Math.PI * lng) / 180;
	const distanceFromCenter = MOON_RADIUS + alt;
	const x = distanceFromCenter * Math.cos(radLat) * Math.cos(radLng) + WHOLE_MODEL_OFFSET;
	const y = distanceFromCenter * Math.cos(radLat) * Math.sin(radLng) + WHOLE_MODEL_OFFSET;
	const z = distanceFromCenter * Math.sin(radLat) + WHOLE_MODEL_OFFSET;
	return { x, y, z };
}

function getCoordsFromPixel(pixel: Pixel) {
	return getCoordsFromLatLngAlt(getLatLngAltFromPixel(pixel));
}

function makeTriangleFromPixels(pixel1: Pixel, pixel2: Pixel, pixel3: Pixel) {
	const p1 = getCoordsFromPixel(pixel1);
	const p2 = getCoordsFromPixel(pixel2);
	const p3 = getCoordsFromPixel(pixel3);
	const normal = normalize(crossProduct(p1, p2));
	return {
		normal,
		p1,
		p2,
		p3,
	} as Triangle;
}

async function processChunk(reader: BMPReader, writer: STLWriter, chunkCoords: Coords2) {
	const pixelsArray = await reader.readChunkAsPixels(chunkCoords.x, chunkCoords.y);
	const triangles: Triangle[] = [];
	pixelsArray.forEach((pixelRow, y) => {
		if (y === pixelsArray.length - 1) return;
		pixelRow.forEach((_pixel, x) => {
			if (x === pixelRow.length - 1) return;
			const topLeft = pixelsArray[y]![x]!;
			const topRight = pixelsArray[y]![x + 1]!;
			const bottomLeft = pixelsArray[y + 1]![x]!;
			const bottomRight = pixelsArray[y + 1]![x + 1]!;

			triangles.push(makeTriangleFromPixels(topRight, topLeft, bottomLeft));
			triangles.push(makeTriangleFromPixels(topRight, bottomLeft, bottomRight));
		});
	});

	for (let i = 0; i < triangles.length; i++) {
		await writer.writeTriangle(triangles[i]!);
	}
}

async function main() {
	const reader = await BMPReader.from(bmpFilePath);
	const writer = await STLWriter.create(stlFilePath);
	const monitor = new PerformanceMonitor();

	console.log(
		`This image is ${reader.header.imageWidth}x${reader.header.imageHeight} pixels, totalizing ${
			reader.header.imageWidth * reader.header.imageHeight * reader.bytesPerPixel
		} Bytes`,
	);
	console.log(
		`The configured chunk size is ${BMPReader.CHUNK_SIZE} bytes, making a total of ${reader.widthChunks}x${reader.heightChunks} chunks`,
	);

	const initialChunkX = 0;
	const initialChunkY = 0;
	const maxChunkXIndex = 10;
	const maxChunkYIndex = 1;
	// const maxChunkYIndex = reader.heightChunks;
	// const maxChunkXIndex = reader.widthChunks;
	for (let y = initialChunkY; y < maxChunkYIndex; y++) {
		for (let x = initialChunkX; x < maxChunkXIndex; x++) {
			const message: string[] = [`Processing chunk x: ${x}, y: ${y}`];
			const missingChunks = (maxChunkYIndex - y - 1) * maxChunkXIndex + (maxChunkXIndex - x);
			if (missingChunks < maxChunkXIndex * maxChunkYIndex) {
				message.push(
					`, This will take approximately ${Math.round(
						(monitor.estimateChunkProcessingTime() * missingChunks) / 1000,
					)} seconds`,
				);
			}
			console.log(message.join(''));
			monitor.startRecordingChunk();
			await processChunk(reader, writer, { x, y });
			monitor.endRecordingChunk();
		}
	}

	await reader.close();
	await writer.close();
}

main();
