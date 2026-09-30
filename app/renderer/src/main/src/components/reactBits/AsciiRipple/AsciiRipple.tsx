'use client'
import type React from 'react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import classNames from 'classnames'
import debounce from 'lodash/debounce'
import styles from './AsciiRipple.module.scss'
import { createRippleRenderer } from './AsciiRippleRenderer'
import type { RippleOptions } from './AsciiRippleEngine'
export type AsciiRippleEdges = 'reflect' | 'absorb'
export interface AsciiRippleHandle {
  drop: (x: number, y: number, strength?: number, radius?: number) => void
  calm: () => void
}
export interface AsciiRippleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** 背景文案，循环填满画布。 */
  text?: string
  /** 波纹激活时的替换字符，强度越高越倾向使用靠后的字符。 */
  chars?: string
  /** 字号（px）：越大文字越大，画布中的字符越少。 */
  fontSize?: number
  /** 行高倍数：越大行距越宽，越小越紧凑。 */
  lineHeight?: number
  /** 字体，建议使用等宽字体。 */
  fontFamily?: string
  /** 字重：数值越大文字越粗。 */
  fontWeight?: number | string
  /** 背景文字颜色，也是波纹颜色渐变的起点。 */
  textColor?: string
  /** 波峰文字的高亮颜色。 */
  rippleColor?: string
  /** 波谷文字的高亮颜色。 */
  troughColor?: string
  /** 画布背景色，transparent 表示透明。 */
  backgroundColor?: string
  /** 背景文字不透明度（0–1）：越大越清晰，0 隐藏背景文字。 */
  textOpacity?: number
  /** 模拟网格精度（1–4）：越大越细腻，但计算量越大。 */
  resolution?: number
  /** 波纹传播速度（0–1）：越大越快，0 仍会传播。 */
  speed?: number
  /** 阻尼（0–0.5）：越大消散越快，越小持续越久。 */
  damping?: number
  /** 邻近网格的传递强度（0–1）：越大传播越快，受 speed 上限约束。 */
  viscosity?: number
  /** 边缘模式：reflect 反射波纹，absorb 吸收波纹。 */
  edges?: AsciiRippleEdges
  /** 点击扰动强度：越大波纹越强，越小越弱。 */
  dropStrength?: number
  /** 点击的初始扰动半径（px）：越大起始范围越宽，不限制最终扩散范围。 */
  dropRadius?: number
  /** 鼠标移动的扰动强度：越大拖尾越明显，0 关闭移动扰动。 */
  dragStrength?: number
  /** 鼠标移动的扰动半径（px）：越大拖尾越宽，越小越窄。 */
  dragRadius?: number
  /** 自动落雨频率（次/秒）：越大越密集，0 关闭；鼠标交互期间暂停落雨。 */
  rain?: number
  /** 自动落雨强度：越大雨滴波纹越强，越小越弱。 */
  rainStrength?: number
  /** 波高的显示增益：越大越容易高亮字符，越小越柔和。 */
  sensitivity?: number
  /** 波面斜率的显示增益：越大波纹边缘越明显，越小越柔和。 */
  slopeGain?: number
  /** 文字折射强度：越大字符偏移越明显，0 关闭偏移。 */
  refraction?: number
  /** 字符替换强度：越大越容易替换成 chars 中的字符，0 关闭替换。 */
  scramble?: number
  /** 替换字符的刷新间隔（ms，最低 16）：越小变化越快，越大越慢。 */
  scrambleSpeed?: number
  /** 替换阈值的随机扰动：越大分布越不规则，0 使用统一阈值。 */
  dither?: number
  /** 边缘淡出范围（0–1）：越大淡出区域越宽，0 关闭淡出。 */
  vignette?: number
  /** 是否响应鼠标移动和点击。 */
  interactive?: boolean
  /** 可选的交互容器，用于背景被内容层覆盖的场景。 */
  interactionTargetRef?: React.RefObject<HTMLElement | null>
}
const DEFAULT_TEXT =
  'Low tide leaves the rock shelf glazed and quiet, pools that remain are small enough to hold in one long look. A shrimp no bigger than a comma drifts above sand, its shadow arriving moment before it does. The surface is second sky. Cloud passes through it, then gull, tremble of my own breath as I lean too close. Nothing here still, only slow. Anemones open with patience clocks. Weed lifts settles though water were remembering wave once carried farther up shore. When drop falls from sleeve whole pool answers at once, rings running outward until they meet stone come back folded over themselves, smaller, quieter, braided into pattern was never quite round. Light bends moving glass sand below wavers, letters on page read tears. count returns. Four, five, forgets sky again. Farther out real sea keeps time, heavy unhurried, sending same news channel has always sent. listens. It repeats every word smaller voice, then, when sure watching, goes being mirror.'
