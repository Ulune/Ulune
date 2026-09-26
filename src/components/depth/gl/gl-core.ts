/**
 * A small WebGL layer for the wheel's 3D view: one context, four programs
 * (walls, textured faces, tubes, billboards), buffers and textures. WebGL 1
 * shaders, so it runs on a WebGL 1 or 2 context alike (Safari included).
 *
 * The look is matte: walls, tubes and stems are lit by one soft key light
 * from the viewer's upper left (Lambert, no highlights, no glow); the chart's
 * own faces (plate, zodiac, raised tops) are its pictures, unlit, exactly as
 * the flat chart draws them.
 */

export type GL = WebGLRenderingContext | WebGL2RenderingContext;

const PRECISION = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

/** Prism walls (signs, houses, decans, rings, the chart's edge). */
const WALL_VS = `
attribute vec3 a_pos;
attribute vec3 a_normal;
attribute vec3 a_color;
uniform mat4 u_mvp;
uniform mat3 u_nrm;
uniform vec2 u_z;
varying vec3 v_n;
varying vec3 v_c;
varying float v_h;
void main() {
  gl_Position = u_mvp * vec4(a_pos.xy, mix(u_z.x, u_z.y, a_pos.z), 1.0);
  v_n = u_nrm * a_normal;
  v_c = a_color;
  // Height above the wall's foot (units): a soft band grounds it on the plate.
  v_h = a_pos.z * abs(u_z.y - u_z.x);
}`;
const WALL_FS = `${PRECISION}
uniform vec3 u_light;
uniform vec3 u_tint;
uniform float u_alpha;
uniform float u_lit;
uniform vec2 u_shade;
uniform float u_ground;
varying vec3 v_n;
varying vec3 v_c;
varying float v_h;
void main() {
  float d = max(dot(normalize(v_n), u_light), 0.0);
  // How dark a face turned from the light gets (floor) and how much the light
  // adds (span): per theme, a pale chart keeps pale sides.
  float shade = mix(1.0, u_shade.x + u_shade.y * d, u_lit);
  // Where a wall meets what it stands on, a touch darker (u_ground units tall).
  if (u_ground > 0.0) shade *= 1.0 - 0.1 * u_lit * (1.0 - smoothstep(0.0, u_ground, v_h));
  gl_FragColor = vec4(v_c * u_tint * shade * u_alpha, u_alpha);
}`;

/** Faces that carry the chart's picture (or a flat tint): plate, rings, raised tops. */
const TOP_VS = `
attribute vec3 a_pos;
uniform mat4 u_mvp;
uniform vec2 u_z;
uniform vec4 u_uvmap;
varying vec2 v_uv;
void main() {
  gl_Position = u_mvp * vec4(a_pos.xy, mix(u_z.x, u_z.y, a_pos.z), 1.0);
  v_uv = a_pos.xy * u_uvmap.xy + u_uvmap.zw;
}`;
const TOP_FS = `${PRECISION}
uniform sampler2D u_tex;
uniform float u_useTex;
uniform vec4 u_color;
uniform float u_alpha;
varying vec2 v_uv;
void main() {
  // A slightly sharper mip level: the chart's text stays crisp when tipped.
  vec4 c = u_useTex > 0.5 ? texture2D(u_tex, v_uv, -0.4) : u_color;
  c *= u_alpha;
  if (c.a < 0.004) discard;
  gl_FragColor = c;
}`;

/**
 * A tube swept along a quadratic curve A → C → B, round (a capsule: rounded
 * ends), shaded by its own normals: real volume, not a stroke with a shadow.
 * u_range picks a stretch of the curve (a dash is a short capsule of its own).
 */
