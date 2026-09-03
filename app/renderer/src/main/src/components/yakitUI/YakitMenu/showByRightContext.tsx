import ReactDOM from 'react-dom'
import React, { memo, type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'
import { coordinate } from '@/pages/globalVariable'
import emiter from '@/utils/eventBus/eventBus'
import { YakitMenu, type YakitMenuProp } from './YakitMenu'
import styles from './showByRightContext.module.scss'

const roundDown = (value: number) => {
  return Math.floor(value)
}

/**
 * antd/rc-menu 垂直子菜单默认 placement 为 rightTop（向右展开）。
 * 右侧放得下时保持向右；右侧不够且左侧放得下时，把 right* 锚点改成向左优先。
 * 两侧都不够时再选剩余空间更大的一侧。adjustX 只会平移、不会切换 placement。
 * 各级实际宽度并不一致，这里用根菜单宽度估算子菜单所需空间，再决定整棵往哪边展开。
 */
const preferLeftSubmenuPlacements: NonNullable<YakitMenuProp['builtinPlacements']> = {
  rightTop: {
    points: ['tr', 'tl'],
    overflow: { adjustX: true, adjustY: true },
  },
  rightBottom: {
    points: ['br', 'bl'],
    overflow: { adjustX: true, adjustY: true },
  },
}

const genX = (client, coordinate, target) => {
  if (target + coordinate > client) {
    return coordinate - target - 6
  } else {
    return coordinate + 6
  }
}
const genY = (client, coordinate, target) => {
  const heightDiff = target + coordinate - client
  if (heightDiff <= -10) {
    return coordinate + 6
  }
  if (heightDiff > -10 && coordinate > target + 6) {
    return coordinate - target - 6
  }
  if (heightDiff > -10 && coordinate <= target + 6) {
    return coordinate - heightDiff - 6
  }
}

const ContextMenuId = 'yakit-right-context'

/**
 * @name 生成一个鼠标所在坐标位置的展示框(props默认为菜单组件，也可自行传递自定义组件)
 * @description x和y参数为可选参数，填写时将以x-y坐标位展示内容
 */
export const showByRightContext = (props: YakitMenuProp | ReactNode, x?: number, y?: number, isForce?: boolean) => {
  let divExisted = document.getElementById(ContextMenuId)

  if (isForce) {
    if (divExisted) divExisted.remove()
    divExisted = null
  }

  const div: HTMLDivElement = divExisted ? (divExisted as HTMLDivElement) : document.createElement('div')

  /** body展示的高度和宽度；表示body在浏览器内显示的区域高度和宽度 */
  const clientHeight = roundDown(document.body.getBoundingClientRect().height || 0)
  const clientWidth = roundDown(document.body.getBoundingClientRect().width || 0)
  /** 鼠标坐标 */
  let left = x || coordinate.clientX
  let top = y || coordinate.clientY
  /** 右键展示元素宽高 */
  const divWidth = roundDown(div.getBoundingClientRect().width || 0)
  const divHeight = roundDown(div.getBoundingClientRect().height || 0)
  /**RightContext 根节点 */
  // let rightContextRootDiv

  if (divWidth > 0 && divHeight > 0) {
    // y坐标计算
    top = genY(clientHeight, top, divHeight)
    // x坐标计算
    left = genX(clientWidth, left, divWidth)
    div.style.left = `${left}px`
    div.style.top = `${top}px`
  } else {
    div.style.left = `-9999px`
    div.style.top = `-9999px`
  }

  div.style.position = 'absolute'
  div.style.zIndex = '9999'
  div.id = ContextMenuId
  div.className = 'popup'
  document.body.appendChild(div)
  // 与 Drawer/Modal 一致：菜单打开时关闭标题栏拖拽，避免挡住菜单点击
  emiter.emit('setYakitHeaderDraggable', false)

  const destory = () => {
    // if (rightContextRootDiv) {
    //     rightContextRootDiv.unmount()
    // }
    const unmountResult = ReactDOM.unmountComponentAtNode(div)
    if (unmountResult && div.parentNode) {
      div.parentNode.removeChild(div)
    }
    emiter.emit('setYakitHeaderDraggable', true)
  }

  const offsetPosition = (width: number, height: number) => {
    // y坐标计算
    top = genY(clientHeight, top, height)
    // x坐标计算
    left = genX(clientWidth, left, width)
    div.style.left = `${left}px`
    div.style.top = `${top}px`
  }

  const render = () => {
    setTimeout(() => {
      document.addEventListener(
        'click',
        function onClickOutsize() {
          setTimeout(() => destory(), 0)
        },
        { capture: true, once: true },
      )
      // document.addEventListener("contextmenu", function onContextMenuOutsize() {
      //     destory()
      //     document.removeEventListener("contextmenu", onContextMenuOutsize)
      // })
      // if (!rightContextRootDiv) {
      //     rightContextRootDiv = createRoot(div)
      // }
      // rightContextRootDiv.render(<RightContext data={props} callback={offsetPosition} />)
      // 上面注释内容为react 18新特性写法，但在antd menu下会有二级菜单多个同时打开问题
      ReactDOM.render(<RightContext data={props} callback={offsetPosition} />, div)
    })
  }
  render()

  return { destroy: destory }
}

interface RightContextProp {
  data: YakitMenuProp | ReactNode
  callback?: (width: number, height: number) => any
}
const RightContext: React.FC<RightContextProp> = memo((props) => {
  const { data, callback } = props

  const wrapperRef = useRef<HTMLDivElement>(null)
  /** 右侧放不下且左侧放得下时，子菜单优先向左展开 */
  const [preferSubmenuLeft, setPreferSubmenuLeft] = useState(false)

  useLayoutEffect(() => {
    const width = wrapperRef.current?.clientWidth || 0
    const height = wrapperRef.current?.clientHeight || 0
    if (width <= 0 || height <= 0) return

    callback?.(width, height)

    const root = document.getElementById(ContextMenuId)
    if (!root) return
    const rect = root.getBoundingClientRect()
    const spaceLeft = rect.left
    const spaceRight = window.innerWidth - rect.right
    // 各级宽度不一致，用根菜单宽度估算子菜单能否放下
    const needWidth = rect.width
    if (spaceRight >= needWidth) {
      setPreferSubmenuLeft(false)
    } else if (spaceLeft >= needWidth) {
      setPreferSubmenuLeft(true)
    } else {
      setPreferSubmenuLeft(spaceLeft > spaceRight)
    }
  }, [callback])

  const menuProps = data as YakitMenuProp

  const builtinPlacements = useMemo(() => {
    if (!preferSubmenuLeft) return menuProps.builtinPlacements
    return {
      ...menuProps.builtinPlacements,
      ...preferLeftSubmenuPlacements,
    }
  }, [menuProps.builtinPlacements, preferSubmenuLeft])

  return (
    <div className={styles['show-by-right-context-wrapper']} ref={wrapperRef}>
      {React.isValidElement(data) ? (
        data
      ) : (
        <YakitMenu
          {...menuProps}
          popupClassName={classNames(styles['show-by-right-context-submenu'], menuProps.popupClassName)}
          builtinPlacements={builtinPlacements}
        />
      )}
    </div>
  )
})
