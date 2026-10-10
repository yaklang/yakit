'use client'

import { useRef, useMemo, useCallback, useState, type FC, type ReactNode, type PointerEvent } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import './gradient-bars.css'

export interface GradientBarsProps {
  /** Container width */
  width?: string | number
  /** Container height */
  height?: string | number
  /** Additional CSS classes */
  className?: string
  /** Content rendered above the effect */
  children?: ReactNode
  /** Number of stripes */
  barCount?: number
  /** Gradient curve exponent (0–1) */
  gradientPower?: number
  /** Black/white balance (0–1) */
  balance?: number
  /** Animation speed */
  speed?: number
  /** Phase offset between stripes (0–16) */
  phaseSpread?: number
  /** Horizontal mirror repetitions */
  mirrorRepeat?: number
  /** Alternate direction on odd stripes (0–1) */
  alternateDirection?: number
  /** Speed of direction inversion oscillation */
  invertSpeed?: number
  /** Phase multiplier for animation range (1–16) */
  phaseRange?: number
  /** Easing curve power (1=linear, 2=quad, 3=cubic, etc.) */
  curvePower?: number
  /** Easing mode: 0=in, 1=out, 2=in-out */
  easingMode?: number
  /** Use vertical columns (true) or horizontal rows (false) */
  vertical?: boolean
  /** Tint color in hex */
  color?: string
  /** Background gradient color in hex */
  backgroundColor?: string
  /** Master opacity */
  opacity?: number
  /** Enable cursor interaction to shift the phase offset */
  cursorInteraction?: boolean
}

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform float uBars;
uniform float uCurve;
uniform float uBalance;
uniform float uSpeed;
uniform float uSpread;
uniform float uMirror;
uniform float uAltDir;
uniform float uFlipRate;
uniform float uRange;
uniform float uPower;
uniform int uMode;
uniform bool uVertical;
uniform vec3 uTint;
uniform vec3 uBg;
uniform float uAlpha;
uniform vec2 uPointer;
uniform float uCursorActive;

const float TAU = 6.2831853;

float ease(float t, float p, int m) {
  if (m == 1) return 1.0 - pow(1.0 - t, p);
  if (m == 2) return t < 0.5
    ? pow(2.0, p - 1.0) * pow(t, p)
    : 1.0 - pow(-2.0 * t + 2.0, p) / 2.0;
  return pow(t, p);
}

float remap(float v, float b) {
  float g = exp(mix(-2.0, 2.0, b));
  return pow(v, g);
}

