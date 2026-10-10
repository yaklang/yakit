'use client'

// Glyph Ember (React Bits): heat-field simulation, glyph atlas, bloom.
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react'
import * as THREE from 'three'
import './glyph-ember.css'

export type GlyphEmberMode = 'auto' | 'glow' | 'ink'

export interface GlyphEmberHandle {
  stoke: (x?: number) => void
}

export interface GlyphEmberProps {
  colors?: [string, string]
  backgroundColor?: string
  mode?: GlyphEmberMode
  charset?: string
  fontFamily?: string
  glyphSize?: number
  spacing?: number
  height?: number
  fuel?: number
  turbulence?: number
  wind?: number
  flicker?: number
  sparks?: number
  smoke?: number
  pulse?: number
  speed?: number
  glow?: number
  intensity?: number
  interactive?: boolean
  snuff?: boolean
  snuffRadius?: number
  snuffStrength?: number
  clickStoke?: boolean
  stokeStrength?: number
  paused?: boolean
  quality?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

interface Settings {
  colors: [string, string]
  backgroundColor: string
  mode: GlyphEmberMode
  charset: string
  fontFamily: string
  glyphSize: number
  spacing: number
  height: number
  fuel: number
  turbulence: number
  wind: number
  flicker: number
  sparks: number
  smoke: number
  pulse: number
  speed: number
  glow: number
  intensity: number
  interactive: boolean
  snuff: boolean
  snuffRadius: number
  snuffStrength: number
  clickStoke: boolean
  stokeStrength: number
  paused: boolean
  quality: number
  reduced: boolean
}

interface Controller {
  sync: () => void
  destroy: () => void
  stoke: (x: number) => void
}

interface Grid {
  cols: number
  rows: number
  cellW: number
  cellH: number
  targets: THREE.WebGLRenderTarget[]
  sparks: THREE.WebGLRenderTarget
  index: number
}

const STOKES = 4
const IDLE_SPARKS = 72
const BURST_SPARKS = 42
const ATLAS_COLUMNS = 16
const STEP = 1 / 60
const SPARK_GLYPHS = '·+*'
const DEFAULT_CHARSET = ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$'
const DEFAULT_FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'

const subscribeToMotion = (notify: () => void) => {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}

const readMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

let colorContext: CanvasRenderingContext2D | null = null

const parseColor = (value: string, fallback: [number, number, number]): [number, number, number] => {
  if (!colorContext) colorContext = document.createElement('canvas').getContext('2d')
  if (!colorContext) return fallback
  colorContext.fillStyle = '#010203'
  colorContext.fillStyle = value
  const read = String(colorContext.fillStyle)
  if (read === '#010203' && value.trim().toLowerCase() !== '#010203') return fallback
  if (read.startsWith('#')) {
    const hex = read.slice(1)
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    ]
  }
  const parts = read.match(/[\d.]+/g)
  if (!parts || parts.length < 3) return fallback
  return [Number(parts[0]) / 255, Number(parts[1]) / 255, Number(parts[2]) / 255]
}

const toLinear = (value: number) => (value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4))

