import React, { memo, useEffect, useMemo, useRef, useState } from "react"
import { useMemoizedFn, useGetState, useInViewport } from "ahooks"
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton"
import { YakitInput } from "@/components/yakitUI/YakitInput/YakitInput"
import { YakitEditor } from "@/components/yakitUI/YakitEditor/YakitEditor"
import { YakitModal } from "@/components/yakitUI/YakitModal/YakitModal"
import { yakitFailed, yakitNotify } from "@/utils/notification"
import { HotPatchTempItem, AddHotCodeTemplate } from "@/pages/fuzzer/HTTPFuzzerHotPatch"
import { HotPatchDefaultContent, HotPatchTempDefault } from "@/defaultConstants/HTTPFuzzerPage"
import { MITMHotPatchTempDefault } from "@/defaultConstants/mitm"
import { cloneDeep } from "lodash"
import {
    OutlinePlusIcon,
    OutlineTrashIcon,
    OutlinePencilaltIcon,
    OutlineTerminalIcon,
    OutlineInformationcircleIcon,
} from "@/assets/icon/outline"
import { openConsoleNewWindow } from "@/utils/openWebsite"
import { Tooltip } from "antd"
import classNames from "classnames"
import { YakitSideTab } from "@/components/yakitSideTab/YakitSideTab"
import { YakitTabsProps } from "@/components/yakitSideTab/YakitSideTabType"
import { YakitSpin } from "@/components/yakitUI/YakitSpin/YakitSpin"
import { NewPayload } from "@/pages/payloadManager/newPayload"
import ProxyRulesConfig from "@/components/configNetwork/ProxyRulesConfig"
import { useI18nNamespaces } from "@/i18n/useI18nNamespaces"
import { configManagementTabType, useConfigManagementTab, useStore } from "@/store"
import { YakitRoute } from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"
import useShortcutKeyTrigger from "@/utils/globalShortcutKey/events/useShortcutKeyTrigger"
import { getStorageHotPatchManagementShortcutKeyEvents } from "@/utils/globalShortcutKey/events/page/hotPatchManagement"
import { ShortcutKeyPage } from "@/utils/globalShortcutKey/events/pageMaps"
import { registerShortcutKeyHandle, unregisterShortcutKeyHandle } from "@/utils/globalShortcutKey/utils"
import { YakitPopover } from "@/components/yakitUI/YakitPopover/YakitPopover"
import { YakitResizeBox } from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import { YakitRadioButtons } from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import { isEnpriTrace } from "@/utils/envfile"
import { NetWorkApi } from "@/services/fetch"
import { API } from "@/services/swagger/resposeType"
import styles from "./ConfigManagement.module.scss"
import { SolidDotsverticalIcon, SolidPlayIcon, SolidStopIcon } from "@/assets/icon/solid"
import { YakitTag } from "@/components/yakitUI/YakitTag/YakitTag"
import { DEFAULT_GLOBAL_TEMPLATE_CONTENT, DEFAULT_GLOBAL_TEMPLATE_NAME, useGlobalHotPatch, useGlobalHotPatchTag } from "@/store/globalHotPatch"
import { HotPatchTemplate } from "@/pages/invoker/data/MITMPluginTamplate"

const { ipcRenderer } = window.require("electron")

