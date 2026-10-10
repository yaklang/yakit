import { useEffect, useRef } from 'react'
import type { Theme } from '@/hooks/useTheme'

/** 浅色取文档预览色，深色取组件默认色，高光为 Memfit 指定色 */
const BLINDS_HOT_COLOR = '#5d99e3'
const BLINDS_THEME = {
  light: { color: '#cbd5e1', backgroundColor: '#ffffff' },
  dark: { color: '#334155', backgroundColor: '#0a0a0a' },
}

const VERT = `
attribute vec2 aPos;
varying vec2 vPlane;
void main() {
  vPlane = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vPlane;
uniform vec2 uCanvas;
uniform float uClock;
uniform float uGrainSize;
uniform vec3 uInk;
uniform vec3 uHot;
uniform vec3 uBackdrop;
uniform vec2 uFocus;

float scatter(vec3 seed) {
  vec3 wobble = fract(seed * vec3(0.1031, 0.1030, 0.0973));
  wobble += dot(wobble, wobble.yxz + 33.33);
  return fract((wobble.x + wobble.y) * wobble.z);
}

float silver(vec2 cell, float tick) {
  float a = scatter(vec3(cell, tick));
  float b = scatter(vec3(cell.yx + 41.7, tick + 19.3));
  return a + b - 1.0;
}

void main() {
  vec2 pixel = vPlane * uCanvas;
  float aspect = uCanvas.x / max(uCanvas.y, 1.0);
  vec2 field = (pixel - 0.5 * uCanvas) / max(uCanvas.y, 1.0);
  field -= uFocus * vec2(aspect, 1.0);

  float weave = field.x + field.x * field.y + uClock * 0.1;
  float rung = mod(weave, 0.1);
  float ridge = length(field + rung);

  float tone = 1.0 - ridge + field.y * 0.5;
  tone = pow(clamp(tone, 0.0, 1.0), 1.1);

  vec2 edge = vPlane - 0.5;
  tone *= 1.0 - 0.7 * dot(edge, edge);
  tone = clamp(tone, 0.0, 1.0);

  vec2 cell = floor(pixel / max(uGrainSize, 1.0));
  float tick = floor(uClock * 24.0);
  float speck = silver(cell, tick) + silver(cell * 0.5 + 7.0, tick) * 0.5;
  float response = tone * (1.0 - tone) * 4.0;
  tone = clamp(tone * (1.0 + speck * 0.08 * response), 0.0, 1.0);

  vec3 tint = mix(uInk, uHot, smoothstep(0.3, 1.0, tone));
  gl_FragColor = vec4(mix(uBackdrop, tint, tone), 1.0);
}
`

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const getGL = (canvas: HTMLCanvasElement) => {
  const options = { alpha: true, antialias: false, premultipliedAlpha: true }
  return (canvas.getContext('webgl', options) ||
    canvas.getContext('experimental-webgl', options)) as WebGLRenderingContext | null
}

interface RollingBlindsProps {
  className?: string
  theme: Theme
}

const RollingBlinds = ({ className, theme }: RollingBlindsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const palette = BLINDS_THEME[theme]
  const colorRef = useRef(palette)

  useEffect(() => {
    colorRef.current = BLINDS_THEME[theme]
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = getGL(canvas)
    if (!gl) return

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        return null
      }
      return shader
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return
    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const pos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

    const uCanvas = gl.getUniformLocation(program, 'uCanvas')
    const uClock = gl.getUniformLocation(program, 'uClock')
    const uGrainSize = gl.getUniformLocation(program, 'uGrainSize')
    const uInk = gl.getUniformLocation(program, 'uInk')
    const uBackdrop = gl.getUniformLocation(program, 'uBackdrop')
    const uFocus = gl.getUniformLocation(program, 'uFocus')
    gl.uniform3fv(gl.getUniformLocation(program, 'uHot'), hexToRgb(BLINDS_HOT_COLOR))

    const pointer = { x: 0.5, y: 0.5 }
    const glide = { x: 0.5, y: 0.5 }
    const onMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect()
      if (!box.width || !box.height) return
      pointer.x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
      pointer.y = Math.min(1, Math.max(0, 1 - (event.clientY - box.top) / box.height))
    }
    const onLeave = () => {
      pointer.x = 0.5
      pointer.y = 0.5
    }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)

    let raf = 0
    let clock = 0
    let last = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (document.hidden) return
      clock += dt
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
      const paint = colorRef.current
      const ease = 1 - Math.exp(-dt * 6)
      glide.x += (pointer.x - glide.x) * ease
      glide.y += (pointer.y - glide.y) * ease
      gl.uniform2f(uCanvas, width, height)
      gl.uniform1f(uClock, clock)
      gl.uniform1f(uGrainSize, dpr)
      gl.uniform3fv(uInk, hexToRgb(paint.color))
      gl.uniform3fv(uBackdrop, hexToRgb(paint.backgroundColor))
      gl.uniform2f(uFocus, (glide.x - 0.5) * 0.6, (glide.y - 0.5) * 0.6)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(frame)

    const onLost = (event: Event) => {
      event.preventDefault()
      cancelAnimationFrame(raf)
    }
    canvas.addEventListener('webglcontextlost', onLost)

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('webglcontextlost', onLost)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} style={{ backgroundColor: palette.backgroundColor }} />
}

export default RollingBlinds
