/**
 * Convert an OKLCH color into gamma-encoded sRGB components in the 0..1 range.
 *
 * The fluid backdrop mixes its palette inside a fragment shader. Feeding it
 * gamma-encoded sRGB (the same numbers a `#rrggbb` literal would produce after
 * dividing by 255) keeps the blend looking like the equivalent CSS gradient
 * rather than the noticeably different result of mixing in linear light.
 *
 * Colors outside the sRGB gamut are clamped per channel, so extreme chroma
 * values degrade into the nearest representable color instead of producing NaN.
 */
export function oklchToRgb01(
	lightness: number,
	chroma: number,
	hueDeg: number,
): [number, number, number] {
	const hue = (hueDeg * Math.PI) / 180;
	const a = chroma * Math.cos(hue);
	const b = chroma * Math.sin(hue);

	// OKLab -> LMS cone responses (cube roots), then undo the cube root.
	const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
	const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
	const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b;

	const l = lRoot * lRoot * lRoot;
	const m = mRoot * mRoot * mRoot;
	const s = sRoot * sRoot * sRoot;

	return [
		encodeSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		encodeSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		encodeSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
	];
}

/** Clamp a linear-light channel into gamut and apply the sRGB transfer curve. */
function encodeSrgb(linear: number): number {
	const x = Math.min(1, Math.max(0, linear));
	if (x <= 0.0031308) {
		return x * 12.92;
	}
	return 1.055 * x ** (1 / 2.4) - 0.055;
}
