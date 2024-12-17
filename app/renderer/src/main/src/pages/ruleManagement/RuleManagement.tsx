import React, {memo, useMemo, useRef, useState} from "react"
import {useDebounceEffect, useDebounceFn, useMemoizedFn} from "ahooks"
import {
    QuerySyntaxFlowRuleResponse,
    RuleManagementProps,
    SyntaxFlowRule,
    SyntaxFlowRuleFilter
} from "./RuleManagementType"
import {EditRuleDrawer, LocalRuleGroupList, RuleImportExportModal, UpdateRuleToGroup} from "./template"
import {
    OutlineExclamationIcon,
    OutlineExportIcon,
    OutlineEyeIcon,
    OutlineImportIcon,
    OutlinePencilaltIcon,
    OutlinePlusIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {WaterMark} from "@ant-design/pro-layout"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {isCommunityEdition} from "@/utils/envfile"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import cloneDeep from "lodash/cloneDeep"
import {genDefaultPagination} from "../invoker/schema"
import {grpcDeleteLocalRule, grpcFetchLocalRuleList} from "./api"
import {RuleLanguageList, RuleLevel, RuleLevelList} from "@/defaultConstants/RuleManagement"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {Tooltip} from "antd"

import classNames from "classnames"
import styles from "./RuleManagement.module.scss"

const DefaultPaging: Paging = {Page: 1, Limit: 20, OrderBy: "updated_at", Order: "desc"}

/** @name 规则管理 */
export const RuleManagement: React.FC<RuleManagementProps> = memo((props) => {
    const {} = props

    const wrapperRef = useRef<HTMLDivElement>(null)

    const waterMarkStr = useMemo(() => {
        if (isCommunityEdition()) {
            return "Yakit技术浏览版仅供技术交流使用"
        }
        return " "
    }, [])

    /** ---------- 搜索/获取表格数据 Start ---------- */
    const [loading, setLoading] = useState<boolean>(false)
    const [filters, setFilters] = useState<SyntaxFlowRuleFilter>({})
    const [data, setData] = useState<QuerySyntaxFlowRuleResponse>({
        Rule: [],
        Pagination: {...genDefaultPagination(20)},
        Total: 0
    })
    const [isRefresh, setIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0

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
    })
    const tableHeaderTitle = useMemo(() => {
        if (!filters.GroupNames) return "全部"
        if (filters.GroupNames.length === 0) return "全部"
        return filters.GroupNames.join(",")
    }, [filters.GroupNames])

    // 清空选中并刷新列表和规则组数据
    const handleRefreshGroup = useMemoizedFn(() => {
        setAllCheck(false)
        setSelectList([])
        setGroupRefresh((v) => !v)
        fetchList()
    })

    const onTableFilterChange = useMemoizedFn((page: number, limit: number, sorter: SortProps, tableFilters: any) => {
        const {Severity = undefined, Language = undefined} = tableFilters
        setFilters((filters) => {
            const info = {...filters}
            if (Severity && Array.isArray(Severity)) info.Severity = [...Severity]
            if (Language && Array.isArray(Language)) info.Language = [...Language]
            return info
        })
    })

    const fetchList = useDebounceFn(
        (page?: number) => {
            if (loading) return

            const pagination: Paging = {...DefaultPaging, Page: page || 1}
            setLoading(true)
            grpcFetchLocalRuleList({Pagination: pagination, Filter: cloneDeep(filters)})
                .then((res) => {
                    const {Pagination, Rule, Total} = res
                    console.log("QuerySyntaxFlowRule-response", res)
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
                        setLoading(false)
                    }, 200)
                })
        },
        {wait: 300}
    ).run

    useDebounceEffect(
        () => {
            fetchList()
        },
        [filters],
        {wait: 300}
    )

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
                title: "风险等级",
                dataKey: "Severity",
                width: 100,
                render: (text) => {
                    const setting = RuleLevel[text]
                    if (!setting) return "-"
                    return (
                        <YakitTag color={setting.color} className={styles["col-level-tag"]}>
                            <OutlineExclamationIcon />
                            {setting.name}
                        </YakitTag>
                    )
                },
                filterProps: {
                    filterKey: "Severity",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: RuleLevelList
                }
            },
            {
                title: "描述",
                dataKey: "Description",
                ellipsis: true
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
                title: "语言",
                dataKey: "Language",
                filterProps: {
                    filterKey: "Language",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: RuleLanguageList
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
                                type='text'
                                icon={<OutlineEyeIcon />}
                                onClick={() => {
                                    handleOpenEditHint(rowData)
                                }}
                            >
                                查看
                            </YakitButton>
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
            setSelectList((s) => s.filter((ele) => ele.RuleName !== row.RuleName))
        }
    })

    /** ---------- 导出逻辑 ---------- */
    const [exportHint, setExportHint] = useState<boolean>(false)
    const handleOpenExportHint = useMemoizedFn(() => {
        if (exportHint) return
        setExportHint(true)
    })
    const handleCallbackExportHint = useMemoizedFn((result: boolean) => {
        if (result) {
        }
        handleCancelExportHint()
    })
    const handleCancelExportHint = useMemoizedFn(() => {
        setExportHint(false)
    })
    /** ---------- 导入逻辑 ---------- */

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
            fetchList()
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
                setData((res) => {
                    return {...res, Rule: res.Rule.filter((ele) => ele.RuleName !== RuleName), Total: res.Total - 1}
                })
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
        if (allCheck) {
            request = cloneDeep(filters)
        }
        if (!allCheck && selectList.length > 0) {
            request.RuleNames = selectList.map((ele) => ele.RuleName)
        }

        setDelLoading(true)
        grpcDeleteLocalRule({Filter: request})
            .then(() => {
                fetchList()
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setDelLoading(false)
                }, 300)
            })
    })

    return (
        <WaterMark content={waterMarkStr} className={styles["water-mark"]}>
            <div ref={wrapperRef} className={styles["rule-management-page"]}>
                <div className={styles["rule-management-group"]}>
                    <div className={styles["group-list"]}>
                        <LocalRuleGroupList isrefresh={groupRefresh} onGroupChange={handleGroupChange} />
                    </div>

                    {/* <div className={styles["group-divider"]}></div>

                <div className={styles["group-list"]}></div> */}
                </div>

                <div className={styles["rule-management-body"]}>
                    <TableVirtualResize<SyntaxFlowRule>
                        titleHeight={68}
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
                                                {tableHeaderTitle}
                                            </span>
                                        </Tooltip>
                                    </div>

                                    <div className={styles["header-extra"]}>
                                        <YakitInput.Search
                                            size='large'
                                            allowClear={true}
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
                                                onClick={handleOpenExportHint}
                                            >
                                                导出
                                            </YakitButton>

                                            <YakitButton type='outline2' icon={<OutlineImportIcon />}>
                                                导入
                                            </YakitButton>

                                            <YakitButton
                                                icon={<OutlinePlusIcon />}
                                                onClick={() => {
                                                    handleOpenEditHint()
                                                }}
                                            >
                                                新建
                                            </YakitButton>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles["header-body"]}>
                                    <div className={styles["header-title"]}>
                                        <TableTotalAndSelectNumber total={data.Total} selectNum={selectNum} />
                                    </div>

                                    <UpdateRuleToGroup
                                        allCheck={allCheck}
                                        rules={selectList}
                                        filters={filters}
                                        callback={handleRefreshGroup}
                                    />
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
                    />
                </div>

                <RuleImportExportModal
                    getContainer={wrapperRef.current || undefined}
                    visible={exportHint}
                    onCallback={handleCallbackExportHint}
                />

                <EditRuleDrawer
                    getContainer={wrapperRef.current || undefined}
                    info={editInfo.current}
                    visible={editHint}
                    onCallback={handleCallbackEditHint}
                />
            </div>
        </WaterMark>
    )
})