const toOklab = ([r, g, b]: [number, number, number]): [number, number, number] => {
  const lr = toLinear(r)
  const lg = toLinear(g)
  const lb = toLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

const noiseChunk = `
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  return 0.66 * noise(p) + 0.34 * noise(p * 2.07 + 13.1);
}
`

const simFragment = `
precision highp float;
uniform sampler2D uState;
uniform vec2 uGrid;
uniform float uTime;
uniform float uDt;
uniform float uRise;
uniform float uWind;
uniform float uTurb;
uniform float uCool;
uniform float uFuel;
uniform float uSmokeRate;
uniform vec4 uSnuff;
uniform vec4 uStokes[${STOKES}];
${noiseChunk}
out vec4 fragColor;

vec2 curl(vec2 p, float t) {
  float e = 0.5;
  vec2 drift = vec2(0.0, -t * 0.55);
  float n = fbm(p + drift + vec2(0.0, e));
  float s = fbm(p + drift - vec2(0.0, e));
  float r = fbm(p + drift + vec2(e, 0.0));
  float l = fbm(p + drift - vec2(e, 0.0));
  return vec2(n - s, l - r) / (2.0 * e);
}

float stokeAt(float x) {
  float total = 0.0;
  for (int k = 0; k < ${STOKES}; k++) {
    vec4 s = uStokes[k];
    if (s.z <= 0.0) continue;
    float age = uTime - s.y;
    if (age < 0.0 || age > 4.0) continue;
    float g = (x - s.x) / s.w;
    total += s.z * exp(-g * g) * smoothstep(0.0, 0.12, age) * exp(-age / 0.9);
  }
  return total;
}

void main() {
  vec2 p = gl_FragCoord.xy;
  vec4 here = texture(uState, p / uGrid);
  float stoke = stokeAt(p.x);
  float warm = clamp(here.r, 0.0, 1.2);
  float lift = min(stoke, 1.5);
  vec2 swirl = curl(p * 0.075, uTime) * uTurb * (0.35 + 0.65 * warm) * (1.0 + 0.7 * lift);
  float gust = 0.75 + 0.5 * noise(vec2(uTime * 0.18, p.y * 0.015));
  vec2 velocity = vec2(uWind * gust, uRise * (0.55 + 0.6 * warm) * (1.0 + 1.1 * lift)) + swirl;
  vec4 previous = texture(uState, (p - velocity * uDt) / uGrid);
  float heat = previous.r;
  float smoke = previous.g;
  float patches = fbm(vec2(p.x * 0.075, p.y * 0.075 - uTime * uRise * 0.075));
  float cool = uCool * mix(0.4, 2.3, smoothstep(0.32, 0.78, patches)) / (1.0 + 0.45 * lift);
  float cooled = heat * (1.0 - exp(-cool * uDt));
  heat -= cooled;
  smoke += cooled * uSmokeRate;
  float d = length(p - uSnuff.xy) / max(uSnuff.z, 1.0);
  float douse = uSnuff.w * exp(-d * d);
  float doused = heat * (1.0 - exp(-douse * 9.0 * uDt));
  heat -= doused;
  smoke += doused * 0.85;
  smoke = min(smoke * exp(-uDt * 0.55), 1.0);
  if (p.y < 2.0) {
    float bed = 0.52 + 0.62 * fbm(vec2(p.x * 0.05 + uTime * 0.22, uTime * 0.4));
    float grain = hash(vec2(p.x, floor(uTime * 30.0)));
    heat = min(uFuel * bed * (0.82 + 0.36 * grain) * (1.0 + 0.25 * stoke), 1.0);
    smoke = 0.0;
  }
  fragColor = vec4(heat, smoke, 0.0, 1.0);
}
`

const sparkVertex = `
in vec4 aSpark;
uniform vec2 uGrid;
uniform float uTime;
uniform float uRise;
uniform float uWind;
uniform float uAmount;
uniform vec4 uStokes[${STOKES}];
${noiseChunk}
out float vBright;

void main() {
  float kind = aSpark.x;
  float lag = aSpark.y * 0.07;
  float s1 = aSpark.z;
  float s2 = aSpark.w;
  vec2 position = vec2(-10.0);
  float bright = 0.0;
  if (kind < 0.5) {
    float period = 1.8 + 1.8 * s1;
    float phase = (uTime + s2 * 17.0 * period) / period;
    float cycle = floor(phase);
    float age = fract(phase) * period - lag;
    float alive = step(hash(vec2(s1 * 91.0, cycle)), uAmount * 0.8);
    float x0 = hash(vec2(cycle * 1.7, s2 * 53.0)) * uGrid.x;
    float lift = uRise * (1.1 + 0.9 * s2) * 1.5;
    float y = 1.5 + lift * (1.0 - exp(-max(age, 0.0) / 1.5));
    float x = x0 + uWind * age * 1.1 + sin(age * (2.0 + 3.0 * s2) + s1 * 6.2831853) * (0.6 + age);
    bright = alive * step(0.0, age) * (1.0 - age / period) * smoothstep(0.0, 0.08, age);
    position = vec2(x, y);
  } else {
    vec4 stoke = uStokes[int(kind) - 1];
    float age = uTime - stoke.y - lag;
    if (stoke.z > 0.0 && age > 0.0 && age < 2.6) {
      float angle = (s1 - 0.5) * 1.4;
      float lift = uRise * (1.4 + 1.9 * s2) * (0.7 + 0.3 * stoke.z) * 1.2;
      float travel = lift * (1.0 - exp(-age / 1.2));
      position = vec2(stoke.x + (s2 - 0.5) * stoke.w * 0.9 + sin(angle) * travel + uWind * age, 1.5 + cos(angle) * travel);
      bright = (1.0 - age / 2.6) * smoothstep(0.0, 0.05, age) * min(stoke.z, 1.5);
    }
  }
  vBright = bright * (1.0 - aSpark.y * 0.45);
  gl_PointSize = 1.0;
  gl_Position = vec4((floor(position) + 0.5) / uGrid * 2.0 - 1.0, 0.0, 1.0);
}
`

const sparkFragment = `
precision highp float;
in float vBright;
out vec4 fragColor;

void main() {
  fragColor = vec4(vBright, 0.0, 0.0, 1.0);
}
`

const passVertex = `
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const flameFragment = `
precision highp float;
uniform sampler2D uState;
uniform sampler2D uSparks;
uniform sampler2D uAtlas;
uniform vec2 uAtlasGrid;
uniform vec2 uCell;
uniform float uCount;
uniform float uSparkGlyph;
uniform float uTime;
uniform float uFlicker;
uniform float uInk;
uniform vec3 uLabBody;
uniform vec3 uLabCore;
in vec2 vUv;
out vec4 fragColor;

vec3 labToLinear(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return max(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ), 0.0);
}