const TUBE_VS = `
attribute vec4 a_t;
uniform mat4 u_mvp;
uniform mat3 u_nrm;
uniform vec3 u_a;
uniform vec3 u_b;
uniform vec3 u_c;
uniform vec3 u_bn;
uniform float u_r;
uniform vec2 u_range;
varying vec3 v_n;
void main() {
  float u = mix(u_range.x, u_range.y, a_t.x);
  float w = 1.0 - u;
  vec3 p = w * w * u_a + 2.0 * u * w * u_c + u * u * u_b;
  vec3 tg = 2.0 * w * (u_c - u_a) + 2.0 * u * (u_b - u_c);
  float tl = length(tg);
  vec3 t = tl > 1e-6 ? tg / tl : normalize(u_b - u_a + vec3(1e-6, 0.0, 0.0));
  vec3 n = normalize(cross(u_bn, t));
  float ring = sqrt(max(0.0, 1.0 - a_t.w * a_t.w));
  vec3 dir = ring * (a_t.y * n + a_t.z * u_bn) + a_t.w * t;
  gl_Position = u_mvp * vec4(p + u_r * dir, 1.0);
  v_n = u_nrm * dir;
}`;
const TUBE_FS = `${PRECISION}
uniform vec3 u_color;
uniform float u_alpha;
uniform float u_lit;
uniform vec3 u_light;
uniform vec2 u_shade;
varying vec3 v_n;
void main() {
  vec3 n = normalize(v_n);
  float d = max(dot(n, u_light), 0.0);
  float shade = mix(1.0, u_shade.x + u_shade.y * d, u_lit);
  // Its silhouette a little darker (about 15%): crossing tubes part like the
  // flat chart's cased lines.
  float rim = 1.0 - abs(n.z);
  shade *= 1.0 - 0.15 * u_lit * rim * rim;
  gl_FragColor = vec4(u_color * shade * u_alpha, u_alpha);
}`;

/**
 * A quad from the atlas: facing the viewer (planets, labels, aspect marks) or
 * lying flat on the chart (a soft contact shadow). The focus halo is drawn
 * round a planet's disc, under it.
 */
const QUAD_VS = `
attribute vec2 a_q;
uniform mat4 u_mvp;
uniform vec3 u_centre;
uniform vec3 u_right;
uniform vec3 u_up;
uniform vec3 u_toward;
uniform vec4 u_box;
uniform float u_lift;
uniform vec4 u_uv;
varying vec2 v_uv;
varying vec2 v_q;
void main() {
  vec2 o = u_box.xy + a_q * u_box.zw;
  vec3 pos = u_centre + u_right * o.x + u_up * o.y;
  gl_Position = u_mvp * vec4(pos, 1.0);
  // Depth as if lifted toward the viewer by u_lift (it wins over what meets it
  // there — a stem, a tube's end), drawn where it is.
  vec4 lifted = u_mvp * vec4(pos + u_toward * u_lift, 1.0);
  gl_Position.z = lifted.z / lifted.w * gl_Position.w;
  v_uv = vec2(mix(u_uv.x, u_uv.z, a_q.x * 0.5 + 0.5), mix(u_uv.w, u_uv.y, a_q.y * 0.5 + 0.5));
  v_q = o;
}`;
const QUAD_FS = `${PRECISION}
uniform sampler2D u_tex;
uniform float u_mode;
uniform float u_alpha;
uniform vec4 u_halo;
uniform vec3 u_ring;
uniform vec3 u_shadow;
varying vec2 v_uv;
varying vec2 v_q;
void main() {
  if (u_mode > 0.5) {
    // A soft contact shadow in the theme's shadow colour (premultiplied).
    float a = u_alpha * (1.0 - smoothstep(0.1, 1.0, length(v_q) / u_ring.x));
    if (a < 0.004) discard;
    gl_FragColor = vec4(u_shadow * a, a);
    return;
  }
  vec4 c = texture2D(u_tex, v_uv);
  if (u_halo.a > 0.0) {
    float d = abs(length(v_q) - u_ring.x);
    float h = (1.0 - smoothstep(u_ring.y - u_ring.z, u_ring.y + u_ring.z, d)) * u_halo.a;
    c = c + vec4(u_halo.rgb * h, h) * (1.0 - c.a);
  }
  c *= u_alpha;
  if (c.a < 0.004) discard;
  gl_FragColor = c;
}`;