const ConfigManagement: React.FC = memo(() => {
    const { t, i18n } = useI18nNamespaces(["yakitUi", "yakitRoute", "layout"])
    const { configManagementActiveTab, setConfigManagementActiveTab } = useConfigManagementTab()

    const yakitTabs: YakitTabsProps[] = useMemo(() => {
        return [
            {
                label: t("YakitRoute.Payload"),
                value: "payload"
            },
            {
                label: t("Layout.ExtraMenu.proxyManagement"),
                value: "proxy"
            },
            {
                label: t("Layout.ExtraMenu.hotPatchManagement"),
                value: "hotPatch"
            }
        ]
    }, [i18n.language])

    const getCurrentTabLabel = useMemo(() => {
        switch (configManagementActiveTab) {
            case "payload":
                return t("YakitRoute.Payload")
            case "proxy":
                return t("Layout.ExtraMenu.proxyManagement")
            case "hotPatch":
                return t("Layout.ExtraMenu.hotPatchManagement")
            default:
                return t("YakitRoute.configManagement")
        }
    }, [configManagementActiveTab, i18n.language])

    useEffect(() => {
        emiter.emit(
            "onUpdateSingletonPageName",
            JSON.stringify({
                route: YakitRoute.ConfigManagement,
                value: getCurrentTabLabel
            })
        )
    }, [configManagementActiveTab, getCurrentTabLabel])

    const content = useMemo(() => {
        switch (configManagementActiveTab) {
            case "payload":
                return <NewPayload />
            case "proxy":
                return <ProxyRulesConfig />
            case "hotPatch":
                return <HotPatchManagement />
            default:
                return null
        }
    }, [configManagementActiveTab])

    return (
        <YakitSideTab
            activeShow={true}
            yakitTabs={yakitTabs}
            activeKey={configManagementActiveTab}
            onActiveKey={(key) => setConfigManagementActiveTab(key as configManagementTabType)}
            t={t}
        >
            <div className={styles["config-management-content"]}>{content}</div>
        </YakitSideTab>
    )
})

export default ConfigManagement

type HotCodeType = "fuzzer" | "mitm" | "global"
type PanelHotCodeType = Exclude<HotCodeType, "global">

interface QueryHotPatchTemplateListResponse {
    Name: string[]
    Total: number
}

