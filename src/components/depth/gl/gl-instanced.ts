/**
 * Instanced drawing for the 3D view (WebGL 2): all the tubes of a frame (the
 * stems, the aspects, each dash of a dashed one) and all its quads (contact
 * shadows, planets, labels, marks) in a few draws, where each used to be a
 * draw of its own with its own uniforms (performance plan 3.3).
 *
 * The shaders are gl-core.ts's tube and quad programs with the per-draw
 * uniforms moved into per-instance attributes (GLSL ES 3.00: `flat` keeps them
 * exact across a triangle), and instances go down in exactly the order the
 * draws did (a run of instances shares a mesh; a new mesh starts a new run),
 * so the picture is the same to the bit.
 */
import { linkAll, type Mesh, type Program, type ProgramSpec } from "./gl-core";

const TUBE_VS = `#version 300 es
in vec4 a_t;
in vec4 i_a;
in vec4 i_b;
in vec3 i_c;
in vec3 i_bn;
in vec3 i_color;
in vec2 i_range;
uniform mat4 u_mvp;
uniform mat3 u_nrm;
out vec3 v_n;
flat out vec3 v_color;
flat out float v_alpha;
void main() {
  float u = mix(i_range.x, i_range.y, a_t.x);
  float w = 1.0 - u;
  vec3 p = w * w * i_a.xyz + 2.0 * u * w * i_c + u * u * i_b.xyz;
  vec3 tg = 2.0 * w * (i_c - i_a.xyz) + 2.0 * u * (i_b.xyz - i_c);
  float tl = length(tg);
  vec3 t = tl > 1e-6 ? tg / tl : normalize(i_b.xyz - i_a.xyz + vec3(1e-6, 0.0, 0.0));
  vec3 n = normalize(cross(i_bn, t));
  float ring = sqrt(max(0.0, 1.0 - a_t.w * a_t.w));
  vec3 dir = ring * (a_t.y * n + a_t.z * i_bn) + a_t.w * t;
  gl_Position = u_mvp * vec4(p + i_a.w * dir, 1.0);
  v_n = u_nrm * dir;
  v_color = i_color;
  v_alpha = i_b.w;
}`;
const TUBE_FS = `#version 300 es
precision highp float;
uniform float u_lit;
uniform vec3 u_light;
uniform vec2 u_shade;
in vec3 v_n;
flat in vec3 v_color;
flat in float v_alpha;
out vec4 fragColor;
void main() {
  vec3 n = normalize(v_n);
  float d = max(dot(n, u_light), 0.0);
  float shade = mix(1.0, u_shade.x + u_shade.y * d, u_lit);
  float rim = 1.0 - abs(n.z);
  shade *= 1.0 - 0.15 * u_lit * rim * rim;
  fragColor = vec4(v_color * shade * v_alpha, v_alpha);
}`;

