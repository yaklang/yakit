import { useEffect, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { queryYakScriptList } from '@/pages/yakitStore/network'
import type { YakScript } from '@/pages/invoker/schema'
import emiter from '@/utils/eventBus/eventBus'
import { useStore } from '@/store/editorState'
import { PluginSwitchToTag } from '@/pages/pluginEditor/defaultconstants'
import type { YakitEditorExtraRightMenuType } from '../YakitEditorType'
import type { CodecTypeProps, contextMenuProps } from '../constants'
import { ManageRightClickPluginsTabKey } from '@/pages/manageRightClickPlugins/constants'
import { getSceneTabActions } from '@/pages/manageRightClickPlugins/utils'

export interface UsePluginSearchParams {
  menuType: YakitEditorExtraRightMenuType[]
  inViewport: boolean | undefined
}

export interface UsePluginSearchResult {
  customHTTPMutatePlugin: CodecTypeProps[]
  contextMenuPlugin: contextMenuProps[]
  isGetPlugin: boolean
  setCustomHTTPMutatePlugin: (info: CodecTypeProps[]) => void
  setContextMenuPlugin: (info: contextMenuProps[]) => void
  onRefreshPluginCodecMenu: () => void
}

/**
 * Codec 插件搜索逻辑
 *
 * 自定义HTTP数据包变形处理 + 右键插件
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

  // 右键插件
  const [isGetPlugin, setIsGetPlugin] = useState<boolean>(false)
  const searchCodecCustomContextMenuPlugin = useMemoizedFn(() => {
    getSceneTabActions(ManageRightClickPluginsTabKey.PacketContextMenu).then(({ list, noData }) => {
      setIsGetPlugin(noData)
      setContextMenuPlugin(
        list.map((action) => {
          return {
            key: action.PluginName,
            value: action.PluginName,
            isAiPlugin: !!action.IsAIPlugin,
            params: action.Params || [],
            executionType: action.ExecutionType,
            action,
          } as contextMenuProps
        }),
      )
    })
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
    emiter.on('refreshContextMenuActions', onRefreshPluginCodecMenu)
    return () => {
      emiter.off('refreshContextMenuActions', onRefreshPluginCodecMenu)
    }
  }, [])

  return {
    customHTTPMutatePlugin,
    contextMenuPlugin,
    isGetPlugin,
    setCustomHTTPMutatePlugin,
    setContextMenuPlugin,
    onRefreshPluginCodecMenu,
  }
}
