import React, {useMemo} from "react"
import {
    PublicAIAgentIcon,
    PublicAuditCodeIcon,
    PublicAuditHoleIcon,
    PublicBasicCrawlerIcon,
    PublicBatchPluginIcon,
    PublicBruteIcon,
    PublicCVEIcon,
    PublicCodeScanIcon,
    PublicCodecIcon,
    PublicDNSLogIcon,
    PublicDataCompareIcon,
    PublicDirectoryScanningIcon,
    PublicDomainIcon,
    PublicFingerprintManageIcon,
    PublicHTTPHistoryIcon,
    PublicICMPSizeLogIcon,
    PublicMitmIcon,
    PublicPayloadGeneraterIcon,
    PublicPluginStoreIcon,
    PublicPocIcon,
    PublicPortsIcon,
    PublicProjectManagerIcon,
    PublicReportIcon,
    PublicReverseServerIcon,
    PublicRiskIcon,
    PublicRuleManagementIcon,
    PublicScanPortIcon,
    PublicShellReceiverIcon,
    PublicSpaceEngineIcon,
    PublicSubDomainCollectionIcon,
    PublicTCPPortLogIcon,
    PublicWebFuzzerIcon,
    PublicWebsocketFuzzerIcon
} from "@/routes/publicIcon"
import {useMemoizedFn} from "ahooks"
import {RouteToPageProps} from "./PublicMenu"
import {Tooltip} from "antd"
import {YakitRouteToPageInfo, ResidentPluginName} from "@/routes/newRoute"
import {YakitRoute} from "@/enums/yakitRoute"
import {isIRify} from "@/utils/envfile"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

import classNames from "classnames"
import styles from "./MenuMode.module.scss"
import { useHttpFlowStore } from "@/store/httpFlow"

interface MenuModeProps {
    mode: string
    pluginToId: Record<ResidentPluginName, number>
    onMenuSelect: (route: RouteToPageProps) => void
}

