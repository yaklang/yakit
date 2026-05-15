import React, { useEffect, useState } from 'react'
import style from './YakitModalConfirm.module.scss'
import { YakitButton } from '../YakitButton/YakitButton'
import { ShowModalProps } from '@/utils/showModal'
import ReactDOM from 'react-dom'
import { YakitModal, YakitModalProp } from './YakitModal'
import { ErrorBoundary } from 'react-error-boundary'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { OutlineXIcon } from '@/assets/icon/outline'
import { createRoot } from 'react-dom/client'
import { TFunction, useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import i18n from '@/i18n/i18n'
const tOriginal = i18n.getFixedT(null, 'yakitUi')

export type ModalI18nNode = React.ReactNode | ((modalT: TFunction) => React.ReactNode) | string

export const ALL_MODAL_I18N_NAMESPACES = [
  'yakitUi',
  'yakitRoute',
  'core',
  'layout',
  'plugin',
  'yakitStore',
  'customizeMenu',
  'home',
  'history',
  'webFuzzer',
  'aiAgent',
  'setting',
  'yakChat',
  'yakURLTree',
  'yakRunnerAuditHole',
  'yakRunner',
  'yakPoC',
  'websocket',
  'vulinbox',
  'utils',
  'store',
  'spaceEngine',
  'simpleDetect',
  'shortcutKey',
  'screenRecorder',
  'ruleManagement',
  'risk',
  'reverse',
  'remote',
  'projectManage',
  'portscan',
  'pluginHub',
  'payload',
  'notepad',
  'mitm',
  'icmpsizelog',
  'HTTPHistoryAnalysis',
  'hook',
  'engineConsole',
  'dns',
  'cve',
  'configNetwork',
  'components',
  'comparer',
  'codec',
  'brute',
  'assetViewer',
  'apiUtils',
  'admin',
]

/** 将title, content 改为function传入 使用modalT 替换 t('') 即可解决中英文切换问题 */
export const ModalI18nRender: React.FC<{ node?: ModalI18nNode }> = ({ node }) => {
  const { t } = useI18nNamespaces(ALL_MODAL_I18N_NAMESPACES)
  if (typeof node === 'function') {
    return <>{(node as (modalT: TFunction) => React.ReactNode)(t)}</>
  }
  return <>{node}</>
}

interface YakitBaseModalProp extends Omit<YakitModalProp, 'okType'>, React.ComponentProps<any> {
  onVisibleSetter?: (setter: (i: boolean) => any) => any
  showConfirmLoading?: boolean
  subTitle?: string
}

export interface YakitModalConfirmProps extends Omit<YakitBaseModalProp, 'title'> {
  /**
   * 推荐使用函数签名: (modalT) => ReactNode
   * - modalT 等价于 i18n 的 t，可直接替换 t('xxx')
   * - 使用函数可以避免闭包拿到旧值，确保语言切换后文案正确刷新
   *
   * 示例:
   * title: (modalT) => modalT('YakitModalConfirm.debugInfo')
   * content: (modalT) => <div>{modalT('YakitButton.ok')}</div>
   */
  title?: ModalI18nNode
  content?: ModalI18nNode
  modalAfterClose?: () => any
  onOk?: (e) => any
  onCancel?: (e) => any
  onOkText?: ModalI18nNode
  onCancelText?: ModalI18nNode
  showConfirmLoading?: boolean
}

interface YakitBaseModalProps extends YakitModalProp, React.ComponentProps<any> {
  onVisibleSetter?: (setter: (i: boolean) => void) => void
  showConfirmLoading?: boolean
  onCancelText?: ModalI18nNode
  onOkText?: ModalI18nNode
}

export const YakitModalConfirm = (props: YakitModalConfirmProps) => {
  const div = document.createElement('div')
  document.body.appendChild(div)
  let setter: (r: boolean) => any = () => {}
  let yakitModalConfirmRootDiv
  const render = (targetConfig: YakitModalConfirmProps) => {
    setTimeout(() => {
      if (!yakitModalConfirmRootDiv) {
        yakitModalConfirmRootDiv = createRoot(div)
      }
      yakitModalConfirmRootDiv.render(
        <>
          <YakitBaseModal
            type="white"
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
                        <div className={style['modal-title']}>
                          <ModalI18nRender node={props.title} />
                        </div>
                      )}
                      {props.content && (
                        <div className={style['modal-content']}>
                          <ModalI18nRender node={props.content} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          </YakitBaseModal>
        </>,
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
  const { t, i18n } = useI18nNamespaces(['yakitUi'])
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
              if (props.onCancel) props.onCancel(e)
              setVisible(false)
            }}
            {...props.cancelButtonProps}
          >
            {props.onCancelText ? <ModalI18nRender node={props.onCancelText} /> : t('YakitButton.cancel')}
          </YakitButton>
          <YakitButton
            onClick={(e) => {
              if (props.showConfirmLoading) {
                setLoading(true)
              }
              if (props.onOk) {
                props.onOk(e)
              }
            }}
            loading={loading}
            {...props.okButtonProps}
          >
            {props.onOkText ? <ModalI18nRender node={props.onOkText} /> : t('YakitButton.ok')}
          </YakitButton>
        </div>
      }
      visible={visible}
      closable={true}
      destroyOnClose={true}
      closeIcon={
        <div
          onClick={(e) => {
            e.stopPropagation()
            if (props.onCloseX) {
              props.onCloseX(e)
            } else {
              props.onCancel?.(e)
            }
            setVisible(false)
          }}
          className="modal-remove-icon"
        >
          <OutlineXIcon />
        </div>
      }
      {...props}
      onCancel={(e) => {
        if (props.onCancel) props.onCancel(e)
        setVisible(false)
      }}
    />
  )
}

export const debugYakitModal = (y: any) => {
  const m = showYakitModal({
    title: (modalT) => modalT('YakitModalConfirm.debugInfo'),
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
    title: (modalT) => modalT('YakitModalConfirm.debugInfo'),
    width: '50%',
    content: <div style={{ marginLeft: 20, marginRight: 20, marginTop: 16, marginBottom: 20 }}>{y}</div>,
    onOk: () => {
      m.destroy()
    },
  })
}

interface ShowModalV2Props extends Omit<ShowModalProps, 'title' | 'content'> {
  title?: ModalI18nNode
  content?: ModalI18nNode
}

export const showYakitModal = (props: ShowModalV2Props) => {
  const div = document.createElement('div')
  if (!!props.getContainer && props.getContainer instanceof HTMLElement) {
    props.getContainer.appendChild(div)
  } else {
    document.body.appendChild(div)
  }

  let setter: (r: boolean) => any = () => {}
  let yakitModalRootDiv
  const render = (targetConfig: ShowModalV2Props) => {
    setTimeout(() => {
      if (!yakitModalRootDiv) {
        yakitModalRootDiv = createRoot(div)
      }
      yakitModalRootDiv.render(
        <>
          <YakitBaseModal
            bodyStyle={{ padding: 0 }}
            {...(targetConfig as YakitModalProp)}
            title={
              targetConfig.title !== undefined ? <ModalI18nRender node={targetConfig.title} /> : targetConfig.title
            }
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
              <ModalI18nRender node={targetConfig.content} />
            </ErrorBoundary>
          </YakitBaseModal>
        </>,
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
