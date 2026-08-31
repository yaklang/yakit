import React, { useState, useRef, useEffect } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { getReleaseEditionName } from '@/utils/envfile'
import type { YakitSystem } from '@/yakitGVDefine'
import Draggable from 'react-draggable'
import type { DraggableEvent, DraggableData } from 'react-draggable'
import { useDebounce, useMemoizedFn } from 'ahooks'
import { Progress } from 'antd'
import { MacUIOpCloseSvgIcon, WinUIOpCloseSvgIcon } from '../icons'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'
import { QuestionMarkCircleOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { WebsiteGV } from '@/enums/website'

import classNames from 'classnames'
import styles from './DownloadYakit.module.scss'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

// hook 提取到独立文件，避免 layout 链路通过 DownloadYakit 间接拉入 react-draggable
export { useDownloadYakit } from './useDownloadYakit'
import { useDownloadYakit } from './useDownloadYakit'

import { ShieldExclamationSolid } from '@yakit-libs/yakit-ui-icons/solid'

interface DownloadYakitProps {
  system: YakitSystem
  visible: boolean
  setVisible: (flag: boolean) => any
  intranetYakit: boolean
}

/** @name Yakit软件更新下载弹窗 */
export const DownloadYakit: React.FC<DownloadYakitProps> = React.memo((props) => {
  const { system, visible, setVisible, intranetYakit } = props
  const { t } = useI18nNamespaces(['yakitUi', 'layout'])

  const [downloadProgress, { onDownloadStart, onCancel, onBreak }] = useDownloadYakit({ intranetYakit, setVisible })
  /** 常见问题弹窗是否展示 */
  const [qsShow, setQSShow] = useState<boolean>(false)

  /** 是否置顶 */
  const [isTop, setIsTop] = useState<0 | 1 | 2>(0)

  const [disabled, setDisabled] = useState(true)
  const [bounds, setBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 })
  const debouncedBounds = useDebounce(bounds, { wait: 500 })
  const draggleRef = useRef<HTMLDivElement>(null)

  /**
   * 1. 获取最新软件版本号，并下载
   * 2. 监听本地下载软件进度数据
   * @returns 删除监听事件2
   */
  useEffect(() => {
    if (visible) {
      onDownloadStart()
    } else {
      onBreak(false)
    }
  }, [visible])

  /** 弹窗拖拽移动触发事件 */
  const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
    const { clientWidth, clientHeight } = window.document.documentElement
    const targetRect = draggleRef.current?.getBoundingClientRect()
    if (!targetRect) return

    setBounds({
      left: -targetRect.left + uiData.x,
      right: clientWidth - (targetRect.right - uiData.x),
      top: -targetRect.top + uiData.y + 36,
      bottom: clientHeight - (targetRect.bottom - uiData.y),
    })
  })

  return (
    <>
      <Draggable
        defaultClassName={classNames(
          styles['draggable-modal'],
          visible ? styles['download-yakit-modal'] : styles['draggable-hidden-modal'],
          { [styles['modal-top-wrapper']]: isTop === 0 },
        )}
        disabled={disabled}
        bounds={debouncedBounds}
        onStart={(event, uiData) => onStart(event, uiData)}
      >
        <div ref={draggleRef}>
          <div className={styles['modal-yaklang-engine-hint']} onClick={() => setIsTop(0)}>
            <div className={styles['yaklang-engine-hint-wrapper']}>
              <div
                className={styles['hint-draggle-body']}
                onMouseEnter={() => {
                  if (disabled) setDisabled(false)
                }}
                onMouseLeave={() => setDisabled(true)}
                onMouseDown={() => setIsTop(0)}
              ></div>

              <div className={styles['hint-left-wrapper']}>
                <div className={styles['hint-icon']}>
                  <ShieldExclamationSolid color="#FFB660" size={32} />
                </div>
                <div
                  className={styles['qs-icon']}
                  onClick={(e) => {
                    e.stopPropagation()
                    setQSShow(true)
                    setIsTop(2)
                  }}
                >
                  <QuestionMarkCircleOutlined color="currentColor" />
                </div>
              </div>

              <div className={styles['hint-right-wrapper']}>
                <div className={classNames(styles['hint-right-download'], 'yakit-progress-wrapper')}>
                  <div className={styles['hint-right-title']}>
                    {t('DownloadYakit.downloading', { edition: getReleaseEditionName() })}
                  </div>
                  <Progress
                    strokeColor="var(--Colors-Use-Main-Primary)"
                    trailColor="var(--Colors-Use-Neutral-Bg-Hover)"
                    percent={Math.floor((downloadProgress?.percent || 0) * 100)}
                  />
                  <div className={styles['download-info-wrapper']}>
                    <div>
                      {t('YakitProgress.remainingTime', { time: (downloadProgress?.time.remaining || 0).toFixed(2) })}
                    </div>
                    <div className={styles['divider-wrapper']}>
                      <div className={styles['divider-style']}></div>
                    </div>
                    <div>
                      {t('YakitProgress.elapsedTime', { time: (downloadProgress?.time.elapsed || 0).toFixed(2) })}
                    </div>
                    <div className={styles['divider-wrapper']}>
                      <div className={styles['divider-style']}></div>
                    </div>
                    <div>
                      {t('YakitProgress.downloadSpeed', {
                        speed: ((downloadProgress?.speed || 0) / 1000000).toFixed(2),
                      })}
                    </div>
                  </div>
                  <div style={{ marginTop: 24 }}>
                    <YakitButton size="max" type="outline2" onClick={onCancel}>
                      {t('YakitButton.cancel')}
                    </YakitButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Draggable>
      <YakitQuestionModal isTop={isTop} setIsTop={setIsTop} system={system} visible={qsShow} setVisible={setQSShow} />
    </>
  )
})

