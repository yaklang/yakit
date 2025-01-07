import React, {useEffect, useMemo, useRef, useState} from "react"
import {Dropdown, Form, Space} from "antd"
import {AutoCard} from "../../components/AutoCard"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useGetState, useMemoizedFn} from "ahooks"
import {RefreshIcon} from "@/assets/newIcon"
import {ExclamationCircleOutlined, FullscreenOutlined} from "@ant-design/icons/lib"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import styles from "./HTTPFuzzerHotPatch.module.scss"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {yakitNotify} from "@/utils/notification"
import {OutlineTrashIcon, OutlineXIcon} from "@/assets/icon/outline"
import {showYakitModal, YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
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
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
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

    useEffect(() => {
        getRemoteValue(FuzzerRemoteGV.HTTPFuzzerHotPatch_TEMPLATE_DEMO).then((e) => {
            if (!!e) {
                setParams({...params, Template: e})
            }
        })
        return () => {
            setRemoteValue(FuzzerRemoteGV.HTTPFuzzerHotPatch_TEMPLATE_DEMO, getParams().Template).then(() => {})
        }
    }, [])

    const onClose = useMemoizedFn(async () => {
        if (initWebFuzzerPageInfo().hotPatchCode !== params.HotPatchCode) {
            let m = YakitModalConfirm({
                width: 420,
                type: "white",
                onCancelText: "不保存",
                onOkText: "保存",
                icon: <ExclamationCircleOutlined />,
                style: {top: "20%"},
                onOk: () => {
                    props.onSaveCode(params.HotPatchCode)
                    props.onCancel()
                    m.destroy()
                },
                onCancel: () => {
                    props.onCancel()
                    m.destroy()
                },
                content: "是否保存修改的【热加载代码】"
            })
        } else {
            props.onCancel()
        }
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

                    props.onSaveCode(params.HotPatchCode)
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
                                    props.onSaveCode(params.HotPatchCode)
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
                                props.onSaveCode(HotPatchDefaultContent)
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
                        <div>
                            <HotCodeTemplate
                                type='fuzzer'
                                hotPatchTempLocal={hotPatchTempLocal}
                                onSetHotPatchTempLocal={setHotPatchTempLocal}
                                onClickHotCode={(temp) => {
                                    setParams({...getParams(), HotPatchCode: temp})
                                }}
                            ></HotCodeTemplate>
                        </div>
                    </Space>
                    <Space style={{lineHeight: "16px"}}>
                        <YakitButton
                            disabled={!params.HotPatchCode}
                            type='outline1'
                            onClick={() => setAddHotCodeTemplateVisible(true)}
                        >
                            保存模板
                        </YakitButton>
                        <AddHotCodeTemplate
                            type='fuzzer'
                            hotPatchTempLocal={hotPatchTempLocal}
                            hotPatchCode={params.HotPatchCode}
                            visible={addHotCodeTemplateVisible}
                            onSetAddHotCodeTemplateVisible={setAddHotCodeTemplateVisible}
                        ></AddHotCodeTemplate>
                        <YakitButton
                            type={"primary"}
                            onClick={() => {
                                try {
                                    props.onSaveCode(params.HotPatchCode)
                                    setTimeout(() => {
                                        yakitNotify("success", "保存成功")
                                    }, 100)
                                } catch (error) {
                                    yakitNotify("error", "保存失败:" + error)
                                }
                            }}
                        >
                            保存
                        </YakitButton>
                    </Space>
                </div>
                <Form.Item>
                    <div style={{height: hotPatchEditorHeight}}>
                        <YakitEditor
                            type='yak'
                            value={params.HotPatchCode}
                            setValue={(HotPatchCode) => setParams({...getParams(), HotPatchCode})}
                        ></YakitEditor>
                    </div>
                </Form.Item>
                <Form.Item help={"调试须知: 调试执行将会仅最多执行20秒 或 渲染 Payload 最多 300 条"}>
                    <YakitButton loading={loading} type='primary' htmlType='submit'>
                        调试执行
                    </YakitButton>
                </Form.Item>
            </Form>
        </div>
    )
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
    condition: HotPatchTemplateRequest
}

type HotCodeType = "fuzzer" | "mitm"
interface HotCodeTemplateProps {
    type: HotCodeType
    hotPatchTempLocal: HotPatchTempItem[]
    onSetHotPatchTempLocal: (hotPatchTempLocal: HotPatchTempItem[]) => void
    onClickHotCode: (temp: string) => void
}
export const HotCodeTemplate: React.FC<HotCodeTemplateProps> = React.memo((props) => {
    const {type, hotPatchTempLocal, onSetHotPatchTempLocal, onClickHotCode} = props
    const [hotCodeTempVisible, setHotCodeTempVisible] = useState<boolean>(false)
    const [tab, setTab] = useState<"local" | "online">("local")
    const [viewCurHotCode, setViewCurrHotCode] = useState<string>("")
    const [viewCurHotCodeVisible, setViewCurHotCodeVisible] = useState<boolean>(false)

    useEffect(() => {
        if (hotCodeTempVisible) {
            if (tab === "local") {
                ipcRenderer
                    .invoke("QueryHotPatchTemplateList", {
                        Type: type
                    })
                    .then((res: QueryHotPatchTemplateListResponse) => {
                        const nameArr = res.Name
                        const newHotPatchTempLocal = hotPatchTempLocal.slice()
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
            }
        }
    }, [hotCodeTempVisible, tab])

    const onClickHotCodeName = (item: HotPatchTempItem, click?: boolean) => {
        setViewCurrHotCode("")
        if (item.isDefault) {
            if (click) {
                onClickHotCode(item.temp)
            } else {
                setViewCurrHotCode(item.temp)
            }
            setHotCodeTempVisible(false)
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
                            onClickHotCode(res.Data[0].Content)
                        } else {
                            setViewCurrHotCode(res.Data[0].Content)
                        }
                        setHotCodeTempVisible(false)
                    })
                    .catch((error) => {
                        yakitNotify("error", error + "")
                    })
            } else {
            }
        }
    }

    const deleteHotPatchTemplate = (item: HotPatchTempItem) => {
        if (tab === "local") {
            const params: DeleteHotPatchTemplateRequest = {
                condition: {
                    Type: type,
                    Name: [item.name]
                }
            }
            ipcRenderer
                .invoke("DeleteHotPatchTemplate", params)
                .then((res: {Message: DbOperateMessage}) => {
                    onSetHotPatchTempLocal(hotPatchTempLocal.filter((i) => i.name !== item.name))
                    yakitNotify("success", "删除成功")
                })
                .catch((error) => {
                    yakitNotify("error", error + "")
                })
        } else {
        }
    }

    const renderHotPatchTemp = useMemo(() => {
        if (tab === "local") return hotPatchTempLocal
        return []
    }, [hotPatchTempLocal, tab])

    return (
        <Dropdown
            overlayStyle={{borderRadius: 4, width: 250}}
            onVisibleChange={(v) => {
                setHotCodeTempVisible(v)
            }}
            trigger={["click"]}
            overlay={
                <div className={styles["hotCode-list"]}>
                    {/* <YakitRadioButtons
                        wrapClassName={styles["hotCode-tab-btns"]}
                        value={tab}
                        buttonStyle='solid'
                        options={[
                            {
                                value: "local",
                                label: "本地模板"
                            }
                            {
                                value: "online",
                                label: "线上模板"
                            }
                        ]}
                        onChange={(e) => {
                            setTab(e.target.value)
                        }}
                    /> */}
                    {renderHotPatchTemp.map((item) => (
                        <div className={styles["hotCode-item"]} key={item.name}>
                            <YakitPopover
                                trigger='hover'
                                placement='right'
                                overlayClassName={styles["hotCode-popover"]}
                                content={
                                    <YakitSpin spinning={!viewCurHotCode}>
                                        <YakitEditor type={"yak"} value={viewCurHotCode} readOnly={true} />
                                    </YakitSpin>
                                }
                                onVisibleChange={(v) => {
                                    if (v) {
                                        onClickHotCodeName(item)
                                    }
                                }}
                                zIndex={9999}
                            >
                                <div
                                    className={classNames(styles["hotCode-item-cont"])}
                                    onClick={() => {
                                        onClickHotCodeName(item)
                                    }}
                                >
                                    <div
                                        className={classNames(styles["hotCode-item-name"], "content-ellipsis")}
                                        title={item.name}
                                    >
                                        {item.name}
                                    </div>
                                    <div className={styles["extra-opt-btns"]}>
                                        {false && (
                                            <YakitButton
                                                icon={<OutlineTrashIcon />}
                                                type='text2'
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                }}
                                            ></YakitButton>
                                        )}
                                        {!item.isDefault && (
                                            <YakitButton
                                                icon={<OutlineTrashIcon />}
                                                type='text'
                                                colors='danger'
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    deleteHotPatchTemplate(item)
                                                }}
                                            ></YakitButton>
                                        )}
                                    </div>
                                </div>
                            </YakitPopover>
                        </div>
                    ))}
                </div>
            }
        >
            <YakitButton type='text'>代码模板</YakitButton>
        </Dropdown>
    )
})

interface HotPatchTemplate {
    Name: string
    Content: string
    Type: string
}
interface AddHotCodeTemplateProps {
    type: HotCodeType
    hotPatchTempLocal: HotPatchTempItem[]
    hotPatchCode: string
    visible: boolean
    onSetAddHotCodeTemplateVisible: (visible: boolean) => void
}
export const AddHotCodeTemplate: React.FC<AddHotCodeTemplateProps> = React.memo((props) => {
    const {type, hotPatchTempLocal, hotPatchCode, visible, onSetAddHotCodeTemplateVisible} = props
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
                addHotPatchTempNameRef.current = ""
                onSetAddHotCodeTemplateVisible(false)
            })
            .catch((error) => {
                yakitNotify("error", error + "")
            })
    })

    return (
        <YakitModal
            visible={visible}
            title='保存热加载模板'
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
