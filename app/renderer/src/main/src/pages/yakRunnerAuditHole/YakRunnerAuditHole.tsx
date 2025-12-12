import React, {useEffect, useRef, useState} from "react"
import {useCreation, useDebounceEffect, useInViewport, useMemoizedFn, useSize} from "ahooks"
import styles from "./YakRunnerAuditHole.module.scss"
import {
    HoleQueryProps,
    ProgramListItemProps,
    ProgramListProps,
    VulnerabilityLevelProps,
    VulnerabilityTypeProps,
    YakRunnerAuditHoleProps
} from "./YakRunnerAuditHoleType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import emiter from "@/utils/eventBus/eventBus"
import classNames from "classnames"
import {Divider, Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineInformationcircleIcon} from "@/assets/icon/outline"
import {FieldGroup} from "../risks/YakitRiskTable/utils"
import {FieldName} from "../risks/RiskTable"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {VulnerabilityLevelPieRefProps} from "../risks/VulnerabilityLevelPie/VulnerabilityLevelPieType"
import {VulnerabilityLevelPie} from "../risks/VulnerabilityLevelPie/VulnerabilityLevelPie"
import {VulnerabilityTypePieRefProps} from "../risks/VulnerabilityTypePie/VulnerabilityTypePieType"
import {VulnerabilityTypePie} from "../risks/VulnerabilityTypePie/VulnerabilityTypePie"
import {YakitAuditHoleTable} from "./YakitAuditHoleTable/YakitAuditHoleTable"
import {SSARisksFilter} from "./YakitAuditHoleTable/YakitAuditHoleTableType"
import {apiGetSSARiskFieldGroupEx} from "./YakitAuditHoleTable/utils"
import {shallow} from "zustand/shallow"
import {PageNodeItemProps, AuditHoleInfoProps, usePageInfo} from "@/store/pageInfo"
import {YakitRoute} from "@/enums/yakitRoute"
import {defaultAuditHolePageInfo} from "@/defaultConstants/defaultAuditHolePageInfo"
import {LeftSideHoleType} from "./LeftSideHoleBar/LeftSideHoleBarType"
import {LeftSideHoleBar} from "./LeftSideHoleBar/LeftSideHoleBar"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {DocumentCollect} from "./DocumentCollect/DocumentCollect"
import {YakitTabsProps} from "@/components/yakitSideTab/YakitSideTabType"

export const YakRunnerAuditHole: React.FC<YakRunnerAuditHoleProps> = (props) => {
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )

    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
            YakitRoute.YakRunner_Audit_Hole,
            YakitRoute.YakRunner_Audit_Hole
        )
        if (currentItem && currentItem.pageParamsInfo.auditHoleInfo) {
            return currentItem.pageParamsInfo.auditHoleInfo
        } else {
            return {...defaultAuditHolePageInfo}
        }
    })

    useEffect(() => {
        const auditHoleVulnerabilityLevel = (params: string) => {
            try {
                const data: AuditHoleInfoProps = JSON.parse(params)
                setQuery((query) => ({...query, ...data}))
            } catch (error) {}
        }
        emiter.on("auditHoleVulnerabilityLevel", auditHoleVulnerabilityLevel)
        return () => {
            emiter.off("auditHoleVulnerabilityLevel", auditHoleVulnerabilityLevel)
        }
    }, [])

    const [riskLoading, setRiskLoading] = useState<boolean>(false)
    const [query, setQuery] = useState<SSARisksFilter>({
        ...initPageInfo()
    })
    const riskBodyRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(riskBodyRef)

    const [active, setActive] = useState<LeftSideHoleType>("statistic")
    const [yakitTab, setYakitTab] = useState<YakitTabsProps[]>([
        {
            label: () => "统计",
            value: "statistic",
            show: false
        },
        {
            label: () => "文件汇总",
            value: "document-collect",
            show: false
        }
    ])
    useEffect(() => {
        getRemoteValue(RemoteGV.AuditHoleShow).then((setting: string) => {
            if (setting) {
                try {
                    const tabs = JSON.parse(setting)
                    setYakitTab((prev) => {
                        prev.forEach((i) => {
                            if (i.value === tabs.key) {
                                i.show = tabs.contShow
                            } else {
                                i.show = false
                            }
                        })
                        return [...prev]
                    })
                    onActiveKey(tabs.key)
                } catch (error) {}
            }
        })
    }, [])
    const onActiveKey = useMemoizedFn((key) => {
        setActive(key)
    })
    const isUnShow = useCreation(() => {
        return !(yakitTab.find((ele) => ele.value === active)?.show !== false)
    }, [yakitTab, active])
    useDebounceEffect(
        () => {
            setRemoteValue(RemoteGV.AuditHoleShow, JSON.stringify({contShow: !isUnShow, key: active}))
        },
        [isUnShow, active],
        {wait: 300}
    )
    // 操作side开启与关闭
    const onOperateSide = useMemoizedFn((val: boolean) => {
        if (val) {
            setYakitTab((prev) => {
                prev.forEach((i) => {
                    if (i.value === active) {
                        i.show = true
                    } else {
                        i.show = false
                    }
                })
                return [...prev]
            })
        } else {
            setYakitTab((prev) => {
                prev.forEach((i) => {
                    i.show = false
                })
                return [...prev]
            })
        }
    })

    return (
        <YakitSpin spinning={riskLoading}>
            <div className={styles["audit-hole-page"]} ref={riskBodyRef}>
                <YakitResizeBox
                    freeze={!isUnShow}
                    firstRatio={isUnShow ? "25px" : "325px"}
                    firstNodeStyle={isUnShow ? {padding: 0, maxWidth: 25} : {padding: 0}}
                    lineDirection='right'
                    firstMinSize={isUnShow ? 25 : 250}
                    lineStyle={{width: 4}}
                    secondMinSize={480}
                    firstNode={
                        <LeftSideHoleBar
                            isUnShow={isUnShow}
                            active={active}
                            setActive={onActiveKey}
                            yakitTab={yakitTab}
                            setYakitTab={setYakitTab}
                            statisticNode={
                                <HoleQuery
                                    inViewport={inViewport}
                                    onOperateSide={onOperateSide}
                                    query={query}
                                    setQuery={setQuery}
                                />
                            }
                            documentCollectDom={<DocumentCollect query={query} setQuery={setQuery} />}
                        />
                    }
                    secondNodeStyle={
                        isUnShow ? {padding: 0, minWidth: "calc(100% - 25px)"} : {overflow: "unset", padding: 0}
                    }
                    secondNode={
                        <YakitAuditHoleTable setRiskLoading={setRiskLoading} query={query} setQuery={setQuery} />
                    }
                />
            </div>
        </YakitSpin>
    )
}

