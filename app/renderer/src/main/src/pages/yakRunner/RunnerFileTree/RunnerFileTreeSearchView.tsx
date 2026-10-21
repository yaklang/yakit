import type { FC } from 'react'
import { useMemoizedFn } from 'ahooks'
import {
  FileTreeContentSearchView,
  resolveOpenHighlights,
  type FileSearchFileItem,
  type FileSearchLine,
} from '@/components/FileTreeContentSearch'
import emiter from '@/utils/eventBus/eventBus'
import type { OpenFileByPathProps } from '../YakRunnerType'

interface RunnerFileTreeSearchViewProps {
  active?: boolean
  /** 当前打开的文件树根路径 */
  roots: { path: string }[]
}

/** yakRunner 文件树内容搜索：复用通用面板，打开文件走 onOpenFileByPath */
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
    emiter.emit('onOpenFileByPath', JSON.stringify(OpenFileByPathParams))
  })

  return (
    <FileTreeContentSearchView
      active={active}
      roots={roots}
      onOpen={onOpenFile}
      data-testid="runner-file-tree-search-view"
    />
  )
}
