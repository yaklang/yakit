import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {
    QuerySyntaxFlowRuleResponse,
    RuleManagementProps,
    SyntaxFlowRule,
    SyntaxFlowRuleFilter
} from "./RuleManagementType"
import {EditRuleDrawer, LocalRuleGroupList, RuleImportExportModal} from "./template"
import {
    OutlineExclamationIcon,
    OutlineExportIcon,
    OutlineEyeIcon,
    OutlineImportIcon,
    OutlinePencilIcon,
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
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"

import classNames from "classnames"
import styles from "./RuleManagement.module.scss"
import {genDefaultPagination} from "../invoker/schema"
import {grpcFetchLocalRuleList} from "./api"
import {RuleLanguageList, RuleLevel, RuleLevelList} from "@/defaultConstants/RuleManagement"

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

    const [loading, setLoading] = useState<boolean>(false)
    const [filters, setFilters] = useState<any>({})

    const [response, setResponse] = useState<QuerySyntaxFlowRuleResponse>({
        Rule: [],
        Pagination: {...genDefaultPagination(20)},
        Total: 0
    })

    const fetchList = useMemoizedFn(() => {
        if (loading) return

        const pagination = {Page: 1, Limit: 20, OrderBy: "id", Order: "desc"}
        const filters: SyntaxFlowRuleFilter = {}

        setLoading(true)
        grpcFetchLocalRuleList({Pagination: pagination, Filter: filters})
            .then((res) => {
                const {Pagination, Rule, Total} = res
                console.log("QuerySyntaxFlowRule-response", res)
                setResponse({Pagination, Rule, Total})
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
    }, [])

    const onChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {})

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
                title: "风险类型",
                dataKey: "Type",
                render: (text) => {
                    return <div className={styles["base-col"]}>{text}</div>
                }
            },
            {
                title: "等级",
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
                dataKey: "GroupName"
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
                    const {IsBuildInRule} = rowData
                    if (IsBuildInRule) {
                        return (
                            <YakitButton type='text' icon={<OutlineEyeIcon />}>
                                查看
                            </YakitButton>
                        )
                    } else {
                        return (
                            <div className={styles["col-btns"]}>
                                <YakitButton type='text2' icon={<OutlinePencilIcon />} />
                                <div className={styles["divider-style"]}></div>
                                <YakitButton type='text' colors='danger' icon={<OutlineTrashIcon />} />
                            </div>
                        )
                    }
                }
            }
        ]
    }, [])

    /** ---------- 表格多选逻辑 ---------- */
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectedKeys, setSelectedKeys] = useState<string[]>([])

    const handleAllCheck = useMemoizedFn((keys: string[], selecteds: any[], checked: boolean) => {
        if (checked) {
            setAllCheck(true)
            setSelectedKeys([])
        } else {
            setAllCheck(false)
            setSelectedKeys([])
        }
    })
    const handleCheckboxChange = useMemoizedFn((checked: boolean, key: string, row: any) => {
        if (checked) {
            setSelectedKeys((s) => [...s])
        } else {
            setSelectedKeys((s) => s.filter((ele) => ele))
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
    const isEdit = useRef<SyntaxFlowRule>(false)
    const [editHint, setEditHint] = useState<boolean>(false)
    const handleOpenEditHint = useMemoizedFn(() => {
        if (editHint) return
        setEditHint(true)
    })
    const handleCallbackEditHint = useMemoizedFn((result: boolean) => {
        if (result) {
        }
        handleCancelEditHint()
    })
    const handleCancelEditHint = useMemoizedFn(() => {
        isEdit.current = false
        setEditHint(false)
    })

    return (
        <WaterMark content={waterMarkStr} className={styles["water-mark"]}>
            <div ref={wrapperRef} className={styles["rule-management-page"]}>
                <div className={styles["rule-management-group"]}>
                    <div className={styles["group-list"]}>
                        <LocalRuleGroupList onGroupChange={() => {}} />
                    </div>

                    {/* <div className={styles["group-divider"]}></div>

                <div className={styles["group-list"]}></div> */}
                </div>

                <div className={styles["rule-management-body"]}>
                    <TableVirtualResize<SyntaxFlowRule>
                        titleHeight={24}
                        renderTitle={
                            <div className={styles["table-header"]}>
                                <div className={styles["header-title"]}>
                                    <span className={styles["title-style"]}>全部</span>
                                    <TableTotalAndSelectNumber total={response.Total} selectNum={1} />
                                </div>

                                <div className={styles["header-extra"]}>
                                    <YakitInput.Search
                                        size='large'
                                        allowClear={true}
                                        placeholder='请输入关键词搜索'
                                        onSearch={() => {}}
                                    />
                                    <div className={styles["divider-style"]}></div>

                                    <div className={styles["btns-group"]}>
                                        <YakitButton type='outline1' colors='danger' icon={<OutlineTrashIcon />} />

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

                                        <YakitButton icon={<OutlinePlusIcon />} onClick={handleOpenEditHint}>
                                            新建
                                        </YakitButton>
                                    </div>
                                </div>
                            </div>
                        }
                        rowSelection={{
                            isAll: allCheck,
                            type: "checkbox",
                            selectedRowKeys: selectedKeys,
                            onSelectAll: handleAllCheck,
                            onChangeCheckboxSingle: handleCheckboxChange
                        }}
                        containerClassName={styles["table-body"]}
                        loading={loading}
                        renderKey='RuleName'
                        data={response.Rule}
                        columns={columns}
                        query={filters}
                        onChange={onChange}
                    />
                </div>

                <RuleImportExportModal
                    getContainer={wrapperRef.current || undefined}
                    visible={exportHint}
                    onCallback={handleCallbackExportHint}
                />

                <EditRuleDrawer
                    getContainer={wrapperRef.current || undefined}
                    visible={editHint}
                    onCallback={handleCallbackEditHint}
                />
            </div>
        </WaterMark>
    )
})
