import {memo, useEffect, useMemo, useRef, useState} from "react"
import {
    EditRuleDrawerProps,
    QuerySyntaxFlowRuleGroupRequest,
    LocalRuleGroupListProps,
    RuleImportExportModalProps,
    SyntaxFlowGroup,
    SyntaxFlowRuleInput,
    UpdateRuleToGroupProps,
    SyntaxFlowRuleFilter,
    UpdateSyntaxFlowRuleAndGroupRequest
} from "./RuleManagementType"
import {useCreation, useDebounceEffect, useDebounceFn, useMemoizedFn, useSize, useVirtualList} from "ahooks"
import {
    OutlineCloseIcon,
    OutlineClouduploadIcon,
    OutlineOpenIcon,
    OutlinePencilaltIcon,
    OutlinePluscircleIcon,
    OutlinePlusIcon,
    OutlineSearchIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {SolidFolderopenIcon, SolidPlayIcon} from "@/assets/icon/solid"
import {Form, InputRef, Tooltip} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {
    grpcCreateLocalRule,
    grpcCreateLocalRuleGroup,
    grpcDeleteLocalRuleGroup,
    grpcFetchLocalRuleGroupList,
    grpcFetchRulesForSameGroup,
    grpcUpdateLocalRule,
    grpcUpdateLocalRuleGroup,
    grpcUpdateRuleToGroup
} from "./api"
import cloneDeep from "lodash/cloneDeep"
import {v4 as uuidv4} from "uuid"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {PluginExecuteResult} from "../plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {CodeScanStreamInfo} from "../yakRunnerCodeScan/YakRunnerCodeScan"
import {
    SyntaxFlowScanExecuteState,
    SyntaxFlowScanRequest,
    SyntaxFlowScanResponse
} from "../yakRunnerCodeScan/YakRunnerCodeScanType"
import {yakitNotify} from "@/utils/notification"
import {apiSyntaxFlowScan} from "../yakRunnerCodeScan/utils"
import {randomString} from "@/utils/randomUtil"
import {HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {convertCardInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {SyntaxFlowMonacoSpec} from "@/utils/monacoSpec/syntaxflowEditor"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import {DefaultRuleContent, RuleLanguageList} from "@/defaultConstants/RuleManagement"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"

import classNames from "classnames"
import styles from "./RuleManagement.module.scss"

/** @name 规则组列表组件 */
export const LocalRuleGroupList: React.FC<LocalRuleGroupListProps> = memo((props) => {
    const {isrefresh, onGroupChange} = props

    const [data, setData] = useState<SyntaxFlowGroup[]>([])
    const groupLength = useMemo(() => {
        return data.length
    }, [data])

    const wrapperRef = useRef<HTMLDivElement>(null)
    const bodyRef = useRef<HTMLDivElement>(null)
    const [list] = useVirtualList(data, {
        containerTarget: wrapperRef,
        wrapperTarget: bodyRef,
        itemHeight: 40,
        overscan: 5
    })

    /** ---------- 获取数据 ---------- */
    const [loading, setLoading] = useState<boolean>(false)
    const fetchList = useMemoizedFn(() => {
        if (loading) return

        const request: QuerySyntaxFlowRuleGroupRequest = {Filter: {}}
        if (search.current) {
            request.Filter = {KeyWord: search.current || ""}
        }

        setLoading(true)
        grpcFetchLocalRuleGroupList(request)
            .then(({Group}) => {
                setData(Group || [])
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    useEffect(() => {
        fetchList()
    }, [isrefresh])

    // 搜索
    const search = useRef<string>("")
    const handleSearch = useDebounceFn(
        (val: string) => {
            search.current = val
            fetchList()
        },
        {wait: 200}
    ).run

    /** ---------- 多选逻辑 ---------- */
    const [select, setSelect] = useState<SyntaxFlowGroup[]>([])
    const selectGroups = useMemo(() => {
        // 这里的延时触发搜索由外层去控制
        onGroupChange(select.map((item) => item.GroupName))
        return select.map((item) => item.GroupName)
    }, [select])
    const handleSelect = useMemoizedFn((info: SyntaxFlowGroup) => {
        const isExist = select.includes(info)
        if (isExist) setSelect((arr) => arr.filter((item) => item.GroupName !== info.GroupName))
        else setSelect((arr) => [...arr, info])
    })

    // 更新数据
    const handleUpdateData = useMemoizedFn(
        (type: "modify" | "delete", info: SyntaxFlowGroup, newInfo?: SyntaxFlowGroup) => {
            if (type === "modify") {
                if (!newInfo) {
                    yakitNotify("error", "修改本地规则组名称错误")
                    return
                }
                setData((arr) => {
                    return arr.map((ele) => {
                        if (ele.GroupName === info.GroupName) return cloneDeep(newInfo)
                        return ele
                    })
                })
            }
            if (type === "delete") {
                setData((arr) => {
                    return arr.filter((ele) => ele.GroupName !== info.GroupName)
                })
            }
        }
    )

    /** ---------- 新建 ---------- */
    const [activeAdd, setActiveAdd] = useState<boolean>(false)
    const [groupName, setGroupName] = useState<string>("")
    const addInputRef = useRef<InputRef>(null)
    const handleAddGroup = useMemoizedFn(() => {
        if (activeAdd) return
        setGroupName("")
        setActiveAdd(true)
        setTimeout(() => {
            // 输入框聚焦
            addInputRef.current?.focus()
        }, 10)
    })
    const handleAddGroupBlur = useMemoizedFn(() => {
        if (!groupName) {
            setActiveAdd(false)
            setGroupName("")
            return
        }

        grpcCreateLocalRuleGroup({GroupName: groupName})
            .then(() => {
                setData((arr) => arr.concat({GroupName: groupName, Count: 0, IsBuildIn: false}))
                setTimeout(() => {
                    setActiveAdd(false)
                    setGroupName("")
                }, 200)
            })
            .catch(() => {})
    })

    /** ---------- 编辑 ---------- */
    const [editGroups, setEditGroup] = useState<string[]>([])
    const editInputRef = useRef<InputRef>(null)
    const [editInfo, setEditInfo] = useState<SyntaxFlowGroup>()
    const [editName, setEditName] = useState<string>("")
    const initEdit = useMemoizedFn(() => {
        setEditInfo(undefined)
        setEditName("")
    })
    const handleEdit = useMemoizedFn((info: SyntaxFlowGroup) => {
        const {GroupName, IsBuildIn} = info
        if (IsBuildIn) return
        const isExist = editGroups.includes(GroupName)
        if (isExist) return

        setEditInfo(info)
        setEditName(GroupName)
        setTimeout(() => {
            // 输入框聚焦
            editInputRef.current?.focus()
        }, 10)
    })
    const handleDoubleEditBlur = useMemoizedFn(() => {
        if (!editInfo || editInfo.GroupName === editName) {
            initEdit()
            return
        }

        setEditGroup((arr) => [...arr, editInfo.GroupName])
        grpcUpdateLocalRuleGroup({OldGroupName: editInfo.GroupName, NewGroupName: editName})
            .then(() => {
                // 改名后自动把选中里的该条去掉
                setSelect((arr) => arr.filter((item) => item.GroupName !== editInfo.GroupName))
                handleUpdateData("modify", editInfo, {...editInfo, GroupName: editName})
                initEdit()
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setEditGroup((arr) => arr.filter((ele) => ele !== editInfo.GroupName))
                }, 200)
            })
    })
    /** ---------- 上传 ---------- */
    // const [loadingUploadKeys, setLoadingUploadKeys] = useState<string[]>([])
    // const handleUpload = useMemoizedFn((info: number) => {
    //     const isExist = loadingUploadKeys.includes(`${info}`)
    //     if (isExist) return

    //     setLoadingUploadKeys((arr) => {
    //         return [...arr, `${info}`]
    //     })
    //     grpcDeleteRuleGroup({Key: info})
    //         .then(() => {
    //             handleUpdateData("delete", info)
    //         })
    //         .catch(() => {})
    //         .finally(() => {
    //             setTimeout(() => {
    //                 setLoadingUploadKeys((arr) => arr.filter((ele) => ele !== `${info}`))
    //             }, 200)
    //         })
    // })
    /** ---------- 删除 ---------- */
    const [loadingDelKeys, setLoadingDelKeys] = useState<string[]>([])
    const handleDelete = useMemoizedFn((info: SyntaxFlowGroup) => {
        const {GroupName, IsBuildIn} = info
        if (IsBuildIn) return
        const isExist = loadingDelKeys.includes(GroupName)
        if (isExist) return

        setLoadingDelKeys((arr) => {
            return [...arr, GroupName]
        })
        grpcDeleteLocalRuleGroup({Filter: {GroupNames: [GroupName]}})
            .then(() => {
                // 删除后自动把选中里的该条去掉
                setSelect((arr) => arr.filter((item) => item.GroupName !== info.GroupName))
                handleUpdateData("delete", info)
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setLoadingDelKeys((arr) => arr.filter((ele) => ele !== GroupName))
                }, 200)
            })
    })

    return (
        <div className={styles["rule-group-list"]}>
            <div className={styles["list-header"]}>
                <div className={styles["title-body"]}>
                    规则管理 <YakitRoundCornerTag>{groupLength}</YakitRoundCornerTag>
                </div>
                <YakitButton type='secondary2' icon={<OutlinePlusIcon />} onClick={handleAddGroup} />
            </div>

            <div className={styles["list-search"]}>
                <YakitInput.Search
                    size='large'
                    allowClear={true}
                    placeholder='请输入规则关键词'
                    onSearch={handleSearch}
                />
            </div>

            <div className={styles["list-container"]}>
                <YakitSpin spinning={loading}>
                    <div ref={wrapperRef} className={styles["list-body"]}>
                        <div ref={bodyRef}>
                            {list.map((item) => {
                                const {data} = item
                                const {GroupName: name, IsBuildIn} = data

                                const isCheck = selectGroups.includes(name)
                                const activeEdit = editInfo?.GroupName === name
                                const isEditLoading = editGroups.includes(name)
                                // const isUpload = loadingUploadKeys.includes(name)
                                const isDelLoading = loadingDelKeys.includes(name)

                                return (
                                    <div
                                        key={name}
                                        className={classNames(styles["list-local-opt"], {
                                            [styles["list-local-opt-active"]]: isCheck
                                        })}
                                        onClick={() => {
                                            handleSelect(data)
                                        }}
                                    >
                                        {activeEdit ? (
                                            <YakitInput
                                                ref={editInputRef}
                                                allowClear={true}
                                                showCount
                                                maxLength={50}
                                                value={editName}
                                                onChange={(e) => {
                                                    setEditName(e.target.value)
                                                }}
                                                onBlur={handleDoubleEditBlur}
                                                onPressEnter={handleDoubleEditBlur}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                }}
                                            />
                                        ) : (
                                            <>
                                                <div className={styles["info-wrapper"]}>
                                                    <YakitCheckbox
                                                        checked={isCheck}
                                                        onChange={() => {
                                                            handleSelect(data)
                                                        }}
                                                    />
                                                    <SolidFolderopenIcon />
                                                    <span className={styles["title-style"]}>{data.GroupName}</span>
                                                </div>

                                                <div className={styles["total-style"]}>{data.Count}</div>
                                                {!IsBuildIn && (
                                                    <div
                                                        className={styles["btns-wrapper"]}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                        }}
                                                    >
                                                        <YakitButton
                                                            type='secondary2'
                                                            icon={<OutlinePencilaltIcon />}
                                                            loading={isEditLoading}
                                                            onClick={() => {
                                                                handleEdit(data)
                                                            }}
                                                        />
                                                        {/* <YakitButton
                                                        type='secondary2'
                                                        icon={<OutlineClouduploadIcon />}
                                                        loading={isUpload}
                                                        onClick={() => {
                                                            handleUpload(data)
                                                        }}
                                                    /> */}
                                                        <YakitButton
                                                            type='secondary2'
                                                            colors='danger'
                                                            icon={<OutlineTrashIcon />}
                                                            loading={isDelLoading}
                                                            onClick={() => {
                                                                handleDelete(data)
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {activeAdd && (
                            <div
                                className={styles["list-add-input"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                            >
                                <YakitInput
                                    ref={addInputRef}
                                    showCount
                                    maxLength={50}
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    onBlur={handleAddGroupBlur}
                                    onPressEnter={handleAddGroupBlur}
                                />
                            </div>
                        )}
                    </div>
                </YakitSpin>
            </div>
        </div>
    )
})

/** @name 规则导入导出弹窗 */
export const RuleImportExportModal: React.FC<RuleImportExportModalProps> = memo((props) => {
    const {getContainer, width, visible, onCallback} = props

    const [form] = Form.useForm()

    const [localPluginPath, setLocalPluginPath] = useState<string>("")

    const onSubmit = useMemoizedFn(() => {})

    const onCancel = useMemoizedFn(() => {
        onCallback(false)
    })

    return (
        <YakitModal
            getContainer={getContainer}
            type='white'
            width={width}
            centered={true}
            keyboard={false}
            maskClosable={false}
            title={"导入/导出规则"}
            bodyStyle={{padding: 0}}
            visible={visible}
            onOk={onSubmit}
            onCancel={onCancel}
        >
            <div className={styles["rule-import-export-modal"]}>
                <div className={styles["export-hint"]}>
                    远程模式下导出后请打开~Yakit\yakit-projects\projects路径查看导出文件，文件名无需填写后缀
                </div>

                <div className={styles["import-hint"]}>
                    导入外部资源存在潜在风险，可能会被植入恶意代码或Payload，造成数据泄露、系统被入侵等严重后果。请务必谨慎考虑引入外部资源的必要性，并确保资源来源可信、内容安全。如果确实需要使用外部资源，建议优先选择官方发布的安全版本，或自行编写可控的数据源。同时，请保持系统和软件的最新版本，及时修复已知漏洞，做好日常安全防护。
                </div>

                <Form
                    form={form}
                    layout={"horizontal"}
                    labelCol={{span: 5}}
                    wrapperCol={{span: 18}}
                    onSubmitCapture={(e) => {
                        e.preventDefault()
                    }}
                >
                    <Form.Item
                        label={"文件名"}
                        rules={[{required: true, message: "请填写文件名"}]}
                        name={"OutputFilename"}
                    >
                        <YakitInput />
                    </Form.Item>

                    <YakitFormDragger
                        formItemProps={{
                            name: "localPluginPath",
                            label: "本地插件路径",
                            rules: [{required: true, message: "请输入本地插件路径"}]
                        }}
                        multiple={false}
                        selectType='file'
                        fileExtensionIsExist={false}
                        onChange={(val) => {
                            setLocalPluginPath(val)
                            form.setFieldsValue({localPluginPath: val})
                        }}
                        value={localPluginPath}
                    />

                    <Form.Item label={"密码"} name={"Password"}>
                        <YakitInput />
                    </Form.Item>
                </Form>
            </div>
        </YakitModal>
    )
})

/** @name 新建|编辑规则抽屉 */
export const EditRuleDrawer: React.FC<EditRuleDrawerProps> = memo((props) => {
    const {getContainer, info, visible, onCallback} = props

    const getContainerSize = useSize(getContainer)
    // 抽屉展示高度
    const showHeight = useMemo(() => {
        return getContainerSize?.height || 400
    }, [getContainerSize])

    const handleCancel = useMemoizedFn(() => {
        onCallback(false)
    })

    const isEdit = useMemo(() => !!info, [info])
    const isBuildInRule = useMemo(() => {
        if (!info) return false
        return !!info.IsBuildInRule
    }, [info])

    useEffect(() => {
        if (visible) {
            handleSearchGroup()
            if (info) {
                setContent(info.Content)
                form &&
                    form.setFieldsValue({
                        RuleName: info.RuleName || "",
                        GroupNames: info.GroupName || [],
                        Description: info.Description || "",
                        Language: info.Language
                    })
            }
            return () => {
                setExpand(true)
                setContent(DefaultRuleContent)
                setGroups([])
                if (form) form.resetFields()
            }
        }
    }, [visible])

    /** ---------- 展开|收起 Start ---------- */
    const [expand, setExpand] = useState<boolean>(true)
    const handleSetExpand = useMemoizedFn(() => {
        setExpand((val) => !val)
        setInfoTooltipShow(false)
        setCodeTooltipShow(false)
    })

    const [infoTooltipShow, setInfoTooltipShow] = useState<boolean>(false)
    const [codeTooltipShow, setCodeTooltipShow] = useState<boolean>(false)
    /** ---------- 展开|收起 End ---------- */

    /** ---------- 基础信息配置 Start ---------- */
    const [form] = Form.useForm()

    // 规则组列表
    const [groups, setGroups] = useState<{label: string; value: string}[]>([])
    const handleSearchGroup = useMemoizedFn(() => {
        grpcFetchLocalRuleGroupList({Filter: {}})
            .then(({Group}) => {
                setGroups(
                    Group?.map((item) => {
                        return {label: item.GroupName, value: item.GroupName}
                    }) || []
                )
            })
            .catch(() => {})
            .finally(() => {})
    })

    const [loading, setLoading] = useState<boolean>(false)
    // 触发新建|编辑接口
    const onSubmitApi = useMemoizedFn((request: SyntaxFlowRuleInput) => {
        setLoading(true)
        const api = isEdit ? grpcUpdateLocalRule : grpcCreateLocalRule
        console.log("api", JSON.stringify(request))
        api({SyntaxFlowInput: request})
            .then(({Rule}) => {
                onCallback(true, Rule)
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    // 获取表单数据
    const handleGetFormData = useMemoizedFn(() => {
        if (!form) return undefined
        const data = form.getFieldsValue()
        const info: SyntaxFlowRuleInput = {
            RuleName: data.RuleName || "",
            Content: content || "",
            Language: data.Language || "",
            GroupNames: Array.isArray(data.GroupNames) ? data.GroupNames : [],
            Description: data.Description || ""
        }
        return info
    })
    // 表单验证
    const handleFormSubmit = useMemoizedFn(() => {
        if (loading) return

        form.validateFields()
            .then(() => {
                const data = handleGetFormData()
                if (!data) {
                    yakitNotify("error", "未获取到表单信息，请关闭弹框重试!")
                    return
                }
                if (!data.RuleName || !data.Language || data.GroupNames.length === 0) {
                    yakitNotify("error", "请填写完整规则必须信息")
                    return
                }
                onSubmitApi(data)
            })
            .catch(() => {
                if (!expand) handleSetExpand()
            })
    })
    /** ---------- 基础信息配置 End ---------- */

    /** ---------- 规则源码 Start ---------- */
    const [content, setContent] = useState<string>(DefaultRuleContent)
    /** ---------- 规则源码 End ---------- */

    /** ---------- 规则代码|调试 Start ---------- */
    const [activeTab, setActiveTab] = useState<"code" | "debug">("code")

    const [debugForm] = Form.useForm()
    const token = useRef<string>(randomString(20))

    const [pauseLoading, setPauseLoading] = useState<boolean>(false)
    const [continueLoading, setContinueLoading] = useState<boolean>(false)
    const [progressList, setProgressList] = useState<StreamResult.Progress[]>([])
    // logs
    let messages = useRef<StreamResult.Message[]>([])

    /** 放入日志队列 */
    const pushLogs = useMemoizedFn((log: StreamResult.Message) => {
        messages.current.unshift({...log, content: {...log.content, id: uuidv4()}})
        // 只缓存 100 条结果（日志类型 + 数据类型）
        if (messages.current.length > 100) {
            messages.current.pop()
        }
    })
    // card
    let cardKVPair = useRef<Map<string, HoldGRPCStreamProps.CacheCard>>(
        new Map<string, HoldGRPCStreamProps.CacheCard>()
    )

    /** 判断是否为无效数据 */
    const checkStreamValidity = useMemoizedFn((stream: StreamResult.Log) => {
        try {
            const check = JSON.parse(stream.data)
            if (check === "null" || !check || check === "undefined") return false
            return check
        } catch (e) {
            return false
        }
    })

    useEffect(() => {
        // let id = setInterval(() => {
        //     // logs
        //     const logs: StreamResult.Log[] = messages.current
        //         .filter((i) => i.type === "log")
        //         .map((i) => i.content as StreamResult.Log)
        //         .filter((i) => i.data !== "null")
        //     setStreamInfo({
        //         cardState: convertCardInfo(cardKVPair.current),
        //         logState: logs
        //     })
        // }, 200)
        // ipcRenderer.on(`${token}-data`, async (e: any, res: SyntaxFlowScanResponse) => {
        //     if (res) {
        //         const data = res.ExecResult
        //         if (!!res.Status) {
        //             switch (res.Status) {
        //                 case "done":
        //                     setExecuteStatus("finished")
        //                     break
        //                 case "error":
        //                     setExecuteStatus("error")
        //                     break
        //                 case "executing":
        //                     setPauseLoading(false)
        //                     setContinueLoading(false)
        //                     setExecuteStatus("process")
        //                     break
        //                 case "paused":
        //                     setExecuteStatus("paused")
        //                     break
        //                 default:
        //                     break
        //             }
        //         }
        //         if (!!data?.RuntimeID) {
        //             setRuntimeId(data.RuntimeID)
        //         }
        //         if (data && data.IsMessage) {
        //             try {
        //                 let obj: StreamResult.Message = JSON.parse(Buffer.from(data.Message).toString())
        //                 if (obj.type === "progress") {
        //                     setProgressList([obj.content] as StreamResult.Progress[])
        //                     return
        //                 }
        //                 // feature-status-card-data 卡片展示
        //                 const logData = obj.content as StreamResult.Log
        //                 // feature-status-card-data 卡片展示
        //                 if (obj.type === "log" && logData.level === "feature-status-card-data") {
        //                     try {
        //                         const checkInfo = checkStreamValidity(logData)
        //                         if (!checkInfo) return
        //                         const obj: StreamResult.Card = checkInfo
        //                         const {id, data, tags} = obj
        //                         const {timestamp} = logData
        //                         const originData = cardKVPair.current.get(id)
        //                         if (originData && originData.Timestamp > timestamp) {
        //                             return
        //                         }
        //                         cardKVPair.current.set(id, {
        //                             Id: id,
        //                             Data: data,
        //                             Timestamp: timestamp,
        //                             Tags: Array.isArray(tags) ? tags : []
        //                         })
        //                     } catch (e) {}
        //                     return
        //                 }
        //                 pushLogs(obj)
        //             } catch (error) {}
        //         }
        //     }
        // })
        // ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
        //     setTimeout(() => {
        //         setExecuteStatus("error")
        //         setPauseLoading(false)
        //         setContinueLoading(false)
        //     }, 200)
        //     yakitNotify("error", `[Mod] flow-scan error: ${error}`)
        // })
        // ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
        //     yakitNotify("info", "[SyntaxFlowScan] finished")
        //     setTimeout(() => {
        //         setPauseLoading(false)
        //         setContinueLoading(false)
        //     }, 200)
        // })
        // return () => {
        //     ipcRenderer.invoke("cancel-ConvertPayloadGroupToDatabase", token)
        //     ipcRenderer.removeAllListeners(`${token}-data`)
        //     ipcRenderer.removeAllListeners(`${token}-error`)
        //     ipcRenderer.removeAllListeners(`${token}-end`)
        // }
        // return () => clearInterval(id)
    }, [])

    const handleStartExecute = useMemoizedFn(() => {
        if (!debugForm) {
            yakitNotify("error", "未获取到项目文件")
            return
        }
        debugForm
            .validateFields()
            .then((values) => {
                const {project} = values
                const params: SyntaxFlowScanRequest = {
                    ControlMode: "start",
                    ProgramName: [project],
                    Filter: {
                        RuleNames: [],
                        Language: [],
                        GroupNames: [],
                        Severity: [],
                        Purpose: [],
                        Tag: [],
                        Keyword: ""
                    }
                }
                apiSyntaxFlowScan(params, token.current).then(() => {
                    setExecuteStatus("process")
                })
            })
            .catch(() => {})
    })
    /** ---------- 规则代码|调试 End ---------- */

    /** ---------- 调试逻辑 Start ---------- */
    const [runtimeId, setRuntimeId] = useState<string>("")
    const [executeStatus, setExecuteStatus] = useState<SyntaxFlowScanExecuteState>("default")
    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        if (executeStatus === "paused") return true
        return false
    }, [executeStatus])

    const isShowResult = useCreation(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])

    const [streamInfo, setStreamInfo] = useState<CodeScanStreamInfo>({
        cardState: [],
        logState: []
    })
    /** ---------- 调试逻辑 End ---------- */

    return (
        <YakitDrawer
            getContainer={getContainer}
            placement='bottom'
            mask={false}
            closable={false}
            keyboard={false}
            className={styles["edit-rule-drawer"]}
            bodyStyle={{padding: 0}}
            height={showHeight}
            title={"新建规则"}
            extra={
                <div className={styles["drawer-extra"]}>
                    {!isBuildInRule && (
                        <>
                            <YakitButton loading={loading} onClick={handleFormSubmit}>
                                保存
                            </YakitButton>
                            <div className={styles["divider-style"]}></div>
                        </>
                    )}
                    <YakitButton type='text2' icon={<OutlineXIcon />} onClick={handleCancel} />
                </div>
            }
            visible={visible}
        >
            <div className={styles["drawer-body"]}>
                {/* 基础信息 */}
                <div
                    className={classNames(styles["rule-info"], {
                        [styles["rule-info-show"]]: expand,
                        [styles["rule-info-hidden"]]: !expand
                    })}
                >
                    <div className={styles["info-header"]}>
                        <div className={styles["header-title"]}>基础信息</div>
                        <Tooltip title='收起基础信息' visible={infoTooltipShow} onVisibleChange={setInfoTooltipShow}>
                            <YakitButton type='text2' icon={<OutlineCloseIcon />} onClick={handleSetExpand} />
                        </Tooltip>
                    </div>

                    <div className={styles["info-setting"]}>
                        <Form layout='vertical' form={form} className={styles["info-setting-form"]}>
                            <Form.Item
                                label={
                                    <>
                                        规则名<span className='form-item-required'>*</span>:
                                    </>
                                }
                                name={"RuleName"}
                                rules={[{required: true, message: "规则名必填"}]}
                            >
                                <YakitInput placeholder='请输入规则名' disabled={isEdit || isBuildInRule} />
                            </Form.Item>

                            <Form.Item
                                label={
                                    <>
                                        所属分组<span className='form-item-required'>*</span>:
                                    </>
                                }
                                name={"GroupNames"}
                                rules={[{required: true, message: "分组必填"}]}
                            >
                                <YakitSelect
                                    mode='tags'
                                    placeholder='请选择分组'
                                    disabled={isBuildInRule}
                                    options={groups}
                                />
                            </Form.Item>

                            <Form.Item label={"描述"} name={"Description"}>
                                <YakitInput.TextArea
                                    disabled={isBuildInRule}
                                    isShowResize={false}
                                    autoSize={{minRows: 2, maxRows: 4}}
                                />
                            </Form.Item>

                            <Form.Item
                                label={
                                    <>
                                        语言<span className='form-item-required'>*</span>:
                                    </>
                                }
                                name={"Language"}
                                rules={[{required: true, message: "语言必填"}]}
                            >
                                <YakitSelect
                                    allowClear
                                    size='large'
                                    disabled={isBuildInRule}
                                    options={RuleLanguageList}
                                />
                            </Form.Item>
                        </Form>
                    </div>
                </div>

                <div className={styles["rule-code"]}>
                    <div className={styles["code-header"]}>
                        <div className={styles["header-tab"]}>
                            {!expand && (
                                <Tooltip
                                    placement='topLeft'
                                    title='展开基础信息'
                                    visible={codeTooltipShow}
                                    onVisibleChange={setCodeTooltipShow}
                                >
                                    <YakitButton type='text2' icon={<OutlineOpenIcon />} onClick={handleSetExpand} />
                                </Tooltip>
                            )}

                            <YakitRadioButtons
                                buttonStyle='solid'
                                value={activeTab}
                                options={[
                                    {value: "code", label: "规则内容"},
                                    {value: "debug", label: "执行结果"}
                                ]}
                                onChange={(e) => setActiveTab(e.target.value)}
                            />
                        </div>

                        {false ? (
                            <YakitButton danger onClick={() => {}}>
                                停止
                            </YakitButton>
                        ) : (
                            <YakitButton icon={<SolidPlayIcon />} onClick={() => {}}>
                                执行
                            </YakitButton>
                        )}
                    </div>

                    <div className={styles["code-body"]}>
                        <div
                            tabIndex={activeTab === "code" ? 1 : -1}
                            className={classNames(styles["tab-pane-show"], {
                                [styles["tab-pane-hidden"]]: activeTab !== "code"
                            })}
                        >
                            <div className={styles["tab-pane-code"]}>
                                <div className={styles["code-editor"]}>
                                    <YakitEditor
                                        readOnly={isBuildInRule}
                                        type={SyntaxFlowMonacoSpec}
                                        value={content}
                                        setValue={setContent}
                                    />
                                </div>

                                <div className={styles["code-params"]}>
                                    <div className={styles["params-header"]}>
                                        <span className={styles["header-title"]}>参数配置</span>
                                    </div>

                                    <div className={styles["params-container"]}>
                                        <Form form={debugForm} className={styles["params-form"]}>
                                            <Form.Item label={"项目名称"} name={"porject"}>
                                                <YakitSelect />
                                            </Form.Item>
                                        </Form>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            tabIndex={activeTab === "debug" ? 1 : -1}
                            className={classNames(styles["tab-pane-show"], {
                                [styles["tab-pane-hidden"]]: activeTab !== "debug"
                            })}
                        >
                            {isShowResult && (
                                <PluginExecuteResult
                                    streamInfo={{
                                        progressState: [],
                                        cardState: streamInfo.cardState,
                                        tabsState: [
                                            {tabName: "审计结果", type: "result"},
                                            {tabName: "漏洞与风险", type: "risk"},
                                            {tabName: "日志", type: "log"},
                                            {tabName: "Console", type: "console"}
                                        ],
                                        logState: streamInfo.logState,
                                        tabsInfoState: {},
                                        riskState: []
                                    }}
                                    runtimeId={runtimeId}
                                    loading={isExecuting}
                                    defaultActiveKey={undefined}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </YakitDrawer>
    )
})

/** 扩展定义-SyntaxFlowGroup，前端逻辑需要 */
interface FrontSyntaxFlowGroup extends SyntaxFlowGroup {
    /** 是否为新建组 */
    isCreate: boolean
}
/** @name 规则添加分组 */
export const UpdateRuleToGroup: React.FC<UpdateRuleToGroupProps> = memo((props) => {
    const {allCheck, rules, filters, callback} = props

    /** 添加分组按钮是否可用 */
    const isActive = useMemo(() => {
        if (allCheck) return true
        return !!rules.length
    }, [allCheck, rules])
    // 生成规则的请求参数
    const ruleRequest = useMemoizedFn(() => {
        if (allCheck) return cloneDeep(filters)
        else return {RuleNames: (rules || []).map((item) => item.RuleName)} as SyntaxFlowRuleFilter
    })

    // 规则所属组交集
    const [oldGroup, setOldGroup, getOldGroup] = useGetSetState<FrontSyntaxFlowGroup[]>([])
    // 全部规则组
    const allGroup = useRef<FrontSyntaxFlowGroup[]>([])
    // 可选规则组
    const [showGroup, setShowGroup] = useState<FrontSyntaxFlowGroup[]>([])
    // 搜索内容
    const [search, setSearch] = useState<string>("")

    // 新加规则组
    const [addGroup, setAddGroup] = useState<FrontSyntaxFlowGroup[]>([])
    // 移除规则组
    const [removeGroup, setRemoveGroup] = useState<FrontSyntaxFlowGroup[]>([])

    /** ---------- 获取规则所属组交集、全部规则组-逻辑 Start ---------- */
    const getFilter = useMemoizedFn(() => {
        return cloneDeep(filters)
    })
    useDebounceEffect(
        () => {
            if (!allCheck && rules.length === 0) {
                setOldGroup([])
                return
            }

            let request: SyntaxFlowRuleFilter = {}
            if (allCheck) request = getFilter() || {}
            else request.RuleNames = rules.map((item) => item.RuleName)

            grpcFetchRulesForSameGroup({Filter: request})
                .then(({Group}) => {
                    setOldGroup(
                        (Group || []).map((item) => ({
                            ...item,
                            isCreate: false
                        }))
                    )
                })
                .catch(() => {
                    setOldGroup([])
                })
        },
        [allCheck, rules],
        {wait: 300}
    )

    // 新加规则组popover
    const [addGroupVisible, setAddGroupVisible] = useState<boolean>(false)
    const handleAddGroupVisibleChange = useMemoizedFn((visible: boolean) => {
        setAddGroupVisible(visible)
    })

    const loading = useRef<boolean>(false)
    const handleReset = useMemoizedFn(() => {
        setRemoveGroup([])
        setAddGroup([])
    })
    useEffect(() => {
        if (addGroupVisible) {
            setRemoveGroup([...getOldGroup()])
            if (loading.current) return
            loading.current = true
            grpcFetchLocalRuleGroupList({Filter: {}})
                .then(({Group}) => {
                    const groups = (Group || []).map((item) => ({...item, isCreate: false}))
                    allGroup.current = groups
                    setShowGroup(allGroup.current)
                })
                .catch(() => {})
                .finally(() => {
                    loading.current = false
                })

            return () => {
                handleReset()
            }
        }
    }, [addGroupVisible])
    /** ---------- 获取规则所属组交集、全部规则组-逻辑 End ---------- */

    /** ---------- 移除旧规则组 Start ---------- */
    const delGroups = useRef<string[]>([])
    // 单个
    const handleSingleRemove = useMemoizedFn((info: FrontSyntaxFlowGroup) => {
        if (!info) return
        const isExist = delGroups.current.includes(info.GroupName)
        if (isExist) return

        delGroups.current = [...delGroups.current, info.GroupName]
        const request: UpdateSyntaxFlowRuleAndGroupRequest = {
            Filter: ruleRequest(),
            AddGroups: [],
            RemoveGroups: [info.GroupName]
        }
        grpcUpdateRuleToGroup(request)
            .then(() => {
                setOldGroup((groups) => groups.filter((item) => item.GroupName !== info.GroupName))
                callback()
            })
            .catch(() => {})
            .finally(() => {
                delGroups.current = delGroups.current.filter((item) => item !== info.GroupName)
            })
    })

    // 批量
    const handleAllRemove = useMemoizedFn(() => {
        const request: UpdateSyntaxFlowRuleAndGroupRequest = {
            Filter: ruleRequest(),
            AddGroups: [],
            RemoveGroups: oldGroup.map((item) => item.GroupName)
        }
        grpcUpdateRuleToGroup(request)
            .then(() => {
                callback()
                setOldGroup([])
            })
            .catch(() => {})
    })
    /** ---------- 移除旧规则组 End ---------- */

    /** ---------- 新增规则组逻辑 Start ---------- */
    useDebounceEffect(
        () => {
            setShowGroup(allGroup.current.filter((item) => item.GroupName.indexOf(search || "") > -1))
        },
        [search],
        {wait: 300}
    )

    // 新建一条规则组
    const handleCreateGroup = useMemoizedFn((name: string) => {
        const group: FrontSyntaxFlowGroup = {
            GroupName: name,
            Count: 0,
            IsBuildIn: false,
            isCreate: true
        }
        setAddGroup((arr) => [...arr, group])
        allGroup.current = [group, ...allGroup.current]
        setShowGroup((arr) => [group, ...arr])
    })

    const handleSearchEnter = useMemoizedFn(() => {
        if (showGroup.length > 0) return
        handleCreateGroup(search)
        setSearch("")
    })
    const handleCheckboxCreate = useMemoizedFn(() => {
        if (showGroup.length > 0) return
        handleCreateGroup(search)
        setSearch("")
    })

    const handleCheck = useMemoizedFn((checked: boolean, info: FrontSyntaxFlowGroup) => {
        if (checked) {
            // 判断规则组是否属于已经存在于交集的规则组
            const isExist = oldGroup.findIndex((item) => item.GroupName === info.GroupName) > -1
            const setHooks = isExist ? setRemoveGroup : setAddGroup
            setHooks((arr) => [...arr, info])
            return
        } else {
            const isExistRemove = removeGroup.findIndex((item) => item.GroupName === info.GroupName) > -1
            const setHooks = isExistRemove ? setRemoveGroup : setAddGroup
            setHooks((arr) => arr.filter((item) => item.GroupName !== info.GroupName))
            if (!isExistRemove && info.isCreate) {
                // 新建的规则组在取消勾选后要从列表中移除
                allGroup.current = allGroup.current.filter((item) => item.GroupName !== info.GroupName)
                setShowGroup((arr) => arr.filter((item) => item.GroupName !== info.GroupName))
            }
        }
    })

    const [submitLoading, setSubmitLoading] = useState<boolean>(false)
    const handleSubmit = useMemoizedFn(() => {
        if (submitLoading) return

        const request: UpdateSyntaxFlowRuleAndGroupRequest = {
            Filter: ruleRequest(),
            AddGroups: [],
            RemoveGroups: []
        }
        request.RemoveGroups = oldGroup
            .filter((item) => removeGroup.findIndex((i) => i.GroupName === item.GroupName) === -1)
            .map((item) => item.GroupName)
        request.AddGroups = addGroup.map((item) => item.GroupName)

        setSubmitLoading(true)
        grpcUpdateRuleToGroup(request)
            .then(() => {
                callback()
                handelCancel()
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setSubmitLoading(false)
                }, 300)
            })
    })

    const handelCancel = useMemoizedFn(() => {
        setAddGroupVisible(false)
    })
    /** ---------- 新增规则组逻辑 End ---------- */

    return (
        <div className={styles["update-rule-to-group"]}>
            {oldGroup.length > 0 && (
                <div className={styles["group-tags"]}>
                    {oldGroup.length <= 2 ? (
                        oldGroup.map((item) => {
                            return (
                                <YakitTag
                                    key={item.GroupName}
                                    color='info'
                                    closable
                                    onClose={() => {
                                        handleSingleRemove(item)
                                    }}
                                >
                                    {item.GroupName}
                                </YakitTag>
                            )
                        })
                    ) : (
                        <YakitPopover
                            overlayClassName={styles["rule-group-intersection-popover"]}
                            content={
                                <div className={styles["rule-group-intersection"]}>
                                    {oldGroup.map((item) => {
                                        return (
                                            <Tooltip key={item.GroupName} placement='top' title={item.GroupName}>
                                                <YakitTag
                                                    key={item.GroupName}
                                                    color='info'
                                                    closable
                                                    onClose={() => {
                                                        handleSingleRemove(item)
                                                    }}
                                                >
                                                    {item.GroupName}
                                                </YakitTag>
                                            </Tooltip>
                                        )
                                    })}
                                </div>
                            }
                            trigger='hover'
                            placement='bottom'
                        >
                            <YakitTag closable onClose={handleAllRemove}>
                                规则组{oldGroup.length}
                            </YakitTag>
                        </YakitPopover>
                    )}
                </div>
            )}

            <YakitPopover
                overlayClassName={styles["add-and-remove-group-popover"]}
                visible={addGroupVisible}
                placement='bottomRight'
                trigger='click'
                content={
                    <div className={styles["add-and-remove-group"]}>
                        <div className={styles["search-header"]}>
                            勾选表示加入组，取消勾选则表示移出组，创建新分组直接在输入框输入名称回车即可。
                        </div>
                        <div className={styles["search-input"]}>
                            <YakitInput
                                placeholder='输入关键字...'
                                prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                                value={search}
                                allowClear={true}
                                onChange={(e) => {
                                    const val = e.target.value.trim()
                                    setSearch(val)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.stopPropagation()
                                        handleSearchEnter()
                                    }
                                }}
                            />
                        </div>
                        <div className={styles["group-list"]}>
                            {showGroup.length === 0 && search && (
                                <div className={styles["group-list-item"]}>
                                    <YakitCheckbox onChange={handleCheckboxCreate} />
                                    <span className={styles["title-style"]}>新增分组"{search}"</span>
                                </div>
                            )}
                            {showGroup.map((item) => {
                                const {GroupName} = item
                                const isCheck =
                                    [...addGroup, ...removeGroup].findIndex((item) => item.GroupName === GroupName) > -1
                                return (
                                    <div key={item.GroupName} className={styles["group-list-item"]}>
                                        <YakitCheckbox
                                            checked={isCheck}
                                            onChange={(e) => {
                                                handleCheck(e.target.checked, item)
                                            }}
                                        />
                                        <span className={styles["title-style"]}>{item.GroupName}</span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className={styles["group-footer"]}>
                            <div className={styles["group-footer-btns"]}>
                                <YakitButton type='outline2' onClick={handelCancel}>
                                    取消
                                </YakitButton>
                                <YakitButton loading={submitLoading} onClick={handleSubmit}>
                                    确认
                                </YakitButton>
                            </div>
                        </div>
                    </div>
                }
                onVisibleChange={handleAddGroupVisibleChange}
            >
                <YakitButton type='text' disabled={!isActive} icon={<OutlinePluscircleIcon />}>
                    {oldGroup.length ? undefined : "添加分组"}
                </YakitButton>
            </YakitPopover>
        </div>
    )
})
