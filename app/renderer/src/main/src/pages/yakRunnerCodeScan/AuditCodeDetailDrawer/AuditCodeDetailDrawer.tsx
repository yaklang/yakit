import React, {useEffect, useMemo, useState} from "react"
import {RightBugAuditResult, YakitRiskDetailContent} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {QuerySSARisksResponse, SSARisk} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"
import {SeverityMapTag, YakitAuditRiskDetails} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTable"
import styles from "./AuditCodeDetailDrawer.module.scss"
import {Divider} from "antd"
import {
    IconSolidDefaultRiskIcon,
    IconSolidHighRiskIcon,
    IconSolidInfoRiskIcon,
    IconSolidLowRiskIcon,
    IconSolidMediumRiskIcon,
    IconSolidSeriousIcon
} from "@/pages/risks/icon"
import {useCreation, useMemoizedFn} from "ahooks"
import classNames from "classnames"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineChevrondownIcon, OutlineChevronupIcon} from "@/assets/icon/outline"
const {ipcRenderer} = window.require("electron")

interface HoleBugDetailProps {
    bugHash: string
}

export const HoleBugDetail: React.FC<HoleBugDetailProps> = React.memo((props) => {
    const {bugHash} = props
    const [info, setInfo] = useState<SSARisk>()
    useEffect(() => {
        ipcRenderer
            .invoke("QuerySSARisks", {
                Filter: {
                    Hash: [bugHash]
                }
            })
            .then((res: QuerySSARisksResponse) => {
                const {Data} = res
                if (Data.length > 0) {
                    setInfo(Data[0])
                }
            })
            .catch((err) => {})
    }, [bugHash])
    return <>{info && <RightBugAuditResult info={info} columnSize={1} />}</>
})

interface YakitAuditHoleItemProps {
    info: SSARisk
    openKeyList: string[]
    setOpenKeyList: (v: string[]) => void
}

export const YakitAuditHoleItem: React.FC<YakitAuditHoleItemProps> = React.memo((props) => {
    const {info, openKeyList, setOpenKeyList} = props
    const [isShowCollapse, setIsShowCollapse] = useState<boolean>(false)
    const severityInfo = useCreation(() => {
        const severity = SeverityMapTag.filter((item) => item.key.includes(info.Severity || ""))[0]
        let icon = <></>
        switch (severity?.name) {
            case "信息":
                icon = <IconSolidInfoRiskIcon />
                break
            case "低危":
                icon = <IconSolidLowRiskIcon />
                break
            case "中危":
                icon = <IconSolidMediumRiskIcon />
                break
            case "高危":
                icon = <IconSolidHighRiskIcon />
                break
            case "严重":
                icon = <IconSolidSeriousIcon />
                break
            default:
                icon = <IconSolidDefaultRiskIcon />
                break
        }
        return {
            icon,
            tag: severity?.tag || "default",
            name: severity?.name || info?.Severity || "-"
        }
    }, [info.Severity])

    const expand = useMemo(() => {
        return openKeyList.includes(info.Hash)
    }, [openKeyList, info.Hash])

    const onExpand = useMemoizedFn((isExpand: boolean) => {
        if (isExpand) {
            let newKeyList = openKeyList.filter((item) => item !== info.Hash)
            setOpenKeyList(newKeyList)
        } else {
            setOpenKeyList([...openKeyList, info.Hash])
        }
    })

    return (
        <>
            <div className={styles["audit-hole-item"]} id={info.Hash}>
                <div className={styles["content-heard-left"]}>
                    <div className={styles["content-heard-severity"]}>
                        {severityInfo.icon}
                        <span
                            className={classNames(
                                styles["content-heard-severity-name"],
                                styles[`severity-${severityInfo.tag}`]
                            )}
                        >
                            {severityInfo.name}
                        </span>
                    </div>
                    <Divider type='vertical' style={{height: 40, margin: "0 16px"}} />
                    <div className={styles["content-heard-body"]}>
                        <div className={classNames(styles["content-heard-body-title"], "content-ellipsis")}>
                            {info?.TitleVerbose || info.Title || "-"}
                        </div>
                        <div className={styles["content-heard-body-description"]}>
                            <YakitTag color='info' style={{cursor: "pointer"}}>
                                ID:{info.Id}
                            </YakitTag>
                            <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                            <span className={styles["description-port"]}>所属项目:{info.ProgramName || "-"}</span>
                            <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                            <span className={styles["content-heard-body-time"]}>
                                发现时间:{!!info.CreatedAt ? formatTimestamp(info.CreatedAt) : "-"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles["content-heard-right"]} style={{height: "100%", alignItems: "center"}}>
                    <YakitButton
                        type='text2'
                        icon={expand ? <OutlineChevronupIcon /> : <OutlineChevrondownIcon />}
                        onClick={() => onExpand(expand)}
                    />
                </div>
            </div>
            {expand && (
                <YakitRiskDetailContent
                    info={info}
                    isShowCollapse={isShowCollapse}
                    setIsShowCollapse={setIsShowCollapse}
                />
            )}
        </>
    )
})

interface HoleBugListProps {
    bugHash: string
    refresh: boolean
    list: SSARisk[]
}

export const HoleBugList: React.FC<HoleBugListProps> = React.memo((props) => {
    const {bugHash, refresh, list} = props
    const [openKeyList, setOpenKeyList] = useState<string[]>([])
    // 数组去重
    const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)
    useEffect(() => {
        const newArr = filterItem([...openKeyList, bugHash])
        setOpenKeyList(newArr)
        window.location.hash = `#${bugHash}`;
    }, [bugHash, refresh])
    return (
        <>
            {list.map((info) => (
                <YakitAuditHoleItem info={info} openKeyList={openKeyList} setOpenKeyList={setOpenKeyList} />
            ))}
        </>
    )
})