const HoleQuery: React.FC<HoleQueryProps> = React.memo((props) => {
    const {inViewport, onOperateSide, query, setQuery} = props
    const [programList, setProgramList] = useState<FieldGroup[]>([])
    const [levelList, setLevelList] = useState<FieldName[]>([])
    const [typeList, setTypeList] = useState<FieldName[]>([])
    useEffect(() => {
        if (!inViewport) return
        emiter.on("onRefRiskFieldGroup", onRefRiskFieldGroup)
        return () => {
            emiter.off("onRefRiskFieldGroup", onRefRiskFieldGroup)
        }
    }, [])

    const onRefRiskFieldGroup = useMemoizedFn(() => {
        getGroups()
    })

    useDebounceEffect(
        () => {
            if (!inViewport) return
            getGroups(false)
        },
        [inViewport, query],
        {
            wait: 200
        }
    )

    const getGroups = useMemoizedFn((option: boolean = true) => {
        apiGetSSARiskFieldGroupEx({Filter: query}).then((res) => {
            const {FileField, SeverityField, RiskTypeField} = res
            setProgramList(FileField.sort((a, b) => b.Total - a.Total))
            setLevelList(SeverityField)
            setTypeList(RiskTypeField)
            if (FileField.length === 0 && SeverityField.length === 0 && RiskTypeField.length === 0 && option) {
                onOperateSide(false)
            }
        })
    })
    const onSelectProgram = useMemoizedFn((programItem: FieldGroup) => {
        const index = (query.CodeSourceUrl || []).findIndex((ele) => ele === programItem.Name)
        let newProgramList = query.CodeSourceUrl || []
        if (index === -1) {
            newProgramList = [...newProgramList, programItem.Name]
        } else {
            newProgramList.splice(index, 1)
        }
        setQuery({
            ...query,
            CodeSourceUrl: [...newProgramList]
        })
    })
    const onSelect = useMemoizedFn((val: string[], key: "Severity" | "RiskType") => {
        setQuery({
            ...query,
            [key]: [...val]
        })
    })

    const onResetProgram = useMemoizedFn(() => {
        setQuery({
            ...query,
            CodeSourceUrl: []
        })
    })

    const selectProgramList = useCreation(() => {
        return query.CodeSourceUrl || []
    }, [query.CodeSourceUrl])

    return (
        <div className={classNames(styles["hole-query"])}>
            <div className={styles["hole-query-heard"]}>
                <span>高级查询</span>
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
                <div className={styles["program-list-heard-title"]}>文件统计</div>
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
            <Tooltip title={item.Name}>
                <div className={classNames(styles["program-list-item-label"], "yakit-single-line-ellipsis")}>
                    {item.Name}
                </div>
            </Tooltip>
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
    const levelRef = useRef<HTMLDivElement>(null)
    const size = useSize(levelRef)
    useEffect(() => {
        pieRef.current.onResize && pieRef.current.onResize()
    }, [size?.width])

    return (
        <div className={styles["vulnerability-level"]} ref={levelRef}>
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
    const typeRef = useRef<HTMLDivElement>(null)
    const size = useSize(typeRef)
    useEffect(() => {
        pieRef.current.onResize && pieRef.current.onResize()
    }, [size?.width])

    return (
        <div className={styles["vulnerability-type"]} ref={typeRef}>
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
