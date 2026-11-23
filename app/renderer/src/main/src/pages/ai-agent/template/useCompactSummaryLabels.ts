import { useLayoutEffect, useRef } from 'react'

const getRowWidth = (widths: number[], gap: number) =>
  widths.reduce((total, width) => total + width, 0) + Math.max(0, widths.length - 1) * gap

/** 返回从左侧起可以保留文案的标签数。每收起一个右侧标签，总宽度就减少它两种状态的宽差。 */
export const getFullSummaryCount = (full: number[], compact: number[], available: number, gap: number): number => {
  let width = getRowWidth(full, gap)
  let count = full.length
  while (count > 0 && width > available) {
    count -= 1
    width -= full[count] - compact[count]
  }
  return count
}

/** 横排空间不足时从右向左收起文案；切换到左侧纵排时恢复完整标签。 */
export const useCompactSummaryLabels = () => {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const row = ref.current
    if (!row) return

    let sizes: { tags: HTMLElement[]; full: number[]; compact?: number[] } | undefined
    const update = () => {
      const style = getComputedStyle(row)
      const available = row.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0)
      if (available <= 0) return
      if (style.flexDirection === 'column-reverse') {
        row
          .querySelectorAll('[data-ai-summary-tag][data-ai-compact]')
          .forEach((tag) => tag.removeAttribute('data-ai-compact'))
        sizes = undefined
        return
      }

      // 横排标签按内容定宽。仅容器变宽或变窄时，复用已测尺寸。
      if (!sizes) {
        const tags = Array.from(row.querySelectorAll<HTMLElement>('[data-ai-summary-tag]'))
        tags.forEach((tag) => tag.removeAttribute('data-ai-compact'))
        sizes = { tags, full: tags.map((tag) => tag.getBoundingClientRect().width) }
      }
      const { tags, full } = sizes
      const gap = parseFloat(style.columnGap) || 0
      if (!sizes.compact) {
        if (getRowWidth(full, gap) <= available) return
        // 首次放不下时才测紧凑宽度，先统一切换样式，再一起读尺寸。
        tags.forEach((tag) => tag.setAttribute('data-ai-compact', ''))
        sizes.compact = tags.map((tag) => tag.getBoundingClientRect().width)
      }
      const count = getFullSummaryCount(full, sizes.compact, available, gap)
      tags.forEach((tag, index) => {
        const compact = index >= count
        if (tag.hasAttribute('data-ai-compact') !== compact) tag.toggleAttribute('data-ai-compact', compact)
      })
    }

    const remeasure = () => {
      sizes = undefined
      update()
    }
    update()
    const resize = new ResizeObserver(update)
    resize.observe(row)
    // 标签增删、文字、样式或字体变化会改变宽度。排除本 hook 自己写入的 data-ai-compact。
    const mutations = new MutationObserver(remeasure)
    mutations.observe(row, {
      childList: true,
      subtree: true,
      characterData: true,
      attributeFilter: ['class', 'style', 'width', 'data-ai-summary-tag', 'data-ai-summary-label'],
    })
    document.fonts?.addEventListener('loadingdone', remeasure)
    return () => {
      resize.disconnect()
      mutations.disconnect()
      document.fonts?.removeEventListener('loadingdone', remeasure)
    }
  }, [])

  return ref
}
