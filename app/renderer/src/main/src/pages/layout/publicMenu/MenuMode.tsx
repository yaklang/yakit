import React from "react"
import {ResidentPluginName, YakitRoute, YakitRouteToPageInfo} from "@/routes/newRoute"
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
    PublicWebsocketFuzzerIcon
} from "@/routes/publicIcon"
import {useMemoizedFn} from "ahooks"
import {RouteToPageProps} from "./PublicMenu"

import classNames from "classnames"
import styles from "./MenuMode.module.scss"

interface MenuModeProps {
    mode: string
    onMenuSelect: (route: RouteToPageProps) => void
}

export const MenuMode: React.FC<MenuModeProps> = React.memo((props) => {
    const {mode, onMenuSelect} = props

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
                        <div className={styles["icon-wrapper"]}>
                            <PublicMitmIcon />
                        </div>
                        <div className={styles["title-style"]}>MITM</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["parent-menu-wrapper"]}>
                        <div className={styles["childs-menu-wrapper"]}>
                            <div
                                className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                onClick={() => onMenu(YakitRoute.HTTPFuzzer)}
                            >
                                <PublicWebFuzzerIcon />
                            </div>
                            <div
                                className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                onClick={() => onMenu(YakitRoute.WebsocketFuzzer)}
                            >
                                <PublicWebsocketFuzzerIcon />
                            </div>
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
            {mode === "基础工具" && (
                <>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Mod_ScanPort)}>
                        <div className={styles["icon-wrapper"]}>
                            <PublicScanPortIcon />
                        </div>
                        <div className={styles["title-style"]}>端口/指纹扫描</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.PoC)}>
                        <div className={styles["icon-wrapper"]}>
                            <PublicPocIcon />
                        </div>
                        <div className={styles["title-style"]}>专项漏洞检测</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div
                        className={styles["vertical-menu-wrapper"]}
                        onClick={() => onMenu(YakitRoute.Plugin_OP, 0, ResidentPluginName.SubDomainCollection)}
                    >
                        <div className={styles["icon-wrapper"]}>
                            <PublicSubDomainCollectionIcon />
                        </div>
                        <div className={styles["title-style"]}>子域名收集</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div>
                        <div
                            className={styles["horizontal-menu-wrapper"]}
                            onClick={() => onMenu(YakitRoute.Plugin_OP, 0, ResidentPluginName.BasicCrawler)}
                        >
                            <div className={styles["icon-wrapper"]}>
                                <PublicBasicCrawlerIcon />
                            </div>
                            <div className={styles["title-style"]}>基础爬虫</div>
                        </div>
                        <div
                            className={styles["horizontal-menu-wrapper"]}
                            onClick={() => onMenu(YakitRoute.Plugin_OP, 0, ResidentPluginName.SpaceEngine)}
                        >
                            <div className={styles["icon-wrapper"]}>
                                <PublicSpaceEngineIcon />
                            </div>
                            <div className={styles["title-style"]}>空间引擎</div>
                        </div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["parent-menu-wrapper"]}>
                        <div className={styles["childs-menu-wrapper"]}>
                            <div
                                className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                onClick={() => onMenu(YakitRoute.Mod_Brute)}
                            >
                                <PublicBruteIcon />
                            </div>
                            <div
                                className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                onClick={() => onMenu(YakitRoute.Plugin_OP, 0, ResidentPluginName.DirectoryScanning)}
                            >
                                <PublicDirectoryScanningIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>爆破与未授权检测</div>
                    </div>
                </>
            )}
            {mode === "插件" && (
                <>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Plugin_Store)}>
                        <div className={styles["icon-wrapper"]}>
                            <PublicPluginStoreIcon />
                        </div>
                        <div className={styles["title-style"]}>插件商店</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Plugin_Owner)}>
                        <div className={styles["icon-wrapper"]}>
                            <PublicPluginOwnerIcon />
                        </div>
                        <div className={styles["title-style"]}>我的</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.Plugin_Local)}>
                        <div className={styles["icon-wrapper"]}>
                            <PublicPluginLocalIcon />
                        </div>
                        <div className={styles["title-style"]}>本地</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div
                        className={styles["vertical-menu-wrapper"]}
                        onClick={() => onMenu(YakitRoute.BatchExecutorPage)}
                    >
                        <div className={styles["icon-wrapper"]}>
                            <PublicBatchPluginIcon />
                        </div>
                        <div className={styles["title-style"]}>批量执行</div>
                    </div>
                </>
            )}
            {mode === "反连" && (
                <>
                    <div className={styles["parent-menu-wrapper"]}>
                        <div className={styles["childs-menu-wrapper"]}>
                            <div
                                className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                onClick={() => onMenu(YakitRoute.DNSLog)}
                            >
                                <PublicDNSLogIcon />
                            </div>
                            <div
                                className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                onClick={() => onMenu(YakitRoute.ICMPSizeLog)}
                            >
                                <PublicICMPSizeLogIcon />
                            </div>
                            <div
                                className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                onClick={() => onMenu(YakitRoute.TCPPortLog)}
                            >
                                <PublicTCPPortLogIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>反连触发器</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["parent-menu-wrapper"]}>
                        <div className={styles["childs-menu-wrapper"]}>
                            <div
                                className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                onClick={() => onMenu(YakitRoute.PayloadGenerater_New)}
                            >
                                <PublicPayloadGeneraterIcon />
                            </div>
                            <div
                                className={classNames(styles["icon-wrapper"], styles["child-icon-wrapper"])}
                                onClick={() => onMenu(YakitRoute.ReverseServer_New)}
                            >
                                <PublicReverseServerIcon />
                            </div>
                        </div>
                        <div className={styles["title-style"]}>RevHack</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.ShellReceiver)}>
                        <div className={styles["icon-wrapper"]}>
                            <PublicShellReceiverIcon />
                        </div>
                        <div className={styles["title-style"]}>端口监听器</div>
                    </div>
                </>
            )}
            {mode === "数据库" && (
                <>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DB_HTTPHistory)}>
                        <div className={styles["icon-wrapper"]}>
                            <PublicHTTPHistoryIcon />
                        </div>
                        <div className={styles["title-style"]}>History</div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["multiple-vertical-menu-wrapper"]}>
                        <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DB_Report)}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicReportIcon />
                            </div>
                            <div className={styles["title-style"]}>报告</div>
                        </div>
                        <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DB_Risk)}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicRiskIcon />
                            </div>
                            <div className={styles["title-style"]}>漏洞</div>
                        </div>
                        <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DB_Ports)}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicPortsIcon />
                            </div>
                            <div className={styles["title-style"]}>端口</div>
                        </div>
                        <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DB_Domain)}>
                            <div className={styles["icon-wrapper"]}>
                                <PublicDomainIcon />
                            </div>
                            <div className={styles["title-style"]}>域名</div>
                        </div>
                    </div>
                    <div className={styles["divider-style"]}></div>
                    <div className={styles["vertical-menu-wrapper"]} onClick={() => onMenu(YakitRoute.DB_CVE)}>
                        <div className={styles["icon-wrapper"]}>
                            <PublicCVEIcon />
                        </div>
                        <div className={styles["title-style"]}>CVE 管理</div>
                    </div>
                </>
            )}
        </div>
    )
})
