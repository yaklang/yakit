const createIcon = (renderer: unknown, name: string) => ({ renderer, name })

export const NamedIcon = () => (
  <svg viewBox="0 0 16 16">
    <path d="M1 1h14v14H1z" />
  </svg>
)
const PrivateIcon = () => (
  <svg viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="7" />
  </svg>
)
export const ForwardedIcon = React.forwardRef(() => (
  <svg viewBox="0 0 16 16">
    <path d="M2 8h12" />
  </svg>
))
export const FactoryIcon = createIcon(
  () => (
    <svg viewBox="0 0 16 16">
      <path d="M8 1v14" />
    </svg>
  ),
  'FactoryIcon',
)
export const ChartVisual = () => (
  <svg viewBox="0 0 320 180">
    <polyline points="0,180 80,70 160,140 320,0" />
  </svg>
)

export { PrivateIcon }
