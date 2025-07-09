import React, {useContext, useEffect, useMemo, useRef, useState} from "react"
import emiter from "@/utils/eventBus/eventBus"
import styles from "./MITMServerHijacking.module.scss"
import {HistorySearch, HTTPFlowShield, ShieldData, SourceType} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {useCreation, useDebounceFn, useMemoizedFn, useSize} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {setRemoteValue} from "@/utils/kv"
import {MITMConsts} from "../MITMConsts"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {OutlineRefreshIcon, OutlineSearchIcon, OutlineTerminalIcon} from "@/assets/icon/outline"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {iconProcessMap, ProcessItem} from "@/components/HTTPHistory"
import classNames from "classnames"
import {SolidCheckIcon} from "@/assets/icon/solid"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import MITMContext from "../Context/MITMContext"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {Badge} from "antd"

const {ipcRenderer} = window.require("electron")
interface MITMLogHeardExtraProps {
    sourceType: string
    onSetSourceType: (s: string) => void
    setShowPluginHistoryList: (s: string[]) => void
    setTempShowPluginHistory?: (s: string) => void
    tableTotal: number
    tableSelectNum: number
    hasNewData: boolean
}
export const MITMLogHeardExtra: React.FC<MITMLogHeardExtraProps> = React.memo((props) => {
    const {
        sourceType,
        onSetSourceType,
        setShowPluginHistoryList,
        setTempShowPluginHistory,
        tableTotal,
        tableSelectNum,
        hasNewData
    } = props
    // 屏蔽数据
    const [shieldData, setShieldData] = useState<ShieldData>({
        data: []
    })
    const mitmContent = useContext(MITMContext)

    const mitmVersion = useCreation(() => {
        return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])
    useEffect(() => {
        emiter.on("onGetMITMShieldDataEvent", onGetMITMShieldData)
        return () => {
            emiter.off("onGetMITMShieldDataEvent", onGetMITMShieldData)
        }
    }, [])

    const onGetMITMShieldData = useMemoizedFn((str: string) => {
        try {
            const value = JSON.parse(str)
            const {shieldData, version} = value
            if (version !== mitmVersion) return
            setShieldData(shieldData)
        } catch (error) {}
    })

    const cancleFilter = useMemoizedFn((value) => {
        emiter.emit("cancleMitmFilterEvent", JSON.stringify({value, version: mitmVersion}))
    })
    const cancleAllFilter = useMemoizedFn((version) => {
        if (version !== mitmVersion) return
        emiter.emit("cancleMitmAllFilterEvent", mitmVersion)
    })

    const onHistorySourceTypeToMitm = useMemoizedFn((data) => {
        try {
            const value = JSON.parse(data)
            const {sourceType, version} = value
            if (version !== mitmVersion) return
            onSetSourceType(sourceType)
        } catch (error) {}
    })
    useEffect(() => {
        emiter.on("onHistorySourceTypeToMitm", onHistorySourceTypeToMitm)
        return () => {
            emiter.off("onHistorySourceTypeToMitm", onHistorySourceTypeToMitm)
        }
    }, [])

    const [processVisible, setProcessVisible] = useState<boolean>(false)
    const [searchProcessVal, setSearchProcessVal] = useState<string>("")
    const [processLoading, setProcessLoading] = useState<boolean>(false)
    const [processList, setProcessList] = useState<ProcessItem[]>([])
    const [curProcess, setCurProcess] = useState<string[]>([])
    const [queryparamsStr, setQueryparamsStr] = useState<string>("")
    const renderProcessList = useMemo(() => {
        return searchProcessVal
            ? processList.filter((item) =>
                  item.process.toLocaleLowerCase().includes(searchProcessVal.toLocaleLowerCase())
              )
            : processList
    }, [searchProcessVal, processList])
    const onProcessItemClick = (processItem: ProcessItem) => {
        if (curProcess.includes(processItem.process)) {
            setCurProcess((prev) => prev.filter((process) => process !== processItem.process))
        } else {
            setCurProcess([...curProcess, processItem.process])
        }
        sendFun()
    }
    const sendFun = useDebounceFn(
        () => {
            emiter.emit(
                "onMitmCurProcess",
                JSON.stringify({
                    curProcess,
                    version: mitmVersion
                })
            )
        },
        {wait: 300}
    ).run
    const onMITMLogProcessQuery = useMemoizedFn((data: string) => {
        try {
            const value = JSON.parse(data)
            const {queryStr, version} = value
            if (version !== mitmVersion) return
            setQueryparamsStr(queryStr)
        } catch (error) {}
    })
    useEffect(() => {
        emiter.on("onMITMLogProcessQuery", onMITMLogProcessQuery)
        return () => {
            emiter.off("onMITMLogProcessQuery", onMITMLogProcessQuery)
        }
    }, [])
    useEffect(() => {
        if (processVisible) {
            setProcessLoading(true)
            try {
                const query = JSON.parse(queryparamsStr)
                ipcRenderer
                    .invoke("QueryHTTPFlowsProcessNames", query)
                    .then((res) => {
                        const processArr = (res.ProcessNames || [])
                            .filter((name: string) => name)
                            .map((name: string) => {
                                const lowerName = name.toLocaleLowerCase()
                                const icon = Object.keys(iconProcessMap).find((key) => {
                                    if (key.startsWith("docker") && lowerName.startsWith("docker")) {
                                        return true
                                    } else if (key.startsWith("jdk") && lowerName.startsWith("jdk")) {
                                        return true
                                    } else if (key.startsWith("java") && lowerName.startsWith("java")) {
                                        return true
                                    } else if (key.startsWith("vmware") && lowerName.startsWith("vmware")) {
                                        return true
                                    } else {
                                        return lowerName.includes(key)
                                    }
                                })
                                return {process: name, icon: icon ? iconProcessMap[icon] : undefined}
                            })
                        setProcessList(processArr)
                    })
                    .catch((error) => {
                        yakitNotify("error", error + "")
                    })
                    .finally(() => {
                        setProcessLoading(false)
                    })
            } catch (error) {
                setProcessLoading(false)
            }
        }
    }, [processVisible])

    const headerRef = useRef<HTMLDivElement>(null)
    const headerSize = useSize(headerRef)

    const handleSearch = useMemoizedFn((searchValue, searchType) => {
        emiter.emit(
            "onMitmSearchInputVal",
            JSON.stringify({KeywordType: searchType, Keyword: searchValue, version: mitmVersion})
        )
    })

    return (
        <div ref={headerRef} className={styles["mitm-log-heard"]}>
            <div className={styles["mitm-log-heard-left"]}>
                <div style={{whiteSpace: "nowrap"}}>
                    {SourceType.map((tag) => (
                        <YakitCheckableTag
                            key={tag.value}
                            checked={!!sourceType.split(",").includes(tag.value)}
                            onChange={(checked) => {
                                emiter.emit("onMitmClearFromPlugin", mitmVersion)
                                setShowPluginHistoryList([])
                                setTempShowPluginHistory && setTempShowPluginHistory("")

                                if (checked) {
                                    const selectTypeList = [...(sourceType.split(",") || []), tag.value]
                                    onSetSourceType(selectTypeList.join(","))
                                } else {
                                    const selectTypeList = (sourceType.split(",") || []).filter(
                                        (ele) => ele !== tag.value
                                    )
                                    onSetSourceType(selectTypeList.join(","))
                                }
                            }}
                        >
                            {tag.text}
                        </YakitCheckableTag>
                    ))}
                </div>
                <TableTotalAndSelectNumber total={tableTotal} selectNum={tableSelectNum} />
            </div>
            <div className={styles["mitm-log-heard-right"]}>
                <YakitPopover
                    placement='bottom'
                    trigger='click'
                    content={
                        <div className={styles["process-cont-wrapper"]}>
                            <div>
                                <YakitInput
                                    allowClear
                                    prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                                    onChange={(e) => setSearchProcessVal(e.target.value)}
                                ></YakitInput>
                            </div>
                            <div className={styles["process-list-wrapper"]}>
                                {processLoading ? (
                                    <YakitSpin style={{display: "block"}}></YakitSpin>
                                ) : (
                                    <>
                                        {renderProcessList.length ? (
                                            <>
                                                {renderProcessList.map((item) => (
                                                    <div
                                                        className={classNames(styles["process-list-item"], {
                                                            [styles["process-list-item-active"]]: curProcess.includes(
                                                                item.process
                                                            )
                                                        })}
                                                        key={item.process}
                                                        onClick={() => onProcessItemClick(item)}
                                                    >
                                                        <div className={styles["process-item-left-wrapper"]}>
                                                            {item.icon ? (
                                                                <div className={styles["process-icon"]}>
                                                                    {item.icon}
                                                                </div>
                                                            ) : (
                                                                <OutlineTerminalIcon
                                                                    className={styles["process-icon"]}
                                                                />
                                                            )}
                                                            <div
                                                                className={styles["process-item-label"]}
                                                                title={item.process}
                                                            >
                                                                {item.process}
                                                            </div>
                                                            {curProcess.includes(item.process) && (
                                                                <SolidCheckIcon className={styles["check-icon"]} />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <div style={{textAlign: "center"}}>暂无数据</div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    }
                    overlayClassName={styles["http-mitm-table-process-popover"]}
                    onVisibleChange={setProcessVisible}
                    visible={processVisible}
                >
                    {curProcess.length >= 1 ? (
                        <YakitButton type='primary'>进程筛选（{curProcess.length}）</YakitButton>
                    ) : (
                        <YakitButton type='outline1'>进程筛选</YakitButton>
                    )}
                </YakitPopover>
                <HistorySearch
                    showPopoverSearch={headerSize?.width ? headerSize?.width <= 800 : true}
                    handleSearch={handleSearch}
                />
                <YakitButton
                    type='outline1'
                    colors='danger'
                    onClick={() => {
                        // 记录时间戳
                        const nowTime: string = Math.floor(new Date().getTime() / 1000).toString()
                        setRemoteValue(MITMConsts.MITMStartTimeStamp, nowTime)
                        emiter.emit("cleanMitmLogEvent", mitmVersion)
                    }}
                >
                    重置
                </YakitButton>
                <YakitDropdownMenu
                    menu={{
                        data: [
                            {
                                key: "noResetRefresh",
                                label: "仅刷新"
                            },
                            {
                                key: "resetRefresh",
                                label: "重置查询条件刷新"
                            }
                        ],
                        onClick: ({key}) => {
                            switch (key) {
                                case "noResetRefresh":
                                    emiter.emit("onMitmNoResetRefreshEvent", mitmVersion)
                                    break
                                case "resetRefresh":
                                    emiter.emit("onMitmResetRefreshEvent", mitmVersion)
                                    break
                                default:
                                    break
                            }
                        }
                    }}
                    dropdown={{
                        trigger: ["hover"],
                        placement: "bottom"
                    }}
                >
                    <Badge dot={hasNewData} offset={[-5, 4]}>
                        <YakitButton type='text2' icon={<OutlineRefreshIcon />} onClick={(e) => e.stopPropagation()} />
                    </Badge>
                </YakitDropdownMenu>
                <HTTPFlowShield shieldData={shieldData} cancleFilter={cancleFilter} cancleAllFilter={cancleAllFilter} />
            </div>
        </div>
    )
})
