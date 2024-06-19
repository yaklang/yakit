import React, {useEffect, useRef, useState} from "react"
import {RiskTable} from "./RiskTable"
import {
    IPListItemProps,
    IPListProps,
    RiskPageProp,
    RiskQueryProps,
    VulnerabilityLevelProps,
    VulnerabilityTypeProps
} from "./RiskPageType"
import styles from "./RiskPage.module.scss"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {Divider} from "antd"
import classNames from "classnames"
import {VulnerabilityLevelPie} from "./VulnerabilityLevelPie/VulnerabilityLevelPie"
import {VulnerabilityTypePie} from "./VulnerabilityTypePie/VulnerabilityTypePie"
import {YakitRiskTable} from "./YakitRiskTable/YakitRiskTable"
import {QueryRisksRequest} from "./YakitRiskTable/YakitRiskTableType"
import {defQueryRisksRequest} from "./YakitRiskTable/constants"
import cloneDeep from "lodash/cloneDeep"
import {FieldGroup, apiRiskFieldGroup} from "./YakitRiskTable/utils"
import {VulnerabilityLevelPieRefProps} from "./VulnerabilityLevelPie/VulnerabilityLevelPieType"
import {VulnerabilityTypePieRefProps} from "./VulnerabilityTypePie/VulnerabilityTypePieType"

export const RiskPage: React.FC<RiskPageProp> = (props) => {
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [query, setQuery] = useState<QueryRisksRequest>(cloneDeep(defQueryRisksRequest))
    return (
        <div className={styles["risk-page"]}>
            <RiskQuery
                advancedQuery={advancedQuery}
                setAdvancedQuery={setAdvancedQuery}
                query={query}
                setQuery={setQuery}
            />
            <YakitRiskTable query={query} setQuery={setQuery} />
        </div>
    )
}

const RiskQuery: React.FC<RiskQueryProps> = React.memo((props) => {
    const {advancedQuery, setAdvancedQuery, query, setQuery} = props
    const [ipList, setIpList] = useState<FieldGroup[]>([])
    const [levelList, setLevelList] = useState<FieldGroup[]>([])
    const [typeList, setTypeList] = useState<FieldGroup[]>([])
    const queryBodyRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(queryBodyRef)
    useEffect(() => {
        if (inViewport) getGroups()
    }, [inViewport])
    const getGroups = useMemoizedFn(() => {
        apiRiskFieldGroup().then((res) => {
            setIpList(res.RiskIPGroup)
            setLevelList(res.RiskLevelGroup)
            setTypeList(res.RiskTypeGroup)
        })
    })
    const onSelectIP = useMemoizedFn((ipItem: FieldGroup) => {
        const index = (query.IPList || []).findIndex((ele) => ele === ipItem.Value)
        let newIPList = query.IPList || []
        if (index === -1) {
            newIPList = [...newIPList, ipItem.Value]
        } else {
            newIPList.splice(index, 1)
        }
        setQuery({
            ...query,
            IPList: [...newIPList]
        })
    })
    const onSelect = useMemoizedFn((val: string[], text: string) => {
        setQuery({
            ...query,
            [text]: [...val]
        })
    })

    const onResetIP = useMemoizedFn(() => {
        setQuery({
            ...query,
            IPList: []
        })
    })

    const selectIPList = useCreation(() => {
        return query.IPList || []
    }, [query.IPList])

    return (
        <div className={styles["risk-query"]} ref={queryBodyRef}>
            <div className={styles["risk-query-heard"]}>
                <span>高级查询</span>
                <YakitSwitch checked={advancedQuery} onChange={setAdvancedQuery} />
            </div>
            <div className={styles["risk-query-body"]}>
                <IPList list={ipList} onSelect={onSelectIP} selectList={selectIPList} onReset={onResetIP} />
                <Divider style={{margin: "8px 0px"}} />
                <VulnerabilityLevel data={levelList} onSelect={(val) => onSelect(val, "SeverityList")} />
                <Divider style={{margin: "8px 0px"}} />
                <VulnerabilityType data={typeList} onSelect={(val) => onSelect(val, "RiskTypeList")} />
                <div className={styles["to-end"]}>已经到底啦～</div>
            </div>
        </div>
    )
})

const IPList: React.FC<IPListProps> = React.memo((props) => {
    const {list, onSelect, selectList, onReset} = props

    return (
        <div className={styles["ip-list-body"]}>
            <div className={styles["ip-list-heard"]}>
                <div className={styles["ip-list-heard-title"]}>IP 统计</div>
                <YakitButton
                    type='text'
                    colors='danger'
                    className={styles["btn-padding-right-0"]}
                    onClick={onReset}
                    size='small'
                >
                    重置
                </YakitButton>
            </div>
            <div className={styles["ip-list-content"]}>
                <RollingLoadList<FieldGroup>
                    data={list}
                    page={-1}
                    hasMore={false}
                    loadMoreData={() => {}}
                    loading={false}
                    rowKey='value'
                    defItemHeight={32}
                    renderRow={(record, index: number) => (
                        <IPListItem item={record} onSelect={onSelect} isSelect={selectList.includes(record.Value)} />
                    )}
                />
            </div>
        </div>
    )
})
const IPListItem: React.FC<IPListItemProps> = React.memo((props) => {
    const {item, onSelect, isSelect} = props
    return (
        <div
            className={classNames(styles["ip-list-item"], {
                [styles["ip-list-item-active"]]: isSelect
            })}
            onClick={() => onSelect(item)}
        >
            <div className={styles["ip-list-item-label"]}>{item.Value}</div>
            <div className={styles["ip-list-item-value"]}>{item.Total}</div>
        </div>
    )
})
/**漏洞等级 */
const VulnerabilityLevel: React.FC<VulnerabilityLevelProps> = React.memo((props) => {
    const {data, onSelect} = props
    const pieRef = useRef<VulnerabilityLevelPieRefProps>({onReset: () => {}})
    const onReset = useMemoizedFn((e) => {
        e.stopPropagation()
        pieRef.current.onReset()
    })
    return (
        <div className={styles["vulnerability-level"]}>
            <div className={styles["vulnerability-level-heard"]}>
                <div className={styles["vulnerability-level-heard-title"]}>漏洞等级</div>
                <YakitButton
                    type='text'
                    colors='danger'
                    className={styles["btn-padding-right-0"]}
                    onClick={onReset}
                    size='small'
                >
                    重置
                </YakitButton>
            </div>
            <VulnerabilityLevelPie ref={pieRef} list={data} onSelect={onSelect} />
        </div>
    )
})

const VulnerabilityType: React.FC<VulnerabilityTypeProps> = React.memo((props) => {
    const {data, onSelect} = props
    const pieRef = useRef<VulnerabilityTypePieRefProps>({onReset: () => {}})
    const onReset = useMemoizedFn((e) => {
        e.stopPropagation()
        pieRef.current.onReset()
    })
    return (
        <div className={styles["vulnerability-type"]}>
            <div className={styles["vulnerability-type-heard"]}>
                <div className={styles["vulnerability-type-heard-title"]}>漏洞类型 Top 10</div>
                <YakitButton
                    type='text'
                    colors='danger'
                    className={styles["btn-padding-right-0"]}
                    onClick={onReset}
                    size='small'
                >
                    重置
                </YakitButton>
            </div>
            <VulnerabilityTypePie ref={pieRef} list={data} onSelect={onSelect} />
        </div>
    )
})
