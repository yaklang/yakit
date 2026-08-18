import type React from 'react'
import { useMemo } from 'react'
import type { BottomSideBarProps } from './BottomSideBarType'

import classNames from 'classnames'
import styles from './BottomSideBar.module.scss'

import useStore from '../hooks/useStore'

const { ipcRenderer } = window.require('electron')

export const BottomSideBar: React.FC<BottomSideBarProps> = (props) => {
  const { onOpenEditorDetails } = props
  const { activeFile } = useStore()
  const showSyntaxInfo = useMemo(() => {
    const data = {
      hint: 0,
      info: 0,
      warning: 0,
      error: 0,
    }
    if (activeFile?.syntaxCheck) {
      activeFile.syntaxCheck.forEach((item) => {
        switch (item.severity) {
          case 1:
            data.hint += 1
            break
          case 2:
            data.info += 1
            break
          case 4:
            data.warning += 1
            break
          case 8:
            data.error += 1
            break
        }
      })
    }
    return data
  }, [activeFile])

  const position = activeFile?.position
  const showLocationInfo = useMemo(() => {
    const data = {
      lineNumber: 1,
      column: 1,
    }
    if (position) {
      data.lineNumber = position.lineNumber
      data.column = position.column
    }
    return data
  }, [position])
  return (
    <div className={styles['bottom-side-bar']}>
      {/* 语法检查|终端|帮助信息 */}
      <div className={styles['bottom-side-bar-left']}>
        <div className={classNames(styles['left-item'], styles['left-check'])}></div>
      </div>

      {/* 光标位置 */}
      <div
        className={styles['bottom-side-bar-right']}
      >{`行 ${showLocationInfo.lineNumber}，  列 ${showLocationInfo.column}`}</div>
    </div>
  )
}
