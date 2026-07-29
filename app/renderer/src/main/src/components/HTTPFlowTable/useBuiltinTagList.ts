import { useEffect, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { FiltersItemProps } from '../TableVirtualResize/TableVirtualResizeType'
import { yakitNotify } from '@/utils/notification'
import { HTTPFlowsFieldGroupResponse } from './HTTPFlowTable.constants'

const { ipcRenderer } = window.require('electron')

export const useBuiltinTagList = (enabled = true, inViewport = true) => {
  const [builtinTagList, setBuiltinTagList] = useState<FiltersItemProps[]>([])

  const refreshBuiltinTags = useMemoizedFn(() => {
    ipcRenderer
      .invoke('HTTPFlowsFieldGroup', { RefreshRequest: true, IsAll: true })
      .then((rsp: HTTPFlowsFieldGroupResponse) => {
        const tags = (rsp.Tags || [])
          .filter(({ Builtin, Value }) => Builtin && Value)
          .map(({ Value }) => ({ label: Value, value: Value }))
        setBuiltinTagList(tags)
      })
      .catch((error) => {
        yakitNotify('error', `query HTTP Flows Field Group failed: ${error}`)
      })
  })

  useEffect(() => {
    if (!enabled || !inViewport) return
    refreshBuiltinTags()
  }, [enabled, inViewport])

  return { builtinTagList, setBuiltinTagList, refreshBuiltinTags }
}