const DEFAULT_CHARS = '·.,:;-~=+*%#@'
const RAMP_STEPS = 24
// 限制高分屏画布与缓存的像素量。
const MAX_PIXEL_RATIO = 1.5
type Rgba = [number, number, number, number]
const parseColor = (input: string): Rgba => {
  if (typeof document === 'undefined') return [255, 255, 255, 1]
  const probe = document.createElement('canvas')
  probe.width = probe.height = 1
  const ctx = probe.getContext('2d')
  if (!ctx) return [255, 255, 255, 1]
  ctx.fillStyle = input
  ctx.fillRect(0, 0, 1, 1)
  const d = ctx.getImageData(0, 0, 1, 1).data
  return [d[0], d[1], d[2], d[3] / 255]
}
const mixColor = (a: Rgba, b: Rgba, t: number) => {
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  const al = (a[3] + (b[3] - a[3]) * t).toFixed(3)
  return `rgba(${r},${g},${bl},${al})`
}
const AsciiRipple = forwardRef<AsciiRippleHandle, AsciiRippleProps>(
  (
    {
      text = DEFAULT_TEXT,
      chars = DEFAULT_CHARS,
      fontSize = 16,
      lineHeight = 1.2,
      fontFamily = 'ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace',
      fontWeight = 400,
      textColor = '#f5f5f4',
      rippleColor = '#ffffff',
      troughColor = '#ad57ff',
      backgroundColor = 'transparent',
      textOpacity = 0.15,
      resolution = 3,
      speed = 0.55,
      damping = 0.045,
      viscosity = 0.4,
      edges = 'absorb',
      dropStrength = 1.2,
      dropRadius = 26,
      dragStrength = 0.3,
      dragRadius = 16,
      rain = 0,
      rainStrength = 0.6,
      sensitivity = 2.2,
      slopeGain = 1,
      refraction = 4,
      scramble = 1,
      scrambleSpeed = 90,
      dither = 0.5,
      vignette = 0.6,
      interactive = true,
      interactionTargetRef,
      className,
      style,
      ...rest
    },
    ref,
  ) => {
    const rootRef = useRef<HTMLDivElement>(null)
    const rendererRef = useRef<ReturnType<typeof createRippleRenderer> | null>(null)
    const boundsRef = useRef({ left: 0, top: 0 })
    const insideRef = useRef(false)
    const ramps = useMemo(() => {
      const base = parseColor(textColor)
      const crest = parseColor(rippleColor)
      const trough = parseColor(troughColor)
      const up: string[] = []
      const down: string[] = []
      for (let i = 0; i <= RAMP_STEPS; i++) {
        up.push(mixColor(base, crest, i / RAMP_STEPS))
        down.push(mixColor(base, trough, i / RAMP_STEPS))
      }
      return { up, down }
    }, [textColor, rippleColor, troughColor])
    const options = useMemo<RippleOptions>(
      () => ({
        text,
        chars,
        font: `${fontWeight} ${fontSize}px ${fontFamily}`,
        fontSize,
        lineHeight,
        resolution,
        speed,
        damping,
        viscosity,
        edges,
        dropStrength,
        dropRadius,
        dragStrength,
        dragRadius,
        rain,
        rainStrength,
        sensitivity,
        slopeGain,
        refraction,
        scramble,
        scrambleSpeed,
        dither,
        vignette,
        textOpacity,
        interactive,
        backgroundColor,
        ramps,
      }),
      [
        text,
        chars,
        fontWeight,
        fontSize,
        fontFamily,
        lineHeight,
        resolution,
        speed,
        damping,
        viscosity,
        edges,
        dropStrength,
        dropRadius,
        dragStrength,
        dragRadius,
        rain,
        rainStrength,
        sensitivity,
        slopeGain,
        refraction,
        scramble,
        scrambleSpeed,
        dither,
        vignette,
        textOpacity,
        interactive,
        backgroundColor,
        ramps,
      ],
    )
    const optionsRef = useRef(options)
    useEffect(() => {
      optionsRef.current = options
      rendererRef.current?.update(options)
    }, [options])

    useEffect(() => {
      const root = rootRef.current
      if (!root) return
      let cancelled = false
      let observer: ResizeObserver | undefined
      let fontTimer: ReturnType<typeof setTimeout> | undefined
      const media = window.matchMedia('(prefers-reduced-motion: reduce)')
      const applyMotion = () => rendererRef.current?.setReducedMotion(media.matches)
      media.addEventListener('change', applyMotion)
      const fontsReady = document.fonts?.ready
        ? Promise.race([
            document.fonts.ready,
            new Promise((resolve) => {
              fontTimer = setTimeout(resolve, 1500)
            }),
          ])
        : Promise.resolve()
      fontsReady.then(() => {
        if (cancelled) return
        clearTimeout(fontTimer)
        const renderer = createRippleRenderer(root, optionsRef.current, styles['ascii-ripple__canvas'])
        rendererRef.current = renderer
        applyMotion()
        const resize = () => {
          const rect = root.getBoundingClientRect()
          boundsRef.current = { left: rect.left, top: rect.top }
          renderer.resize(
            Math.max(1, rect.width),
            Math.max(1, rect.height),
            Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1),
          )
        }
        resize()
        observer = new ResizeObserver(resize)
        observer.observe(root)
      })
      return () => {
        cancelled = true
        clearTimeout(fontTimer)
        observer?.disconnect()
        media.removeEventListener('change', applyMotion)
        rendererRef.current?.destroy()
        rendererRef.current = null
        insideRef.current = false
      }
    }, [])

    const localPoint = useCallback((e: { clientX: number; clientY: number }) => {
      const root = rootRef.current
      if (!root) return null
      if (!insideRef.current) {
        const rect = root.getBoundingClientRect()
        boundsRef.current = { left: rect.left, top: rect.top }
      }
      return { x: e.clientX - boundsRef.current.left, y: e.clientY - boundsRef.current.top }
    }, [])
    const onPointerMove = useCallback(
      (e: { clientX: number; clientY: number }) => {
        if (!interactive) return
        const point = localPoint(e)
        if (!point) return
        insideRef.current = true
        rendererRef.current?.move(point.x, point.y)
      },
      [interactive, localPoint],
    )
    const onPointerDown = useMemo(
      () =>
        debounce(
          (e: { clientX: number; clientY: number }) => {
            if (!interactive) return
            const point = localPoint(e)
            if (!point) return
            insideRef.current = true
            const renderer = rendererRef.current
            renderer?.leave()
            renderer?.move(point.x, point.y)
            renderer?.drop(point.x, point.y)
          },
          200,
          { leading: true },
        ),
      [interactive, localPoint],
    )
    useEffect(() => () => onPointerDown.cancel(), [onPointerDown])
    const onPointerLeave = useCallback(() => {
      onPointerDown.cancel()
      insideRef.current = false
      rendererRef.current?.leave()
    }, [onPointerDown])
    useEffect(() => {
      window.addEventListener('scroll', onPointerLeave, true)
      return () => window.removeEventListener('scroll', onPointerLeave, true)
    }, [onPointerLeave])
    useEffect(() => {
      const target = interactionTargetRef?.current
      if (!target) return
      const isDisabled = (event: PointerEvent) =>
        event.target instanceof Element && !!event.target.closest('[data-ai-ripple-disabled]')
      const move = (event: PointerEvent) => {
        if (isDisabled(event)) onPointerLeave()
        else onPointerMove(event)
      }
      const down = (event: PointerEvent) => {
        if (isDisabled(event)) onPointerLeave()
        else onPointerDown(event)
      }
      target.addEventListener('pointermove', move)
      target.addEventListener('pointerdown', down)
      target.addEventListener('pointerleave', onPointerLeave)
      return () => {
        target.removeEventListener('pointermove', move)
        target.removeEventListener('pointerdown', down)
        target.removeEventListener('pointerleave', onPointerLeave)
      }
    }, [interactionTargetRef, onPointerMove, onPointerDown, onPointerLeave])
    useImperativeHandle(
      ref,
      () => ({
        drop: (x, y, strength, radius) => rendererRef.current?.drop(x, y, strength, radius),
        calm: () => {
          onPointerDown.cancel()
          insideRef.current = false
          rendererRef.current?.calm()
        },
      }),
      [onPointerDown],
    )
    return (
      <div
        ref={rootRef}
        className={classNames(styles['ascii-ripple'], className)}
        style={style}
        onPointerMove={interactionTargetRef ? undefined : onPointerMove}
        onPointerLeave={interactionTargetRef ? undefined : onPointerLeave}
        onPointerDown={interactionTargetRef ? undefined : onPointerDown}
        {...rest}
      />
    )
  },
)
AsciiRipple.displayName = 'AsciiRipple'
export default AsciiRipple
