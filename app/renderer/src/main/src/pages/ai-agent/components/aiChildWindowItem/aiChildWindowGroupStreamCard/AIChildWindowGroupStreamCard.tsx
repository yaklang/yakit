import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'
import { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import { useCreation } from 'ahooks'
import { FC, memo } from 'react'
import AIChildWindowNodeItemWrapper from '../aiChildWindowNodeItemWrapper/AIChildWindowNodeItemWrapper'
import { AIChildWindowGroupStreamCardProps } from './type'
import styles from './AIChildWindowGroupStreamCard.module.scss'
/** 子窗口版 stream group 卡片，从 rawData 中按 parentGroupToken 查找子节点 */
const AIChildWindowGroupStreamCard: FC<AIChildWindowGroupStreamCardProps> = memo(({ token }) => {
  const { rawData, renderNum } = useAIConcurrentStreamStore()
  // 按 token + renderNum 缓存该 group 的子节点，避免每次渲染都全量 forEach
  const childItems = useCreation<AIChatQSData[]>(() => {
    if (!rawData) return []
    const items: AIChatQSData[] = []
    rawData.forEach((value) => {
      if (value.parentGroupToken === token) {
        items.push(value)
      }
    })
    return items
  }, [token, renderNum])

  return (
    <div className={styles['concurrent-stream-content-item']}>
      {childItems.map((item, index) => (
        <AIChildWindowNodeItemWrapper key={item.id} itemData={item} groupIndex={index} />
      ))}
    </div>
  )
})

export default AIChildWindowGroupStreamCard
