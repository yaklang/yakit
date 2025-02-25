import React, {useEffect, useRef, useState} from "react"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useMemoizedFn} from "ahooks"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineCloseIcon, OutlineOpenIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {FieldGroup} from "../risks/YakitRiskTable/utils"
import {RemoteMisstatementGV} from "@/enums/misstatement"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {MisstatementRiskTable} from "./MisstatementRiskTable/MisstatementRiskTable"
import {
    MisstatementRiskTableRefProps,
    RiskFeedBackPage,
    RiskFeedBackRequest
} from "./MisstatementRiskTable/MisstatementRiskTableType"
import {MisstatementAuditHoleTable} from "./MisstatementAuditHoleTable/MisstatementAuditHoleTable"
import {API} from "@/services/swagger/resposeType"
import {defSSARiskWhereRequest} from "./MisstatementAuditHoleTable/constants"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {defRiskFeedBackPage} from "./MisstatementRiskTable/constants"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {MisstatementAuditHoleTableRefProps} from "./MisstatementAuditHoleTable/MisstatementAuditHoleTableType"
import styles from "./Misstatement.module.scss"

const batchRefreshMenuData: YakitMenuItemProps[] = [
    {
        key: "noResetRefresh",
        label: "仅刷新"
    },
    {
        key: "resetRefresh",
        label: "重置查询条件刷新"
    }
]

