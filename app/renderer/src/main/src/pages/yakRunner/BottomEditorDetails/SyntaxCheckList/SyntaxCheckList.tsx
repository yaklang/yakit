import type React from 'react'
import { useMemoizedFn } from 'ahooks'
import styles from './SyntaxCheckList.module.scss'
import classNames from 'classnames'
import type { IMonacoEditorMarker } from '@/utils/editorMarkers'
import { FigmaIcon22915169930Outlined } from '@yakit-libs/yakit-ui-icons/outline'
import { ExclamationSolid, InformationCircleSolid, XCircleSolid } from '@yakit-libs/yakit-ui-icons/solid'
import type { Selection } from '../../RunnerTabs/RunnerTabsType'
const { ipcRenderer } = window.require('electron')
export interface SyntaxCheckListProps {
  syntaxCheckData: IMonacoEditorMarker[]
  onJumpToEditor: (v: Selection) => void
}
export const SyntaxCheckList: React.FC<SyntaxCheckListProps> = (props) => {
  const { syntaxCheckData, onJumpToEditor } = props

  const showIcon = useMemoizedFn((severity) => {
    switch (severity) {
      // Hint
      case 1:
        return (
          <div className={classNames(styles['hint-icon'], styles['icon-box'])}>
            <FigmaIcon22915169930Outlined color="currentColor" />
          </div>
        )
      // Info
      case 2:
        return (
          <div className={classNames(styles['info-icon'], styles['icon-box'])}>
            <InformationCircleSolid color="currentColor" />
          </div>
        )
      // Warning
      case 4:
        return (
          <div className={classNames(styles['warn-icon'], styles['icon-box'])}>
            <ExclamationSolid color="currentColor" />
          </div>
        )
      // Error
      case 8:
        return (
          <div className={classNames(styles['error-icon'], styles['icon-box'])}>
            <XCircleSolid color="currentColor" />
          </div>
        )
      default:
        return <></>
    }
  })

  return (
    <div className={styles['syntax-check-list']}>
      {syntaxCheckData.map((item, index) => {
        const { severity, message, startLineNumber, startColumn, endLineNumber, endColumn } = item
        return (
          <div
            key={`${message}-${index}`}
            className={styles['syntax-check-item']}
            onClick={() => {
              onJumpToEditor({
                startLineNumber,
                startColumn,
                endLineNumber,
                endColumn,
              })
            }}
          >
            {showIcon(severity)}
            <div className={classNames(styles['text'], 'yakit-content-single-ellipsis')}>{message}</div>
            <div className={styles['area']}>
              [Ln {startLineNumber},Col {startColumn} - Ln {endLineNumber},Col {endColumn}]
            </div>
          </div>
        )
      })}
    </div>
  )
}
