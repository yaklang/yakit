import React, {useEffect, useMemo, useRef, useState} from "react"
import {useCreation, useMemoizedFn, useUpdateEffect} from "ahooks"
import styles from "./BottomEditorDetails.module.scss"
import classNames from "classnames"
import {BottomEditorDetailsProps, JumpToAuditEditorProps, ShowItemType} from "./BottomEditorDetailsType"
import {OutlineChevrondownIcon, OutlineChevronupIcon, OutlineCollectionIcon, OutlineXIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import useStore from "../hooks/useStore"
import emiter from "@/utils/eventBus/eventBus"
import {PaperAirplaneIcon} from "@/assets/newIcon"
import {RuleEditorBox} from "./RuleEditorBox/RuleEditorBox"
import useDispatcher from "../hooks/useDispatcher"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {QuerySSARisksResponse, SSARisk} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {Divider, Tooltip} from "antd"
import {formatTimestamp} from "@/utils/timeUtil"
import {SeverityMapTag, YakitRiskDetailContent} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {OpenFileByPathProps} from "../YakRunnerAuditCodeType"
import {getNameByPath} from "../utils"
import {CodeRangeProps} from "../RightAuditDetail/RightAuditDetail"
import {Selection} from "../RunnerTabs/RunnerTabsType"
import {
    IconSolidDefaultRiskIcon,
    IconSolidHighRiskIcon,
    IconSolidInfoRiskIcon,
    IconSolidLowRiskIcon,
    IconSolidMediumRiskIcon,
    IconSolidSeriousIcon
} from "@/pages/risks/icon"
const {ipcRenderer} = window.require("electron")

// 编辑器区域 展示详情（输出/语法检查/终端/帮助信息）
export const BottomEditorDetails: React.FC<BottomEditorDetailsProps> = (props) => {
    const {isShowEditorDetails, setEditorDetails, showItem, setShowItem} = props
    const {projectName, auditExecuting, activeFile} = useStore()
    const {setAuditRule} = useDispatcher()
    // 不再重新加载的元素
    const [showType, setShowType] = useState<ShowItemType[]>([])
    // monaco输入内容
    const [ruleEditor, setRuleEditor] = useState<string>("")
    // 展示所需的BugHash
    const [bugHash, setBugHash] = useState<string>("")
    const [refresh, setRefresh] = useState<boolean>(false)

    const [reset,setReset] = useState<boolean>(false)

    // 数组去重
    const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    const onResetAuditRuleFun = useMemoizedFn((v: string) => {
        setRuleEditor(v)
    })

    useEffect(() => {
        emiter.on("onResetAuditRule", onResetAuditRuleFun)
        return () => {
            emiter.off("onResetAuditRule", onResetAuditRuleFun)
        }
    }, [])

    useEffect(() => {
        if (showItem && isShowEditorDetails) {
            if (showType.includes(showItem)) return
            setShowType((arr) => filterItem([...arr, showItem]))
        }
    }, [showItem, isShowEditorDetails])

    const onOpenBottomDetailFun = useMemoizedFn((v: string) => {
        try {
            const {type}: {type: ShowItemType} = JSON.parse(v)
            setEditorDetails(true)
            setShowItem(type)
        } catch (error) {}
    })

    const onCodeAuditOpenBugDetailFun = useMemoizedFn((hash: string) => {
        setBugHash(hash)
        setRefresh(!refresh)
    })

    useEffect(() => {
        emiter.on("onCodeAuditOpenBottomDetail", onOpenBottomDetailFun)
        // 打开编译BUG详情
        emiter.on("onCodeAuditOpenBugDetail", onCodeAuditOpenBugDetailFun)
        return () => {
            emiter.off("onCodeAuditOpenBottomDetail", onOpenBottomDetailFun)
            emiter.off("onCodeAuditOpenBugDetail", onCodeAuditOpenBugDetailFun)
        }
    }, [])

    const onAuditRuleSubmit = useMemoizedFn(() => {
        if (!projectName || ruleEditor.length === 0) return
        setAuditRule && setAuditRule(ruleEditor)
        emiter.emit("onAuditRuleSubmit", ruleEditor)
    })

    const onStopAuditRule = useMemoizedFn(() => {
        emiter.emit("onStopAuditRule")
    })

    useUpdateEffect(() => {
        setBugHash("")
    }, [activeFile?.path])
    return (
        <div className={styles["bottom-editor-details"]}>
            <div className={styles["header"]}>
                <div className={styles["select-box"]}>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "ruleEditor",
                            [styles["no-active-item"]]: showItem !== "ruleEditor"
                        })}
                        onClick={() => setShowItem("ruleEditor")}
                    >
                        <div className={styles["title"]}>规则编写</div>
                    </div>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "holeDetail",
                            [styles["no-active-item"]]: showItem !== "holeDetail"
                        })}
                        onClick={() => setShowItem("holeDetail")}
                    >
                        <div className={styles["title"]}>漏洞汇总</div>
                    </div>
                </div>
                <div className={styles["extra"]}>
                    {showItem === "ruleEditor" && (
                        <>
                            {auditExecuting ? (
                                <YakitButton danger icon={<PaperAirplaneIcon />} onClick={onStopAuditRule}>
                                    暂停执行
                                </YakitButton>
                            ) : (
                                <YakitButton
                                    icon={<PaperAirplaneIcon />}
                                    onClick={onAuditRuleSubmit}
                                    disabled={!projectName || ruleEditor.length === 0}
                                >
                                    开始审计
                                </YakitButton>
                            )}
                        </>
                    )}
                    {(activeFile?.syntaxCheck || [])?.length > 0 && showItem === "holeDetail" && (
                        <Tooltip title='一键收起'>
                            <YakitButton
                                type='text2'
                                icon={<OutlineCollectionIcon />}
                                onClick={() => {
                                    setReset(!reset)
                                }}
                            />
                        </Tooltip>
                    )}
                    <YakitButton
                        type='text2'
                        icon={<OutlineXIcon />}
                        onClick={() => {
                            setEditorDetails(false)
                        }}
                    />
                </div>
            </div>
            <div className={styles["content"]}>
                {showType.includes("ruleEditor") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "ruleEditor"
                        })}
                    >
                        <RuleEditorBox
                            ruleEditor={ruleEditor}
                            setRuleEditor={setRuleEditor}
                            disabled={auditExecuting}
                            onAuditRuleSubmit={onAuditRuleSubmit}
                        />
                    </div>
                )}
                {showType.includes("holeDetail") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "holeDetail"
                        })}
                    >
                        {activeFile?.syntaxCheck && activeFile.syntaxCheck.length !== 0 ? (
                            <HoleBugList bugHash={bugHash} refresh={refresh} list={activeFile.syntaxCheck} reset={reset}/>
                        ) : (
                            <div className={styles["no-audit"]}>
                                <YakitEmpty title='暂无漏洞' />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

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

    const onContext = useMemoizedFn(async () => {
        const item: CodeRangeProps = JSON.parse(info.CodeRange)
        const {url, start_line, start_column, end_line, end_column} = item
        const name = await getNameByPath(url)
        const highLightRange: Selection = {
            startLineNumber: start_line,
            startColumn: start_column,
            endLineNumber: end_line,
            endColumn: end_column
        }
        const OpenFileByPathParams: OpenFileByPathProps = {
            params: {
                path: url,
                name,
                highLightRange
            }
        }
        emiter.emit("onCodeAuditOpenFileByPath", JSON.stringify(OpenFileByPathParams))
        // 纯跳转行号
        setTimeout(() => {
            const obj: JumpToAuditEditorProps = {
                selections: highLightRange,
                path: url,
                isSelect: false
            }
            emiter.emit("onCodeAuditJumpEditorDetail", JSON.stringify(obj))
        }, 100)
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
                        <div
                            className={classNames(styles["content-heard-body-title"], "content-ellipsis")}
                            onClick={onContext}
                        >
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
                    isScroll={false}
                />
            )}
        </>
    )
})

interface HoleBugListProps {
    bugHash: string
    refresh: boolean
    list: SSARisk[]
    reset?: boolean
}

export const HoleBugList: React.FC<HoleBugListProps> = React.memo((props) => {
    const {bugHash, refresh, list, reset} = props
    const {activeFile} = useStore()
    const [openKeyList, setOpenKeyList] = useState<string[]>([])
    // 数组去重
    const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)
    useEffect(() => {
        const newArr = filterItem([...openKeyList, bugHash])
        setOpenKeyList(newArr)
        window.location.hash = `#${bugHash}`
    }, [bugHash, refresh])

    useUpdateEffect(() => {
        setOpenKeyList([])
    }, [activeFile?.path,reset])
    return (
        <>
            {list.map((info) => (
                <YakitAuditHoleItem info={info} openKeyList={openKeyList} setOpenKeyList={setOpenKeyList} />
            ))}
        </>
    )
})
