import React, { useRef, useState } from 'react'
import { AgrAndQSModalProps } from '../QuestionModal'
import { useMemoizedFn } from 'ahooks'
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable'
import classNames from 'classnames'
import { MacUIOpCloseSvgIcon, WinUIOpCloseSvgIcon } from '@/assets/newIcon'
import { DragHeaderHeight } from '../../utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { Trans } from 'react-i18next'
import styles from './AgreementContentModal.module.scss'

/** @name 用户协议弹窗 */
export const AgreementContentModal: React.FC<AgrAndQSModalProps> = React.memo((props) => {
  const { isTop, setIsTop, system, visible, setVisible } = props
  const { t } = useI18nNamespaces(['link'])

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
      top: -targetRect.top + uiData.y + DragHeaderHeight,
      bottom: clientHeight - (targetRect.bottom - uiData.y),
    })
  })

  return (
    <Draggable
      defaultClassName={classNames(
        styles['yakit-agr-modal'],
        { [styles['modal-top-wrapper']]: isTop === 1 },
        visible ? styles['modal-wrapper'] : styles['hidden-wrapper'],
      )}
      disabled={disabled}
      bounds={bounds}
      onStart={(event, uiData) => onStart(event, uiData)}
      defaultPosition={{ x: 215, y: -400 }} // <- 初始位置
    >
      <div ref={draggleRef}>
        <div className={styles['yakit-info-modal']} onClick={() => setIsTop(1)}>
          <div className={styles['agreement-content-modal-wrapper']}>
            {system === 'Darwin' ? (
              <div
                className={classNames(styles['modal-header'], styles['mac-header'])}
                onMouseEnter={() => {
                  if (disabled) setDisabled(false)
                }}
                onMouseLeave={() => setDisabled(true)}
                onMouseDown={() => setIsTop(1)}
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
                <span>{t('AgreementContentModal.modal_title')}</span>
              </div>
            ) : (
              <div
                className={classNames(styles['modal-header'], styles['win-header'])}
                onMouseOver={() => {
                  if (disabled) setDisabled(false)
                }}
                onMouseOut={() => setDisabled(true)}
                onMouseDown={() => setIsTop(1)}
              >
                <span className={styles['header-title']}>{t('AgreementContentModal.modal_title')}</span>
                <div className={styles['close-wrapper']} onClick={() => setVisible(false)}>
                  <WinUIOpCloseSvgIcon className={styles['icon-style']} />
                </div>
              </div>
            )}
            <div className={styles['modal-body']}>
              <div className={styles['body-title']}>{t('AgreementContentModal.disclaimer_title')}</div>
              <div className={styles['body-content']}>
                <Trans
                  i18nKey="AgreementContentModal.content"
                  ns="link"
                  components={{
                    br: <br />,
                    sign: <span className={styles['sign-content']} />,
                    underline: <span className={styles['underline-content']} />,
                    bold: <span className={styles['sign-bold-content']} />,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Draggable>
  )
})
