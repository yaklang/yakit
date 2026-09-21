import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'
import { useCreation } from 'ahooks'
import { type FC, memo } from 'react'
import ToolInvokerCard from '../../ToolInvokerCard'
import type { AIChildWindowToolInvokerCardProps } from './type'

const AIChildWindowToolInvokerCard: FC<AIChildWindowToolInvokerCardProps> = memo((props) => {
  const { itemData, renderNum } = props
  const { execFileRecord } = useAIConcurrentStreamStore()
  const fileList = useCreation(() => {
    if (!itemData?.data?.callToolId) return []
    return execFileRecord?.get(itemData?.data?.callToolId) || []
  }, [renderNum, itemData?.data?.callToolId])
  return <ToolInvokerCard {...props} fileList={fileList} />
})

export default AIChildWindowToolInvokerCard