const QUAD_VS = `#version 300 es
in vec2 a_q;
in vec4 i_centre;
in vec4 i_box;
in vec4 i_uv;
in vec4 i_halo;
in vec4 i_ring;
in float i_alpha;
uniform mat4 u_mvp;
uniform vec3 u_right;
uniform vec3 u_up;
uniform vec3 u_toward;
out vec2 v_uv;
out vec2 v_q;
flat out float v_mode;
flat out float v_alpha;
flat out vec4 v_halo;
flat out vec3 v_ring;
void main() {
  vec2 o = i_box.xy + a_q * i_box.zw;
  vec3 pos = i_centre.xyz + u_right * o.x + u_up * o.y;
  gl_Position = u_mvp * vec4(pos, 1.0);
  vec4 lifted = u_mvp * vec4(pos + u_toward * i_centre.w, 1.0);
  gl_Position.z = lifted.z / lifted.w * gl_Position.w;
  v_uv = vec2(mix(i_uv.x, i_uv.z, a_q.x * 0.5 + 0.5), mix(i_uv.w, i_uv.y, a_q.y * 0.5 + 0.5));
  v_q = o;
  v_mode = i_ring.w;
  v_alpha = i_alpha;
  v_halo = i_halo;
  v_ring = i_ring.xyz;
}`;
const QUAD_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec3 u_shadow;
in vec2 v_uv;
in vec2 v_q;
flat in float v_mode;
flat in float v_alpha;
flat in vec4 v_halo;
flat in vec3 v_ring;
out vec4 fragColor;
void main() {
  if (v_mode > 0.5) {
    float a = v_alpha * (1.0 - smoothstep(0.1, 1.0, length(v_q) / v_ring.x));
    if (a < 0.004) discard;
    fragColor = vec4(u_shadow * a, a);
    return;
  }
  vec4 c = texture(u_tex, v_uv);
  if (v_halo.a > 0.0) {
    float d = abs(length(v_q) - v_ring.x);
    float h = (1.0 - smoothstep(v_ring.y - v_ring.z, v_ring.y + v_ring.z, d)) * v_halo.a;
    c = c + vec4(v_halo.rgb * h, h) * (1.0 - c.a);
  }
  c *= v_alpha;
  if (c.a < 0.004) discard;
  fragColor = c;
}`;

/** The instanced programs' sources (linked by `linkAll`, alongside gl-core's). */
export const INSTANCED_SPECS: ProgramSpec[] = [
  { vs: TUBE_VS, fs: TUBE_FS, attribs: ["a_t", "i_a", "i_b", "i_c", "i_bn", "i_color", "i_range"], uniforms: ["u_mvp", "u_nrm", "u_lit", "u_light", "u_shade"] },
  { vs: QUAD_VS, fs: QUAD_FS, attribs: ["a_q", "i_centre", "i_box", "i_uv", "i_halo", "i_ring", "i_alpha"], uniforms: ["u_mvp", "u_right", "u_up", "u_toward", "u_tex", "u_shadow"] },
];

/** Floats per instance: tube a.xyz r | b.xyz alpha | c.xyz | bn.xyz | color.rgb | range.xy. */
export const TUBE_FLOATS = 19;
/** Floats per instance: quad centre.xyz lift | box | uv | halo | ring.xyz mode | alpha. */
export const QUAD_FLOATS = 21;

/** A growing list of instances for one frame (reused frame after frame). */
export class InstanceList {
  data: Float32Array;
  /** Which mesh each instance is drawn with (0, 1…): a run ends where it changes. */
  mesh: Uint8Array;
  n = 0;
  readonly stride: number;
  constructor(stride: number, cap = 256) {
    this.stride = stride;
    this.data = new Float32Array(stride * cap);
    this.mesh = new Uint8Array(cap);
  }
  clear() {
    this.n = 0;
  }
  /** Room for one more; returns its first float's index. */
  add(mesh: number): number {
    if (this.n >= this.mesh.length) {
      const cap = this.mesh.length * 2;
      const d = new Float32Array(this.stride * cap);
      d.set(this.data);
      this.data = d;
      const m = new Uint8Array(cap);
      m.set(this.mesh);
      this.mesh = m;
    }
    this.mesh[this.n] = mesh;
    const at = this.n * this.stride;
    this.n += 1;
    return at;
  }
}

type Attr = [name: string, size: number, offset: number];
const TUBE_ATTRS: Attr[] = [
  ["i_a", 4, 0],
  ["i_b", 4, 4],
  ["i_c", 3, 8],
  ["i_bn", 3, 11],
  ["i_color", 3, 14],
  ["i_range", 2, 17],
];
const QUAD_ATTRS: Attr[] = [
  ["i_centre", 4, 0],
  ["i_box", 4, 4],
  ["i_uv", 4, 8],
  ["i_halo", 4, 12],
  ["i_ring", 4, 16],
  ["i_alpha", 1, 20],
];

/** The instanced programs, their instance buffers and vertex array objects, for one WebGL 2 context. */
export class Instanced {
  readonly tube: Program;
  readonly quad: Program;
  private gl: WebGL2RenderingContext;
  private tubeBuf: WebGLBuffer;
  private quadBuf: WebGLBuffer;
  private tubeCap = 0;
  private quadCap = 0;

  /** `progs`: the two programs of INSTANCED_SPECS, linked (made here if not given). */
  constructor(gl: WebGL2RenderingContext, progs?: Program[]) {
    this.gl = gl;
    const [tube, quad] = progs ?? linkAll(gl, INSTANCED_SPECS);
    this.tube = tube;
    this.quad = quad;
    const tb = gl.createBuffer();
    const qb = gl.createBuffer();
    if (!tb || !qb) throw new Error("buffer");
    this.tubeBuf = tb;
    this.quadBuf = qb;
  }

  /** Upload a list's instances (the buffer grows as needed, never shrinks). */
  private upload(which: "tube" | "quad", list: InstanceList) {
    const gl = this.gl;
    const bytes = list.n * list.stride * 4;
    gl.bindBuffer(gl.ARRAY_BUFFER, which === "tube" ? this.tubeBuf : this.quadBuf);
    const cap = which === "tube" ? this.tubeCap : this.quadCap;
    if (bytes > cap) {
      const size = Math.max(bytes, cap * 2, 4096);
      gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW);
      if (which === "tube") this.tubeCap = size;
      else this.quadCap = size;
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, list.data, 0, list.n * list.stride);
  }

  /** Point the per-instance attributes at instance `first` of the bound buffer. */
  private pointAt(p: Program, attrs: Attr[], stride: number, first: number) {
    const gl = this.gl;
    for (const [name, size, offset] of attrs) {
      const loc = p.a[name];
      if (loc == null || loc < 0) continue;
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, (first * stride + offset) * 4);
    }
  }

  private enable(p: Program, attrs: Attr[], on: boolean) {
    const gl = this.gl;
    for (const [name] of attrs) {
      const loc = p.a[name];
      if (loc == null || loc < 0) continue;
      if (on) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribDivisor(loc, 1);
      } else {
        gl.vertexAttribDivisor(loc, 0);
        gl.disableVertexAttribArray(loc);
      }
    }
  }

  /**
   * Draw a list of tubes, in order, one draw per run of the same mesh
   * (`meshes[i]` for mesh i: indexed). The program's uniforms are set by the
   * caller (useProgram first).
   */
  drawTubes(list: InstanceList, meshes: (Mesh | null | undefined)[]): number {
    if (!list.n) return 0;
    let calls = 0;
    const gl = this.gl;
    const p = this.tube;
    this.upload("tube", list);
    this.enable(p, TUBE_ATTRS, true);
    let start = 0;
    while (start < list.n) {
      const kind = list.mesh[start];
      let end = start + 1;
      while (end < list.n && list.mesh[end] === kind) end += 1;
      const mesh = meshes[kind];
      if (mesh?.ibuf) {
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
        const loc = p.a.a_t;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, mesh.stride * 4, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibuf);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tubeBuf);
        this.pointAt(p, TUBE_ATTRS, TUBE_FLOATS, start);
        gl.drawElementsInstanced(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0, end - start);
        calls += 1;
      }
      start = end;
    }
    this.enable(p, TUBE_ATTRS, false);
    gl.disableVertexAttribArray(p.a.a_t);
    return calls;
  }

  /** Draw a list of quads (the unit quad `mesh`), in order, in one draw. */
  drawQuads(list: InstanceList, mesh: Mesh | null | undefined): number {
    if (!list.n || !mesh) return 0;
    const gl = this.gl;
    const p = this.quad;
    this.upload("quad", list);
    this.enable(p, QUAD_ATTRS, true);
    this.pointAt(p, QUAD_ATTRS, QUAD_FLOATS, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
    const loc = p.a.a_q;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, mesh.stride * 4, 0);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, list.n);
    this.enable(p, QUAD_ATTRS, false);
    gl.disableVertexAttribArray(loc);
    return 1;
  }

  destroy() {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    gl.deleteBuffer(this.tubeBuf);
    gl.deleteBuffer(this.quadBuf);
    gl.deleteProgram(this.tube.prog);
    gl.deleteProgram(this.quad.prog);
  }
}
