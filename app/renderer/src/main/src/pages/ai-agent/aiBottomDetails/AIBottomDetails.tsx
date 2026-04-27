import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn, useUpdateEffect } from 'ahooks'
import styles from './AIBottomDetails.module.scss'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineCogIcon, OutlineExitIcon, OutlinePlusIcon, OutlineXIcon } from '@/assets/icon/outline'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import {
  defaultTerminaFont,
  defaultTerminalFont,
  DefaultTerminaSettingProps,
  TerminalBox,
  TerminalListBox,
  useTerminalHook,
} from '@/pages/yakRunner/BottomEditorDetails/TerminalBox/TerminalBox'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { RemoteGV } from '@/yakitGV'
export interface AIBottomDetailsProps {
  isShowAIBottomDetails: boolean
  setShowAIBottomDetails: React.Dispatch<React.SetStateAction<boolean>>
}
export const AIBottomDetails: React.FC<AIBottomDetailsProps> = (props) => {
  const { isShowAIBottomDetails, setShowAIBottomDetails } = props
  const [terminaFont, setTerminaFont] = useState<DefaultTerminaSettingProps>(defaultTerminalFont)
  const [popoverVisible, setPopoverVisible] = useState<boolean>(false)
  const terminalRef = useRef<any>(null)
  // 终端路径
  const folderPathRef = useRef<string>('')
  // 终端大小
  const terminalSizeRef = useRef<{ row: number; col: number }>()

  // 缓存字体设置
  useUpdateEffect(() => {
    setRemoteValue(RemoteGV.YakitXtermSetting, JSON.stringify(terminaFont))
  }, [terminaFont])

  // 更改默认值
  useEffect(() => {
    getRemoteValue(RemoteGV.YakitXtermSetting).then((value) => {
      if (!value) return
      try {
        const terminaFont = JSON.parse(value) as DefaultTerminaSettingProps
        setTerminaFont(terminaFont)
      } catch (error) {}
    })
  }, [])

  const onExit = useMemoizedFn(() => {
    setShowAIBottomDetails(false)
  })

  const [terminalIds, terminalRunnerId, initTerminalListData, debugTerminalHookEvent] = useTerminalHook({
    type: 'aiAgent',
    terminalRef,
    folderPathRef,
    terminalSizeRef,
    onExit,
    isShowDetails: isShowAIBottomDetails,
  })

  const isShowTerminalList = useMemo(() => {
    return terminalIds.length > 1
  }, [terminalIds])

  return (
    <div className={styles['ai-bottom-editor-details']}>
      <div className={styles['header']}>
        <div className={styles['select-box']}>
          <div className={classNames(styles['item'], styles['active-item'])}>
            <div className={styles['title']}>终端</div>
          </div>
        </div>
        <div className={styles['extra']}>
          <YakitButton
            type="text2"
            icon={<OutlinePlusIcon />}
            onClick={() => {
              debugTerminalHookEvent.startTerminal()
            }}
          />
          <YakitPopover
            placement="left"
            trigger="click"
            overlayClassName={styles['ai-menu-popover']}
            title={<div style={{ display: 'flex' }}>终端字体配置</div>}
            content={
              <>
                <div className={styles['title-font']}>
                  控制终端的字体系列，默认为{' '}
                  <span
                    className={styles['default-font']}
                    onClick={() => {
                      setTerminaFont({ ...terminaFont, fontFamily: defaultTerminaFont })
                    }}
                  >
                    Termina: Font Family
                  </span>{' '}
                  的值。
                </div>
                <YakitInput
                  size="small"
                  value={terminaFont.fontFamily}
                  onChange={(e) => {
                    const str = e.target.value
                    setTerminaFont({ ...terminaFont, fontFamily: str })
                  }}
                  placeholder="请输入字体"
                />
                <div className={styles['title-font']} style={{ marginTop: 4 }}>
                  控制终端的字体大小，默认为{' '}
                  <span
                    className={styles['default-font']}
                    onClick={() => {
                      setTerminaFont({ ...terminaFont, fontSize: 14 })
                    }}
                  >
                    14
                  </span>{' '}
                  。
                </div>
                <YakitInputNumber
                  style={{ width: '100%' }}
                  size="small"
                  min={1}
                  value={terminaFont.fontSize}
                  onChange={(v) => {
                    setTerminaFont({ ...terminaFont, fontSize: v as number })
                  }}
                />
              </>
            }
            onVisibleChange={(v) => {
              if (!v) {
                if (terminalRef.current) {
                  terminalRef.current.terminal.options.fontFamily = terminaFont.fontFamily
                  terminalRef.current.terminal.options.fontSize = terminaFont.fontSize
                }
              }
              setPopoverVisible(v)
            }}
            overlayInnerStyle={{ width: 340 }}
            visible={popoverVisible}
          >
            <YakitButton icon={<OutlineCogIcon />} type={popoverVisible ? 'text' : 'text2'} />
          </YakitPopover>
          {!isShowTerminalList && (
            <YakitButton
              type="text2"
              // danger
              icon={<OutlineExitIcon />}
              className={styles['ai-terminal-close']}
              onClick={() => {
                debugTerminalHookEvent.onDeleteTerminalItem(terminalRunnerId)
              }}
            />
          )}

          <YakitButton
            type="text2"
            icon={<OutlineXIcon />}
            onClick={() => {
              setShowAIBottomDetails(false)
            }}
          />
        </div>
      </div>
      <div className={styles['content']}>
        <div className={classNames(styles['render-hideen'], styles['render-show'])}>
          <YakitResizeBox
            freeze={isShowTerminalList}
            secondRatio={isShowTerminalList ? '225px' : '0px'}
            secondMinSize={isShowTerminalList ? 100 : '0px'}
            firstMinSize={500}
            lineDirection="right"
            lineStyle={{ width: 4, backgroundColor: 'rgb(49, 52, 63)' }}
            lineInStyle={{ backgroundColor: '#545663' }}
            firstNodeStyle={isShowTerminalList ? { padding: 0 } : { padding: 0, minWidth: '100%' }}
            secondNodeStyle={isShowTerminalList ? { padding: 0 } : { padding: 0, maxWidth: 0, minWidth: 0 }}
            // isShowDefaultLineStyle={false}
            firstNode={
              <TerminalBox
                xtermRef={terminalRef}
                commandExec={debugTerminalHookEvent.commandExec}
                onChangeSize={debugTerminalHookEvent.onChangeSize}
                defaultTerminalSetting={terminaFont}
              />
            }
            secondNode={
              <>
                {isShowTerminalList && (
                  <TerminalListBox
                    initTerminalListData={initTerminalListData}
                    terminalRunnerId={terminalRunnerId}
                    onSelectTerminalItem={debugTerminalHookEvent.onSelectTerminalItem}
                    onDeleteTerminalItem={debugTerminalHookEvent.onDeleteTerminalItem}
                  />
                )}
              </>
            }
          />
        </div>
      </div>
    </div>
  )
}
