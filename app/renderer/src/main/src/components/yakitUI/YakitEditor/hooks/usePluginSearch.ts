import { useEffect } from 'react'
import { useMemoizedFn } from 'ahooks'
import { queryYakScriptList } from '@/pages/yakitStore/network'
import { YakScript } from '@/pages/invoker/schema'
import { failed } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import { useStore } from '@/store/editorState'
import { PluginSwitchToTag } from '@/pages/pluginEditor/defaultconstants'
import { YakitEditorExtraRightMenuType } from '../YakitEditorType'
import { CodecTypeProps, contextMenuProps } from '../constants'

export interface UsePluginSearchParams {
  menuType: YakitEditorExtraRightMenuType[]
  inViewport: boolean | undefined
}

export interface UsePluginSearchResult {
  customHTTPMutatePlugin: CodecTypeProps[]
  contextMenuPlugin: contextMenuProps[]
  setCustomHTTPMutatePlugin: (info: CodecTypeProps[]) => void
  setContextMenuPlugin: (info: contextMenuProps[]) => void
  onRefreshPluginCodecMenu: () => void
}

/**
 * Codec 插件搜索逻辑
 *
 * 自定义HTTP数据包变形处理 + 插件扩展
 */
export const usePluginSearch = (params: UsePluginSearchParams): UsePluginSearchResult => {
  const { menuType, inViewport } = params

  // 自定义HTTP数据包变形处理
  const { customHTTPMutatePlugin, contextMenuPlugin, setCustomHTTPMutatePlugin, setContextMenuPlugin } = useStore()

  const searchCodecCustomHTTPMutatePlugin = useMemoizedFn(() => {
    queryYakScriptList(
      'codec',
      (i: YakScript[], total) => {
        if (!total || total === 0) {
          return
        }
        setCustomHTTPMutatePlugin(
          i.map((script) => {
            return {
              key: script.ScriptName,
              verbose: 'CODEC 社区插件: ' + script.ScriptName,
              isYakScript: true,
            } as CodecTypeProps
          }),
        )
      },
      undefined,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      [PluginSwitchToTag.PluginCodecHttpSwitch],
    )
  })

  // 插件扩展
  const searchCodecCustomContextMenuPlugin = useMemoizedFn(() => {
    queryYakScriptList(
      'codec',
      (i: YakScript[], total) => {
        if (!total || total === 0) {
          return
        }
        setContextMenuPlugin(
          i.map((script) => {
            const isAiPlugin: boolean = script.Tags.includes('AI工具')
            return {
              key: script.ScriptName,
              value: script.ScriptName,
              isAiPlugin,
              params: script.Params,
            } as contextMenuProps
          }),
        )
      },
      undefined,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      [PluginSwitchToTag.PluginCodecContextMenuExecuteSwitch],
    )
  })

  useEffect(() => {
    if (inViewport && menuType.length > 0) {
      searchCodecCustomHTTPMutatePlugin()
      searchCodecCustomContextMenuPlugin()
    }
  }, [inViewport])

  const onRefreshPluginCodecMenu = useMemoizedFn(() => {
    if (inViewport && menuType.length > 0) {
      searchCodecCustomHTTPMutatePlugin()
      searchCodecCustomContextMenuPlugin()
    }
  })

  useEffect(() => {
    emiter.on('onRefPluginCodecMenu', onRefreshPluginCodecMenu)
    return () => {
      emiter.off('onRefPluginCodecMenu', onRefreshPluginCodecMenu)
    }
  }, [])

  return {
    customHTTPMutatePlugin,
    contextMenuPlugin,
    setCustomHTTPMutatePlugin,
    setContextMenuPlugin,
    onRefreshPluginCodecMenu,
  }
}