import React, {useEffect, useState} from "react"
import {defQueryRisksRequest} from "./YakitRiskTable/constants"
import {QueryRisksRequest} from "./YakitRiskTable/YakitRiskTableType"
import {YakitRiskTable} from "./YakitRiskTable/YakitRiskTable"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {useMemoizedFn} from "ahooks"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineCloseIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {FieldGroup} from "./YakitRiskTable/utils"
import styles from "./RiskMisstatement.module.scss"

interface RiskMisstatementProp {}
export const RiskMisstatement: React.FC<RiskMisstatementProp> = (props) => {
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [riskLoading, setRiskLoading] = useState<boolean>(false)
    const [query, setQuery] = useState<QueryRisksRequest>({
        ...defQueryRisksRequest
    })

    // 获取筛选展示状态
    useEffect(() => {
        getRemoteValue(RemoteGV.MisstatementQueryShow).then((value: string) => {
            setAdvancedQuery(value !== "false")
        })
    }, [])
    const onSetQueryShow = useMemoizedFn((val) => {
        setAdvancedQuery(val)
        setRemoteValue(RemoteGV.MisstatementQueryShow, `${val}`)
    })

    return (
        <div className={styles["misstatement-page"]}>
            <MisstatementQuery advancedQuery={advancedQuery} setAdvancedQuery={onSetQueryShow} />
            <YakitRiskTable
                misstatementPage={true}
                query={query}
                setQuery={setQuery}
                advancedQuery={advancedQuery}
                setAdvancedQuery={onSetQueryShow}
                setRiskLoading={setRiskLoading}
                excludeColumnsKey={["action"]}
            />
        </div>
    )
}

interface MisstatementQueryProps {
    advancedQuery: boolean
    setAdvancedQuery: (b: boolean) => void
}
const MisstatementQuery: React.FC<MisstatementQueryProps> = React.memo((props) => {
    const {advancedQuery, setAdvancedQuery} = props

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
                    list={[
                        {Name: "1", Total: 1},
                        {Name: "2", Total: 2}
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
    list: FieldGroup[]
    selectList: string[]
    onSelect: (v: FieldGroup) => void
    onRefresh: () => void
}
const MisstatementList: React.FC<MisstatementListProps> = React.memo((props) => {
    const {list, onSelect, selectList, onRefresh} = props

    return (
        <div className={styles["misstatement-list-body"]}>
            <div className={styles["misstatement-list-heard"]}>
                <div className={styles["misstatement-list-heard-title"]}>插件误报数统计</div>
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
            <div className={styles["misstatement-list-item-label"]}>
                {item.Name}
            </div>
            <div className={styles["misstatement-list-item-value"]}>{item.Total}</div>
        </div>
    )
})
