import type React from 'react'
import { useEffect, useState } from 'react'
import { theme, type ModalProps } from 'antd'
import style from './YakitModalConfirm.module.scss'
import { YakitButton } from '../YakitButton/YakitButton'
import { YakitModal, type YakitModalProp } from './YakitModal'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { createRoot, type Root } from 'react-dom/client'
import { XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { ErrorBoundary } from 'react-error-boundary'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import i18n from '@/i18n/i18n'
import { YakitAntdProvider } from '@/theme/antdTheme'

const tOriginal = i18n.getFixedT(null, 'yakitUi')
/**
 * antd 5 页面 Modal：zIndexPopupBase + CONTAINER_OFFSET(100)；嵌套再 +100。
 * 命令式弹窗对齐 ConfirmDialog，用 CONTAINER_MAX_OFFSET(1000) 压过最多 10 层嵌套。
 */
const YAKIT_IMPERATIVE_MODAL_Z_INDEX_OFFSET = 1000

interface BaseModalProp extends ModalProps, React.ComponentProps<any> {
  onVisibleSetter?: (setter: (i: boolean) => any) => any
}

interface ShowModalProps extends BaseModalProp {
  content?: React.ReactNode
  modalAfterClose?: () => any
  type?: string
  hiddenHeader?: boolean
  subTitle?: string
}

interface YakitBaseModalProp extends Omit<YakitModalProp, 'okType'>, React.ComponentProps<any> {
  onVisibleSetter?: (setter: (i: boolean) => any) => any
  showConfirmLoading?: boolean
  subTitle?: string
}

export interface YakitModalConfirmProps extends YakitBaseModalProp {
  title?: React.ReactNode | string
  content?: React.ReactNode | string
  modalAfterClose?: () => any
  onOk?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => any
  onCancel?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => any
  onOkText?: string
  onCancelText?: string
  showConfirmLoading?: boolean
}

interface YakitBaseModalProps extends YakitModalProp, React.ComponentProps<any> {
  onVisibleSetter?: (setter: (i: boolean) => void) => void
  showConfirmLoading?: boolean
  onCancelText?: string
  onOkText?: string
}

export const YakitModalConfirm = (props: YakitModalConfirmProps) => {
  const div = document.createElement('div')
  document.body.appendChild(div)
  let setter: (r: boolean) => any = () => {}
  let yakitModalConfirmRootDiv: Root
  const render = (targetConfig: YakitModalConfirmProps) => {
    setTimeout(() => {
      if (!yakitModalConfirmRootDiv) {
        yakitModalConfirmRootDiv = createRoot(div)
      }
      yakitModalConfirmRootDiv.render(
        <YakitAntdProvider>
          <YakitBaseModal
            {...(targetConfig as YakitModalProp)}
            onVisibleSetter={(r) => {
              setter = r
            }}
            afterClose={() => {
              if (props.modalAfterClose) props.modalAfterClose()
              setTimeout(() => {
                if (yakitModalConfirmRootDiv) {
                  yakitModalConfirmRootDiv.unmount()
                }
              })
            }}
            title={null}
            // headerStyle={{paddingBottom: 0}}
            bodyStyle={{ padding: 0 }}
          >
            <ErrorBoundary
              FallbackComponent={({ error, resetErrorBoundary }) => {
                if (!error) {
                  return <div>{tOriginal('YakitNotification.unknown_error')}</div>
                }
                return (
                  <div>
                    <p>{tOriginal('YakitNotification.modalCrashRetry')}</p>
                    <pre>{error?.message}</pre>
                  </div>
                )
              }}
            >
              <div className={style['modal-content-warp']}>
                <div className={style['down-modal']}>
                  <div className={style['down-modal-heard']}>
                    <ExclamationCircleOutlined className={style['modal-icon']} />
                    <div>
                      {props.title && (
                        <>
                          {(typeof props.title === 'string' && (
                            <div className={style['modal-title']}>{props.title}</div>
                          )) ||
                            props.title}
                        </>
                      )}
                      {props.content && (
                        <>
                          {(typeof props.content === 'string' && (
                            <div className={style['modal-content']}>{props.content}</div>
                          )) ||
                            props.content}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          </YakitBaseModal>
        </YakitAntdProvider>,
      )
    })
  }
  render(props)
  return {
    destroy: () => {
      if (setter) {
        setter(false)
      }
      setTimeout(() => {
        if (yakitModalConfirmRootDiv) {
          yakitModalConfirmRootDiv.unmount()
        }
      }, 400)
    },
  }
}

const YakitBaseModal: React.FC<YakitBaseModalProps> = (props) => {
  const { t } = useI18nNamespaces(['yakitUi'])
  const { token } = theme.useToken()
  const [visible, setVisible] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    if (visible && props.onVisibleSetter) {
      props.onVisibleSetter(setVisible)
    }
  }, [visible])

  return (
    <YakitModal
      footerStyle={{ borderTop: 0, padding: 0 }}
      footer={
        <div className={style['modal-confirm-btns']}>
          <YakitButton
            type="outline2"
            onClick={(e) => {
              if (props.onCancel) props.onCancel(e as React.MouseEvent<HTMLButtonElement>)
              setVisible(false)
            }}
            {...props.cancelButtonProps}
          >
            {props.onCancelText || t('YakitButton.cancel')}
          </YakitButton>
          <YakitButton
            onClick={(e) => {
              if (props.showConfirmLoading) {
                setLoading(true)
              }
              if (props.onOk) {
                props.onOk(e as React.MouseEvent<HTMLButtonElement>)
              }
            }}
            loading={loading}
            {...props.okButtonProps}
          >
            {props.onOkText || t('YakitButton.ok')}
          </YakitButton>
        </div>
      }
      closable={true}
      destroyOnHidden={true}
      closeIcon={
        <div
          onClick={(e) => {
            e.stopPropagation()
            if (props.onCloseX) {
              props.onCloseX(e as unknown as React.MouseEvent<HTMLButtonElement>)
            } else {
              props.onCancel?.(e as unknown as React.MouseEvent<HTMLButtonElement>)
            }
            setVisible(false)
          }}
          className="modal-remove-icon"
        >
          <XOutlined color="currentColor" />
        </div>
      }
      {...props}
      zIndex={props.zIndex ?? token.zIndexPopupBase + YAKIT_IMPERATIVE_MODAL_Z_INDEX_OFFSET}
      open={visible}
      onCancel={(e) => {
        if (props.onCancel) props.onCancel(e)
        setVisible(false)
      }}
    />
  )
}

export const debugYakitModal = (y: any) => {
  const m = showYakitModal({
    title: tOriginal('YakitModalConfirm.debugInfo'),
    width: '50%',
    content: (
      <div style={{ marginLeft: 20, marginRight: 20, marginTop: 16, marginBottom: 20 }}>{JSON.stringify(y)}</div>
    ),
    onOk: () => {
      m.destroy()
    },
  })
}

export const debugYakitModalAny = (y: any) => {
  const m = showYakitModal({
    title: tOriginal('YakitModalConfirm.debugInfo'),
    width: '50%',
    content: <div style={{ marginLeft: 20, marginRight: 20, marginTop: 16, marginBottom: 20 }}>{y}</div>,
    onOk: () => {
      m.destroy()
    },
  })
}

export const showYakitModal = (props: ShowModalProps) => {
  const div = document.createElement('div')
  if (!!props.getContainer && props.getContainer instanceof HTMLElement) {
    props.getContainer.appendChild(div)
  } else {
    document.body.appendChild(div)
  }

  let setter: (r: boolean) => any = () => {}
  let yakitModalRootDiv: any
  const render = (targetConfig: ShowModalProps) => {
    setTimeout(() => {
      if (!yakitModalRootDiv) {
        yakitModalRootDiv = createRoot(div)
      }
      yakitModalRootDiv.render(
        <YakitAntdProvider>
          <YakitBaseModal
            bodyStyle={{ padding: 0 }}
            {...(targetConfig as YakitModalProp)}
            onVisibleSetter={(r) => {
              setter = r
            }}
            afterClose={() => {
              if (props.modalAfterClose) props.modalAfterClose()
              setTimeout(() => {
                if (yakitModalRootDiv) {
                  yakitModalRootDiv.unmount()
                }
              })
            }}
          >
            <ErrorBoundary
              FallbackComponent={({ error, resetErrorBoundary }) => {
                if (!error) {
                  return <div>{tOriginal('YakitNotification.unknown_error')}</div>
                }
                return (
                  <div>
                    <p>{tOriginal('YakitNotification.modalCrashRetry')}</p>
                    <pre>{error?.message}</pre>
                  </div>
                )
              }}
            >
              {targetConfig.content}
            </ErrorBoundary>
          </YakitBaseModal>
        </YakitAntdProvider>,
      )
    })
  }
  render(props)
  return {
    destroy: () => {
      if (setter) {
        setter(false)
      }
      setTimeout(() => {
        if (yakitModalRootDiv) {
          yakitModalRootDiv.unmount()
        }
      }, 400)
    },
  }
}
