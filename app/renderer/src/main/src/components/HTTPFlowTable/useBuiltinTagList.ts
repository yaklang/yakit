import { useEffect, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { FiltersItemProps } from '../TableVirtualResize/TableVirtualResizeType'
import { yakitNotify } from '@/utils/notification'
import { fetchHTTPFlowsFieldGroup } from '@/utils/httpFlowFieldGroupCache'

export const useBuiltinTagList = (enabled = true, inViewport = true) => {
  const [builtinTagList, setBuiltinTagList] = useState<FiltersItemProps[]>([])

  const refreshBuiltinTags = useMemoizedFn(() => {
    fetchHTTPFlowsFieldGroup(true)
      .then((rsp) => {
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
    fetchHTTPFlowsFieldGroup(false)
      .then((rsp) => {
        const tags = (rsp.Tags || [])
          .filter(({ Builtin, Value }) => Builtin && Value)
          .map(({ Value }) => ({ label: Value, value: Value }))
        setBuiltinTagList(tags)
      })
      .catch((error) => {
        yakitNotify('error', `query HTTP Flows Field Group failed: ${error}`)
      })
  }, [enabled, inViewport])

  return { builtinTagList, setBuiltinTagList, refreshBuiltinTags }
}
