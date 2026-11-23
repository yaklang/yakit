import { useLayoutEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'

/** 按输入区实际高度判断左侧完整标签和添加按钮是否放得下。 */
export const useSideTagsOverflow = (isWide: boolean, tagCount: number, showScenarioCapabilities?: boolean) => {
  const inputLayoutRef = useRef<HTMLDivElement>(null)
  const [sideTagsOverflow, setSideTagsOverflow] = useState(false)
  const measure = useMemoizedFn(() => {
    if (!isWide || !tagCount) return
    const row = inputLayoutRef.current?.querySelector<HTMLElement>('[data-ai-summary-row]')
    const footer = inputLayoutRef.current?.querySelector<HTMLElement>('[data-ai-input-footer]')
    if (!row || !footer) return

    const tagHeight = row.querySelector('[data-ai-summary-tag]')?.getBoundingClientRect().height
    const footerRect = footer.getBoundingClientRect()
    if (!tagHeight || !footerRect.height) return
    const style = getComputedStyle(row)
    const available = footerRect.top - row.getBoundingClientRect().top - (parseFloat(style.paddingTop) || 0)
    const gap = parseFloat(style.rowGap) || 0
    const addHeight = row.querySelector('[data-ai-side-material-add]')?.getBoundingClientRect().height ?? 0
    // 始终使用合并前的数量，输入区增高后才能恢复独立标签。
    const tagsHeight = tagCount * tagHeight + (tagCount - 1) * gap
    setSideTagsOverflow(tagsHeight + (addHeight ? addHeight + gap : 0) > available)
  })

  // 能力开关会替换输入区子树，此时重新绑定观察目标。
  useLayoutEffect(() => {
    if (!isWide) return
    const row = inputLayoutRef.current?.querySelector<HTMLElement>('[data-ai-summary-row]')
    const footer = inputLayoutRef.current?.querySelector<HTMLElement>('[data-ai-input-footer]')
    const input = footer?.parentElement
    if (!row || !footer || !input) return

    const observer = new ResizeObserver(measure)
    observer.observe(input)
    observer.observe(footer)
    observer.observe(row)
    return () => observer.disconnect()
  }, [isWide, showScenarioCapabilities])

  // 数量变化直接重算，复用已绑定的 ResizeObserver。
  useLayoutEffect(() => {
    measure()
  }, [isWide, tagCount, showScenarioCapabilities])

  return { inputLayoutRef, sideTagsOverflow }
}
