import React, {useState} from "react"
import {Badge} from "antd"
import {
    BellSvgIcon,
    HelpSvgIcon,
    RiskStateSvgIcon,
    ScreensHotSvgIcon,
    UISettingSvgIcon,
    UnLoginSvgIcon,
    UpdateSvgIcon,
    VersionUpdateSvgIcon,
    YakitWhiteSvgIcon,
    YaklangSvgIcon
} from "./icons"
import {YakitPopover} from "../basics/YakitPopover"
import {YakitMenu} from "../basics/YakitMenu"
import {YakitEllipsis} from "../basics/YakitEllipsis"
import {useMemoizedFn} from "ahooks"

import classnames from "classnames"
import styles from "./funcDomain.module.scss"

const {ipcRenderer} = window.require("electron")

export interface FuncDomainProp {
    isReverse?: boolean
}

export const FuncDomain: React.FC<FuncDomainProp> = React.memo((props) => {
    const {isReverse = false} = props

    return (
        <div className={styles["func-domain-wrapper"]} onDoubleClick={(e) => e.stopPropagation()}>
            <div className={classnames(styles["func-domain-body"], {[styles["func-domain-reverse-body"]]: isReverse})}>
                <div
                    className={styles["ui-op-btn-wrapper"]}
                    onClick={() => ipcRenderer.invoke("open-url", "https://www.yaklang.com/docs/intro/")}
                >
                    <HelpSvgIcon className={styles["icon-style"]} />
                </div>
                <div className={styles["ui-op-btn-wrapper"]} onClick={() => ipcRenderer.invoke("activate-screenshot")}>
                    <ScreensHotSvgIcon className={styles["icon-style"]} />
                </div>
                <div className={styles["short-divider-wrapper"]}>
                    <div className={styles["divider-style"]}></div>
                </div>
                <div className={styles["state-setting-wrapper"]}>
                    <UIOpRisk />
                    <UIOpNotice />
                    <UIOpSetting />
                </div>
                <div className={styles["divider-wrapper"]}></div>
                <div className={styles["user-wrapper"]}>
                    <UnLoginSvgIcon />
                </div>
            </div>
        </div>
    )
})

