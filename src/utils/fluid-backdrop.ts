import { oklchToRgb01 } from "./oklch";

/**
 * A WebGL2 "flowing water" backdrop: domain-warped simplex noise coloured by a
 * palette derived from the site's `--hue`, stirred by a decaying map of recent
 * pointer movement.
 *
 * Rendering happens in two passes per frame:
 *
 *  1. The flowmap pass ping-pongs a small RGBA texture that accumulates pointer
 *     influence (red channel) and pointer direction (green/blue, signed around
 *     0.5), fading a little every frame so trails dissipate.
 *  2. The colour pass builds the fluid from fbm noise, then uses the flowmap to
 *     displace and swirl its sample coordinates — that displacement is what
 *     makes the surface look stirred rather than merely animated.
 *
 * The caller owns the vertical fade and the scroll-driven strength; this module
 * always draws a fully opaque frame and lets CSS composite it.
 */

/** Resolution of the ping-ponged flowmap. Small on purpose: it is only ever read as a smooth field. */
const FLOWMAP_SIZE = 256;

/** Device pixel ratio ceiling. A noise field survives upscaling, so rendering sharper wastes GPU. */
const MAX_DPR = 1.25;

/** Hard ceiling on drawing-buffer pixels, which matters more than DPR on large displays. */
const MAX_PIXELS = 2_400_000;

/** Pointer velocity retained per frame; below 1 so trails settle once the pointer stops. */
const VELOCITY_DECAY = 0.82;

/** Fallback hue if `--hue` cannot be read; matches the theme default. */
const DEFAULT_HUE = 265;

/** Flowmap fade per frame. Higher lingers longer. */
const FLOW_DECAY = 0.962;

const VERTEX_SOURCE = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
	v_uv = a_position * 0.5 + 0.5;
	gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FLOWMAP_SOURCE = `#version 300 es
precision mediump float;

in vec2 v_uv;

uniform sampler2D u_prev;
uniform vec2 u_pointer;
uniform vec2 u_velocity;
uniform float u_brushRadius;
uniform float u_brushStrength;
uniform float u_decay;

out vec4 fragColor;

void main() {
	vec4 prev = texture(u_prev, v_uv);

	// Influence fades toward zero, but direction is encoded signed around 0.5,
	// so it has to fade toward neutral instead.
	prev.r *= u_decay;
	prev.gb = mix(vec2(0.5), prev.gb, u_decay);

	float dist = distance(v_uv, u_pointer);
	float influence = exp(-dist * dist / (u_brushRadius * u_brushRadius * 0.5));
	influence = max(0.0, influence - 0.01);

	// A moving pointer stirs harder than a resting one.
	float speed = length(u_velocity);
	float strength = u_brushStrength * (0.3 + min(speed * 6.0, 1.0));

	prev.r = max(prev.r, influence * strength);

	float blend = influence * min(strength, 0.4) * 0.3;
	prev.g = mix(prev.g, clamp(u_velocity.x * 2.0 + 0.5, 0.0, 1.0), blend);
	prev.b = mix(prev.b, clamp(u_velocity.y * 2.0 + 0.5, 0.0, 1.0), blend);

	fragColor = prev;
}
`;

