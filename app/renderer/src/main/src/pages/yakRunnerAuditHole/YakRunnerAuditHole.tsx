import React, {useEffect, useRef, useState} from "react"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import styles from "./YakRunnerAuditHole.module.scss"
import {
    HoleQueryProps,
    ProgramListItemProps,
    ProgramListProps,
    VulnerabilityLevelProps,
    VulnerabilityTypeProps,
    YakRunnerAuditHoleProps
} from "./YakRunnerAuditHoleType"
import {QueryRisksRequest} from "../risks/YakitRiskTable/YakitRiskTableType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import emiter from "@/utils/eventBus/eventBus"
import classNames from "classnames"
import {Divider, Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineCloseIcon, OutlineInformationcircleIcon} from "@/assets/icon/outline"
import {apiRiskFieldGroup, FieldGroup} from "../risks/YakitRiskTable/utils"
import {FieldName} from "../risks/RiskTable"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {VulnerabilityLevelPieRefProps} from "../risks/VulnerabilityLevelPie/VulnerabilityLevelPieType"
import {VulnerabilityLevelPie} from "../risks/VulnerabilityLevelPie/VulnerabilityLevelPie"
import {VulnerabilityTypePieRefProps} from "../risks/VulnerabilityTypePie/VulnerabilityTypePieType"
import {VulnerabilityTypePie} from "../risks/VulnerabilityTypePie/VulnerabilityTypePie"
import {defQuerySSARisksRequest, YakitAuditHoleTable} from "./YakitAuditHoleTable/YakitAuditHoleTable"
import {SSARisksFilter} from "./YakitAuditHoleTable/YakitAuditHoleTableType"
import {apiGetSSARiskFieldGroup} from "./YakitAuditHoleTable/utils"

export const YakRunnerAuditHole: React.FC<YakRunnerAuditHoleProps> = (props) => {
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [riskLoading, setRiskLoading] = useState<boolean>(false)
    const [query, setQuery] = useState<SSARisksFilter>({})
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
                <YakitAuditHoleTable
                    advancedQuery={advancedQuery}
                    setAdvancedQuery={onSetQueryShow}
                    setRiskLoading={setRiskLoading}
                    query={query}
                    setQuery={setQuery}
                />
            </div>
        </YakitSpin>
    )
}

const HoleQuery: React.FC<HoleQueryProps> = React.memo((props) => {
    const {inViewport, advancedQuery, setAdvancedQuery, query, setQuery} = props
    const [programList, setProgramList] = useState<FieldGroup[]>([])
    const [levelList, setLevelList] = useState<FieldGroup[]>([])
    const [typeList, setTypeList] = useState<FieldGroup[]>([])
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
        apiGetSSARiskFieldGroup().then((res) => {
            const {ProgramNameField, SeverityField, RiskTypeField} = res
            console.log("apiGetSSARiskFieldGroup---", res)

            setProgramList(ProgramNameField)
            setLevelList(SeverityField)
            setTypeList(RiskTypeField)
            if (ProgramNameField.length === 0 && SeverityField.length === 0 && RiskTypeField.length === 0) {
                setAdvancedQuery(false)
            }
        })
    })
    const onSelectProgram = useMemoizedFn((programItem: FieldGroup) => {
        const index = (query.ProgramName || []).findIndex((ele) => ele === programItem.Name)
        let newProgramList = query.ProgramName || []
        if (index === -1) {
            newProgramList = [...newProgramList, programItem.Name]
        } else {
            newProgramList.splice(index, 1)
        }
        setQuery({
            ...query,
            ProgramName: [...newProgramList]
        })
    })
    const onSelect = useMemoizedFn((val: string[], key: string) => {
        setQuery({
            ...query,
            [key]: [...val]
        })
    })

    const onResetProgram = useMemoizedFn(() => {
        setQuery({
            ...query,
            ProgramName: []
        })
    })

    const onClose = useMemoizedFn(() => {
        setAdvancedQuery(false)
    })

    const selectProgramList = useCreation(() => {
        return query.ProgramName || []
    }, [query.ProgramName])

    return (
        <div className={classNames(styles["hole-query"], {[styles["hole-query-hidden"]]: !advancedQuery})}>
            <div className={styles["hole-query-heard"]}>
                <span>高级查询</span>
                <Tooltip title='收起筛选' placement='top' overlayClassName='plugins-tooltip'>
                    <YakitButton type='text2' onClick={onClose} icon={<OutlineCloseIcon />}></YakitButton>
                </Tooltip>
            </div>
            <div className={styles["hole-query-body"]}>
                <ProgramList
                    list={programList}
                    onSelect={onSelectProgram}
                    selectList={selectProgramList}
                    onReset={onResetProgram}
                />
                <Divider style={{margin: "8px 0px"}} />
                <VulnerabilityLevel
                    selectList={query.Severity || []}
                    data={levelList}
                    onSelect={(val) => onSelect(val, "Severity")}
                />
                <Divider style={{margin: "8px 0px"}} />
                <VulnerabilityType
                    selectList={query.RiskType || []}
                    data={typeList}
                    onSelect={(val) => onSelect(val, "RiskType")}
                />
                <div className={styles["to-end"]}>已经到底啦～</div>
            </div>
        </div>
    )
})

const ProgramList: React.FC<ProgramListProps> = React.memo((props) => {
    const {list, onSelect, selectList, onReset} = props

    return (
        <div className={styles["program-list-body"]}>
            <div className={styles["program-list-heard"]}>
                <div className={styles["program-list-heard-title"]}>项目统计</div>
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
            <div className={styles["program-list-content"]}>
                <RollingLoadList<FieldGroup>
                    data={list}
                    page={-1}
                    hasMore={false}
                    loadMoreData={() => {}}
                    loading={false}
                    rowKey='value'
                    defItemHeight={32}
                    renderRow={(record, index: number) => (
                        <ProgramListItem
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

const ProgramListItem: React.FC<ProgramListItemProps> = React.memo((props) => {
    const {item, onSelect, isSelect} = props
    return (
        <div
            className={classNames(styles["program-list-item"], {
                [styles["program-list-item-active"]]: isSelect
            })}
            onClick={() => onSelect(item)}
        >
            <div className={styles["program-list-item-label"]}>{item.Name}</div>
            <div className={styles["program-list-item-value"]}>{item.Total}</div>
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
            {/* <VulnerabilityLevelPie ref={pieRef} selectList={selectList} list={data} setSelectList={onSelect} /> */}
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
