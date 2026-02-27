import React, { memo, useEffect, useMemo, useRef, useState } from "react"
import { useMemoizedFn, useGetState, useInViewport } from "ahooks"
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton"
import { YakitInput } from "@/components/yakitUI/YakitInput/YakitInput"
import { YakitEditor } from "@/components/yakitUI/YakitEditor/YakitEditor"
import { YakitModal } from "@/components/yakitUI/YakitModal/YakitModal"
import { yakitFailed, yakitNotify } from "@/utils/notification"
import { HotPatchTempItem, AddHotCodeTemplate } from "@/pages/fuzzer/HTTPFuzzerHotPatch"
import { HotPatchTempDefault } from "@/defaultConstants/HTTPFuzzerPage"
import { MITMHotPatchTempDefault } from "@/defaultConstants/mitm"
import { cloneDeep } from "lodash"
import {
    OutlinePlusIcon,
    OutlineTrashIcon,
    OutlinePencilaltIcon,
    OutlineTerminalIcon,
} from "@/assets/icon/outline"
import { openConsoleNewWindow } from "@/utils/openWebsite"
import { Tooltip } from "antd"
import classNames from "classnames"
import { YakitSideTab } from "@/components/yakitSideTab/YakitSideTab"
import { YakitTabsProps } from "@/components/yakitSideTab/YakitSideTabType"
import { NewPayload } from "@/pages/payloadManager/newPayload"
import ProxyRulesConfig from "@/components/configNetwork/ProxyRulesConfig"
import { useI18nNamespaces } from "@/i18n/useI18nNamespaces"
import { configManagementTabType, useConfigManagementTab, useStore } from "@/store"
import { YakitRoute } from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"
import { YakitPopover } from "@/components/yakitUI/YakitPopover/YakitPopover"
import { YakitResizeBox } from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import { YakitRadioButtons } from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import { isEnpriTrace } from "@/utils/envfile"
import { NetWorkApi } from "@/services/fetch"
import { API } from "@/services/swagger/resposeType"
import styles from "./ConfigManagement.module.scss"
import { SolidDotsverticalIcon } from "@/assets/icon/solid"

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

interface QueryHotPatchTemplateListResponse {
    Name: string[]
    Total: number
}

interface QueryHotPatchTemplateResponse {
    Data: { Name: string; Content: string; Type: string }[]
}

interface GlobalHotPatchTemplateRef {
    Name: string
    Type: string
    Enabled: boolean
}

