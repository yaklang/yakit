import { useEffect, useRef } from 'react'
import type { Theme } from '@/hooks/useTheme'

/** 浅色取文档预览色，深色取组件默认色，高光按主题区分 */
const BLINDS_THEME = {
  light: { color: '#cbd5e1', hotColor: '#87afe4', backgroundColor: '#ffffff' },
  dark: { color: '#334155', hotColor: '#90b2de', backgroundColor: '#0a0a0a' },
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
  vec2 field = (pixel - 0.5 * uCanvas) / max(uCanvas.y, 1.0);

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

/** 与 Three.js Color 一致：hex 按 sRGB 解析后转成线性 RGB，再送进着色器 */
const srgbChannelToLinear = (channel: number) => {
  const x = channel / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return [srgbChannelToLinear((n >> 16) & 255), srgbChannelToLinear((n >> 8) & 255), srgbChannelToLinear(n & 255)]
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

    /** 上下文恢复后旧 program/buffer/shader 均已失效，须整套重建（WebGL 规范） */
    const buildScene = () => {
      const vs = compile(gl.VERTEX_SHADER, VERT)
      const fs = compile(gl.FRAGMENT_SHADER, FRAG)
      const disposeShaders = () => {
        if (vs) gl.deleteShader(vs)
        if (fs) gl.deleteShader(fs)
      }
      if (!vs || !fs) {
        disposeShaders()
        return null
      }
      const program = gl.createProgram()
      if (!program) {
        disposeShaders()
        return null
      }
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program)
        disposeShaders()
        return null
      }
      gl.useProgram(program)

      const buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const pos = gl.getAttribLocation(program, 'aPos')
      gl.enableVertexAttribArray(pos)
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

      return {
        program,
        buffer,
        vs,
        fs,
        uCanvas: gl.getUniformLocation(program, 'uCanvas'),
        uClock: gl.getUniformLocation(program, 'uClock'),
        uGrainSize: gl.getUniformLocation(program, 'uGrainSize'),
        uInk: gl.getUniformLocation(program, 'uInk'),
        uHot: gl.getUniformLocation(program, 'uHot'),
        uBackdrop: gl.getUniformLocation(program, 'uBackdrop'),
      }
    }

    let scene = buildScene()
    let raf = 0
    let clock = 0
    let last = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (document.hidden) return
      if (!scene) return
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
      gl.uniform2f(scene.uCanvas, width, height)
      gl.uniform1f(scene.uClock, clock)
      gl.uniform1f(scene.uGrainSize, dpr)
      gl.uniform3fv(scene.uInk, hexToRgb(paint.color))
      gl.uniform3fv(scene.uHot, hexToRgb(paint.hotColor))
      gl.uniform3fv(scene.uBackdrop, hexToRgb(paint.backgroundColor))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    if (scene) raf = requestAnimationFrame(frame)

    const onLost = (event: Event) => {
      event.preventDefault()
      cancelAnimationFrame(raf)
    }
    const onRestored = () => {
      cancelAnimationFrame(raf)
      scene = buildScene()
      last = performance.now()
      if (scene) raf = requestAnimationFrame(frame)
    }
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      if (scene) {
        gl.deleteBuffer(scene.buffer)
        gl.deleteProgram(scene.program)
        gl.deleteShader(scene.vs)
        gl.deleteShader(scene.fs)
      }
    }
  }, [])

  return <canvas ref={canvasRef} className={className} style={{ backgroundColor: palette.backgroundColor }} />
}

export default RollingBlinds
