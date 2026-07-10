import React, { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
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
  dpr?: number
}

const tilesVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const tilesFragment = /* glsl */ `
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

const int   MAX_LAYERS    = 8;
const float GOLDEN_ANGLE  = 2.39996323;

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

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return [0, 0, 0]
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
}

type SceneProps = Required<Omit<GlassTilesProps, 'width' | 'height' | 'className' | 'children' | 'dpr'>>

const TilesScene: React.FC<SceneProps> = (props) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const { size } = useThree()

  useFrame((state) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.ShaderMaterial
    const u = mat.uniforms

    u.uTime.value = state.clock.elapsedTime
    u.uRes.value.set(size.width, size.height)

    u.uSpeed.value = props.speed
    u.uDensity.value = props.tileDensity
    u.uLayers.value = Math.max(1, Math.min(8, Math.round(props.rippleLayers)))
    u.uWarp.value = props.warpStrength
    u.uBand.value = props.bandSharpness
    u.uChromatic.value = props.chromaticSpread
    u.uAlpha.value = props.opacity

    const a = hexToRgb(props.colorA)
    u.uColorA.value.set(a[0], a[1], a[2])
    const b = hexToRgb(props.colorB)
    u.uColorB.value.set(b[0], b[1], b[2])
    const bg = hexToRgb(props.backgroundColor)
    u.uBg.value.set(bg[0], bg[1], bg[2])
  })

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uSpeed: { value: 1 },
      uDensity: { value: 4 },
      uLayers: { value: 5 },
      uWarp: { value: 0.1 },
      uBand: { value: 3 },
      uChromatic: { value: 0.25 },
      uColorA: { value: new THREE.Vector3(0.05, 0.02, 0.1) },
      uColorB: { value: new THREE.Vector3(0.4, 0.5, 0.9) },
      uBg: { value: new THREE.Vector3(0, 0, 0) },
      uAlpha: { value: 1 },
    }),
    [],
  )

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial vertexShader={tilesVertex} fragmentShader={tilesFragment} uniforms={uniforms} transparent />
    </mesh>
  )
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
  backgroundColor = '#FFFFFF',
  opacity = 1,
  dpr = 1.5,
}) => {
  return (
    <div className={['glass-tiles-root', className].filter(Boolean).join(' ')} style={{ width, height }}>
      <Canvas
        className="glass-tiles-canvas"
        dpr={[1, dpr]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
        }}
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
        <TilesScene
          speed={speed}
          tileDensity={tileDensity}
          rippleLayers={rippleLayers}
          warpStrength={warpStrength}
          bandSharpness={bandSharpness}
          chromaticSpread={chromaticSpread}
          colorA={colorA}
          colorB={colorB}
          backgroundColor={backgroundColor}
          opacity={opacity}
        />
      </Canvas>
      {children && <div className="glass-tiles-content">{children}</div>}
    </div>
  )
}

GlassTiles.displayName = 'GlassTiles'

export default GlassTiles
