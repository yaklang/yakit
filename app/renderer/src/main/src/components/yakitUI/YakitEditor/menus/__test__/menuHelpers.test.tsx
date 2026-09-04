import { describe, expect, it } from 'vitest'
import { contextMenuKeybindingHandle } from '../menuHelpers'
import type { KeyboardToFuncProps } from '../../YakitEditorType'
import type { EditorMenuItemType } from '../../EditorMenu'

const t = (key: string) => key
const newRef = () => ({ current: {} as KeyboardToFuncProps })

describe('contextMenuKeybindingHandle 快捷键映射注册', () => {
  it('后注册的同组合不覆盖先注册的菜单项（内置菜单优先于右键插件）', () => {
    const keyBindingRef = newRef()
    const data: EditorMenuItemType[] = [
      {
        key: 'built-in',
        label: '内置菜单项',
        shortcutKeys: ['Control', 'KEY_D'],
      },
      {
        key: 'plugin-item',
        label: '右键插件',
        shortcutKeys: ['Control', 'KEY_D'],
      },
    ]

    contextMenuKeybindingHandle(t as any, keyBindingRef as any, '', data)

    expect(keyBindingRef.current['Control-KEY_D']).toEqual(['built-in'])
  })

  it('父子级路径完整保留：带 parentKey 的项注册为 [子key, 父key]', () => {
    const keyBindingRef = newRef()
    const data: EditorMenuItemType[] = [
      {
        key: 'parent',
        label: '父级（二级菜单）',
        children: [
          {
            key: 'execPlugin',
            label: '执行插件',
          },
        ],
        shortcutKeys: ['Control', 'KEY_E'],
      },
    ]

    contextMenuKeybindingHandle(t as any, keyBindingRef as any, '', data)

    expect(keyBindingRef.current['Control-KEY_E']).toEqual(['parent'])
  })

  it('不同组合各自注册互不影响', () => {
    const keyBindingRef = newRef()
    const data: EditorMenuItemType[] = [
      {
        key: 'built-in',
        label: '内置菜单项',
        shortcutKeys: ['Control', 'KEY_D'],
      },
      {
        key: 'plugin-item',
        label: '右键插件',
        shortcutKeys: ['Control', 'KEY_G'],
      },
    ]

    contextMenuKeybindingHandle(t as any, keyBindingRef as any, '', data)

    expect(keyBindingRef.current['Control-KEY_D']).toEqual(['built-in'])
    expect(keyBindingRef.current['Control-KEY_G']).toEqual(['plugin-item'])
  })
})