const COLOR_SOURCE = `#version 300 es
precision mediump float;

in vec2 v_uv;

uniform float u_time;
uniform float u_grainTime;
uniform vec2 u_resolution;
uniform sampler2D u_flowmap;

uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_c4;
uniform vec3 u_c5;
uniform vec3 u_glow1;
uniform vec3 u_glow2;

uniform float u_scale;
uniform vec2 u_offset;
uniform float u_distortBoost;
uniform float u_swirlBoost;
uniform float u_glowIntensity;
uniform vec2 u_lightPos;
uniform float u_lightCore;
uniform float u_lightHalo;
uniform float u_grain;
uniform float u_vignette;

out vec4 fragColor;

/* Simplex noise (Ashima / Gustavson, "webgl-noise"). */
vec3 mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289v4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289v4(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
	const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
	const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

	vec3 i = floor(v + dot(v, C.yyy));
	vec3 x0 = v - i + dot(i, C.xxx);

	vec3 g = step(x0.yzx, x0.xyz);
	vec3 l = 1.0 - g;
	vec3 i1 = min(g.xyz, l.zxy);
	vec3 i2 = max(g.xyz, l.zxy);

	vec3 x1 = x0 - i1 + C.xxx;
	vec3 x2 = x0 - i2 + C.yyy;
	vec3 x3 = x0 - D.yyy;

	i = mod289v3(i);
	vec4 p = permute(permute(permute(
		i.z + vec4(0.0, i1.z, i2.z, 1.0))
		+ i.y + vec4(0.0, i1.y, i2.y, 1.0))
		+ i.x + vec4(0.0, i1.x, i2.x, 1.0));

	float n_ = 0.142857142857;
	vec3 ns = n_ * D.wyz - D.xzx;

	vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

	vec4 x_ = floor(j * ns.z);
	vec4 y_ = floor(j - 7.0 * x_);

	vec4 x = x_ * ns.x + ns.yyyy;
	vec4 y = y_ * ns.x + ns.yyyy;
	vec4 h = 1.0 - abs(x) - abs(y);

	vec4 b0 = vec4(x.xy, y.xy);
	vec4 b1 = vec4(x.zw, y.zw);

	vec4 s0 = floor(b0) * 2.0 + 1.0;
	vec4 s1 = floor(b1) * 2.0 + 1.0;
	vec4 sh = -step(h, vec4(0.0));

	vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
	vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

	vec3 p0 = vec3(a0.xy, h.x);
	vec3 p1 = vec3(a0.zw, h.y);
	vec3 p2 = vec3(a1.xy, h.z);
	vec3 p3 = vec3(a1.zw, h.w);

	vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
	p0 *= norm.x;
	p1 *= norm.y;
	p2 *= norm.z;
	p3 *= norm.w;

	vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
	m = m * m;
	return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float hash(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

/* One octave is deliberate: the warping below supplies the detail more cheaply than stacking octaves. */
const int FBM_OCTAVES = 1;

float fbm(vec3 p) {
	float value = 0.0;
	float amplitude = 0.6;
	vec3 shift = vec3(100.0);
	vec3 q = p;
	for (int i = 0; i < FBM_OCTAVES; i++) {
		value += amplitude * snoise(q);
		q = q * 2.0 + shift;
		amplitude *= 0.4;
	}
	return value;
}

/* Two rounds of domain warping: each offsets the next sample, which is what reads as flow. */
float fluidNoise(vec2 uv, float t) {
	float n1 = fbm(vec3(uv * 0.6, t * 0.06));
	float n2 = fbm(vec3(uv * 0.6 + 5.2, t * 0.06 + 1.3));
	vec2 w1 = vec2(n1, n2) * 0.6;

	float n3 = fbm(vec3((uv + w1) * 0.7 + 1.7, t * 0.05 + 3.1));
	float n4 = fbm(vec3((uv + w1) * 0.7 + 9.2, t * 0.05 + 5.7));
	vec2 w2 = vec2(n3, n4) * 0.5;

	return fbm(vec3((uv + w1 + w2) * 0.5, t * 0.04));
}

/* Curl-like rotation from finite differences of the noise field; keeps motion divergence-free-ish. */
vec2 curlish(vec2 uv, float t) {
	float eps = 0.02;
	float n = snoise(vec3(uv * 0.8, t));
	float nx = snoise(vec3((uv + vec2(eps, 0.0)) * 0.8, t));
	float ny = snoise(vec3((uv + vec2(0.0, eps)) * 0.8, t));
	return vec2(-(ny - n) / eps, (nx - n) / eps) * 0.003;
}

void main() {
	float aspect = u_resolution.x / u_resolution.y;
	vec2 uv = v_uv;
	vec2 base = vec2(uv.x * aspect, uv.y) * u_scale;
	vec2 suv = base + u_offset;
	float t = u_time;

	vec4 flow = texture(u_flowmap, uv);
	float influence = flow.r;
	vec2 flowDir = (flow.gb - 0.5) * 2.0;

	// Push the sample point along the pointer's direction...
	suv += flowDir * influence * u_distortBoost * 0.8;

	// ...then rotate it around the undisplaced point, which gives the swirl.
	float swirlAngle = influence * u_swirlBoost * 2.5;
	float cs = cos(swirlAngle);
	float sn = sin(swirlAngle);
	vec2 delta = suv - base;
	suv += (mat2(cs, sn, -sn, cs) * delta - delta) * influence;

	vec2 uvD = suv + curlish(suv, t * 0.04) * 12.0;
	float f = fluidNoise(uvD, t);
	float swirl = snoise(vec3(uvD * 0.8 + f * 1.5, t * 0.035)) * 0.5 + 0.5;
	float n = f * 0.5 + 0.5;

	vec3 col = mix(u_c1, u_c2, smoothstep(0.2, 0.5, n));
	col = mix(col, u_c3, smoothstep(0.35, 0.65, n + swirl * 0.25));
	col = mix(col, u_c4, smoothstep(0.6, 0.85, swirl) * 0.55);
	col = mix(col, u_c5, smoothstep(0.5, 0.8, n * swirl) * 0.35);

	// Warm/cool glow that follows the pointer trail.
	float glowNoise = snoise(vec3(uvD * 1.5, t * 0.08)) * 0.5 + 0.5;
	col += mix(u_glow1, u_glow2, glowNoise) * smoothstep(0.0, 0.8, influence) * u_glowIntensity;

	// A fixed light with a tight core and a broad halo, so the band has a focus.
	vec2 lightDelta = (uv - u_lightPos) * vec2(aspect, 1.0);
	float lightDist = length(lightDelta);
	col += u_c4 * exp(-lightDist * lightDist / max(u_lightCore, 1e-4)) * 0.30;
	col += u_c3 * exp(-lightDist / max(u_lightHalo, 1e-4)) * 0.12;

	col += (hash(gl_FragCoord.xy + u_grainTime) - 0.5) * u_grain;

	float vig = 1.0 - smoothstep(0.35, 0.75, length(uv - 0.5));
	col = mix(col * (1.0 - u_vignette), col, vig);

	fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export type FluidBackdropHandle = {
	destroy: () => void;
};

type Palette = {
	c1: [number, number, number];
	c2: [number, number, number];
	c3: [number, number, number];
	c4: [number, number, number];
	c5: [number, number, number];
	glow1: [number, number, number];
	glow2: [number, number, number];
};

/**
 * Build the five-stop fluid palette plus its two glow colours from the site hue.
 *
 * The cool stops sit on the theme hue itself; the highlight uses its complement,
 * which lands on a warm sand for the blues and violets the theme ships with.
 */
function buildPalette(hue: number, dark: boolean): Palette {
	const warm = (hue + 180) % 360;
	if (dark) {
		return {
			c1: oklchToRgb01(0.13, 0.02, hue),
			c2: oklchToRgb01(0.26, 0.08, hue),
			c3: oklchToRgb01(0.38, 0.11, hue),
			c4: oklchToRgb01(0.86, 0.07, warm),
			c5: oklchToRgb01(0.11, 0.02, hue),
			glow1: oklchToRgb01(0.62, 0.14, hue),
			glow2: oklchToRgb01(0.8, 0.1, warm),
		};
	}
	return {
		c1: oklchToRgb01(0.97, 0.008, hue),
		c2: oklchToRgb01(0.92, 0.035, hue),
		c3: oklchToRgb01(0.86, 0.065, hue),
		c4: oklchToRgb01(0.93, 0.05, warm),
		c5: oklchToRgb01(0.98, 0.006, hue),
		glow1: oklchToRgb01(0.8, 0.09, hue),
		glow2: oklchToRgb01(0.9, 0.06, warm),
	};
}

function compileShader(
	gl: WebGL2RenderingContext,
	type: number,
	source: string,
): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error(
			"[fluid-backdrop] shader compile failed:",
			gl.getShaderInfoLog(shader),
		);
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function createProgram(
	gl: WebGL2RenderingContext,
	fragmentSource: string,
): WebGLProgram | null {
	const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
	const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
	if (!vertex || !fragment) {
		if (vertex) gl.deleteShader(vertex);
		if (fragment) gl.deleteShader(fragment);
		return null;
	}

	const program = gl.createProgram();
	if (!program) return null;
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);

	// The shaders are linked into the program now, so the standalone objects can go.
	gl.deleteShader(vertex);
	gl.deleteShader(fragment);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error(
			"[fluid-backdrop] program link failed:",
			gl.getProgramInfoLog(program),
		);
		gl.deleteProgram(program);
		return null;
	}
	return program;
}

type Target = {
	framebuffer: WebGLFramebuffer;
	texture: WebGLTexture;
};

/** Create a render target pre-cleared to a neutral flowmap value (no influence, no direction). */
function createTarget(gl: WebGL2RenderingContext, size: number): Target | null {
	const texture = gl.createTexture();
	const framebuffer = gl.createFramebuffer();
	if (!texture || !framebuffer) return null;

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA8,
		size,
		size,
		0,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		null,
	);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER,
		gl.COLOR_ATTACHMENT0,
		gl.TEXTURE_2D,
		texture,
		0,
	);

	if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.deleteFramebuffer(framebuffer);
		gl.deleteTexture(texture);
		return null;
	}

	gl.viewport(0, 0, size, size);
	gl.clearColor(0, 0.5, 0.5, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	return { framebuffer, texture };
}

/**
 * Attach the backdrop to a canvas. Returns `null` when WebGL2 is unavailable or
 * setup fails, in which case the caller should leave the page background alone.
 *
 * `intensity` scales how strongly the pointer distorts the fluid and how bright
 * its glow is; 1 is the tuned default.
 */
export function createFluidBackdrop(
	canvas: HTMLCanvasElement,
	intensity = 1,
): FluidBackdropHandle | null {
	const context = canvas.getContext("webgl2", {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
		powerPreference: "low-power",
	});
	if (!context) return null;

	// Rebound with an explicit non-nullable type. The render helpers below are
	// hoisted function declarations, and TypeScript does not carry the null check
	// above into their bodies.
	const gl: WebGL2RenderingContext = context;

	const flowProgram = createProgram(gl, FLOWMAP_SOURCE);
	const colorProgram = createProgram(gl, COLOR_SOURCE);
	if (!flowProgram || !colorProgram) {
		if (flowProgram) gl.deleteProgram(flowProgram);
		if (colorProgram) gl.deleteProgram(colorProgram);
		return null;
	}

	const buffer = gl.createBuffer();
	const targetA = createTarget(gl, FLOWMAP_SIZE);
	const targetB = createTarget(gl, FLOWMAP_SIZE);
	if (!buffer || !targetA || !targetB) {
		gl.deleteProgram(flowProgram);
		gl.deleteProgram(colorProgram);
		return null;
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
		gl.STATIC_DRAW,
	);

	const flowAttrib = gl.getAttribLocation(flowProgram, "a_position");
	const colorAttrib = gl.getAttribLocation(colorProgram, "a_position");

	const flowUniforms = {
		prev: gl.getUniformLocation(flowProgram, "u_prev"),
		pointer: gl.getUniformLocation(flowProgram, "u_pointer"),
		velocity: gl.getUniformLocation(flowProgram, "u_velocity"),
		brushRadius: gl.getUniformLocation(flowProgram, "u_brushRadius"),
		brushStrength: gl.getUniformLocation(flowProgram, "u_brushStrength"),
		decay: gl.getUniformLocation(flowProgram, "u_decay"),
	};

	const colorUniforms = {
		time: gl.getUniformLocation(colorProgram, "u_time"),
		grainTime: gl.getUniformLocation(colorProgram, "u_grainTime"),
		resolution: gl.getUniformLocation(colorProgram, "u_resolution"),
		flowmap: gl.getUniformLocation(colorProgram, "u_flowmap"),
		c1: gl.getUniformLocation(colorProgram, "u_c1"),
		c2: gl.getUniformLocation(colorProgram, "u_c2"),
		c3: gl.getUniformLocation(colorProgram, "u_c3"),
		c4: gl.getUniformLocation(colorProgram, "u_c4"),
		c5: gl.getUniformLocation(colorProgram, "u_c5"),
		glow1: gl.getUniformLocation(colorProgram, "u_glow1"),
		glow2: gl.getUniformLocation(colorProgram, "u_glow2"),
		scale: gl.getUniformLocation(colorProgram, "u_scale"),
		offset: gl.getUniformLocation(colorProgram, "u_offset"),
		distortBoost: gl.getUniformLocation(colorProgram, "u_distortBoost"),
		swirlBoost: gl.getUniformLocation(colorProgram, "u_swirlBoost"),
		glowIntensity: gl.getUniformLocation(colorProgram, "u_glowIntensity"),
		lightPos: gl.getUniformLocation(colorProgram, "u_lightPos"),
		lightCore: gl.getUniformLocation(colorProgram, "u_lightCore"),
		lightHalo: gl.getUniformLocation(colorProgram, "u_lightHalo"),
		grain: gl.getUniformLocation(colorProgram, "u_grain"),
		vignette: gl.getUniformLocation(colorProgram, "u_vignette"),
	};

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)");

	const initialInputs = readPaletteInputs();
	let palette = buildPalette(initialInputs.hue, initialInputs.dark);
	let paletteKey = `${initialInputs.hue}/${initialInputs.dark}`;
	let read = targetA;
	let write = targetB;

	// Park the pointer off-canvas so nothing is stirred until it actually moves.
	let pointerX = -1;
	let pointerY = -1;
	let velocityX = 0;
	let velocityY = 0;
	let lastPointerX = -1;
	let lastPointerY = -1;
	let hasPointer = false;

	let frame = 0;
	let disposed = false;
	const startTime = performance.now();

	/**
	 * Read the hue and light/dark state the theme is currently using.
	 *
	 * `Layout.astro` writes `--banner-height-extend` onto the same element on every
	 * resize, so the observer watching it fires far more often than the palette
	 * actually changes; callers compare against `paletteKey` to skip the rebuild.
	 */
	function readPaletteInputs(): { hue: number; dark: boolean } {
		const root = document.documentElement;
		const raw = getComputedStyle(root).getPropertyValue("--hue").trim();
		const hue = Number.parseFloat(raw);
		return {
			hue: Number.isFinite(hue) ? hue : DEFAULT_HUE,
			dark: root.classList.contains("dark"),
		};
	}

	function resize(): boolean {
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		if (width <= 0 || height <= 0) return false;

		let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
		const pixels = width * height * dpr * dpr;
		if (pixels > MAX_PIXELS) {
			dpr *= Math.sqrt(MAX_PIXELS / pixels);
		}

		const bufferWidth = Math.max(1, Math.round(width * dpr));
		const bufferHeight = Math.max(1, Math.round(height * dpr));
		if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
			canvas.width = bufferWidth;
			canvas.height = bufferHeight;
		}
		return true;
	}

	function bindQuad(attrib: number) {
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.enableVertexAttribArray(attrib);
		gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0);
	}

	function renderFlowmap() {
		gl.useProgram(flowProgram);
		gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
		gl.viewport(0, 0, FLOWMAP_SIZE, FLOWMAP_SIZE);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, read.texture);
		gl.uniform1i(flowUniforms.prev, 0);
		gl.uniform2f(flowUniforms.pointer, pointerX, pointerY);
		gl.uniform2f(flowUniforms.velocity, velocityX, velocityY);
		gl.uniform1f(flowUniforms.brushRadius, 0.14);
		gl.uniform1f(flowUniforms.brushStrength, 1);
		gl.uniform1f(flowUniforms.decay, FLOW_DECAY);

		bindQuad(flowAttrib);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		const previous = read;
		read = write;
		write = previous;
	}

	function renderColor(elapsed: number) {
		gl.useProgram(colorProgram);
		gl.viewport(0, 0, canvas.width, canvas.height);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, read.texture);
		gl.uniform1i(colorUniforms.flowmap, 0);

		gl.uniform1f(colorUniforms.time, elapsed);
		// Keep the grain seed small: gl_FragCoord + a large time loses precision at mediump.
		gl.uniform1f(colorUniforms.grainTime, (elapsed % 1) * 100);
		gl.uniform2f(colorUniforms.resolution, canvas.width, canvas.height);

		gl.uniform3fv(colorUniforms.c1, palette.c1);
		gl.uniform3fv(colorUniforms.c2, palette.c2);
		gl.uniform3fv(colorUniforms.c3, palette.c3);
		gl.uniform3fv(colorUniforms.c4, palette.c4);
		gl.uniform3fv(colorUniforms.c5, palette.c5);
		gl.uniform3fv(colorUniforms.glow1, palette.glow1);
		gl.uniform3fv(colorUniforms.glow2, palette.glow2);

		gl.uniform1f(colorUniforms.scale, 1.6);
		gl.uniform2f(colorUniforms.offset, -12, -6);
		gl.uniform1f(colorUniforms.distortBoost, 0.46 * intensity);
		gl.uniform1f(colorUniforms.swirlBoost, 0.89 * intensity);
		gl.uniform1f(colorUniforms.glowIntensity, 0.14 * intensity);
		gl.uniform2f(colorUniforms.lightPos, 0.32, 0.78);
		gl.uniform1f(colorUniforms.lightCore, 0.18);
		gl.uniform1f(colorUniforms.lightHalo, 0.4);
		gl.uniform1f(colorUniforms.grain, 0.012);
		gl.uniform1f(colorUniforms.vignette, 0.2);

		bindQuad(colorAttrib);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	function draw() {
		if (!resize()) return;
		const elapsed = (performance.now() - startTime) / 1000;

		// Without a pointer there is nothing to accumulate, so skip the pass entirely.
		if (!coarsePointer.matches && hasPointer) {
			renderFlowmap();
		}
		renderColor(elapsed);

		velocityX *= VELOCITY_DECAY;
		velocityY *= VELOCITY_DECAY;
	}

	function loop() {
		if (disposed) return;
		draw();
		frame = requestAnimationFrame(loop);
	}

	function start() {
		if (disposed || frame !== 0) return;
		if (reducedMotion.matches) {
			// Honour the preference with a single still frame rather than nothing at
			// all: the texture stays, the motion does not.
			draw();
			return;
		}
		frame = requestAnimationFrame(loop);
	}

	function stop() {
		if (frame !== 0) {
			cancelAnimationFrame(frame);
			frame = 0;
		}
	}

	function onPointerMove(event: PointerEvent) {
		const rect = canvas.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return;
		const x = (event.clientX - rect.left) / rect.width;
		// Flip Y: the canvas origin is bottom-left, the viewport's is top-left.
		const y = 1 - (event.clientY - rect.top) / rect.height;

		if (hasPointer) {
			velocityX += x - lastPointerX;
			velocityY += y - lastPointerY;
		}
		pointerX = x;
		pointerY = y;
		lastPointerX = x;
		lastPointerY = y;
		hasPointer = true;
	}

	function onVisibilityChange() {
		if (document.hidden) {
			stop();
		} else {
			start();
		}
	}

	function onThemeChange() {
		const inputs = readPaletteInputs();
		const key = `${inputs.hue}/${inputs.dark}`;
		if (key === paletteKey) return;
		paletteKey = key;
		palette = buildPalette(inputs.hue, inputs.dark);
		// A still frame will not repaint itself, so force one.
		if (reducedMotion.matches) draw();
	}

	function onMotionPreferenceChange() {
		stop();
		start();
	}

	const themeObserver = new MutationObserver(onThemeChange);
	themeObserver.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class", "style"],
	});

	const resizeObserver = new ResizeObserver(() => {
		if (reducedMotion.matches) draw();
	});
	resizeObserver.observe(canvas);

	window.addEventListener("pointermove", onPointerMove, { passive: true });
	document.addEventListener("visibilitychange", onVisibilityChange);
	reducedMotion.addEventListener("change", onMotionPreferenceChange);

	start();

	return {
		destroy() {
			disposed = true;
			stop();
			themeObserver.disconnect();
			resizeObserver.disconnect();
			window.removeEventListener("pointermove", onPointerMove);
			document.removeEventListener("visibilitychange", onVisibilityChange);
			reducedMotion.removeEventListener("change", onMotionPreferenceChange);

			gl.deleteFramebuffer(targetA.framebuffer);
			gl.deleteFramebuffer(targetB.framebuffer);
			gl.deleteTexture(targetA.texture);
			gl.deleteTexture(targetB.texture);
			gl.deleteBuffer(buffer);
			gl.deleteProgram(flowProgram);
			gl.deleteProgram(colorProgram);
			gl.getExtension("WEBGL_lose_context")?.loseContext();
		},
	};
}