export type Program = {
  prog: WebGLProgram;
  a: Record<string, number>;
  u: Record<string, WebGLUniformLocation | null>;
};

/** A program to link: its two shaders' sources, and the names to look up once it is. */
export type ProgramSpec = { vs: string; fs: string; attribs: string[]; uniforms: string[] };

/**
 * Link several programs at once: every shader is handed over first, every
 * program linked, and only then is anything asked back (asking right after
 * each compile made the browser finish it there and then, one at a time;
 * this way the driver compiles them together, in parallel where it can).
 */
export function linkAll(gl: GL, specs: ProgramSpec[]): Program[] {
  const made = specs.map((s) => {
    const prog = gl.createProgram();
    const v = gl.createShader(gl.VERTEX_SHADER);
    const f = gl.createShader(gl.FRAGMENT_SHADER);
    if (!prog || !v || !f) throw new Error("program");
    gl.shaderSource(v, s.vs);
    gl.shaderSource(f, s.fs);
    gl.compileShader(v);
    gl.compileShader(f);
    return { s, prog, v, f };
  });
  for (const m of made) {
    gl.attachShader(m.prog, m.v);
    gl.attachShader(m.prog, m.f);
    gl.linkProgram(m.prog);
  }
  return made.map(({ s, prog, v, f }) => {
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) {
      const log = `${gl.getShaderInfoLog(v) ?? ""} ${gl.getShaderInfoLog(f) ?? ""} ${gl.getProgramInfoLog(prog) ?? ""}`;
      throw new Error(`link: ${log}`);
    }
    gl.deleteShader(v);
    gl.deleteShader(f);
    const a: Record<string, number> = {};
    for (const n of s.attribs) a[n] = gl.getAttribLocation(prog, n);
    const u: Record<string, WebGLUniformLocation | null> = {};
    for (const n of s.uniforms) u[n] = gl.getUniformLocation(prog, n);
    return { prog, a, u };
  });
}

export type Programs = { wall: Program; top: Program; tube: Program; quad: Program };

export const PROGRAM_SPECS: Record<keyof Programs, ProgramSpec> = {
  wall: { vs: WALL_VS, fs: WALL_FS, attribs: ["a_pos", "a_normal", "a_color"], uniforms: ["u_mvp", "u_nrm", "u_z", "u_light", "u_tint", "u_alpha", "u_lit", "u_shade", "u_ground"] },
  top: { vs: TOP_VS, fs: TOP_FS, attribs: ["a_pos"], uniforms: ["u_mvp", "u_z", "u_uvmap", "u_tex", "u_useTex", "u_color", "u_alpha"] },
  tube: { vs: TUBE_VS, fs: TUBE_FS, attribs: ["a_t"], uniforms: ["u_mvp", "u_nrm", "u_a", "u_b", "u_c", "u_bn", "u_r", "u_range", "u_color", "u_alpha", "u_lit", "u_light", "u_shade"] },
  quad: {
    vs: QUAD_VS,
    fs: QUAD_FS,
    attribs: ["a_q"],
    uniforms: ["u_mvp", "u_centre", "u_right", "u_up", "u_toward", "u_box", "u_lift", "u_uv", "u_tex", "u_mode", "u_alpha", "u_halo", "u_ring", "u_shadow"],
  },
};

export function makePrograms(gl: GL): Programs {
  const [wall, top, tube, quad] = linkAll(gl, [PROGRAM_SPECS.wall, PROGRAM_SPECS.top, PROGRAM_SPECS.tube, PROGRAM_SPECS.quad]);
  return { wall, top, tube, quad };
}

/** Vertices (`stride` floats each), drawn in order, or through an index list (`ibuf`, `count` indices). */
export type Mesh = { buf: WebGLBuffer; count: number; stride: number; ibuf?: WebGLBuffer | null };

/** Upload a vertex array (`stride` floats per vertex). */
export function makeMesh(gl: GL, data: Float32Array, stride: number, old?: Mesh | null): Mesh | null {
  if (!data.length) {
    dropMesh(gl, old);
    return null;
  }
  const buf = old?.buf ?? gl.createBuffer();
  if (!buf) return null;
  if (old?.ibuf) gl.deleteBuffer(old.ibuf);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return { buf, count: data.length / stride, stride };
}

