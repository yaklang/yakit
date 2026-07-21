import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { useEffect, useMemo, useRef, useState } from 'react'
import FilePreview from '../FilePreview/FilePreview'
import FileTreeSystemListWrapper from '../FileTreeSystemListWrapper/FileTreeSystemListWrapper'
import { useCustomFolder } from '../store/useCustomFolder'
import styles from './FileTreeSystem.module.scss'
import FileTreeDrop from '@/pages/ai-agent/aiChatWelcome/FileTreeDrop/FileTreeDrop'
import { Divider } from 'antd'
import useChatIPCStore from '@/pages/ai-agent/useContext/ChatIPCContent/useStore'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCreation } from 'ahooks'

interface FileTreeSystemProps {
  /** 是否有文件预览数据，用于外层自由对话变大 */
  onFilePreviewChange?: (hasPreview: boolean) => void
}

const FileTreeSystem = (props: FileTreeSystemProps) => {
  const { onFilePreviewChange } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  // 单选
  const [selected, setSelected] = useState<FileNodeProps>()
  // ai的文件夹
  const { grpcFolders } = useChatIPCStore().chatIPCData
  // 用户文件夹
  const customFolder = useCustomFolder()

  const filePreviewData = useMemo(() => {
    if (selected?.isFolder) return undefined
    return selected
  }, [selected])

  const hasPreview = !!filePreviewData

  const hasEmittedRef = useRef(false)

  // 与任务内容时间线一致：有预览时左侧 30%
  const [firstRatio, setFirstRatio] = useState('30%')

  useEffect(() => {
    onFilePreviewChange?.(hasPreview)
  }, [hasPreview])

  useEffect(() => {
    if (!filePreviewData) return
    if (hasEmittedRef.current) return

    setFirstRatio('30%')
    hasEmittedRef.current = true
  }, [filePreviewData])

  const firstNodeStyle = useCreation(() => {
    if (!hasPreview) {
      return { width: '100%', padding: '4px', overflow: 'hidden' as const }
    }
    return { width: '30%', padding: '4px', overflow: 'hidden' as const }
  }, [hasPreview])

  const secondNodeStyle = useCreation(() => {
    if (!hasPreview) {
      return {
        width: 0,
        minWidth: 0,
        maxWidth: 0,
        padding: 0,
        overflow: 'hidden' as const,
        flex: 'none',
      }
    }
    return { width: '70%' }
  }, [hasPreview])

  return (
    <YakitResizeBox
      firstRatio={hasPreview ? firstRatio : '100%'}
      secondRatio={hasPreview ? undefined : '0%'}
      lineDirection="right"
      firstMinSize={280}
      secondMinSize={hasPreview ? 100 : 0}
      lineStyle={{ width: hasPreview ? 4 : 0 }}
      freeze={hasPreview}
      isRecalculateWH={hasPreview}
      firstNodeStyle={firstNodeStyle}
      secondNodeStyle={secondNodeStyle}
      firstNode={
        <div className={styles.fileTreeSystemLeft}>
          <div className={styles.topPanel}>
            <FileTreeSystemListWrapper
              key="aiFolder"
              path={grpcFolders}
              selected={selected}
              setSelected={setSelected}
              title="AI Artifacts"
              isOpen={false}
            />
          </div>
          <Divider style={{ margin: 0 }} />
          <div className={styles.bottomPanel}>
            <FileTreeDrop>
              {({ setDragSource }) => (
                <FileTreeSystemListWrapper
                  isOpen
                  key="customFolder"
                  title={t('FileTreeSystem.myOpenedFiles')}
                  selected={selected}
                  path={customFolder}
                  setSelected={setSelected}
                  onTreeDragStart={() => {
                    setDragSource('AIRreeToChat')
                  }}
                  onTreeDragEnd={() => {
                    setDragSource(null)
                  }}
                />
              )}
            </FileTreeDrop>
          </div>
        </div>
      }
      secondNode={<FilePreview data={filePreviewData} />}
    />
  )
}

export default FileTreeSystem
