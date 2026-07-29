const VECTOR_PATH =
  'M19 -15.666L-21 53.616M43 -15.666L3 53.616M67 -15.666L27 53.616M91 -15.666L51 53.616M115 -15.666L75 53.616M139 -15.666L99 53.616M163 -15.666L123 53.616M187 -15.666L147 53.616M211 -15.666L171 53.616'

const STRIPE_STOP_OPACITY = 0.5

/** 将 var(--xxx) 解析为实际 rgb 颜色 */
export function resolveCssColor(value: string): string {
  if (!value) return ''
  if (!value.startsWith('var(')) return value

  const probe = document.createElement('span')
  probe.style.color = value
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  probe.style.pointerEvents = 'none'
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  document.body.removeChild(probe)

  return resolved && resolved !== 'rgba(0, 0, 0, 0)' ? resolved : ''
}

/** 生成左侧斜纹渐隐的 SVG 背景图 data URL */
export function buildVectorStripeBgImage(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="216" height="40" viewBox="0 0 216 40" fill="none"><defs><linearGradient id="g" x1="-21" y1="18.975" x2="211" y2="18.975" gradientUnits="userSpaceOnUse"><stop stop-color="${color}" stop-opacity="${STRIPE_STOP_OPACITY}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${VECTOR_PATH}" stroke="url(#g)" stroke-width="10"/></svg>`

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
