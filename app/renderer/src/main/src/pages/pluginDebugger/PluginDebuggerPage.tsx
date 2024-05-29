import React, {useEffect, useState, useRef} from "react"
import {Divider, Space} from "antd"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import classNames from "classnames"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {AutoCard} from "@/components/AutoCard"
import {OutlineEyeIcon, OutlinePuzzleIcon, OutlineSparklesIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {debugYakitModal, showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {YakitRoute} from "@/enums/yakitRoute"
import {PluginDebuggerExec} from "@/pages/pluginDebugger/PluginDebuggerExec"
import {MITMPluginTemplate, NucleiPluginTemplate, PortScanPluginTemplate} from "@/pages/pluginDebugger/defaultData"
import {getDefaultHTTPRequestBuilderParams, HTTPRequestBuilder} from "@/pages/httpRequestBuilder/HTTPRequestBuilder"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {SmokingEvaluateResponse} from "@/pages/pluginDebugger/SmokingEvaluate"
import {DataCompareModal} from "../compare/DataCompare"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {SolidCogIcon, SolidPlayIcon, SolidStopIcon, SolidStoreIcon} from "@/assets/icon/solid"
import {
    PluginGroup,
    PluginSearch,
    TagsAndGroupRender,
    YakFilterRemoteObj,
    YakitGetOnlinePlugin
} from "../mitm/MITMServerHijacking/MITMPluginLocalList"
import {YakModuleList} from "../yakitStore/YakitStorePage"
import {PluginLocalInfoIcon} from "../customizeMenu/CustomizeMenu"
import {CloudDownloadIcon, ImportIcon} from "@/assets/newIcon"
import {queryYakScriptList} from "../yakitStore/network"
import {ImportLocalPlugin} from "../mitm/MITMPage"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import imageLoadErrorDefault from "@/assets/imageLoadErrorDefault.png"
import styles from "./PluginDebuggerPage.module.scss"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {PluginTestErrorIcon} from "../plugins/icon"
import { apiQueryYakScript } from "../plugins/utils"

export interface PluginDebuggerPageProp {
    // 是否生成yaml模板
    generateYamlTemplate: boolean
    // yaml模板内容
    YamlContent: string
    /**插件名称 */
    scriptName: string
}

const {ipcRenderer} = window.require("electron")

const pluginTypeData = [
    {text: "端口扫描", value: "port-scan", tagVal: "PORT-SCAN", tagColor: "success"},
    {text: "MITM", value: "mitm", tagVal: "MITM", tagColor: "blue"},
    {text: "Yaml-PoC", value: "nuclei", tagVal: "Nuclei-Yaml", tagColor: "purple"}
]

export type PluginTypes = "port-scan" | "mitm" | "nuclei"

export const PluginDebuggerPage: React.FC<PluginDebuggerPageProp> = ({
    generateYamlTemplate,
    YamlContent,
    scriptName
}) => {
    const [pluginType, setPluginType] = useState<PluginTypes>(generateYamlTemplate ? "nuclei" : "port-scan")
    const [builder, setBuilder] = useState<HTTPRequestBuilderParams>(getDefaultHTTPRequestBuilderParams())
    const [pluginExecuting, setPluginExecuting] = useState<boolean>(false)
    const [showPluginExec, setShowPluginExec] = useState<boolean>(false)
    const [code, setCode] = useState<string>(PortScanPluginTemplate)
    const [originCode, setOriginCode] = useState<string>("")
    const [currentPluginName, setCurrentPluginName] = useState<string>("")
    const [tabActiveKey, setTabActiveKey] = useState<string>("code")
    const [operator, setOperator] = useState<{start: () => any; cancel: () => any}>()
    const [refreshEditor, setRefreshEditor] = useState<number>(Math.random())

    useEffect(() => {
        if (!operator) {
            return
        }
        operator.start()
    }, [operator])

    // 查看请求
    const handleViewRequest = useMemoizedFn(async () => {
        try {
            const res = await ipcRenderer.invoke("HTTPRequestBuilder", {...builder, Input: undefined})
            debugYakitModal(res)
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    // 执行 & 停止
    const handleExecOrStopOperation = () => {
        if (!pluginExecuting) {
            setTabActiveKey("execResult")
            if (!showPluginExec) {
                setShowPluginExec(true)
            } else {
                setShowPluginExec(false)
                yakitNotify("info", "正在启动调试任务")
                setTimeout(() => {
                    setShowPluginExec(true)
                }, 300)
            }
        } else {
            if (operator?.cancel) {
                operator.cancel()
            }
        }
    }

    const setDefultTemplate = (v?: PluginTypes) => {
        switch (v || pluginType) {
            case "mitm":
                setCode(MITMPluginTemplate)
                break
            case "nuclei":
                setCode(NucleiPluginTemplate)
                break
            case "port-scan":
                setCode(PortScanPluginTemplate)
                break
        }
    }

    const handleChangePluginType = useMemoizedFn((v: PluginTypes) => {
        if (!!code) {
            const m = showYakitModal({
                title: "切换类型将导致当前代码丢失",
                onOk: () => {
                    setPluginType(v)
                    setRefreshEditor(Math.random())
                    setDefultTemplate(v)
                    setTabActiveKey("code")
                    m.destroy()
                },
                content: <div style={{margin: 24}}>确认插件类型切换？</div>,
                onCancel: () => {}
            })
        } else {
            setDefultTemplate()
        }
    })

    useEffect(() => {
        if (generateYamlTemplate) {
            setCode(YamlContent || NucleiPluginTemplate)
            setRefreshEditor(Math.random())
        }
    }, [generateYamlTemplate])

    return (
        <div className={styles.pluginDebuggerPage}>
            <YakitResizeBox
                isVer={false}
                firstMinSize={325}
                firstRatio={"325px"}
                secondMinSize={700}
                lineDirection='left'
                firstNodeStyle={{padding: 0}}
                firstNode={
                    <AutoCard
                        title='配置调试请求'
                        size='small'
                        bordered={false}
                        headStyle={{
                            backgroundColor: "#F8F8F8",
                            padding: "0 12px",
                            color: "#31343f",
                            fontSize: 12,
                            fontWeight: "bold",
                            lineHeight: 3,
                            flexShrink: 0
                        }}
                        bodyStyle={{
                            backgroundColor: "#F8F8F8",
                            padding: "8px 12px 0",
                            borderTop: "1px solid #EAECF3",
                            overflow: "auto"
                        }}
                        extra={
                            <div className={styles.configTitleExtraBtns}>
                                <YakitButton type='text' onClick={handleViewRequest}>
                                    查看请求
                                    <OutlineEyeIcon />
                                </YakitButton>
                                <Divider type='vertical' style={{marginLeft: 0}} />
                                <YakitButton
                                    icon={!pluginExecuting ? <SolidPlayIcon /> : <SolidStopIcon />}
                                    colors={!pluginExecuting ? "primary" : "danger"}
                                    onClick={handleExecOrStopOperation}
                                    disabled={
                                        builder.IsRawHTTPRequest
                                            ? !Uint8ArrayToString(builder.RawHTTPRequest)
                                            : !builder.Input
                                    }
                                >
                                    {!pluginExecuting ? "执行" : "停止执行"}
                                </YakitButton>
                            </div>
                        }
                    >
                        <HTTPRequestBuilder pluginType={pluginType} value={builder} setValue={setBuilder} />
                    </AutoCard>
                }
                secondNode={
                    <div style={{height: "100%", padding: 12, paddingLeft: 4}}>
                        <SecondNodeHeader
                            generateYamlTemplate={generateYamlTemplate}
                            tabActiveKey={tabActiveKey}
                            setTabActiveKey={setTabActiveKey}
                            currentPluginName={currentPluginName}
                            setCurrentPluginName={setCurrentPluginName}
                            pluginType={pluginType}
                            setPluginType={setPluginType}
                            code={code}
                            originCode={originCode}
                            setCode={setCode}
                            setOriginCode={setOriginCode}
                            setRefreshEditor={setRefreshEditor}
                            handleChangePluginType={handleChangePluginType}
                            scriptName={scriptName}
                        ></SecondNodeHeader>
                        <div style={{height: "calc(100% - 34px)"}}>
                            <div style={{display: tabActiveKey === "code" ? "block" : "none", height: "100%"}}>
                                <NewHTTPPacketEditor
                                    key={refreshEditor}
                                    language={pluginType}
                                    noHeader={true}
                                    originValue={StringToUint8Array(code)}
                                    onChange={(val) => setCode(Uint8ArrayToString(val))}
                                />
                            </div>
                            <div style={{display: tabActiveKey === "execResult" ? "block" : "none", height: "100%"}}>
                                {showPluginExec ? (
                                    <PluginDebuggerExec
                                        pluginType={pluginType}
                                        pluginName={currentPluginName}
                                        builder={builder}
                                        code={code}
                                        targets={builder.Input || ""}
                                        onOperator={(obj) => {
                                            yakitNotify("info", "初始化插件调试成功")
                                            setOperator(obj)
                                        }}
                                        onExecuting={(result) => {
                                            setPluginExecuting(result)
                                        }}
                                    />
                                ) : (
                                    <div className={styles.emptyPosition}>
                                        <YakitEmpty description={"点击【执行插件】以开始"} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                }
            />
        </div>
    )
}

interface SecondNodeHeaderProps {
    generateYamlTemplate: boolean
    tabActiveKey: string
    setTabActiveKey: (i: string) => void
    currentPluginName: string
    setCurrentPluginName: (i: string) => void
    pluginType: PluginTypes
    setPluginType: (i: PluginTypes) => void
    code: string
    setCode: (i: string) => void
    setRefreshEditor: (i: number) => void
    originCode: string
    setOriginCode: (i: string) => void
    handleChangePluginType: (v: PluginTypes) => void
    /**插件名称 */
    scriptName: string
}

const SecondNodeHeader: React.FC<SecondNodeHeaderProps> = React.memo(
    ({
        pluginType,
        tabActiveKey,
        setTabActiveKey,
        currentPluginName,
        generateYamlTemplate,
        setPluginType,
        code,
        setCode,
        setCurrentPluginName,
        setRefreshEditor,
        originCode,
        setOriginCode,
        handleChangePluginType,
        scriptName
    }) => {
        const [script, setScript] = useState<YakScript>()
        const [pluginBaseInspectVisible, setPluginBaseInspectVisible] = useState<boolean>(false)
        const [dropdownData, setDropdownData] = useState<{key: string; label: string}[]>([
            {key: "loadLocalPlugin", label: "加载本地插件"}
        ])
        useEffect(() => {
            if (!scriptName) return
            ipcRenderer
                .invoke("GetYakScriptByName", {Name: scriptName})
                .then((i: YakScript) => {
                    setScript(i)
                    setPluginType(i.Type as any)
                    setCode(i.Content)
                    setOriginCode(i.Content)
                    setCurrentPluginName(i.ScriptName)
                    setRefreshEditor(Math.random())
                    setTabActiveKey("code")
                })
                .catch((err) => {
                    yakitNotify("error", "获取本地插件数据失败:" + err)
                })
        }, [scriptName])
        useEffect(() => {
            if (!currentPluginName && !generateYamlTemplate) {
                setDropdownData([
                    {key: "port-scan", label: "端口扫描"},
                    {key: "mitm", label: "MITM"},
                    {key: "nuclei", label: "Yaml-PoC"},
                    {key: "loadLocalPlugin", label: "加载本地插件"}
                ])
            }
        }, [currentPluginName, generateYamlTemplate])

        const handleSetIconClick = useMemoizedFn((key) => {
            switch (key) {
                case "port-scan":
                case "mitm":
                case "nuclei":
                    handleChangePluginType(key)
                    setCurrentPluginName("")
                    break
                case "loadLocalPlugin":
                    handleSelectDebugPlugin()
                    break
                default:
                    break
            }
        })

        // 本地插件选中
        const onLocalPluginItemClick = (i: YakScript, m: {destroy: () => void}) => {
            switch (i.Type) {
                case "mitm":
                case "nuclei":
                // @ts-ignore
                case "port-scan":
                    const m1 = showYakitModal({
                        title: "切换本地插件将导致当前代码丢失",
                        onOk: () => {
                            setPluginType(i.Type as any)
                            setCode(i.Content)
                            setOriginCode(i.Content)
                            setCurrentPluginName(i.ScriptName)
                            setRefreshEditor(Math.random())
                            setScript(i)
                            setTabActiveKey("code")
                            m.destroy()
                            m1.destroy()
                        },
                        content: <div style={{margin: 24}}>确认本地插件切换？</div>,
                        onCancel: () => {}
                    })
                    return
                default:
                    yakitFailed("暂不支持的插件类型")
            }
        }

        // 选择要调试的插件
        const handleSelectDebugPlugin = useMemoizedFn(() => {
            const m = showYakitDrawer({
                title: <div className={styles["debug-plugin-drawer-title"]}>选择要调试的插件</div>,
                width: "30%",
                placement: "left",
                content: (
                    <div style={{height: "100%"}}>
                        <PluginContList
                            queryPluginType={["port-scan", "mitm", "nuclei"]}
                            singleChoice={true}
                            isShowDelIcon={false}
                            isShowGroupMagBtn={false}
                            renderPluginItem={(i, itemClickFun) => {
                                return (
                                    <div className={styles["plugin-local-info"]} style={{paddingLeft: 6}}>
                                        <div
                                            className={styles["plugin-local-info-left"]}
                                            onClick={() => {
                                                itemClickFun(i) // 必须调用
                                                onLocalPluginItemClick(i, m)
                                            }}
                                        >
                                            <img
                                                alt=''
                                                src={i.HeadImg || imageLoadErrorDefault}
                                                className={classNames(styles["plugin-local-headImg"])}
                                            />
                                            <span className={classNames(styles["plugin-local-scriptName"])}>
                                                {i.ScriptName}
                                            </span>
                                        </div>
                                        <div className={styles["plugin-local-info-right"]}>
                                            <PluginLocalInfoIcon plugin={i} />
                                        </div>
                                    </div>
                                )
                            }}
                        ></PluginContList>
                    </div>
                )
            })
        })

        // 点击存为插件 跳转新建插件页面
        const handleSkipAddYakitScriptPage = useMemoizedFn(() => {
            setPluginBaseInspectVisible(false)
            ipcRenderer.invoke("send-to-tab", {
                type: YakitRoute.AddYakitScript,
                data: {
                    moduleType: pluginType,
                    content: code
                }
            })
        })

        const openCompareModal = useMemoizedFn(() => {
            const m = showYakitModal({
                title: null,
                width: 1200,
                onOkText: "合并",
                closable: false,
                hiddenHeader: true,
                content: (
                    <DataCompareModal
                        leftTitle='原始源码'
                        leftCode={originCode}
                        rightTitle='更新源码'
                        rightCode={code}
                        onClose={() => m.destroy()}
                    />
                ),
                onOk: () => {
                    setPluginBaseInspectVisible(false)
                    // TODO 发送到本地插件
                    onSaveYakScript(m)
                },
                onCancel: () => {
                    m.destroy()
                }
            })
        })

        const onSaveYakScript = async (m: {destroy: () => void}) => {
            try {
                await ipcRenderer.invoke("SaveYakScript", {...script, Content: code})
                m.destroy()
                yakitNotify("success", "保存 Yak 脚本成功")
            } catch (error) {
                yakitFailed(`保存 Yak 模块失败: ${error}`)
            }
        }

        return (
            <div className={styles["secondNodeHeader"]}>
                <Space>
                    <YakitDropdownMenu
                        menu={{
                            data: dropdownData,
                            onClick: ({key}) => {
                                handleSetIconClick(key)
                            }
                        }}
                        dropdown={{
                            trigger: ["click"],
                            placement: "bottomLeft"
                        }}
                    >
                        <YakitButton type='outline2' icon={<SolidCogIcon />} />
                    </YakitDropdownMenu>
                    <span>插件代码配置</span>
                    <YakitRadioButtons
                        buttonStyle='solid'
                        value={tabActiveKey}
                        options={[
                            {value: "code", label: "源码"},
                            {value: "execResult", label: "执行结果"}
                        ]}
                        onChange={(e) => setTabActiveKey(e.target.value)}
                    />
                    {code && (
                        <>
                            <YakitTag
                                color={
                                    pluginTypeData.find((item) => item.value === pluginType)?.tagColor as YakitTagColor
                                }
                                style={{marginRight: 0, marginLeft: 8}}
                            >
                                {pluginTypeData.find((item) => item.value === pluginType)?.tagVal}
                            </YakitTag>
                            {currentPluginName && <span className={styles.currentPluginName}>{currentPluginName}</span>}
                        </>
                    )}
                </Space>
                <Space>
                    <>
                        {pluginType !== "nuclei" && (
                            <YakitButton
                                type='outline2'
                                icon={<OutlineSparklesIcon />}
                                onClick={() => setPluginBaseInspectVisible(true)}
                            >
                                自动评分
                            </YakitButton>
                        )}
                        <PluginBaseInspect
                            type={pluginType}
                            code={code}
                            visible={pluginBaseInspectVisible}
                            setVisible={setPluginBaseInspectVisible}
                            renderBtnsFn={(score) => {
                                return (
                                    <>
                                        {score > 55 && (
                                            <div className={styles["controls-btns"]}>
                                                {currentPluginName ? (
                                                    <YakitButton
                                                        icon={<OutlinePuzzleIcon />}
                                                        onClick={openCompareModal}
                                                    >
                                                        合并代码
                                                    </YakitButton>
                                                ) : (
                                                    <YakitButton
                                                        type='primary'
                                                        icon={<SolidStoreIcon />}
                                                        onClick={handleSkipAddYakitScriptPage}
                                                    >
                                                        存为插件
                                                    </YakitButton>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )
                            }}
                        ></PluginBaseInspect>
                        {currentPluginName ? (
                            <YakitButton icon={<OutlinePuzzleIcon />} onClick={openCompareModal}>
                                合并代码
                            </YakitButton>
                        ) : (
                            <YakitButton
                                type='primary'
                                icon={<SolidStoreIcon />}
                                onClick={handleSkipAddYakitScriptPage}
                            >
                                存为插件
                            </YakitButton>
                        )}
                    </>
                </Space>
            </div>
        )
    }
)

// 插件评分
interface PluginBaseInspectProps {
    type: string
    code: string
    visible: boolean
    setVisible: (value: boolean) => void
    renderBtnsFn: (score: number) => React.ReactNode
}

const PluginBaseInspect: React.FC<PluginBaseInspectProps> = React.memo((props) => {
    const {type, code, visible, setVisible, renderBtnsFn} = props

    const [loading, setLoading] = useState<boolean>(true)
    const [response, setResponse] = useState<SmokingEvaluateResponse>()

    useEffect(() => {
        if (visible) {
            onTest()
        } else {
            setLoading(true)
            setResponse(undefined)
        }
    }, [visible])

    const onTest = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("SmokingEvaluatePlugin", {PluginType: type, Code: code})
            .then((rsp: SmokingEvaluateResponse) => {
                if (!visible) return
                setResponse(rsp)
            })
            .catch((e: any) => {
                yakitNotify("error", `插件基础测试失败: ${e}`)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    return (
        <YakitModal
            title='插件基础检测'
            type='white'
            width={506}
            centered={true}
            maskClosable={false}
            closable={true}
            visible={visible}
            okButtonProps={{style: {display: "none"}}}
            footer={loading ? undefined : null}
            onCancel={() => setVisible(false)}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["plugin-base-inspect-body"]}>
                <div className={styles["header-wrapper"]}>
                    <div className={styles["title-style"]}>检测项包含：</div>
                    <div className={styles["header-body"]}>
                        <div className={styles["opt-content"]}>
                            <div className={styles["content-order"]}>1</div>
                            基础编译测试，判断语法是否符合规范，是否存在不正确语法；
                        </div>
                        <div className={styles["opt-content"]}>
                            <div className={styles["content-order"]}>2</div>
                            把基础防误报服务器作为测试基准，防止条件过于宽松导致的误报；
                        </div>
                        <div className={styles["opt-content"]}>
                            <div className={styles["content-order"]}>3</div>
                            检查插件执行过程是否会发生崩溃。
                        </div>
                    </div>
                </div>
                {loading && (
                    <div className={styles["loading-wrapper"]}>
                        <div className={styles["loading-body"]}>
                            <div className={styles["loading-icon"]}>
                                <YakitSpin spinning={true} />
                            </div>
                            <div className={styles["loading-title"]}>
                                <div className={styles["title-style"]}>检测中，请耐心等待...</div>
                                <div className={styles["subtitle-style"]}>
                                    一般来说，检测将会在 <span className={styles["active-style"]}>10-20s</span> 内结束
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {!loading && response && (
                    <div className={styles["loading-wrapper"]}>
                        {!!response.Results.length && (
                            <div className={styles["error-list"]}>
                                <div className={styles["list-body"]}>
                                    {response.Results.map((item) => {
                                        return (
                                            <div className={styles["list-opt"]}>
                                                <div className={styles["opt-header"]}>
                                                    <PluginTestErrorIcon />
                                                    {item.Item}
                                                </div>
                                                <div className={styles["opt-content"]}>{item.Suggestion}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        <div className={styles["res-score-wrap"]}>
                            <div className={styles.score} style={{color: response.Score < 55 ? "#F6544A" : "#56C991"}}>
                                {response.Score}
                            </div>
                            <div className={styles["res-feedback"]}>
                                （表现{response.Score < 55 ? "不佳" : "良好"}）
                            </div>
                        </div>
                        {renderBtnsFn(+response.Score)}
                    </div>
                )}
            </div>
        </YakitModal>
    )
})

// 插件列表
interface PluginContListProps {
    singleChoice?: boolean // 是否单选
    queryPluginType: string[] // 查询插件类型
    isShowDelIcon?: boolean // 是否支持插件组删除Icon显示
    isShowGroupMagBtn?: boolean // 是否支持添加插件组
    onSelectedPlugins?: (i: YakScript[]) => void // 实际加载出来选中得插件数组
    renderPluginItem: (i: YakScript, itemClickFun: (i: YakScript) => void) => React.ReactNode // 渲染每一项
}

const PluginContList: React.FC<PluginContListProps> = React.memo(
    ({
        singleChoice = false,
        queryPluginType,
        isShowDelIcon = true,
        isShowGroupMagBtn = true,
        onSelectedPlugins,
        renderPluginItem
    }) => {
        const [tags, setTags] = useState<string[]>([])
        const [searchKeyword, setSearchKeyword] = useState<string>("")
        const [selectGroup, setSelectGroup] = useState<YakFilterRemoteObj[]>([])
        const [groupNames, setGroupNames] = useState<string[]>([]) // 存储的插件组名字
        const [total, setTotal] = useState<number>(0)
        const [refreshYakModuleList, setRefreshYakModuleList] = useState<number>(Math.random()) // 刷新插件列表
        const pluginListRef = useRef<any>()
        const [initialTotal, setInitialTotal] = useState<number>(0) // 初始插件总数
        const [visibleOnline, setVisibleOnline] = useState<boolean>(false)
        const [visibleImport, setVisibleImport] = useState<boolean>(false)
        const [selectedPlugins, setSelectedPlugins] = useState<YakScript[]>([])
        const [isSelectAll, setIsSelectAll] = useState<boolean>(false)

        useEffect(() => {
            getAllSatisfyScript()
        }, [])

        const getAllSatisfyScript = useMemoizedFn(() => {
            const query: QueryYakScriptRequest = {
                Pagination: {
                    Limit: 20,
                    Page: 1,
                    OrderBy: "updated_at",
                    Order: "desc"
                },
                Keyword: searchKeyword,
                IncludedScriptNames: [],
                Type: queryPluginType + "",
                Tag: tags,
                Group: {UnSetGroup: false, Group: groupNames}
            }
    
            apiQueryYakScript(query).then((res) => {
                setInitialTotal(res.Total || 0)
            })
        })

        useEffect(() => {
            onSelectedPlugins && onSelectedPlugins(selectedPlugins)
        }, [selectedPlugins])

        useUpdateEffect(() => {
            let groupName: string[] = []
            selectGroup.forEach((ele) => {
                groupName = [...groupName, ele.name]
            })
            setGroupNames(Array.from(new Set(groupName)))
            setRefreshYakModuleList(Math.random())
        }, [selectGroup])

        const onRenderEmptyNode = useMemoizedFn(() => {
            if (Number(total) === 0 && (tags.length > 0 || searchKeyword || groupNames.length > 0)) {
                return (
                    <div className={styles["plugin-empty"]}>
                        <YakitEmpty title={null} description='搜索结果“空”' />
                    </div>
                )
            }
            if (Number(initialTotal) === 0) {
                return (
                    <div className={styles["plugin-empty"]}>
                        <YakitEmpty description='可一键获取官方云端插件，或导入外部插件源' />
                        <div className={styles["plugin-buttons"]}>
                            <YakitButton
                                type='outline1'
                                icon={<CloudDownloadIcon />}
                                onClick={() => setVisibleOnline(true)}
                            >
                                获取云端插件
                            </YakitButton>
                            <YakitButton type='outline1' icon={<ImportIcon />} onClick={() => setVisibleImport(true)}>
                                导入插件源
                            </YakitButton>
                        </div>
                    </div>
                )
            }
        })

        const handleSelectAll = (checked: boolean) => {
            setIsSelectAll(checked)
            if (!checked) {
                setSelectedPlugins([])
            }
        }

        const handleCheckboxClicked = (checked: boolean, i: YakScript) => {
            let copySelectedPlugins = structuredClone(selectedPlugins)
            if (checked) {
                copySelectedPlugins.push(i)
            } else {
                copySelectedPlugins = copySelectedPlugins.filter((item) => item.UUID !== i.UUID)
            }
            setIsSelectAll(copySelectedPlugins.length == total)
            setSelectedPlugins(copySelectedPlugins)
        }

        const handlePluginItemClicked = (i: YakScript) => {
            let copySelectedPlugins = structuredClone(selectedPlugins)
            const index = copySelectedPlugins.findIndex((item) => item.UUID === i.UUID)
            if (index > -1) {
                copySelectedPlugins.splice(index, 1)
            } else {
                copySelectedPlugins.push(i)
            }
            setIsSelectAll(copySelectedPlugins.length == total)
            setSelectedPlugins(copySelectedPlugins)
        }

        return (
            <div className={styles["plugin-cont"]}>
                <div className={styles["plugin-search-wrap"]}>
                    <PluginSearch
                        tag={tags}
                        searchKeyword={searchKeyword}
                        setTag={(val) => {
                            setTags(val)
                            setIsSelectAll(false)
                            setRefreshYakModuleList(Math.random())
                        }}
                        setSearchKeyword={setSearchKeyword}
                        onSearch={() => {
                            setIsSelectAll(false)
                            setRefreshYakModuleList(Math.random())
                        }}
                    />
                </div>

                <PluginGroup selectGroup={selectGroup} setSelectGroup={setSelectGroup} isShowGroupMagBtn={isShowGroupMagBtn} />
                <div style={{display: "flex", justifyContent: "space-between", marginBottom: 8}}>
                    <div className={styles["plugin-list-info"]}>
                        {!singleChoice && (
                            <div className={styles["plugin-list-check"]}>
                                <YakitCheckbox
                                    checked={isSelectAll}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    indeterminate={!isSelectAll && selectedPlugins.length > 0}
                                />
                                <span className={styles["plugin-list-check-text"]}>全选</span>
                            </div>
                        )}
                        <div className={styles["number-warp"]}>
                            Total <span className={styles["number-color"]}>{total}</span>
                            {!singleChoice && (
                                <>
                                    <Divider type='vertical' style={{margin: "0 8px", height: 12, top: 0}} />
                                    Selected
                                    <span className={styles["number-color"]}>&nbsp;{selectedPlugins.length}</span>
                                </>
                            )}
                        </div>
                    </div>
                    {!singleChoice && (
                        <div className={styles["selected-clearAll"]}>
                            <YakitButton
                                type='text'
                                colors='danger'
                                onClick={() => {
                                    setSelectedPlugins([])
                                    setIsSelectAll(false)
                                }}
                                disabled={selectedPlugins.length === 0}
                            >
                                清&nbsp;空
                            </YakitButton>
                        </div>
                    )}
                </div>
                <TagsAndGroupRender selectGroup={selectGroup} setSelectGroup={setSelectGroup} />
                <div className={styles["plugin-list-wrap"]} ref={pluginListRef}>
                    <YakModuleList
                        key={refreshYakModuleList}
                        targetRef={pluginListRef}
                        emptyNode={onRenderEmptyNode()}
                        queryLocal={{
                            Tag: tags,
                            Type: queryPluginType + "",
                            Keyword: searchKeyword,
                            Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"},
                            Group: {UnSetGroup: false, Group: groupNames}
                        }}
                        itemHeight={44}
                        onClicked={(script) => {}}
                        setTotal={(t) => {
                            setTotal(t || 0)
                        }}
                        isSelectAll={isSelectAll}
                        onSelectList={setSelectedPlugins}
                        onYakScriptRender={(i: YakScript, maxWidth?: number) => {
                            return (
                                <div className={styles["plugin-local-item"]}>
                                    <div className={styles["plugin-local-left"]}>
                                        {!singleChoice && (
                                            <YakitCheckbox
                                                checked={!!selectedPlugins.find((item) => item.UUID === i.UUID)}
                                                onChange={(e) => handleCheckboxClicked(e.target.checked, i)}
                                            />
                                        )}
                                        {renderPluginItem(i, handlePluginItemClicked)}
                                    </div>
                                </div>
                            )
                        }}
                    />
                    {/* 获取云端插件 */}
                    <YakitGetOnlinePlugin
                        visible={visibleOnline}
                        setVisible={(v) => {
                            setVisibleOnline(v)
                            setRefreshYakModuleList(Math.random())
                        }}
                    />
                    {/* 导入插件源 */}
                    <ImportLocalPlugin
                        visible={visibleImport}
                        setVisible={(v) => {
                            setVisibleImport(v)
                            setRefreshYakModuleList(Math.random())
                        }}
                    />
                </div>
            </div>
        )
    }
)

export default PluginDebuggerPage
