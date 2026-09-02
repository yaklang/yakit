import { Card, Menu } from 'antd'
import './showByCursor.css'
import type React from 'react'
import { createRoot } from 'react-dom/client'
import { YakitAntdProvider } from '@/theme/antdTheme'
export interface ByCursorContainerProp {
  content: JSX.Element
}

const cursorContainerId = 'yakit-cursor-container'
export const showByCursorContainer = (props: ByCursorContainerProp, x: number, y: number) => {
  const divExisted = document.getElementById(cursorContainerId)
  const div: HTMLDivElement = divExisted ? (divExisted as HTMLDivElement) : document.createElement('div')
  div.style.left = `${x}px`
  div.style.top = `${y}px`
  div.style.position = 'absolute'
  div.id = cursorContainerId
  div.className = 'popup'
  document.body.appendChild(div)
  let cursorContainerRootDiv
  const destory = () => {
    if (cursorContainerRootDiv) {
      cursorContainerRootDiv.unmount()
    }
  }

  const render = () => {
    setTimeout(() => {
      document.addEventListener('click', function onClickOutsize() {
        destory()
        document.removeEventListener('click', onClickOutsize)
      })
      document.addEventListener('contextmenu', function onContextMenuOutsize() {
        destory()
        document.removeEventListener('contextmenu', onContextMenuOutsize)
      })
      if (!cursorContainerRootDiv) {
        cursorContainerRootDiv = createRoot(div)
      }
      cursorContainerRootDiv.render(
        <YakitAntdProvider>
          <Card styles={{ body: { padding: 0 } }} variant="outlined" hoverable={true}>
            {props.content}
          </Card>
        </YakitAntdProvider>,
      )
    })
  }
  render()

  return { destroy: destory }
}

export interface ByCursorMenuItemProps {
  id?: string
  title: string
  render?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  subMenuItems?: ByCursorMenuItemProps[]
}

function menuItemWalker(list: ByCursorMenuItemProps[], handler: (item: ByCursorMenuItemProps) => any) {
  list.forEach((i) => {
    handler(i)
    if (i?.subMenuItems && i.subMenuItems.length > 0) {
      menuItemWalker(i.subMenuItems, handler)
    }
  })
}

export interface ByCursorMenuProp {
  content: ByCursorMenuItemProps[]
}

const cursorMenuId = 'yakit-cursor-menu'

export const showByCursorMenu = (props: ByCursorMenuProp, x: number, y: number) => {
  const divExisted = document.getElementById(cursorMenuId)
  const div: HTMLDivElement = divExisted ? (divExisted as HTMLDivElement) : document.createElement('div')
  div.style.left = `${x}px`
  div.style.top = `${y}px`
  div.style.position = 'absolute'
  div.style.zIndex = '9999'
  div.id = cursorMenuId
  div.className = 'popup'
  document.body.appendChild(div)
  let cursorMenuRootDiv
  const destory = () => {
    if (cursorMenuRootDiv) {
      cursorMenuRootDiv.unmount()
    }
  }

  const render = () => {
    setTimeout(() => {
      document.addEventListener('click', function onClickOutsize() {
        destory()
        document.removeEventListener('click', onClickOutsize)
      })
      if ((props.content || []).length > 0) {
        if (!cursorMenuRootDiv) {
          cursorMenuRootDiv = createRoot(div)
        }

        cursorMenuRootDiv.render(
          <YakitAntdProvider>
            <Menu
              className={'right-cursor-menu'}
              onClick={(item: { key: string }) => {
                const { key } = item
                menuItemWalker(props.content, (item) => {
                  if (item?.id === key) {
                    item.onClick()
                    return
                  }

                  if (item.title === key) {
                    item.onClick()
                    return
                  }
                })
              }}
              items={(props.content || []).map((item, index) => {
                const { title, disabled, id } = item
                if (item?.subMenuItems && item.subMenuItems.length > 0) {
                  return {
                    key: `${title}-${index}`,
                    label: title,
                    disabled: !!disabled,
                    popupClassName: 'right-cursor-submenu',
                    children: (item.subMenuItems || []).map((subItem) => {
                      const { render, disabled: subDisabled } = subItem
                      const subId = subItem?.id
                      return {
                        key: subId || subItem.title,
                        label: render || subItem.title,
                        disabled: !!subDisabled,
                      }
                    }),
                  }
                }
                return {
                  key: id || title,
                  label: item.title,
                  disabled: !!disabled,
                }
              })}
            />
          </YakitAntdProvider>,
        )
      }
    })
  }
  render()

  return { destroy: destory }
}