interface UIOpSettingProp {}
const UIOpSetting: React.FC<UIOpSettingProp> = React.memo((props) => {
    const [show, setShow] = useState<boolean>(false)
    const menu = (
        <YakitMenu
            data={[
                {
                    key: "plugin",
                    label: "配置插件源",
                    children: [
                        {label: "外部", key: "external"},
                        {label: "插件商店", key: "store"}
                    ]
                },
                {
                    key: "reverse",
                    label: "全局反连"
                },
                {
                    key: "agent",
                    label: "系统代理"
                },
                {
                    key: "engineAgent",
                    label: "引擎扫描代理"
                },
                {
                    key: "engineVar",
                    label: "引擎环境变量"
                },
                {
                    key: "link",
                    label: "切换连接模式",
                    children: [
                        {label: "本地", key: "local"},
                        {label: "远程", key: "remote"},
                        {label: "管理员", key: "admin"}
                    ]
                }
            ]}
        ></YakitMenu>
    )

    return (
        <YakitPopover
            overlayClassName={classnames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
            placement={"bottom"}
            content={menu}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <UISettingSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
            </div>
        </YakitPopover>
    )
})

interface UIOpUpdateYakitProps {}
const UIOpUpdateYakit: React.FC<UIOpUpdateYakitProps> = React.memo((props) => {
    return (
        <div className={classnames(styles["version-update-wrapper"], {[styles["version-has-update"]]: true})}>
            <div className={styles["update-header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["update-icon"]}>
                        <YakitWhiteSvgIcon />
                    </div>
                    <div>
                        <div className={styles["update-title"]}>Yakit 1.1.3-sp1</div>
                        <div className={styles["update-time"]}>2022-10-01</div>
                    </div>
                </div>

                <div className={styles["header-btn"]}>
                    <UpdateSvgIcon style={{marginRight: 4}} />
                    立即更新
                </div>
            </div>

            <div className={styles["update-content-wrapper"]}>
                <div className={styles["update-content"]}>
                    1. 修复前端 Web Fuzzer 数据过多的时候纯前端卡顿问题 <br />
                    2. 修复 HTTP History Flow 筛选与屏蔽的 BUG <br />
                    3. 新增 Java Hack Yso GUI Dump 功能（需配合1.1.3-sp5引...
                </div>
                <div className={styles["current-version"]}>当前版本：Yakit 1.1.3-sq1</div>
            </div>
        </div>
    )
})
interface UIOpUpdateYaklangProps {}
const UIOpUpdateYaklang: React.FC<UIOpUpdateYaklangProps> = React.memo((props) => {
    return (
        <div className={classnames(styles["version-update-wrapper"], {[styles["version-has-update"]]: false})}>
            <div className={styles["update-header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["update-icon"]}>
                        <YaklangSvgIcon />
                    </div>
                    <div>
                        <div className={styles["update-title"]}>Yaklang 1.1.3-sp3-5</div>
                        <div className={styles["update-time"]}>2022-09-29</div>
                    </div>
                </div>

                <div className={styles["header-btn"]}>已是最新</div>
            </div>

            <div className={styles["update-content-wrapper"]}>
                <div className={styles["update-content"]}>
                    1. 修复了 GetCommonParams 对 Post Data 的不当处理
                    <br />
                    2. 允许劫持并修改 Websocket 握手包
                    <br />
                    3. Fuzz tag 别名，randstr -{">"} rs...
                </div>
                <div className={styles["current-version"]}>当前版本：Yaklang 1.1.3-sp3-5</div>
            </div>
        </div>
    )
})
interface UIOpLetterProps {}
const UIOpLetter: React.FC<UIOpLetterProps> = React.memo((props) => {
    const LetterInfo = useMemoizedFn((type: string) => {
        return (
            <div key={type} className={styles["letter-info-wrapper"]}>
                <div className={styles["info-header"]}>
                    <BellSvgIcon />
                </div>
                {type === "follow" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>又又呀～</span>
                            &nbsp;关注了你
                        </div>
                        <div className={styles["content-time"]}>3 小时前</div>
                    </div>
                )}
                {type === "star" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>桔子爱吃橘子</span>
                            &nbsp;赞了你的插件&nbsp;
                            <span className={styles["accent-content"]}>致远OA Session泄露漏洞检测</span>
                        </div>
                        <div className={styles["content-time"]}>7 小时前</div>
                    </div>
                )}
                {type === "commit" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>桔子爱吃橘子</span>
                            &nbsp;评论了你的插件&nbsp;
                            <span className={styles["accent-content"]}>Websphere弱口令检测</span>
                        </div>
                        <div className={styles["content-commit"]}>“大佬，牛批！”</div>
                        <div className={styles["content-time"]}>3 天前</div>
                    </div>
                )}
                {type === "issue" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>Alex-null</span>
                            &nbsp;向你提交了&nbsp;
                            <span className={styles["accent-content"]}>issue</span>
                        </div>
                        <div className={styles["content-time"]}>2022-10-09</div>
                    </div>
                )}
                {type === "system" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>系统消息</span>
                        </div>
                        <div className={styles["content-commit"]}>
                            手把手教学，从入门到实战！Yak Events 9月16号下午3点，Yak Project直播间不见不散！
                        </div>
                        <div className={styles["content-time"]}>2022-10-01</div>
                    </div>
                )}
            </div>
        )
    })

    return (
        <div className={styles["letter-wrapper"]}>
            {["follow", "star", "commit", "issue", "system"].map((item) => LetterInfo(item))}
        </div>
    )
})
interface UIOpNoticeProp {}
const UIOpNotice: React.FC<UIOpNoticeProp> = React.memo((props) => {
    const [show, setShow] = useState<boolean>(false)
    const [type, setType] = useState<"letter" | "update">("update")

    const notice = (
        <div className={styles["ui-op-plus-wrapper"]}>
            <div className={styles["ui-op-notice-body"]}>
                <div className={styles["notice-tabs-wrapper"]}>
                    <div className={styles["notice-tabs-body"]}>
                        <div
                            className={classnames(styles["tabs-opt"], {
                                [styles["tabs-opt-selected"]]: type === "letter"
                            })}
                            onClick={(e) => {
                                e.stopPropagation()
                                setType("letter")
                            }}
                        >
                            <Badge dot offset={[4, 0]}>
                                私信
                            </Badge>
                        </div>
                        <div
                            className={classnames(styles["tabs-opt"], {
                                [styles["tabs-opt-selected"]]: type === "update"
                            })}
                            onClick={(e) => {
                                e.stopPropagation()
                                setType("update")
                            }}
                        >
                            更新通知
                        </div>
                    </div>
                </div>

                {type === "update" && (
                    <div className={styles["notice-version-wrapper"]}>
                        <UIOpUpdateYakit />
                        <UIOpUpdateYaklang />
                    </div>
                )}

                {type === "letter" && (
                    <>
                        <div>
                            <UIOpLetter />
                        </div>
                        <div className={styles["notice-footer"]}>
                            <div className={styles["notice-footer-btn"]}>全部已读</div>
                            <div className={styles["notice-footer-btn"]}>查看所有私信</div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )

    return (
        <YakitPopover
            overlayClassName={classnames(styles["ui-op-dropdown"], styles["ui-op-plus-dropdown"])}
            placement={"bottomRight"}
            content={notice}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <Badge dot>
                    <VersionUpdateSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                </Badge>
            </div>
        </YakitPopover>
    )
})

interface UIOpRiskProp {}
const UIOpRisk: React.FC<UIOpRiskProp> = React.memo((props) => {
    const [show, setShow] = useState<boolean>(false)

    const notice = (
        <div className={styles["ui-op-plus-wrapper"]}>
            <div className={styles["ui-op-risk-body"]}>
                <div className={styles["risk-header"]}>漏洞和风险统计（共 29 条，其中 3 条未读）</div>

                <div className={styles["risk-info"]}>
                    <div className={styles["risk-info-opt"]}>
                        <div className={classnames(styles["opt-icon-style"], styles["opt-fatal-icon"])}>严重</div>
                        <Badge dot offset={[3, 0]}>
                            <YakitEllipsis text='Git 敏感信息泄漏: edge.microsoft.com:80' width={310} />
                        </Badge>
                    </div>
                    <div className={styles["risk-info-opt"]}>
                        <div className={classnames(styles["opt-icon-style"], styles["opt-high-icon"])}>高危</div>
                        <Badge dot offset={[3, 0]}>
                            <YakitEllipsis text='Git 敏感信息泄漏: edge.microsoft.com:80' width={310} />
                        </Badge>
                    </div>
                    <div className={styles["risk-info-opt"]}>
                        <div className={classnames(styles["opt-icon-style"], styles["opt-middle-icon"])}>中危</div>
                        <Badge dot offset={[3, 0]}>
                            <YakitEllipsis text='Git 敏感信息泄漏: edge.microsoft.com:80' width={310} />
                        </Badge>
                    </div>
                    <div className={styles["risk-info-opt"]}>
                        <div className={classnames(styles["opt-icon-style"], styles["opt-low-icon"])}>低危</div>
                        <Badge dot offset={[3, 0]}>
                            <YakitEllipsis text='Git 敏感信息泄漏: edge.microsoft.com:80' width={310} />
                        </Badge>
                    </div>
                    <div className={styles["risk-info-opt"]}>
                        <div className={classnames(styles["opt-icon-style"], styles["opt-info-icon"])}>指纹</div>
                        <Badge dot offset={[3, 0]}>
                            <YakitEllipsis text='Git 敏感信息泄漏: edge.microsoft.com:80' width={310} />
                        </Badge>
                    </div>
                </div>

                <div className={styles["risk-footer"]}>
                    <div className={styles["risk-footer-btn"]}>全部已读</div>
                    <div className={styles["risk-footer-btn"]}>查看全部</div>
                </div>
            </div>
        </div>
    )

    return (
        <YakitPopover
            overlayClassName={classnames(styles["ui-op-dropdown"], styles["ui-op-plus-dropdown"])}
            placement={"bottomRight"}
            content={notice}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <Badge dot offset={[2, 0]}>
                    <RiskStateSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                </Badge>
            </div>
        </YakitPopover>
    )
})
