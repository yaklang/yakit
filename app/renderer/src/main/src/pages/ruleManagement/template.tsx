import React, {memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    EditRuleDrawerProps,
    QuerySyntaxFlowRuleGroupRequest,
    LocalRuleGroupListProps,
    RuleImportExportModalProps,
    SyntaxFlowGroup,
    SyntaxFlowRuleInput,
    UpdateRuleToGroupProps,
    SyntaxFlowRuleFilter,
    UpdateSyntaxFlowRuleAndGroupRequest,
    RuleDebugAuditDetailProps,
    RuleDebugAuditListProps,
    RuleUploadAndDownloadModalProps,
    OnlineRuleGroupListProps,
    AlertMessage,
    SyntaxFlowRuleOnlineProgress,
    RelatedHoleListProps
} from "./RuleManagementType"
import {useDebounceEffect, useDebounceFn, useMap, useMemoizedFn, useSize, useUpdateEffect, useVirtualList} from "ahooks"
import {
    OutlineCloseIcon,
    OutlineClouddownloadIcon,
    OutlineClouduploadIcon,
    OutlineExclamationcircleIcon,
    OutlineExclamationIcon,
    OutlineLightbulbIcon,
    OutlineOpenIcon,
    OutlinePencilaltIcon,
    OutlinePluscircleIcon,
    OutlinePlusIcon,
    OutlineSearchIcon,
    OutlineSelectorIcon,
    OutlineTrashIcon,
    OutlineXIcon,
    OutlineReplyIcon
} from "@/assets/icon/outline"
import {
    SolidCheckIcon,
    SolidClouddownloadIcon,
    SolidClouduploadIcon,
    SolidFolderopenIcon,
    SolidReplyIcon
} from "@/assets/icon/solid"
import {Descriptions, Form, InputRef, Modal, Progress, Tooltip} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {
    grpcCreateLocalRule,
    grpcCreateLocalRuleGroup,
    grpcDeleteLocalRuleGroup,
    grpcDownloadSyntaxFlowRule,
    grpcFetchLocalRuleGroupList,
    grpcFetchRulesForSameGroup,
    grpcSyntaxFlowRuleToOnline,
    grpcUpdateLocalRule,
    grpcUpdateLocalRuleGroup,
    grpcUpdateRuleToGroup,
    httpDeleteOnlineRuleGroup,
    httpFetchOnlineRuleGroupList
} from "./api"
import cloneDeep from "lodash/cloneDeep"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {failed, yakitNotify} from "@/utils/notification"
import {SyntaxFlowMonacoSpec} from "@/utils/monacoSpec/syntaxflowEditor"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import {DefaultRuleContent, DefaultRuleGroupFilterPageMeta, RuleLanguageList} from "@/defaultConstants/RuleManagement"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {genDefaultPagination, QueryGeneralResponse} from "../invoker/schema"
import {
    AuditNodeMapProps,
    AuditNodeProps,
    AuditYakUrlProps,
    SSAProgramResponse
} from "../yakRunnerAuditCode/AuditCode/AuditCodeType"
import {randomString} from "@/utils/randomUtil"
import {PluginExecuteResult} from "../plugins/operator/pluginExecuteResult/PluginExecuteResult"
import useRuleDebug from "./useRuleDebug"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {PluginExecuteProgress} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {HoldGRPCStreamProps} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {SyntaxFlowResult} from "../yakRunnerCodeScan/YakRunnerCodeScanType"
import {AuditTree} from "../yakRunnerAuditCode/AuditCode/AuditCode"
import {loadAuditFromYakURLRaw} from "../yakRunnerAuditCode/utils"
import {v4 as uuidv4} from "uuid"
import {AuditEmiterYakUrlProps} from "../yakRunnerAuditCode/YakRunnerAuditCodeType"
import {RightAuditDetail} from "../yakRunnerAuditCode/RightAuditDetail/RightAuditDetail"
import {RightBugAuditResult, SeverityMapTag} from "../risks/YakitRiskTable/YakitRiskTable"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import NoPermissions from "@/assets/no_permissions.png"
import {API} from "@/services/swagger/resposeType"
import Login from "../Login"
import {isEnpriTraceIRify} from "@/utils/envfile"