interface QueryHotPatchTemplateResponse {
    Data: { Name: string; Content: string; Type: string }[]
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

export const HotPatchManagement: React.FC = () => {
    const [activeType, setActiveType] = useState<HotCodeType>("global")
    const [panelType, setPanelType] = useState<PanelHotCodeType>("mitm")
    const [globalTemplateList, setGlobalTemplateList] = useState<HotPatchTempItem[]>([])
    const [templateList, setTemplateList] = useState<HotPatchTempItem[]>([])
    const [templateListOnline, setTemplateListOnline] = useState<HotPatchTempItem[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState("")
    const [selectedTemplateSource, setSelectedTemplateSource] = useState<"local" | "online">("local")
    const [code, setCode, getCode] = useGetState("")
    const [templateContent, setTemplateContent, getTemplateContent] = useGetState(DEFAULT_TEMPLATE_CONTENT)
    const { globalHotPatchConfig, loadGlobalHotPatchConfig: loadGlobalHotPatchConfigStore } = useGlobalHotPatch()
    const { globalEnabledTemplateName } = useGlobalHotPatchTag()
    const [globalConfigLoading, setGlobalConfigLoading] = useState(false)
    const [globalConfigLoaded, setGlobalConfigLoaded] = useState(false)
    const [globalTemplateListLoading, setGlobalTemplateListLoading] = useState(false)
    const [createModalVisible, setCreateModalVisible] = useState(false)
    const [createTemplateType, setCreateTemplateType] = useState<HotCodeType>("mitm")
    const [createModalValue, setCreateModalValue] = useState("")
    const [editingTemplateKey, setEditingTemplateKey] = useState("")
    const [editingValue, setEditingValue] = useState("")
    const [addHotCodeTemplateVisible, setAddHotCodeTemplateVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [templateListLoading, setTemplateListLoading] = useState(false)
    const [editorTab, setEditorTab] = useState<"source" | "result">("source")
    const [debugResult, setDebugResult] = useState("")
    const tokenRef = useRef("")
    const userInfo = useStore((s) => s.userInfo)
    const selectRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(selectRef)

    const { t, i18n } = useI18nNamespaces(["yakitUi", "yakitRoute", "layout", "webFuzzer"])

    const isGlobalType = useMemo(()=> activeType === "global", [activeType])

    const getDefaultTemplates = useMemoizedFn((type: PanelHotCodeType) => {
        return cloneDeep(type === "fuzzer" ? HotPatchTempDefault : MITMHotPatchTempDefault)
    })

    const getDefaultTemplateContentByType = useMemoizedFn((type: HotCodeType) => {
        switch (type) {
            case "global":
                return DEFAULT_GLOBAL_TEMPLATE_CONTENT
            case "fuzzer":
                return HotPatchDefaultContent
            case "mitm":
                return HotPatchTemplate
            default:
                return ""
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
        const [type, ...nameParts] = templateKey.split(":")
        return {
            type: type as HotCodeType,
            name: nameParts.join(":")
        }
    })

    const syncSelectedTemplate = useMemoizedFn((type: HotCodeType, templateName?: string, source: "local" | "online" = "local") => {
        if (!templateName) return
        setActiveType(type)
        setSelectedTemplate(templateName)
        setSelectedTemplateSource(source)
    })

    // 验证模板名称
    const validateTemplateName = useMemoizedFn((name: string, type: HotCodeType) => {
        const trimmedName = name.trim()
        if (!trimmedName) {
            yakitNotify("warning", t("AddHotCodeTemplate.template_empty_message"))
            return false
        }
        const list = type === "global" ? globalTemplateList : templateList
        if (list.find((item) => item.name === trimmedName)) {
            yakitNotify("warning", t("AddHotCodeTemplate.template_repeat_message"))
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
    const loadGlobalHotPatchConfig = useMemoizedFn(() =>
        withGlobalLoading(loadGlobalHotPatchConfigStore)
    )
    // 启用全局热加载模板
    const onEnableSelectedAsGlobal = useMemoizedFn((templateName?: string) =>
        withGlobalLoading(async () => {
            const nameToEnable = templateName || selectedTemplate
            // 如果是当前选中的模板，先保存内容
            if (!templateName || templateName === selectedTemplate) {
                await ipcRenderer.invoke("UpdateHotPatchTemplate", {
                    Condition: { Type: activeType, Name: [selectedTemplate] },
                    Data: { Type: activeType, Content: getCode(), Name: selectedTemplate }
                })
            }
            await useGlobalHotPatch.getState().enableGlobalHotPatch(nameToEnable)
            loadGlobalTemplateList(undefined, nameToEnable)
        })
    )
    // 停用全局热加载模板
    const onDisableGlobalHotPatch = useMemoizedFn(() =>
        withGlobalLoading(async () => {
            await useGlobalHotPatch.getState().disableGlobalHotPatch()
            loadGlobalTemplateList()
        })
    )

    const loadGlobalTemplateList = useMemoizedFn((selectedName?: string, enabledName?: string) => {
        setGlobalTemplateListLoading(true)
        ipcRenderer
            .invoke("QueryHotPatchTemplateList", {Type: "global"})
            .then(async (res: QueryHotPatchTemplateListResponse) => {
                const nameArr = res.Name || []
                let allNames = [...nameArr]
                if (!nameArr.includes(DEFAULT_GLOBAL_TEMPLATE_NAME)) {
                    await ipcRenderer.invoke("CreateHotPatchTemplate", {
                        Type: "global",
                        Content: DEFAULT_GLOBAL_TEMPLATE_CONTENT,
                        Name: DEFAULT_GLOBAL_TEMPLATE_NAME
                    })
                    allNames = [DEFAULT_GLOBAL_TEMPLATE_NAME, ...allNames]
                }
                const newList = allNames.map((name) => ({
                    name,
                    temp: "",
                    isDefault: false
                }))
                const currentEnabledName = enabledName || (globalHotPatchConfig?.Enabled ? globalEnabledTemplateName : "")
                const nextList = sortGlobalTemplateList(newList, currentEnabledName)
                setGlobalTemplateList(nextList)

                const defaultSelectedName = selectedName || (activeType === "global" && !selectedTemplate ? currentEnabledName || nextList[0]?.name : "")
                const defaultSelectedTemplate = nextList.find((item) => item.name === defaultSelectedName)
                if (defaultSelectedTemplate) {
                    onSelectTemplate("global", defaultSelectedTemplate, "local")
                }
            })
            .catch((error) => {
                yakitFailed(error + "")
                setGlobalTemplateList([])
            })
            .finally(() => setGlobalTemplateListLoading(false))
    })

    const loadTemplateList = useMemoizedFn((type: PanelHotCodeType, selectedName?: string) => {
        const isWebFuzzer = type === "fuzzer"
        const defaultTemplates = getDefaultTemplates(type)
        setTemplateListLoading(true)
        ipcRenderer
            .invoke("QueryHotPatchTemplateList", {Type: type})
            .then(async (res: QueryHotPatchTemplateListResponse) => {
                const nameArr = res.Name || []
                const newList: HotPatchTempItem[] = [...defaultTemplates]
                nameArr.forEach((name) => {
                    const index = newList.findIndex((item) => item.name === name)
                    if (index === -1) {
                        newList.push({
                            name,
                            temp: "",
                            isDefault: false
                        })
                    }
                })
                setTemplateList(newList)
                if (selectedName && newList.some((item) => item.name === selectedName)) {
                    syncSelectedTemplate(type, selectedName)
                } else if (panelType === type && activeType !== "global" && !selectedTemplate && newList.length > 0) {
                    onSelectTemplate(type, newList[0], "local")
                }
            })
            .catch((error) => {
                yakitFailed(error + "")
                setTemplateList(defaultTemplates)
                if (selectedName && defaultTemplates.some((item) => item.name === selectedName)) {
                    syncSelectedTemplate(type, selectedName)
                } else if (panelType === type && activeType !== "global" && !selectedTemplate && defaultTemplates.length > 0) {
                    onSelectTemplate(type, defaultTemplates[0], "local")
                }
            })
            .finally(() => setTemplateListLoading(false))

        if (isEnpriTrace() && isWebFuzzer) {
            NetWorkApi<GetOnlineHotPatchTemplateRequest, API.HotPatchTemplateResponse>({
                method: "get",
                url: "hot/patch/template",
                data: {
                    page: 1,
                    limit: 1000,
                    type
                }
            })
                .then((res) => {
                    const d = res.data || []
                    const list = d.map((item) => ({ name: item.name, temp: item.content, isDefault: false }))
                    setTemplateListOnline(list)
                })
                .catch((err) => {
                    yakitFailed(t("HotCodeTemplate.fetch_online_template_list_failed") + err)
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
        setDebugResult("")
        setEditorTab("source")
    })

    const onSelectTemplate = useMemoizedFn((type: HotCodeType, item: HotPatchTempItem, source: "local" | "online") => {
        setActiveType(type)
        setSelectedTemplate(item.name)
        setSelectedTemplateSource(source)
        resetDebug()

        if (source === "online" || item.isDefault) {
            setCode(item.temp)
            return
        }
        ipcRenderer
            .invoke("QueryHotPatchTemplate", {Type: type, Name: [item.name]})
            .then((res: QueryHotPatchTemplateResponse) => {
                setCode(res.Data[0]?.Content || "")
            })
            .catch((error) => {
                yakitFailed(error + "")
                setCode("")
            })
    })

    const onAddNewTemplate = useMemoizedFn((type: HotCodeType) => {
        setCreateTemplateType(type)
        setCreateModalValue("")
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
            .invoke("CreateHotPatchTemplate", {
                Type: createTemplateType,
                Content: defaultTemplateContent,
                Name: newName
            })
            .then(() => {
                yakitNotify("success", t("AddHotCodeTemplate.add_template_success"))
                setCreateModalVisible(false)
                if (createTemplateType === "global") {
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
                yakitFailed(error + "")
            })
    })

    const onConfirmRename = useMemoizedFn(async () => {
        const {type: currentEditingType, name: oldName} = parseTemplateKey(editingTemplateKey)
        const newName = editingValue.trim()

        setEditingTemplateKey("")
        setEditingValue("")

        if (!oldName || oldName === newName) return
        if (!validateTemplateName(newName, currentEditingType)) return

        try {
            await ipcRenderer.invoke("UpdateHotPatchTemplate", {
                Condition: {Type: currentEditingType, Name: [oldName]},
                Data: {Name: newName}
            })

            yakitNotify("success", t("YakitNotification.reName_success"))
            if (currentEditingType === "global") {
                loadGlobalTemplateList(newName)
            } else {
                loadTemplateList(currentEditingType, newName)
            }
            if (activeType === currentEditingType && selectedTemplate === oldName) {
                syncSelectedTemplate(currentEditingType, newName)
                resetDebug()
            }
            if (currentEditingType === "global" && globalEnabledTemplateName === oldName) {
                await useGlobalHotPatch.getState().enableGlobalHotPatch(newName)
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    const onDeleteTemplate = useMemoizedFn((item: HotPatchTempItem, source: "local" | "online", type: HotCodeType) => {
        const isCurrentSelected = activeType === type && selectedTemplate === item.name && selectedTemplateSource === source
        if (source === "local") {
            ipcRenderer
                .invoke("DeleteHotPatchTemplate", {
                    Condition: {Type: type, Name: [item.name]}
                })
                .then(async () => {
                    yakitNotify("success", t("YakitNotification.deleted"))
                    if (type === "global") {
                        loadGlobalTemplateList()
                    } else {
                        loadTemplateList(type)
                    }
                    if (isCurrentSelected) {
                        setSelectedTemplate("")
                        setSelectedTemplateSource("local")
                        setCode("")
                        resetDebug()
                    }
                    if (type === "global" && globalEnabledTemplateName === item.name) {
                        await useGlobalHotPatch.getState().disableGlobalHotPatch()
                    }
                })
                .catch((error) => {
                    yakitFailed(error + "")
                })
        } else {
            NetWorkApi<API.HotPatchTemplateRequest, API.ActionSucceeded>({
                method: "delete",
                url: "hot/patch/template",
                data: {
                    type,
                    name: item.name
                }
            })
                .then((res) => {
                    if (res.ok) {
                        yakitNotify("success", t("HotCodeTemplate.online_delete_success"))
                        if (type !== "global") {
                            loadTemplateList(type)
                        }
                        if (isCurrentSelected) {
                            setSelectedTemplate("")
                            setSelectedTemplateSource("local")
                            setCode("")
                            resetDebug()
                        }
                    }
                })
                .catch((err) => {
                    yakitFailed(t("HotCodeTemplate.online_delete_failed") + err)
                })
        }
    })

    const onSaveTemplate = useMemoizedFn(async () => {
        try {
            await ipcRenderer.invoke("UpdateHotPatchTemplate", {
                Condition: { Type: activeType, Name: [selectedTemplate] },
                Data: { Type: activeType, Content: getCode(), Name: selectedTemplate }
            })
            const isCurrentGlobalEnabled =
                activeType === "global" && globalHotPatchConfig?.Enabled && globalEnabledTemplateName === selectedTemplate

            if (isCurrentGlobalEnabled) {
                await withGlobalLoading(() => useGlobalHotPatch.getState().enableGlobalHotPatch(selectedTemplate))
            }

            yakitNotify("success", t("YakitNotification.saved"))
        }catch(error){
            yakitFailed(error + "")
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
        "saveHotPatch*hotPatchManagement",
        useMemoizedFn(() => {
            if (inViewport) {
                if(disableSaveTemplate) {
                    yakitFailed(t("HotCodeTemplate.save_disable_tip"))
                    return
                }
                onSaveTemplate()
            }
        })
    )

    const onSaveAsSuccess = useMemoizedFn((tempName?: string) => {
        if (!tempName) return
        if (activeType === "global") {
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
            ipcRenderer.invoke("cancel-StringFuzzer", tokenRef.current).catch(() => { })
            setLoading(false)
            tokenRef.current = ""
            yakitNotify("info", t("HTTPFuzzerHotPatch.debugCancelled"))
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
            Limit: DEBUG_LIMIT
        }

        try {
            const response: StringFuzzerResponse = await ipcRenderer.invoke("StringFuzzer", params, tokenRef.current)
            const data: string[] = (response.Results || []).map((buf) => Buffer.from(buf).toString("utf8"))
            const resultText = data.length > 0 ? data.join("\r\n") : ""
            setDebugResult(resultText)
            setEditorTab("result")
        } catch (err) {
            if (tokenRef.current) {
                yakitNotify("error", `${t("HTTPFuzzerHotPatch.debugFailed")}: ${err}`)
            }
        } finally {
            setTimeout(() => {
                setLoading(false)
                tokenRef.current = ""
            }, 300)
        }
    })

    // admin、审核员 支持（本地上传，线上删除）
    const hasPermissions = useMemo(
        () => ["admin", "auditor"].includes(userInfo.role || ""),
        [userInfo.role]
    )

    const hotCodeTypeOptions = useMemo(
        () => [
            {
                label: t("AddHotCodeTemplate.MITM_hot_template"),
                value: "mitm"
            },
            {
                label: t("AddHotCodeTemplate.WebFuzzer_hot_template"),
                value: "fuzzer"
            }
        ],
        [t]
    )

    const onChangePanelType = useMemoizedFn((type: PanelHotCodeType) => {
        setPanelType(type)
        if (activeType !== "global") {
            setActiveType(type)
            setSelectedTemplate("")
            setSelectedTemplateSource("local")
            setCode("")
            resetDebug()
        }
    })

    const renderTemplateItem = useMemoizedFn((type: HotCodeType, item: HotPatchTempItem, source: "local" | "online") => {
        const currentTemplateKey = getTemplateKey(type, item.name)
        return (
        <div
            key={`${type}-${source}-${item.name}`}
            className={classNames(styles["type-template-item"], {
                [styles["type-template-item-active"]]:
                    activeType === type && selectedTemplate === item.name && selectedTemplateSource === source
            })}
            onClick={() => {
                if (editingTemplateKey !== currentTemplateKey) {
                    onSelectTemplate(type, item, source)
                }
            }}
        >
            {editingTemplateKey === currentTemplateKey && source === "local" ? (
                <YakitInput
                    value={editingValue}
                    autoFocus
                    showCount
                    maxLength={INPUT_MAX_LENGTH}
                    size='small'
                    onPressEnter={onConfirmRename}
                    onBlur={onConfirmRename}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <>
                    <span className={styles["template-name"]} title={item.name}>
                        {item.name}
                    </span>
                    {type === "global" && globalEnabledTemplateName === item.name && (
                        <YakitTag className={styles["global-enabled-tag"]} color='info'>{t("GlobalHotPatch.enabled")}</YakitTag>
                    )}
                    {((!item.isDefault && source === "local") || (source === "online" && hasPermissions)) && (
                        <YakitPopover
                            overlayClassName={styles["template-popover"]}
                            content={
                                <>
                                    {type === "global" && (() => {
                                        const isThisItemEnabled = globalHotPatchConfig?.Enabled && globalEnabledTemplateName === item.name
                                        return (
                                            <div
                                                className={classNames(
                                                    styles["popover-menu-item"],
                                                    isThisItemEnabled ? styles["popover-menu-item-danger"] : styles["popover-menu-item-primary"]
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    isThisItemEnabled ? onDisableGlobalHotPatch() : onEnableSelectedAsGlobal(item.name)
                                                }}
                                            >
                                                {isThisItemEnabled ?
                                                    <SolidStopIcon className={styles["popover-menu-icon"]} /> :
                                                    <SolidPlayIcon className={styles["popover-menu-icon"]} />
                                                }
                                                <span>{isThisItemEnabled ? t("YakitButton.close") : t("YakitButton.enable")}</span>
                                            </div>
                                        )
                                    })()}
                                    {source === "local" && (
                                        <div
                                            className={styles["popover-menu-item"]}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onRenameTemplate(item, type)
                                            }}
                                        >
                                            <OutlinePencilaltIcon className={styles["popover-menu-icon"]} />
                                            <span>{t("YakitButton.rename")}</span>
                                        </div>
                                    )}
                                    <div
                                        className={classNames(
                                            styles["popover-menu-item"],
                                            styles["popover-menu-item-danger"]
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDeleteTemplate(item, source, type)
                                        }}
                                    >
                                        <OutlineTrashIcon className={styles["popover-menu-icon"]} />
                                        <span>{t("YakitButton.delete")}</span>
                                    </div>
                                </>
                            }
                        >
                            <SolidDotsverticalIcon
                                className={styles["template-more-icon"]}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </YakitPopover>
                    )}
                </>
            )}
        </div>
    )
    })

    const renderMenu = useMemoizedFn(() => {
        return (
            <div className={styles["type-panel"]}>
                <YakitResizeBox
                    isVer={true}
                    lineDirection='bottom'
                    firstRatio='38%'
                    firstMinSize='160px'
                    secondMinSize='220px'
                    firstNode={
                        <div className={styles["type-panel-section"]}>
                            <div className={styles["type-panel-header"]}>
                                <div>
                                    <span className={styles["template-title"]}>{t("GlobalHotPatch.Global_hot_template")}</span>
                                    <Tooltip title={t("GlobalHotPatch.Global_hot_template_tip")}>
                                        <OutlineInformationcircleIcon className={styles["info-icon"]} />
                                    </Tooltip>
                                </div>
                                <YakitButton
                                    size='small'
                                    type='outline1'
                                    icon={<OutlinePlusIcon />}
                                    onClick={() => onAddNewTemplate("global")}
                                />
                            </div>
                            <div className={styles["type-template"]}>
                                <YakitSpin spinning={globalTemplateListLoading}>
                                    <div className={styles["type-template-scroll"]}>
                                        <div className={styles["template-section"]}>
                                            {globalTemplateList.map((item) => renderTemplateItem("global", item, "local"))}
                                        </div>
                                    </div>
                                </YakitSpin>
                            </div>
                        </div>
                    }
                    secondNode={
                        <div className={styles["type-panel-section"]}>
                            <div className={styles["type-panel-header"]}>
                                <YakitRadioButtons
                                    value={panelType}
                                    onChange={(e) => onChangePanelType(e.target.value as PanelHotCodeType)}
                                    buttonStyle='solid'
                                    options={hotCodeTypeOptions}
                                />
                                <YakitButton
                                    size='small'
                                    type='outline1'
                                    icon={<OutlinePlusIcon />}
                                    onClick={() => onAddNewTemplate(panelType)}
                                />
                            </div>
                            <div className={styles["type-template"]}>
                                <YakitSpin spinning={templateListLoading}>
                                    <div className={styles["type-template-scroll"]}>
                                        <div className={styles["template-section"]}>
                                            {templateList.map((item) => renderTemplateItem(panelType, item, "local"))}
                                        </div>
                                        {isEnpriTrace() && panelType === "fuzzer" && (
                                            <>
                                                <div className={styles["template-divider"]} />
                                                <div className={styles["template-section"]}>
                                                    <div className={styles["template-section-title"]}>{t("HotCodeTemplate.online_template")}</div>
                                                    {templateListOnline.map((item) => renderTemplateItem(panelType, item, "online"))}
                                                </div>
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
        const list = activeType === "global"
            ? globalTemplateList
            : selectedTemplateSource === "local"
              ? templateList
              : templateListOnline
        return list.find((item) => item.name === selectedTemplate)
    }, [activeType, globalTemplateList, templateList, templateListOnline, selectedTemplate, selectedTemplateSource])

    const disableSaveTemplate = useMemo(
        () => !!(currentTemplate?.isDefault || selectedTemplateSource === "online"),
        [currentTemplate?.isDefault, selectedTemplateSource]
    )

    const hideTemplateContent = useMemo(()=> isGlobalType || activeType === 'mitm', [isGlobalType, activeType])

    return (
        <div className={styles["hot-patch-management"]} ref={selectRef}>
            {renderMenu()}
            <div className={styles["editor-panel"]}>
                <div className={styles["editor-title"]}>{selectedTemplate}</div>
                <div className={styles["editor-header"]}>
                    <div>
                    {!hideTemplateContent && (
                        <YakitRadioButtons
                            value={editorTab}
                            onChange={(e) => {
                                setEditorTab(e.target.value)
                            }}
                            buttonStyle='solid'
                            options={[
                                {
                                    value: "source",
                                    label: t("HTTPFuzzerHotPatch.source")
                                },
                                {
                                    value: "result",
                                    label: t("HTTPFuzzerHotPatch.executionResult")
                                }
                            ]}
                        />
                    )}
                    </div>
                    <div className={styles["editor-header-right"]}>
                        {hideTemplateContent && (
                        <Tooltip placement='bottom' title={t("HTTPFuzzerHotPatch.engineConsole")}>
                            <YakitButton
                                type='text'
                                onClick={openConsoleNewWindow}
                                icon={<OutlineTerminalIcon />}
                            />
                        </Tooltip>
                        )}
                        {/* 产品要求暂时去掉 */}
                        {/* <YakitButton type='primary' loading={loading} onClick={onDebugExecution}>
                            {t("YakitButton.debugExecution")}
                        </YakitButton> */}
                        {loading && (
                            <YakitButton danger onClick={onCancelDebug}>
                                {t("YakitButton.cancel")}
                            </YakitButton>
                        )}
                        {isGlobalType && (() => {
                            const isCurrentEnabled = globalHotPatchConfig?.Enabled && globalEnabledTemplateName === selectedTemplate
                            return (
                                <YakitButton
                                    type="primary"
                                    danger={isCurrentEnabled}
                                    loading={globalConfigLoading}
                                    onClick={() => isCurrentEnabled ? onDisableGlobalHotPatch() : onEnableSelectedAsGlobal()}
                                    icon={isCurrentEnabled ? <SolidStopIcon /> : <SolidPlayIcon />}
                                >
                                    {isCurrentEnabled ? t("YakitButton.close") : t("YakitButton.enable")}
                                </YakitButton>
                            )
                        })()}
                        <YakitButton type='outline1' onClick={() => setAddHotCodeTemplateVisible(true)} disabled={selectedTemplateSource === "online"}>
                            {t("YakitButton.save_as")}
                        </YakitButton>
                        <YakitButton type='primary' onClick={onSaveTemplate} disabled={disableSaveTemplate}>
                            {t("YakitButton.save")}
                        </YakitButton>
                    </div>
                </div>
                <YakitResizeBox
                    isVer={false}
                    lineDirection='left'
                    firstNode={
                        <div className={styles["editor-left"]}>
                            {editorTab === "source" ? (
                                <YakitEditor type='yak' value={code} setValue={(newCode) => setCode(newCode)} />
                            ) : (
                                <YakitEditor type='plaintext' value={debugResult} readOnly={true} />
                            )}
                        </div>
                    }
                    firstRatio={hideTemplateContent ? "100%": "70%"}
                    firstMinSize='400px'
                    secondRatio='30%'
                    secondMinSize='280px'
                    secondNodeStyle={hideTemplateContent ? { display: 'none'}: {}}
                    secondNode={
                        <div className={styles["template-content-panel"]}>
                            <div className={styles["template-content-header"]}>
                                <span className={styles["template-content-title"]}>
                                    {t("HTTPFuzzerHotPatch.templateContent")}
                                </span>
                                <div className={styles["template-content-actions"]}>
                                    <Tooltip placement='bottom' title={t("HTTPFuzzerHotPatch.engineConsole")}>
                                        <YakitButton
                                            type='text'
                                            onClick={openConsoleNewWindow}
                                            icon={<OutlineTerminalIcon />}
                                        />
                                    </Tooltip>
                                    <YakitButton type='primary' loading={loading} onClick={onDebugExecution}>
                                        {t("YakitButton.debugExecution")}
                                    </YakitButton>
                                    {loading && (
                                        <YakitButton danger onClick={onCancelDebug}>
                                            {t("YakitButton.cancel")}
                                        </YakitButton>
                                    )}
                                </div>
                            </div>
                            <div className={styles["template-content-body"]}>
                                <YakitEditor
                                    type='http'
                                    value={templateContent}
                                    setValue={(v) => setTemplateContent(v)}
                                />
                            </div>
                        </div>
                    }
                />
            </div>

            <YakitModal
                visible={createModalVisible}
                title={t("AddHotCodeTemplate.add_template")}
                onCancel={() => setCreateModalVisible(false)}
                onOk={onConfirmCreate}
                okText={t("YakitButton.save")}
                cancelText={t("YakitButton.cancel")}
            >
                <YakitInput
                    placeholder={t("AddHotCodeTemplate.enter_hot_reload_template_name")}
                    value={createModalValue}
                    onChange={(e) => setCreateModalValue(e.target.value)}
                    maxLength={INPUT_MAX_LENGTH}
                />
            </YakitModal>

            <AddHotCodeTemplate
                type={activeType}
                title={t("YakitButton.save_as")}
                hotPatchTempLocal={templateList}
                hotPatchCode={code}
                visible={addHotCodeTemplateVisible}
                onSetAddHotCodeTemplateVisible={setAddHotCodeTemplateVisible}
                onSaveHotCodeOk={onSaveAsSuccess}
            />
        </div>
    )
}
