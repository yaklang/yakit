import React from "react"
import {
    PublicBasicCrawlerIcon,
    PublicBatchPluginIcon,
    PublicBruteIcon,
    PublicCVEIcon,
    PublicCodecIcon,
    PublicDNSLogIcon,
    PublicDataCompareIcon,
    PublicDirectoryScanningIcon,
    PublicDomainIcon,
    PublicHTTPHistoryIcon,
    PublicICMPSizeLogIcon,
    PublicMitmIcon,
    PublicPayloadGeneraterIcon,
    PublicPluginLocalIcon,
    PublicPluginOwnerIcon,
    PublicPluginStoreIcon,
    PublicPocIcon,
    PublicPortsIcon,
    PublicReportIcon,
    PublicReverseServerIcon,
    PublicRiskIcon,
    PublicScanPortIcon,
    PublicShellReceiverIcon,
    PublicSpaceEngineIcon,
    PublicSubDomainCollectionIcon,
    PublicTCPPortLogIcon,
    PublicWebFuzzerIcon,
    PublicWebsiteTreeIcon,
    PublicWebsocketFuzzerIcon
} from "@/routes/publicIcon"
import {useMemoizedFn} from "ahooks"
import {RouteToPageProps} from "./PublicMenu"
import {Tooltip} from "antd"
import {YakitRouteToPageInfo, ResidentPluginName} from "@/routes/newRoute"

import classNames from "classnames"
import styles from "./MenuMode.module.scss"
import {YakitRoute} from "@/enums/yakitRoute"

interface MenuModeProps {
    mode: string
    pluginToId: Record<ResidentPluginName, number>
    onMenuSelect: (route: RouteToPageProps) => void
}

export const MenuMode: React.FC<MenuModeProps> = React.memo((props) => {
    const {mode, pluginToId, onMenuSelect} = props

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
            onMenuSelect({route: page})
        }
    })

    return (
        <div className={styles["menu-mode-wrapper"]}>
            {mode === "渗透测试" && (
                <>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.HTTPHacker)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicMitmIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>MITM</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["parent-menu-wrapper"]} onClick={() => onMenu(YakitRoute.HTTPFuzzer)}>
                        <div className={styles["childs-menu-wrapper"]}>
                            <Tooltip placement='bottom' title={YakitRouteToPageInfo[YakitRoute.HTTPFuzzer].label}>
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
                            <Tooltip placement='bottom' title={YakitRouteToPageInfo[YakitRoute.WebsocketFuzzer].label}>
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
                        <div className={styles["title-style"]}>Fuzzer</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div>
                        <div className={styles["horizontal-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Codec)}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicCodecIcon />
                            </div>
                            <div className={styles["title-style"]}>Codec</div>
                        </div>
                        <div
                            className={styles["horizontal-menu-wrapper"]}
                            onClick={() => onMenu(YakitRoute.DataCompare)}
                        >
                            <div className={styles["icon-wrapper"]}>
                                <PublicDataCompareIcon />
                            </div>
                            <div className={styles["title-style"]}>数据对比</div>
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
                        <div className={styles["title-style"]}>端口/指纹扫描</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.PoC)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicPocIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>专项漏洞检测</div>
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
                        <div className={styles["title-style"]}>子域名收集</div>
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
                            <div className={styles["title-style"]}>基础爬虫</div>
                        </div>
                        <div
                            className={classNames(styles["horizontal-menu-wrapper"])}
                            onClick={() => onMenu(YakitRoute.Space_Engine)}
                        >
                            <div className={styles["icon-wrapper"]}>
                                <PublicSpaceEngineIcon />
                            </div>
                            <div className={styles["title-style"]}>空间引擎</div>
                        </div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["parent-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Mod_Brute)}>
                        <div className={styles["childs-menu-wrapper"]}>
                            <Tooltip placement='bottom' title={YakitRouteToPageInfo[YakitRoute.Mod_Brute].label}>
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
                            <Tooltip placement='bottom' title='目录扫描'>
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
                        <div className={styles["title-style"]}>爆破与未授权检测</div>
                    </div>
                </>
            )}
            {mode === "插件" && (
                <>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Plugin_Store)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicPluginStoreIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>插件商店</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Plugin_Owner)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicPluginOwnerIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>我的</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Plugin_Local)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicPluginLocalIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>本地</div>
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
                        <div className={styles["title-style"]}>批量执行</div>
                    </div>
                </>
            )}
            {mode === "反连" && (
                <>
                    <div className={styles["parent-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DNSLog)}>
                        <div className={styles["childs-menu-wrapper"]}>
                            <Tooltip placement='bottom' title={YakitRouteToPageInfo[YakitRoute.DNSLog].label}>
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
                            <Tooltip placement='bottom' title={YakitRouteToPageInfo[YakitRoute.ICMPSizeLog].label}>
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
                            <Tooltip placement='bottom' title={YakitRouteToPageInfo[YakitRoute.TCPPortLog].label}>
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
                        <div className={styles["title-style"]}>反连触发器</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div
                        className={styles["parent-menu-wrapper"]}
                        onClick={() => onMenu(YakitRoute.PayloadGenerater_New)}
                    >
                        <div className={styles["childs-menu-wrapper"]}>
                            <Tooltip
                                placement='bottom'
                                title={YakitRouteToPageInfo[YakitRoute.PayloadGenerater_New].label}
                            >
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
                            <Tooltip
                                placement='bottom'
                                title={YakitRouteToPageInfo[YakitRoute.ReverseServer_New].label}
                            >
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
                        <div className={styles["title-style"]}>RevHack</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.ShellReceiver)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicShellReceiverIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>端口监听器</div>
                    </div>
                </>
            )}
            {mode === "数据库" && (
                <>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DB_HTTPHistory)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicHTTPHistoryIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>History</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["multiple-vertical-menu-wrapper"]}>
                        <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DB_Report)}>
                            <div className={styles["menu-icon-wrapper"]}>
                                <div className={styles["icon-wrapper"]}>
                                    <PublicReportIcon />
                                </div>
                            </div>
                            <div className={styles["title-style"]}>报告</div>
                        </div>
                        <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DB_Risk)}>
                            <div className={styles["menu-icon-wrapper"]}>
                                <div className={styles["icon-wrapper"]}>
                                    <PublicRiskIcon />
                                </div>
                            </div>
                            <div className={styles["title-style"]}>漏洞</div>
                        </div>
                        <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DB_Ports)}>
                            <div className={styles["menu-icon-wrapper"]}>
                                <div className={styles["icon-wrapper"]}>
                                    <PublicPortsIcon />
                                </div>
                            </div>
                            <div className={styles["title-style"]}>端口</div>
                        </div>
                        <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DB_Domain)}>
                            <div className={styles["menu-icon-wrapper"]}>
                                <div className={styles["icon-wrapper"]}>
                                    <PublicDomainIcon />
                                </div>
                            </div>
                            <div className={styles["title-style"]}>域名</div>
                        </div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DB_CVE)}>
                        <div className={styles["menu-icon-wrapper"]}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicCVEIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>CVE 管理</div>
                    </div>
                </>
            )}
        </div>
    )
})
