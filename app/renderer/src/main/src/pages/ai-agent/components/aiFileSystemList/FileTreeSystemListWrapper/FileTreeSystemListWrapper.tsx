import { FileListTileMenu, type FileTreeSystemListWrapperProps, type HistoryItem, PathIncludeResult } from '../type'
import { type FC, useEffect, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import styles from './FileTreeSystemListWrapper.module.scss'
import FileTreeSystemList from '../FileTreeSystemList/FileTreeSystemList'
import { ChevronDownOutlined, DocumentAddOutlined, FolderAddOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { checkPathIncludeRelation, mergePathArray, onOpenFileFolder } from '../utils'
import { yakitNotify } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

interface OnFileNotifyParams {
  uniquePaths: HistoryItem[]
  incoming: HistoryItem
  label: string
  path?: string
}

export const onFileNotify = async ({ uniquePaths, incoming, label, path }: OnFileNotifyParams) => {
  const relation = await checkPathIncludeRelation(uniquePaths, incoming)
  const pathText = path ? `：${path} ` : ''
  switch (relation) {
    case PathIncludeResult.Equal:
    case PathIncludeResult.OriginContains:
      yakitNotify('info', `所选${label}${pathText}已存在于列表中，无需重复添加。`)
      return
    case PathIncludeResult.IncomingContains:
      yakitNotify('info', `所选${label}${pathText}已包含列表中部分路径，已为您自动优化。`)
      break
    case PathIncludeResult.Error:
      yakitNotify('error', `添加${label}${pathText}时发生错误，请重试。`)
      break
    case PathIncludeResult.None:
      break
    default:
      break
  }
}

const FileTreeSystemListWrapper: FC<FileTreeSystemListWrapperProps> = ({
  variant,
  path,
  title,
  isOpen,
  fillHeight = true,
  showTitleActions = true,
  selected,
  setSelected,
  onTreeDragStart,
  onTreeDragEnd,
}) => {
  const { t } = useI18nNamespaces(['yakitUi'])
  // 展开
  const [expanded, setExpanded] = useState(true)

  // 去重path
  const [uniquePaths, setUniquePaths, getUniquePaths] = useGetSetState<HistoryItem[]>([])
  const showFileCount = variant === 'sidebar' && !isOpen
  const fileCount = useCreation(() => {
    if (!showFileCount) return undefined

    let count = 0
    for (const item of uniquePaths) {
      if (item.isFolder === false) count += 1
    }
    return count
  }, [showFileCount, uniquePaths])

  const renderContent = () => {
    if (isOpen && uniquePaths.length === 0) {
      return (
        <div>
          <YakitEmpty />
          <div className={styles['file-tree-system-title-btn']}>
            <YakitButton hidden={!isOpen} onClick={() => onOpenFileFolder(true)}>
              打开文件夹
            </YakitButton>
            <YakitButton hidden={!isOpen} type="outline1" onClick={() => onOpenFileFolder(false)}>
              打开文件
            </YakitButton>
          </div>
        </div>
      )
    }

    return uniquePaths.map((item) => (
      <FileTreeSystemList
        key={item.path}
        path={item.path}
        isOpen={isOpen}
        isFolder={item.isFolder}
        selected={selected}
        setSelected={setSelected}
        onTreeDragStart={onTreeDragStart}
        onTreeDragEnd={onTreeDragEnd}
      />
    ))
  }

  useEffect(() => {
    if (!path || path.length === 0) return setUniquePaths([])

    const current = getUniquePaths()
    if (path.length < current.length) return setUniquePaths(path)

    let cancelled = false

    const run = async () => {
      const next = await mergePathArray(current, path)

      if (!cancelled) {
        setUniquePaths(next)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [getUniquePaths, path, setUniquePaths])

  // 菜单选择事件
  const menuSelect = useMemoizedFn((key: FileListTileMenu) => {
    switch (key) {
      case FileListTileMenu.OpenFile:
        onOpenFileFolder(false)
        break
      case FileListTileMenu.OpenFolder:
        onOpenFileFolder(true)
        break
      default:
        break
    }
  })

  return (
    <div
      className={classNames(styles['file-tree-system'], {
        [styles['file-tree-system-fill']]: fillHeight,
        [styles['file-tree-system-sidebar']]: variant === 'sidebar',
      })}
    >
      <div className={styles['file-tree-system-title']}>
        <div className={styles['file-tree-system-title-toggle']} onClick={() => setExpanded((p) => !p)}>
          <ChevronDownOutlined
            style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            color="currentColor"
          />
          <span className={styles['file-tree-system-title-text']}>{title}</span>
          {showFileCount && (
            <YakitTag size="small" fullRadius border={false} className={styles['file-tree-system-count']}>
              {fileCount}
            </YakitTag>
          )}
        </div>

        {showTitleActions && (
          <div className={styles['file-tree-system-title-icon']}>
            <YakitButton
              hidden={!isOpen}
              type="text2"
              title={t('YakitButton.openFile')}
              aria-label={t('YakitButton.openFile')}
              onClick={() => menuSelect(FileListTileMenu.OpenFile)}
              icon={<DocumentAddOutlined color="currentColor" />}
            />
            <YakitButton
              hidden={!isOpen}
              type="text2"
              title={t('YakitButton.openFolder')}
              aria-label={t('YakitButton.openFolder')}
              onClick={() => menuSelect(FileListTileMenu.OpenFolder)}
              icon={<FolderAddOutlined color="currentColor" />}
            />
          </div>
        )}
      </div>
      {expanded && <div className={styles['file-tree-system-body']}>{renderContent()}</div>}
    </div>
  )
}

export default FileTreeSystemListWrapper
