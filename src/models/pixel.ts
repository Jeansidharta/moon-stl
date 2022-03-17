import { Coords2 } from './coords';

export type Pixel = {
	color: {
		r: number;
		g: number;
		b: number;
	};
	grayscale: number;
	coords: Coords2;
};
