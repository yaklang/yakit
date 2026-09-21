import styles from './AIFileSystemList.module.scss'
import FileTreeSystem from './FileTreeSystem/FileTreeSystem'
import { memo } from 'react'

interface AIFileSystemListProps {
  onFilePreviewChange?: (hasPreview: boolean) => void
}

export const AIFileSystemList = memo((props: AIFileSystemListProps) => {
  const { onFilePreviewChange } = props
  return (
    <div className={styles['ai-file-system']}>
      <FileTreeSystem onFilePreviewChange={onFilePreviewChange} />
    </div>
  )
})
