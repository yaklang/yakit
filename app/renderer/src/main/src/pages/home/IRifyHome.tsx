import React, {useMemo, useRef, useState} from "react"
import styles from "./IRifyHome.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlinCompileIcon,
    OutlineBugIcon,
    OutlineDatabaseIcon,
    OutlineDocumentsearchIcon,
    OutlineScanIcon,
    OutlineTrashSecondIcon
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
import {SSAProjectResponse} from "../yakRunnerAuditCode/AuditCode/AuditCodeType"
import {apiGetSSARiskFieldGroupEx} from "../yakRunnerAuditHole/YakitAuditHoleTable/utils"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {SystemInfo} from "@/constants/hardware"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
const {ipcRenderer} = window.require("electron")
interface IRifyHomeProps {}
const IRifyHome: React.FC<IRifyHomeProps> = (props) => {
    const {t, i18n} = useI18nNamespaces(["home", "yakitRoute", "yakitUi"])
    const homeRef = useRef(null)
    const [inViewport] = useInViewport(homeRef)
    const [curProjectInfo, setCurProjectInfo] = useState<ProjectDescription>()
    const [riskLevelData, setRiskLevelData] = useState<FieldName[]>([])
    const [total, setTotal] = useState<number>()
    const [reclaimHint, setReclaimHint] = useState<boolean>(false)

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
        apiGetSSARiskFieldGroupEx().then((res) => {
            setRiskLevelData(res.SeverityField)
        })
    }

    // 获取编译项目数
    const updateSSAPrograms = () => {
        ipcRenderer.invoke("QuerySSAProject", {}).then((i: QueryGeneralResponse<SSAProjectResponse>) => {
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
                <div className={styles["header"]}>{t("IRifyHome.securityFirst")}</div>

                <div className={styles["card-list"]}>
                    <div className={styles["card-item"]}>
                        <div className={styles["img"]}>
                            <PublicAuditCodeIcon />
                        </div>
                        <div className={styles["content"]}>
                            <div className={styles["title"]}>{t("YakitRoute.codeAudit")}</div>
                            <div className={styles["sub-title"]}>{t("YakitRoute.auditRuleCodeAnalysis")}</div>
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
                            {t("YakitButton.startAudit")}
                        </YakitButton>
                    </div>
                    <div className={styles["card-item"]}>
                        <div className={styles["img"]}>
                            <PublicCodeScanIcon />
                        </div>
                        <div className={styles["content"]}>
                            <div className={styles["title"]}>{t("YakitRoute.codeScan")}</div>
                            <div className={styles["sub-title"]}>{t("YakitRoute.richRuleLibrary")}</div>
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
                            {t("YakitButton.startScan")}
                        </YakitButton>
                    </div>
                    <div className={styles["card-item"]}>
                        <div className={styles["img"]}>
                            <PublicRuleManagementIcon />
                        </div>
                        <div className={styles["content"]}>
                            <div className={styles["title"]}>{t("YakitRoute.ruleManagement")}</div>
                            <div className={styles["sub-title"]}>{t("YakitRoute.customAuditRules")}</div>
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
                            {t("IRifyHome.viewRules")}
                        </YakitButton>
                    </div>
                </div>
            </div>
            <div className={styles["footer"]}>
                <div className={styles["main"]}>
                    <div className={styles["data-preview-item"]}>
                        <OutlineDatabaseIcon className={styles["data-preview-item-icon"]} />
                        <span className={styles["data-preview-item-text"]}>{t("HomeCom.projectDatabase")}</span>
                        <div className={styles["data-preview-item-cont"]}>
                            {!judgeMoreTenGB ? (
                                <span className={styles["data-preview-item-number"]}>{curProjectInfo?.FileSize}</span>
                            ) : (
                                <>
                                    <span className={styles["data-preview-item-number"]} style={{color: "#d33a30"}}>
                                        {curProjectInfo?.FileSize}
                                    </span>
                                    <Tooltip title={t("HomeCom.databaseTooLarge")} placement='topRight'>
                                        <SolidExclamationIcon className={styles["database-warning-icon"]} />
                                    </Tooltip>
                                </>
                            )}
                            {SystemInfo.mode === "local" && (
                                <Tooltip title={t("HomeCom.reclaimDatabaseSpaceTip")} placement='topRight'>
                                    <OutlineTrashSecondIcon
                                        className={styles["reclaim-icon"]}
                                        onClick={() => setReclaimHint(true)}
                                    />
                                </Tooltip>
                            )}
                            <YakitHint
                                visible={reclaimHint}
                                title={t("HomeCom.reclaimDatabaseSpaceTitle")}
                                content={t("HomeCom.reclaimDatabaseSpaceCont")}
                                onOk={() => {
                                    setReclaimHint(false)
                                    emiter.emit("openEngineLinkWin", "reclaimDatabaseSpace_start")
                                }}
                                onCancel={() => {
                                    setReclaimHint(false)
                                }}
                            />
                        </div>
                    </div>
                    <div className={styles["divider"]} />
                    <div className={styles["data-preview-item"]}>
                        <OutlineBugIcon className={styles["data-preview-item-icon"]} />
                        <span className={styles["data-preview-item-text"]}>{t("HomeCom.vulnerabilityData")}</span>
                        <div className={styles["risk-tag-wrapper"]}>
                            {riskLevelTotal("严重") ? (
                                <div
                                    className={classNames(styles["risk-tag"], styles["seriousRisk-tag"])}
                                    onClick={() =>
                                        onMenuParams({
                                            route: YakitRoute.YakRunner_Audit_Hole,
                                            params: {Severity: ["critical"]}
                                        })
                                    }
                                >
                                    <div className={styles["risk-text"]}>{t("YakitTag.critical")}</div>
                                    <div className={styles["risk-num"]}>{riskLevelTotal("严重")}</div>
                                </div>
                            ) : null}
                            {riskLevelTotal("高危") ? (
                                <div
                                    className={classNames(styles["risk-tag"], styles["highRisk-tag"])}
                                    onClick={() =>
                                        onMenuParams({
                                            route: YakitRoute.YakRunner_Audit_Hole,
                                            params: {Severity: ["high"]}
                                        })
                                    }
                                >
                                    <div className={styles["risk-text"]}>{t("YakitTag.high")}</div>
                                    <div className={styles["risk-num"]}>{riskLevelTotal("高危")}</div>
                                </div>
                            ) : null}
                            {riskLevelTotal("中危") ? (
                                <div
                                    className={classNames(styles["risk-tag"], styles["mediumRisk-tag"])}
                                    onClick={() =>
                                        onMenuParams({
                                            route: YakitRoute.YakRunner_Audit_Hole,
                                            params: {Severity: ["middle"]}
                                        })
                                    }
                                >
                                    <div className={styles["risk-text"]}>{t("YakitTag.warning")}</div>
                                    <div className={styles["risk-num"]}>{riskLevelTotal("中危")}</div>
                                </div>
                            ) : null}
                            {riskLevelTotal("低危") ? (
                                <div
                                    className={classNames(styles["risk-tag"], styles["lowRisk-tag"])}
                                    onClick={() =>
                                        onMenuParams({
                                            route: YakitRoute.YakRunner_Audit_Hole,
                                            params: {Severity: ["low"]}
                                        })
                                    }
                                >
                                    <div className={styles["risk-text"]}>{t("YakitTag.low")}</div>
                                    <div className={styles["risk-num"]}>{riskLevelTotal("低危")}</div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                    <div className={styles["divider"]} />
                    <div className={styles["data-preview-item"]}>
                        <OutlinCompileIcon className={styles["data-preview-item-icon"]} />
                        <span className={styles["data-preview-item-text"]}>{t("IRifyHome.compiledProjectsCount")}</span>
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