float hash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

vec3 flame(float t) {
  vec3 deep = vec3(uLabBody.x * 0.38, uLabBody.yz * 0.8);
  vec3 white = mix(vec3(0.97, uLabCore.yz * 0.22), vec3(uLabCore.x * 0.75, uLabCore.yz * 1.1), uInk);
  vec3 lab = t < 0.45 ? mix(deep, uLabBody, smoothstep(0.0, 0.45, t))
    : t < 0.86 ? mix(uLabBody, uLabCore, smoothstep(0.45, 0.86, t))
    : mix(uLabCore, white, smoothstep(0.86, 1.0, t));
  return labToLinear(lab);
}

float glyphCoverage(float index, vec2 g) {
  vec2 f = fract(g) - 0.5;
  vec2 span = vec2(uCell.x / uCell.y, 1.0) * 0.86;
  vec2 texel = vec2(0.5 + f.x * span.x, 0.5 - f.y * span.y);
  float inside = step(0.01, texel.x) * step(texel.x, 0.99) * step(0.01, texel.y) * step(texel.y, 0.99);
  vec2 slot = vec2(mod(index, uAtlasGrid.x), floor(index / uAtlasGrid.x));
  vec2 uv = (slot + texel) / uAtlasGrid;
  vec2 scale = span / uAtlasGrid;
  return textureGrad(uAtlas, uv, dFdx(g) * scale, dFdy(g) * scale).r * inside;
}

void main() {
  vec2 g = gl_FragCoord.xy / uCell;
  ivec2 cell = ivec2(floor(g));
  vec4 state = texelFetch(uState, cell, 0);
  float spark = texelFetch(uSparks, cell, 0).r;
  float heat = max(state.r, 0.0);
  float smoke = max(state.g, 0.0) * (1.0 - smoothstep(0.04, 0.2, heat));
  float beat = floor(uTime * (3.0 + 21.0 * uFlicker));
  float jitter = (hash(vec3(vec2(cell), beat)) - 0.5) * (0.06 + 0.3 * uFlicker);
  float level = clamp(heat + jitter * step(0.04, heat), 0.0, 1.0);
  float haze = clamp(smoke * 0.6, 0.0, 0.42);
  vec3 color = vec3(0.0);
  float energy = 0.0;
  if (spark > 0.12) {
    float sparkIndex = uSparkGlyph + clamp(floor(spark * 3.0), 0.0, 2.0);
    float cover = glyphCoverage(sparkIndex, g);
    color = mix(labToLinear(vec3(min(uLabCore.x + 0.12, 0.98), uLabCore.yz * 0.6)), flame(0.7), uInk);
    energy = cover * min(spark, 1.4) * 1.25;
  } else if (level > 0.05) {
    float index = floor(pow(level, 0.85) * (uCount - 1.0) + 0.5);
    float cover = glyphCoverage(max(index, 1.0), g);
    color = flame(level);
    energy = cover * smoothstep(0.05, 0.12, level) * (0.1 + 1.1 * pow(level, 1.8));
  } else if (haze > 0.05) {
    float index = floor(haze * (uCount - 1.0) + 0.5);
    float cover = glyphCoverage(max(index, 1.0), g);
    color = labToLinear(vec3(mix(0.62, 0.45, uInk), uLabBody.yz * 0.16));
    energy = cover * haze * 0.6;
  }
  fragColor = vec4(color * energy, energy);
}
`

const downFragment = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 a = texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  vec4 b = texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  vec4 c = texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  vec4 d = texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = (a + b + c + d) * 0.125 + texture(uSource, vUv) * 0.5;
}
`

const upFragment = `
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 sum = texture(uSource, vUv) * 4.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, -1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, 1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = texture(uBase, vUv) + sum / 16.0;
}
`

