import React, { useRef, useEffect } from 'react'
import './glass-flow.css'

interface GlassFlowProps {
  width?: string | number
  height?: string | number
  className?: string
  stripeCount?: number
  angle?: number
  lensCurvature?: number
  refraction?: number
  edgeWidth?: number
  edgeBrightness?: number
  speed?: number
  chromaticAberration?: number
  edgeSharpness?: number
  waveSpeed?: number
  waveAmount?: number
  frostAmount?: number
  /** Background gradient stops (CSS color strings, first = top-left, last = bottom-right) */
  gradientColors?: string[]
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

uniform sampler2D u_texture;
uniform vec2 u_viewport;
uniform vec2 u_textureSize;
uniform float u_time;
uniform float u_stripeCount;
uniform float u_angle;
uniform float u_lensCurvature;
uniform float u_refraction;
uniform float u_edgeWidth;
uniform float u_edgeBrightness;
uniform float u_edgeSharpness;
uniform float u_speed;
uniform float u_waveSpeed;
uniform float u_waveAmount;
uniform float u_chromaticAberration;
uniform float u_frostAmount;

varying vec2 vUv;

float randomNoise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}
mat2 createRotation(float theta) {
  float c = cos(theta); float s = sin(theta);
  return mat2(c, -s, s, c);
}
vec2 computeCoverUV(vec2 uv, vec2 containerSize, vec2 mediaSize) {
  float cr = containerSize.x / containerSize.y;
  float mr = mediaSize.x / mediaSize.y;
  vec2 scaled = cr < mr
    ? vec2(mediaSize.x * containerSize.y / mediaSize.y, containerSize.y)
    : vec2(containerSize.x, mediaSize.y * containerSize.x / mediaSize.x);
  vec2 off = cr < mr
    ? vec2((scaled.x - containerSize.x) * 0.5, 0.0)
    : vec2(0.0, (scaled.y - containerSize.y) * 0.5);
  return uv * containerSize / scaled + off / scaled;
}
vec3 sampleWithBlur(sampler2D tex, vec2 uv, float blur) {
  vec3 col = vec3(0.0); float total = 0.0; float bs = blur * 0.01;
  for (float x = -2.0; x <= 2.0; x += 1.0)
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      col += texture2D(tex, uv + vec2(x, y) * bs).rgb; total += 1.0;
    }
  return col / total;
}

void main() {
  vec2 sampleUV = computeCoverUV(vUv, u_viewport, u_textureSize);
  vec2 cc = sampleUV - 0.5;
  vec2 rc = createRotation(u_angle) * cc;

  float waveOff = sin(u_time * u_waveSpeed + rc.y * 10.0) * u_waveAmount * 0.02;
  float sp = (rc.x + waveOff) * u_stripeCount + u_time * u_speed;
  float pat = fract(sp);
  float curved = pow(pat, u_lensCurvature);
  float disp = (curved - 0.5) * u_refraction;
  vec2 dv = createRotation(-u_angle) * vec2(disp, 0.0);

  float blur = u_frostAmount * 0.5;
  float ab = u_chromaticAberration * 0.01;
  vec3 out_col;

  if (blur > 0.01) {
    float r = sampleWithBlur(u_texture, sampleUV + dv, blur).r;
    float g = sampleWithBlur(u_texture, sampleUV + dv * 1.01 + vec2(ab, 0.0), blur).g;
    float b = sampleWithBlur(u_texture, sampleUV + dv * 1.02 + vec2(ab * 2.0, 0.0), blur).b;
    out_col = vec3(r, g, b);
  } else {
    float r = texture2D(u_texture, sampleUV + dv).r;
    float g = texture2D(u_texture, sampleUV + dv * 1.01 + vec2(ab, 0.0)).g;
    float b = texture2D(u_texture, sampleUV + dv * 1.02 + vec2(ab * 2.0, 0.0)).b;
    out_col = vec3(r, g, b);
  }

  if (u_frostAmount > 0.0) {
    float grain = (randomNoise(vUv * 500.0 + u_time) - 0.5) * u_frostAmount * 0.15;
    out_col += vec3(grain);
  }

  float soft = mix(0.3, 0.01, u_edgeSharpness);
  float edge = smoothstep(1.0 - u_edgeWidth - soft, 1.0 - soft * 0.5, pat);
  out_col += vec3(edge * u_edgeBrightness);

  gl_FragColor = vec4(out_col, 1.0);
}
`

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function buildGradientTexture(gl: WebGLRenderingContext, colors: string[]): WebGLTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, size, size)
  colors.forEach((c, i) => grad.addColorStop(i / Math.max(colors.length - 1, 1), c))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return tex
}

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  return s
}

const GlassFlow: React.FC<GlassFlowProps> = ({
  width = '100%',
  height = '100%',
  className = '',
  stripeCount = 6,
  angle = -13,
  lensCurvature = 0.49,
  refraction = 0.07,
  edgeWidth = 0.02,
  edgeBrightness = 0.05,
  speed = 0.1,
  chromaticAberration = 0.5,
  edgeSharpness = 0.5,
  waveSpeed = 1,
  waveAmount = 0,
  frostAmount = 0,
  gradientColors = ['#0a1a40', '#1a4080', '#2860b0', '#0d2050'],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl')
    if (!gl) return

    // Compile & link
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

    // Texture
    const tex = buildGradientTexture(gl, gradientColors)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.uniform1i(gl.getUniformLocation(prog, 'u_texture'), 0)

    // Helper
    const u = (name: string) => gl.getUniformLocation(prog, name)

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
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
      const rect = canvas.getBoundingClientRect()

      gl.uniform2f(u('u_viewport'), rect.width, rect.height)
      gl.uniform2f(u('u_textureSize'), 512, 512)
      gl.uniform1f(u('u_time'), t)
      gl.uniform1f(u('u_stripeCount'), stripeCount)
      gl.uniform1f(u('u_angle'), (angle * Math.PI) / 180)
      gl.uniform1f(u('u_lensCurvature'), lensCurvature)
      gl.uniform1f(u('u_refraction'), refraction)
      gl.uniform1f(u('u_edgeWidth'), edgeWidth)
      gl.uniform1f(u('u_edgeBrightness'), edgeBrightness)
      gl.uniform1f(u('u_edgeSharpness'), edgeSharpness)
      gl.uniform1f(u('u_speed'), speed)
      gl.uniform1f(u('u_chromaticAberration'), chromaticAberration)
      gl.uniform1f(u('u_waveSpeed'), waveSpeed)
      gl.uniform1f(u('u_waveAmount'), waveAmount)
      gl.uniform1f(u('u_frostAmount'), frostAmount)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      rafRef.current = requestAnimationFrame(frame)
    }
    frame()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      gl.deleteProgram(prog)
      gl.deleteTexture(tex)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`glass-flow-container${className ? ' ' + className : ''}`} style={{ width, height }}>
      <canvas ref={canvasRef} className="glass-flow-canvas" />
    </div>
  )
}

GlassFlow.displayName = 'GlassFlow'
export default GlassFlow
