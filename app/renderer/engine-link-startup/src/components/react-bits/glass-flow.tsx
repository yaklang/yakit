import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import './glass-flow.css'

interface GlassFlowProps {
  width?: string | number
  height?: string | number
  className?: string
  imageSrc?: string
  videoSrc?: string
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
}

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
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
  float c = cos(theta);
  float s = sin(theta);
  return mat2(c, -s, s, c);
}

vec2 computeCoverUV(vec2 uv, vec2 containerSize, vec2 mediaSize) {
  float containerRatio = containerSize.x / containerSize.y;
  float mediaRatio = mediaSize.x / mediaSize.y;
  vec2 scaledSize = containerRatio < mediaRatio
    ? vec2(mediaSize.x * containerSize.y / mediaSize.y, containerSize.y)
    : vec2(containerSize.x, mediaSize.y * containerSize.x / mediaSize.x);
  vec2 offsetAmount = containerRatio < mediaRatio
    ? vec2((scaledSize.x - containerSize.x) * 0.5, 0.0)
    : vec2(0.0, (scaledSize.y - containerSize.y) * 0.5);
  return uv * containerSize / scaledSize + offsetAmount / scaledSize;
}

vec3 sampleWithBlur(sampler2D tex, vec2 uv, float blurAmount) {
  vec3 color = vec3(0.0);
  float total = 0.0;
  float blurSize = blurAmount * 0.01;
  for (float x = -2.0; x <= 2.0; x += 1.0) {
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      vec2 offset = vec2(x, y) * blurSize;
      color += texture2D(tex, uv + offset).rgb;
      total += 1.0;
    }
  }
  return color / total;
}

