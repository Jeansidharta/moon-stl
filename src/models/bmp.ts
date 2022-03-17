export type BMPHeader = {
	fileSize: number;
	reserved: number;
	dataOffset: number;
	infoHeaderSize: number;
	imageWidth: number;
	imageHeight: number;
	imagePlanes: number;
	bitsPerPixel: number;
	compression: number;
	imageSize: number;
	XpixelsPerM: number;
	YpixelsPerM: number;
	colorsUsed: number;
	importantColors: number;
};
