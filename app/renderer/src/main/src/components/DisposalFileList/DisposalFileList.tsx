import { PaperClipOutlined, XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import numeral from 'numeral'
import { downloadDisposalFile } from '@/utils/disposalDownload'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import type { TextareaForFile } from '@/pages/pluginEditor/pluginImageTextarea/PluginImageTextareaType'
import styles from './DisposalFileList.module.scss'

interface DisposalFileListProps {
  files?: TextareaForFile[]
  editable?: boolean
  onRemove?: (index: number) => void
}

export const DisposalFileList = ({ files, editable, onRemove }: DisposalFileListProps) => {
  if (!files?.length) return null
  return (
    <div className={styles.files}>
      {files.map((file, index) => (
        <div key={`${file.url}-${index}`} className={styles.file}>
          <PaperClipOutlined className={styles.icon} />
          <span className={styles.name} title={file.name}>
            {file.name}
          </span>
          <span className={styles.size}>{numeral(file.size).format('0.[00] ib')}</span>
          {editable ? (
            <YakitButton
              type="text2"
              disabled={!onRemove}
              aria-label={`移除附件 ${file.name}`}
              icon={<XOutlined />}
              onClick={() => onRemove?.(index)}
            />
          ) : (
            <a
              href={file.url}
              download={file.name}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                void downloadDisposalFile(file.url, file.name)
              }}
            >
              下载
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