/** Upload an indexed mesh: its vertices once, and the triangles as indices. */
export function makeIndexedMesh(gl: GL, data: Float32Array, stride: number, indices: Uint16Array): Mesh | null {
  const buf = gl.createBuffer();
  const ibuf = gl.createBuffer();
  if (!buf || !ibuf) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  return { buf, count: indices.length, stride, ibuf };
}

export function dropMesh(gl: GL, m: Mesh | null | undefined) {
  if (!m) return;
  gl.deleteBuffer(m.buf);
  if (m.ibuf) gl.deleteBuffer(m.ibuf);
}

/** Draw a bound mesh's triangles (`bindMesh` first). */
export function drawMesh(gl: GL, mesh: Mesh) {
  if (mesh.ibuf) gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  else gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
}

/** Point the program's attributes at a mesh: [name, size, offset (floats)]… */
export function bindMesh(gl: GL, prog: Program, mesh: Mesh, layout: [string, number, number][]) {
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
  if (mesh.ibuf) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibuf);
  for (const [name, size, offset] of layout) {
    const loc = prog.a[name];
    if (loc == null || loc < 0) continue;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, mesh.stride * 4, offset * 4);
  }
}

/** Turn off the attributes a program enabled (the next one may use fewer). */
export function unbindAttribs(gl: GL, prog: Program) {
  for (const loc of Object.values(prog.a)) if (loc >= 0) gl.disableVertexAttribArray(loc);
}

export type TextureOpts = { mipmaps: boolean; aniso: number };

/** Upload a canvas as a texture (premultiplied, mipmapped when asked). */
export function uploadTexture(gl: GL, source: HTMLCanvasElement, opts: TextureOpts, old?: WebGLTexture | null): WebGLTexture | null {
  const tex = old ?? gl.createTexture();
  if (!tex) return null;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (opts.mipmaps) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  if (opts.aniso > 1) {
    const a = anisotropy(gl);
    if (a) gl.texParameterf(gl.TEXTURE_2D, a.ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(opts.aniso, a.max || 1));
  }
  return tex;
}

type Aniso = { ext: EXT_texture_filter_anisotropic; max: number };
const anisoOf = new WeakMap<GL, Aniso | null>();

/** The anisotropic filtering extension and its limit, looked up once per context. */
function anisotropy(gl: GL): Aniso | null {
  if (anisoOf.has(gl)) return anisoOf.get(gl) ?? null;
  const ext = (gl.getExtension("EXT_texture_filter_anisotropic") ||
    gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic") ||
    gl.getExtension("MOZ_EXT_texture_filter_anisotropic")) as EXT_texture_filter_anisotropic | null;
  const a = ext ? { ext, max: gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number } : null;
  anisoOf.set(gl, a);
  return a;
}

export { createContext, supportsWebGL } from "./support";

let colorCtx: CanvasRenderingContext2D | null = null;

/**
 * A CSS colour (var(), color-mix(), oklch()…) as linear-free sRGB 0..1, read
 * back from a pixel so any colour the page can show works.
 */
export function resolveRGB(host: Element, css: string, fallback: [number, number, number] = [0.55, 0.55, 0.6]): [number, number, number] {
  if (typeof document === "undefined") return fallback;
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style.color = css;
  host.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(c);
  if (m) return [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255];
  if (!colorCtx) {
    const cv = document.createElement("canvas");
    cv.width = 1;
    cv.height = 1;
    colorCtx = cv.getContext("2d", { willReadFrequently: true } as CanvasRenderingContext2DSettings);
  }
  const ctx = colorCtx;
  if (!ctx) return fallback;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#010203";
  ctx.fillStyle = c;
  if (ctx.fillStyle === "#010203") return fallback;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return d[3] ? [d[0] / 255, d[1] / 255, d[2] / 255] : fallback;
}
