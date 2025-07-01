import React, {useEffect, useMemo, useRef, useState} from "react"
import {Dropdown, Form, Space, Tooltip} from "antd"
import {AutoCard} from "../../components/AutoCard"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useGetState, useMemoizedFn} from "ahooks"
import {InformationCircleIcon, RefreshIcon} from "@/assets/newIcon"
import {ExclamationCircleOutlined, FullscreenOutlined} from "@ant-design/icons/lib"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import styles from "./HTTPFuzzerHotPatch.module.scss"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {yakitNotify} from "@/utils/notification"
import {
    OutlineClouddownloadIcon,
    OutlineClouduploadIcon,
    OutlineTerminalIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {defaultWebFuzzerPageInfo, HotPatchDefaultContent, HotPatchTempDefault} from "@/defaultConstants/HTTPFuzzerPage"
import {setClipboardText} from "@/utils/clipboard"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {shallow} from "zustand/shallow"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {cloneDeep} from "lodash"
import {YakitRoute} from "@/enums/yakitRoute"
import {FuzzerRemoteGV} from "@/enums/fuzzer"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {DbOperateMessage} from "../layout/mainOperatorContent/utils"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {useStore} from "@/store"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {PluginListPageMeta} from "../plugins/baseTemplateType"
import {isEnpriTrace} from "@/utils/envfile"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {openConsoleNewWindow} from "@/utils/openWebsite"
interface HTTPFuzzerHotPatchProp {
    pageId: string
    onInsert: (s: string) => any
    onSaveCode: (code: string) => any
    onSaveHotPatchCodeWithParamGetterCode: (code: string) => any
    onCancel: () => void
    initialHotPatchCode: string
    initialHotPatchCodeWithParamGetter?: string
}

const HotPatchParamsGetterDefault = `__getParams__ = func() {
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

const {ipcRenderer} = window.require("electron")

export const HTTPFuzzerHotPatch: React.FC<HTTPFuzzerHotPatchProp> = (props) => {
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initWebFuzzerPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, props.pageId)
        if (currentItem && currentItem.pageParamsInfo.webFuzzerPageInfo) {
            return currentItem.pageParamsInfo.webFuzzerPageInfo
        } else {
            return cloneDeep(defaultWebFuzzerPageInfo)
        }
    })
    const [params, setParams, getParams] = useGetState({
        Template: `{{yak(handle|{{params(test)}})}}`,
        HotPatchCode: props.initialHotPatchCode,
        HotPatchCodeWithParamGetter: !!props.initialHotPatchCodeWithParamGetter
            ? props.initialHotPatchCodeWithParamGetter
            : HotPatchParamsGetterDefault,
        TimeoutSeconds: 20,
        Limit: 300
    })
    const [loading, setLoading] = useState(false)
    const [hotPatchEditorHeight, setHotPatchEditorHeight] = useState(400)
    const [hotPatchTempLocal, setHotPatchTempLocal] = useState<HotPatchTempItem[]>(cloneDeep(HotPatchTempDefault))
    const [addHotCodeTemplateVisible, setAddHotCodeTemplateVisible] = useState<boolean>(false)
    const [hotPatchCodeOpen, setHotPatchCodeOpen] = useState<boolean>(false)
    const initHotPatchCodeOpen = useRef<boolean>(false)
    const [refreshHotCodeList, setRefreshHotCodeList] = useState<boolean>(true)
    const tempNameRef = useRef<string>("")

    useEffect(() => {
        getRemoteValue(FuzzerRemoteGV.HTTPFuzzerHotPatch_TEMPLATE_DEMO).then((e) => {
            if (!!e) {
                setParams({...params, Template: e})
            }
        })

        getRemoteValue(FuzzerRemoteGV.FuzzerHotCodeSwitchAndCode).then((e) => {
            if (!!e) {
                try {
                    const obj = JSON.parse(e) || {}
                    if (obj.hotPatchCodeOpen && initWebFuzzerPageInfo().hotPatchCode === obj.hotPatchCode) {
                        setHotPatchCodeOpen(obj.hotPatchCodeOpen)
                        initHotPatchCodeOpen.current = obj.hotPatchCodeOpen
                    }
                } catch (error) {}
            }
        })

        return () => {
            setRemoteValue(FuzzerRemoteGV.HTTPFuzzerHotPatch_TEMPLATE_DEMO, getParams().Template).then(() => {})
        }
    }, [])

    const saveCode = useMemoizedFn((hotPatchCode: string) => {
        props.onSaveCode(hotPatchCode)
        setRemoteValue(
            FuzzerRemoteGV.FuzzerHotCodeSwitchAndCode,
            JSON.stringify({hotPatchCodeOpen: hotPatchCodeOpen, hotPatchCode: getParams().HotPatchCode})
        )
        initHotPatchCodeOpen.current = hotPatchCodeOpen
    })

    const onClose = useMemoizedFn(async () => {
        if (
            initWebFuzzerPageInfo().hotPatchCode !== params.HotPatchCode ||
            initHotPatchCodeOpen.current !== hotPatchCodeOpen
        ) {
            let m = YakitModalConfirm({
                width: 420,
                type: "white",
                onCancelText: "取消",
                onOkText: "确认",
                icon: <ExclamationCircleOutlined />,
                style: {top: "20%"},
                onOk: () => {
                    saveCode(params.HotPatchCode)
                    props.onCancel()
                    m.destroy()
                },
                onCancel: () => {
                    props.onCancel()
                    m.destroy()
                },
                content: "是否启用修改的热加载代码和配置"
            })
        } else {
            props.onCancel()
        }
    })

    const onUpdateTemplate = useMemoizedFn(() => {
        ipcRenderer
            .invoke("UpdateHotPatchTemplate", {
                Condition: {
                    Type: "fuzzer",
                    Name: [tempNameRef.current]
                },
                Data: {
                    Type: "fuzzer",
                    Content: params.HotPatchCode,
                    Name: tempNameRef.current
                }
            })
            .then((res) => {
                yakitNotify("success", "更新模板 " + tempNameRef.current + " 成功")
            })
            .catch((error) => {
                yakitNotify("error", "更新模板 " + tempNameRef.current + " 失败：" + error)
            })
    })

    return (
        <div className={styles["http-fuzzer-hotPatch"]}>
            <div className={styles["http-fuzzer-hotPatch-heard"]}>
                <span>调试 / 插入热加载代码</span>
                <OutlineXIcon onClick={onClose} />
            </div>
            <Form
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    saveCode(params.HotPatchCode)
                    props.onSaveHotPatchCodeWithParamGetterCode(params.HotPatchCodeWithParamGetter)

                    setLoading(true)
                    ipcRenderer
                        .invoke("StringFuzzer", {...params})
                        .then((response: {Results: Uint8Array[]}) => {
                            const data: string[] = (response.Results || []).map((buf) =>
                                new Buffer(buf).toString("utf8")
                            )
                            showYakitDrawer({
                                title: "HotPatch Tag Result",
                                width: "45%",
                                content: (
                                    <AutoCard
                                        size={"small"}
                                        bordered={false}
                                        title={<span style={{color: "var(--yakit-header-color)"}}>结果展示</span>}
                                        extra={
                                            <Space>
                                                <YakitButton
                                                    type='text'
                                                    onClick={() => {
                                                        setClipboardText(data.join("\n"))
                                                    }}
                                                >
                                                    复制 Fuzz 结果
                                                </YakitButton>
                                                <YakitButton
                                                    type='text'
                                                    onClick={() => {
                                                        setClipboardText(params.Template)
                                                    }}
                                                >
                                                    {" "}
                                                    复制 Fuzz 标签
                                                </YakitButton>
                                            </Space>
                                        }
                                    >
                                        <YakitEditor value={data.join("\r\n")} readOnly={true} />
                                    </AutoCard>
                                )
                            })
                        })
                        .finally(() => setTimeout(() => setLoading(false), 300))
                }}
                layout={"vertical"}
                className={styles["http-fuzzer-hotPatch-form"]}
            >
                <div className={styles["http-fuzzer-hotPatch-label"]}>
                    <Space>
                        模版内容
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation() // 阻止事件冒泡
                                setClipboardText(params.Template)
                            }}
                        >
                            点击复制
                        </YakitButton>
                        {props.onInsert && (
                            <YakitButton
                                type={"primary"}
                                onClick={() => {
                                    props.onInsert(params.Template)
                                }}
                            >
                                插入编辑器位置
                            </YakitButton>
                        )}
                    </Space>
                </div>
                <Form.Item>
                    <div style={{height: 60}}>
                        <YakitEditor
                            type='http'
                            value={params.Template}
                            setValue={(Template) => setParams({...getParams(), Template})}
                        ></YakitEditor>
                    </div>
                </Form.Item>
                <div className={styles["http-fuzzer-hotPatch-label"]}>
                    <Space style={{lineHeight: "16px"}}>
                        热加载代码
                        <YakitPopconfirm
                            title={"点击该按钮将会重置热加载代码，代码可能会丢失，请谨慎操作"}
                            onConfirm={(e) => {
                                tempNameRef.current = ""
                                setParams({...params, HotPatchCode: HotPatchDefaultContent})
                            }}
                        >
                            <YakitButton icon={<RefreshIcon />} type='text' />
                        </YakitPopconfirm>
                        <YakitPopover
                            title={"扩大编辑器"}
                            content={
                                <>
                                    <YakitRadioButtons
                                        value={hotPatchEditorHeight}
                                        onChange={(e) => {
                                            setHotPatchEditorHeight(e.target.value)
                                        }}
                                        buttonStyle='solid'
                                        options={[
                                            {
                                                value: 250,
                                                label: "小"
                                            },
                                            {
                                                value: 400,
                                                label: "中"
                                            },
                                            {
                                                value: 600,
                                                label: "大"
                                            }
                                        ]}
                                    />
                                </>
                            }
                        >
                            <YakitButton icon={<FullscreenOutlined />} type='text' />
                        </YakitPopover>
                        <div className={styles["hotPatchCodeOpen"]}>
                            <span style={{fontSize: 12}}>共用热加载代码</span>
                            <Tooltip title='打开以后webfuzzer标签将共用当前热加载代码，但只对新建标签页生效'>
                                <InformationCircleIcon className={styles["info-icon"]} />
                            </Tooltip>
                            ：<YakitSwitch checked={hotPatchCodeOpen} onChange={setHotPatchCodeOpen}></YakitSwitch>
                        </div>
                    </Space>
                    <Space style={{lineHeight: "16px"}}>
                        <YakitButton
                            disabled={!params.HotPatchCode}
                            type='outline1'
                            onClick={() => setAddHotCodeTemplateVisible(true)}
                        >
                            另存为
                        </YakitButton>
                        <Tooltip title='更新当前模板并保存'>
                            <YakitButton
                                disabled={!params.HotPatchCode || !tempNameRef.current}
                                type='outline1'
                                onClick={onUpdateTemplate}
                            >
                                保存模板
                            </YakitButton>
                        </Tooltip>
                        <AddHotCodeTemplate
                            type='fuzzer'
                            title="另存为"
                            hotPatchTempLocal={hotPatchTempLocal}
                            hotPatchCode={params.HotPatchCode}
                            visible={addHotCodeTemplateVisible}
                            onSetAddHotCodeTemplateVisible={setAddHotCodeTemplateVisible}
                            onSaveHotCodeOk={(tempName) => {
                                tempNameRef.current = tempName || ""
                                setRefreshHotCodeList((prev) => !prev)
                            }}
                        ></AddHotCodeTemplate>
                        <YakitButton
                            type={"primary"}
                            onClick={() => {
                                saveCode(params.HotPatchCode)
                                setTimeout(() => {
                                    yakitNotify("success", "启用成功")
                                    props.onCancel()
                                }, 100)
                            }}
                        >
                            确认
                        </YakitButton>
                    </Space>
                </div>
                <Form.Item>
                    <div className={styles["hotCode-editor-wrapper"]} style={{height: hotPatchEditorHeight}}>
                        <HotCodeTemplate
                            type='fuzzer'
                            hotPatchTempLocal={hotPatchTempLocal}
                            onSetHotPatchTempLocal={setHotPatchTempLocal}
                            onClickHotCode={(temp, tempName) => {
                                tempNameRef.current = tempName || ""
                                setParams({...getParams(), HotPatchCode: temp})
                            }}
                            dropdown={false}
                            refreshList={refreshHotCodeList}
                            onDeleteLocalTempOk={() => {
                                tempNameRef.current = ""
                            }}
                        ></HotCodeTemplate>
                        <div className={styles["hotCode-editor"]}>
                            <YakitEditor
                                type='yak'
                                value={params.HotPatchCode}
                                setValue={(HotPatchCode) => setParams({...getParams(), HotPatchCode})}
                            ></YakitEditor>
                        </div>
                    </div>
                </Form.Item>
                <Form.Item help={"调试须知: 调试执行将会仅最多执行20秒 或 渲染 Payload 最多 300 条"}>
                    <YakitButton loading={loading} type='primary' htmlType='submit'>
                        调试执行
                    </YakitButton>
                    <Tooltip placement='bottom' title='引擎Console'>
                        <YakitButton
                            type='text'
                            onClick={openConsoleNewWindow}
                            icon={<OutlineTerminalIcon className={styles["engineConsole-icon-style"]} />}
                            style={{marginLeft: 8, marginTop: 5}}
                        ></YakitButton>
                    </Tooltip>
                </Form.Item>
            </Form>
        </div>
    )
}

export const getHotPatchCodeInfo = async () => {
    let hotPatchCode = HotPatchDefaultContent
    try {
        const res = await getRemoteValue(FuzzerRemoteGV.FuzzerHotCodeSwitchAndCode)
        if (res) {
            const obj = JSON.parse(res) || {}
            if (obj.hotPatchCodeOpen) {
                hotPatchCode = obj.hotPatchCode
            }
        }
    } catch (error) {}
    return hotPatchCode
}

interface QueryHotPatchTemplateListResponse {
    Pagination: Paging
    Name: string[]
    Total: number
}

interface HotPatchTemplateRequest {
    Name: string[]
    Type: HotCodeType
}

interface QueryHotPatchTemplateResponse {
    Message: DbOperateMessage
    Data: HotPatchTemplate[]
}

export interface HotPatchTempItem {
    name: string
    temp: string
    isDefault: boolean
}

interface DeleteHotPatchTemplateRequest {
    Condition: HotPatchTemplateRequest
}

interface GetOnlineHotPatchTemplateRequest extends API.HotPatchTemplateRequest, PluginListPageMeta {}

type HotCodeType = "fuzzer" | "mitm" | "httpflow-analyze"
interface HotCodeTemplateProps {
    type: HotCodeType
    hotPatchTempLocal: HotPatchTempItem[]
    onSetHotPatchTempLocal: (hotPatchTempLocal: HotPatchTempItem[]) => void
    onClickHotCode: (temp: string, tempName?: string) => void
    dropdown?: boolean
    refreshList?: boolean
    onDeleteLocalTempOk?: () => void
}
export const HotCodeTemplate: React.FC<HotCodeTemplateProps> = React.memo((props) => {
    const {
        type,
        hotPatchTempLocal,
        onSetHotPatchTempLocal,
        onClickHotCode,
        dropdown = true,
        refreshList,
        onDeleteLocalTempOk
    } = props
    const [hotCodeTempVisible, setHotCodeTempVisible] = useState<boolean>(false)
    const [tab, setTab] = useState<"local" | "online">("local")
    const [viewCurHotCode, setViewCurrHotCode] = useState<string>("")
    const userInfo = useStore((s) => s.userInfo)
    const hotPatchTempLocalRef = useRef<HotPatchTempItem[]>(hotPatchTempLocal)
    const [hotPatchTempOnline, setHotPatchTempOnline] = useState<HotPatchTempItem[]>([])
    const [sameNameHint, setSameNameHint] = useState<boolean>(false)
    const sameNameHintInfoRef = useRef({title: "", content: "", onOk: () => {}, onCancel: () => {}})

    useEffect(() => {
        hotPatchTempLocalRef.current = hotPatchTempLocal
    }, [hotPatchTempLocal])

    useEffect(() => {
        if (hotCodeTempVisible || dropdown === false) {
            if (tab === "local") {
                ipcRenderer
                    .invoke("QueryHotPatchTemplateList", {
                        Type: type
                    })
                    .then((res: QueryHotPatchTemplateListResponse) => {
                        const nameArr = res.Name
                        const newHotPatchTempLocal = hotPatchTempLocalRef.current.slice()
                        nameArr.forEach((name) => {
                            const index = newHotPatchTempLocal.findIndex((item) => item.name === name)
                            if (index === -1) {
                                newHotPatchTempLocal.push({
                                    name,
                                    temp: "",
                                    isDefault: false
                                })
                            }
                        })
                        onSetHotPatchTempLocal(newHotPatchTempLocal)
                    })
                    .catch((error) => {
                        yakitNotify("error", error + "")
                    })
            } else {
                NetWorkApi<GetOnlineHotPatchTemplateRequest, API.HotPatchTemplateResponse>({
                    method: "get",
                    url: "hot/patch/template",
                    data: {
                        page: 1,
                        limit: 1000,
                        type: type
                    }
                })
                    .then((res) => {
                        const d = res.data || []
                        // 线上模板 isDefault都默认为true
                        const list = d.map((item) => ({name: item.name, temp: item.content, isDefault: true}))
                        setHotPatchTempOnline(list)
                    })
                    .catch((err) => {
                        yakitNotify("error", "线上模板列表获取失败：" + err)
                    })
            }
        }
    }, [hotCodeTempVisible, tab, dropdown, refreshList])

    const onClickHotCodeName = (item: HotPatchTempItem, click?: boolean) => {
        if (item.isDefault) {
            if (click) {
                onClickHotCode(item.temp)
                setHotCodeTempVisible(false)
            }
            setViewCurrHotCode(item.temp)
        } else {
            if (tab === "local") {
                const params: HotPatchTemplateRequest = {
                    Type: type,
                    Name: [item.name]
                }
                ipcRenderer
                    .invoke("QueryHotPatchTemplate", params)
                    .then((res: QueryHotPatchTemplateResponse) => {
                        if (click) {
                            onClickHotCode(res.Data[0].Content, item.name)
                            setHotCodeTempVisible(false)
                        }
                        setViewCurrHotCode(res.Data[0].Content)
                    })
                    .catch((error) => {
                        setViewCurrHotCode("")
                        yakitNotify("error", error + "")
                    })
            }
        }
    }

    const deleteHotPatchTemplate = (item: HotPatchTempItem) => {
        if (tab === "local") {
            const params: DeleteHotPatchTemplateRequest = {
                Condition: {
                    Type: type,
                    Name: [item.name]
                }
            }
            ipcRenderer
                .invoke("DeleteHotPatchTemplate", params)
                .then((res: {Message: DbOperateMessage}) => {
                    onSetHotPatchTempLocal(hotPatchTempLocal.filter((i) => i.name !== item.name))
                    yakitNotify("success", "删除成功")
                    onDeleteLocalTempOk && onDeleteLocalTempOk()
                })
                .catch((error) => {
                    yakitNotify("error", error + "")
                })
        } else {
            NetWorkApi<API.HotPatchTemplateRequest, API.ActionSucceeded>({
                method: "delete",
                url: "hot/patch/template",
                data: {
                    type: type,
                    name: item.name
                }
            })
                .then((res) => {
                    if (res.ok) {
                        setHotPatchTempOnline(hotPatchTempOnline.filter((i) => i.name !== item.name))
                        yakitNotify("success", "线上删除成功")
                    }
                })
                .catch((err) => {
                    yakitNotify("error", "线上删除失败：" + err)
                })
        }
    }

    const findHotPatchTemplate = (item: HotPatchTempItem, upload: boolean) => {
        return new Promise((resolve, reject) => {
            if (upload) {
                NetWorkApi<GetOnlineHotPatchTemplateRequest, API.HotPatchTemplateResponse>({
                    method: "get",
                    url: "hot/patch/template",
                    data: {
                        page: 1,
                        limit: 1000,
                        type: type,
                        name: item.name
                    }
                })
                    .then((res) => {
                        const d = res.data || []
                        if (d.length) {
                            setHotCodeTempVisible(false)
                            sameNameHintInfoRef.current = {
                                title: "同名覆盖提示",
                                content: "线上有同名模板，上传会覆盖，确定上传吗？",
                                onOk: () => {
                                    resolve(true)
                                },
                                onCancel: () => {
                                    reject("线上存在同名模板")
                                }
                            }
                            setSameNameHint(true)
                        } else {
                            resolve(false)
                        }
                    })
                    .catch((err) => {
                        yakitNotify("error", "查询热加载模板名线上是否存在失败：" + err)
                    })
            } else {
                const index = hotPatchTempLocal.findIndex((i) => i.name === item.name)
                if (index !== -1) {
                    setHotCodeTempVisible(false)
                    sameNameHintInfoRef.current = {
                        title: "同名覆盖提示",
                        content: "本地有同名模板，下载会覆盖，确定下载吗？",
                        onOk: () => {
                            resolve(true)
                        },
                        onCancel: () => {
                            reject("本地存在同名模板")
                        }
                    }
                    setSameNameHint(true)
                } else {
                    resolve(false)
                }
            }
        })
    }

    const uploadHotPatchTemplateToOnline = (item: HotPatchTempItem) => {
        findHotPatchTemplate(item, true)
            .then(() => {
                ipcRenderer
                    .invoke("UploadHotPatchTemplateToOnline", {
                        Type: type,
                        Token: userInfo.token,
                        Name: item.name
                    })
                    .then((res) => {
                        yakitNotify("success", "上传成功")
                    })
                    .catch((error) => {
                        yakitNotify("error", "上传失败：" + error)
                    })
            })
            .catch(() => {})
    }

    const downloadHotPatchTemplate = (item: HotPatchTempItem) => {
        findHotPatchTemplate(item, false)
            .then((r) => {
                ipcRenderer
                    .invoke("DownloadHotPatchTemplate", {
                        Type: type,
                        Name: item.name
                    })
                    .then((res) => {
                        if (r) {
                            // 手动删除本地数据，这里不需要删掉数据库里面的
                            onSetHotPatchTempLocal(hotPatchTempLocal.filter((i) => i.name !== item.name))
                        }
                        yakitNotify("success", "下载成功")
                    })
                    .catch((error) => {
                        yakitNotify("error", "下载失败：" + error)
                    })
            })
            .catch(() => {})
    }

    // admin、审核员 支持（本地上传，线上删除）
    const hasPermissions = useMemo(() => {
        const flag = ["admin", "auditor"].includes(userInfo.role || "")
        return flag
    }, [userInfo])

    const renderHotPatchTemp = useMemo(() => {
        if (tab === "local") return hotPatchTempLocal
        if (tab === "online") return hotPatchTempOnline
        return []
    }, [tab, hotPatchTempLocal, hotPatchTempOnline])

    const overlayCont = useMemo(() => {
        return (
            <div
                className={styles["hotCode-list"]}
                style={{
                    maxHeight: dropdown ? 380 : undefined,
                    padding: dropdown ? "4px 6px" : undefined,
                    height: dropdown ? undefined : "100%"
                }}
            >
                {isEnpriTrace() && (
                    <YakitRadioButtons
                        wrapClassName={styles["hotCode-tab-btns"]}
                        value={tab}
                        buttonStyle='solid'
                        options={[
                            {
                                value: "local",
                                label: "本地模板"
                            },
                            {
                                value: "online",
                                label: "线上模板"
                            }
                        ]}
                        onChange={(e) => {
                            setTab(e.target.value)
                        }}
                    />
                )}
                {renderHotPatchTemp.length ? (
                    <>
                        {renderHotPatchTemp.map((item) => (
                            <div className={styles["hotCode-item"]} key={item.name}>
                                <YakitPopover
                                    trigger='hover'
                                    placement='right'
                                    overlayClassName={styles["hotCode-popover"]}
                                    content={
                                        dropdown && <YakitEditor type={"yak"} value={viewCurHotCode} readOnly={true} />
                                    }
                                    onVisibleChange={(v) => {
                                        if (v) {
                                            onClickHotCodeName(item)
                                        }
                                    }}
                                    zIndex={9999}
                                >
                                    <YakitPopconfirm
                                        title={"是否确认覆盖当前热加载代码"}
                                        onConfirm={(e) => {
                                            onClickHotCodeName(item, true)
                                        }}
                                        placement='right'
                                        disabled={dropdown}
                                    >
                                        <div
                                            className={classNames(styles["hotCode-item-cont"])}
                                            onClick={() => {
                                                if (dropdown) {
                                                    onClickHotCodeName(item, true)
                                                }
                                            }}
                                        >
                                            <div
                                                className={classNames(styles["hotCode-item-name"], "content-ellipsis")}
                                                title={item.name}
                                            >
                                                {item.name}
                                            </div>
                                            <div className={styles["extra-opt-btns"]}>
                                                {/* 本地上传 */}
                                                {tab === "local" && !item.isDefault && hasPermissions && (
                                                    <YakitButton
                                                        icon={<OutlineClouduploadIcon />}
                                                        type='text2'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            uploadHotPatchTemplateToOnline(item)
                                                        }}
                                                    ></YakitButton>
                                                )}
                                                {/* 线上下载 */}
                                                {tab === "online" && (
                                                    <YakitButton
                                                        icon={<OutlineClouddownloadIcon />}
                                                        type='text2'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            downloadHotPatchTemplate(item)
                                                        }}
                                                    ></YakitButton>
                                                )}
                                                {/* 删除 */}
                                                {(tab === "local" && !item.isDefault) ||
                                                (tab === "online" && hasPermissions) ? (
                                                    <YakitButton
                                                        icon={<OutlineTrashIcon />}
                                                        type='text'
                                                        colors='danger'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            deleteHotPatchTemplate(item)
                                                        }}
                                                    ></YakitButton>
                                                ) : null}
                                            </div>
                                        </div>
                                    </YakitPopconfirm>
                                </YakitPopover>
                            </div>
                        ))}
                    </>
                ) : (
                    <YakitEmpty></YakitEmpty>
                )}
            </div>
        )
    }, [tab, renderHotPatchTemp, viewCurHotCode, hasPermissions, dropdown])

    return (
        <>
            {dropdown ? (
                <Dropdown
                    overlayStyle={{borderRadius: 4, width: 250}}
                    visible={hotCodeTempVisible}
                    onVisibleChange={(v) => {
                        setHotCodeTempVisible(v)
                    }}
                    trigger={["click"]}
                    overlay={overlayCont}
                >
                    <YakitButton type='text'>代码模板</YakitButton>
                </Dropdown>
            ) : (
                <div style={{width: 250}}>{overlayCont}</div>
            )}
            <YakitHint
                visible={sameNameHint}
                title={sameNameHintInfoRef.current.title}
                content={sameNameHintInfoRef.current.content}
                onOk={() => {
                    setSameNameHint(false)
                    sameNameHintInfoRef.current.onOk()
                }}
                onCancel={() => {
                    setSameNameHint(false)
                    sameNameHintInfoRef.current.onCancel()
                }}
            />
        </>
    )
})

interface HotPatchTemplate {
    Name: string
    Content: string
    Type: string
}
interface AddHotCodeTemplateProps {
    title?: string
    type: HotCodeType
    hotPatchTempLocal: HotPatchTempItem[]
    hotPatchCode: string
    visible: boolean
    onSetAddHotCodeTemplateVisible: (visible: boolean) => void
    onSaveHotCodeOk?: (tempName?: string) => void
}
export const AddHotCodeTemplate: React.FC<AddHotCodeTemplateProps> = React.memo((props) => {
    const {title = "保存热加载模板", type, hotPatchTempLocal, hotPatchCode, visible, onSetAddHotCodeTemplateVisible, onSaveHotCodeOk} = props
    const addHotPatchTempNameRef = useRef<string>("")

    const onCancel = useMemoizedFn(() => {
        addHotPatchTempNameRef.current = ""
        onSetAddHotCodeTemplateVisible(false)
    })

    const onOk = useMemoizedFn(() => {
        if (!addHotPatchTempNameRef.current) {
            yakitNotify("info", "热加载模板名为空")
            return
        }

        const index = hotPatchTempLocal.findIndex((item) => item.name === addHotPatchTempNameRef.current)
        if (index !== -1) {
            yakitNotify("info", "热加载模板名已存在")
            return
        }

        const params: HotPatchTemplate = {
            Type: type,
            Content: hotPatchCode,
            Name: addHotPatchTempNameRef.current
        }
        ipcRenderer
            .invoke("CreateHotPatchTemplate", params)
            .then((res) => {
                yakitNotify("success", "保存成功")
                onSaveHotCodeOk && onSaveHotCodeOk(addHotPatchTempNameRef.current)
                onSetAddHotCodeTemplateVisible(false)
                addHotPatchTempNameRef.current = ""
            })
            .catch((error) => {
                yakitNotify("error", error + "")
            })
    })

    return (
        <YakitModal
            visible={visible}
            title={title}
            width={400}
            onCancel={onCancel}
            okText='保存'
            onOk={onOk}
            destroyOnClose
            footer={null}
        >
            <div className={styles["hotCodeTemp-save"]}>
                <YakitInput.TextArea
                    placeholder='请为热加载模板取个名字...'
                    showCount
                    maxLength={50}
                    onChange={(e) => {
                        addHotPatchTempNameRef.current = e.target.value
                    }}
                />
                <div className={styles["btn-box"]}>
                    <YakitButton type='outline2' onClick={onCancel}>
                        取消
                    </YakitButton>
                    <YakitButton type='primary' onClick={onOk}>
                        保存
                    </YakitButton>
                </div>
            </div>
        </YakitModal>
    )
})