const compositeFragment = `
precision highp float;
uniform sampler2D uLines;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform float uGlow;
uniform float uExposure;
uniform float uMode;
uniform float uGrain;
in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  vec4 lines = texture(uLines, vUv);
  vec4 bloom = texture(uBloom, vUv);
  vec3 color;
  if (uMode < 0.5) {
    vec3 light = (lines.rgb + bloom.rgb * uGlow) * uExposure;
    vec3 exposed = 1.0 - exp(-light);
    float peak = max(exposed.r, max(exposed.g, exposed.b));
    exposed = mix(exposed, vec3(peak), smoothstep(0.75, 1.0, peak) * 0.35);
    color = uBackground + (1.0 - uBackground) * exposed;
  } else {
    float energy = lines.a + bloom.a * uGlow * 0.2;
    vec3 hue = (lines.rgb + bloom.rgb * uGlow * 0.2) / max(energy, 1e-4);
    float cover = clamp(1.0 - exp(-energy * uExposure * 1.4), 0.0, 0.95);
    color = mix(uBackground, clamp(hue * 0.85, 0.0, 1.0), cover);
  }
  float grain = hash(gl_FragCoord.xy + uGrain * 311.0) - 0.5;
  fragColor = vec4(encode(color) + grain * (1.2 / 255.0), 1.0);
}
`

const buildAtlas = (charset: string, fontFamily: string, cell: number) => {
  const ramp = Array.from(new Set(Array.from(charset))).slice(0, 180)
  if (ramp.length < 2) ramp.push('.', '#')
  const measure = document.createElement('canvas')
  measure.width = cell
  measure.height = cell
  const probe = measure.getContext('2d', { willReadFrequently: true })
  const font = `500 ${Math.round(cell * 0.8)}px ${fontFamily}`
  const weight = (character: string) => {
    if (!probe) return 0
    probe.fillStyle = '#000000'
    probe.fillRect(0, 0, cell, cell)
    probe.fillStyle = '#ffffff'
    probe.textAlign = 'center'
    probe.textBaseline = 'middle'
    probe.font = font
    probe.fillText(character, cell / 2, cell / 2)
    const data = probe.getImageData(0, 0, cell, cell).data
    let sum = 0
    for (let i = 0; i < data.length; i += 4) sum += data[i]
    return sum
  }
  const sorted = ramp.map((character) => ({ character, ink: weight(character) })).sort((a, b) => a.ink - b.ink)
  const list = [...sorted.map((item) => item.character), ...Array.from(SPARK_GLYPHS)]
  const rows = Math.ceil(list.length / ATLAS_COLUMNS)
  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_COLUMNS * cell
  canvas.height = rows * cell
  const context = canvas.getContext('2d')
  if (context) {
    context.fillStyle = '#000000'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#ffffff'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = font
    list.forEach((character, index) => {
      const x = (index % ATLAS_COLUMNS) * cell + cell / 2
      const y = Math.floor(index / ATLAS_COLUMNS) * cell + cell / 2 + cell * 0.04
      context.fillText(character, x, y)
    })
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.colorSpace = THREE.NoColorSpace
  texture.flipY = false
  texture.anisotropy = 4
  texture.needsUpdate = true
  return { texture, count: sorted.length, rows }
}

const buildSparkGeometry = () => {
  const random = (() => {
    let state = 131
    return () => {
      state = (state * 16807) % 2147483647
      return state / 2147483647
    }
  })()
  const items: number[] = []
  const push = (kind: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const s1 = random()
      const s2 = random()
      items.push(kind, 0, s1, s2, kind, 1, s1, s2)
    }
  }
  push(0, IDLE_SPARKS)
  for (let k = 1; k <= STOKES; k++) push(k, BURST_SPARKS)
  const data = new Float32Array(items)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('aSpark', new THREE.BufferAttribute(data, 4))
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((data.length / 4) * 3), 3))
  return geometry
}

