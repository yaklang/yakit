import classNames from 'classnames'
import styles from '../YakitEditor.module.scss'
import {
  EditorMenuItemDividerProps,
  EditorMenuItemProps,
  EditorMenuItemType,
} from '../EditorMenu'
import { KeyboardToFuncProps } from '../YakitEditorType'
import { TFunction } from '@/i18n/useI18nNamespaces'
import {
  convertKeyboardToUIKey,
  sortKeysCombination,
} from '@/utils/globalShortcutKey/utils'
import {
  getYakEditorShortcutKeyEvents,
} from '@/utils/globalShortcutKey/events/page/yakEditor'
import { YakitKeyBoard, YakitKeyMod } from '@/utils/globalShortcutKey/keyboard'

/**
 * 菜单数组去重
 */
export const menuReduce = (array: any[]) => {
  let newArr: any[] = []
  let arr: string[] = []
  array.forEach((item) => {
    if (!arr.includes(item.key)) {
      arr.push(item.key)
      newArr.push(item)
    }
  })
  return newArr
}

/**
 * 菜单排序
 * @param dataSource 原始菜单数组
 * @param sortData 需要排序的菜单项（带 order 字段）
 */
export const sortMenuFun = (dataSource, sortData) => {
  const result = sortData.reduce(
    (acc, item) => {
      if (item.order >= 0) {
        acc.splice(item.order, 0, ...item.menu)
      } else {
        acc.push(...item.menu)
      }
      return acc
    },
    [...dataSource],
  )
  return result
}

/**
 * 菜单自定义快捷键渲染处理事件
 *
 * 为 cut/copy/paste 及带 keybindings 的菜单项添加快捷键文字展示
 * @param t i18n 翻译函数
 * @param keyBindingRef 记录快捷键映射的 ref
 * @param parentKey 父级菜单 key
 * @param data 菜单项数组
 */
export const contextMenuKeybindingHandle = (
  t: TFunction,
  keyBindingRef: React.MutableRefObject<KeyboardToFuncProps>,
  parentKey: string,
  data: EditorMenuItemType[],
): EditorMenuItemType[] => {
  const menus: EditorMenuItemType[] = []
  for (let item of data) {
    /** 屏蔽菜单分割线选项 */
    if (typeof (data as any as EditorMenuItemDividerProps)['type'] !== 'undefined') {
      const info: EditorMenuItemDividerProps = { type: 'divider' }
      menus.push(info)
    } else {
      /** 处理带快捷键的菜单项 */
      const info = { ...item } as EditorMenuItemProps
      if (info.children && info.children.length > 0) {
        info.children = contextMenuKeybindingHandle(t, keyBindingRef, info.key, info.children)
      } else {
        if (info.key === 'cut' && info.label === t('YakitEditor.cut')) {
          const keysContent = convertKeyboardToUIKey([YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_X])

          info.label = keysContent ? (
            <div className={styles['editor-context-menu-keybind-wrapper']}>
              <div className={styles['content-style']}>{t('YakitEditor.cut')}</div>
              <div className={classNames(styles['keybind-style'], 'keys-style')}>{keysContent}</div>
            </div>
          ) : (
            info.label
          )
        }
        if (info.key === 'copy' && info.label === t('YakitEditor.copy')) {
          const keysContent = convertKeyboardToUIKey([YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_C])

          info.label = keysContent ? (
            <div className={styles['editor-context-menu-keybind-wrapper']}>
              <div className={styles['content-style']}>{t('YakitEditor.copy')}</div>
              <div className={classNames(styles['keybind-style'], 'keys-style')}>{keysContent}</div>
            </div>
          ) : (
            info.label
          )
        }
        if (info.key === 'paste' && info.label === t('YakitEditor.paste')) {
          const keysContent = convertKeyboardToUIKey([YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_V])

          info.label = keysContent ? (
            <div className={styles['editor-context-menu-keybind-wrapper']}>
              <div className={styles['content-style']}>{t('YakitEditor.paste')}</div>
              <div className={classNames(styles['keybind-style'], 'keys-style')}>{keysContent}</div>
            </div>
          ) : (
            info.label
          )
        }

        if (info.keybindings && info.keybindings.length > 0) {
          const keyArr = getYakEditorShortcutKeyEvents()[info.keybindings].keys
          const keysContent = convertKeyboardToUIKey(keyArr)
          // 记录自定义快捷键映射按键的回调事件
          if (keysContent) {
            let sortKeys = sortKeysCombination(keyArr)
            keyBindingRef.current[sortKeys.join('-')] = parentKey ? [info.key, parentKey] : [info.key]
          }

          info.label = keysContent ? (
            <div className={styles['editor-context-menu-keybind-wrapper']}>
              <div className={styles['content-style']}>{info.label}</div>
              <div className={classNames(styles['keybind-style'], 'keys-style')}>{keysContent}</div>
            </div>
          ) : (
            info.label
          )
        }
      }
      menus.push(info)
    }
  }
  return menus
}