type TableType = "risk" | "auditHole"
interface MisstatementProp {}
export const Misstatement: React.FC<MisstatementProp> = (props) => {
    const [tableType, setTableType] = useState<TableType>("risk")
    const riskRef = useRef<MisstatementRiskTableRefProps>(null)
    const auditHoleRef = useRef<MisstatementAuditHoleTableRefProps>(null)
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [query, setQuery] = useState<RiskFeedBackRequest>({})
    const [pageParams, setPageParams] = useState<RiskFeedBackPage>(defRiskFeedBackPage)
    const [auditHoleQuery, setAuditHoleQuery] = useState<API.SSARiskWhereRequest>({...defSSARiskWhereRequest})
    const [keywords, setKeywords] = useState<string>("")

    const onSearch = useMemoizedFn((val) => {
        if (tableType === "risk") {
            setQuery({
                ...query,
                search: val
            })
        } else {
            setAuditHoleQuery({
                ...auditHoleQuery,
                search: val
            })
        }
    })
    const onPressEnter = useMemoizedFn(() => {
        onSearch(keywords)
    })

    const onRefreshMenuSelect = useMemoizedFn((key: string) => {
        switch (key) {
            case "noResetRefresh":
                noResetRefresh()
                break
            case "resetRefresh":
                resetRefresh()
                break
            default:
                break
        }
    })
    const noResetRefresh = useMemoizedFn(() => {
        if (tableType === "risk") {
            riskRef.current && riskRef.current.update(1)
        } else {
            auditHoleRef.current && auditHoleRef.current.update(1)
        }
    })
    const resetRefresh = useMemoizedFn(() => {
        setKeywords("")
        if (tableType === "risk") {
            setPageParams(defRiskFeedBackPage)
            setQuery({})
        } else {
            setAuditHoleQuery({...defSSARiskWhereRequest})
        }
    })

    // 获取筛选展示状态
    useEffect(() => {
        getRemoteValue(RemoteMisstatementGV.MisstatementQueryShow).then((value: string) => {
            setAdvancedQuery(value !== "false")
        })
    }, [])
    const onSetQueryShow = useMemoizedFn((val) => {
        setAdvancedQuery(val)
        setRemoteValue(RemoteMisstatementGV.MisstatementQueryShow, `${val}`)
    })
    const onExpend = useMemoizedFn(() => {
        setAdvancedQuery(true)
    })

    return (
        <div className={styles["misstatement-page"]}>
            <MisstatementQuery tableType={tableType} advancedQuery={advancedQuery} setAdvancedQuery={onSetQueryShow} />
            <div
                className={styles["misstatement-page-right"]}
                style={{width: advancedQuery ? "calc(100% - 300px)" : "100%"}}
            >
                <div className={styles["renderTitle-wrapper"]}>
                    <div className={styles["renderTitle-wrapper-left"]}>
                        {!advancedQuery && (
                            <Tooltip title='展开筛选' placement='topLeft' overlayClassName='plugins-tooltip'>
                                <YakitButton
                                    type='text2'
                                    onClick={onExpend}
                                    icon={<OutlineOpenIcon />}
                                ></YakitButton>
                            </Tooltip>
                        )}
                        <div className={styles["renderTitle-text"]}>误报提交记录</div>
                        <YakitRadioButtons
                            value={tableType}
                            onChange={(e) => {
                                setKeywords("")
                                setPageParams(defRiskFeedBackPage)
                                setQuery({})
                                setAuditHoleQuery({...defSSARiskWhereRequest})
                                setTableType(e.target.value)
                            }}
                            buttonStyle='solid'
                            options={[
                                {
                                    value: "risk",
                                    label: "插件"
                                },
                                {
                                    value: "auditHole",
                                    label: "规则"
                                }
                            ]}
                        />
                        <div className={styles["virtual-table-heard-right"]}>
                            <div className={styles["virtual-table-heard-right-item"]}>
                                <span className={styles["virtual-table-heard-right-text"]}>Total</span>
                                <span className={styles["virtual-table-heard-right-number"]}>
                                    {tableType === "risk" &&
                                        riskRef.current &&
                                        riskRef.current.tableResponse.pagemeta.total}
                                    {tableType === "auditHole" &&
                                        auditHoleRef.current &&
                                        auditHoleRef.current.tableResponse.pagemeta.total}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className={styles["renderTitle-wrapper-right"]}>
                        <YakitInput.Search
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            placeholder='请输入关键词搜索'
                            onSearch={onSearch}
                            onPressEnter={onPressEnter}
                        />
                        <YakitDropdownMenu
                            menu={{
                                data: batchRefreshMenuData,
                                onClick: ({key}) => {
                                    onRefreshMenuSelect(key)
                                }
                            }}
                            dropdown={{
                                trigger: ["hover"],
                                placement: "bottom"
                            }}
                        >
                            <YakitButton type='text2' icon={<OutlineRefreshIcon />} />
                        </YakitDropdownMenu>
                    </div>
                </div>
                <div className={styles["misstatement-table"]}>
                    {tableType === "risk" ? (
                        <MisstatementRiskTable
                            ref={riskRef}
                            pageParams={pageParams}
                            setPageParams={setPageParams}
                            query={query}
                            setQuery={setQuery}
                        />
                    ) : (
                        <MisstatementAuditHoleTable
                            ref={auditHoleRef}
                            query={auditHoleQuery}
                            setQuery={setAuditHoleQuery}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

interface MisstatementQueryProps {
    tableType: TableType
    advancedQuery: boolean
    setAdvancedQuery: (b: boolean) => void
}
const MisstatementQuery: React.FC<MisstatementQueryProps> = React.memo((props) => {
    const {tableType, advancedQuery, setAdvancedQuery} = props

    const onClose = useMemoizedFn(() => {
        setAdvancedQuery(false)
    })

    return (
        <div
            className={classNames(styles["misstatement-query"], {
                [styles["misstatement-query-hidden"]]: !advancedQuery
            })}
        >
            <div className={styles["misstatement-query-heard"]}>
                <span>高级查询</span>
                <Tooltip title='收起筛选' placement='top' overlayClassName='plugins-tooltip'>
                    <YakitButton type='text2' onClick={onClose} icon={<OutlineCloseIcon />}></YakitButton>
                </Tooltip>
            </div>
            <div className={styles["misstatement-query-body"]}>
                <MisstatementList
                    tableType={tableType}
                    list={[
                        {Name: "2", Total: 2},
                        {Name: "1", Total: 1}
                    ]}
                    selectList={[]}
                    onSelect={(v) => {}}
                    onRefresh={() => {}}
                />
                <div className={styles["to-end"]}>已经到底啦～</div>
            </div>
        </div>
    )
})

interface MisstatementListProps {
    tableType: TableType
    list: FieldGroup[]
    selectList: string[]
    onSelect: (v: FieldGroup) => void
    onRefresh: () => void
}
const MisstatementList: React.FC<MisstatementListProps> = React.memo((props) => {
    const {tableType, list, onSelect, selectList, onRefresh} = props

    return (
        <div className={styles["misstatement-list-body"]}>
            <div className={styles["misstatement-list-heard"]}>
                <div className={styles["misstatement-list-heard-title"]}>
                    {tableType === "risk" ? "插件" : "规则"}误报数统计
                </div>
                <YakitButton
                    type='text2'
                    className={styles["btn-padding-right-0"]}
                    icon={<OutlineRefreshIcon />}
                    onClick={onRefresh}
                />
            </div>
            <div className={styles["misstatement-list-content"]}>
                <RollingLoadList<FieldGroup>
                    data={list}
                    page={-1}
                    hasMore={false}
                    loadMoreData={() => {}}
                    loading={false}
                    rowKey='value'
                    defItemHeight={32}
                    renderRow={(record, index: number) => (
                        <MisstatementListItem
                            item={record}
                            onSelect={onSelect}
                            isSelect={selectList.includes(record.Name)}
                        />
                    )}
                />
            </div>
        </div>
    )
})
interface MisstatementListItemProps {
    item: FieldGroup
    isSelect: boolean
    onSelect: (v: FieldGroup) => void
}
const MisstatementListItem: React.FC<MisstatementListItemProps> = React.memo((props) => {
    const {item, onSelect, isSelect} = props
    return (
        <div
            className={classNames(styles["misstatement-list-item"], {
                [styles["misstatement-list-item-active"]]: isSelect
            })}
            // onClick={() => onSelect(item)}
        >
            <div className={styles["misstatement-list-item-label"]}>{item.Name}</div>
            <div className={styles["misstatement-list-item-value"]}>{item.Total}</div>
        </div>
    )
})