void main() {
  vec2 coord = vUv;

  float ax1 = uVertical ? coord.x : coord.y;
  float ax2 = uVertical ? coord.y : coord.x;

  float sym = abs(ax1 - 0.5) * uMirror;
  float band = floor(sym * uBars + 0.5);

  float cursorPhase = ((uPointer.x - 0.5) * 2.0 + (uPointer.y - 0.5)) * 0.5 * uCursorActive;
  float pOff = band * (1.0 / (uBars * max(uSpread, 0.001)));
  float phi = fract(uTime * uSpeed + pOff + cursorPhase);
  float wave = ease(phi, uPower, uMode) * uRange - (uRange / 2.0);

  bool even = mod(band, 2.0) < 1.0;
  float flipped = even ? ax2 : 1.0 - ax2;
  ax2 = mix(ax2, flipped, uAltDir);

  float grad = pow(ax2, uCurve);
  grad = mix(grad, 1.0 - grad, 0.5 + sin(uTime * uFlipRate) * 0.5);

  float anim = fract(wave + grad);
  float val = 0.5 + 0.5 * sin(anim * TAU);
  val = remap(val, uBalance);

  vec3 out_col = mix(uTint, uBg, val);
  gl_FragColor = vec4(out_col, uAlpha);
}
`

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return [0, 0, 0]
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
}

interface BarSceneProps {
  speed: number
  barCount: number
  gradientPower: number
  balance: number
  phaseSpread: number
  mirrorRepeat: number
  alternateDirection: number
  invertSpeed: number
  phaseRange: number
  curvePower: number
  easingMode: number
  vertical: boolean
  color: string
  backgroundColor: string
  opacity: number
  pointer: [number, number]
  cursorInteraction: boolean
}

const BarScene: FC<BarSceneProps> = ({
  speed,
  barCount,
  gradientPower,
  balance,
  phaseSpread,
  mirrorRepeat,
  alternateDirection,
  invertSpeed,
  phaseRange,
  curvePower,
  easingMode,
  vertical,
  color,
  backgroundColor,
  opacity,
  pointer,
  cursorInteraction,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const { size } = useThree()
  const smoothPointer = useRef(new THREE.Vector2(0.5, 0.5))

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uBars: { value: 8 },
      uCurve: { value: 0.2 },
      uBalance: { value: 0.15 },
      uSpeed: { value: 0.1 },
      uSpread: { value: 4 },
      uMirror: { value: 2 },
      uAltDir: { value: 0 },
      uFlipRate: { value: 0.2 },
      uRange: { value: 2 },
      uPower: { value: 1 },
      uMode: { value: 0 },
      uVertical: { value: true },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
      uBg: { value: new THREE.Vector3(0, 0, 0) },
      uAlpha: { value: 1 },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uCursorActive: { value: 0 },
    }),
    [],
  )

  useFrame((state, delta) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uResolution.value.set(size.width, size.height)
    mat.uniforms.uBars.value = barCount
    mat.uniforms.uCurve.value = gradientPower
    mat.uniforms.uBalance.value = balance
    mat.uniforms.uSpeed.value = speed
    mat.uniforms.uSpread.value = phaseSpread
    mat.uniforms.uMirror.value = mirrorRepeat
    mat.uniforms.uAltDir.value = alternateDirection
    mat.uniforms.uFlipRate.value = invertSpeed
    mat.uniforms.uRange.value = phaseRange
    mat.uniforms.uPower.value = curvePower
    mat.uniforms.uMode.value = easingMode
    mat.uniforms.uVertical.value = vertical
    mat.uniforms.uAlpha.value = opacity

    const [cr, cg, cb] = hexToRgb(color)
    mat.uniforms.uTint.value.set(cr, cg, cb)

    const [br, bg, bb] = hexToRgb(backgroundColor)
    mat.uniforms.uBg.value.set(br, bg, bb)
    mat.uniforms.uCursorActive.value = cursorInteraction ? 1 : 0

    const ease = 1 - Math.exp(-delta / 0.15)
    smoothPointer.current.x += (pointer[0] - smoothPointer.current.x) * ease
    smoothPointer.current.y += (pointer[1] - smoothPointer.current.y) * ease
    mat.uniforms.uPointer.value.set(smoothPointer.current.x, smoothPointer.current.y)
  })

  return (
    /* eslint-disable react/no-unknown-property -- react-three-fiber props */
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial vertexShader={VERTEX_SHADER} fragmentShader={FRAGMENT_SHADER} uniforms={uniforms} transparent />
    </mesh>
    /* eslint-enable react/no-unknown-property */
  )
}

const GradientBars: FC<GradientBarsProps> = ({
  width = '100%',
  height = '100%',
  className,
  children,
  barCount = 8,
  gradientPower = 0.2,
  balance = 0.15,
  speed = 0.1,
  phaseSpread = 4,
  mirrorRepeat = 2,
  alternateDirection = 0,
  invertSpeed = 0.2,
  phaseRange = 2,
  curvePower = 1,
  easingMode = 0,
  vertical = true,
  color = '#ffffff',
  backgroundColor = '#000000',
  opacity = 1,
  cursorInteraction = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pointer, setPointer] = useState<[number, number]>([0.5, 0.5])

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!cursorInteraction) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const nx = (e.clientX - rect.left) / rect.width
      const ny = 1 - (e.clientY - rect.top) / rect.height
      setPointer([nx, ny])
    },
    [cursorInteraction],
  )

  return (
    <div
      ref={containerRef}
      className={`gradient-bars-container ${className || ''}`}
      style={{ width, height }}
      onPointerMove={handlePointerMove}
    >
      <Canvas
        className="gradient-bars-canvas"
        gl={{ antialias: true, alpha: true }}
        orthographic
        camera={{
          position: [0, 0, 1],
          zoom: 1,
          left: -1,
          right: 1,
          top: 1,
          bottom: -1,
        }}
      >
        <BarScene
          speed={speed}
          barCount={barCount}
          gradientPower={gradientPower}
          balance={balance}
          phaseSpread={phaseSpread}
          mirrorRepeat={mirrorRepeat}
          alternateDirection={alternateDirection}
          invertSpeed={invertSpeed}
          phaseRange={phaseRange}
          curvePower={curvePower}
          easingMode={easingMode}
          vertical={vertical}
          color={color}
          backgroundColor={backgroundColor}
          opacity={opacity}
          pointer={pointer}
          cursorInteraction={cursorInteraction}
        />
      </Canvas>
      {children && <div className="gradient-bars-content">{children}</div>}
    </div>
  )
}

GradientBars.displayName = 'GradientBars'

export default GradientBars
