import React, {useEffect, useState, useRef} from "react"
import {Divider, Space} from "antd"
import {useMemoizedFn, useUpdateEffect, usePrevious} from "ahooks"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {AutoCard} from "@/components/AutoCard"
import {OutlineEyeIcon, OutlinePuzzleIcon, OutlineSparklesIcon} from "@/assets/icon/outline"
import {SelectOne} from "@/utils/inputUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {debugYakitModal, showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {YakitRoute} from "@/routes/newRoute"
import {PluginDebuggerExec} from "@/pages/pluginDebugger/PluginDebuggerExec"
import {MITMPluginTemplate, NucleiPluginTemplate, PortScanPluginTemplate} from "@/pages/pluginDebugger/defaultData"
import YakitTabs from "@/components/yakitUI/YakitTabs/YakitTabs"
import {
    getDefaultHTTPRequestBuilderParams,
    HTTPRequestBuilder,
    HTTPRequestBuilderParams
} from "@/pages/httpRequestBuilder/HTTPRequestBuilder"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakScript} from "@/pages/invoker/schema"
import {SmokingEvaluateResponse} from "@/pages/pluginDebugger/SmokingEvaluate"
import {DataCompareModal} from "../compare/DataCompare"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {SolidCogIcon, SolidPlayIcon, SolidStopIcon} from "@/assets/icon/solid"
import classNames from "classnames"
import styles from "./PluginDebuggerPage.module.scss"
import {
    PluginGroup,
    PluginSearch,
    TagsAndGroupRender,
    YakFilterRemoteObj
} from "../mitm/MITMServerHijacking/MITMPluginLocalList"
import {YakModuleList} from "../yakitStore/YakitStorePage"
import {PluginLocalInfoIcon} from "../customizeMenu/CustomizeMenu"
const {YakitTabPane} = YakitTabs

export interface PluginDebuggerPageProp {
    // 是否生成yaml模板
    generateYamlTemplate: boolean
    // yaml模板内容
    YamlContent: string
}

const {ipcRenderer} = window.require("electron")

const pluginTypeData = [
    {text: "端口扫描", value: "port-scan", tagVal: "PORT-SCAN", tagColor: "success"},
    {text: "MITM", value: "mitm", tagVal: "MITM", tagColor: "blue"},
    {text: "Yaml-PoC", value: "nuclei", tagVal: "Nuclei-Yaml", tagColor: "purple"}
]

type PluginTypes = "port-scan" | "mitm" | "nuclei"