interface AgrAndQSModalProps {
  /** 窗口置顶 */
  isTop: 0 | 1 | 2
  setIsTop: (type: 0 | 1 | 2) => any
  system: YakitSystem
  visible: boolean
  setVisible: (flag: boolean) => any
}

/** @name Yakit-常见问题弹窗 */
const YakitQuestionModal: React.FC<AgrAndQSModalProps> = React.memo((props) => {
  const { isTop, setIsTop, system, visible, setVisible } = props
  const { t } = useI18nNamespaces(['layout'])

  const [show, setShow] = useState<boolean>(false)

  const [disabled, setDisabled] = useState(true)
  const [bounds, setBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 })
  const draggleRef = useRef<HTMLDivElement>(null)

  const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
    const { clientWidth, clientHeight } = window.document.documentElement
    const targetRect = draggleRef.current?.getBoundingClientRect()
    if (!targetRect) return

    setBounds({
      left: -targetRect.left + uiData.x,
      right: clientWidth - (targetRect.right - uiData.x),
      top: -targetRect.top + uiData.y + 36,
      bottom: clientHeight - (targetRect.bottom - uiData.y),
    })
  })

  return (
    <Draggable
      defaultClassName={classNames(
        styles['draggable-modal'],
        { [styles['modal-top-wrapper']]: isTop === 2 },
        visible ? styles['qs-modal'] : styles['draggable-hidden-modal'],
      )}
      disabled={disabled}
      bounds={bounds}
      onStart={(event, uiData) => onStart(event, uiData)}
    >
      <div ref={draggleRef}>
        <div className={styles['yakit-agr-and-qs-modal']} onClick={() => setIsTop(2)}>
          <div className={styles['question-modal-wrapper']}>
            {system === 'Darwin' ? (
              <div
                className={classNames(styles['modal-header'], styles['mac-header'])}
                onMouseEnter={() => {
                  if (disabled) setDisabled(false)
                }}
                onMouseLeave={() => setDisabled(true)}
                onMouseDown={() => setIsTop(2)}
              >
                <div
                  className={styles['close-wrapper']}
                  onMouseEnter={() => setShow(true)}
                  onMouseLeave={() => setShow(false)}
                  onClick={() => setVisible(false)}
                >
                  {show ? (
                    <MacUIOpCloseSvgIcon />
                  ) : (
                    <div className={styles['close-btn']}>
                      <div className={styles['btn-icon']}></div>
                    </div>
                  )}
                </div>
                <span>{t('DownloadYakit.officialDownloadLink')}</span>
              </div>
            ) : (
              <div
                className={classNames(styles['modal-header'], styles['win-header'])}
                onMouseOver={() => {
                  if (disabled) setDisabled(false)
                }}
                onMouseOut={() => setDisabled(true)}
                onMouseDown={() => setIsTop(2)}
              >
                <span className={styles['header-title']}>{t('DownloadYakit.officialDownloadLink')}</span>
                <div className={styles['close-wrapper']} onClick={() => setVisible(false)}>
                  <WinUIOpCloseSvgIcon className={styles['icon-style']} />
                </div>
              </div>
            )}
            <div className={styles['modal-body']}>
              <div className={styles['yakit-update-hint']}>{t('DownloadYakit.officialDownloadHint')}</div>

              <div className={styles['yakit-update-link']}>
                {t('DownloadYakit.website')}
                <div className={styles['link-wrapper']}>
                  {WebsiteGV.OfficialWebsite}
                  <CopyComponents className={styles['copy-icon']} copyText={WebsiteGV.OfficialWebsite} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Draggable>
  )
})
