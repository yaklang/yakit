import type { FC } from 'react'
import { useMemoizedFn } from 'ahooks'
import {
  FileTreeContentSearchView,
  resolveOpenHighlights,
  useClearFileSearchHighlights,
  type FileSearchFileItem,
  type FileSearchLine,
} from '@/components/FileTreeContentSearch'
import emiter from '@/utils/eventBus/eventBus'
import type { OpenFileByPathProps } from '../YakRunnerIrifyAiCodeAuditType'

interface RunnerFileTreeSearchViewProps {
  active?: boolean
  /** 当前打开的文件树根路径 */
  roots: { path: string }[]
}

export const RunnerFileTreeSearchView: FC<RunnerFileTreeSearchViewProps> = ({ active = false, roots }) => {
  const onOpenFile = useMemoizedFn((path: string, line?: FileSearchLine, fileItem?: FileSearchFileItem) => {
    const name = path.split(/[\\/]/).pop() || path
    const highLightRange = resolveOpenHighlights(line, fileItem)
    const OpenFileByPathParams: OpenFileByPathProps = {
      params: {
        path,
        name,
        parent: null,
        ...(highLightRange.length > 0 ? { highLightRange } : {}),
      },
    }
    emiter.emit('onAiCodeAuditOpenFileByPath', JSON.stringify(OpenFileByPathParams))
    const hit = highLightRange[0]
    if (hit) {
      emiter.emit(
        'onAiCodeAuditRevealSearchHit',
        JSON.stringify({ path, lineNumber: hit.startLineNumber, column: hit.startColumn }),
      )
    }
  })

  const { onSearchSettled } = useClearFileSearchHighlights(active, () => {
    emiter.emit('onAiCodeAuditClearFileSearchHighlights')
  })

  return (
    <FileTreeContentSearchView
      active={active}
      roots={roots}
      onOpen={onOpenFile}
      onSearchSettled={onSearchSettled}
      data-testid="ai-code-audit-file-tree-search-view"
    />
  )
}
