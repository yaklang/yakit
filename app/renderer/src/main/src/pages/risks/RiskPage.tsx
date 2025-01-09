import React, {useEffect, useRef, useState} from "react"
import {FieldName} from "./RiskTable"
import {
    IPListItemProps,
    IPListProps,
    RiskPageProp,
    RiskQueryProps,
    VulnerabilityLevelProps,
    VulnerabilityTypeProps
} from "./RiskPageType"
import styles from "./RiskPage.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {Divider, Tooltip} from "antd"
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
import {OutlineCloseIcon, OutlineInformationcircleIcon} from "@/assets/icon/outline"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import emiter from "@/utils/eventBus/eventBus"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {shallow} from "zustand/shallow"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {YakitRoute} from "@/enums/yakitRoute"
import {defaultRiskPageInfo} from "@/defaultConstants/RiskPage"

export const RiskPage: React.FC<RiskPageProp> = (props) => {
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.DB_Risk, YakitRoute.DB_Risk)
        if (currentItem && currentItem.pageParamsInfo.riskPageInfo) {
            return currentItem.pageParamsInfo.riskPageInfo
        } else {
            return {...defaultRiskPageInfo}
        }
    })

    useEffect(() => {
        const specifyVulnerabilityLevel = (params: string) => {
            try {
                const SeverityList = JSON.parse(params) || []
                setQuery((query) => ({...query, SeverityList}))
            } catch (error) {}
        }
        emiter.on("specifyVulnerabilityLevel", specifyVulnerabilityLevel)
        return () => {
            emiter.off("specifyVulnerabilityLevel", specifyVulnerabilityLevel)
        }
    }, [])

    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [riskLoading, setRiskLoading] = useState<boolean>(false)
    const [query, setQuery] = useState<QueryRisksRequest>({
        ...defQueryRisksRequest,
        SeverityList: initPageInfo().SeverityList || []
    })
    const riskBodyRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(riskBodyRef)

    // 获取筛选展示状态
    useEffect(() => {
        getRemoteValue(RemoteGV.RiskQueryShow).then((value: string) => {
            setAdvancedQuery(value !== "false")
        })
    }, [])
    const onSetQueryShow = useMemoizedFn((val) => {
        setAdvancedQuery(val)
        setRemoteValue(RemoteGV.RiskQueryShow, `${val}`)
    })
    return (
        <YakitSpin spinning={riskLoading}>
            <div className={styles["risk-page"]} ref={riskBodyRef}>
                <RiskQuery
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

const RiskQuery: React.FC<RiskQueryProps> = React.memo((props) => {
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
        <div className={classNames(styles["risk-query"], {[styles["risk-query-hidden"]]: !advancedQuery})}>
            <div className={styles["risk-query-heard"]}>
                <span>高级查询</span>
                <Tooltip title='收起筛选' placement='top' overlayClassName='plugins-tooltip'>
                    <YakitButton type='text2' onClick={onClose} icon={<OutlineCloseIcon />}></YakitButton>
                </Tooltip>
            </div>
            <div className={styles["risk-query-body"]}>
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
