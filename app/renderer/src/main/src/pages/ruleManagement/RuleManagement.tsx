import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import {
    FilterLibRuleKind,
    FilterRuleKind,
    LocalRuleGroupListPropsRefProps,
    OnlineRuleGroupListPropsRefProps,
    QuerySyntaxFlowRuleResponse,
    RuleManagementProps,
    SyntaxFlowRule,
    SyntaxFlowRuleFilter
} from "./RuleManagementType"
import {
    cleanObject,
    EditRuleDrawer,
    LocalRuleGroupList,
    OnlineRuleGroupList,
    RuleUploadAndDownloadModal,
    transformFilterData,
    UpdateRuleToGroup
} from "./template"
import {
    OutlineClouddownloadIcon,
    OutlineClouduploadIcon,
    OutlineExportIcon,
    OutlineEyeIcon,
    OutlineImportIcon,
    OutlinePencilaltIcon,
    OutlinePlusIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import cloneDeep from "lodash/cloneDeep"
import {genDefaultPagination} from "../invoker/schema"
import {
    grpcDeleteLocalRule,
    grpcDownloadSyntaxFlowRule,
    grpcFetchLocalRuleList,
    grpcSyntaxFlowRuleToOnline,
    httpDeleteOnlineRule,
    httpFetchOnlineRuleList
} from "./api"
import {RuleLanguageList, RuleType, RuleTypeList} from "@/defaultConstants/RuleManagement"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {Tooltip} from "antd"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

import classNames from "classnames"
import styles from "./RuleManagement.module.scss"
import emiter from "@/utils/eventBus/eventBus"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {RefreshIcon} from "@/assets/newIcon"
import {IRifyApplySyntaxFlowRuleUpdate} from "../mitm/MITMServerHijacking/MITMPluginLocalList"
import {useStore} from "@/store"
import {randomString} from "@/utils/randomUtil"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {API} from "@/services/swagger/resposeType"
import {isCommunityIRify, isEnpriTraceIRify} from "@/utils/envfile"
import ImportExportModal, {ImportExportModalExtra} from "../fingerprintManage/ImportExportModal/ImportExportModal"
import {YakitRoute} from "@/enums/yakitRoute"
const DefaultPaging: Paging = {Page: 1, Limit: 20, OrderBy: "updated_at", Order: "desc"}
const DefaultOnlinePaging: API.Pagination = {page: 1, limit: 20, order_by: "updated_at", order: "desc"}

/** @name 规则管理 */
export const RuleManagement: React.FC<RuleManagementProps> = memo((props) => {
    const {} = props

    const wrapperRef = useRef<HTMLDivElement>(null)
    const userInfo = useStore((s) => s.userInfo)
    const {currentPageTabRouteKey} = usePageInfo(
        (s) => ({
            currentPageTabRouteKey: s.currentPageTabRouteKey
        }),
        shallow
    )

    const localRuleGroupListRef = useRef<LocalRuleGroupListPropsRefProps>()
    const onlineRuleGroupListRef = useRef<OnlineRuleGroupListPropsRefProps>()

    /** ---------- 搜索/获取表格数据 Start ---------- */
    const initLoading = useRef<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [filters, setFilters] = useState<SyntaxFlowRuleFilter>({
        FilterLibRuleKind: ""
    })
    const [data, setData] = useState<QuerySyntaxFlowRuleResponse>({
        Rule: [],
        Pagination: {...genDefaultPagination(20)},
        Total: 0
    })
    const [isRefresh, setIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0

    const handleCheckLib = useMemoizedFn((isChecked) => {
        setFilters((filters) => {
            return {...filters, FilterLibRuleKind: isChecked ? "" : "noLib"}
        })
    })

    const handleSearch = useMemoizedFn((val: string) => {
        setFilters((filters) => {
            return {...filters, Keyword: val}
        })
    })

    const [groupRefresh, setGroupRefresh] = useState<boolean>(false)
    const handleGroupChange = useMemoizedFn((groups: string[]) => {
        setFilters((filters) => {
            return {...filters, GroupNames: groups}
        })
        if (groups.length) {
            // 重置线上列表查询条件 但不会查询数据
            setOnlineData({
                data: [],
                pagemeta: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    total_page: 0
                }
            })
            setOnlineFilters({
                filterLibRuleKind: ""
            })
            onlineRuleGroupListRef.current?.handleReset()
        }
    })

    const tableHeaderTitle = useMemo(() => {
        if (!filters.GroupNames) return "全部"
        if (filters.GroupNames.length === 0) return "全部"
        return filters.GroupNames.join(",")
    }, [filters.GroupNames])

    // 清空选中并刷新列表和规则组数据
    const handleRefreshGroup = useMemoizedFn(() => {
        setGroupRefresh((v) => !v)
        fetchList()
    })

    const onTableFilterChange = useMemoizedFn((page: number, limit: number, sorter: SortProps, tableFilters: any) => {
        const {Purpose = undefined, Language = undefined} = tableFilters
        setFilters((filters) => {
            const info = {...filters}
            if (Purpose && Array.isArray(Purpose)) info.Purpose = [...Purpose]
            if (Language && Array.isArray(Language)) info.Language = [...Language]
            return info
        })
    })

    const fetchList = useDebounceFn(
        useMemoizedFn((page?: number) => {
            if (onlineFilters.groupNames?.length) return
            if (loading) return

            const pagination: Paging = {...DefaultPaging, Page: page || 1}
            if (pagination.Page === 1) {
                handleAllCheck([], [], false)
                initLoading.current = true
            }

            setLoading(true)
            grpcFetchLocalRuleList({Pagination: pagination, Filter: cloneDeep(filters)})
                .then((res) => {
                    const {Pagination, Rule, Total} = res
                    const rules = pagination.Page === 1 ? Rule : (data?.Rule || []).concat(Rule)
                    setData({
                        Pagination: {
                            ...Pagination,
                            Page: +Pagination.Page,
                            Limit: +Pagination.Limit
                        },
                        Rule: rules,
                        Total
                    })
                    if (pagination.Page === 1) {
                        setIsRefresh(!isRefresh)
                    }
                })
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        initLoading.current = false
                        setLoading(false)
                    }, 200)
                })
        }),
        {wait: 300}
    ).run

    useEffect(() => {
        fetchList()
    }, [filters])

    const onRefreshRuleManagementFun = useMemoizedFn(() => {
        setGroupRefresh((v) => !v)
        fetchList()
    })

    useEffect(() => {
        emiter.on("onRefreshRuleManagement", onRefreshRuleManagementFun)
        return () => {
            emiter.off("onRefreshRuleManagement", onRefreshRuleManagementFun)
        }
    }, [])

    /** ---------- 搜索/获取表格数据 End ---------- */

    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "规则名",
                dataKey: "RuleName",
                render: (text) => {
                    return (
                        <div className={classNames(styles["base-col"], "yakit-content-single-ellipsis")} title={text}>
                            {text}
                        </div>
                    )
                }
            },
            {
                title: "规则类型",
                dataKey: "Purpose",
                width: 100,
                render: (text) => {
                    const setting = RuleType[text]
                    if (!setting) return "-"
                    return (
                        <div className={classNames(styles["base-col"], "yakit-content-single-ellipsis")} title={text}>
                            {setting.name}
                        </div>
                    )
                },
                filterProps: {
                    filterKey: "Purpose",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: RuleTypeList
                }
            },
            {
                title: "语言",
                dataKey: "Language",
                width: 130,
                render: (text) => {
                    const language = RuleLanguageList.find((item) => item.value === text)
                    if (!language) return "-"
                    return (
                        <div className={classNames(styles["base-col"], "yakit-content-single-ellipsis")} title={text}>
                            {language.label}
                        </div>
                    )
                },
                filterProps: {
                    filterKey: "Language",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: RuleLanguageList
                }
            },
            {
                title: "分组",
                dataKey: "GroupName",
                render: (text) => {
                    return (
                        <div className={classNames(styles["base-col"], "yakit-content-single-ellipsis")} title={text}>
                            {`${text}`}
                        </div>
                    )
                }
            },
            {
                title: "描述",
                dataKey: "Description",
                render: (text) => {
                    return (
                        <div className={classNames(styles["base-col"], "yakit-content-single-ellipsis")} title={text}>
                            {text}
                        </div>
                    )
                }
            },
            {
                title: "操作",
                dataKey: "action",
                fixed: "right",
                width: 100,
                render: (_, rowData) => {
                    const {RuleName, IsBuildInRule} = rowData
                    const isLoading = delRules.includes(RuleName)

                    if (IsBuildInRule) {
                        return (
                            <YakitButton
                                type='text2'
                                icon={<OutlinePencilaltIcon />}
                                loading={isLoading}
                                onClick={() => {
                                    handleOpenEditHint(rowData)
                                }}
                            />
                        )
                    } else {
                        return (
                            <div className={styles["col-btns"]}>
                                <YakitButton
                                    type='text2'
                                    icon={<OutlinePencilaltIcon />}
                                    loading={isLoading}
                                    onClick={() => {
                                        handleOpenEditHint(rowData)
                                    }}
                                />
                                <div className={styles["divider-style"]}></div>
                                <YakitButton
                                    type='text'
                                    colors='danger'
                                    icon={<OutlineTrashIcon />}
                                    loading={isLoading}
                                    onClick={() => {
                                        handleDelRule(rowData)
                                    }}
                                />
                            </div>
                        )
                    }
                }
            }
        ]
    }, [])

    /** ---------- 表格多选逻辑 ---------- */
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<SyntaxFlowRule[]>([])
    const selectKeys = useMemo(() => {
        return selectList.map((ele) => ele.RuleName)
    }, [selectList])

    const selectNum = useMemo(() => {
        if (allCheck) return data.Total
        else return selectList.length
    }, [allCheck, selectList, data.Total])

    const handleAllCheck = useMemoizedFn((keys: string[], selecteds: SyntaxFlowRule[], checked: boolean) => {
        if (checked) {
            setAllCheck(true)
            setSelectList(data.Rule)
        } else {
            setAllCheck(false)
            setSelectList([])
        }
    })
    const handleCheckboxChange = useMemoizedFn((checked: boolean, key: string, row: SyntaxFlowRule) => {
        if (checked) {
            setSelectList((s) => [...s, row])
        } else {
            setAllCheck(false)
            setSelectList((s) => s.filter((ele) => ele.RuleName !== row.RuleName))
        }
    })

    const handleUpdateSelected = useMemoizedFn((info: SyntaxFlowRule) => {
        const findIndex = selectList.findIndex((el) => el.RuleName === info.RuleName)
        if (findIndex > -1) {
            setSelectList((arr) => {
                arr.splice(findIndex, 1)
                return [...arr]
            })
        }
    })

    /** ---------- 导出逻辑 ---------- */
    const [exportExtra, setExportExtra] = useState<ImportExportModalExtra>({
        hint: false,
        title: "导出规则",
        type: "export",
        apiKey: "ExportSyntaxFlows"
    })

    const handleOpenExportHint = useMemoizedFn((extra: Omit<ImportExportModalExtra, "hint">) => {
        if (exportExtra.hint) return
        setExportExtra({...extra, hint: true})
    })

    const handleCallbackExportHint = useMemoizedFn((result: boolean) => {
        if (result) {
            const type = exportExtra.type
            if (type === "export") {
                handleAllCheck([], [], false)
            } else {
                handleRefreshGroup()
            }
        }
        setExportExtra((prev) => {
            return {
                ...prev,
                hint: false
            }
        })
    })

    /** ---------- 新建|编辑逻辑 ---------- */
    const editInfo = useRef<SyntaxFlowRule>()
    const [editHint, setEditHint] = useState<boolean>(false)
    const handleOpenEditHint = useMemoizedFn((info?: SyntaxFlowRule) => {
        if (editHint) return
        editInfo.current = info ? cloneDeep(info) : undefined
        setEditHint(true)
    })
    const handleCallbackEditHint = useMemoizedFn((result: boolean, info?: SyntaxFlowRule) => {
        if (result) {
            if (!info) return
            handleRefreshGroup()
        }
        handleCancelEditHint()
    })
    const handleCancelEditHint = useMemoizedFn(() => {
        editInfo.current = undefined
        setEditHint(false)
    })

    /** ---------- 删除规则逻辑 ---------- */
    const [delRules, setDelRules] = useState<string[]>([])
    const handleDelRule = useMemoizedFn((info: SyntaxFlowRule) => {
        const {RuleName} = info
        const isExist = delRules.includes(RuleName)
        if (isExist) return

        setDelRules((arr) => [...arr, RuleName])
        grpcDeleteLocalRule({Filter: {RuleNames: [RuleName]}})
            .then(() => {
                handleUpdateSelected(info)
                setData((res) => {
                    return {...res, Rule: res.Rule.filter((ele) => ele.RuleName !== RuleName), Total: res.Total - 1}
                })
                setGroupRefresh((v) => !v)
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setDelRules((arr) => arr.filter((ele) => ele !== RuleName))
                }, 200)
            })
    })

    const [delLoading, setDelLoading] = useState<boolean>(false)
    // 批量删除规则
    const handleBatchDelRule = useMemoizedFn(() => {
        if (delLoading) return

        let request: SyntaxFlowRuleFilter = {}
        if (allCheck || selectNum === 0) {
            request = cloneDeep(filters)
        }
        if (!allCheck && selectList.length > 0) {
            request.RuleNames = selectList.map((ele) => ele.RuleName)
        }

        setDelLoading(true)
        grpcDeleteLocalRule({Filter: request})
            .then(() => {
                handleAllCheck([], [], false)
                fetchList()
                setGroupRefresh((v) => !v)
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setDelLoading(false)
                }, 300)
            })
    })

    const [ruleUpdateShow, setRuleUpdateShow] = useState<boolean>(false)
    const downloadRuleUpdate = useMemoizedFn(() => {
        if (ruleUpdateShow) return
        setRuleUpdateShow(true)
    })

    /** ---------- 上传、下载规则逻辑 ---------- */
    // 权限 admin、审核员、超管支持上传、删除操作
    const canUpAndDel = useMemo(() => {
        return ["admin", "auditor", "superAdmin"].includes(userInfo.role || "")
    }, [userInfo])
    const eeIRifyIsLogin = useMemo(() => {
        return isEnpriTraceIRify() && userInfo.isLogin && userInfo.token
    }, [userInfo])

    const [infoVisible, setInfoVisible] = useState<boolean>(false)
    const infoRef = useRef<{type: string; title: string; content: string}>({type: "", title: "", content: ""})
    const [percentShow, setPercentShow] = useState<boolean>(false)
    const tokenRef = useRef<string>(randomString(40))
    const containerRef = useRef<string>(currentPageTabRouteKey)

    const handleUpload = useMemoizedFn(() => {
        tokenRef.current = randomString(40)
        grpcSyntaxFlowRuleToOnline(
            {Filter: {...cloneDeep(filters), RuleNames: allCheck ? [] : selectKeys}, Token: userInfo.token},
            tokenRef.current
        ).then((res) => {
            setInfoVisible(false)
            containerRef.current = currentPageTabRouteKey
            setPercentShow(true)
        })
    })
    const isDownloadOnlineRuleGroupRef = useRef<boolean>(false)
    const handleDownload = useMemoizedFn(() => {
        tokenRef.current = randomString(40)
        grpcDownloadSyntaxFlowRule(
            {
                Filter: isDownloadOnlineRuleGroupRef.current
                    ? {}
                    : {
                          GroupNames: onlineFilters.groupNames,
                          RuleNames: onlineAllCheck ? [] : onlineSelectKeys,
                          Language: onlineFilters.language,
                          Severity: onlineFilters.severity,
                          Purpose: onlineFilters.purpose,
                          Tag: onlineFilters.tag,
                          Keyword: onlineFilters.keyword,
                          FilterRuleKind: onlineFilters.filterRuleKind as FilterRuleKind,
                          FilterLibRuleKind: onlineFilters.filterLibRuleKind as FilterLibRuleKind
                      },
                Token: userInfo.token
            },
            tokenRef.current
        ).then((res) => {
            setInfoVisible(false)
            containerRef.current = currentPageTabRouteKey
            setPercentShow(true)
        })
    })

    /** ---------- 搜索/获取线上表格数据 Start ---------- */
    const onlineInitLoading = useRef<boolean>(false)
    const [onlineLoading, setOnlineLoading] = useState<boolean>(false)
    const [onlineFilters, setOnlineFilters] = useState<API.FlowRuleWhere>({
        filterLibRuleKind: ""
    })
    const [onlineData, setOnlineData] = useState<API.FlowRuleResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit: 20,
            total: 0,
            total_page: 0
        }
    })
    const [onlineIsRefresh, setOnlineIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0
    const handleOnlineSearch = useMemoizedFn((val: string) => {
        setOnlineFilters((filters) => {
            return {...filters, keyword: val}
        })
    })

    const [groupOnlineRefresh, setGroupOnlineRefresh] = useState<boolean>(false)
    const handleOnlineGroupChange = useMemoizedFn((groups: string[]) => {
        setOnlineFilters((filters) => {
            return {...filters, groupNames: groups}
        })
        if (groups.length) {
            // 重置本地列表查询条件 但不会查询数据
            setData({
                Rule: [],
                Pagination: {...genDefaultPagination(20)},
                Total: 0
            })
            setFilters({
                FilterLibRuleKind: ""
            })
            localRuleGroupListRef.current?.handleReset()
        } else {
            fetchList()
        }
    })

    const onlineTableHeaderTitle = useMemo(() => {
        if (!onlineFilters.groupNames) return "全部"
        if (onlineFilters.groupNames.length === 0) return "全部"
        return onlineFilters.groupNames.join(",")
    }, [onlineFilters.groupNames])

    const onTableOnlineFilterChange = useMemoizedFn(
        (page: number, limit: number, sorter: SortProps, tableFilters: any) => {
            const {purpose = undefined, language = undefined} = tableFilters
            setOnlineFilters((filters) => {
                const info = {...filters}
                if (purpose && Array.isArray(purpose)) info.purpose = [...purpose]
                if (language && Array.isArray(language)) info.language = [...language]
                return info
            })
        }
    )

    const fetchOnlineList = useDebounceFn(
        useMemoizedFn((page?: number) => {
            if (!(isCommunityIRify() || eeIRifyIsLogin)) return

            if (!onlineFilters.groupNames?.length) return
            if (onlineLoading) return

            const pagination: API.Pagination = {...DefaultOnlinePaging, page: page || 1}
            if (pagination.page === 1) {
                handleOnlineAllCheck([], [], false)
                onlineInitLoading.current = true
            }

            setOnlineLoading(true)
            httpFetchOnlineRuleList({...cloneDeep(onlineFilters), ...pagination})
                .then((res) => {
                    const {pagemeta, data} = res
                    const d = data || []
                    const rules = pagemeta.page === 1 ? d : onlineData.data.concat(d)
                    setOnlineData({
                        pagemeta: {
                            ...pagemeta,
                            page: +pagemeta.page,
                            limit: +pagemeta.limit
                        },
                        data: rules
                    })
                    if (pagemeta.page === 1) {
                        setOnlineIsRefresh((prev) => !prev)
                    }
                })
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        onlineInitLoading.current = false
                        setOnlineLoading(false)
                    }, 200)
                })
        }),
        {wait: 300}
    ).run

    useUpdateEffect(() => {
        fetchOnlineList()
    }, [onlineFilters])

    useUpdateEffect(() => {
        // 选中线上 若账号退出登录
        if (!isCommunityIRify() && !eeIRifyIsLogin && onlineFilters.groupNames?.length) {
            onlineRuleGroupListRef.current?.handleReset()
        }
    }, [eeIRifyIsLogin, onlineFilters])

    const onRefreshOnlienRuleManagementFun = useMemoizedFn(() => {
        setGroupOnlineRefresh((v) => !v)
        fetchOnlineList()
    })

    const [onlineAllCheck, setOnlineAllCheck] = useState<boolean>(false)
    const [onlineSelectList, setOnlineSelectList] = useState<API.FlowRuleDetail[]>([])
    const onlineSelectKeys = useMemo(() => {
        return onlineSelectList.map((ele) => ele.ruleName || "")
    }, [onlineSelectList])

    const onlineSelectNum = useMemo(() => {
        if (onlineAllCheck) return onlineData.pagemeta.total
        else return onlineSelectList.length
    }, [onlineAllCheck, onlineSelectList, onlineData.pagemeta.total])

    const handleOnlineAllCheck = useMemoizedFn((keys: string[], selecteds: API.FlowRuleDetail[], checked: boolean) => {
        if (checked) {
            setOnlineAllCheck(true)
            setOnlineSelectList(onlineData.data)
        } else {
            setOnlineAllCheck(false)
            setOnlineSelectList([])
        }
    })
    const handleOnlineCheckboxChange = useMemoizedFn((checked: boolean, key: string, row: API.FlowRuleDetail) => {
        if (checked) {
            setOnlineSelectList((s) => [...s, row])
        } else {
            setOnlineAllCheck(false)
            setOnlineSelectList((s) => s.filter((ele) => ele.ruleName !== row.ruleName))
        }
    })

    const handleUpdateOnlineSelected = useMemoizedFn((info: API.FlowRuleDetail) => {
        const findIndex = onlineSelectList.findIndex((el) => el.ruleName === info.ruleName)
        if (findIndex > -1) {
            setOnlineSelectList((arr) => {
                arr.splice(findIndex, 1)
                return [...arr]
            })
        }
    })
    /** ---------- 搜索/获取表格数据 End ---------- */

    /** ---------- 线上删除规则逻辑 ---------- */
    const [delOnlineRules, setDelOnlineRules] = useState<string[]>([])
    const handleDelOnlineRule = useMemoizedFn((info: API.FlowRuleDetail) => {
        const {ruleName = ""} = info
        const isExist = delOnlineRules.includes(ruleName)
        if (isExist) return

        setDelOnlineRules((arr) => [...arr, ruleName])
        httpDeleteOnlineRule({
            ...onlineFilters,
            ruleNames: [ruleName],
            ...DefaultOnlinePaging,
            page: onlineData.pagemeta.page
        })
            .then(() => {
                handleUpdateOnlineSelected(info)
                setOnlineData((res) => {
                    return {
                        ...res,
                        data: res.data.filter((ele) => ele.ruleName !== ruleName),
                        pagemeta: {...res.pagemeta, total: res.pagemeta.total === 0 ? 0 : res.pagemeta.total - 1}
                    }
                })
                setGroupOnlineRefresh((v) => !v)
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setDelOnlineRules((arr) => arr.filter((ele) => ele !== ruleName))
                }, 200)
            })
    })
    const [onlineDelLoading, setOnlineDelLoading] = useState<boolean>(false)
    // 批量删除规则
    const handleBatchDelOnlineRule = useMemoizedFn(() => {
        if (onlineDelLoading) return

        let request: API.FlowRuleWhere = {}
        if (onlineAllCheck || onlineSelectNum === 0) {
            request = cloneDeep(onlineFilters)
        }
        if (!onlineAllCheck && onlineSelectList.length > 0) {
            request.ruleNames = onlineSelectList.map((ele) => ele.ruleName || "")
        }

        setOnlineDelLoading(true)
        httpDeleteOnlineRule({...request, ...DefaultOnlinePaging, page: onlineData.pagemeta.page})
            .then(() => {
                handleOnlineAllCheck([], [], false)
                fetchOnlineList()
                setGroupOnlineRefresh((v) => !v)
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setOnlineDelLoading(false)
                }, 300)
            })
    })

    const onlineColumns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "规则名",
                dataKey: "ruleName",
                render: (text) => {
                    return (
                        <div className={classNames(styles["base-col"], "yakit-content-single-ellipsis")} title={text}>
                            {text}
                        </div>
                    )
                }
            },
            {
                title: "规则类型",
                dataKey: "purpose",
                width: 100,
                render: (text) => {
                    const setting = RuleType[text]
                    if (!setting) return "-"
                    return (
                        <div className={classNames(styles["base-col"], "yakit-content-single-ellipsis")} title={text}>
                            {setting.name}
                        </div>
                    )
                },
                filterProps: {
                    filterKey: "purpose",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: RuleTypeList
                }
            },
            {
                title: "语言",
                dataKey: "language",
                width: 130,
                render: (text) => {
                    const language = RuleLanguageList.find((item) => item.value === text)
                    if (!language) return "-"
                    return (
                        <div className={classNames(styles["base-col"], "yakit-content-single-ellipsis")} title={text}>
                            {language.label}
                        </div>
                    )
                },
                filterProps: {
                    filterKey: "language",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: RuleLanguageList
                }
            },
            {
                title: "分组",
                dataKey: "groupName",
                render: (text) => {
                    return (
                        <div className={classNames(styles["base-col"], "yakit-content-single-ellipsis")} title={text}>
                            {`${text}`}
                        </div>
                    )
                }
            },
            {
                title: "描述",
                dataKey: "description",
                render: (text) => {
                    return (
                        <div className={classNames(styles["base-col"], "yakit-content-single-ellipsis")} title={text}>
                            {text}
                        </div>
                    )
                }
            },
            {
                title: "操作",
                dataKey: "action",
                fixed: "right",
                width: 65,
                render: (_, rowData) => {
                    const {ruleName} = rowData
                    const isLoading = delOnlineRules.includes(ruleName)
                    return (
                        <div className={styles["col-btns"]}>
                            {canUpAndDel && (
                                <YakitButton
                                    type='text'
                                    colors='danger'
                                    icon={<OutlineTrashIcon />}
                                    loading={isLoading}
                                    onClick={() => {
                                        handleDelOnlineRule(rowData)
                                    }}
                                />
                            )}
                        </div>
                    )
                }
            }
        ]
    }, [delOnlineRules, canUpAndDel])

    return (
        <YakitSpin spinning={initLoading.current || onlineInitLoading.current}>
            <div ref={wrapperRef} className={styles["rule-management-page"]}>
                <div className={styles["rule-management-group"]}>
                    <div className={styles["group-list"]}>
                        <LocalRuleGroupList
                            ref={localRuleGroupListRef}
                            isrefresh={groupRefresh}
                            onGroupChange={handleGroupChange}
                            currentPageTabRouteKey={currentPageTabRouteKey}
                            canUpload={canUpAndDel}
                            userInfo={userInfo}
                            onRefreshOnlienRuleManagement={onRefreshOnlienRuleManagementFun}
                        />
                    </div>
                    <div className={styles["group-divider"]}></div>
                    <div className={styles["online-group-header"]}>
                        <span className={styles["online-group-desc"]}>
                            线上规则
                            {isCommunityIRify() || eeIRifyIsLogin ? "（下载即可使用）" : "（登录即可下载使用）"}
                        </span>
                        {(isCommunityIRify() || eeIRifyIsLogin) && (
                            <YakitButton
                                type='text'
                                icon={<OutlineClouddownloadIcon />}
                                onClick={() => {
                                    isDownloadOnlineRuleGroupRef.current = true
                                    infoRef.current = {
                                        type: "download",
                                        title: "下载提示",
                                        content: "如果规则id相同则会直接覆盖，是否确认下载"
                                    }
                                    setInfoVisible(true)
                                }}
                                style={{padding: 0}}
                            >
                                一键下载
                            </YakitButton>
                        )}
                        <YakitButton
                            type='text'
                            onClick={() => {
                                onlineRuleGroupListRef.current?.handleReset()
                            }}
                            style={{padding: 0}}
                        >
                            重置
                        </YakitButton>
                    </div>
                    <div className={styles["group-list"]}>
                        <OnlineRuleGroupList
                            ref={onlineRuleGroupListRef}
                            isrefresh={groupOnlineRefresh}
                            onGroupChange={handleOnlineGroupChange}
                            currentPageTabRouteKey={currentPageTabRouteKey}
                            canDel={canUpAndDel}
                            userInfo={userInfo}
                            onRefreshRuleManagement={onRefreshRuleManagementFun}
                        />
                    </div>
                </div>

                <div className={styles["rule-management-body"]}>
                    {!onlineFilters.groupNames?.length ? (
                        <>
                            {/* 本地规则列表 */}
                            <TableVirtualResize<SyntaxFlowRule>
                                key={"rule-local"}
                                titleHeight={68}
                                isHiddenLoadingUI={true}
                                renderTitle={
                                    <div className={styles["table-header"]}>
                                        <div className={styles["header-body"]}>
                                            <div className={styles["header-title"]}>
                                                <Tooltip placement='bottom' title={tableHeaderTitle}>
                                                    <span
                                                        className={classNames(
                                                            styles["title-style"],
                                                            "yakit-content-single-ellipsis"
                                                        )}
                                                    >
                                                        本地： {tableHeaderTitle}
                                                    </span>
                                                </Tooltip>
                                            </div>

                                            <div className={styles["header-extra"]}>
                                                <YakitInput.Search
                                                    allowClear
                                                    size='large'
                                                    placeholder='请输入关键词搜索'
                                                    onSearch={handleSearch}
                                                />
                                                <div className={styles["divider-style"]}></div>

                                                <div className={styles["btns-group"]}>
                                                    <YakitButton
                                                        type='outline1'
                                                        colors='danger'
                                                        icon={<OutlineTrashIcon />}
                                                        loading={delLoading}
                                                        onClick={handleBatchDelRule}
                                                    />

                                                    <YakitButton
                                                        type='outline2'
                                                        icon={<OutlineExportIcon />}
                                                        onClick={() =>
                                                            handleOpenExportHint({
                                                                title: "导出规则",
                                                                type: "export",
                                                                apiKey: "ExportSyntaxFlows"
                                                            })
                                                        }
                                                    >
                                                        导出
                                                    </YakitButton>

                                                    <YakitButton
                                                        type='outline2'
                                                        icon={<OutlineImportIcon />}
                                                        onClick={() =>
                                                            handleOpenExportHint({
                                                                title: "导入规则",
                                                                type: "import",
                                                                apiKey: "ImportSyntaxFlows"
                                                            })
                                                        }
                                                    >
                                                        导入
                                                    </YakitButton>

                                                    {canUpAndDel && (
                                                        <YakitButton
                                                            type='outline2'
                                                            icon={<OutlineClouduploadIcon />}
                                                            onClick={() => {
                                                                infoRef.current = {
                                                                    type: "upload",
                                                                    title: "上传提示",
                                                                    content: "如果存在同名规则库，会直接覆盖"
                                                                }
                                                                setInfoVisible(true)
                                                            }}
                                                        >
                                                            上传
                                                        </YakitButton>
                                                    )}

                                                    <YakitButton
                                                        type='outline2'
                                                        icon={<OutlinePlusIcon />}
                                                        onClick={() => {
                                                            handleOpenEditHint()
                                                        }}
                                                    >
                                                        新建
                                                    </YakitButton>

                                                    <YakitButton
                                                        icon={<RefreshIcon />}
                                                        onClick={() => {
                                                            downloadRuleUpdate()
                                                        }}
                                                    >
                                                        重置内置规则
                                                    </YakitButton>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles["header-body"]}>
                                            <div className={styles["header-title"]}>
                                                <TableTotalAndSelectNumber total={data.Total} selectNum={selectNum} />
                                            </div>
                                            <div className={styles["header-extra"]}>
                                                <UpdateRuleToGroup
                                                    allCheck={allCheck}
                                                    rules={selectList}
                                                    filters={filters}
                                                    callback={handleRefreshGroup}
                                                />
                                                <YakitCheckbox
                                                    checked={filters.FilterLibRuleKind !== "noLib"}
                                                    onChange={(e) => handleCheckLib(e.target.checked)}
                                                >
                                                    显示Lib规则
                                                </YakitCheckbox>
                                            </div>
                                        </div>
                                    </div>
                                }
                                rowSelection={{
                                    isAll: allCheck,
                                    type: "checkbox",
                                    selectedRowKeys: selectKeys,
                                    onSelectAll: handleAllCheck,
                                    onChangeCheckboxSingle: handleCheckboxChange
                                }}
                                isRefresh={isRefresh}
                                pagination={{
                                    total: data.Total,
                                    limit: data.Pagination.Limit,
                                    page: data.Pagination.Page,
                                    onChange: fetchList
                                }}
                                containerClassName={styles["table-body"]}
                                loading={loading}
                                renderKey='RuleName'
                                data={data.Rule}
                                columns={columns}
                                query={filters}
                                onChange={onTableFilterChange}
                                enableDrag={true}
                            />
                        </>
                    ) : (
                        <>
                            {/* 线上规则列表 */}
                            <TableVirtualResize<API.FlowRuleDetail>
                                key={"rule-online"}
                                titleHeight={68}
                                isHiddenLoadingUI={true}
                                renderTitle={
                                    <div className={styles["table-header"]}>
                                        <div className={styles["header-body"]}>
                                            <div className={styles["header-title"]}>
                                                <Tooltip placement='bottom' title={onlineTableHeaderTitle}>
                                                    <span
                                                        className={classNames(
                                                            styles["title-style"],
                                                            "yakit-content-single-ellipsis"
                                                        )}
                                                    >
                                                        线上： {onlineTableHeaderTitle}
                                                    </span>
                                                </Tooltip>
                                            </div>

                                            <div className={styles["header-extra"]}>
                                                <YakitInput.Search
                                                    size='large'
                                                    allowClear
                                                    placeholder='请输入关键词搜索'
                                                    onSearch={handleOnlineSearch}
                                                />
                                                <div className={styles["divider-style"]}></div>

                                                <div className={styles["btns-group"]}>
                                                    {canUpAndDel && (
                                                        <YakitButton
                                                            type='outline1'
                                                            colors='danger'
                                                            icon={<OutlineTrashIcon />}
                                                            loading={onlineDelLoading}
                                                            onClick={handleBatchDelOnlineRule}
                                                        />
                                                    )}
                                                    <YakitButton
                                                        type='primary'
                                                        icon={<OutlineClouddownloadIcon />}
                                                        onClick={() => {
                                                            isDownloadOnlineRuleGroupRef.current = false
                                                            infoRef.current = {
                                                                type: "download",
                                                                title: "下载提示",
                                                                content: "如果规则id相同则会直接覆盖，是否确认下载"
                                                            }
                                                            setInfoVisible(true)
                                                        }}
                                                    >
                                                        {selectNum > 0 && !onlineAllCheck ? "下载" : "一键下载"}
                                                    </YakitButton>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles["header-body"]}>
                                            <div className={styles["header-title"]}>
                                                <TableTotalAndSelectNumber
                                                    total={onlineData.pagemeta.total}
                                                    selectNum={onlineSelectNum}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                }
                                rowSelection={{
                                    isAll: onlineAllCheck,
                                    type: "checkbox",
                                    selectedRowKeys: onlineSelectKeys,
                                    onSelectAll: handleOnlineAllCheck,
                                    onChangeCheckboxSingle: handleOnlineCheckboxChange
                                }}
                                isRefresh={onlineIsRefresh}
                                pagination={{
                                    total: onlineData.pagemeta.total,
                                    limit: onlineData.pagemeta.limit,
                                    page: onlineData.pagemeta.page,
                                    onChange: fetchOnlineList
                                }}
                                containerClassName={styles["table-body"]}
                                loading={onlineLoading}
                                renderKey='ruleName'
                                data={onlineData.data}
                                columns={onlineColumns}
                                query={onlineFilters}
                                onChange={onTableOnlineFilterChange}
                                enableDrag={true}
                            />
                        </>
                    )}
                </div>

                <ImportExportModal<SyntaxFlowRuleFilter>
                    getContainer={wrapperRef.current || undefined}
                    whichUse='rule'
                    extra={exportExtra}
                    onCallback={handleCallbackExportHint}
                    filterData={{
                        ...cleanObject(
                            transformFilterData({
                                ...filters,
                                RuleNames: selectKeys,
                                allCheck
                            })
                        )
                    }}
                />

                <EditRuleDrawer
                    getContainer={wrapperRef.current || undefined}
                    info={editInfo.current}
                    visible={editHint}
                    onCallback={handleCallbackEditHint}
                />

                <IRifyApplySyntaxFlowRuleUpdate
                    visible={ruleUpdateShow}
                    setVisible={(v) => {
                        setRuleUpdateShow(v)
                    }}
                    getContainer={
                        document.getElementById(`main-operator-page-body-${YakitRoute.Rule_Management}`) || undefined
                    }
                    wrapClassName={styles['updateRuleModal']}
                />

                {/* 上传、下载提示 */}
                <YakitHint
                    visible={infoVisible}
                    title={infoRef.current.title}
                    content={infoRef.current.content}
                    okButtonText='确认'
                    mask={true}
                    onOk={() => {
                        if (infoRef.current.type === "upload") {
                            handleUpload()
                        } else {
                            handleDownload()
                        }
                    }}
                    onCancel={() => {
                        setInfoVisible(false)
                    }}
                ></YakitHint>
                {percentShow && (
                    <RuleUploadAndDownloadModal
                        getContainer={
                            document.getElementById(`main-operator-page-body-${containerRef.current}`) || undefined
                        }
                        type={infoRef.current.type}
                        apiKey={infoRef.current.type === "upload" ? "SyntaxFlowRuleToOnline" : "DownloadSyntaxFlowRule"}
                        token={tokenRef.current}
                        onCancel={() => {
                            setPercentShow(false)
                        }}
                        onSuccess={() => {
                            if (infoRef.current.type === "download") {
                                onRefreshRuleManagementFun()
                            } else {
                                onRefreshOnlienRuleManagementFun()
                            }
                        }}
                    ></RuleUploadAndDownloadModal>
                )}
            </div>
        </YakitSpin>
    )
})
