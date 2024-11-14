import React, {useEffect, useState} from "react"
import {defQueryRisksRequest} from "../risks/YakitRiskTable/constants"
import {QueryRisksRequest} from "../risks/YakitRiskTable/YakitRiskTableType"
import {YakitRiskTable} from "../risks/YakitRiskTable/YakitRiskTable"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useMemoizedFn} from "ahooks"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineCloseIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {FieldGroup} from "../risks/YakitRiskTable/utils"
import styles from "./Misstatement.module.scss"
import {RemoteMisstatementGV} from "@/enums/misstatement"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitAuditHoleTable} from "../yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTable"
import {SSARisksFilter} from "../yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"

type TableType = "risk" | "auditHole"
interface MisstatementProp {}
export const Misstatement: React.FC<MisstatementProp> = (props) => {
    const [tableType, setTableType] = useState<TableType>("risk")
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [riskLoading, setRiskLoading] = useState<boolean>(false)
    const [query, setQuery] = useState<QueryRisksRequest>({
        ...defQueryRisksRequest
    })

    const [auditHoleQuery, setAuditHoleQuery] = useState<SSARisksFilter>({})

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

    return (
        <div className={styles["misstatement-page"]}>
            <MisstatementQuery tableType={tableType} advancedQuery={advancedQuery} setAdvancedQuery={onSetQueryShow} />
            <div
                className={styles["misstatement-page-right"]}
                style={{width: advancedQuery ? "calc(100% - 300px)" : "100%"}}
            >
                <div className={styles["renderTitle-wrapper"]}>
                    <div className={styles["renderTitle-text"]}>误报提交记录</div>
                    <YakitRadioButtons
                        value={tableType}
                        onChange={(e) => {
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
                </div>
                <div className={styles["misstatement-table"]}>
                    {tableType === "risk" ? (
                        <YakitRiskTable
                            misstatementPage={true}
                            query={query}
                            setQuery={setQuery}
                            advancedQuery={advancedQuery}
                            setAdvancedQuery={onSetQueryShow}
                            setRiskLoading={setRiskLoading}
                            excludeColumnsKey={["action"]}
                        />
                    ) : (
                        <YakitAuditHoleTable
                            misstatementPage={true}
                            query={auditHoleQuery}
                            setQuery={setAuditHoleQuery}
                            advancedQuery={advancedQuery}
                            setAdvancedQuery={onSetQueryShow}
                            setRiskLoading={setRiskLoading}
                            excludeColumnsKey={["action"]}
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
