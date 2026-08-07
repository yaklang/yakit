import type React from 'react'
import { useMemoizedFn } from 'ahooks'
import styles from './SyntaxCheckList.module.scss'
import classNames from 'classnames'
import type { IMonacoEditorMarker } from '@/utils/editorMarkers'
import { OutlineDeprecatedIcon } from '@/assets/icon/outline'
import { SolidExclamationIcon, SolidInformationcircleIcon, SolidXcircleIcon } from '@/assets/icon/solid'
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
            <OutlineDeprecatedIcon />
          </div>
        )
      // Info
      case 2:
        return (
          <div className={classNames(styles['info-icon'], styles['icon-box'])}>
            <SolidInformationcircleIcon />
          </div>
        )
      // Warning
      case 4:
        return (
          <div className={classNames(styles['warn-icon'], styles['icon-box'])}>
            <SolidExclamationIcon />
          </div>
        )
      // Error
      case 8:
        return (
          <div className={classNames(styles['error-icon'], styles['icon-box'])}>
            <SolidXcircleIcon />
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