export const PluginDebuggerPage: React.FC<PluginDebuggerPageProp> = ({generateYamlTemplate, YamlContent}) => {
    const [pluginType, setPluginType] = useState<PluginTypes>(generateYamlTemplate ? "nuclei" : "port-scan")
    const prevPluginType = usePrevious(pluginType)
    const [isCancelFlag, setIsCancelFlag] = useState<boolean>(false)
    const [builder, setBuilder] = useState<HTTPRequestBuilderParams>(getDefaultHTTPRequestBuilderParams())
    const [pluginExecuting, setPluginExecuting] = useState<boolean>(false)
    const [showPluginExec, setShowPluginExec] = useState<boolean>(false)
    const [code, setCode] = useState<string>(PortScanPluginTemplate)
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

    const setDefultTemplate = () => {
        switch (pluginType) {
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

    useUpdateEffect(() => {
        if (!currentPluginName && !isCancelFlag) {
            if (!!code) {
                const m = showYakitModal({
                    title: "切换类型将导致当前代码丢失",
                    onOk: () => {
                        setRefreshEditor(Math.random())
                        setDefultTemplate()
                        m.destroy()
                    },
                    content: <div style={{margin: 24}}>确认插件类型切换？</div>,
                    onCancel: () => {
                        setIsCancelFlag(true)
                        setPluginType(prevPluginType as PluginTypes)
                    }
                })
            } else {
                setDefultTemplate()
            }
        }
    }, [pluginType, isCancelFlag])

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
                firstMinSize={300}
                firstRatio={"300px"}
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
                                >
                                    {!pluginExecuting ? "执行" : "停止执行"}
                                </YakitButton>
                            </div>
                        }
                    >
                        <HTTPRequestBuilder value={builder} setValue={setBuilder} />
                    </AutoCard>
                }
                secondNode={
                    <YakitTabs
                        type='card'
                        tabPosition='right'
                        activeKey={tabActiveKey}
                        onChange={setTabActiveKey}
                        className={styles.rightYakitTabs}
                    >
                        <YakitTabPane tab='源码' key='code' className={styles.tabPane}>
                            <SecondNodeHeader
                                generateYamlTemplate={generateYamlTemplate}
                                currentPluginName={currentPluginName}
                                setCurrentPluginName={setCurrentPluginName}
                                pluginType={pluginType}
                                setPluginType={setPluginType}
                                code={code}
                                setCode={setCode}
                                setRefreshEditor={setRefreshEditor}
                                setIsCancelFlag={setIsCancelFlag}
                            ></SecondNodeHeader>
                            <div style={{height: "calc(100% - 34px)"}}>
                                <NewHTTPPacketEditor
                                    key={refreshEditor}
                                    language={pluginType === "nuclei" ? "yaml" : "yak"}
                                    noHeader={true}
                                    originValue={StringToUint8Array(code)}
                                    onChange={(val) => setCode(Uint8ArrayToString(val))}
                                />
                            </div>
                        </YakitTabPane>
                        <YakitTabPane tab='执行结果' key='execResult'>
                            <SecondNodeHeader
                                generateYamlTemplate={generateYamlTemplate}
                                currentPluginName={currentPluginName}
                                setCurrentPluginName={setCurrentPluginName}
                                pluginType={pluginType}
                                setPluginType={setPluginType}
                                code={code}
                                setCode={setCode}
                                setRefreshEditor={setRefreshEditor}
                                setIsCancelFlag={setIsCancelFlag}
                            ></SecondNodeHeader>
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
                        </YakitTabPane>
                    </YakitTabs>
                }
            />
        </div>
    )
}

interface SecondNodeHeaderProps {
    generateYamlTemplate: boolean
    currentPluginName: string
    setCurrentPluginName: (i: string) => void
    pluginType: string
    setPluginType: (i: PluginTypes) => void
    code: string
    setCode: (i: string) => void
    setRefreshEditor: (i: number) => void
    setIsCancelFlag: (i: boolean) => void
}

