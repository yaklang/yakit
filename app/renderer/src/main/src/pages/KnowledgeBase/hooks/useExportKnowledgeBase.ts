import { useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { ipc } from '@/services/ipc'
import { handleSaveFileSystemDialog } from '@/utils/fileSystemDialog'
import { randomString } from '@/utils/randomUtil'
import { failed, success } from '@/utils/notification'

export function useExportKnowledgeBase() {
  const controllerRef = useRef<AbortController>()
  useEffect(() => () => controllerRef.current?.abort(), [])
  return useMemoizedFn(async (KnowledgeBaseId: string, name?: string) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const onError = (error: unknown) => {
      if (!controller.signal.aborted) failed('导出知识库失败：' + error)
    }
    try {
      const file = await handleSaveFileSystemDialog({
        title: '导出知识库',
        defaultPath: name ? `export-${name}` : 'default-knowledge',
        filters: [{ name: 'Files', extensions: ['rag'] }],
      })
      if (controller.signal.aborted || file?.canceled || !file?.filePath) return
      await ipc.openStream(
        'grpc',
        'ExportKnowledgeBase',
        { KnowledgeBaseId, TargetPath: file.filePath },
        {
          token: randomString(40),
          signal: controller.signal,
          onError,
          onEnd() {
            if (!controller.signal.aborted) success('导出知识库成功')
          },
        },
      )
    } catch (error) {
      onError(error)
    }
  })
}
