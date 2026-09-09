import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { DraggableProvided } from '@hello-pangea/dnd'
import { Avatar } from 'antd'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { CogOutlined, PencilOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { PrivateOutlineDefaultPluginIcon } from '@yakit-libs/yakit-ui-icons/oldicon/PrivateOutlineDefaultPluginIcon'
import { FigmaIcon2281144183Solid } from '@yakit-libs/yakit-ui-icons/solid'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import emiter from '@/utils/eventBus/eventBus'
import { convertKeyboardToUIKey, setIsActiveShortcutKeyPage } from '@/utils/globalShortcutKey/utils'
import { YakitKeyBoard } from '@/utils/globalShortcutKey/keyboard'
import type { YakScript } from '@/pages/invoker/schema'
import type { ModifyPluginCallback } from '@/pages/pluginEditor/pluginEditor/PluginEditor'
import { ModifyYakitPlugin } from '@/pages/pluginEditor/modifyYakitPlugin/ModifyYakitPlugin'
import { getMainOperatorPageBodyContainer } from '@/utils/getMainOperatorPageBodyContainer'
import { grpcFetchLocalPluginDetailByUUID } from '@/pages/manageRightClickPlugins/api'
import {
  checkContextMenuShortcutConflict,
  parseContextMenuShortcut,
  serializeContextMenuShortcut,
} from '@/pages/manageRightClickPlugins/shortcut'
import {
  ContextMenuResultMode,
  LEGACY_CONTEXT_MENU_PLUGIN_TYPE,
  type ContextMenuAction,
  type ContextMenuScene,
} from '@/pages/manageRightClickPlugins/types'
import type { YakitMenuItemProps, YakitMenuItemType } from '@/components/yakitUI/YakitMenu/YakitMenu'
import styles from './RightClickPluginsSettings.module.scss'

interface PluginItemProps {
  plugin: ContextMenuAction
  siblings: ContextMenuAction[]
  scene?: ContextMenuScene
  isDragging: boolean
  dragHandleProps?: DraggableProvided['dragHandleProps']
  settingMenuOpen: boolean
  onSettingMenuOpenChange: (open: boolean) => void
  onToggle: (plugin: ContextMenuAction, enabled: boolean) => void
  onChangeResultMode: (plugin: ContextMenuAction, mode: ContextMenuResultMode) => void
  onChangeShortcut: (plugin: ContextMenuAction, shortcut: string) => void
}

export const PluginItem: React.FC<PluginItemProps> = React.memo((props) => {
  const {
    plugin,
    siblings,
    scene,
    isDragging,
    dragHandleProps,
    settingMenuOpen,
    onSettingMenuOpenChange,
    onToggle,
    onChangeResultMode,
    onChangeShortcut,
  } = props
  const { t, i18nRefresh } = useI18nNamespaces(['manageRightClickPlugins', 'shortcutKey'])
  const enabled = plugin.Enabled
  const locked = plugin.Locked || plugin.IsCorePlugin
  const isLegacyCodec = plugin.PluginType === LEGACY_CONTEXT_MENU_PLUGIN_TYPE
  const resultMode = plugin.ResultMode === ContextMenuResultMode.Auto ? ContextMenuResultMode.Tab : plugin.ResultMode
  const shortcutKeys = useMemo(() => parseContextMenuShortcut(plugin.Shortcut), [plugin.Shortcut])

  const [editPlugin, setEditPlugin] = useState<YakScript | null>(null)
  const [editHint, setEditHint] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const pageWrapperRef = useRef<HTMLElement>()
  const [keyShow, setKeyShow] = useState(false)
  const [inputKeys, setInputKeys] = useState<YakitKeyBoard[]>([])
  const [warnInfo, setWarnInfo] = useState<string>()

  const handleOpenEdit = useMemoizedFn((e: React.MouseEvent) => {
    e.stopPropagation()
    if (editHint || editLoading) return
    setEditLoading(true)
    grpcFetchLocalPluginDetailByUUID({ UUID: plugin.PluginUUID })
      .then((res) => {
        pageWrapperRef.current = getMainOperatorPageBodyContainer()
        setEditPlugin(res)
        setEditHint(true)
      })
      .catch(() => {})
      .finally(() => setEditLoading(false))
  })

  const handleEditCallback = useMemoizedFn((isSuccess: boolean, data?: ModifyPluginCallback) => {
    if (isSuccess && data) {
      if (['save', 'saveAndExit', 'upload', 'submit'].includes(data.opType)) {
        emiter.emit('refreshContextMenuPlugins')
      }
      if (data.opType !== 'save') setEditHint(false)
    } else {
      setEditHint(false)
    }
  })

  const handleOpenKeyShow = useMemoizedFn(() => {
    if (keyShow) return
    onSettingMenuOpenChange(false)
    setInputKeys(shortcutKeys as YakitKeyBoard[])
    setWarnInfo(
      shortcutKeys.length > 0
        ? checkContextMenuShortcutConflict(shortcutKeys, {
            scene,
            siblings,
            exclude: { PluginUUID: plugin.PluginUUID, ActionID: plugin.ActionID },
          })
        : undefined,
    )
    setIsActiveShortcutKeyPage(true)
    setKeyShow(true)
  })

  const handleCallbackKeyShow = useMemoizedFn((show: boolean) => {
    if (show && inputKeys.length > 0) {
      onChangeShortcut(plugin, serializeContextMenuShortcut(inputKeys))
    }
    setIsActiveShortcutKeyPage(false)
    setKeyShow(false)
    setInputKeys([])
    setWarnInfo(undefined)
  })

  const handleShortcutKey = useMemoizedFn((name: string) => {
    if (!keyShow) return
    if (name.indexOf('setShortcutKey') === -1) return
    const result = name.match(/\(([^)]+)\)/)
    if (!result?.[1]) return
    if (result[1] === YakitKeyBoard.Escape) {
      handleCallbackKeyShow(false)
    } else if (result[1] === YakitKeyBoard.Enter) {
      handleCallbackKeyShow(true)
    } else {
      const keys = result[1].split('|') as YakitKeyBoard[]
      setWarnInfo(
        checkContextMenuShortcutConflict(keys, {
          scene,
          siblings,
          exclude: { PluginUUID: plugin.PluginUUID, ActionID: plugin.ActionID },
        }),
      )
      setInputKeys(keys)
    }
  })

  useEffect(() => {
    if (!keyShow) return
    emiter.on('onGlobalShortcutKey', handleShortcutKey)
    return () => {
      emiter.off('onGlobalShortcutKey', handleShortcutKey)
      setIsActiveShortcutKeyPage(false)
    }
  }, [keyShow])

  const resultModeMenuLabel = useMemoizedFn((mode: ContextMenuResultMode, label: string) => (
    <div className={styles['menu-item']}>
      <span>{label}</span>
      {resultMode === mode ? <span className={styles['menu-check']}>✓</span> : <span />}
    </div>
  ))

  const settingMenuData = useMemo((): YakitMenuItemType[] => {
    const shortcutItem: YakitMenuItemType = {
      key: 'shortcut',
      label: t('ManageRightClickPlugins.setShortcutMenu'),
    }
    if (isLegacyCodec) return [shortcutItem]
    const resultChildren: YakitMenuItemProps[] = [
      {
        key: `result-${ContextMenuResultMode.Tab}`,
        label: resultModeMenuLabel(ContextMenuResultMode.Tab, t('ManageRightClickPlugins.resultModeTab')),
      },
      {
        key: `result-${ContextMenuResultMode.Dialog}`,
        label: resultModeMenuLabel(ContextMenuResultMode.Dialog, t('ManageRightClickPlugins.resultModeDialog')),
      },
      {
        key: `result-${ContextMenuResultMode.Drawer}`,
        label: resultModeMenuLabel(ContextMenuResultMode.Drawer, t('ManageRightClickPlugins.resultModeDrawer')),
      },
    ]
    return [
      shortcutItem,
      { key: 'result-mode', label: t('ManageRightClickPlugins.setResultModeMenu'), children: resultChildren },
    ]
  }, [resultMode, isLegacyCodec, i18nRefresh])

  const onSettingMenuClick = useMemoizedFn(({ key }: { key: string }) => {
    if (key === 'shortcut') {
      handleOpenKeyShow()
      return
    }
    if (isLegacyCodec || !key.startsWith('result-')) return
    const mode = key.slice('result-'.length) as ContextMenuResultMode
    if (
      mode === ContextMenuResultMode.Tab ||
      mode === ContextMenuResultMode.Dialog ||
      mode === ContextMenuResultMode.Drawer
    ) {
      onChangeResultMode(plugin, mode)
    }
    onSettingMenuOpenChange(false)
  })

  return (
    <div
      className={classNames(styles['item'], {
        [styles['item-off']]: !enabled,
        [styles['item-dragging']]: isDragging,
        [styles['item-actions-open']]: settingMenuOpen || keyShow || editHint,
      })}
    >
      <div className={styles['drag']} {...dragHandleProps}>
        <FigmaIcon2281144183Solid size={16} color="currentColor" />
      </div>
      <Avatar className={styles['avatar']} src={plugin.HeadImg || ''} icon={<PrivateOutlineDefaultPluginIcon />} />
      <div className={styles['body']}>
        <div className={styles['name-row']}>
          <div className={styles['name']} title={plugin.PluginName}>
            {plugin.PluginName}
          </div>
          <div className={styles['actions']} onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className={styles['action-btn']} disabled={editLoading} onClick={handleOpenEdit}>
              <PencilOutlined size={16} color="currentColor" />
            </button>
            <YakitDropdownMenu
              menu={{ data: settingMenuData, width: 180, onClick: onSettingMenuClick }}
              dropdown={{
                trigger: ['click'],
                placement: 'bottomLeft',
                open: settingMenuOpen,
                onOpenChange: onSettingMenuOpenChange,
              }}
            >
              <button
                type="button"
                className={classNames(styles['action-btn'], { [styles['action-btn-active']]: settingMenuOpen })}
                onClick={(e) => e.stopPropagation()}
              >
                <CogOutlined size={16} color="currentColor" />
              </button>
            </YakitDropdownMenu>
          </div>
        </div>
        <div className={styles['desc']} title={plugin.Help}>
          {plugin.Help || 'No Description about it.'}
        </div>
      </div>
      <div className={styles['switch']} onMouseDown={(e) => e.stopPropagation()}>
        <YakitSwitch checked={enabled} disabled={locked} onChange={(val) => onToggle(plugin, val)} />
      </div>

      {editHint && editPlugin && (
        <ModifyYakitPlugin
          getContainer={pageWrapperRef.current || undefined}
          plugin={editPlugin}
          visible={editHint}
          onCallback={handleEditCallback}
        />
      )}

      <YakitModal
        type="white"
        title={t('ShortcutKey.editShortcut')}
        centered={true}
        keyboard={false}
        footer={null}
        maskClosable={false}
        styles={{ mask: { backgroundColor: 'transparent' } }}
        open={keyShow}
        width={600}
        onCancel={() => handleCallbackKeyShow(false)}
      >
        <div className={styles['set-shortcut']}>
          <div className={styles['hint']}>{t('ShortcutKey.hint')}</div>
          <div className={classNames(styles['input'], { [styles['empty']]: inputKeys.length === 0 })}>
            {inputKeys.join(' ')}
          </div>
          <div className={styles['keys']}>
            {convertKeyboardToUIKey(inputKeys)}
            {warnInfo && <span className={styles['warn']}>（{warnInfo}）</span>}
          </div>
        </div>
      </YakitModal>
    </div>
  )
})
