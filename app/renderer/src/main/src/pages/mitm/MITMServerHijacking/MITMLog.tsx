import React, {useEffect, useMemo, useRef, useState} from "react"
import emiter from "@/utils/eventBus/eventBus"
import styles from "./MITMServerHijacking.module.scss"
import {HistorySearch, HTTPFlowShield, ShieldData, SourceType} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {useDebounceFn, useMemoizedFn, useSize} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {setRemoteValue} from "@/utils/kv"
import {MITMConsts} from "../MITMConsts"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {OutlineSearchIcon, OutlineTerminalIcon} from "@/assets/icon/outline"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {iconProcessMap, ProcessItem} from "@/components/HTTPHistory"
import classNames from "classnames"
import {SolidCheckIcon} from "@/assets/icon/solid"

const {ipcRenderer} = window.require("electron")
interface MITMLogHeardExtraProps {
    sourceType: string
    onSetSourceType: (s: string) => void
    setShowPluginHistoryList: (s: string[]) => void
}
export const MITMLogHeardExtra: React.FC<MITMLogHeardExtraProps> = React.memo((props) => {
    const {sourceType, onSetSourceType, setShowPluginHistoryList} = props
    // 屏蔽数据
    const [shieldData, setShieldData] = useState<ShieldData>({
        data: []
    })

    useEffect(() => {
        emiter.on("onGetMITMShieldDataEvent", onGetMITMShieldData)
        return () => {
            emiter.off("onGetMITMShieldDataEvent", onGetMITMShieldData)
        }
    }, [])

    const onGetMITMShieldData = useMemoizedFn((str: string) => {
        const value = JSON.parse(str)
        setShieldData(value)
    })

    const cancleFilter = useMemoizedFn((value) => {
        emiter.emit("cancleMitmFilterEvent", JSON.stringify(value))
    })

    const onHistorySourceTypeToMitm = useMemoizedFn((sourceType: string) => {
        onSetSourceType(sourceType)
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
            emiter.emit("onMitmCurProcess", curProcess + "")
        },
        {wait: 300}
    ).run
    const onMITMLogProcessQuery = useMemoizedFn((queryStr: string) => {
        setQueryparamsStr(queryStr)
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
        emiter.emit("onMitmSearchInputVal", JSON.stringify({KeywordType: searchType, Keyword: searchValue}))
    })

    return (
        <div ref={headerRef} className={styles["mitm-log-heard"]}>
            <div style={{whiteSpace: "nowrap"}}>
                {SourceType.map((tag) => (
                    <YakitCheckableTag
                        key={tag.value}
                        checked={!!sourceType.split(",").includes(tag.value)}
                        onChange={(checked) => {
                            emiter.emit("onMitmClearFromPlugin")
                            setShowPluginHistoryList([])
                            if (checked) {
                                const selectTypeList = [...(sourceType.split(",") || []), tag.value]
                                onSetSourceType(selectTypeList.join(","))
                            } else {
                                const selectTypeList = (sourceType.split(",") || []).filter((ele) => ele !== tag.value)
                                onSetSourceType(selectTypeList.join(","))
                            }
                        }}
                    >
                        {tag.text}
                    </YakitCheckableTag>
                ))}
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
                    showPopoverSearch={headerSize?.width ? headerSize?.width <= 700 : true}
                    handleSearch={handleSearch}
                />
                <YakitButton
                    type='outline1'
                    colors='danger'
                    onClick={() => {
                        // 记录时间戳
                        const nowTime: string = Math.floor(new Date().getTime() / 1000).toString()
                        setRemoteValue(MITMConsts.MITMStartTimeStamp, nowTime)
                        emiter.emit("cleanMitmLogEvent")
                    }}
                >
                    重置
                </YakitButton>
                <HTTPFlowShield shieldData={shieldData} cancleFilter={cancleFilter} />
            </div>
        </div>
    )
})
