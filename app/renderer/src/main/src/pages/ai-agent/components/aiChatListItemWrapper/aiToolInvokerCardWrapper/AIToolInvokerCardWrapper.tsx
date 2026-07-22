import { FC, memo } from 'react'
import type { AIToolInvokerCardWrapperProps } from './type'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useCreation } from 'ahooks'
import { useStore } from 'zustand'
import ToolInvokerCard from '../../ToolInvokerCard'

const AIToolInvokerCardWrapper: FC<AIToolInvokerCardWrapperProps> = memo((props) => {
  const { itemData, renderNum } = props
  const store = useCurrentStore()
  const execFileRecord = useStore(store, (state) => state.execFileRecord)
  const fileList = useCreation(() => {
    if (!itemData?.data?.callToolId) return []
    return execFileRecord.get(itemData?.data?.callToolId) || []
  }, [renderNum, itemData?.data?.callToolId])

  return <ToolInvokerCard {...props} fileList={fileList} />
})

export default AIToolInvokerCardWrapper
