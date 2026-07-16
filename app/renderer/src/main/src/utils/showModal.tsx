import React, { useEffect, useState } from 'react'
import { ModalProps } from 'antd/lib/modal'
import { DrawerProps, Modal } from 'antd'
import { ErrorBoundary } from 'react-error-boundary'
import { createRoot } from 'react-dom/client'
import emiter from './eventBus/eventBus'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DndProvider } from 'react-dnd'
import { YakitDrawer } from '@/components/yakitUI/YakitDrawer/YakitDrawer'
import i18n from '@/i18n/i18n'
import { ModalI18nNode, ModalI18nRender } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
const tOriginal = i18n.getFixedT(null, 'yakitUi')

export interface BaseModalProp extends ModalProps, React.ComponentProps<any> {
  onVisibleSetter?: (setter: (i: boolean) => any) => any
}

export const BaseModal: React.FC<BaseModalProp> = (props) => {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (open && props.onVisibleSetter) {
      props.onVisibleSetter(setOpen)
    }
  }, [open])

  return (
    <Modal
      {...props}
      footer={false}
      open={open}
      onCancel={() => setOpen(false)}
      onOk={(e) => {
        if (props.onOk) props.onOk(e)
      }}
      closable={true}
      destroyOnClose={true}
      cancelButtonProps={{ hidden: true }}
    />
  )
}

export interface ShowModalProps extends Omit<BaseModalProp, 'title' | 'content'> {
  title?: ModalI18nNode
  content?: ModalI18nNode
  modalAfterClose?: () => any
  type?: string
  hiddenHeader?: boolean
  subTitle?: string
  onOkText?: string //这个版本的antd modal没有这个属性声明
}

export const showModal = (props: ShowModalProps) => {
  const div = document.createElement('div')
  document.body.appendChild(div)
  let modalRootDiv
  let setter: (r: boolean) => any = () => {}
  const render = (targetConfig: ShowModalProps) => {
    setTimeout(() => {
      if (!modalRootDiv) {
        modalRootDiv = createRoot(div)
      }
      const { title, content, ...restConfig } = targetConfig
      modalRootDiv.render(
        <>
          <BaseModal
            {...(restConfig as ModalProps)}
            title={title !== undefined ? <ModalI18nRender node={title} /> : title}
            onVisibleSetter={(r) => {
              setter = r
            }}
            afterClose={() => {
              if (props.modalAfterClose) props.modalAfterClose()
              setTimeout(() => {
                if (modalRootDiv) {
                  modalRootDiv.unmount()
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
                    <p>{tOriginal('YakitNotification.modalLogicCrash')}</p>
                    <pre>{error?.message}</pre>
                  </div>
                )
              }}
            >
              <ModalI18nRender node={content} />
            </ErrorBoundary>
          </BaseModal>
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
        if (modalRootDiv) {
          modalRootDiv.unmount()
        }
      }, 400)
    },
  }
}

export interface BaseDrawerProp extends DrawerProps, React.ComponentProps<any> {
  afterClose?: (invisibleSetter?: (b: boolean) => void) => void
  afterVisible?: (invisibleSetter?: (b: boolean) => void) => void
  afterInvisible?: (invisibleSetter?: (b: boolean) => void) => void
  onVisibleSetter?: (setter: (i: boolean) => void) => void
}

export const BaseDrawer: React.FC<BaseDrawerProp> = (props) => {
  const { afterVisible, afterInvisible, afterClose, ...restProps } = props
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(true)
  }, [])

  useEffect(() => {
    if (open) {
      emiter.emit('setYakitHeaderDraggable', false)
      if (afterVisible) afterVisible(setOpen)
    } else {
      emiter.emit('setYakitHeaderDraggable', true)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    if (afterInvisible) afterInvisible(setOpen)
    setTimeout(() => {
      if (afterClose) afterClose(setOpen)
    }, 1000)
  }

  return (
    <YakitDrawer
      open={open}
      destroyOnClose={true}
      onClose={close}
      closable={true}
      width={'50%'}
      maskClosable={true}
      {...restProps}
    ></YakitDrawer>
  )
}

export interface ShowDrawerProps extends BaseDrawerProp {
  content?: React.ReactNode
  onCancel?: (e) => void
}

export const showDrawer = (props: ShowDrawerProps) => {
  const div = document.createElement('div')
  document.body.appendChild(div)

  let onDestroy: ((i: boolean) => any) | undefined = () => undefined
  let drawerRootDiv
  const render = (targetConfig: ShowDrawerProps) => {
    setTimeout(() => {
      if (!drawerRootDiv) {
        drawerRootDiv = createRoot(div)
      }
      drawerRootDiv.render(
        <DndProvider backend={HTML5Backend}>
          <BaseDrawer
            {...(targetConfig as BaseDrawerProp)}
            afterVisible={(setter) => {
              onDestroy = setter
            }}
            afterClose={() => {
              setTimeout(() => {
                if (drawerRootDiv) {
                  drawerRootDiv.unmount()
                }
              })
            }}
          >
            {targetConfig.content}
          </BaseDrawer>
        </DndProvider>,
      )
    })
  }
  render(props)
  return {
    destroy: () => {
      onDestroy && onDestroy(false)
      setTimeout(() => {
        if (drawerRootDiv) {
          drawerRootDiv.unmount()
        }
      }, 500)
    },
  }
}
