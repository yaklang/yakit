import type { StreamResult } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import { EditorLogShow, type FileLogShowDataProps, YakitLogFormatter } from '@/pages/invoker/YakitLogFormatter'
import { Timeline } from 'antd'
import React, { type ReactNode } from 'react'
import styles from './LocalPluginLog.module.scss'
import { useMemoizedFn } from 'ahooks'
import {
  ChartLogColorful,
  ErrorLogColorful,
  FileFailedLogColorful,
  FileLogColorful,
  FolderFailedLogColorful,
  FolderLogColorful,
  InfoLogColorful,
  MarkdownLogColorful,
  SuccessLogColorful,
  TextOutputLogColorful,
  WarningLogColorful,
} from '@yakit-libs/yakit-ui-icons/colorful'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { renderFileTypeIcon } from '@/components/MilkdownEditor/CustomFile/CustomFile'
import type { PluginExecuteLogFile } from './PluginExecuteResultType'
import { isPluginExecuteLogFileItem } from '@/pages/invoker/utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { JSONParseLog } from '@/utils/tool'

interface LocalPluginLogList extends StreamResult.Log {}
interface LocalPluginLogProps {
  loading: boolean
  list: LocalPluginLogList[]
  heard?: ReactNode
}

const getFileExtension = (filename) => {
  if (!filename || typeof filename !== 'string') return ''

  // 方法1: 使用 split
  const parts: string[] = filename.split('.')
  if (parts.length === 1) return '' // 没有扩展名
  return parts.pop()?.toLowerCase() || ''
}

/**插件日志 */
export const LocalPluginLog: React.FC<LocalPluginLogProps> = React.memo((props) => {
  const { loading, list, heard } = props
  const { t, i18n } = useI18nNamespaces(['plugin'])
  const logLevelToDot = useMemoizedFn((item) => {
    let key = item.level
    if (key === 'file') {
      try {
        const fileItem = JSONParseLog(item.data, { page: 'LocalPluginLog', fun: 'logLevelToDot' }) as
          | PluginExecuteLogFile.FileItem
          | FileLogShowDataProps
        if (isPluginExecuteLogFileItem(fileItem)) {
          const newFileIte = { ...fileItem } as PluginExecuteLogFile.FileItem
          if (newFileIte.is_dir) {
            key = 'folder'
          } else {
            const fileType = getFileExtension(newFileIte.path)
            return renderFileTypeIcon({
              type: fileType,
              iconClassName: styles['info-icon'],
            })
          }
        } else {
          const oldFileItem = { ...fileItem } as FileLogShowDataProps
          if (oldFileItem.is_dir) {
            key = 'folder'
            if (!oldFileItem.is_existed) {
              key = 'folder-error'
            }
          } else {
            key = 'file'
            if (!oldFileItem.is_existed) {
              key = 'file-error'
            }
          }
        }
      } catch (error) {}
    }
    switch (key) {
      case 'warn':
        return <WarningLogColorful />
      case 'error':
        return <ErrorLogColorful />
      case 'success':
        return <SuccessLogColorful />
      case 'code':
      case 'text':
        return <TextOutputLogColorful />
      case 'json-graph':
        return <ChartLogColorful />
      case 'folder-error':
        return <FolderFailedLogColorful />
      case 'folder':
        return <FolderLogColorful />
      case 'file-error':
        return <FileFailedLogColorful />
      case 'file':
        return <FileLogColorful />
      case 'markdown':
        return <MarkdownLogColorful />
      default:
        return <InfoLogColorful className={styles['info-icon']} />
    }
  })
  return (
    <div className={styles['log-body']}>
      {heard && <div className={styles['log-heard']}>{heard}</div>}
      {!loading && list.length === 0 ? (
        <YakitEmpty style={{ paddingTop: 48 }} title={t('LocalPluginLog.no_log_information')} />
      ) : (
        <Timeline
          reverse={true}
          pending={loading}
          pendingDot={
            <div className={styles['log-pending-dot']}>
              <div className={styles['log-pending-dot-circle']}></div>
            </div>
          }
          style={{ margin: '10px 10px 0 8px' }}
        >
          {list.map((e, index) => {
            return (
              <Timeline.Item key={e.id} color="" dot={<>{logLevelToDot(e)}</>}>
                <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp} />
              </Timeline.Item>
            )
          })}
        </Timeline>
      )}
    </div>
  )
})
interface LocalListProps {
  list: LocalPluginLogList[]
}
/**统计图表 */
export const LocalList: React.FC<LocalListProps> = React.memo((props) => {
  const { list } = props
  return (
    <div className={styles['local-list']}>
      {list.map((e) => {
        return (
          <React.Fragment key={e.id}>
            <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp} showTime={false} />
          </React.Fragment>
        )
      })}
    </div>
  )
})
interface LocalTextProps {
  list: LocalPluginLogList[]
}
export const LocalText: React.FC<LocalTextProps> = React.memo((props) => {
  const { list } = props
  return (
    <div className={styles['local-text-list']}>
      {list.map((item) => {
        return (
          <React.Fragment key={item.id}>
            <EditorLogShow {...item} showTime={false} />
          </React.Fragment>
        )
      })}
    </div>
  )
})
