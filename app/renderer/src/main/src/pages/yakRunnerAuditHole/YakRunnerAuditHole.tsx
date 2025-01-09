import React, {useEffect, useRef, useState} from "react"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import styles from "./YakRunnerAuditHole.module.scss"
import {HoleQueryProps, IPListItemProps, IPListProps, VulnerabilityLevelProps, VulnerabilityTypeProps, YakRunnerAuditHoleProps} from "./YakRunnerAuditHoleType"
import {QueryRisksRequest} from "../risks/YakitRiskTable/YakitRiskTableType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitRiskTable} from "../risks/YakitRiskTable/YakitRiskTable"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import { defQueryRisksRequest } from "../risks/YakitRiskTable/constants"
import emiter from "@/utils/eventBus/eventBus"
import classNames from "classnames"
import { Divider, Tooltip } from "antd"
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton"
import { OutlineCloseIcon, OutlineInformationcircleIcon } from "@/assets/icon/outline"
import { apiRiskFieldGroup, FieldGroup } from "../risks/YakitRiskTable/utils"
import { FieldName } from "../risks/RiskTable"
import { RollingLoadList } from "@/components/RollingLoadList/RollingLoadList"
import { VulnerabilityLevelPieRefProps } from "../risks/VulnerabilityLevelPie/VulnerabilityLevelPieType"
import { VulnerabilityLevelPie } from "../risks/VulnerabilityLevelPie/VulnerabilityLevelPie"
import { VulnerabilityTypePieRefProps } from "../risks/VulnerabilityTypePie/VulnerabilityTypePieType"
import { VulnerabilityTypePie } from "../risks/VulnerabilityTypePie/VulnerabilityTypePie"

export const YakRunnerAuditHole: React.FC<YakRunnerAuditHoleProps> = (props) => {
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [riskLoading, setRiskLoading] = useState<boolean>(false)
    const [query, setQuery] = useState<QueryRisksRequest>({
        ...defQueryRisksRequest
    })
    const riskBodyRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(riskBodyRef)

    // 获取筛选展示状态
    useEffect(() => {
        getRemoteValue(RemoteGV.AuditHoleShow).then((value: string) => {
            setAdvancedQuery(value !== "false")
        })
    }, [])
    const onSetQueryShow = useMemoizedFn((val) => {
        setAdvancedQuery(val)
        setRemoteValue(RemoteGV.AuditHoleShow, `${val}`)
    })
    return (
        <YakitSpin spinning={riskLoading}>
            <div className={styles["audit-hole-page"]} ref={riskBodyRef}>
                <HoleQuery
                    inViewport={inViewport}
                    advancedQuery={advancedQuery}
                    setAdvancedQuery={onSetQueryShow}
                    query={query}
                    setQuery={setQuery}
                />
                <YakitRiskTable
                    query={query}
                    setQuery={setQuery}
                    advancedQuery={advancedQuery}
                    setAdvancedQuery={onSetQueryShow}
                    setRiskLoading={setRiskLoading}
                />
            </div>
        </YakitSpin>
    )
}


const HoleQuery: React.FC<HoleQueryProps> = React.memo((props) => {
    const {inViewport, advancedQuery, setAdvancedQuery, query, setQuery} = props
    const [ipList, setIpList] = useState<FieldGroup[]>([])
    const [levelList, setLevelList] = useState<FieldName[]>([])
    const [typeList, setTypeList] = useState<FieldName[]>([])
    useEffect(() => {
        if (!inViewport) return
        getGroups()
        emiter.on("onRefRiskFieldGroup", onRefRiskFieldGroup)
        return () => {
            emiter.off("onRefRiskFieldGroup", onRefRiskFieldGroup)
        }
    }, [inViewport])
    const onRefRiskFieldGroup = useMemoizedFn(() => {
        getGroups()
    })
    const getGroups = useMemoizedFn(() => {
        apiRiskFieldGroup().then((res) => {
            const {RiskIPGroup, RiskLevelGroup, RiskTypeGroup} = res
            setIpList(RiskIPGroup)
            setLevelList(RiskLevelGroup)
            setTypeList(RiskTypeGroup)
            if (RiskIPGroup.length === 0 && RiskLevelGroup.length === 0 && RiskTypeGroup.length === 0) {
                setAdvancedQuery(false)
            }
        })
    })
    const onSelectIP = useMemoizedFn((ipItem: FieldGroup) => {
        const index = (query.IPList || []).findIndex((ele) => ele === ipItem.Name)
        let newIPList = query.IPList || []
        if (index === -1) {
            newIPList = [...newIPList, ipItem.Name]
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

    const onClose = useMemoizedFn(() => {
        setAdvancedQuery(false)
    })

    const selectIPList = useCreation(() => {
        return query.IPList || []
    }, [query.IPList])

    return (
        <div className={classNames(styles["hole-query"], {[styles["hole-query-hidden"]]: !advancedQuery})}>
            <div className={styles["hole-query-heard"]}>
                <span>高级查询</span>
                <Tooltip title='收起筛选' placement='top' overlayClassName='plugins-tooltip'>
                    <YakitButton type='text2' onClick={onClose} icon={<OutlineCloseIcon />}></YakitButton>
                </Tooltip>
            </div>
            <div className={styles["hole-query-body"]}>
                <IPList list={ipList} onSelect={onSelectIP} selectList={selectIPList} onReset={onResetIP} />
                <Divider style={{margin: "8px 0px"}} />
                <VulnerabilityLevel
                    selectList={query.SeverityList || []}
                    data={levelList}
                    onSelect={(val) => onSelect(val, "SeverityList")}
                />
                <Divider style={{margin: "8px 0px"}} />
                <VulnerabilityType
                    selectList={query.RiskTypeList || []}
                    data={typeList}
                    onSelect={(val) => onSelect(val, "RiskTypeList")}
                />
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
                        <IPListItem item={record} onSelect={onSelect} isSelect={selectList.includes(record.Name)} />
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
            <div className={styles["ip-list-item-label"]}>{item.Name}</div>
            <div className={styles["ip-list-item-value"]}>{item.Total}</div>
        </div>
    )
})

/**漏洞等级 */
const VulnerabilityLevel: React.FC<VulnerabilityLevelProps> = React.memo((props) => {
    const {data, onSelect, selectList} = props
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
            <VulnerabilityLevelPie ref={pieRef} selectList={selectList} list={data} setSelectList={onSelect} />
        </div>
    )
})

const VulnerabilityType: React.FC<VulnerabilityTypeProps> = React.memo((props) => {
    const {data, onSelect, selectList} = props
    const pieRef = useRef<VulnerabilityTypePieRefProps>({onReset: () => {}})
    const onReset = useMemoizedFn((e) => {
        e.stopPropagation()
        pieRef.current.onReset()
    })
    return (
        <div className={styles["vulnerability-type"]}>
            <div className={styles["vulnerability-type-heard"]}>
                <div className={styles["vulnerability-type-heard-title"]}>
                    漏洞类型 Top 10
                    <Tooltip title='手动选择所有漏洞类型后，点击重置即可查看所有数据'>
                        <OutlineInformationcircleIcon className={styles["info-icon"]} />
                    </Tooltip>
                </div>
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
            <VulnerabilityTypePie ref={pieRef} selectList={selectList} list={data} setSelectList={onSelect} />
        </div>
    )
})