export const MenuMode: React.FC<MenuModeProps> = React.memo((props) => {
    const {mode, pluginToId, onMenuSelect} = props
    const {t, i18n} = useI18nNamespaces(["yakitRoute", "layout"])
    const { resetCompareData }  = useHttpFlowStore()
    /** 转换成菜单组件统一处理的数据格式，插件是否下载的验证由菜单组件处理，这里不处理 */
    const onMenu = useMemoizedFn((page: YakitRoute, pluginId?: number, pluginName?: string) => {
        if (!page) return

        if (page === YakitRoute.Plugin_OP) {
            onMenuSelect({
                route: page,
                pluginId: pluginId || 0,
                pluginName: pluginName || ""
            })
        } else {
            //点击数据对比tab新增一个对比页 所以需要清除store数据
            page === YakitRoute.DataCompare && resetCompareData();
            onMenuSelect({route: page})
        }
    })

    const tooltipTitle = useMemoizedFn((route: YakitRoute) => {
        return YakitRouteToPageInfo[route].labelUi
            ? t(YakitRouteToPageInfo[route].labelUi as string)
            : YakitRouteToPageInfo[route].label
    })

    return (
        <div className={styles["menu-mode-wrapper"]}>
            {mode === "渗透测试" && (
                <>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.MITMHacker)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicMitmIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.MITM")}</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["parent-menu-wrapper"]} onClick={() => onMenu(YakitRoute.HTTPFuzzer)}>
                        <div className={styles["childs-menu-wrapper"]}>
                            <Tooltip placement='bottom' title={tooltipTitle(YakitRoute.HTTPFuzzer)}>
                                <div
                                    className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onMenu(YakitRoute.HTTPFuzzer)
                                    }}
                                >
                                    <PublicWebFuzzerIcon />
                                </div>
                            </Tooltip>
                            <Tooltip placement='bottom' title={tooltipTitle(YakitRoute.WebsocketFuzzer)}>
                                <div
                                    className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onMenu(YakitRoute.WebsocketFuzzer)
                                    }}
                                >
                                    <PublicWebsocketFuzzerIcon />
                                </div>
                            </Tooltip>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.fuzzer")}</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div>
                        <div className={styles["horizontal-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Codec)}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicCodecIcon />
                            </div>
                            <div className={styles["title-style"]}>{t("YakitRoute.Codec")}</div>
                        </div>
                        <div
                            className={styles["horizontal-menu-wrapper"]}
                            onClick={() => onMenu(YakitRoute.DataCompare)}
                        >
                            <div className={styles["icon-wrapper"]}>
                                <PublicDataCompareIcon />
                            </div>
                            <div className={styles["title-style"]}>{t("YakitRoute.dataCompare")}</div>
                        </div>
                    </div>
                </>
            )}
            {mode === "安全工具" && (
                <>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Mod_ScanPort)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicScanPortIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.portAndFingerprintScan")}</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.PoC)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicPocIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.vulnTargetedScan")}</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div
                        className={classNames(styles["vertical-menu-wrapper"], {
                            [styles["disable-style"]]: pluginToId[ResidentPluginName.SubDomainCollection] === 0
                        })}
                        onClick={() =>
                            onMenu(
                                YakitRoute.Plugin_OP,
                                pluginToId[ResidentPluginName.SubDomainCollection],
                                ResidentPluginName.SubDomainCollection
                            )
                        }
                    >
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicSubDomainCollectionIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.subdomainCollection")}</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div>
                        <div
                            className={classNames(styles["horizontal-menu-wrapper"], {
                                [styles["disable-style"]]: pluginToId[ResidentPluginName.BasicCrawler] === 0
                            })}
                            onClick={() =>
                                onMenu(
                                    YakitRoute.Plugin_OP,
                                    pluginToId[ResidentPluginName.BasicCrawler],
                                    ResidentPluginName.BasicCrawler
                                )
                            }
                        >
                            <div className={styles["icon-wrapper"]}>
                                <PublicBasicCrawlerIcon />
                            </div>
                            <div className={styles["title-style"]}>{t("YakitRoute.basicCrawler")}</div>
                        </div>
                        <div
                            className={classNames(styles["horizontal-menu-wrapper"])}
                            onClick={() => onMenu(YakitRoute.Space_Engine)}
                        >
                            <div className={styles["icon-wrapper"]}>
                                <PublicSpaceEngineIcon />
                            </div>
                            <div className={styles["title-style"]}>{t("YakitRoute.spaceEngine")}</div>
                        </div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["parent-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Mod_Brute)}>
                        <div className={styles["childs-menu-wrapper"]}>
                            <Tooltip placement='bottom' title={tooltipTitle(YakitRoute.Mod_Brute)}>
                                <div
                                    className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onMenu(YakitRoute.Mod_Brute)
                                    }}
                                >
                                    <PublicBruteIcon />
                                </div>
                            </Tooltip>
                            <Tooltip placement='bottom' title={t("YakitRoute.directoryScan")}>
                                <div
                                    className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"], {
                                        [styles["disable-style"]]:
                                            pluginToId[ResidentPluginName.DirectoryScanning] === 0
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onMenu(
                                            YakitRoute.Plugin_OP,
                                            pluginToId[ResidentPluginName.DirectoryScanning],
                                            ResidentPluginName.DirectoryScanning
                                        )
                                    }}
                                >
                                    <PublicDirectoryScanningIcon />
                                </div>
                            </Tooltip>
                        </div>
                        <div className={styles["title-style"]}>
                            {t("Layout.MenuMode.bruteForce")}
                            {t("Layout.MenuMode.and")}
                            {i18n.language === "en" ? <br /> : null}
                            {t("Layout.MenuMode.unauthorizedCheck")}
                        </div>
                    </div>
                </>
            )}
            {mode === "插件" && (
                <>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Plugin_Hub)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicPluginStoreIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.pluginHub")}</div>
                    </div>

                    <div className={styles["divider-style"]}></div>
                    <div
                        className={styles["vertical-menu-wrapper"]}
                        onClick={() => onMenu(YakitRoute.BatchExecutorPage)}
                    >
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicBatchPluginIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.batchExecute")}</div>
                    </div>
                </>
            )}
            {mode === "反连" && (
                <>
                    <div className={styles["parent-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DNSLog)}>
                        <div className={styles["childs-menu-wrapper"]}>
                            <Tooltip placement='bottom' title={tooltipTitle(YakitRoute.DNSLog)}>
                                <div
                                    className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onMenu(YakitRoute.DNSLog)
                                    }}
                                >
                                    <PublicDNSLogIcon />
                                </div>
                            </Tooltip>
                            <Tooltip placement='bottom' title={tooltipTitle(YakitRoute.ICMPSizeLog)}>
                                <div
                                    className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onMenu(YakitRoute.ICMPSizeLog)
                                    }}
                                >
                                    <PublicICMPSizeLogIcon />
                                </div>
                            </Tooltip>
                            <Tooltip placement='bottom' title={tooltipTitle(YakitRoute.TCPPortLog)}>
                                <div
                                    className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onMenu(YakitRoute.TCPPortLog)
                                    }}
                                >
                                    <PublicTCPPortLogIcon />
                                </div>
                            </Tooltip>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.reverseTrigger")}</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div
                        className={styles["parent-menu-wrapper"]}
                        onClick={() => onMenu(YakitRoute.PayloadGenerater_New)}
                    >
                        <div className={styles["childs-menu-wrapper"]}>
                            <Tooltip placement='bottom' title={tooltipTitle(YakitRoute.PayloadGenerater_New)}>
                                <div
                                    className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onMenu(YakitRoute.PayloadGenerater_New)
                                    }}
                                >
                                    <PublicPayloadGeneraterIcon />
                                </div>
                            </Tooltip>
                            <Tooltip placement='bottom' title={tooltipTitle(YakitRoute.ReverseServer_New)}>
                                <div
                                    className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onMenu(YakitRoute.ReverseServer_New)
                                    }}
                                >
                                    <PublicReverseServerIcon />
                                </div>
                            </Tooltip>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.revHack")}</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.ShellReceiver)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicShellReceiverIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.portListener")}</div>
                    </div>
                </>
            )}
            {mode === "代码审计" && (
                <>
                    <div
                        className={styles["vertical-menu-wrapper"]}
                        onClick={() => onMenu(YakitRoute.YakRunner_Project_Manager)}
                    >
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicProjectManagerIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.projectManagement")}</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div
                        className={styles["vertical-menu-wrapper"]}
                        onClick={() => onMenu(YakitRoute.YakRunner_Audit_Code)}
                    >
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicAuditCodeIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.codeAudit")}</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div
                        className={styles["vertical-menu-wrapper"]}
                        onClick={() => onMenu(YakitRoute.YakRunner_Code_Scan)}
                    >
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicCodeScanIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.codeScan")}</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Rule_Management)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicRuleManagementIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.ruleManagement")}</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div
                        className={styles["vertical-menu-wrapper"]}
                        onClick={() => onMenu(YakitRoute.YakRunner_Audit_Hole)}
                    >
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicAuditHoleIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.auditVulnerability")}</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div
                        className={styles["vertical-menu-wrapper"]}
                        onClick={() => onMenu(YakitRoute.Yak_Java_Decompiler)}
                    >
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicAuditHoleIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>{t("YakitRoute.javaDecompile")}</div>
                    </div>
                </>
            )}
            {mode === "数据库" && (
                <>
                    {isIRify() ? (
                        <div className={styles["multiple-vertical-menu-wrapper"]}>
                            <div
                                className={styles["vertical-menu-wrapper"]}
                                onClick={() => onMenu(YakitRoute.DB_Report)}
                            >
                                <div className={styles["menu-icon-wrapper"]}>
                                    <div className={styles["icon-wrapper"]}>
                                        <PublicReportIcon />
                                    </div>
                                </div>
                                <div className={styles["title-style"]}>{t("YakitRoute.report")}</div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div
                                className={styles["vertical-menu-wrapper"]}
                                onClick={() => onMenu(YakitRoute.DB_HTTPHistory)}
                            >
                                <div className={styles["menu-icon-wrapper"]}>
                                    <div className={styles["icon-wrapper"]}>
                                        <PublicHTTPHistoryIcon />
                                    </div>
                                </div>
                                <div className={styles["title-style"]}>{t("YakitRoute.History")}</div>
                            </div>
                            <div className={styles["divider-style"]}></div>
                            <div className={styles["multiple-vertical-menu-wrapper"]}>
                                <div
                                    className={styles["vertical-menu-wrapper"]}
                                    onClick={() => onMenu(YakitRoute.DB_Report)}
                                >
                                    <div className={styles["menu-icon-wrapper"]}>
                                        <div className={styles["icon-wrapper"]}>
                                            <PublicReportIcon />
                                        </div>
                                    </div>
                                    <div className={styles["title-style"]}>{t("YakitRoute.report")}</div>
                                </div>
                                <div
                                    className={styles["vertical-menu-wrapper"]}
                                    onClick={() => onMenu(YakitRoute.DB_Risk)}
                                >
                                    <div className={styles["menu-icon-wrapper"]}>
                                        <div className={styles["icon-wrapper"]}>
                                            <PublicRiskIcon />
                                        </div>
                                    </div>
                                    <div className={styles["title-style"]}>{t("YakitRoute.vulnerability")}</div>
                                </div>
                                <div
                                    className={styles["vertical-menu-wrapper"]}
                                    onClick={() => onMenu(YakitRoute.DB_Ports)}
                                >
                                    <div className={styles["menu-icon-wrapper"]}>
                                        <div className={styles["icon-wrapper"]}>
                                            <PublicPortsIcon />
                                        </div>
                                    </div>
                                    <div className={styles["title-style"]}>{t("YakitRoute.port")}</div>
                                </div>
                                <div
                                    className={styles["vertical-menu-wrapper"]}
                                    onClick={() => onMenu(YakitRoute.DB_Domain)}
                                >
                                    <div className={styles["menu-icon-wrapper"]}>
                                        <div className={styles["icon-wrapper"]}>
                                            <PublicDomainIcon />
                                        </div>
                                    </div>
                                    <div className={styles["title-style"]}>{t("YakitRoute.domain")}</div>
                                </div>
                                <div
                                    className={styles["vertical-menu-wrapper"]}
                                    onClick={() => onMenu(YakitRoute.FingerprintManage)}
                                >
                                    <div className={styles["menu-icon-wrapper"]}>
                                        <div className={styles["icon-wrapper"]}>
                                            <PublicFingerprintManageIcon />
                                        </div>
                                    </div>
                                    <div className={styles["title-style"]}>{t("YakitRoute.fingerprintDatabase")}</div>
                                </div>
                            </div>
                            <div className={styles["divider-style"]}></div>
                            <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DB_CVE)}>
                                <div className={styles["menu-icon-wrapper"]}>
                                    <div className={styles["icon-wrapper"]}>
                                        <PublicCVEIcon />
                                    </div>
                                </div>
                                <div className={styles["title-style"]}>{t("YakitRoute.cVEManagement")}</div>
                            </div>
                        </>
                    )}
                </>
            )}
            {/* {mode === "AI" && (
                <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.AI_Agent)}>
                    <div className={styles["menu-icon-wrapper"]}>
                        <div className={styles["icon-wrapper"]}>
                            <PublicAIAgentIcon />
                        </div>
                    </div>
                    <div className={styles["title-style"]}>AIAgent</div>
                </div>
            )} */}
        </div>
    )
})