void main() {
  vec2 sampleUV = computeCoverUV(vUv, u_viewport, u_textureSize);
  vec2 centeredCoord = sampleUV - 0.5;
  vec2 rotatedCoord = createRotation(u_angle) * centeredCoord;

  float waveOffset = sin(u_time * u_waveSpeed + rotatedCoord.y * 10.0) * u_waveAmount * 0.02;
  float stripePhase = (rotatedCoord.x + waveOffset) * u_stripeCount + (u_time * u_speed);
  float stripePattern = fract(stripePhase);
  float curvedPattern = pow(stripePattern, u_lensCurvature);
  float displacementAmount = (curvedPattern - 0.5) * u_refraction;
  vec2 displacementVector = createRotation(-u_angle) * vec2(displacementAmount, 0.0);

  float totalBlur = u_frostAmount * 0.5;
  float aberrationScale = u_chromaticAberration * 0.01;
  vec3 outputColor;

  if (totalBlur > 0.01) {
    float redChannel = sampleWithBlur(u_texture, sampleUV + displacementVector, totalBlur).r;
    float greenChannel = sampleWithBlur(u_texture, sampleUV + displacementVector * 1.01 + vec2(aberrationScale, 0.0), totalBlur).g;
    float blueChannel = sampleWithBlur(u_texture, sampleUV + displacementVector * 1.02 + vec2(aberrationScale * 2.0, 0.0), totalBlur).b;
    outputColor = vec3(redChannel, greenChannel, blueChannel);
  } else {
    float redChannel = texture2D(u_texture, sampleUV + displacementVector).r;
    float greenChannel = texture2D(u_texture, sampleUV + displacementVector * 1.01 + vec2(aberrationScale, 0.0)).g;
    float blueChannel = texture2D(u_texture, sampleUV + displacementVector * 1.02 + vec2(aberrationScale * 2.0, 0.0)).b;
    outputColor = vec3(redChannel, greenChannel, blueChannel);
  }

  if (u_frostAmount > 0.0) {
    float grain = (randomNoise(vUv * 500.0 + u_time) - 0.5) * u_frostAmount * 0.15;
    outputColor += vec3(grain);
  }

  float edgeSoftness = mix(0.3, 0.01, u_edgeSharpness);
  float edgeHighlight = smoothstep(1.0 - u_edgeWidth - edgeSoftness, 1.0 - edgeSoftness * 0.5, stripePattern);
  outputColor += vec3(edgeHighlight * u_edgeBrightness);

  gl_FragColor = vec4(outputColor, 1.0);
}
`

interface ShaderPlaneProps {
  texture: THREE.Texture | null
  stripeCount: number
  angle: number
  lensCurvature: number
  refraction: number
  edgeWidth: number
  edgeBrightness: number
  speed: number
  chromaticAberration: number
  edgeSharpness: number
  waveSpeed: number
  waveAmount: number
  frostAmount: number
}

const ShaderPlane: React.FC<ShaderPlaneProps> = ({
  texture,
  stripeCount,
  angle,
  lensCurvature,
  refraction,
  edgeWidth,
  edgeBrightness,
  speed,
  chromaticAberration,
  edgeSharpness,
  waveSpeed,
  waveAmount,
  frostAmount,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { viewport, size } = useThree()

  const textureSize = useMemo(() => {
    if (texture?.image) {
      const img = texture.image
      const imgWidth = (img as HTMLImageElement).width || (img as HTMLVideoElement).videoWidth || 1920
      const imgHeight = (img as HTMLImageElement).height || (img as HTMLVideoElement).videoHeight || 1080
      return new THREE.Vector2(imgWidth, imgHeight)
    }
    return new THREE.Vector2(1920, 1080)
  }, [texture])

  const uniforms = useMemo(
    () => ({
      u_texture: { value: texture },
      u_viewport: { value: new THREE.Vector2(size.width, size.height) },
      u_textureSize: { value: textureSize },
      u_time: { value: 0 },
      u_stripeCount: { value: stripeCount },
      u_angle: { value: (angle * Math.PI) / 180 },
      u_lensCurvature: { value: lensCurvature },
      u_refraction: { value: refraction },
      u_edgeWidth: { value: edgeWidth },
      u_edgeBrightness: { value: edgeBrightness },
      u_edgeSharpness: { value: edgeSharpness },
      u_speed: { value: speed },
      u_chromaticAberration: { value: chromaticAberration },
      u_waveSpeed: { value: waveSpeed },
      u_waveAmount: { value: waveAmount },
      u_frostAmount: { value: frostAmount },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = state.clock.elapsedTime
      materialRef.current.uniforms.u_viewport.value.set(size.width, size.height)
      materialRef.current.uniforms.u_texture.value = texture
      materialRef.current.uniforms.u_textureSize.value = textureSize
      materialRef.current.uniforms.u_stripeCount.value = stripeCount
      materialRef.current.uniforms.u_angle.value = (angle * Math.PI) / 180
      materialRef.current.uniforms.u_lensCurvature.value = lensCurvature
      materialRef.current.uniforms.u_refraction.value = refraction
      materialRef.current.uniforms.u_edgeWidth.value = edgeWidth
      materialRef.current.uniforms.u_edgeBrightness.value = edgeBrightness
      materialRef.current.uniforms.u_edgeSharpness.value = edgeSharpness
      materialRef.current.uniforms.u_speed.value = speed
      materialRef.current.uniforms.u_chromaticAberration.value = chromaticAberration
      materialRef.current.uniforms.u_waveSpeed.value = waveSpeed
      materialRef.current.uniforms.u_waveAmount.value = waveAmount
      materialRef.current.uniforms.u_frostAmount.value = frostAmount
    }
  })

  if (!texture) return null

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}

const GlassFlow: React.FC<GlassFlowProps> = ({
  width = '100%',
  height = '100%',
  className = '',
  imageSrc,
  videoSrc,
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
}) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoSrc || !imageSrc) return
    const loader = new THREE.TextureLoader()
    loader.load(imageSrc, (loadedTexture) => {
      loadedTexture.wrapS = THREE.ClampToEdgeWrapping
      loadedTexture.wrapT = THREE.ClampToEdgeWrapping
      loadedTexture.minFilter = THREE.LinearFilter
      loadedTexture.magFilter = THREE.LinearFilter
      setTexture(loadedTexture)
    })
  }, [imageSrc, videoSrc])

  // Generate a blue gradient texture from a canvas if no imageSrc provided
  useEffect(() => {
    if (imageSrc || videoSrc) return
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, size, size)
    grad.addColorStop(0, '#0a1a40')
    grad.addColorStop(0.4, '#1a4080')
    grad.addColorStop(0.7, '#2860b0')
    grad.addColorStop(1, '#0d2050')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)

    const canvasTexture = new THREE.CanvasTexture(canvas)
    canvasTexture.wrapS = THREE.ClampToEdgeWrapping
    canvasTexture.wrapT = THREE.ClampToEdgeWrapping
    canvasTexture.minFilter = THREE.LinearFilter
    canvasTexture.magFilter = THREE.LinearFilter
    setTexture(canvasTexture)
  }, [imageSrc, videoSrc])

  useEffect(() => {
    if (!videoSrc) return
    const video = document.createElement('video')
    video.src = videoSrc
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    videoRef.current = video
    video.addEventListener('loadeddata', () => {
      const videoTexture = new THREE.VideoTexture(video)
      videoTexture.wrapS = THREE.ClampToEdgeWrapping
      videoTexture.wrapT = THREE.ClampToEdgeWrapping
      videoTexture.minFilter = THREE.LinearFilter
      videoTexture.magFilter = THREE.LinearFilter
      setTexture(videoTexture)
      video.play()
    })
    return () => {
      video.pause()
      video.src = ''
    }
  }, [videoSrc])

  const containerClassName = className ? `glass-flow-container ${className}` : 'glass-flow-container'

  return (
    <div className={containerClassName} style={{ width, height }}>
      <Canvas
        className="glass-flow-canvas"
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [0, 0, 1], fov: 75 }}
      >
        <ShaderPlane
          texture={texture}
          stripeCount={stripeCount}
          angle={angle}
          lensCurvature={lensCurvature}
          refraction={refraction}
          edgeWidth={edgeWidth}
          edgeBrightness={edgeBrightness}
          speed={speed}
          chromaticAberration={chromaticAberration}
          edgeSharpness={edgeSharpness}
          waveSpeed={waveSpeed}
          waveAmount={waveAmount}
          frostAmount={frostAmount}
        />
      </Canvas>
    </div>
  )
}

GlassFlow.displayName = 'GlassFlow'

export default GlassFlow
