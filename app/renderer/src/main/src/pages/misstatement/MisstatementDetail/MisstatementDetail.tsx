import {YakCodemirror} from "@/components/yakCodemirror/YakCodemirror"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitResizeBox, YakitResizeBoxProps} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"
import {
    IconSolidDefaultRiskIcon,
    IconSolidHighRiskIcon,
    IconSolidInfoRiskIcon,
    IconSolidLowRiskIcon,
    IconSolidMediumRiskIcon,
    IconSolidSeriousIcon
} from "@/pages/risks/icon"
import {SeverityMapTag} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {CollapseList} from "@/pages/yakRunner/CollapseList/CollapseList"
import {CodeRangeProps} from "@/pages/yakRunnerAuditCode/RightAuditDetail/RightAuditDetail"
import {YakURLDataItemProps} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {formatTimestamp} from "@/utils/timeUtil"
import {useCreation, useMemoizedFn} from "ahooks"
import {Descriptions, Divider, Tooltip} from "antd"
import classNames from "classnames"
import React, {useEffect, useRef} from "react"
import {useState} from "react"
import {
    MisstatementAuditResultCollapseProps,
    MisstatementAuditResultDescribeProps,
    MisstatementDetailsProps
} from "./MisstatementDetailType"
import styles from "./MisstatementDetail.module.scss"
import {API} from "@/services/swagger/resposeType"
import {openPacketNewWindow} from "@/utils/openWebsite"

