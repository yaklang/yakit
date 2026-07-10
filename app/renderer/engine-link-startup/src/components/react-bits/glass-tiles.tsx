import React, { useRef, useEffect } from 'react'
import './glass-tiles.css'

export interface GlassTilesProps {
  width?: string | number
  height?: string | number
  className?: string
  children?: React.ReactNode
  speed?: number
  tileDensity?: number
  rippleLayers?: number
  warpStrength?: number
  bandSharpness?: number
  chromaticSpread?: number
  colorA?: string
  colorB?: string
  backgroundColor?: string
  opacity?: number
}

const VS = `
attribute vec2 a_position;
varying vec2 vUv;
void main() {
  vUv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FS = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uRes;
uniform float uSpeed;
uniform float uDensity;
uniform float uLayers;
uniform float uWarp;
uniform float uBand;
uniform float uChromatic;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uBg;
uniform float uAlpha;

const int   MAX_LAYERS   = 8;
const float GOLDEN_ANGLE = 2.39996323;

float sampleField(vec2 p, float t) {
  vec2 c = p;
  vec2 s = floor(c);
  vec2 pole = vec2(uWarp) / (s - c + 1e-3);

  for (int j = 1; j <= MAX_LAYERS; j++) {
    if (float(j) > uLayers) break;
    float fi = float(j);
    float ang = GOLDEN_ANGLE * fi;
    vec2 dir = vec2(cos(ang), sin(ang));
    float detune = 1.0 + fi * 0.13;
    float phase = dot(c, dir) * detune + pole.x + pole.y + t;
    c += dir * sin(phase) / fi;
  }

  float band = exp(-max(uBand, 0.0001) * abs(sin(c.y)));
  return band;
}

void main() {
  vec2 fragPx = vUv * uRes;
  vec2 base = fragPx / max(uRes.y, 1.0) * uDensity + uRes / max(uRes.y, 1.0);
  float t = uTime * uSpeed;

  float spread = uChromatic * 0.35;
  float r = sampleField(base + vec2( spread, 0.0), t);
  float g = sampleField(base,                      t);
  float b = sampleField(base + vec2(-spread, 0.0), t);

  vec3 col = vec3(
    mix(uColorA.r, uColorB.r, r),
    mix(uColorA.g, uColorB.g, g),
    mix(uColorA.b, uColorB.b, b)
  );

  float fieldMix = clamp(max(max(r, g), b), 0.0, 1.0);
  vec3 final = mix(uBg, col, fieldMix);

  gl_FragColor = vec4(final, uAlpha);
}
`

function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]
}

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  return s
}

const GlassTiles: React.FC<GlassTilesProps> = ({
  width = '100%',
  height = '100%',
  className,
  children,
  speed = 1,
  tileDensity = 4,
  rippleLayers = 6,
  warpStrength = 0.33,
  bandSharpness = 3,
  chromaticSpread = 0,
  colorA = '#1E00FF',
  colorB = '#D765E6',
  backgroundColor = '#000000',
  opacity = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  // Keep latest props accessible in the animation loop without restarting
  const propsRef = useRef({
    speed,
    tileDensity,
    rippleLayers,
    warpStrength,
    bandSharpness,
    chromaticSpread,
    colorA,
    colorB,
    backgroundColor,
    opacity,
  })

  useEffect(() => {
    propsRef.current = {
      speed,
      tileDensity,
      rippleLayers,
      warpStrength,
      bandSharpness,
      chromaticSpread,
      colorA,
      colorB,
      backgroundColor,
      opacity,
    }
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })
    if (!gl) return

    const vs = compileShader(gl, gl.VERTEX_SHADER, VS)
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FS)
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.useProgram(prog)

    // Full-screen quad
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(prog, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const u = (name: string) => gl.getUniformLocation(prog, name)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const start = performance.now()
    const frame = () => {
      const t = (performance.now() - start) / 1000
      const p = propsRef.current
      const rect = canvas.getBoundingClientRect()

      gl.uniform1f(u('uTime'), t)
      gl.uniform2f(u('uRes'), rect.width, rect.height)
      gl.uniform1f(u('uSpeed'), p.speed)
      gl.uniform1f(u('uDensity'), p.tileDensity)
      gl.uniform1f(u('uLayers'), Math.max(1, Math.min(8, Math.round(p.rippleLayers))))
      gl.uniform1f(u('uWarp'), p.warpStrength)
      gl.uniform1f(u('uBand'), p.bandSharpness)
      gl.uniform1f(u('uChromatic'), p.chromaticSpread)
      gl.uniform1f(u('uAlpha'), p.opacity)

      const a = hexToVec3(p.colorA)
      gl.uniform3f(u('uColorA'), a[0], a[1], a[2])
      const b = hexToVec3(p.colorB)
      gl.uniform3f(u('uColorB'), b[0], b[1], b[2])
      const bg = hexToVec3(p.backgroundColor)
      gl.uniform3f(u('uBg'), bg[0], bg[1], bg[2])

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      rafRef.current = requestAnimationFrame(frame)
    }
    frame()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      gl.deleteProgram(prog)
    }
  }, [])

  return (
    <div className={['glass-tiles-root', className].filter(Boolean).join(' ')} style={{ width, height }}>
      <canvas ref={canvasRef} className="glass-tiles-canvas" />
      {children && <div className="glass-tiles-content">{children}</div>}
    </div>
  )
}

GlassTiles.displayName = 'GlassTiles'
export default GlassTiles