interface GlobalHotPatchConfig {
    Enabled: boolean
    Version: string
    Items: GlobalHotPatchTemplateRef[]
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
    const [activeType, setActiveType] = useState<HotCodeType>("mitm")
    const [templateList, setTemplateList] = useState<HotPatchTempItem[]>([])
    const [templateListOnline, setTemplateListOnline] = useState<HotPatchTempItem[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState("")
    const [selectedTemplateSource, setSelectedTemplateSource] = useState<"local" | "online">("local")
    const [code, setCode, getCode] = useGetState("")
    const [templateContent, setTemplateContent, getTemplateContent] = useGetState(DEFAULT_TEMPLATE_CONTENT)
    const [globalHotPatchConfig, setGlobalHotPatchConfig] = useState<GlobalHotPatchConfig>({
        Enabled: false,
        Version: "0",
        Items: []
    })
    const [globalConfigLoading, setGlobalConfigLoading] = useState(false)
    const [createModalVisible, setCreateModalVisible] = useState(false)
    const [createModalValue, setCreateModalValue] = useState("")
    const [editingTemplate, setEditingTemplate] = useState("")
    const [editingValue, setEditingValue] = useState("")
    const [addHotCodeTemplateVisible, setAddHotCodeTemplateVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [editorTab, setEditorTab] = useState<"source" | "result">("source")
    const [debugResult, setDebugResult] = useState("")
    const tokenRef = useRef("")
    const userInfo = useStore((s) => s.userInfo)
    const selectRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(selectRef)

    const { t, i18n } = useI18nNamespaces(["yakitUi", "yakitRoute", "layout", "webFuzzer"])

    const globalEnabledTemplateName = useMemo(() => {
        if (!globalHotPatchConfig?.Enabled) return ""
        return globalHotPatchConfig?.Items?.[0]?.Name || ""
    }, [globalHotPatchConfig])

    // 验证模板名称
    const validateTemplateName = useMemoizedFn((name: string) => {
        const trimmedName = name.trim()
        if (!trimmedName) {
            yakitNotify("warning", t("AddHotCodeTemplate.template_empty_message"))
            return false
        }
        if (templateList.find((item) => item.name === trimmedName)) {
            yakitNotify("warning", t("AddHotCodeTemplate.template_repeat_message"))
            return false
        }
        return true
    })

    const loadGlobalHotPatchConfig = useMemoizedFn(() => {
        setGlobalConfigLoading(true)
        ipcRenderer
            .invoke("GetGlobalHotPatchConfig", {})
            .then((res: GlobalHotPatchConfig) => {
                setGlobalHotPatchConfig(res)
            })
            .catch((error) => {
                yakitFailed(error + "")
            })
            .finally(() => {
                setGlobalConfigLoading(false)
            })
    })

    const onEnableSelectedAsGlobal = useMemoizedFn(async () => {
        if (activeType !== "global") return
        if (!selectedTemplate) {
            yakitNotify("warning", t("GlobalHotPatch.select_template_first"))
            return
        }

        const expectedVersion = globalHotPatchConfig?.Version || "0"

        setGlobalConfigLoading(true)
        try {
            const res: GlobalHotPatchConfig = await ipcRenderer.invoke("SetGlobalHotPatchConfig", {
                Config: {
                    Enabled: true,
                    Version: expectedVersion,
                    Items: [
                        {
                            Name: selectedTemplate,
                            Type: "global",
                            Enabled: true
                        }
                    ]
                },
                ExpectedVersion: expectedVersion
            })
            setGlobalHotPatchConfig(res)
            yakitNotify("success", t("GlobalHotPatch.enable_success"))
        } catch (error) {
            yakitFailed(error + "")
            loadGlobalHotPatchConfig()
        } finally {
            setGlobalConfigLoading(false)
        }
    })

    const onDisableGlobalHotPatch = useMemoizedFn(async () => {
        if (activeType !== "global") return

        setGlobalConfigLoading(true)
        try {
            const res: GlobalHotPatchConfig = await ipcRenderer.invoke("ResetGlobalHotPatchConfig", {})
            setGlobalHotPatchConfig(res)
            yakitNotify("success", t("GlobalHotPatch.disable_success"))
        } catch (error) {
            yakitFailed(error + "")
        } finally {
            setGlobalConfigLoading(false)
        }
    })

    const loadTemplateList = useMemoizedFn((autoSelectFirst = false) => {
        const isWebFuzzer = activeType === "fuzzer"
        const isMITM = activeType === "mitm"
        const defaultTemplates = cloneDeep(isWebFuzzer ? HotPatchTempDefault : isMITM ? MITMHotPatchTempDefault : [])
        // 加载本地模板
        ipcRenderer
            .invoke("QueryHotPatchTemplateList", { Type: activeType })
            .then((res: QueryHotPatchTemplateListResponse) => {
                const nameArr = res.Name || []
                const newList = [...defaultTemplates]
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
                // 自动选中第一个模板
                if (autoSelectFirst && newList.length > 0) {
                    onSelectTemplate(newList[0], "local")
                }
            })
            .catch((error) => {
                yakitFailed(error + "")
                setTemplateList(defaultTemplates)
                if (autoSelectFirst && defaultTemplates.length > 0) {
                    onSelectTemplate(defaultTemplates[0], "local")
                }
            })

        // 加载线上模板（仅企业版）
        if (isEnpriTrace() && isWebFuzzer) {
            NetWorkApi<GetOnlineHotPatchTemplateRequest, API.HotPatchTemplateResponse>({
                method: "get",
                url: "hot/patch/template",
                data: {
                    page: 1,
                    limit: 1000,
                    type: activeType
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
        }
    })

    useEffect(() => {
        if(!inViewport) return
        loadTemplateList(true)
        if (activeType === "global") {
            loadGlobalHotPatchConfig()
        }
    }, [activeType, inViewport])

    const resetDebug = useMemoizedFn(() => {
        setDebugResult("")
        setEditorTab("source")
    })

    const onSelectTemplate = useMemoizedFn((item: HotPatchTempItem, source: "local" | "online") => {
        setSelectedTemplate(item.name)
        setSelectedTemplateSource(source)
        resetDebug()
        
        if (source === "online" || item.isDefault) {
            setCode(item.temp)
            return
        }
        
        ipcRenderer
            .invoke("QueryHotPatchTemplate", { Type: activeType, Name: [item.name] })
            .then((res: QueryHotPatchTemplateResponse) => {
                setCode(res.Data[0]?.Content || "")
            })
            .catch((error) => {
                yakitFailed(error + "")
                setCode("")
            })
    })

    const onAddNewTemplate = useMemoizedFn(() => {
        setCreateModalValue("")
        setCreateModalVisible(true)
    })

    const onRenameTemplate = useMemoizedFn((item: HotPatchTempItem) => {
        setEditingTemplate(item.name)
        setEditingValue(item.name)
    })

    const onConfirmCreate = useMemoizedFn(() => {
        const newName = createModalValue.trim()
        if (!validateTemplateName(newName)) return

        ipcRenderer
            .invoke("CreateHotPatchTemplate", {
                Type: activeType,
                Content: "",
                Name: newName
            })
            .then(() => {
                yakitNotify("success", t("AddHotCodeTemplate.add_template_success"))
                setCreateModalVisible(false)
                loadTemplateList()
                setSelectedTemplate(newName)
                resetDebug()
                setCode("")
            })
            .catch((error) => {
                yakitFailed(error + "")
            })
    })

    const onConfirmRename = useMemoizedFn(async () => {
        const oldName = editingTemplate
        const newName = editingValue.trim()

        setEditingTemplate("")
        setEditingValue("")

        if (oldName === newName) return
        if (!validateTemplateName(newName)) return

        try {
            await ipcRenderer.invoke("UpdateHotPatchTemplate", {
                Condition: { Type: activeType, Name: [oldName] },
                Data: { Name: newName }
            })

            yakitNotify("success", t("YakitNotification.reName_success"))
            loadTemplateList()
            if (selectedTemplate === oldName) {
                setSelectedTemplate(newName)
                resetDebug()
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    const onDeleteTemplate = useMemoizedFn((item: HotPatchTempItem, source: "local" | "online") => {
        if (source === "local") {
            ipcRenderer
                .invoke("DeleteHotPatchTemplate", {
                    Condition: { Type: activeType, Name: [item.name] }
                })
                .then(() => {
                    yakitNotify("success", t("YakitNotification.deleted"))
                    loadTemplateList(selectedTemplate === item.name)
                })
                .catch((error) => {
                    yakitFailed(error + "")
                })
        } else {
            NetWorkApi<API.HotPatchTemplateRequest, API.ActionSucceeded>({
                method: "delete",
                url: "hot/patch/template",
                data: {
                    type: activeType,
                    name: item.name
                }
            })
                .then((res) => {
                    if (res.ok) {
                        yakitNotify("success", t("HotCodeTemplate.online_delete_success"))
                        loadTemplateList(selectedTemplate === item.name)
                    }
                })
                .catch((err) => {
                    yakitFailed(t("HotCodeTemplate.online_delete_failed") + err)
                })
        }
    })

    const onSaveTemplate = useMemoizedFn(() => {
        ipcRenderer
            .invoke("UpdateHotPatchTemplate", {
                Condition: { Type: activeType, Name: [selectedTemplate] },
                Data: { Type: activeType, Content: getCode(), Name: selectedTemplate }
            })
            .then(() => {
                yakitNotify("success", t("YakitNotification.saved"))
            })
            .catch((error) => {
                yakitFailed(error + "")
            })
    })

    const onSaveAsSuccess = useMemoizedFn((tempName?: string) => {
        if (!tempName) return
        loadTemplateList()
        setSelectedTemplate(tempName)
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
            },
            {
                label: t("AddHotCodeTemplate.Global_hot_template"),
                value: "global"
            }
        ],
        [i18n.language]
    )

    const renderTemplateItem = useMemoizedFn((item: HotPatchTempItem, source: "local" | "online") => {
        return (
        <div
            key={`${source}-${item.name}`}
            className={classNames(styles["type-template-item"], {
                [styles["type-template-item-active"]]: selectedTemplate === item.name && selectedTemplateSource === source
            })}
            onClick={() => {
                if (editingTemplate !== item.name) {
                    onSelectTemplate(item, source)
                }
            }}
        >
            {editingTemplate === item.name && source === "local" ? (
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
                    <div className={styles["template-name-wrapper"]}>
                        <span className={styles["template-name"]} title={item.name}>
                            {item.name}
                        </span>
                        {activeType === "global" && globalEnabledTemplateName === item.name && (
                            <span className={styles["global-enabled-tag"]}>{t("GlobalHotPatch.enabled_tag")}</span>
                        )}
                    </div>
                    {((!item.isDefault && source === "local") || (source === "online" && hasPermissions)) && (
                        <YakitPopover
                            overlayClassName={styles["template-popover"]}
                            placement='bottomRight'
                            content={
                                <>
                                    {source === "local" && (
                                        <div
                                            className={styles["popover-menu-item"]}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onRenameTemplate(item)
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
                                            onDeleteTemplate(item, source)
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
                <div className={styles["type-panel-header"]}>
                    <YakitRadioButtons
                        value={activeType}
                        onChange={(e) => setActiveType(e.target.value)}
                        buttonStyle='solid'
                        options={hotCodeTypeOptions}
                    />
                    <YakitButton size='small' type='outline1' icon={<OutlinePlusIcon />} onClick={onAddNewTemplate} />
                </div>
                <div className={styles["type-template"]}>
                    <div className={styles["template-section"]}>
                        {templateList.map((item) => renderTemplateItem(item, "local"))}
                    </div>
                    {isEnpriTrace() && activeType === "fuzzer" && (
                        <>
                            <div className={styles["template-divider"]} />
                            <div className={styles["template-section"]}>
                                <div className={styles["template-section-title"]}>{t("HotCodeTemplate.online_template")}</div>
                                {templateListOnline.map((item) => renderTemplateItem(item, "online"))}
                            </div>
                        </>
                    )}
                </div> 
            </div>
        )
    })


    const currentTemplate = useMemo(() => {
        const list = selectedTemplateSource === "local" ? templateList : templateListOnline
        return list.find((item) => item.name === selectedTemplate)
    }, [templateList, templateListOnline, selectedTemplate, selectedTemplateSource])

    return (
	        <div className={styles["hot-patch-management"]} ref={selectRef}>
	            {renderMenu()}
	            <div className={styles["editor-panel"]}>
	                <div className={styles["editor-title"]}>
	                    {selectedTemplate}
	                    {activeType === "global" &&
	                        globalHotPatchConfig.Enabled &&
	                        globalEnabledTemplateName === selectedTemplate && (
	                            <span className={styles["global-enabled-tag-title"]}>
	                                {t("GlobalHotPatch.enabled_tag")}
	                            </span>
	                        )}
	                </div>
	                {activeType === "global" && (
	                    <div className={styles["global-status-bar"]}>
	                        <div className={styles["global-status-left"]}>
	                            <span className={styles["global-status-label"]}>{t("GlobalHotPatch.status")}：</span>
	                            <span className={styles["global-status-value"]}>
	                                {globalHotPatchConfig.Enabled
	                                    ? t("GlobalHotPatch.enabled")
	                                    : t("GlobalHotPatch.disabled")}
	                            </span>
	                            {globalHotPatchConfig.Enabled && globalEnabledTemplateName && (
	                                <span className={styles["global-status-current"]}>
	                                    {t("GlobalHotPatch.current")}：{globalEnabledTemplateName}
	                                </span>
	                            )}
	                        </div>
	                        <div className={styles["global-status-actions"]}>
	                            <YakitButton
	                                type='outline1'
	                                size='small'
	                                loading={globalConfigLoading}
	                                onClick={loadGlobalHotPatchConfig}
	                            >
	                                {t("GlobalHotPatch.refresh")}
	                            </YakitButton>
	                            <YakitButton
	                                type='primary'
	                                size='small'
	                                loading={globalConfigLoading}
	                                disabled={
	                                    !selectedTemplate ||
	                                    selectedTemplateSource === "online" ||
	                                    (globalHotPatchConfig.Enabled && globalEnabledTemplateName === selectedTemplate)
	                                }
	                                onClick={onEnableSelectedAsGlobal}
	                            >
	                                {t("GlobalHotPatch.enable_selected")}
	                            </YakitButton>
	                            <YakitButton
	                                danger
	                                size='small'
	                                loading={globalConfigLoading}
	                                disabled={!globalHotPatchConfig.Enabled}
	                                onClick={onDisableGlobalHotPatch}
	                            >
	                                {t("GlobalHotPatch.disable")}
	                            </YakitButton>
	                        </div>
	                    </div>
	                )}
	                <div className={styles["editor-header"]}>
	                    <div>
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
                    </div>
                    <div className={styles["editor-header-right"]}>
                        <YakitButton type='outline1' onClick={() => setAddHotCodeTemplateVisible(true)} disabled={selectedTemplateSource === "online"}>
                            {t("YakitButton.save_as")}
                        </YakitButton>
                        <YakitButton type='primary' onClick={onSaveTemplate} disabled={currentTemplate?.isDefault || selectedTemplateSource === "online"}>
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
                    firstRatio='70%'
                    firstMinSize='400px'
                    secondRatio='30%'
                    secondMinSize='280px'
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
