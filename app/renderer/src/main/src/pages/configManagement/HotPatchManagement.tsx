import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn, useGetState, useInViewport } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { yakitFailed, yakitNotify } from '@/utils/notification'
import { HotPatchTempItem, AddHotCodeTemplate, HotCodeType } from '@/pages/fuzzer/HTTPFuzzerHotPatch'
import { HotPatchDefaultContent, HotPatchTempDefault } from '@/defaultConstants/HTTPFuzzerPage'
import { AnalyzeHotPatchTempDefault, MITMHotPatchTempDefault } from '@/defaultConstants/mitm'
import { cloneDeep } from 'lodash'
import {
  OutlinePlusIcon,
  OutlineTrashIcon,
  OutlinePencilaltIcon,
  OutlineTerminalIcon,
  OutlineInformationcircleIcon,
  OutlineChevronrightIcon,
} from '@/assets/icon/outline'
import { openConsoleNewWindow } from '@/utils/openWebsite'
import { Tooltip } from 'antd'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useShortcutKeyTrigger from '@/utils/globalShortcutKey/events/useShortcutKeyTrigger'
import { getStorageHotPatchManagementShortcutKeyEvents } from '@/utils/globalShortcutKey/events/page/hotPatchManagement'
import { ShortcutKeyPage } from '@/utils/globalShortcutKey/events/pageMaps'
import { registerShortcutKeyHandle, unregisterShortcutKeyHandle } from '@/utils/globalShortcutKey/utils'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { isEnpriTrace } from '@/utils/envfile'
import { NetWorkApi } from '@/services/fetch'
import { API } from '@/services/swagger/resposeType'
import styles from './ConfigManagement.module.scss'
import { SolidChevronrightIcon, SolidDotsverticalIcon, SolidPlayIcon, SolidStopIcon } from '@/assets/icon/solid'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import {
  DEFAULT_GLOBAL_TEMPLATE_CONTENT,
  DEFAULT_GLOBAL_TEMPLATES,
  useGlobalHotPatch,
  useGlobalHotPatchTag,
} from '@/store/globalHotPatch'
import { HotPatchTemplate } from '@/pages/invoker/data/MITMPluginTamplate'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useStore } from '@/store'

const { ipcRenderer } = window.require('electron')

type PanelHotCodeType = Exclude<HotCodeType, 'global'>

interface HotPatchTemplateItem {
  Name: string
  Content: string
  Type: string
  Tags?: string[]
}

interface QueryHotPatchTemplateResponse {
  Data: HotPatchTemplateItem[]
}

interface StringFuzzerParams {
  Template: string
  HotPatchCode: string
  HotPatchCodeWithParamGetter: string
  TimeoutSeconds: number
  Limit: number
}

interface StringFuzzerResponse {
  Results: Uint8Array[]
}

interface GetOnlineHotPatchTemplateRequest {
  page: number
  limit: number
  type: string
  name?: string
}

interface HotPatchTemplateTeam {
  tags: string
  node: HotPatchTempItem[]
}

const INPUT_MAX_LENGTH = 50
const DEBUG_TIMEOUT_SECONDS = 20
const DEBUG_LIMIT = 300
const DEFAULT_TEMPLATE_CONTENT = `{{yak(handle|{{params(test)}})}}`
const HOT_PATCH_PARAMS_GETTER_DEFAULT = `__getParams__ = func() {
    /*
        __getParams__ 是一个用户可控生成复杂数据初始数据的参数：
        可以在这个函数中同时处理所有数据：

        1. CSRF Bypass
        2. 获取额外信息，进行强关联的信息变形
    */
    return {
        // "array-params": [1, 2, 3, 512312],  # 可用 {{params(array-params)}}
        // "foo-params": "asdfasdfassss",      # 可用 {{params(foo-params)}}
    }
}`

export const formatTemplateTeams = (list: HotPatchTempItem[]): HotPatchTemplateTeam[] => {
  const taggedTeams: HotPatchTemplateTeam[] = []
  const emptyTagNodes: HotPatchTempItem[] = []
  const tagIndexMap = new Map<string, number>()

  list.forEach((item) => {
    const tags = item.Tags?.trim() || ''
    if (!tags) {
      emptyTagNodes.push(item)
      return
    }
    const index = tagIndexMap.get(tags)
    if (index === undefined) {
      tagIndexMap.set(tags, taggedTeams.length)
      taggedTeams.push({ tags, node: [item] })
      return
    }
    taggedTeams[index].node.push(item)
  })

  emptyTagNodes.forEach((item) => {
    taggedTeams.push({ tags: '', node: [item] })
  })

  return taggedTeams
}

function collectTemplateGroups(list: HotPatchTempItem[]) {
  const groups = new Set<string>()
  list.forEach((item) => {
    const tag = item.Tags?.trim()
    if (tag) groups.add(tag)
  })
  return Array.from(groups)
}

const ensureHotPatchDefaultTemplates = async (
  type: string,
  resData: HotPatchTemplateItem[],
  defaults: Array<{ name: string; content: string }>,
) => {
  const seededNames: HotPatchTemplateItem[] = []
  for (const tpl of defaults) {
    if (resData.some(({ Name }) => Name === tpl.name)) continue
    const newTemplate: HotPatchTemplateItem = {
      Type: type,
      Content: tpl.content,
      Name: tpl.name,
      Tags: [],
    }
    try {
      await ipcRenderer.invoke('CreateHotPatchTemplate', newTemplate)
      seededNames.push(newTemplate)
    } catch (error) {
      yakitFailed(error + '')
    }
  }
  return [...seededNames, ...resData]
}

