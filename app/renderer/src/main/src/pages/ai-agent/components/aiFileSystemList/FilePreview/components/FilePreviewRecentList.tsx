import type { FC } from 'react'
import styles from './FilePreviewRecentList.module.scss'
import type { HistoryItem } from '../../type'

interface RecentFileItem extends HistoryItem {
  name: string
}

interface FilePreviewRecentListProps {
  title: string
  files: RecentFileItem[]
  onClickItem?: (item: RecentFileItem) => void
}

const FilePreviewRecentList: FC<FilePreviewRecentListProps> = ({ title, files, onClickItem }) => {
  return (
    <div className={styles['recent-list']}>
      <div className={styles['recent-list-title']}>{title}</div>
      <div className={styles['recent-list-content']}>
        {files.map((item) => {
          return (
            <div key={item.path} className={styles['recent-list-item']} onClick={() => onClickItem?.(item)}>
              <span className={styles['recent-list-name']}>{item.name}</span>
              <span className={styles['recent-list-path']}>{item.path}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FilePreviewRecentList
