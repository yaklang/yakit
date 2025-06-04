import React, {useMemo, useRef, useState} from "react"
import styles from "./IRifyHome.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlinCompileIcon,
    OutlineBugIcon,
    OutlineDatabaseIcon,
    OutlineDocumentsearchIcon,
    OutlineScanIcon
} from "@/assets/icon/outline"
import {PublicAuditCodeIcon, PublicCodeScanIcon, PublicRuleManagementIcon} from "@/routes/publicIcon"
import {SolidExclamationIcon, SolidPlayIcon} from "@/assets/icon/solid"
import {Divider, Tooltip} from "antd"
import {convertToBytes} from "./Home"
import {getEnvTypeByProjects, ProjectDescription} from "../softwareSettings/ProjectManage"
import {useDebounceEffect, useInViewport} from "ahooks"
import classNames from "classnames"
import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"
import {FieldName, Fields} from "../risks/RiskTable"
import {QueryGeneralResponse} from "../invoker/schema"
import {SSAProgramResponse} from "../yakRunnerAuditCode/AuditCode/AuditCodeType"
import {apiGetSSARiskFieldGroup} from "../yakRunnerAuditHole/YakitAuditHoleTable/utils"
const {ipcRenderer} = window.require("electron")
interface IRifyHomeProps {}
const IRifyHome: React.FC<IRifyHomeProps> = (props) => {
    const homeRef = useRef(null)
    const [inViewport] = useInViewport(homeRef)
    const [curProjectInfo, setCurProjectInfo] = useState<ProjectDescription>()
    const [riskLevelData, setRiskLevelData] = useState<FieldName[]>([])
    const [total, setTotal] = useState<number>()

    // 更新项目数据库大小
    const updateProjectDbSize = async () => {
        ipcRenderer
            .invoke("GetCurrentProjectEx", {
                Type: getEnvTypeByProjects()
            })
            .then((res: ProjectDescription) => {
                setCurProjectInfo(res)
            })
    }

    // 更新漏洞数据
    const undateRiskLevel = () => {
        apiGetSSARiskFieldGroup().then((res) => {
            setRiskLevelData(res.SeverityField)
        })
    }

    // 获取编译项目数
    const updateSSAPrograms = () => {
        ipcRenderer.invoke("QuerySSAPrograms", {}).then((i: QueryGeneralResponse<SSAProgramResponse>) => {
            setTotal(i.Total)
        })
    }

    useDebounceEffect(
        () => {
            updateProjectDbSize()
            undateRiskLevel()
            updateSSAPrograms()
        },
        [inViewport],
        {wait: 200}
    )

    const judgeMoreTenGB = useMemo(() => {
        const arr: string[] = curProjectInfo?.FileSize.split(" ") || []
        if (arr[0] && arr[1]) {
            return convertToBytes(+arr[0], arr[1]) > convertToBytes(10, "GB")
        } else {
            return false
        }
    }, [curProjectInfo?.FileSize])

    // 打开页面 - 带参数
    const onMenuParams = (info: {route: YakitRoute; params: any}) => {
        if (!info.route) return
        emiter.emit("openPage", JSON.stringify(info))
    }

    const riskLevelTotal = (verbose: string) => {
        return riskLevelData.find((item) => item.Verbose === verbose)?.Total || 0
    }

    return (
        <div className={styles["irify-home"]} ref={homeRef}>
            <div className={styles["main"]}>
                <div className={styles["header"]}>代码千万行 安全第一行</div>
                <div className={styles["card-list"]}>
                    <div className={styles["card-item"]}>
                        <div className={styles["img"]}>
                            <PublicAuditCodeIcon />
                        </div>
                        <div className={styles["content"]}>
                            <div className={styles["title"]}>代码审计</div>
                            <div className={styles["sub-title"]}>
                                通过编写审计规则对代码行为进行分析，发现代码中的风险片段，支持Java、PHP、Yaklang、Golang
                                等多种语言
                            </div>
                        </div>
                        <YakitButton
                            icon={<SolidPlayIcon />}
                            size='max'
                            onClick={() =>
                                onMenuParams({
                                    route: YakitRoute.YakRunner_Audit_Code,
                                    params: undefined
                                })
                            }
                        >
                            开始审计
                        </YakitButton>
                    </div>
                    <div className={styles["card-item"]}>
                        <div className={styles["img"]}>
                            <PublicCodeScanIcon />
                        </div>
                        <div className={styles["content"]}>
                            <div className={styles["title"]}>代码扫描</div>
                            <div className={styles["sub-title"]}>
                                内置丰富规则库，可自由选择规则分组进行代码扫描，帮助分析代码结构和发现代码中的风险片段
                            </div>
                        </div>

                        <YakitButton
                            icon={<OutlineScanIcon />}
                            size='max'
                            onClick={() =>
                                onMenuParams({
                                    route: YakitRoute.YakRunner_Code_Scan,
                                    params: {}
                                })
                            }
                        >
                            开始扫描
                        </YakitButton>
                    </div>
                    <div className={styles["card-item"]}>
                        <div className={styles["img"]}>
                            <PublicRuleManagementIcon />
                        </div>
                        <div className={styles["content"]}>
                            <div className={styles["title"]}>规则管理</div>
                            <div className={styles["sub-title"]}>
                                可根据需求自定义审计规则和规则分组，支持导入导出，上传云端等分享行为，便于积累属于自己的规则库
                            </div>
                        </div>

                        <YakitButton
                            icon={<OutlineDocumentsearchIcon />}
                            size='max'
                            onClick={() =>
                                onMenuParams({
                                    route: YakitRoute.Rule_Management,
                                    params: {}
                                })
                            }
                        >
                            查看规则
                        </YakitButton>
                    </div>
                </div>
            </div>
            <div className={styles["footer"]}>
                <div className={styles["main"]}>
                    <div className={styles["data-preview-item"]}>
                        <OutlineDatabaseIcon className={styles["data-preview-item-icon"]} />
                        <span className={styles["data-preview-item-text"]}>项目数据库</span>
                        <div className={styles["data-preview-item-cont"]}>
                            {!judgeMoreTenGB ? (
                                <span className={styles["data-preview-item-number"]}>{curProjectInfo?.FileSize}</span>
                            ) : (
                                <>
                                    <span className={styles["data-preview-item-number"]} style={{color: "#d33a30"}}>
                                        {curProjectInfo?.FileSize}
                                    </span>
                                    <Tooltip title='数据库过大，为避免影响使用，建议创建新项目。'>
                                        <SolidExclamationIcon className={styles["database-warning-icon"]} />
                                    </Tooltip>
                                </>
                            )}
                        </div>
                    </div>
                    <div className={styles["divider"]} />
                    <div className={styles["data-preview-item"]}>
                        <OutlineBugIcon className={styles["data-preview-item-icon"]} />
                        <span className={styles["data-preview-item-text"]}>漏洞数据</span>
                        <div className={styles["risk-tag-wrapper"]}>
                            {riskLevelTotal("严重") ? (
                                <div
                                    className={classNames(styles["risk-tag"], styles["seriousRisk-tag"])}
                                    onClick={() =>
                                        onMenuParams({
                                            route: YakitRoute.YakRunner_Audit_Hole,
                                            params: {SeverityList: ["critical"]}
                                        })
                                    }
                                >
                                    <div className={styles["risk-text"]}>严重</div>
                                    <div className={styles["risk-num"]}>{riskLevelTotal("严重")}</div>
                                </div>
                            ) : null}
                            {riskLevelTotal("高危") ? (
                                <div
                                    className={classNames(styles["risk-tag"], styles["highRisk-tag"])}
                                    onClick={() =>
                                        onMenuParams({
                                            route: YakitRoute.YakRunner_Audit_Hole,
                                            params: {SeverityList: ["high"]}
                                        })
                                    }
                                >
                                    <div className={styles["risk-text"]}>高危</div>
                                    <div className={styles["risk-num"]}>{riskLevelTotal("高危")}</div>
                                </div>
                            ) : null}
                            {riskLevelTotal("中危") ? (
                                <div
                                    className={classNames(styles["risk-tag"], styles["mediumRisk-tag"])}
                                    onClick={() =>
                                        onMenuParams({
                                            route: YakitRoute.YakRunner_Audit_Hole,
                                            params: {SeverityList: ["middle"]}
                                        })
                                    }
                                >
                                    <div className={styles["risk-text"]}>中危</div>
                                    <div className={styles["risk-num"]}>{riskLevelTotal("中危")}</div>
                                </div>
                            ) : null}
                            {riskLevelTotal("低危") ? (
                                <div
                                    className={classNames(styles["risk-tag"], styles["lowRisk-tag"])}
                                    onClick={() =>
                                        onMenuParams({
                                            route: YakitRoute.YakRunner_Audit_Hole,
                                            params: {SeverityList: ["low"]}
                                        })
                                    }
                                >
                                    <div className={styles["risk-text"]}>低危</div>
                                    <div className={styles["risk-num"]}>{riskLevelTotal("低危")}</div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                    <div className={styles["divider"]} />
                    <div className={styles["data-preview-item"]}>
                        <OutlinCompileIcon className={styles["data-preview-item-icon"]} />
                        <span className={styles["data-preview-item-text"]}>编译项目数</span>
                        <div className={styles["data-preview-item-cont"]}>
                            <span className={styles["data-preview-item-number"]}>{total}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default IRifyHome