const toHotPatchTempItems = (list: HotPatchTemplateItem[], isDefault: (name: string) => boolean): HotPatchTempItem[] =>
  list.map(({ Name, Tags }) => ({
    name: Name,
    temp: '',
    isDefault: isDefault(Name),
    Tags: Tags?.join(',') || '',
  }))

export const HotPatchManagement: React.FC = () => {
  const { t, i18n } = useI18nNamespaces(['yakitUi', 'yakitRoute', 'layout', 'webFuzzer'])
  const [activeType, setActiveType] = useState<HotCodeType>('global')
  const [panelType, setPanelType] = useState<PanelHotCodeType>('mitm')
  const [globalTemplateList, setGlobalTemplateList] = useState<HotPatchTempItem[]>([])
  const [templateList, setTemplateList] = useState<HotPatchTempItem[]>([])
  const [templateListOnline, setTemplateListOnline] = useState<HotPatchTempItem[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedTemplateSource, setSelectedTemplateSource] = useState<'local' | 'online'>('local')
  const [code, setCode, getCode] = useGetState('')
  const [templateContent, setTemplateContent, getTemplateContent] = useGetState(DEFAULT_TEMPLATE_CONTENT)
  const { globalHotPatchConfig, loadGlobalHotPatchConfig: loadGlobalHotPatchConfigStore } = useGlobalHotPatch()
  const { globalEnabledTemplateName } = useGlobalHotPatchTag()
  const [globalConfigLoading, setGlobalConfigLoading] = useState(false)
  const [globalConfigLoaded, setGlobalConfigLoaded] = useState(false)
  const [globalTemplateListLoading, setGlobalTemplateListLoading] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [createTemplateType, setCreateTemplateType] = useState<HotCodeType>('mitm')
  const [createModalValue, setCreateModalValue] = useState('')
  const [editingTemplateKey, setEditingTemplateKey] = useState('')
  const [editingValue, setEditingValue] = useState('')
  const [addHotCodeTemplateVisible, setAddHotCodeTemplateVisible] = useState(false)
  const [groupModalVisible, setGroupModalVisible] = useState(false)
  const [groupModalValue, setGroupModalValue] = useState('')
  const [groupModalTarget, setGroupModalTarget] = useState<{ item: HotPatchTempItem; type: HotCodeType } | null>(null)
  const [templateMenuVisibleKey, setTemplateMenuVisibleKey] = useState('')
  const [groupSubmenuVisibleKey, setGroupSubmenuVisibleKey] = useState('')
  const [collapsedTemplateGroupKeys, setCollapsedTemplateGroupKeys] = useState<Set<string>>(() => new Set())
  const groupSubmenuCloseTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [loading, setLoading] = useState(false)
  const [templateListLoading, setTemplateListLoading] = useState(false)
  const [editorTab, setEditorTab] = useState<'source' | 'result'>('source')
  const [debugResult, setDebugResult] = useState('')
  const tokenRef = useRef('')
  const userInfo = useStore((s) => s.userInfo)
  const selectRef = useRef<HTMLDivElement>(null)
  const [inViewport] = useInViewport(selectRef)

  const isGlobalType = useMemo(() => activeType === 'global', [activeType])

  useEffect(() => {
    return () => {
      if (groupSubmenuCloseTimerRef.current) {
        clearTimeout(groupSubmenuCloseTimerRef.current)
      }
    }
  }, [])

  const getDefaultTemplates = useMemoizedFn((type: PanelHotCodeType): HotPatchTempItem[] => {
    switch (type) {
      case 'fuzzer':
        return cloneDeep(HotPatchTempDefault)
      case 'mitm':
        return cloneDeep(MITMHotPatchTempDefault)
      case 'httpflow-analyze':
        return AnalyzeHotPatchTempDefault
      default:
        return []
    }
  })

  const getDefaultTemplateContentByType = useMemoizedFn((type: HotCodeType) => {
    switch (type) {
      case 'global':
        return DEFAULT_GLOBAL_TEMPLATE_CONTENT
      case 'fuzzer':
        return HotPatchDefaultContent
      case 'mitm':
        return HotPatchTemplate
      case 'httpflow-analyze':
        return HotPatchDefaultContent
      default:
        return ''
    }
  })

  const sortGlobalTemplateList = useMemoizedFn((list: HotPatchTempItem[], enabledName?: string) => {
    if (!enabledName) return list

    const enabledIndex = list.findIndex((item) => item.name === enabledName)
    if (enabledIndex <= 0) return list

    const nextList = [...list]
    const [enabledItem] = nextList.splice(enabledIndex, 1)
    nextList.unshift(enabledItem)
    return nextList
  })

  const getTemplateKey = useMemoizedFn((type: HotCodeType, name: string) => `${type}:${name}`)

  const parseTemplateKey = useMemoizedFn((templateKey: string) => {
    const [type, ...nameParts] = templateKey.split(':')
    return {
      type: type as HotCodeType,
      name: nameParts.join(':'),
    }
  })

  const syncSelectedTemplate = useMemoizedFn(
    (type: HotCodeType, templateName?: string, source: 'local' | 'online' = 'local') => {
      if (!templateName) return
      setActiveType(type)
      setSelectedTemplate(templateName)
      setSelectedTemplateSource(source)
    },
  )

  // 验证模板名称
  const validateTemplateName = useMemoizedFn((name: string, type: HotCodeType) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      yakitNotify('warning', t('AddHotCodeTemplate.template_empty_message'))
      return false
    }
    const list = type === 'global' ? globalTemplateList : templateList
    if (list.find((item) => item.name === trimmedName)) {
      yakitNotify('warning', t('AddHotCodeTemplate.template_repeat_message'))
      return false
    }
    return true
  })

  const withGlobalLoading = useMemoizedFn(async (action: () => Promise<void>) => {
    setGlobalConfigLoading(true)
    await action().finally(() => {
      setGlobalConfigLoading(false)
      setGlobalConfigLoaded(true)
    })
  })

  // 获取已启用的全局热加载模板
  const loadGlobalHotPatchConfig = useMemoizedFn(() => withGlobalLoading(loadGlobalHotPatchConfigStore))
  // 启用全局热加载模板
  const onEnableSelectedAsGlobal = useMemoizedFn((templateName?: string) =>
    withGlobalLoading(async () => {
      const nameToEnable = templateName || selectedTemplate
      // 如果是当前选中的模板，先保存内容
      if (!templateName || templateName === selectedTemplate) {
        await ipcRenderer.invoke('UpdateHotPatchTemplate', {
          Condition: { Type: activeType, Name: [selectedTemplate] },
          Data: { Type: activeType, Content: getCode(), Name: selectedTemplate },
        })
      }
      await useGlobalHotPatch.getState().enableGlobalHotPatch(nameToEnable)
      loadGlobalTemplateList(undefined, nameToEnable)
    }),
  )
  // 停用全局热加载模板
  const onDisableGlobalHotPatch = useMemoizedFn(() =>
    withGlobalLoading(async () => {
      await useGlobalHotPatch.getState().disableGlobalHotPatch()
      loadGlobalTemplateList()
    }),
  )

  const loadGlobalTemplateList = useMemoizedFn((selectedName?: string, enabledName?: string) => {
    setGlobalTemplateListLoading(true)
    ipcRenderer
      .invoke('QueryHotPatchTemplate', { Type: 'global' })
      .then(async (res: QueryHotPatchTemplateResponse) => {
        const resData = res.Data || []
        const allNames = await ensureHotPatchDefaultTemplates(
          'global',
          resData,
          DEFAULT_GLOBAL_TEMPLATES.map((tpl) => ({ name: tpl.name, content: tpl.content })),
        )
        const newList = toHotPatchTempItems(allNames, (name) =>
          DEFAULT_GLOBAL_TEMPLATES.some((item) => item.name === name),
        )
        const currentEnabledName = enabledName || (globalHotPatchConfig?.Enabled ? globalEnabledTemplateName : '')
        const nextList = sortGlobalTemplateList(newList, currentEnabledName)
        setGlobalTemplateList(nextList)

        const defaultSelectedName =
          selectedName || (activeType === 'global' && !selectedTemplate ? currentEnabledName || nextList[0]?.name : '')
        const defaultSelectedTemplate = nextList.find((item) => item.name === defaultSelectedName)
        if (defaultSelectedTemplate) {
          onSelectTemplate('global', defaultSelectedTemplate, 'local')
        }
      })
      .catch((error) => {
        yakitFailed(error + '')
        setGlobalTemplateList([])
      })
      .finally(() => setGlobalTemplateListLoading(false))
  })

  const loadTemplateList = useMemoizedFn((type: PanelHotCodeType, selectedName?: string) => {
    const isWebFuzzer = type === 'fuzzer'
    const defaultTemplates = getDefaultTemplates(type)
    setTemplateListLoading(true)
    ipcRenderer
      .invoke('QueryHotPatchTemplate', { Type: type })
      .then(async (res: QueryHotPatchTemplateResponse) => {
        const resData = res.Data || []
        const allNames = await ensureHotPatchDefaultTemplates(
          type,
          resData,
          defaultTemplates.map((tpl) => ({ name: tpl.name, content: tpl.temp })),
        )
        const newList = toHotPatchTempItems(allNames, (name) => defaultTemplates.some((item) => item.name === name))
        setTemplateList(newList)
        if (selectedName && newList.some((item) => item.name === selectedName)) {
          syncSelectedTemplate(type, selectedName)
        } else if (panelType === type && activeType !== 'global' && !selectedTemplate && newList.length > 0) {
          onSelectTemplate(type, newList[0], 'local')
        }
      })
      .catch((error) => {
        yakitFailed(error + '')
        setTemplateList(defaultTemplates)
        if (selectedName && defaultTemplates.some((item) => item.name === selectedName)) {
          syncSelectedTemplate(type, selectedName)
        } else if (panelType === type && activeType !== 'global' && !selectedTemplate && defaultTemplates.length > 0) {
          onSelectTemplate(type, defaultTemplates[0], 'local')
        }
      })
      .finally(() => setTemplateListLoading(false))

    if (isEnpriTrace() && isWebFuzzer) {
      NetWorkApi<GetOnlineHotPatchTemplateRequest, API.HotPatchTemplateResponse>({
        method: 'get',
        url: 'hot/patch/template',
        data: {
          page: 1,
          limit: 1000,
          type,
        },
      })
        .then((res) => {
          const d = res.data || []
          const list = d.map((item) => ({ name: item.name, temp: item.content, isDefault: false }))
          setTemplateListOnline(list)
        })
        .catch((err) => {
          yakitFailed(t('HotCodeTemplate.fetch_online_template_list_failed') + err)
          setTemplateListOnline([])
        })
    } else {
      setTemplateListOnline([])
    }
  })

  useEffect(() => {
    if (!inViewport || !globalConfigLoaded) return
    loadGlobalTemplateList()
  }, [globalConfigLoaded, inViewport, loadGlobalTemplateList])

  useEffect(() => {
    if (!inViewport) return
    loadTemplateList(panelType)
  }, [inViewport, loadTemplateList, panelType])

  useEffect(() => {
    loadGlobalHotPatchConfig()
  }, [loadGlobalHotPatchConfig])

  const resetDebug = useMemoizedFn(() => {
    setDebugResult('')
    setEditorTab('source')
  })

  const onSelectTemplate = useMemoizedFn((type: HotCodeType, item: HotPatchTempItem, source: 'local' | 'online') => {
    setActiveType(type)
    setSelectedTemplate(item.name)
    setSelectedTemplateSource(source)
    resetDebug()

    if (source === 'online') {
      setCode(item.temp)
      return
    }
    ipcRenderer
      .invoke('QueryHotPatchTemplate', { Type: type, Name: [item.name] })
      .then((res: QueryHotPatchTemplateResponse) => {
        setCode(res.Data[0]?.Content || '')
      })
      .catch((error) => {
        yakitFailed(error + '')
        setCode('')
      })
  })

  const onAddNewTemplate = useMemoizedFn((type: HotCodeType) => {
    setCreateTemplateType(type)
    setCreateModalValue('')
    setCreateModalVisible(true)
  })

  const onRenameTemplate = useMemoizedFn((item: HotPatchTempItem, type: HotCodeType) => {
    setEditingTemplateKey(getTemplateKey(type, item.name))
    setEditingValue(item.name)
  })

  const onConfirmCreate = useMemoizedFn(() => {
    const newName = createModalValue.trim()
    if (!validateTemplateName(newName, createTemplateType)) return
    const defaultTemplateContent = getDefaultTemplateContentByType(createTemplateType)

    ipcRenderer
      .invoke('CreateHotPatchTemplate', {
        Type: createTemplateType,
        Content: defaultTemplateContent,
        Name: newName,
      })
      .then(() => {
        yakitNotify('success', t('AddHotCodeTemplate.add_template_success'))
        setCreateModalVisible(false)
        if (createTemplateType === 'global') {
          loadGlobalTemplateList(newName)
        } else {
          setPanelType(createTemplateType)
          loadTemplateList(createTemplateType, newName)
        }
        syncSelectedTemplate(createTemplateType, newName)
        resetDebug()
        setCode(defaultTemplateContent)
      })
      .catch((error) => {
        yakitFailed(error + '')
      })
  })

  const onConfirmRename = useMemoizedFn(async () => {
    const { type: currentEditingType, name: oldName } = parseTemplateKey(editingTemplateKey)
    const newName = editingValue.trim()

    setEditingTemplateKey('')
    setEditingValue('')

    if (!oldName || oldName === newName) return
    if (!validateTemplateName(newName, currentEditingType)) return

    try {
      await ipcRenderer.invoke('UpdateHotPatchTemplate', {
        Condition: { Type: currentEditingType, Name: [oldName] },
        Data: { Name: newName },
      })

      yakitNotify('success', t('YakitNotification.reName_success'))
      if (currentEditingType === 'global') {
        loadGlobalTemplateList(newName)
      } else {
        loadTemplateList(currentEditingType, newName)
      }
      if (activeType === currentEditingType && selectedTemplate === oldName) {
        syncSelectedTemplate(currentEditingType, newName)
        resetDebug()
      }
      if (currentEditingType === 'global' && globalEnabledTemplateName === oldName) {
        await useGlobalHotPatch.getState().enableGlobalHotPatch(newName)
      }
    } catch (error) {
      yakitFailed(error + '')
    }
  })

  const onDeleteTemplate = useMemoizedFn((item: HotPatchTempItem, source: 'local' | 'online', type: HotCodeType) => {
    const isCurrentSelected = activeType === type && selectedTemplate === item.name && selectedTemplateSource === source
    if (source === 'local') {
      ipcRenderer
        .invoke('DeleteHotPatchTemplate', {
          Condition: { Type: type, Name: [item.name] },
        })
        .then(async () => {
          yakitNotify('success', t('YakitNotification.deleted'))
          if (type === 'global') {
            loadGlobalTemplateList()
          } else {
            loadTemplateList(type)
          }
          if (isCurrentSelected) {
            setSelectedTemplate('')
            setSelectedTemplateSource('local')
            setCode('')
            resetDebug()
          }
          if (type === 'global' && globalEnabledTemplateName === item.name) {
            await useGlobalHotPatch.getState().disableGlobalHotPatch()
          }
        })
        .catch((error) => {
          yakitFailed(error + '')
        })
    } else {
      NetWorkApi<API.HotPatchTemplateRequest, API.ActionSucceeded>({
        method: 'delete',
        url: 'hot/patch/template',
        data: {
          type,
          name: item.name,
        },
      })
        .then((res) => {
          if (res.ok) {
            yakitNotify('success', t('HotCodeTemplate.online_delete_success'))
            if (type !== 'global') {
              loadTemplateList(type)
            }
            if (isCurrentSelected) {
              setSelectedTemplate('')
              setSelectedTemplateSource('local')
              setCode('')
              resetDebug()
            }
          }
        })
        .catch((err) => {
          yakitFailed(t('HotCodeTemplate.online_delete_failed') + err)
        })
    }
  })

  const onSaveTemplate = useMemoizedFn(async () => {
    try {
      await ipcRenderer.invoke('UpdateHotPatchTemplate', {
        Condition: { Type: activeType, Name: [selectedTemplate] },
        Data: { Type: activeType, Content: getCode(), Name: selectedTemplate },
      })
      const isCurrentGlobalEnabled =
        activeType === 'global' && globalHotPatchConfig?.Enabled && globalEnabledTemplateName === selectedTemplate

      if (isCurrentGlobalEnabled) {
        await withGlobalLoading(() => useGlobalHotPatch.getState().enableGlobalHotPatch(selectedTemplate))
      }

      yakitNotify('success', t('YakitNotification.saved'))
    } catch (error) {
      yakitFailed(error + '')
    }
  })

  useEffect(() => {
    if (!inViewport) return
    registerShortcutKeyHandle(ShortcutKeyPage.HotPatchManagement)
    getStorageHotPatchManagementShortcutKeyEvents()

    return () => {
      unregisterShortcutKeyHandle(ShortcutKeyPage.HotPatchManagement)
    }
  }, [inViewport])

  useShortcutKeyTrigger(
    'saveHotPatch*hotPatchManagement',
    useMemoizedFn(() => {
      if (inViewport) {
        if (disableSaveTemplate) {
          setAddHotCodeTemplateVisible(true)
          return
        }
        onSaveTemplate()
      }
    }),
  )

  const onSaveAsSuccess = useMemoizedFn((tempName?: string) => {
    if (!tempName) return
    if (activeType === 'global') {
      loadGlobalTemplateList(tempName)
    } else {
      setPanelType(activeType)
      loadTemplateList(activeType, tempName)
    }
    syncSelectedTemplate(activeType, tempName)
    resetDebug()
  })

  const onCancelDebug = useMemoizedFn(() => {
    if (tokenRef.current) {
      ipcRenderer.invoke('cancel-StringFuzzer', tokenRef.current).catch(() => {})
      setLoading(false)
      tokenRef.current = ''
      yakitNotify('info', t('HTTPFuzzerHotPatch.debugCancelled'))
    }
  })

  const onDebugExecution = useMemoizedFn(async () => {
    setLoading(true)
    tokenRef.current = `hot-patch-debug-${Date.now()}-${Math.random()}`

    const params: StringFuzzerParams = {
      Template: getTemplateContent(),
      HotPatchCode: getCode(),
      HotPatchCodeWithParamGetter: HOT_PATCH_PARAMS_GETTER_DEFAULT,
      TimeoutSeconds: DEBUG_TIMEOUT_SECONDS,
      Limit: DEBUG_LIMIT,
    }

    try {
      const response: StringFuzzerResponse = await ipcRenderer.invoke('StringFuzzer', params, tokenRef.current)
      const data: string[] = (response.Results || []).map((buf) => Buffer.from(buf).toString('utf8'))
      const resultText = data.length > 0 ? data.join('\r\n') : ''
      setDebugResult(resultText)
      setEditorTab('result')
    } catch (err) {
      if (tokenRef.current) {
        yakitNotify('error', `${t('HTTPFuzzerHotPatch.debugFailed')}: ${err}`)
      }
    } finally {
      setTimeout(() => {
        setLoading(false)
        tokenRef.current = ''
      }, 300)
    }
  })

  // admin、审核员 支持（本地上传，线上删除）
  const hasPermissions = useMemo(() => ['admin', 'auditor'].includes(userInfo.role || ''), [userInfo.role])

  const hotCodeTypeOptions = useMemo(
    () => [
      {
        label: t('AddHotCodeTemplate.MITM_hot_template'),
        value: 'mitm',
      },
      {
        label: t('AddHotCodeTemplate.WebFuzzer_hot_template'),
        value: 'fuzzer',
      },
      {
        label: t('YakitRoute.historyAnalyzer'),
        value: 'httpflow-analyze',
      },
    ],
    [i18n.language],
  )

  const onChangePanelType = useMemoizedFn((type: PanelHotCodeType) => {
    setPanelType(type)
    if (activeType !== 'global') {
      setActiveType(type)
      setSelectedTemplate('')
      setSelectedTemplateSource('local')
      setCode('')
      resetDebug()
    }
  })

  const globalTemplateGroups = useMemo(() => collectTemplateGroups(globalTemplateList), [globalTemplateList])
  const panelTemplateGroups = useMemo(() => collectTemplateGroups(templateList), [templateList])

  const closeTemplateMenu = useMemoizedFn(() => {
    setTemplateMenuVisibleKey('')
    setGroupSubmenuVisibleKey('')
  })

  const onGroupSubmenuHover = useMemoizedFn((templateKey: string | null) => {
    if (groupSubmenuCloseTimerRef.current) {
      clearTimeout(groupSubmenuCloseTimerRef.current)
      groupSubmenuCloseTimerRef.current = undefined
    }
    if (templateKey) {
      setGroupSubmenuVisibleKey(templateKey)
      return
    }
    groupSubmenuCloseTimerRef.current = setTimeout(() => {
      setGroupSubmenuVisibleKey('')
    }, 120)
  })

  const onUpdateTemplateTags = useMemoizedFn(async (item: HotPatchTempItem, type: HotCodeType, tag: string) => {
    const Tags = tag.trim()

    const params = {
      Condition: { Type: type, Name: [item.name] },
      Data: { Tags: Tags ? [Tags] : [] },
    }
    try {
      await ipcRenderer.invoke('UpdateHotPatchTemplate', params)
      if (type === 'global') {
        loadGlobalTemplateList()
      } else {
        loadTemplateList(type)
      }
      closeTemplateMenu()
      yakitNotify(
        'success',
        t(Tags ? 'HotCodeTemplate.add_to_group_success' : 'HotCodeTemplate.remove_from_group_success'),
      )
    } catch (error) {
      yakitFailed(error + '')
    }
  })

  const onRemoveTemplateGroup = useMemoizedFn(async (item: HotPatchTempItem, type: HotCodeType) => {
    await onUpdateTemplateTags(item, type, '')
  })

  const onOpenCreateGroupModal = useMemoizedFn((item: HotPatchTempItem, type: HotCodeType) => {
    setGroupModalTarget({ item, type })
    setGroupModalValue('')
    setGroupModalVisible(true)
    closeTemplateMenu()
  })

  const onConfirmCreateGroup = useMemoizedFn(async () => {
    const tag = groupModalValue.trim()
    if (!tag || !groupModalTarget) return
    await onUpdateTemplateTags(groupModalTarget.item, groupModalTarget.type, tag)
    setGroupModalVisible(false)
    setGroupModalValue('')
    setGroupModalTarget(null)
  })

  const renderAddToGroupSubmenu = useMemoizedFn(
    (type: HotCodeType, item: HotPatchTempItem, currentTemplateKey: string, groups: string[]) => (
      <div
        className={styles['popover-menu-item-submenu']}
        onMouseEnter={() => onGroupSubmenuHover(currentTemplateKey)}
        onMouseLeave={() => onGroupSubmenuHover(null)}
      >
        <div className={styles['popover-menu-item']}>
          <span>{t('HotCodeTemplate.add_to_group')}</span>
          <OutlineChevronrightIcon className={styles['popover-menu-arrow']} />
        </div>
        {!!item.Tags?.trim() && (
          <div
            className={styles['popover-menu-item']}
            onClick={(e) => {
              e.stopPropagation()
              onRemoveTemplateGroup(item, type)
            }}
          >
            <span>{t('HotCodeTemplate.remove_from_group')}</span>
          </div>
        )}
        <div
          className={classNames(styles['popover-submenu'], {
            [styles['popover-submenu-visible']]: groupSubmenuVisibleKey === currentTemplateKey,
          })}
          onMouseEnter={() => onGroupSubmenuHover(currentTemplateKey)}
          onMouseLeave={() => onGroupSubmenuHover(null)}
        >
          <div
            className={styles['popover-menu-item']}
            onClick={(e) => {
              e.stopPropagation()
              onOpenCreateGroupModal(item, type)
            }}
          >
            <span>{t('HotCodeTemplate.create_group')}...</span>
          </div>
          {groups.map((group) => (
            <div
              key={group}
              className={styles['popover-menu-item']}
              onClick={(e) => {
                e.stopPropagation()
                onUpdateTemplateTags(item, type, group)
              }}
            >
              <span className={styles['popover-menu-group-name']} title={group}>
                {group}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  )

  const renderTemplateItem = useMemoizedFn((type: HotCodeType, item: HotPatchTempItem, source: 'local' | 'online') => {
    const currentTemplateKey = getTemplateKey(type, item.name)
    const existingGroups = type === 'global' ? globalTemplateGroups : panelTemplateGroups
    const showTemplateMenu = source === 'local' || (source === 'online' && hasPermissions)
    return (
      <div
        key={`${type}-${source}-${item.name}`}
        className={classNames(styles['type-template-item'], {
          [styles['type-template-item-active']]:
            activeType === type && selectedTemplate === item.name && selectedTemplateSource === source,
        })}
        onClick={() => {
          if (editingTemplateKey !== currentTemplateKey) {
            onSelectTemplate(type, item, source)
          }
        }}
      >
        {editingTemplateKey === currentTemplateKey && source === 'local' ? (
          <YakitInput
            value={editingValue}
            autoFocus
            showCount
            maxLength={INPUT_MAX_LENGTH}
            size="small"
            onPressEnter={onConfirmRename}
            onBlur={onConfirmRename}
            onChange={(e) => setEditingValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className={styles['template-name']} title={item.name}>
              {item.name}
            </span>
            {item.isDefault && (
              <YakitTag color="info" size="small">
                {t('YakitButton.builtIn')}
              </YakitTag>
            )}
            {type === 'global' && globalEnabledTemplateName === item.name && (
              <YakitTag className={styles['global-enabled-tag']} color="info">
                {t('YakitButton.enabled')}
              </YakitTag>
            )}
            {showTemplateMenu && (
              <YakitPopover
                overlayClassName={styles['template-popover']}
                visible={templateMenuVisibleKey === currentTemplateKey}
                onVisibleChange={(visible) => {
                  setTemplateMenuVisibleKey(visible ? currentTemplateKey : '')
                  if (!visible) {
                    setGroupSubmenuVisibleKey('')
                  }
                }}
                content={
                  <>
                    {source === 'local' && renderAddToGroupSubmenu(type, item, currentTemplateKey, existingGroups)}
                    {type === 'global' &&
                      (() => {
                        const isThisItemEnabled =
                          globalHotPatchConfig?.Enabled && globalEnabledTemplateName === item.name
                        return (
                          <div
                            className={classNames(
                              styles['popover-menu-item'],
                              isThisItemEnabled
                                ? styles['popover-menu-item-danger']
                                : styles['popover-menu-item-primary'],
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              isThisItemEnabled ? onDisableGlobalHotPatch() : onEnableSelectedAsGlobal(item.name)
                            }}
                          >
                            {isThisItemEnabled ? <SolidStopIcon /> : <SolidPlayIcon />}
                            <span>{isThisItemEnabled ? t('YakitButton.close') : t('YakitButton.enable')}</span>
                          </div>
                        )
                      })()}
                    {source === 'local' && !item.isDefault && (
                      <div
                        className={styles['popover-menu-item']}
                        onClick={(e) => {
                          e.stopPropagation()
                          onRenameTemplate(item, type)
                        }}
                      >
                        <OutlinePencilaltIcon />
                        <span>{t('YakitButton.rename')}</span>
                      </div>
                    )}
                    {((!item.isDefault && source === 'local') || (source === 'online' && hasPermissions)) && (
                      <div
                        className={classNames(styles['popover-menu-item'], styles['popover-menu-item-danger'])}
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteTemplate(item, source, type)
                        }}
                      >
                        <OutlineTrashIcon />
                        <span>{t('YakitButton.delete')}</span>
                      </div>
                    )}
                  </>
                }
              >
                <SolidDotsverticalIcon className={styles['template-more-icon']} onClick={(e) => e.stopPropagation()} />
              </YakitPopover>
            )}
          </>
        )}
      </div>
    )
  })

  const renderTemplateTeamList = useMemoizedFn(
    (type: HotCodeType, list: HotPatchTempItem[], source: 'local' | 'online') => {
      const getGroupKey = (tags: string) => `${type}:${source}:${tags}`

      return formatTemplateTeams(list).map((team, index) => {
        if (!team.tags) {
          return (
            <React.Fragment key={`ungrouped-${type}-${source}-${index}`}>
              {team.node.map((item) => renderTemplateItem(type, item, source))}
            </React.Fragment>
          )
        }

        const groupKey = getGroupKey(team.tags)
        const expanded = !collapsedTemplateGroupKeys.has(groupKey)

        return (
          <div key={groupKey} className={styles['template-tree-group']}>
            <div
              className={styles['template-tree-group-header']}
              onClick={() => {
                setCollapsedTemplateGroupKeys((prev) => {
                  const next = new Set(prev)
                  if (next.has(groupKey)) {
                    next.delete(groupKey)
                  } else {
                    next.add(groupKey)
                  }
                  return next
                })
              }}
            >
              <SolidChevronrightIcon
                className={classNames(styles['template-tree-expand-icon'], {
                  [styles['template-tree-expand-icon-expanded']]: expanded,
                })}
              />
              <span className={styles['template-tree-group-title']} title={team.tags}>
                {team.tags}
              </span>
              <span className={styles['template-tree-group-count']}>{team.node.length}</span>
            </div>
            {expanded && (
              <div className={styles['template-tree-group-children']}>
                {team.node.map((item) => renderTemplateItem(type, item, source))}
              </div>
            )}
          </div>
        )
      })
    },
  )

  const renderMenu = useMemoizedFn(() => {
    return (
      <div className={styles['type-panel']} style={{ width: i18n.language.startsWith('zh') ? 300 : 330 }}>
        <YakitResizeBox
          isVer={true}
          lineDirection="bottom"
          firstRatio="38%"
          firstMinSize="160px"
          secondMinSize="220px"
          firstNode={
            <div className={styles['type-panel-section']}>
              <div className={styles['type-panel-header']}>
                <div>
                  <span className={styles['template-title']}>{t('GlobalHotPatch.Global_hot_template')}</span>
                  <Tooltip title={t('GlobalHotPatch.Global_hot_template_tip')}>
                    <OutlineInformationcircleIcon className={styles['info-icon']} />
                  </Tooltip>
                </div>
                <YakitButton
                  size="small"
                  type="outline1"
                  icon={<OutlinePlusIcon />}
                  onClick={() => onAddNewTemplate('global')}
                />
              </div>
              <div className={styles['type-template']}>
                <YakitSpin spinning={globalTemplateListLoading}>
                  <div className={styles['type-template-scroll']}>
                    {renderTemplateTeamList('global', globalTemplateList, 'local')}
                  </div>
                </YakitSpin>
              </div>
            </div>
          }
          secondNode={
            <div className={styles['type-panel-section']}>
              <div className={styles['type-panel-header']}>
                <YakitRadioButtons
                  value={panelType}
                  onChange={(e) => onChangePanelType(e.target.value as PanelHotCodeType)}
                  buttonStyle="solid"
                  options={hotCodeTypeOptions}
                />
                <YakitButton
                  size="small"
                  type="outline1"
                  icon={<OutlinePlusIcon />}
                  onClick={() => onAddNewTemplate(panelType)}
                />
              </div>
              <div className={styles['type-template']}>
                <YakitSpin spinning={templateListLoading}>
                  <div className={styles['type-template-scroll']}>
                    {renderTemplateTeamList(panelType, templateList, 'local')}
                    {isEnpriTrace() && panelType === 'fuzzer' && (
                      <>
                        <div className={styles['template-divider']} />
                        <div className={styles['template-section-title']}>{t('HotCodeTemplate.online_template')}</div>
                        {templateListOnline.map((item) => renderTemplateItem(panelType, item, 'online'))}
                      </>
                    )}
                  </div>
                </YakitSpin>
              </div>
            </div>
          }
        />
      </div>
    )
  })

  const currentTemplate = useMemo(() => {
    const list =
      activeType === 'global'
        ? globalTemplateList
        : selectedTemplateSource === 'local'
          ? templateList
          : templateListOnline
    return list.find((item) => item.name === selectedTemplate)
  }, [activeType, globalTemplateList, templateList, templateListOnline, selectedTemplate, selectedTemplateSource])

  const disableSaveTemplate = useMemo(
    () => !!(currentTemplate?.isDefault || selectedTemplateSource === 'online'),
    [currentTemplate?.isDefault, selectedTemplateSource],
  )

  const hideTemplateContent = useMemo(
    () => isGlobalType || ['mitm', 'httpflow-analyze'].includes(activeType),
    [isGlobalType, activeType],
  )

  return (
    <div className={styles['hot-patch-management']} ref={selectRef}>
      {renderMenu()}
      <div className={styles['editor-panel']}>
        <div className={styles['editor-title']}>{selectedTemplate}</div>
        <div className={styles['editor-header']}>
          <div>
            {!hideTemplateContent && (
              <YakitRadioButtons
                value={editorTab}
                onChange={(e) => {
                  setEditorTab(e.target.value)
                }}
                buttonStyle="solid"
                options={[
                  {
                    value: 'source',
                    label: t('HTTPFuzzerHotPatch.source'),
                  },
                  {
                    value: 'result',
                    label: t('HTTPFuzzerHotPatch.executionResult'),
                  },
                ]}
              />
            )}
          </div>
          <div className={styles['editor-header-right']}>
            {hideTemplateContent && (
              <Tooltip placement="bottom" title={t('HTTPFuzzerHotPatch.engineConsole')}>
                <YakitButton type="text" onClick={openConsoleNewWindow} icon={<OutlineTerminalIcon />} />
              </Tooltip>
            )}
            {/* 产品要求暂时去掉 */}
            {/* <YakitButton type='primary' loading={loading} onClick={onDebugExecution}>
                            {t("YakitButton.debugExecution")}
                        </YakitButton> */}
            {loading && (
              <YakitButton danger onClick={onCancelDebug}>
                {t('YakitButton.cancel')}
              </YakitButton>
            )}
            {isGlobalType &&
              (() => {
                const isCurrentEnabled = globalHotPatchConfig?.Enabled && globalEnabledTemplateName === selectedTemplate
                return (
                  <YakitButton
                    type="primary"
                    danger={isCurrentEnabled}
                    loading={globalConfigLoading}
                    onClick={() => (isCurrentEnabled ? onDisableGlobalHotPatch() : onEnableSelectedAsGlobal())}
                    icon={isCurrentEnabled ? <SolidStopIcon /> : <SolidPlayIcon />}
                  >
                    {isCurrentEnabled ? t('YakitButton.close') : t('YakitButton.enable')}
                  </YakitButton>
                )
              })()}
            <YakitButton
              type="outline1"
              onClick={() => setAddHotCodeTemplateVisible(true)}
              disabled={selectedTemplateSource === 'online'}
            >
              {t('YakitButton.save_as')}
            </YakitButton>
            <YakitButton type="primary" onClick={onSaveTemplate} disabled={disableSaveTemplate}>
              {t('YakitButton.save')}
            </YakitButton>
          </div>
        </div>
        <YakitResizeBox
          isVer={false}
          lineDirection="left"
          firstNode={
            <div className={styles['editor-left']}>
              {editorTab === 'source' ? (
                <YakitEditor type="yak" value={code} setValue={(newCode) => setCode(newCode)} />
              ) : (
                <YakitEditor type="plaintext" value={debugResult} readOnly={true} />
              )}
            </div>
          }
          firstRatio={hideTemplateContent ? '100%' : '70%'}
          firstMinSize="400px"
          secondRatio="30%"
          secondMinSize="280px"
          secondNodeStyle={hideTemplateContent ? { display: 'none' } : {}}
          secondNode={
            <div className={styles['template-content-panel']}>
              <div className={styles['template-content-header']}>
                <span className={styles['template-content-title']}>{t('HTTPFuzzerHotPatch.templateContent')}</span>
                <div className={styles['template-content-actions']}>
                  <Tooltip placement="bottom" title={t('HTTPFuzzerHotPatch.engineConsole')}>
                    <YakitButton type="text" onClick={openConsoleNewWindow} icon={<OutlineTerminalIcon />} />
                  </Tooltip>
                  <YakitButton type="primary" loading={loading} onClick={onDebugExecution}>
                    {t('YakitButton.debugExecution')}
                  </YakitButton>
                  {loading && (
                    <YakitButton danger onClick={onCancelDebug}>
                      {t('YakitButton.cancel')}
                    </YakitButton>
                  )}
                </div>
              </div>
              <div className={styles['template-content-body']}>
                <YakitEditor type="http" value={templateContent} setValue={(v) => setTemplateContent(v)} />
              </div>
            </div>
          }
        />
      </div>

      <YakitModal
        visible={createModalVisible}
        title={t('AddHotCodeTemplate.add_template')}
        onCancel={() => setCreateModalVisible(false)}
        onOk={onConfirmCreate}
        okText={t('YakitButton.save')}
        cancelText={t('YakitButton.cancel')}
      >
        <YakitInput
          placeholder={t('AddHotCodeTemplate.enter_hot_reload_template_name')}
          value={createModalValue}
          onChange={(e) => setCreateModalValue(e.target.value)}
          maxLength={INPUT_MAX_LENGTH}
        />
      </YakitModal>

      <YakitModal
        visible={groupModalVisible}
        title={t('HotCodeTemplate.create_group')}
        onCancel={() => setGroupModalVisible(false)}
        onOk={onConfirmCreateGroup}
        okButtonProps={{ disabled: !groupModalValue.trim() }}
      >
        <div className={styles['group-modal-form']}>
          <div className={styles['group-modal-label']}>
            <span className={styles['group-modal-required']}>*</span>
            {t('HotCodeTemplate.group_name')}:
          </div>
          <YakitInput
            placeholder={t('HotCodeTemplate.enter_group_name')}
            value={groupModalValue}
            onChange={(e) => setGroupModalValue(e.target.value)}
            showCount
            maxLength={INPUT_MAX_LENGTH}
          />
          <div className={styles['group-modal-tip']}>{t('HotCodeTemplate.create_group_tip')}</div>
        </div>
      </YakitModal>

      <AddHotCodeTemplate
        type={activeType}
        title={t('YakitButton.save_as')}
        hotPatchTempLocal={templateList}
        hotPatchCode={code}
        visible={addHotCodeTemplateVisible}
        onSetAddHotCodeTemplateVisible={setAddHotCodeTemplateVisible}
        onSaveHotCodeOk={onSaveAsSuccess}
      />
    </div>
  )
}