export const MisstatementRiskDetails = <T extends API.RiskFeedBackData>(props: MisstatementDetailsProps<T>) => {
    const {info, className = "", border = true} = props
    const [currentSelectShowType, setCurrentSelectShowType] = useState<"request" | "response">("request")
    const [isShowCode, setIsShowCode] = useState<boolean>(true)
    const descriptionsRef = useRef<HTMLDivElement>(null)
    const descriptionsDivWidth = useListenWidth(descriptionsRef)

    useEffect(() => {
        const isRequestString = !!requestString(info)
        const isResponseString = !!responseString(info)
        if (isRequestString) {
            setCurrentSelectShowType("request")
        } else if (isResponseString) {
            setCurrentSelectShowType("response")
        }
        if (isRequestString || isResponseString) {
            setIsShowCode(true)
        } else {
            setIsShowCode(false)
        }
    }, [info])

    const severityInfo = useCreation(() => {
        const severity = SeverityMapTag.filter((item) => item.key.includes(info.severity || ""))[0]
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
            name: severity?.name || info?.severity || "-"
        }
    }, [info.severity])
    const column = useCreation(() => {
        if (descriptionsDivWidth > 600) return 3
        return 1
    }, [descriptionsDivWidth])
    const codeNode = useMemoizedFn(() => {
        const isHttps = !!info.url && info.url?.length > 0 && info.url.includes("https")
        const extraParams = {
            originValue: currentSelectShowType === "request" ? requestString(info) : responseString(info),
            webFuzzerValue: currentSelectShowType === "request" ? "" : requestString(info)
        }
        return (
            <NewHTTPPacketEditor
                defaultHttps={isHttps}
                url={info.url || ""}
                readOnly={true}
                isShowBeautifyRender={true}
                showDefaultExtra={true}
                hideSearch={true}
                noHex={true}
                noModeTag={true}
                simpleMode={true}
                bordered={false}
                isResponse={currentSelectShowType === "response"}
                title={
                    <YakitRadioButtons
                        size='small'
                        value={currentSelectShowType}
                        onChange={(e) => {
                            setCurrentSelectShowType(e.target.value)
                        }}
                        buttonStyle='solid'
                        options={[
                            {
                                value: "request",
                                label: "请求"
                            },
                            {
                                value: "response",
                                label: "响应"
                            }
                        ]}
                    />
                }
                showDownBodyMenu={false}
                onClickOpenPacketNewWindowMenu={() => {
                    openPacketNewWindow({
                        request: {
                            originValue: requestString(info)
                        },
                        response: {
                            originValue: responseString(info)
                        }
                    })
                }}
                {...extraParams}
            />
        )
    })
    const requestString = useMemoizedFn((info) => {
        return atob(info?.request || "")
    })
    const responseString = useMemoizedFn((info) => {
        return atob(info?.response || "")
    })
    const extraResizeBoxProps = useCreation(() => {
        let p: YakitResizeBoxProps = {
            firstNode: <></>,
            secondNode: <></>,
            firstRatio: "50%",
            secondRatio: "50%",
            lineStyle: {height: "auto"},
            firstNodeStyle: {height: "auto"}
        }
        if (!isShowCode) {
            p.firstRatio = "0%"
            p.secondRatio = "100%"
            p.lineStyle = {display: "none"}
            p.firstNodeStyle = {display: "none"}
            p.secondNodeStyle = {padding: 0}
        }
        return p
    }, [isShowCode])

    const onClickIP = useMemoizedFn(() => {
        if (props.onClickIP) props.onClickIP(info)
    })

    return (
        <>
            <div
                className={classNames(
                    styles["yakit-risk-details-content"],
                    "yakit-descriptions",
                    {
                        [styles["yakit-risk-details-content-no-border"]]: !border
                    },
                    className
                )}
            >
                <div className={styles["content-heard"]}>
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
                                {info.title || "-"}
                            </div>
                            <div className={styles["content-heard-body-description"]}>
                                <YakitTag color='info' style={{cursor: "pointer"}} onClick={onClickIP}>
                                    ID:{info.id}
                                </YakitTag>
                                <span>IP:{info.ip || "-"}</span>
                                <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                <span className={styles["description-port"]}>端口:{info.port || "-"}</span>
                                <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                <span className={styles["url-info"]}>
                                    URL:
                                    <span className={classNames(styles["url"], "content-ellipsis")}>
                                        {info?.url || "-"}
                                    </span>
                                    <CopyComponents copyText={info?.url || "-"} />
                                </span>
                                <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                <span className={styles["content-heard-body-time"]}>
                                    发现时间:{!!info.riskCreatedAt ? formatTimestamp(info.riskCreatedAt) : "-"}
                                </span>
                                {!isShowCode && (
                                    <>
                                        <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                                        <YakitTag color='warning'>无数据包</YakitTag>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <YakitResizeBox
                    {...extraResizeBoxProps}
                    firstNode={<div className={styles["content-resize-first"]}>{codeNode()}</div>}
                    secondNode={
                        <div className={styles["content-resize-second"]} ref={descriptionsRef}>
                            <Descriptions bordered size='small' column={column} labelStyle={{width: 120}}>
                                <Descriptions.Item label='Host'>{info.host || "-"}</Descriptions.Item>
                                <Descriptions.Item label='类型'>
                                    {(info?.riskTypeVerbose || info.riskType).replaceAll("NUCLEI-", "")}
                                </Descriptions.Item>
                                <Descriptions.Item label='来源'>{info?.fromYakScript || "漏洞检测"}</Descriptions.Item>
                                <Descriptions.Item label='反连Token' contentStyle={{minWidth: 120}}>
                                    {info?.reverseToken || "-"}
                                </Descriptions.Item>
                                <Descriptions.Item label='Hash'>{info?.riskHash || "-"}</Descriptions.Item>
                                <Descriptions.Item label='验证状态'>
                                    <YakitTag color={`${!info.waitingVerified ? "success" : "info"}`}>
                                        {!info.waitingVerified ? "已验证" : "未验证"}
                                    </YakitTag>
                                </Descriptions.Item>

                                <>
                                    <Descriptions.Item
                                        label='漏洞描述'
                                        span={column}
                                        contentStyle={{whiteSpace: "pre-wrap"}}
                                    >
                                        {info.description || "-"}
                                    </Descriptions.Item>
                                    <Descriptions.Item
                                        label='解决方案'
                                        span={column}
                                        contentStyle={{whiteSpace: "pre-wrap"}}
                                    >
                                        {info.solution || "-"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label='Parameter' span={column}>
                                        {info.parameter || "-"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label='Payload' span={column}>
                                        <div style={{maxHeight: 180, overflow: "auto"}}>{`${info.payload}` || "-"}</div>
                                    </Descriptions.Item>
                                    <Descriptions.Item label='详情' span={column}>
                                        <div style={{height: 180}}>
                                            <YakitEditor type='yak' value={`${info.details || ""}`} readOnly={true} />
                                        </div>
                                    </Descriptions.Item>
                                </>
                            </Descriptions>
                            <div className={styles["no-more"]}>暂无更多</div>
                        </div>
                    }
                    firstMinSize={200}
                    secondMinSize={400}
                />
            </div>
        </>
    )
}

export const MisstatementAuditRiskDetails = <T extends API.SSARiskResponseData>(props: MisstatementDetailsProps<T>) => {
    const {info, className, border} = props
    const [yakURLData, setYakURLData] = useState<YakURLDataItemProps[]>([])

    useEffect(() => {
        initData()
    }, [info])

    const [isShowCollapse, setIsShowCollapse] = useState<boolean>(false)
    const initData = useMemoizedFn(async () => {
        try {
            const {index, codeRange, programName, codeFragment} = info
            if (index && codeRange && codeFragment && programName) {
                const code_range: CodeRangeProps = JSON.parse(codeRange)
                setYakURLData([
                    {
                        index: index,
                        code_range,
                        source: codeFragment,
                        ResourceName: programName
                    }
                ])
                setIsShowCollapse(true)
            } else {
                setIsShowCollapse(false)
            }
        } catch (error) {
            setIsShowCollapse(false)
        }
    })

    const extraResizeBoxProps = useCreation(() => {
        let p: YakitResizeBoxProps = {
            firstNode: <></>,
            secondNode: <></>,
            firstRatio: "50%",
            secondRatio: "50%",
            lineStyle: {height: "auto"},
            firstNodeStyle: {height: "auto"}
        }
        if (!isShowCollapse) {
            p.firstRatio = "0%"
            p.secondRatio = "100%"
            p.lineStyle = {display: "none"}
            p.firstNodeStyle = {display: "none"}
            p.secondNodeStyle = {padding: 0}
        }
        return p
    }, [isShowCollapse])

    const onClickIP = useMemoizedFn(() => {
        if (props.onClickIP) props.onClickIP(info)
    })

    const severityInfo = useCreation(() => {
        const severity = SeverityMapTag.filter((item) => item.key.includes(info.severity || ""))[0]
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
            name: severity?.name || info?.severity || "-"
        }
    }, [info.severity])

    return (
        <div
            className={classNames(
                styles["yakit-audit-risk-details-content"],
                "yakit-descriptions",
                {
                    [styles["yakit-audit-risk-details-content-no-border"]]: !border
                },
                className
            )}
        >
            <div className={styles["content-heard"]}>
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
                            {info?.titleVerbose || info.title || "-"}
                        </div>
                        <div className={styles["content-heard-body-description"]}>
                            <YakitTag color='info' style={{cursor: "pointer"}} onClick={onClickIP}>
                                ID:{info.id}
                            </YakitTag>
                            <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                            <span className={styles["description-port"]}>所属项目:{info.programName || "-"}</span>
                            <Divider type='vertical' style={{height: 16, margin: "0 8px"}} />
                            <span className={styles["content-heard-body-time"]}>
                                发现时间:{!!info.ssaRiskCreatedAt ? formatTimestamp(info.ssaRiskCreatedAt) : "-"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <YakitResizeBox
                {...extraResizeBoxProps}
                firstNode={
                    <div className={styles["content-resize-collapse"]}>
                        <div className={styles["main-title"]}>相关代码段</div>
                        <MisstatementAuditResultCollapse
                            data={yakURLData}
                            collapseProps={{
                                defaultActiveKey: ["collapse-list-0"]
                            }}
                        />
                    </div>
                }
                secondNode={<MisstatementAuditResultDescribe info={info} />}
                firstMinSize={200}
                secondMinSize={400}
            />
        </div>
    )
}

const MisstatementAuditResultCollapse: React.FC<MisstatementAuditResultCollapseProps> = React.memo((props) => {
    const {data, collapseProps} = props

    const titleRender = (info: YakURLDataItemProps) => {
        const {index, code_range, source, ResourceName} = info
        const lastSlashIndex = code_range.url.lastIndexOf("/")
        const fileName = code_range.url.substring(lastSlashIndex + 1)
        return (
            <div className={styles["node-content"]}>
                <div className={classNames(styles["content-body"])}>
                    <div className={classNames(styles["name"], "yakit-content-single-ellipsis")}>{ResourceName}</div>
                    <Tooltip title={`${code_range.url}:${code_range.start_line}`}>
                        <div className={classNames(styles["detail"], "yakit-content-single-ellipsis")}>
                            {fileName}:{code_range.start_line}
                        </div>
                    </Tooltip>
                </div>
            </div>
        )
    }

    const renderItem = (info: YakURLDataItemProps) => {
        const filename = info.code_range.url.split("/").pop()
        const {start_line, end_line, source_code_line, start_column, end_column} = info.code_range
        return (
            <YakCodemirror
                readOnly={true}
                fileName={filename}
                value={info.source}
                firstLineNumber={source_code_line}
                highLight={{
                    from: {line: start_line - source_code_line, ch: start_column}, // 开始位置
                    to: {line: end_line - source_code_line, ch: end_column} // 结束位置
                }}
            />
        )
    }
    return (
        <div className={styles["audit-result-collapse"]}>
            <CollapseList
                type='sideBar'
                list={data}
                titleRender={titleRender}
                renderItem={renderItem}
                collapseProps={collapseProps}
            />
        </div>
    )
})

const MisstatementAuditResultDescribe: React.FC<MisstatementAuditResultDescribeProps> = React.memo((props) => {
    const {info, columnSize} = props

    const column = useCreation(() => {
        if (columnSize) return columnSize
        return 1
    }, [])

    const getRule = useMemoizedFn(() => {
        return info?.fromRule || "漏洞检测"
    })
    return (
        <div className={styles["content-resize-second"]}>
            <Descriptions bordered size='small' column={column} labelStyle={{width: 120}}>
                <Descriptions.Item label='类型'>
                    {(info?.riskTypeVerbose || info?.riskType || "").replaceAll("NUCLEI-", "")}
                </Descriptions.Item>
                <Descriptions.Item label='Hash'>{info?.hash || "-"}</Descriptions.Item>
                <Descriptions.Item label='扫描规则'>{getRule()}</Descriptions.Item>
                <>
                    <Descriptions.Item label='漏洞描述' span={column} contentStyle={{whiteSpace: "pre-wrap"}}>
                        {info.description || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label='解决方案' span={column} contentStyle={{whiteSpace: "pre-wrap"}}>
                        {info.solution || "-"}
                    </Descriptions.Item>
                </>
            </Descriptions>
            <div className={styles["no-more"]}>暂无更多</div>
        </div>
    )
})
