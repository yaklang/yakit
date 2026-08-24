import type React from 'react'
import { memo, useEffect, useRef, useState } from 'react'
import { useInViewport, useMemoizedFn } from 'ahooks'
import { PluginEditor, type PluginEditorRefProps } from '../pluginEditor/PluginEditor'
import type { KeyParamsFetchPluginDetail } from '../base'
import { shallow } from 'zustand/shallow'
import { type PageNodeItemProps, usePageInfo } from '@/store/pageInfo'
import { defaultAddYakitScriptPageInfo } from '@/defaultConstants/AddYakitScript'
import { YakitRoute } from '@/enums/yakitRoute'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import emiter from '@/utils/eventBus/eventBus'
import { JSONParseLog } from '@/utils/tool'

import styles from './AddYakitPlugin.module.scss'
import { registerShortcutKeyHandle } from '@/utils/globalShortcutKey/utils'
import { ShortcutKeyPage } from '@/utils/globalShortcutKey/events/pageMaps'
import useShortcutKeyTrigger from '@/utils/globalShortcutKey/events/useShortcutKeyTrigger'
import { getStorageYakitMultipleShortcutKeyEvents } from '@/utils/globalShortcutKey/events/multiple/yakitMultiple'

interface AddYakitPluginProps {}

export const AddYakitPlugin: React.FC<AddYakitPluginProps> = memo(() => {
  const editorRef = useRef<PluginEditorRefProps>(null)
  const [pendingEdit, setPendingEdit] = useState<KeyParamsFetchPluginDetail>()
  const [saveBeforeSwitchLoading, setSaveBeforeSwitchLoading] = useState(false)

  const { queryPagesDataById } = usePageInfo(
    (s) => ({
      queryPagesDataById: s.queryPagesDataById,
    }),
    shallow,
  )
  // 获取新建插件-设置的初始值
  const initPageInfo = useMemoizedFn(() => {
    const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
      YakitRoute.AddYakitScript,
      YakitRoute.AddYakitScript,
    )
    if (currentItem && currentItem.pageParamsInfo.addYakitScriptPageInfo) {
      return currentItem.pageParamsInfo.addYakitScriptPageInfo
    } else {
      return { ...defaultAddYakitScriptPageInfo }
    }
  })
  const openEditPlugin = useMemoizedFn((target: KeyParamsFetchPluginDetail) => {
    if (!editorRef.current) return
    editorRef.current.setEditPlugin(target)
    setPendingEdit(undefined)
    setSaveBeforeSwitchLoading(false)
  })

  useEffect(() => {
    const pageInfo = initPageInfo()
    if (pageInfo.editPlugin) openEditPlugin(pageInfo.editPlugin)
    else editorRef.current?.setNewPlugin(pageInfo)

    const onOpenPluginInEditor = (raw: string) => {
      try {
        const target = JSONParseLog(raw, {
          page: 'AddYakitPlugin',
          fun: 'onOpenPluginInEditor',
        }) as unknown as KeyParamsFetchPluginDetail
        if (!target?.uuid && !target?.name) return
        setPendingEdit(target)
      } catch (error) {}
    }
    emiter.on('openPluginInEditor', onOpenPluginInEditor)
    return () => emiter.off('openPluginInEditor', onOpenPluginInEditor)
  }, [])

  const saveAndSwitchPlugin = useMemoizedFn(() => {
    if (!pendingEdit || !editorRef.current || saveBeforeSwitchLoading) return
    setSaveBeforeSwitchLoading(true)
    editorRef.current.onSaveAndExit((result) => {
      if (result) openEditPlugin(pendingEdit)
      else setSaveBeforeSwitchLoading(false)
    })
  })

  const shortcutRef = useRef<HTMLDivElement>(null)
  const [inViewport] = useInViewport(shortcutRef)
  useEffect(() => {
    if (inViewport) {
      registerShortcutKeyHandle(ShortcutKeyPage.YakitMultiple)
      getStorageYakitMultipleShortcutKeyEvents()
    }
  }, [inViewport])

  useShortcutKeyTrigger('save*pluginEditor', () => {
    if (editorRef.current && inViewport) {
      editorRef.current.onBtnLocalSave()
    }
  })

  return (
    <>
      <div className={styles['add-yakit-plugin']} ref={shortcutRef}>
        <PluginEditor ref={editorRef} />
      </div>
      <YakitModal
        width={420}
        type="white"
        visible={!!pendingEdit}
        title="切换编辑插件"
        okText="保存并切换"
        okButtonProps={{ loading: saveBeforeSwitchLoading }}
        cancelText="不保存并切换"
        cancelButtonProps={{
          disabled: saveBeforeSwitchLoading,
          onClick: () => pendingEdit && openEditPlugin(pendingEdit),
        }}
        keyboard={false}
        maskClosable={false}
        onOk={saveAndSwitchPlugin}
        onCancel={() => {
          if (!saveBeforeSwitchLoading) setPendingEdit(undefined)
        }}
      >
        <div className={styles['switch-edit-hint']}>
          <ExclamationCircleOutlined className={styles['switch-edit-icon']} />
          <div>
            <div className={styles['switch-edit-title']}>当前插件可能尚未保存</div>
            <div className={styles['switch-edit-description']}>
              是否保存当前内容，再编辑“{pendingEdit?.name || '所选插件'}”？
            </div>
          </div>
        </div>
      </YakitModal>
    </>
  )
})