const createEmber = (root: HTMLDivElement, settingsRef: { current: Settings }): Controller | null => {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.position = 'absolute'
  canvas.style.inset = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.display = 'block'
  canvas.style.pointerEvents = 'none'
  root.prepend(canvas)

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: 'high-performance' })
  } catch {
    canvas.remove()
    return null
  }
  if (!renderer.capabilities.isWebGL2) {
    renderer.dispose()
    canvas.remove()
    return null
  }
  renderer.autoClear = false
  const texelType =
    renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float')
      ? THREE.HalfFloatType
      : THREE.UnsignedByteType

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const plane = new THREE.PlaneGeometry(2, 2)
  const stokes = Array.from({ length: STOKES }, () => new THREE.Vector4(0, -100, 0, 1))
  const hover = { x: 0, y: 0, vx: 0, vy: 0, goalX: 0, goalY: 0, amount: 0, inside: false, placed: false }

  const pass = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
    new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms,
      vertexShader: passVertex,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    })

  const simMaterial = pass(simFragment, {
    uState: { value: null },
    uGrid: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uDt: { value: STEP },
    uRise: { value: 20 },
    uWind: { value: 0 },
    uTurb: { value: 10 },
    uCool: { value: 1 },
    uFuel: { value: 1 },
    uSmokeRate: { value: 0.3 },
    uSnuff: { value: new THREE.Vector4(-100, -100, 10, 0) },
    uStokes: { value: stokes },
  })
  const sparkMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uGrid: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uRise: { value: 20 },
      uWind: { value: 0 },
      uAmount: { value: 0.5 },
      uStokes: { value: stokes },
    },
    vertexShader: sparkVertex,
    fragmentShader: sparkFragment,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
  })
  const flameMaterial = pass(flameFragment, {
    uState: { value: null },
    uSparks: { value: null },
    uAtlas: { value: null },
    uAtlasGrid: { value: new THREE.Vector2(ATLAS_COLUMNS, 1) },
    uCell: { value: new THREE.Vector2(8, 12) },
    uCount: { value: 2 },
    uSparkGlyph: { value: 2 },
    uTime: { value: 0 },
    uFlicker: { value: 0.5 },
    uInk: { value: 0 },
    uLabBody: { value: new THREE.Vector3() },
    uLabCore: { value: new THREE.Vector3() },
  })
  const downMaterial = pass(downFragment, { uSource: { value: null }, uTexel: { value: new THREE.Vector2() } })
  const upMaterial = pass(upFragment, {
    uSource: { value: null },
    uBase: { value: null },
    uTexel: { value: new THREE.Vector2() },
  })
  const compositeMaterial = pass(compositeFragment, {
    uLines: { value: null },
    uBloom: { value: null },
    uBackground: { value: new THREE.Vector3() },
    uGlow: { value: 0.35 },
    uExposure: { value: 1.3 },
    uMode: { value: 0 },
    uGrain: { value: 0 },
  })

  const quad = new THREE.Mesh(plane, compositeMaterial)
  quad.frustumCulled = false
  const quadScene = new THREE.Scene()
  quadScene.add(quad)
  const sparkPoints = new THREE.Points(buildSparkGeometry(), sparkMaterial)
  sparkPoints.frustumCulled = false
  const sparkScene = new THREE.Scene()
  sparkScene.add(sparkPoints)

  const target = (w: number, h: number, filter: THREE.MagnificationTextureFilter) =>
    new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
      type: texelType,
      format: THREE.RGBAFormat,
      minFilter: filter,
      magFilter: filter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    })

  let lineTarget: THREE.WebGLRenderTarget | null = null
  let downTargets: THREE.WebGLRenderTarget[] = []
  let upTargets: THREE.WebGLRenderTarget[] = []
  let grid: Grid | null = null
  let gridKey = ''
  let atlas: ReturnType<typeof buildAtlas> | null = null
  let atlasKey = ''

  let destroyed = false
  let raf = 0
  let last = 0
  let visible = true
  let simTime = 30
  let carry = 0
  let width = 1
  let height = 1
  let pixelRatio = 1
  let grain = 0
  let stokeSlot = 0

  const release = () => {
    lineTarget?.dispose()
    downTargets.forEach((item) => item.dispose())
    upTargets.forEach((item) => item.dispose())
    lineTarget = null
    downTargets = []
    upTargets = []
  }

  const releaseGrid = () => {
    grid?.targets.forEach((item) => item.dispose())
    grid?.sparks.dispose()
    grid = null
  }

  const draw = (material: THREE.ShaderMaterial, output: THREE.WebGLRenderTarget | null) => {
    quad.material = material
    renderer.setRenderTarget(output)
    renderer.render(quadScene, camera)
  }

  const ensureAtlas = () => {
    const settings = settingsRef.current
    const charset = String(settings.charset ?? '') || DEFAULT_CHARSET
    const font = String(settings.fontFamily ?? '') || DEFAULT_FONT
    const cell = Math.round(clamp(clamp(settings.glyphSize, 5, 48) * pixelRatio * 1.25, 12, 96))
    const key = `${charset}|${font}|${cell}`
    if (key === atlasKey && atlas) return
    atlasKey = key
    atlas?.texture.dispose()
    atlas = buildAtlas(charset, font, cell)
    flameMaterial.uniforms.uAtlas.value = atlas.texture
    flameMaterial.uniforms.uAtlasGrid.value.set(ATLAS_COLUMNS, atlas.rows)
    flameMaterial.uniforms.uCount.value = atlas.count
    flameMaterial.uniforms.uSparkGlyph.value = atlas.count
  }

  const physics = () => {
    const settings = settingsRef.current
    const rows = grid ? grid.rows : 1
    const reach = clamp(settings.height, 0.1, 1.2) * rows
    const rise = (reach / 1.15) * clamp(settings.speed, 0, 4)
    return {
      rise,
      cool: (2.6 * rise) / Math.max(reach, 1),
      wind: clamp(settings.wind, -1, 1) * rise * 0.55,
      turbulence: clamp(settings.turbulence, 0, 2) * rise * 0.9,
    }
  }

  const simulate = (dt: number) => {
    if (!grid) return
    const settings = settingsRef.current
    const motion = physics()
    const uniforms = simMaterial.uniforms
    const breath = 1 + clamp(settings.pulse, 0, 1) * 0.35 * Math.sin(simTime * 0.9) * Math.sin(simTime * 0.37 + 1.3)
    uniforms.uGrid.value.set(grid.cols, grid.rows)
    uniforms.uTime.value = simTime
    uniforms.uDt.value = dt
    uniforms.uRise.value = motion.rise
    uniforms.uWind.value = motion.wind
    uniforms.uTurb.value = motion.turbulence
    uniforms.uCool.value = motion.cool
    uniforms.uFuel.value = clamp(settings.fuel, 0, 2) * breath
    uniforms.uSmokeRate.value = clamp(settings.smoke, 0, 1) * 0.22
    uniforms.uSnuff.value.set(
      hover.x,
      hover.y,
      clamp(settings.snuffRadius, 10, 400) / grid.cellH,
      hover.amount * clamp(settings.snuffStrength, 0, 1),
    )
    uniforms.uState.value = grid.targets[grid.index].texture
    draw(simMaterial, grid.targets[1 - grid.index])
    grid.index = 1 - grid.index
  }

  const ensureGrid = () => {
    const settings = settingsRef.current
    const size = clamp(settings.glyphSize, 5, 48) * pixelRatio
    const cellH = size * 1.02
    const cellW = size * 0.62 * clamp(settings.spacing, 0.6, 3)
    const w = width * pixelRatio
    const h = height * pixelRatio
    const cols = Math.ceil(w / cellW)
    const rows = Math.ceil(h / cellH)
    const key = [cols, rows, cellW.toFixed(3), cellH.toFixed(3)].join('|')
    if (key === gridKey && grid) return
    gridKey = key
    releaseGrid()
    const targets = [0, 1].map(() => target(cols, rows, THREE.LinearFilter))
    for (const item of targets) {
      renderer.setRenderTarget(item)
      renderer.setClearColor(0x000000, 0)
      renderer.clear()
    }
    grid = { cols, rows, cellW, cellH, targets, sparks: target(cols, rows, THREE.NearestFilter), index: 0 }
    for (let t = 0; t < 3; t += STEP) {
      simTime += STEP
      simulate(STEP)
    }
  }

  const drawSparks = () => {
    if (!grid) return
    const settings = settingsRef.current
    const motion = physics()
    const uniforms = sparkMaterial.uniforms
    uniforms.uGrid.value.set(grid.cols, grid.rows)
    uniforms.uTime.value = simTime
    uniforms.uRise.value = motion.rise
    uniforms.uWind.value = motion.wind
    uniforms.uAmount.value = settings.reduced ? 0 : clamp(settings.sparks, 0, 1)
    renderer.setRenderTarget(grid.sparks)
    renderer.setClearColor(0x000000, 0)
    renderer.clear()
    renderer.render(sparkScene, camera)
  }

  const apply = () => {
    const settings = settingsRef.current
    if (!grid) return
    const background = parseColor(settings.backgroundColor, [0.04, 0.04, 0.04])
    const luminance = 0.2126 * background[0] + 0.7152 * background[1] + 0.0722 * background[2]
    const ink = settings.mode === 'ink' || (settings.mode === 'auto' && luminance > 0.5)
    const body = toOklab(parseColor(settings.colors[0], [0.48, 0.24, 1]))
    const core = toOklab(parseColor(settings.colors[1], [1, 0.5, 0.85]))
    const uniforms = flameMaterial.uniforms
    uniforms.uState.value = grid.targets[grid.index].texture
    uniforms.uSparks.value = grid.sparks.texture
    uniforms.uCell.value.set(grid.cellW, grid.cellH)
    uniforms.uTime.value = simTime
    uniforms.uFlicker.value = settings.reduced ? 0 : clamp(settings.flicker, 0, 1)
    uniforms.uInk.value = ink ? 1 : 0
    uniforms.uLabBody.value.set(body[0], body[1], body[2])
    uniforms.uLabCore.value.set(core[0], core[1], core[2])
    const composite = compositeMaterial.uniforms
    composite.uBackground.value.set(toLinear(background[0]), toLinear(background[1]), toLinear(background[2]))
    composite.uGlow.value = clamp(settings.glow, 0, 3)
    composite.uExposure.value = (ink ? 5 : 1.05) * clamp(settings.intensity, 0, 4)
    composite.uMode.value = ink ? 1 : 0
    composite.uGrain.value = grain
  }

  const render = () => {
    if (!lineTarget || !downTargets.length) return
    ensureAtlas()
    ensureGrid()
    drawSparks()
    apply()
    draw(flameMaterial, lineTarget)
    let source = lineTarget
    for (const item of downTargets) {
      downMaterial.uniforms.uSource.value = source.texture
      downMaterial.uniforms.uTexel.value.set(1 / source.width, 1 / source.height)
      draw(downMaterial, item)
      source = item
    }
    let accumulated = downTargets[downTargets.length - 1]
    for (let k = downTargets.length - 2; k >= 0; k--) {
      upMaterial.uniforms.uSource.value = accumulated.texture
      upMaterial.uniforms.uBase.value = downTargets[k].texture
      upMaterial.uniforms.uTexel.value.set(1 / accumulated.width, 1 / accumulated.height)
      draw(upMaterial, upTargets[k])
      accumulated = upTargets[k]
    }
    compositeMaterial.uniforms.uLines.value = lineTarget.texture
    compositeMaterial.uniforms.uBloom.value = accumulated.texture
    draw(compositeMaterial, null)
  }

  const step = (dt: number) => {
    const settings = settingsRef.current
    const goal = hover.inside && settings.interactive && settings.snuff && !settings.reduced ? 1 : 0
    hover.amount += (goal - hover.amount) * (1 - Math.exp(-dt / 0.3))
    const omega = 10
    hover.vx += (omega * omega * (hover.goalX - hover.x) - 2 * omega * hover.vx) * dt
    hover.vy += (omega * omega * (hover.goalY - hover.y) - 2 * omega * hover.vy) * dt
    hover.x += hover.vx * dt
    hover.y += hover.vy * dt
    if (settings.paused || settings.reduced) return
    ensureAtlas()
    ensureGrid()
    carry = Math.min(carry + dt, STEP * 4)
    while (carry >= STEP) {
      carry -= STEP
      simTime += STEP
      simulate(STEP)
    }
    grain = (grain + 0.618034) % 1
  }

  const tick = (now: number) => {
    raf = 0
    if (destroyed) return
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    step(dt)
    render()
    const settings = settingsRef.current
    const animating = !settings.paused && !settings.reduced
    if (visible && !document.hidden && animating) raf = requestAnimationFrame(tick)
  }

  function wake() {
    if (destroyed || raf || !visible) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  const resize = () => {
    const rect = root.getBoundingClientRect()
    width = Math.max(1, rect.width)
    height = Math.max(1, rect.height)
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2) * clamp(settingsRef.current.quality, 0.25, 1)
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(width, height, false)
    const w = Math.round(width * pixelRatio)
    const h = Math.round(height * pixelRatio)
    release()
    lineTarget = target(w, h, THREE.LinearFilter)
    const levels = clamp(Math.floor(Math.log2(Math.min(w, h) / 8)), 3, 7)
    for (let k = 1; k <= levels; k++) {
      downTargets.push(target(w >> k, h >> k, THREE.LinearFilter))
      upTargets.push(target(w >> k, h >> k, THREE.LinearFilter))
    }
    render()
    wake()
  }

  const toCells = (event: PointerEvent) => {
    const rect = root.getBoundingClientRect()
    const cellW = grid ? grid.cellW : 1
    const cellH = grid ? grid.cellH : 1
    return [
      ((event.clientX - rect.left) * pixelRatio) / cellW,
      ((rect.height - (event.clientY - rect.top)) * pixelRatio) / cellH,
    ] as const
  }

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || !settingsRef.current.interactive) return
    const [x, y] = toCells(event)
    hover.goalX = x
    hover.goalY = y
    if (!hover.placed) {
      hover.x = x
      hover.y = y
      hover.placed = true
    }
    if (!hover.inside) {
      hover.inside = true
      wake()
    }
  }

  const onLeave = () => {
    hover.inside = false
    hover.placed = false
    wake()
  }

  const stoke = (x: number) => {
    const settings = settingsRef.current
    if (settings.reduced || settings.paused || !grid) return
    stokeSlot = (stokeSlot + 1) % STOKES
    stokes[stokeSlot].set(x, simTime, clamp(settings.stokeStrength, 0, 3), grid.cols * 0.085)
    wake()
  }

  const onDown = (event: PointerEvent) => {
    const settings = settingsRef.current
    if (event.button !== 0 || !settings.interactive || !settings.clickStoke) return
    const [x] = toCells(event)
    stoke(x)
  }

  root.addEventListener('pointermove', onMove)
  root.addEventListener('pointerleave', onLeave)
  root.addEventListener('pointercancel', onLeave)
  root.addEventListener('pointerdown', onDown)
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(root)
  const intersection = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting)
      if (visible) wake()
    },
    { rootMargin: '80px' },
  )
  intersection.observe(root)
  const onVisibility = () => {
    if (!document.hidden) wake()
  }
  document.addEventListener('visibilitychange', onVisibility)
  const onLost = (event: Event) => event.preventDefault()
  canvas.addEventListener('webglcontextlost', onLost)
  resize()

  return {
    sync: () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2) * clamp(settingsRef.current.quality, 0.25, 1)
      if (Math.abs(ratio - pixelRatio) > 1e-3) resize()
      else render()
      wake()
    },
    destroy: () => {
      destroyed = true
      cancelAnimationFrame(raf)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('pointercancel', onLeave)
      root.removeEventListener('pointerdown', onDown)
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onLost)
      resizeObserver.disconnect()
      intersection.disconnect()
      release()
      releaseGrid()
      atlas?.texture.dispose()
      sparkPoints.geometry.dispose()
      plane.dispose()
      ;[simMaterial, sparkMaterial, flameMaterial, downMaterial, upMaterial, compositeMaterial].forEach((item) =>
        item.dispose(),
      )
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
    stoke: (x: number) => stoke(clamp(x, 0, 1) * (grid ? grid.cols : 0)),
  }
}