import classNames from "classnames"
import styles from "./RuleManagement.module.scss"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {CodeScoreModal} from "../plugins/funcTemplate"
import {MilkdownEditor} from "@/components/MilkdownEditor/MilkdownEditor"
import {EditorMilkdownProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import {QuerySSARisksResponse, SSARisk} from "../yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"
const {YakitPanel} = YakitCollapse

const {ipcRenderer} = window.require("electron")

const severityOrder = ["critical", "high", "middle", "low", "info"]

const AuditCodeDetailTopId = "top-message-code-scan"

/** @name 规则组列表组件 */
export const LocalRuleGroupList: React.FC<LocalRuleGroupListProps> = memo(
    React.forwardRef((props, ref) => {
        const {isrefresh, onGroupChange, currentPageTabRouteKey, canUpload, userInfo, onRefreshOnlienRuleManagement} =
            props

        useImperativeHandle(ref, () => ({
            handleReset
        }))

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

            const request: QuerySyntaxFlowRuleGroupRequest = {Pagination: DefaultRuleGroupFilterPageMeta, Filter: {}}
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
            return select.map((item) => item.GroupName)
        }, [select])
        useUpdateEffect(() => {
            // 这里的延时触发搜索由外层去控制
            onGroupChange(select.map((item) => item.GroupName))
        }, [select])
        const handleSelect = useMemoizedFn((info: SyntaxFlowGroup) => {
            const isExist = select.find((el) => el.GroupName === info.GroupName)
            if (isExist) setSelect((arr) => arr.filter((item) => item.GroupName !== info.GroupName))
            else setSelect((arr) => [...arr, info])
        })
        const handleReset = useMemoizedFn(() => {
            setSelect([])
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
                    setData((arr) => [{GroupName: groupName, Count: 0, IsBuildIn: false}].concat([...arr]))
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
        const [uploadInfoVisible, setUploadInfoVisible] = useState<boolean>(false)
        const [uploadPercentShow, setUploadPercentShow] = useState<boolean>(false)
        const uploadTokenRef = useRef<string>(randomString(40))
        const uploadContainerRef = useRef<string>(currentPageTabRouteKey)
        const ruleGroupItemRef = useRef<SyntaxFlowGroup>()
        const handleUpload = useMemoizedFn(() => {
            if (ruleGroupItemRef.current) {
                uploadTokenRef.current = randomString(40)
                grpcSyntaxFlowRuleToOnline(
                    {Filter: {GroupNames: [ruleGroupItemRef.current.GroupName]}, Token: userInfo.token},
                    uploadTokenRef.current
                ).then((res) => {
                    setUploadInfoVisible(false)
                    uploadContainerRef.current = currentPageTabRouteKey
                    setUploadPercentShow(true)
                })
            }
        })

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
                    <div className={styles["header-extra"]}>
                        <YakitButton type='text' onClick={handleReset}>
                            重置
                        </YakitButton>
                        <YakitButton type='secondary2' icon={<OutlinePlusIcon />} onClick={handleAddGroup} />
                    </div>
                </div>

                <div className={styles["list-search-and-add"]}>
                    <YakitInput.Search size='large' placeholder='请输入组名' onSearch={handleSearch} />

                    {/* 新建规则组输入框 */}
                    <YakitInput
                        ref={addInputRef}
                        allowClear
                        wrapperClassName={activeAdd ? styles["show-add-input"] : styles["hidden-add-input"]}
                        showCount
                        maxLength={50}
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        onBlur={handleAddGroupBlur}
                        onPressEnter={handleAddGroupBlur}
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
                                                    showCount
                                                    maxLength={50}
                                                    value={editName}
                                                    allowClear
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
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <SolidFolderopenIcon />
                                                        <span
                                                            className={classNames(
                                                                styles["title-style"],
                                                                "yakit-content-single-ellipsis"
                                                            )}
                                                            title={data.GroupName}
                                                        >
                                                            {data.GroupName}
                                                        </span>
                                                    </div>

                                                    <div className={styles["total-style"]}>{data.Count}</div>
                                                    {!IsBuildIn ? (
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
                                                            {canUpload && (
                                                                <YakitButton
                                                                    type='secondary2'
                                                                    icon={<OutlineClouduploadIcon />}
                                                                    onClick={() => {
                                                                        ruleGroupItemRef.current = data
                                                                        setUploadInfoVisible(true)
                                                                    }}
                                                                />
                                                            )}
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
                                                    ) : (
                                                        <div
                                                            className={styles["btns-wrapper"]}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                            }}
                                                        >
                                                            {canUpload && (
                                                                <YakitButton
                                                                    type='secondary2'
                                                                    icon={<OutlineClouduploadIcon />}
                                                                    onClick={() => {
                                                                        ruleGroupItemRef.current = data
                                                                        setUploadInfoVisible(true)
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </YakitSpin>

                    {/* 上传 */}
                    <YakitHint
                        visible={uploadInfoVisible}
                        title='上传提示'
                        content='如果存在同名规则库，会直接覆盖'
                        okButtonText='确认上传'
                        mask={true}
                        onOk={() => {
                            handleUpload()
                        }}
                        onCancel={() => {
                            ruleGroupItemRef.current = undefined
                            setUploadInfoVisible(false)
                        }}
                    ></YakitHint>
                    {uploadPercentShow && (
                        <RuleUploadAndDownloadModal
                            getContainer={
                                document.getElementById(`main-operator-page-body-${uploadContainerRef.current}`) ||
                                undefined
                            }
                            type='upload'
                            apiKey='SyntaxFlowRuleToOnline'
                            token={uploadTokenRef.current}
                            onCancel={() => {
                                setUploadPercentShow(false)
                            }}
                            onSuccess={() => {
                                onRefreshOnlienRuleManagement()
                            }}
                        ></RuleUploadAndDownloadModal>
                    )}
                </div>
            </div>
        )
    })
)

type FilterUndefinedAndEmptyArray<T> = {
    [K in keyof T]: T[K] extends undefined | [] ? never : T[K]
}
// 转换规则导出筛选参数数据
export const transformFilterData = (filter: RuleImportExportModalProps["filterData"]) => {
    if (!filter.allCheck && Array.isArray(filter.RuleNames) && filter.RuleNames.length > 0) {
        return {RuleNames: filter.RuleNames}
    } else {
        return {
            Language: filter?.Language,
            GroupNames: filter?.GroupNames,
            Purpose: filter?.Purpose,
            Keyword: filter?.Keyword,
            FilterRuleKind: filter?.FilterRuleKind,
            FilterLibRuleKind: filter?.FilterLibRuleKind
        }
    }
}
export const cleanObject = <T extends Record<string, any>>(obj: T): Partial<FilterUndefinedAndEmptyArray<T>> =>
    Object.entries(obj).reduce<Partial<FilterUndefinedAndEmptyArray<T>>>((acc, [key, value]) => {
        if (value !== undefined && !(Array.isArray(value) && value.length === 0)) {
            acc[key as keyof T] = value as T[keyof T]
        }
        return acc
    }, {})

/** @name 新建|编辑规则抽屉 */
export const EditRuleDrawer: React.FC<EditRuleDrawerProps> = memo((props) => {
    const {getContainer, info, visible, onCallback} = props
    const alertMsgRef = useRef<{[key: string]: AlertMessage}>(info?.AlertMsg || {})
    const getContainerSize = useSize(getContainer)
    // 抽屉展示高度
    const showHeight = useMemo(() => {
        return getContainerSize?.height || 400
    }, [getContainerSize])

    const handleCancel = useMemoizedFn(() => {
        let isModify: boolean = false

        const formData = handleGetFormData()
        if (!formData) {
            yakitNotify("error", "未获取到表单信息，请关闭弹框重试!")
            return
        }
        if (isEdit) {
            isModify = content !== info?.Content
            isModify =
                isModify ||
                info?.RuleName !== formData.RuleName ||
                info?.Language !== formData.Language ||
                info?.Description !== formData.Description
            const oldFilters = (info?.GroupName || []).filter((item) => !formData.GroupNames.includes(item))
            const newFilters = formData.GroupNames.filter((item) => !(info?.GroupName || []).includes(item))
            isModify = isModify || oldFilters.length > 0 || newFilters.length > 0
        } else {
            isModify = DefaultRuleContent !== content
            isModify =
                isModify ||
                !!formData.RuleName ||
                !!formData.Language ||
                !!formData.Description ||
                formData.GroupNames.length > 0
        }

        if (isModify) {
            Modal.confirm({
                title: "温馨提示",
                icon: <OutlineExclamationcircleIcon />,
                content: "请问是否要保存规则并关闭弹框？",
                okText: "保存",
                cancelText: "不保存",
                closable: true,
                closeIcon: (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            Modal.destroyAll()
                        }}
                        className='modal-remove-icon'
                    >
                        <OutlineXIcon />
                    </div>
                ),
                onOk: () => {
                    handleFormSubmit()
                    Modal.destroyAll()
                },
                onCancel: () => {
                    onCallback(false)
                    Modal.destroyAll()
                },
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        } else {
            onCallback(false)
        }
    })

    const isEdit = useMemo(() => !!info, [info])
    // 是否为内置规则
    const isBuildInRule = useMemo(() => {
        if (!info) return false
        return !!info.IsBuildInRule
    }, [info])

    useEffect(() => {
        if (visible) {
            handleSearchGroup()
            handleFetchProject()
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
                // 重置基础信息
                setExpand(false)
                setGroups([])
                setActiveTab(undefined)
                setProject([])
                setContent(DefaultRuleContent)

                if (form) form.resetFields()
                if (debugForm) debugForm.resetFields()
                // 重置执行结果数据
                token.current = randomString(20)
                onReset()
                // 审计详情
                handleCancelDetail()
                // 重置审计结果表格数据
                setAuditData([])
            }
        }
    }, [visible])

    /** ---------- 展开|收起 Start ---------- */
    const [expand, setExpand] = useState<boolean>(false)
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
        grpcFetchLocalRuleGroupList({Pagination: DefaultRuleGroupFilterPageMeta, Filter: {}})
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
    const [groupSearch, setGroupSearch] = useState<string>("")
    const handleGroupSearchChange = useMemoizedFn((val: string) => {
        if (val.trim().length > 50) return
        setGroupSearch(val)
    })

    const [loading, setLoading] = useState<boolean>(false)
    // 触发新建|编辑接口
    const onSubmitApi = useMemoizedFn((request: SyntaxFlowRuleInput) => {
        setLoading(true)
        const api = isEdit ? grpcUpdateLocalRule : grpcCreateLocalRule
        console.log("提交数据", request)
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
            Description: data.Description || "",
            AlertMsg: alertMsgRef.current
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
                if (!data.RuleName || !data.Language) {
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

    // 规则源码
    const [content, setContent] = useState<string>(DefaultRuleContent)

    /** ---------- 规则代码调试 Start ---------- */
    const [activeTab, setActiveTab] = useState<"code" | "debug" | "hole">()

    useEffect(() => {
        visible && setActiveTab(info && Object.keys(info?.AlertMsg || {}).length > 0 ? "hole" : "code")
    }, [info, visible])

    const [debugForm] = Form.useForm()
    // 项目列表
    const [project, setProject] = useState<{label: string; value: string}[]>([])
    const projectLoading = useRef<boolean>(false)
    const handleFetchProject = useMemoizedFn((search?: string) => {
        if (projectLoading.current) return

        const request = {
            Filter: {Keyword: search || ""},
            Pagination: genDefaultPagination(100)
        }
        projectLoading.current = true
        ipcRenderer
            .invoke("QuerySSAPrograms", request)
            .then((res: QueryGeneralResponse<SSAProgramResponse>) => {
                if (!res || !Array.isArray(res.Data)) {
                    return
                }
                setProject(
                    res.Data.map((item) => {
                        return {label: item.Name, value: item.Name}
                    })
                )
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    projectLoading.current = false
                }, 200)
            })
    })
    const handleSearchProject = useDebounceFn(
        (val?: string) => {
            handleFetchProject(val)
        },
        {wait: 300}
    ).run

    const token = useRef<string>(randomString(20))
    const [{executeStatus, progress, runtimeId, streamInfo}, {onStart, onStop, onReset}] = useRuleDebug({
        token: token.current
    })

    // 是否正在执行中
    const isExecuting = useMemo(() => {
        if (executeStatus === "process") return true
        if (executeStatus === "paused") return true
        return false
    }, [executeStatus])
    // 是否显示执行结果
    const isShowResult = useMemo(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])

    const handleExecute = useMemoizedFn(async () => {
        try {
            await form.validateFields()
            const data = handleGetFormData()
            if (!data) {
                yakitNotify("error", "未获取到表单信息，请关闭弹框重试!")
                return
            }
            if (!data.RuleName || !data.Language) {
                yakitNotify("error", "请填写完整规则必须信息")
                return
            }

            debugForm
                .validateFields()
                .then((values) => {
                    const {project} = values || {}
                    if (!project || !Array.isArray(project)) {
                        return
                    }
                    setExpand(false)
                    if (activeTab !== "debug") setActiveTab("debug")
                    onStart({
                        ControlMode: "start",
                        ProgramName: cloneDeep(project),
                        RuleInput: data
                    })
                })
                .catch(() => {})
        } catch (error) {
            if (!expand) handleSetExpand()
        }
    })

    const handleStop = useMemoizedFn(() => {
        onStop()
    })

    // 审计结果表格数据
    const [auditData, setAuditData] = useState<SyntaxFlowResult[]>([])
    const handleUpdateAuditData = useMemoizedFn((data: SyntaxFlowResult[]) => {
        setAuditData(data)
    })
    /** ---------- 规则代码调试 End ---------- */

    /** ---------- 审计详情 Start ---------- */
    const auditInfo = useRef<SyntaxFlowResult>()
    const [auditDetailShow, setAuditDetailShow] = useState<boolean>(false)
    const handleShowDetail = useMemoizedFn((info: SyntaxFlowResult) => {
        if (auditDetailShow) return
        auditInfo.current = cloneDeep(info)
        setAuditDetailShow(true)
    })
    const handleCancelDetail = useMemoizedFn(() => {
        auditInfo.current = undefined
        setAuditDetailShow(false)
    })

    /** ---------- 审计详情 End ---------- */

    /** ---------- 代码评分 Start ---------- */
    const [scoreHint, setScoreHint] = useState<boolean>(false)
    const handleOpenScoreHint = useMemoizedFn(() => {
        if (scoreHint) return
        setScoreHint(true)
    })
    const handleScoreHintCallback = useMemoizedFn((value: boolean) => {
        if (!value) setScoreHint(false)
    })
    /** ---------- 代码评分 End ---------- */

    const getTabsState = useMemo(() => {
        const tabsState: HoldGRPCStreamProps.InfoTab[] = [
            {tabName: "漏洞与风险", type: "ssa-risk"},
            {tabName: "日志", type: "log"},
            {tabName: "Console", type: "console"}
        ]
        if (runtimeId) {
            return [
                {
                    tabName: "审计结果",
                    type: "result",
                    customProps: {onDetail: handleShowDetail, updateDataCallback: handleUpdateAuditData}
                },
                ...tabsState
            ]
        }
        return tabsState
    }, [runtimeId])

    const drawerTitle = useMemo(() => {
        if (auditDetailShow)
            return (
                <div className={styles["drawer-title"]}>
                    <YakitButton type='outline2' size='large' icon={<SolidReplyIcon />} onClick={handleCancelDetail}>
                        返回
                    </YakitButton>

                    <div className={styles["title-style"]}>
                        {`${isEdit ? "编辑" : "新建"}规则`} / <span className={styles["active-title"]}>审计详情</span>
                    </div>
                </div>
            )
        return `${isEdit ? "编辑" : "新建"}规则`
    }, [isEdit, auditDetailShow])

    const getOptions = useMemo(() => {
        if (isEdit && Object.keys(info?.AlertMsg || {}).length > 0) {
            return [
                {value: "hole", label: "相关漏洞"},
                {value: "code", label: "规则内容"},
                {value: "debug", label: "执行结果"}
            ]
        }
        return [
            {value: "code", label: "规则内容"},
            {value: "debug", label: "执行结果"}
        ]
    }, [isEdit, info])

    const goBackForm = useMemoizedFn(() => {
        onStop()
        onReset()
    })

    return (
        <>
            <YakitDrawer
                getContainer={getContainer}
                placement='bottom'
                mask={false}
                closable={false}
                keyboard={false}
                className={styles["edit-rule-drawer"]}
                bodyStyle={{padding: 0}}
                height={showHeight}
                title={drawerTitle}
                extra={
                    <div className={styles["drawer-extra"]}>
                        <YakitButton loading={loading} onClick={handleFormSubmit}>
                            保存
                        </YakitButton>
                        <div className={styles["divider-style"]}></div>
                        <YakitButton type='text2' icon={<OutlineXIcon />} onClick={handleCancel} />
                    </div>
                }
                visible={visible}
            >
                {/* 审计详情 */}
                <div className={classNames(styles["drawer-body"], {[styles["drawer-hidden"]]: !auditDetailShow})}>
                    <React.Suspense fallback={<YakitSpin spinning={true} />}>
                        {auditDetailShow && auditInfo.current && (
                            <RuleDebugAuditDetail auditData={auditData} info={auditInfo.current} />
                        )}
                    </React.Suspense>
                </div>

                <div className={classNames(styles["drawer-body"], {[styles["drawer-hidden"]]: auditDetailShow})}>
                    {/* 基础信息 */}
                    <div
                        className={classNames(styles["rule-info"], {
                            [styles["rule-info-show"]]: expand,
                            [styles["rule-info-hidden"]]: !expand
                        })}
                    >
                        <div className={styles["info-header"]}>
                            <div className={styles["header-title"]}>基础信息</div>
                            <Tooltip
                                title='收起基础信息'
                                visible={infoTooltipShow}
                                onVisibleChange={setInfoTooltipShow}
                            >
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
                                    <YakitInput
                                        maxLength={100}
                                        placeholder='请输入规则名'
                                        disabled={isEdit || isBuildInRule}
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

                                <Form.Item label={"所属分组"} name={"GroupNames"}>
                                    <YakitSelect
                                        mode='tags'
                                        placeholder='请选择分组'
                                        allowClear={true}
                                        disabled={isBuildInRule}
                                        options={groups}
                                        searchValue={groupSearch}
                                        onSearch={handleGroupSearchChange}
                                        onChange={() => {
                                            setGroupSearch("")
                                        }}
                                    />
                                </Form.Item>

                                <Form.Item label={"描述"} name={"Description"}>
                                    <YakitInput.TextArea
                                        disabled={isBuildInRule}
                                        isShowResize={false}
                                        maxLength={200}
                                        showCount={true}
                                        autoSize={{minRows: 2, maxRows: 4}}
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
                                        <YakitButton
                                            type='text2'
                                            icon={<OutlineOpenIcon />}
                                            onClick={handleSetExpand}
                                        />
                                    </Tooltip>
                                )}

                                <YakitRadioButtons
                                    buttonStyle='solid'
                                    value={activeTab}
                                    options={getOptions}
                                    onChange={(e) => setActiveTab(e.target.value)}
                                />
                            </div>

                            <div className={styles["header-extra"]}>
                                {!!progress && <PluginExecuteProgress percent={progress} name='执行进度' />}
                                <YakitButton type='text' onClick={handleOpenScoreHint}>
                                    自动检测
                                </YakitButton>
                                {isShowResult && (
                                    <YakitButton type='outline2' onClick={goBackForm} icon={<OutlineReplyIcon />}>
                                        返回
                                    </YakitButton>
                                )}
                            </div>
                        </div>

                        <div className={styles["code-body"]}>
                            <div className={styles["code-tab"]}>
                                <div
                                    tabIndex={activeTab === "hole" ? 1 : -1}
                                    className={classNames(styles["tab-pane-show"], {
                                        [styles["tab-pane-hidden"]]: activeTab !== "hole"
                                    })}
                                >
                                    <RelatedHoleList info={info} visible={visible} alertMsgRef={alertMsgRef} />
                                </div>

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
                                    </div>
                                </div>

                                <div
                                    tabIndex={activeTab === "debug" ? 1 : -1}
                                    className={classNames(styles["tab-pane-show"], styles["tab-pane-execute"], {
                                        [styles["tab-pane-hidden"]]: activeTab !== "debug"
                                    })}
                                >
                                    {isShowResult ? (
                                        <PluginExecuteResult
                                            streamInfo={{
                                                progressState: [],
                                                cardState: streamInfo.cardState,
                                                tabsState: getTabsState,
                                                logState: streamInfo.logState,
                                                tabsInfoState: {},
                                                riskState: [],
                                                rulesState: []
                                            }}
                                            runtimeId={runtimeId}
                                            loading={isExecuting}
                                            defaultActiveKey={undefined}
                                        />
                                    ) : (
                                        <div className={styles["params-container"]}>
                                            <Form
                                                labelCol={{span: 4}}
                                                wrapperCol={{span: 18}}
                                                form={debugForm}
                                                className={styles["params-form"]}
                                            >
                                                <Form.Item label={"项目名称"} name={"project"} rules={[{required: true, message: "该项为必填"}]}>
                                                    <YakitSelect
                                                        mode='multiple'
                                                        showSearch={true}
                                                        placeholder='请选择项目后调试'
                                                        options={project}
                                                        defaultActiveFirstOption={false}
                                                        filterOption={false}
                                                        notFoundContent='暂无数据'
                                                        onSearch={handleSearchProject}
                                                    />
                                                </Form.Item>
                                                <Form.Item label={" "} colon={false}>
                                                    {isExecuting ? (
                                                        <div className={styles["extra-btns"]}>
                                                            <YakitButton size='large' danger onClick={handleStop}>
                                                                停止
                                                            </YakitButton>
                                                        </div>
                                                    ) : (
                                                        <YakitButton size='large' onClick={handleExecute}>
                                                            执行
                                                        </YakitButton>
                                                    )}
                                                </Form.Item>
                                            </Form>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </YakitDrawer>
            {/* 代码评分弹窗 */}
            <CodeScoreModal
                type={SyntaxFlowMonacoSpec}
                code={content || ""}
                successHint=' '
                failedHint=' '
                specialHint=' '
                hiddenSpecialBtn={true}
                visible={scoreHint}
                onCancel={handleScoreHintCallback}
                title='SyntaxFlow规则检测'
                scoreHintData={[
                    "基础编译测试,判断SyntaxFlow规则的语法是否符合规范,是否存在不正确语法导致编译不通过",
                    "检查规则中的描述部分是否包含desc和solution字段",
                    "检查规则中是否包含alert, 规则应该包含alert语句产生检测结果",
                    "检查规则中的测试用例是否能通过规则检测,SyntaxFlow规则中应该包含正反测试用例,对于正向漏洞代码SyntaxFlow规则应该能正常产生alert,而对于反向测试不应该产生alert(误报)"
                ]}
            />
        </>
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
            grpcFetchLocalRuleGroupList({Pagination: DefaultRuleGroupFilterPageMeta, Filter: {}})
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
                                maxLength={50}
                                prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                                value={search}
                                allowClear
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
                                    <span
                                        className={classNames(styles["title-style"], "yakit-content-single-ellipsis")}
                                        title={search}
                                    >
                                        新增分组 "{search}"
                                    </span>
                                </div>
                            )}
                            {showGroup.map((item) => {
                                const {GroupName} = item
                                const isCheck =
                                    [...addGroup, ...removeGroup].findIndex((item) => item.GroupName === GroupName) > -1
                                return (
                                    <div
                                        key={item.GroupName}
                                        className={styles["group-list-item"]}
                                        onClick={() => {
                                            handleCheck(!isCheck, item)
                                        }}
                                    >
                                        <YakitCheckbox
                                            checked={isCheck}
                                            onChange={(e) => {
                                                e.stopPropagation()
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

/** @name 规则编写-调试页面的审计详情 */
export const RuleDebugAuditDetail: React.FC<RuleDebugAuditDetailProps> = memo((props) => {
    const {auditData, info} = props

    const currentInfo = useRef<SyntaxFlowResult>()

    useEffect(() => {
        if (info) {
            currentInfo.current = info
            handleFetchCodeTree()
        }
    }, [info])

    /** ---------- 审计结果表格 Start ---------- */
    const handleChangeInfo = useMemoizedFn((info: SyntaxFlowResult) => {
        if (currentInfo.current?.ResultID === info.ResultID) {
            return
        }
        currentInfo.current = info
        handleFetchCodeTree()
    })
    /** ---------- 审计结果表格 End ---------- */

    /** ---------- 代码树 Start ---------- */
    const [loading, setLoading] = useState<boolean>(false)

    const [isShowEmpty, setShowEmpty] = useState<boolean>(false)
    const [expandedKeys, setExpandedKeys] = useState<string[]>([])
    const [foucsedKey, setFoucsedKey] = useState<string>("")
    const [_AuditMap, {set: setAuditMap, get: getAuditMap, reset: resetAuditMap}] = useMap<string, AuditNodeMapProps>()
    const [_AuditChildMap, {set: setAuditChildMap, get: getAuditChildMap, reset: resetAuditChildMap}] = useMap<
        string,
        string[]
    >()

    const getMapAuditChildDetail = (id: string) => {
        return getAuditChildMap(id) || []
    }
    const getMapAuditDetail = (id: string): AuditNodeMapProps => {
        return (
            getAuditMap(id) || {
                parent: null,
                name: "读取失败",
                isLeaf: true,
                id: `${uuidv4()}-fail`,
                ResourceType: "",
                VerboseType: "",
                Size: 0,
                Extra: []
            }
        )
    }
    const initAuditTree = useMemoizedFn((ids: string[], depth: number) => {
        return ids.map((id) => {
            const itemDetail = getMapAuditDetail(id)
            let obj: AuditNodeProps = {...itemDetail, depth}
            const childArr = getMapAuditChildDetail(id)

            if (itemDetail.ResourceType === "variable" || itemDetail.ResourceType === AuditCodeDetailTopId) {
                obj.children = initAuditTree(childArr, depth + 1)
                // 数量为0时不展开 message除外
                if (parseInt(obj.Size + "") === 0 && itemDetail.ResourceType !== AuditCodeDetailTopId) {
                    obj.isLeaf = true
                } else {
                    obj.isLeaf = false
                }
            } else {
                obj.isLeaf = true
            }

            return obj
        })
    })

    const [refreshTree, setRefreshTree] = useState<boolean>(false)
    const auditDetailTree = useMemo(() => {
        const ids: string[] = getMapAuditChildDetail("/")
        const initTree = initAuditTree(ids, 1)
        // 归类排序
        const initTreeLeaf = initTree.filter((item) => item.isLeaf)
        const initTreeNoLeaf = initTree.filter((item) => !item.isLeaf)
        const newInitTree = [...initTreeNoLeaf, ...initTreeLeaf]
        if (newInitTree.length > 0) {
            newInitTree.push({
                parent: null,
                name: "已经到底啦~",
                id: "111",
                depth: 1,
                isBottom: true,
                Extra: [],
                ResourceType: "",
                VerboseType: "",
                Size: 0
            })
        }
        return newInitTree
    }, [refreshTree])

    const handleResetCodeTree = useMemoizedFn(() => {
        resetAuditChildMap()
        resetAuditMap()
        setExpandedKeys([])
    })

    const handleFetchCodeTree = useMemoizedFn(async () => {
        if (!currentInfo.current) return
        if (loading) return
        try {
            handleResetCodeTree()
            handleResetAuditDetail()
            setLoading(true)
            setShowEmpty(false)
            const path: string = "/"
            const params: AuditYakUrlProps = {
                Schema: "syntaxflow",
                ProgramName: currentInfo.current.ProgramName,
                Path: "/",
                Query: [{Key: "result_id", Value: currentInfo.current.ResultID}]
            }
            const result = await loadAuditFromYakURLRaw(params)

            if (result && result.Resources.length > 0) {
                let messageIds: string[] = []
                let variableIds: string[] = []
                // 构造树结构
                result.Resources.filter((item) => item.VerboseType !== "result_id").forEach((item, index) => {
                    const {ResourceType, VerboseType, VerboseName, ResourceName, Size, Extra} = item
                    // 警告信息（置顶显示）前端收集折叠
                    if (ResourceType === "message") {
                        const id = `${AuditCodeDetailTopId}${path}${VerboseName}-${index}`
                        messageIds.push(id)
                        setAuditMap(id, {
                            parent: path,
                            id,
                            name: VerboseName,
                            ResourceType,
                            VerboseType,
                            Size,
                            Extra
                        })
                    }
                    // 变量
                    if (ResourceType === "variable") {
                        const id = `${path}${ResourceName}`
                        variableIds.push(id)
                        setAuditMap(id, {
                            parent: path,
                            id,
                            name: ResourceName,
                            ResourceType,
                            VerboseType,
                            Size,
                            Extra
                        })
                    }
                })
                let topIds: string[] = []
                if (messageIds.length > 0) {
                    topIds.push(AuditCodeDetailTopId)
                    setAuditMap(AuditCodeDetailTopId, {
                        parent: path,
                        id: AuditCodeDetailTopId,
                        name: "message",
                        ResourceType: AuditCodeDetailTopId,
                        VerboseType: "",
                        Size: 0,
                        Extra: []
                    })
                    setAuditChildMap(AuditCodeDetailTopId, messageIds)
                }
                setAuditChildMap("/", [...topIds, ...variableIds])
                setRefreshTree(!refreshTree)
            } else {
                setShowEmpty(true)
            }
            setLoading(false)
        } catch (error: any) {
            failed(`${error}`)
            setShowEmpty(true)
            setLoading(false)
        }
    })

    const handleAuditLoadData = useMemoizedFn((id: string) => {
        return new Promise(async (resolve, reject) => {
            if (!currentInfo.current) {
                reject("")
                return
            }
            // 校验其子项是否存在
            const childArr = getMapAuditChildDetail(id)
            if (id === AuditCodeDetailTopId) {
                resolve("")
                return
            }
            if (childArr.length > 0) {
                setRefreshTree(!refreshTree)
                resolve("")
            } else {
                const path = id
                const params: AuditYakUrlProps = {
                    Schema: "syntaxflow",
                    ProgramName: currentInfo.current.ProgramName,
                    Path: path,
                    Query: [{Key: "result_id", Value: currentInfo.current.ResultID}]
                }
                const result = await loadAuditFromYakURLRaw(params, undefined, 1, 30)
                if (result) {
                    let variableIds: string[] = []
                    result.Resources.filter((item) => item.VerboseType !== "result_id").forEach((item, index) => {
                        const {ResourceType, VerboseType, VerboseName, ResourceName, Size, Extra} = item
                        let value: string = `${index}`
                        const obj = Extra.find((item) => item.Key === "index")
                        if (obj) {
                            value = obj.Value
                        }
                        const newId = `${id}/${value}`
                        variableIds.push(newId)
                        setAuditMap(newId, {
                            parent: path,
                            id: newId,
                            name: ResourceName,
                            ResourceType,
                            VerboseType,
                            Size,
                            Extra
                        })
                    })
                    let isEnd: boolean = !!result.Resources.find((item) => item.VerboseType === "result_id")
                    // 如若请求数据未全部拿完 则显示加载更多
                    if (!isEnd) {
                        const newId = `${id}/load`
                        setAuditMap(newId, {
                            parent: path,
                            id: newId,
                            name: "",
                            ResourceType: "value",
                            VerboseType: "",
                            Size: 0,
                            Extra: [],
                            page: result.Page,
                            hasMore: true
                        })
                        variableIds.push(newId)
                    }

                    setAuditChildMap(path, variableIds)
                    setTimeout(() => {
                        setRefreshTree(!refreshTree)
                        resolve("")
                    }, 300)
                } else {
                    reject()
                }
            }
        })
    })

    // 树加载更多
    const loadTreeMore = useMemoizedFn(async (node: AuditNodeProps) => {
        if (node.parent && node.page && currentInfo.current) {
            const path = node.parent
            const page = parseInt(node.page + "") + 1
            const params: AuditYakUrlProps = {
                Schema: "syntaxflow",
                ProgramName: currentInfo.current.ProgramName,
                Path: path,
                Query: [{Key: "result_id", Value: currentInfo.current.ResultID}]
            }
            // 每次拿30条
            const result = await loadAuditFromYakURLRaw(params, undefined, page, 30)
            if (result) {
                let variableIds: string[] = []
                result.Resources.filter((item) => item.VerboseType !== "result_id").forEach((item, index) => {
                    const {ResourceType, VerboseType, VerboseName, ResourceName, Size, Extra} = item
                    let value: string = `${index}`
                    const obj = Extra.find((item) => item.Key === "index")
                    if (obj) {
                        value = obj.Value
                    }
                    const newId = `${path}/${value}`
                    variableIds.push(newId)
                    setAuditMap(newId, {
                        parent: path,
                        id: newId,
                        name: ResourceName,
                        ResourceType,
                        VerboseType,
                        Size,
                        Extra
                    })
                })
                let isEnd: boolean = !!result.Resources.find((item) => item.VerboseType === "result_id")
                // 如若请求数据未全部拿完 则显示加载更多
                const newId = `${path}/load`
                if (!isEnd) {
                    setAuditMap(newId, {
                        parent: path,
                        id: newId,
                        name: "",
                        ResourceType: "value",
                        VerboseType: "",
                        Size: 0,
                        Extra: [],
                        page: result.Page,
                        hasMore: true
                    })
                    variableIds.push(newId)
                }
                // 此处为累加并移除原有加载更多项
                const auditChilds = getMapAuditChildDetail(path)
                const childs = auditChilds.filter((item) => item !== newId)
                setAuditChildMap(path, [...childs, ...variableIds])
                setTimeout(() => {
                    setRefreshTree(!refreshTree)
                }, 300)
            }
        }
    })

    const onLoadData = useMemoizedFn((node: AuditNodeProps) => {
        if (node.parent === null) return Promise.reject()
        if (handleAuditLoadData) return handleAuditLoadData(node.id)
        return Promise.reject()
    })
    /** ---------- 代码树 End ---------- */

    /** ---------- 审计详情信息 Start ---------- */
    const [auditRightParams, setAuditRightParams] = useState<AuditEmiterYakUrlProps>()
    const [isShowAuditDetail, setShowAuditDetail] = useState<boolean>(false)

    const bugHash = useRef<string>()
    const [ssaRisksinfo, setSSARisksInfo] = useState<SSARisk>()

    const getInfoFun = useMemoizedFn((hash) => {
        ipcRenderer
            .invoke("QuerySSARisks", {
                Filter: {
                    Hash: [hash]
                }
            })
            .then((res: QuerySSARisksResponse) => {
                const {Data} = res
                if (Data.length > 0) {
                    setSSARisksInfo(Data[0])
                }
            })
            .catch((err) => {})
    })

    const onJump = useMemoizedFn(async (node: AuditNodeProps) => {
        try {
            const arr = node.Extra.filter((item) => item.Key === "risk_hash")
            // 预留打开BUG详情
            if (arr.length > 0 && node.isBug) {
                const hash = arr[0]?.Value
                getInfoFun(hash)
                bugHash.current = hash
                setShowAuditDetail(true)
            }
            if (!node.isBug) {
                bugHash.current = undefined
                setSSARisksInfo(undefined)
            }
            if (node.ResourceType === "value") {
                if (!currentInfo.current) return
                setFoucsedKey(node.id)
                const rightParams: AuditEmiterYakUrlProps = {
                    Schema: "syntaxflow",
                    Location: currentInfo.current.ProgramName,
                    Path: node.id,
                    Query: [{Key: "result_id", Value: currentInfo.current.ResultID}]
                }
                setAuditRightParams(rightParams)
                setShowAuditDetail(true)
            }
        } catch (error) {
            failed(`打开错误${error}`)
        }
    })
    const handleResetAuditDetail = useMemoizedFn(() => {
        setAuditRightParams(undefined)
        setShowAuditDetail(false)
        bugHash.current = undefined
        setSSARisksInfo(undefined)
    })
    /** ---------- 审计详情信息 End ---------- */

    return (
        <div className={styles["rule-debug-audit-detail"]}>
            <div className={styles["audit-list"]}>
                <RuleDebugAuditList auditData={auditData} onDetail={handleChangeInfo} />
            </div>

            <div className={styles["code-tree"]}>
                <div className={styles["code-tree-header"]}>
                    <div className={styles["header-title"]}>
                        <div className={styles["title-style"]}>{currentInfo.current?.Title || "-"}</div>

                        <div className={styles["advice-icon"]}>
                            <OutlineLightbulbIcon />
                        </div>
                    </div>
                    {currentInfo.current?.Description && (
                        <div className={styles["description-title"]}>{currentInfo.current.Description}</div>
                    )}
                </div>

                {isShowEmpty ? (
                    <div className={styles["no-data"]}>暂无数据</div>
                ) : (
                    <AuditTree
                        data={auditDetailTree}
                        expandedKeys={expandedKeys}
                        setExpandedKeys={setExpandedKeys}
                        onLoadData={onLoadData}
                        foucsedKey={foucsedKey}
                        setFoucsedKey={setFoucsedKey}
                        onJump={onJump}
                        onlyJump={true}
                        wrapClassName={styles["code-tree-wrap"]}
                        loadTreeMore={loadTreeMore}
                    />
                )}
            </div>

            <div className={styles["audit-detail"]}>
                {isShowAuditDetail ? (
                    <>
                        {bugHash.current ? (
                            <>{ssaRisksinfo && <RightBugAuditResult info={ssaRisksinfo} columnSize={1} />}</>
                        ) : (
                            <RightAuditDetail
                                auditRightParams={auditRightParams}
                                isShowAuditDetail={isShowAuditDetail}
                                setShowAuditDetail={setShowAuditDetail}
                            />
                        )}
                    </>
                ) : (
                    <div className={styles["no-audit"]}>
                        <YakitEmpty title='暂无数据' description='请选择左边内容' />
                    </div>
                )}
            </div>
        </div>
    )
})

/** @name 规则编写-调试页面-审计结果列表 */
const RuleDebugAuditList: React.FC<RuleDebugAuditListProps> = memo((props) => {
    const {auditData, onDetail} = props

    const dataLength = useMemo(() => {
        return auditData.length
    }, [auditData])

    const [data, setData] = useState<SyntaxFlowResult[]>(auditData)
    const [search, setSearch] = useState<string>("")
    const handleSearch = useDebounceFn(
        (value: string) => {
            setData(auditData.filter((item) => item.Title.toLocaleLowerCase().indexOf(value.toLocaleLowerCase()) > -1))
        },
        {wait: 300}
    ).run

    const wrapperRef = useRef<HTMLDivElement>(null)
    const bodyRef = useRef<HTMLDivElement>(null)
    const [list] = useVirtualList(data, {
        containerTarget: wrapperRef,
        wrapperTarget: bodyRef,
        itemHeight: 40,
        overscan: 10
    })

    return (
        <div className={styles["rule-debug-audit-list"]}>
            <div className={styles["audit-list-header"]}>
                <div className={styles["header-title"]}>
                    <span className={styles["title-style"]}>审计结果列表</span>
                    <YakitRoundCornerTag>{dataLength || 0}</YakitRoundCornerTag>
                </div>
            </div>

            <div className={styles["audit-list-search"]}>
                <YakitInput.Search
                    placeholder='请输入关键词搜索'
                    wrapperStyle={{width: "100%"}}
                    size='large'
                    onSearch={handleSearch}
                    onPressEnter={() => {
                        handleSearch(search)
                    }}
                    value={search}
                    onChange={(e) => {
                        const {value} = e.target
                        setSearch(value)
                    }}
                />
            </div>

            <div ref={wrapperRef} className={styles["audit-list-wrapper"]}>
                <div ref={bodyRef}>
                    {list.map((item) => {
                        const {ResultID, Title, Severity} = item.data
                        const title = SeverityMapTag.find((item) => item.key.includes(Severity || ""))
                        return (
                            <div
                                key={ResultID}
                                className={classNames(styles["audit-opt"])}
                                onClick={() => onDetail(item.data)}
                            >
                                <YakitRoundCornerTag>{ResultID}</YakitRoundCornerTag>
                                <div
                                    className={classNames(styles["opt-title"], "yakit-content-single-ellipsis")}
                                    title={Title || "-"}
                                >
                                    {Title || "-"}
                                </div>
                                <YakitTag color={title?.tag as YakitTagColor} className={styles["table-severity-tag"]}>
                                    {title ? title.name : Severity || "-"}
                                </YakitTag>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
})

/** @name 规则上传下载进度弹窗 */
export const RuleUploadAndDownloadModal: React.FC<RuleUploadAndDownloadModalProps> = memo((props) => {
    const {getContainer, onCancel, type, apiKey, token, onSuccess} = props

    const timeRef = useRef<any>(null)
    const streamRef = useRef<SyntaxFlowRuleOnlineProgress[]>([])
    const [stream, setStream] = useState<SyntaxFlowRuleOnlineProgress[]>([])

    const onStreamCancel = useMemoizedFn(() => {
        ipcRenderer.invoke(`cancel-${apiKey}`, token)
        ipcRenderer.removeAllListeners(`${token}-data`)
        ipcRenderer.removeAllListeners(`${token}-error`)
        ipcRenderer.removeAllListeners(`${token}-end`)
        clearInterval(timeRef.current)

        onCancel()
    })

    useEffect(() => {
        const updateStream = () => {
            const data = streamRef.current.slice()
            setStream(data)
        }
        timeRef.current = setInterval(updateStream, 300)
        ipcRenderer.on(`${token}-data`, async (e, data: SyntaxFlowRuleOnlineProgress) => {
            streamRef.current.unshift(data)
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            yakitNotify("error", `error: ${error}`)
        })
        return () => {
            onStreamCancel()
        }
    }, [token])

    useEffect(() => {
        const data = stream[0] || {}
        const isError = stream.some((item) => item.MessageType === "error")
        if (data.Progress === 1 && data.MessageType === "success" && !isError) {
            setTimeout(() => {
                yakitNotify("success", data.Message)
                onStreamCancel()
                onSuccess()
            }, 300)
        }
    }, [JSON.stringify(stream)])

    return (
        <YakitModal
            className={styles["RuleUploadAndDownloadModal"]}
            getContainer={getContainer}
            visible={true}
            width={650}
            type='white'
            closable={false}
            footerStyle={{justifyContent: "flex-end"}}
            footer={
                <YakitButton type={"outline2"} onClick={onStreamCancel}>
                    {stream[0]?.Progress === 1 ? "完成" : "取消"}
                </YakitButton>
            }
        >
            <div className={styles["progressTitle"]}>
                {type === "upload" ? (
                    <SolidClouduploadIcon style={{color: "var(--yakit-warning-5)"}} />
                ) : (
                    <SolidClouddownloadIcon style={{color: "var(--yakit-warning-5)"}} />
                )}
                <span className={styles["text"]}>规则{type === "upload" ? "上传" : "下载"}</span>
            </div>
            <Progress
                strokeColor='var(--Colors-Use-Main-Primary)'
                trailColor='var(--Colors-Use-Neutral-Bg)'
                percent={Math.trunc(stream[0]?.Progress * 100)}
                format={(percent) => `进度 ${percent}%`}
            />
            <div className={styles["log-info"]}>
                {stream.map((item, index) => (
                    <div
                        key={index}
                        className={styles["log-item"]}
                        style={{color: item.MessageType === "error" ? "#f00" : "#85899e"}}
                    >
                        {item.Message}
                    </div>
                ))}
            </div>
        </YakitModal>
    )
})

export const OnlineRuleGroupList: React.FC<OnlineRuleGroupListProps> = memo(
    React.forwardRef((props, ref) => {
        const {isrefresh, onGroupChange, currentPageTabRouteKey, canDel, userInfo, onRefreshRuleManagement} = props

        useImperativeHandle(ref, () => ({
            handleReset
        }))

        const [loginShow, setLoginShow] = useState<boolean>(false)
        const onLogin = useMemoizedFn(() => {
            setLoginShow(true)
        })
        const onLoadCancel = useMemoizedFn(() => {
            setLoginShow(false)
        })
        useEffect(() => {
            if (isEnpriTraceIRify()) {
                fetchList()
            }
        }, [userInfo])

        const [data, setData] = useState<API.FlowRuleGroupDetail[]>([])

        const wrapperRef = useRef<HTMLDivElement>(null)
        const bodyRef = useRef<HTMLDivElement>(null)

        /** ---------- 获取数据 ---------- */
        const [loading, setLoading] = useState<boolean>(false)
        const canFetchList = useMemo(() => {
            if (isEnpriTraceIRify()) {
                return userInfo.isLogin && userInfo.token
            } else {
                return true
            }
        }, [userInfo])
        const fetchList = useMemoizedFn(() => {
            if (!canFetchList) return

            if (loading) return

            const request: API.FlowRuleGroupRequest = {page: 1, limit: 1000, order_by: "created_at", order: "desc"}
            if (search.current) {
                request.keyword = search.current
            }

            setLoading(true)
            httpFetchOnlineRuleGroupList(request)
                .then(({data}) => {
                    setData(data || [])
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
        const [select, setSelect] = useState<API.FlowRuleGroupDetail[]>([])
        const selectGroups = useMemo(() => {
            return select.map((item) => item.groupName)
        }, [select])
        useUpdateEffect(() => {
            // 这里的延时触发搜索由外层去控制
            onGroupChange(select.map((item) => item.groupName || ""))
        }, [select])
        const handleSelect = useMemoizedFn((info: API.FlowRuleGroupDetail) => {
            const isExist = select.find((el) => el.groupName === info.groupName)
            if (isExist) setSelect((arr) => arr.filter((item) => item.groupName !== info.groupName))
            else setSelect((arr) => [...arr, info])
        })
        const handleReset = useMemoizedFn(() => {
            setSelect([])
        })

        // 更新数据
        const handleUpdateData = useMemoizedFn(
            (type: "delete", info: API.FlowRuleGroupDetail, newInfo?: API.FlowRuleGroupDetail) => {
                if (type === "delete") {
                    setData((arr) => {
                        return arr.filter((ele) => ele.groupName !== info.groupName)
                    })
                }
            }
        )

        /** ---------- 下载 ---------- */
        const [downloadInfoVisible, setDownloadInfoVisible] = useState<boolean>(false)
        const [downloadPercentShow, setDownloadPercentShow] = useState<boolean>(false)
        const downloadTokenRef = useRef<string>(randomString(40))
        const downloadContainerRef = useRef<string>(currentPageTabRouteKey)
        const ruleGroupItemRef = useRef<API.FlowRuleGroupDetail>()
        const handleDownload = useMemoizedFn(() => {
            if (ruleGroupItemRef.current?.groupName) {
                downloadTokenRef.current = randomString(40)
                grpcDownloadSyntaxFlowRule(
                    {
                        Filter: {GroupNames: [ruleGroupItemRef.current.groupName]},
                        Token: userInfo.token
                    },
                    downloadTokenRef.current
                ).then((res) => {
                    setDownloadInfoVisible(false)
                    downloadContainerRef.current = currentPageTabRouteKey
                    setDownloadPercentShow(true)
                })
            }
        })

        /** ---------- 删除 ---------- */
        const [loadingDelKeys, setLoadingDelKeys] = useState<string[]>([])
        const handleDelete = useMemoizedFn((info: API.FlowRuleGroupDetail) => {
            const {groupName = "", isBuildIn} = info
            if (isBuildIn) return
            const isExist = loadingDelKeys.includes(groupName)
            if (isExist) return

            setLoadingDelKeys((arr) => {
                return [...arr, groupName]
            })
            httpDeleteOnlineRuleGroup({groupNames: [groupName]})
                .then(() => {
                    // 删除后自动把选中里的该条去掉
                    setSelect((arr) => arr.filter((item) => item.groupName !== info.groupName))
                    handleUpdateData("delete", info)
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoadingDelKeys((arr) => arr.filter((ele) => ele !== groupName))
                    }, 200)
                })
        })

        return (
            <div className={styles["rule-group-list"]}>
                {!canFetchList ? (
                    <>
                        <YakitEmpty
                            image={<img src={NoPermissions} alt='' />}
                            imageStyle={{width: 220, height: 150, margin: "auto"}}
                            title='暂无查看权限'
                            description='登录后即可查看'
                        />
                        <YakitButton style={{width: 200, marginLeft: 50}} type='outline1' onClick={() => onLogin()}>
                            立即登录
                        </YakitButton>
                        {loginShow && <Login visible={loginShow} onCancel={onLoadCancel} />}
                    </>
                ) : (
                    <>
                        {data.length === 0 ? (
                            <YakitSpin spinning={loading}>
                                <YakitEmpty title='暂无数据' />
                            </YakitSpin>
                        ) : (
                            <>
                                <div className={styles["list-search-and-add"]}>
                                    <YakitInput.Search
                                        size='large'
                                        placeholder='请输入组名'
                                        onSearch={handleSearch}
                                        allowClear
                                    />
                                </div>

                                <div className={styles["list-container"]}>
                                    <YakitSpin spinning={loading}>
                                        <div ref={wrapperRef} className={styles["list-body"]}>
                                            <div ref={bodyRef}>
                                                {data.map((item) => {
                                                    const {groupName: name = ""} = item

                                                    const isCheck = selectGroups.includes(name)
                                                    const isDelLoading = loadingDelKeys.includes(name)

                                                    return (
                                                        <div
                                                            key={name}
                                                            className={classNames(styles["list-local-opt"], {
                                                                [styles["list-local-opt-active"]]: isCheck
                                                            })}
                                                            onClick={() => {
                                                                handleSelect(item)
                                                            }}
                                                        >
                                                            <div className={styles["info-wrapper"]}>
                                                                <YakitCheckbox
                                                                    checked={isCheck}
                                                                    onChange={() => {
                                                                        handleSelect(item)
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <SolidFolderopenIcon />
                                                                <span
                                                                    className={classNames(
                                                                        styles["title-style"],
                                                                        "yakit-content-single-ellipsis"
                                                                    )}
                                                                    title={item.groupName}
                                                                >
                                                                    {item.groupName}
                                                                </span>
                                                            </div>

                                                            <div className={styles["total-style"]}>{item.count}</div>
                                                            <div
                                                                className={styles["btns-wrapper"]}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                }}
                                                            >
                                                                <YakitButton
                                                                    type='secondary2'
                                                                    icon={<OutlineClouddownloadIcon />}
                                                                    onClick={() => {
                                                                        ruleGroupItemRef.current = item
                                                                        setDownloadInfoVisible(true)
                                                                    }}
                                                                />
                                                                {canDel && (
                                                                    <YakitButton
                                                                        type='secondary2'
                                                                        colors='danger'
                                                                        icon={<OutlineTrashIcon />}
                                                                        loading={isDelLoading}
                                                                        onClick={() => {
                                                                            handleDelete(item)
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </YakitSpin>
                                    {/* 下载提示 */}
                                    <YakitHint
                                        visible={downloadInfoVisible}
                                        title='下载提示'
                                        content='如果规则id相同则会直接覆盖，是否确认下载'
                                        okButtonText='确认'
                                        mask={true}
                                        onOk={() => {
                                            handleDownload()
                                        }}
                                        onCancel={() => {
                                            ruleGroupItemRef.current = undefined
                                            setDownloadInfoVisible(false)
                                        }}
                                    ></YakitHint>
                                    {downloadPercentShow && (
                                        <RuleUploadAndDownloadModal
                                            getContainer={
                                                document.getElementById(
                                                    `main-operator-page-body-${downloadContainerRef.current}`
                                                ) || undefined
                                            }
                                            type='download'
                                            apiKey='DownloadSyntaxFlowRule'
                                            token={downloadTokenRef.current}
                                            onCancel={() => {
                                                setDownloadPercentShow(false)
                                            }}
                                            onSuccess={() => {
                                                onRefreshRuleManagement()
                                            }}
                                        ></RuleUploadAndDownloadModal>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        )
    })
)

export const RelatedHoleList: React.FC<RelatedHoleListProps> = memo((props) => {
    const {info, visible, alertMsgRef} = props
    const [activePanelKey, setActivePanelKey] = useState<string | undefined>(undefined)
    const [isManualSort, setIsManualSort] = useState(false)
    const [isRefresh, setRefresh] = useState<boolean>(false)

    useEffect(() => {
        alertMsgRef.current = info?.AlertMsg || {}
        setRefresh((v) => !v)
    }, [info])

    const alertMsgEntries = useMemo(() => {
        const entries = Object.entries(alertMsgRef.current)
        if (!isManualSort) {
            // 初始时排序
            return entries.sort(([, a], [, b]) => {
                const aIndex = severityOrder.indexOf((a.Severity || "").toLowerCase())
                const bIndex = severityOrder.indexOf((b.Severity || "").toLowerCase())
                return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
            })
        }
        // 手动后保持原顺序
        return entries
    }, [isRefresh, isManualSort])

    const handleClickSeverity = (alertMsgKey: string, newSeverity: string) => {
        setIsManualSort(true)
        alertMsgRef.current = {
            ...alertMsgRef.current,
            [alertMsgKey]: {...alertMsgRef.current[alertMsgKey], Severity: newSeverity}
        }
        setRefresh((v) => !v)
    }

    useEffect(() => {
        return () => {
            setActivePanelKey(undefined)
            alertMsgRef.current = {}
            setIsManualSort(false)
        }
    }, [visible])

    /** 编辑器内容的变化，更新数据 */
    const onMarkdownUpdated = useDebounceFn(
        (key: "Description" | "Solution" | "RiskType", value: string, alertMsgKey: string) => {
            alertMsgRef.current = {
                ...alertMsgRef.current,
                [alertMsgKey]: {...alertMsgRef.current[alertMsgKey], [key]: value}
            }
        },
        {wait: 200, leading: true}
    ).run

    return (
        <div className={styles["related-hole-list"]}>
            <div className={styles["info-setting-alertMsg"]}>
                <YakitCollapse
                    activeKey={activePanelKey}
                    onChange={(key) => {
                        setActivePanelKey(Array.isArray(key) ? key[key.length - 1] : key)
                    }}
                >
                    {alertMsgEntries.map(([key, alert]) => {
                        const title = SeverityMapTag.find((item) => item.key.includes(alert.Severity || ""))
                        return (
                            <YakitPanel
                                header={
                                    <span
                                        className={classNames(styles["title"], "yakit-content-single-ellipsis")}
                                        title={alert.TitleZh || alert.Title || "-"}
                                    >
                                        {alert.TitleZh || alert.Title || "-"}
                                    </span>
                                }
                                key={key}
                                extra={
                                    <div className={styles["severity"]}>
                                        <YakitTag
                                            color={title?.tag as YakitTagColor}
                                            closable={false}
                                            icon={<OutlineExclamationIcon className={styles["exclamationIcon"]} />}
                                        >
                                            {title ? title.name : alert.Severity || "-"}
                                        </YakitTag>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <YakitPopover
                                                trigger='click'
                                                overlayClassName={styles["severity-menu-popover"]}
                                                overlayStyle={{paddingTop: 2}}
                                                content={
                                                    <div className={styles["severity-menu-cont-wrapper"]}>
                                                        {SeverityMapTag.map((item) => (
                                                            <div
                                                                key={item.name}
                                                                className={classNames(styles["severity-menu-item"], {
                                                                    [styles["active"]]: item.key.includes(
                                                                        alert.Severity || ""
                                                                    )
                                                                })}
                                                                onClick={() => {
                                                                    const severity = [
                                                                        "critical",
                                                                        "high",
                                                                        "middle",
                                                                        "low",
                                                                        "info"
                                                                    ].filter((sev) => item.key.includes(sev))
                                                                    if (!severity[0]) return
                                                                    handleClickSeverity(key, severity[0])
                                                                }}
                                                            >
                                                                {item.name}
                                                                {item.key.includes(alert.Severity || "") && (
                                                                    <SolidCheckIcon className={styles["check-icon"]} />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                }
                                            >
                                                <Tooltip title='修改漏洞等级'>
                                                    <YakitButton
                                                        icon={<OutlineSelectorIcon />}
                                                        type='text2'
                                                        size='small'
                                                    ></YakitButton>
                                                </Tooltip>
                                            </YakitPopover>
                                        </div>
                                    </div>
                                }
                            >
                                <Descriptions bordered size='small' labelStyle={{width: 120}}>
                                    <Descriptions.Item label='类型' span={3}>
                                        <YakitInput
                                            defaultValue={alert.RiskType}
                                            onChange={(e) => {
                                                const {value} = e.target
                                                onMarkdownUpdated("RiskType", value, key)
                                            }}
                                        />
                                    </Descriptions.Item>
                                    <Descriptions.Item label='漏洞描述' span={3}>
                                        <MilkdownEditor
                                            type='notepad'
                                            defaultValue={alert.Description}
                                            onMarkdownUpdated={(value) => onMarkdownUpdated("Description", value, key)}
                                        />
                                    </Descriptions.Item>
                                    <Descriptions.Item label='修复建议' span={3}>
                                        <MilkdownEditor
                                            type='notepad'
                                            defaultValue={alert.Solution}
                                            onMarkdownUpdated={(value) => onMarkdownUpdated("Solution", value, key)}
                                        />
                                    </Descriptions.Item>
                                </Descriptions>
                            </YakitPanel>
                        )
                    })}
                </YakitCollapse>
            </div>
        </div>
    )
})