const SecondNodeHeader: React.FC<SecondNodeHeaderProps> = React.memo(
    ({
        pluginType,
        currentPluginName,
        generateYamlTemplate,
        setPluginType,
        code,
        setCode,
        setCurrentPluginName,
        setRefreshEditor,
        setIsCancelFlag
    }) => {
        const [originCode, setOriginCode] = useState<string>("")
        const [script, setScript] = useState<YakScript>()
        const [pluginBaseInspectVisible, setPluginBaseInspectVisible] = useState<boolean>(false)

        // 选择要调试的插件
        const handleSelectDebugPlugin = useMemoizedFn(() => {
            const m = showYakitDrawer({
                title: <div className={styles["debug-plugin-drawer-title"]}>选择要调试的插件</div>,
                width: "30%",
                placement: "left",
                content: (
                    <div style={{height: "100%"}}>
                        <PluginCont
                            onPluginItemClicked={(script) => {
                                switch (script.Type) {
                                    case "mitm":
                                    case "nuclei":
                                    // @ts-ignore
                                    case "port-scan":
                                        setPluginType(script.Type as any)
                                        setCode(script.Content)
                                        setOriginCode(script.Content)
                                        setCurrentPluginName(script.ScriptName)
                                        setRefreshEditor(Math.random())
                                        setScript(script)
                                        m.destroy()
                                        return
                                    default:
                                        yakitFailed("暂不支持的插件类型")
                                }
                            }}
                        ></PluginCont>
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
                    moduleType: "nuclei",
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
                content: (
                    <DataCompareModal
                        leftTitle='原始源码'
                        leftCode={originCode}
                        rightTitle='更新源码'
                        rightCode={code}
                        readOnly={true}
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
                    <YakitButton type='outline2' icon={<SolidCogIcon />} onClick={handleSelectDebugPlugin} />
                    <span>插件代码配置</span>
                    {!currentPluginName && !generateYamlTemplate && (
                        <SelectOne
                            formItemStyle={{margin: 0, padding: 0}}
                            label={""}
                            data={pluginTypeData}
                            value={pluginType}
                            setValue={(val) => {
                                setIsCancelFlag(false)
                                setPluginType(val)
                            }}
                            oldTheme={false}
                        />
                    )}
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
                        <YakitButton
                            type='outline2'
                            icon={<OutlineSparklesIcon />}
                            onClick={() => setPluginBaseInspectVisible(true)}
                        >
                            自动评分
                        </YakitButton>
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
                                                        icon={<OutlinePuzzleIcon />}
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
                                icon={<OutlinePuzzleIcon />}
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
                                                    {/* <PluginTestErrorIcon /> */}
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
interface PluginContProps {
    onPluginItemClicked: (i: YakScript) => void
}
const PluginCont: React.FC<PluginContProps> = React.memo(({onPluginItemClicked}) => {
    const [tags, setTags] = useState<string[]>([])
    const [searchKeyword, setSearchKeyword] = useState<string>("")
    const [selectGroup, setSelectGroup] = useState<YakFilterRemoteObj[]>([])
    const [includedScriptNames, setIncludedScriptNames] = useState<string[]>([]) // 存储的插件组里面的插件名称用于搜索
    const [total, setTotal] = useState<number>(0)
    const [refreshYakModuleList, setRefreshYakModuleList] = useState<number>(Math.random()) // 刷新插件列表
    const pluginListRef = useRef<any>()

    useUpdateEffect(() => {
        let newScriptNames: string[] = []
        selectGroup.forEach((ele) => {
            newScriptNames = [...newScriptNames, ...ele.value]
        })
        setIncludedScriptNames(Array.from(new Set(newScriptNames)))
        setRefreshYakModuleList(Math.random())
    }, [selectGroup])

    return (
        <div className={styles["plugin-cont"]}>
            <div className={styles["plugin-search-wrap"]}>
                <PluginSearch
                    tag={tags}
                    searchKeyword={searchKeyword}
                    setTag={(val) => {
                        setTags(val)
                        setRefreshYakModuleList(Math.random())
                    }}
                    setSearchKeyword={setSearchKeyword}
                    onSearch={() => {
                        setRefreshYakModuleList(Math.random())
                    }}
                />
            </div>

            <PluginGroup
                selectGroup={selectGroup}
                setSelectGroup={setSelectGroup}
                checkList={[]}
                isSelectAll={false}
                isShowAddBtn={false}
                isShowDelIcon={false}
            />
            <div className={styles["total-warp"]}>
                Total <span className={styles["total-number"]}>{total}</span>
            </div>
            <TagsAndGroupRender selectGroup={selectGroup} setSelectGroup={setSelectGroup} />
            <div className={styles["plugin-list-wrap"]} ref={pluginListRef}>
                <YakModuleList
                    key={refreshYakModuleList}
                    targetRef={pluginListRef}
                    emptyNode={<></>}
                    queryLocal={{
                        Tag: tags,
                        Type: "port-scan,mitm,nuclei",
                        IncludedScriptNames: includedScriptNames,
                        Keyword: searchKeyword,
                        Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
                    }}
                    itemHeight={44}
                    onClicked={(script) => {}}
                    setTotal={(t) => {
                        setTotal(t || 0)
                    }}
                    onYakScriptRender={(i: YakScript, maxWidth?: number) => {
                        return (
                            <div className={styles["plugin-local-item"]}>
                                <div className={styles["plugin-local-left"]}>
                                    <div className={styles["plugin-local-info"]}>
                                        <div
                                            className={styles["plugin-local-info-left"]}
                                            onClick={() => onPluginItemClicked(i)}
                                        >
                                            {i.HeadImg && (
                                                <img
                                                    alt=''
                                                    src={i.HeadImg}
                                                    className={classNames(styles["plugin-local-headImg"])}
                                                />
                                            )}
                                            <span className={classNames(styles["plugin-local-scriptName"])}>
                                                {i.ScriptName}
                                            </span>
                                        </div>
                                        <div className={styles["plugin-local-info-right"]}>
                                            <PluginLocalInfoIcon plugin={i} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }}
                />
            </div>
        </div>
    )
})

export default PluginDebuggerPage
