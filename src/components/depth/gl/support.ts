/*
 * Whether this browser can draw the 3D view, and the context it draws with.
 * Kept apart from the 3D view's code (gl-core.ts and wheel-view3d.ts, a
 * separate download) so the flat chart can ask without loading it.
 */

type GL = WebGLRenderingContext | WebGL2RenderingContext;

const CONTEXT_ATTRS: WebGLContextAttributes = {
  alpha: true,
  antialias: true,
  depth: true,
  stencil: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: "default",
};

/** A WebGL context on `canvas` (2 if the browser has it, else 1), or null. */
export function createContext(canvas: HTMLCanvasElement): { gl: GL; webgl2: boolean } | null {
  try {
    const gl2 = canvas.getContext("webgl2", CONTEXT_ATTRS) as WebGL2RenderingContext | null;
    if (gl2) return { gl: gl2, webgl2: true };
    const gl1 = (canvas.getContext("webgl", CONTEXT_ATTRS) || canvas.getContext("experimental-webgl", CONTEXT_ATTRS)) as WebGLRenderingContext | null;
    return gl1 ? { gl: gl1, webgl2: false } : null;
  } catch {
    return null;
  }
}

let support: boolean | null = null;

/** Can this browser draw the 3D view? (Checked once, on a scratch canvas.) */
export function supportsWebGL(): boolean {
  if (support !== null) return support;
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    const got = createContext(c);
    support = Boolean(got);
    const lose = got?.gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();
  } catch {
    support = false;
  }
  return support;
}
