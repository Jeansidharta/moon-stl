import { Coords3 } from '../models/coords';

export function crossProduct(p1: Coords3, p2: Coords3) {
	return {
		x: p1.y * p2.z - p1.z * p2.y,
		y: p1.z * p2.x - p1.x * p2.z,
		z: p1.x * p2.y - p1.y * p2.x,
	} as Coords3;
}

export function normalize(p: Coords3) {
	const mag = Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2);

	return {
		x: p.x / mag,
		y: p.y / mag,
		z: p.z / mag,
	};
}