const GlyphEmber = forwardRef<GlyphEmberHandle, GlyphEmberProps>(function GlyphEmber(
  {
    colors = ['#7B3DFF', '#FF7AD9'],
    backgroundColor = '#0A0A0A',
    mode = 'auto',
    charset = DEFAULT_CHARSET,
    fontFamily = DEFAULT_FONT,
    glyphSize = 11,
    spacing = 1,
    height = 0.45,
    fuel = 1,
    turbulence = 0.6,
    wind = 0.15,
    flicker = 0.5,
    sparks = 0.5,
    smoke = 0.35,
    pulse = 0,
    speed = 1,
    glow = 0.35,
    intensity = 1,
    interactive = true,
    snuff = true,
    snuffRadius = 70,
    snuffStrength = 0.8,
    clickStoke = true,
    stokeStrength = 1,
    paused = false,
    quality = 1,
    className,
    style,
    children,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<Controller | null>(null)
  const reduced = useSyncExternalStore(subscribeToMotion, readMotion, () => false)
  const settingsRef = useRef<Settings>({
    colors,
    backgroundColor,
    mode,
    charset,
    fontFamily,
    glyphSize,
    spacing,
    height,
    fuel,
    turbulence,
    wind,
    flicker,
    sparks,
    smoke,
    pulse,
    speed,
    glow,
    intensity,
    interactive,
    snuff,
    snuffRadius,
    snuffStrength,
    clickStoke,
    stokeStrength,
    paused,
    quality,
    reduced,
  })

  useEffect(() => {
    settingsRef.current = {
      colors,
      backgroundColor,
      mode,
      charset,
      fontFamily,
      glyphSize,
      spacing,
      height,
      fuel,
      turbulence,
      wind,
      flicker,
      sparks,
      smoke,
      pulse,
      speed,
      glow,
      intensity,
      interactive,
      snuff,
      snuffRadius,
      snuffStrength,
      clickStoke,
      stokeStrength,
      paused,
      quality,
      reduced,
    }
    controllerRef.current?.sync()
  })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const controller = createEmber(root, settingsRef)
    controllerRef.current = controller
    return () => {
      controller?.destroy()
      controllerRef.current = null
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      stoke: (x = 0.5) => controllerRef.current?.stoke(x),
    }),
    [],
  )

  return (
    <div
      ref={rootRef}
      className={['glyph-ember', className].filter(Boolean).join(' ')}
      style={{ backgroundColor, ...style }}
    >
      {children && <div className="glyph-ember__content">{children}</div>}
    </div>
  )
})

GlyphEmber.displayName = 'GlyphEmber'

export { GlyphEmber }
export default GlyphEmber
