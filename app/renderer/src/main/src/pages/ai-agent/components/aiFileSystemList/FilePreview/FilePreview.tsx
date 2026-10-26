import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { useEffect, useRef, useState, type FC } from 'react'
import styles from './FilePreview.module.scss'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { getCodeByPath, getCodeSizeByPath, MAX_FILE_SIZE_BYTES, monacaLanguageType } from '@/pages/yakRunner/utils'
import { getRunnerEditorHighlightProps } from '@/pages/yakRunner/RunnerTabs/runnerTabHighlightProps'
import { useMemoizedFn } from 'ahooks'
import { Result } from 'antd'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { yakitNotify } from '@/utils/notification'
import type { FileInfo } from '../type'
import { getLocalFileName } from '@/components/MilkdownEditor/CustomFile/utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIAgentFilePreviewHighlight } from '@/pages/ai-agent/aiChatContent/type'
import emiter from '@/utils/eventBus/eventBus'
import type { YakitIMonacoEditor } from '@/components/yakitUI/YakitEditor/YakitEditorType'
import { revealSearchHitOnEditor } from '@/components/FileTreeContentSearch'

const FilePreview: FC<{ data?: FileNodeProps; highlights?: AIAgentFilePreviewHighlight[] }> = ({
  data,
  highlights,
}) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const path = data?.path ?? ''

  const [showFileHint, setShowFileHint] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [isBinary, setIsBinary] = useState(false)

  const fetchFileInfo = useMemoizedFn(async (targetPath: string) => {
    if (!targetPath) return
    try {
      setLoading(true)
      const { size, isPlainText } = await getCodeSizeByPath(path)
      if (size > MAX_FILE_SIZE_BYTES) {
        setFileInfo(null)
        setShowFileHint(true)
        return
      }
      setIsBinary(!isPlainText)
      const content = await getCodeByPath(path)
      const file = await getLocalFileName(path)
      setFileInfo({ path, size, isPlainText, content, language: monacaLanguageType(file.suffix) })
    } catch (err) {
      yakitNotify('error', t('FilePreview.loadFailed', { error: String(err) }))
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    setFileInfo(null)
    setShowFileHint(false)
    if (path) {
      fetchFileInfo(path)
    }
  }, [path])

  // 仅按 path 挂载编辑器：高亮变化走 highLightFind 更新装饰，避免同文件点不同行整实例重挂卡顿
  const editorKey = fileInfo?.path || 'empty-editor'
  const editorRef = useRef<YakitIMonacoEditor>()

  const onRevealSearchHit = useMemoizedFn((data: string) => {
    revealSearchHitOnEditor(editorRef.current, path, data)
  })

  useEffect(() => {
    emiter.on('revealAIFilePreviewSearchHit', onRevealSearchHit)
    return () => {
      emiter.off('revealAIFilePreviewSearchHit', onRevealSearchHit)
    }
  }, [])

  return (
    <div className={styles['file-preview']}>
      <YakitSpin spinning={loading}>
        {isBinary ? (
          <Result
            status={'warning'}
            subTitle={t('FilePreview.binaryNotice')}
            extra={[
              <YakitButton key="open-anyway" size="max" type="primary" onClick={() => setIsBinary(false)}>
                {t('FilePreview.openAnyway')}
              </YakitButton>,
            ]}
          />
        ) : (
          <YakitEditor
            key={editorKey}
            value={fileInfo?.content}
            readOnly
            editorOperationRecord="YAK_RUNNNER_EDITOR_RECORF"
            type={fileInfo?.language === 'yak' ? 'yak' : 'plaintext'}
            editorDidMount={(editor) => {
              editorRef.current = editor
            }}
            {...getRunnerEditorHighlightProps(highlights?.length ? highlights : undefined)}
          />
        )}
      </YakitSpin>

      <YakitHint
        visible={showFileHint}
        title={t('FilePreview.warningTitle')}
        content={t('FilePreview.tooLarge')}
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={() => {
          setFileInfo(null)
          setShowFileHint(false)
        }}
        okButtonText={t('YakitButton.iKnow')}
      />
    </div>
  )
}
export default FilePreview
