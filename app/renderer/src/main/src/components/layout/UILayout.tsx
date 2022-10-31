import React, {useEffect, useLayoutEffect, useState} from "react"
import {Alert, Button, Progress, Space} from "antd"
import {} from "@ant-design/icons"
import {MacUIOp} from "./MacUIOp"
import {HelpSvgIcon, YakitCopySvgIcon, YakitStoreSvgIcon, YakitThemeSvgIcon, YaklangInstallHintSvgIcon} from "./icons"
import {PerformanceDisplay} from "./PerformanceDisplay"
import {FuncDomain} from "./FuncDomain"
import {WinUIOp} from "./WinUIOp"
import {GlobalReverseState} from "./GlobalReverseState"
import {YakitGlobalHost} from "./YakitGlobalHost"
import {LocalGV} from "@/yakitGV"
import {YakitSystem} from "@/yakitGVDefine"

import classnames from "classnames"
import styles from "./uiLayout.module.scss"
import {useMemoizedFn} from "ahooks"
import {YakitPopover} from "../basics/YakitPopover"

const {ipcRenderer} = window.require("electron")

export interface UILayoutProp {
    children?: React.ReactNode
}

const UILayout: React.FC<UILayoutProp> = (props) => {
    const [system, setSystem] = useState<YakitSystem>("Darwin")
    const [loading, setLoading] = useState<boolean>(true)
    const [isYakInstalled, setIsYakInstalled] = useState<boolean>(true)

    useLayoutEffect(() => {
        ipcRenderer.invoke("is-show-installed").then((res) => {
            console.log("res", res)
        })
    }, [])

    // 启动本地引擎(包含启动本地缓存端口的引擎过程)
    useEffect(() => {
        ipcRenderer.invoke("is-yaklang-engine-installed").then(async (flag: boolean) => {
            console.log("uilayout-是否安装引擎", flag)

            if (flag) {
                const value: any = await ipcRenderer.invoke("get-value", LocalGV.GlobalPort)
                console.log("uilayout-获取缓存引擎端口号", value)
                if (value) ipcRenderer.invoke("test-engine-started", value)
                else ipcRenderer.invoke("")
            }
        })

        ipcRenderer.on("callback-test-engine-started", async (e: any, flag: boolean) => {})

        return () => {
            ipcRenderer.removeAllListeners("callback-test-engine-started")
        }
    }, [])

    const maxScreen = () => {
        ipcRenderer.invoke("UIOperate", "max")
    }

    const stopBubbling = (e: any) => {
        e.stopPropagation()
    }

    useLayoutEffect(() => {
        ipcRenderer
            .invoke("fetch-system-name")
            .then((type: "Linux" | "Darwin" | "Windows_NT") => setSystem(type))
            .catch(() => {})
    }, [])

    return isYakInstalled ? (
        <YaklangEngineHint system={system} />
    ) : (
        <div className={styles["ui-layout-wrapper"]}>
            <div className={styles["ui-layout-header"]}>
                {system === "Darwin" ? (
                    <div
                        className={classnames(styles["header-body"], styles["mac-header-body"])}
                        onDoubleClick={maxScreen}
                    >
                        <div className={styles["header-left"]}>
                            <div className={styles["left-operate"]} onClick={stopBubbling}>
                                <MacUIOp />
                            </div>

                            <div className={styles["divider-wrapper"]}></div>
                            <div className={styles["yakit-icon"]} onClick={stopBubbling}>
                                <YakitThemeSvgIcon />
                            </div>

                            <div className={styles["divider-wrapper"]}></div>
                            <div className={styles["yakit-store-icon"]} onClick={stopBubbling}>
                                <YakitStoreSvgIcon />
                            </div>

                            <div className={styles["divider-wrapper"]}></div>
                            <YakitGlobalHost />

                            <div className={styles["short-divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <div className={styles["left-cpu"]}>
                                <PerformanceDisplay />
                            </div>
                        </div>
                        <div className={styles["header-title"]}>Yakit</div>
                        <div className={styles["header-right"]}>
                            <FuncDomain />
                            <GlobalReverseState />
                        </div>
                    </div>
                ) : (
                    <div
                        className={classnames(styles["header-body"], styles["win-header-body"])}
                        onDoubleClick={maxScreen}
                    >
                        <div className={styles["header-left"]}>
                            <GlobalReverseState />

                            <div className={styles["divider-wrapper"]}></div>
                            <div className={styles["yakit-icon"]} onClick={stopBubbling}>
                                <YakitThemeSvgIcon />
                            </div>

                            <div className={styles["divider-wrapper"]}></div>
                            <div className={styles["yakit-store-icon"]} onClick={stopBubbling}>
                                <YakitStoreSvgIcon />
                            </div>

                            <div className={styles["divider-wrapper"]}></div>
                            <div>
                                <FuncDomain isReverse={true} />
                            </div>
                        </div>

                        <div className={styles["header-title"]}>Yakit</div>

                        <div className={styles["header-right"]}>
                            <div className={styles["left-cpu"]}>
                                <PerformanceDisplay />
                            </div>
                            <div className={styles["short-divider-wrapper"]}>
                                <div className={styles["divider-style"]}></div>
                            </div>
                            <YakitGlobalHost />
                            <div className={styles["divider-wrapper"]}></div>
                            <WinUIOp />
                        </div>
                    </div>
                )}
            </div>
            {isYakInstalled ? (
                <div className={styles["ui-layout-body"]}>{props.children}</div>
            ) : (
                <div className={styles["ui-layout-mask"]}>
                    <div></div>
                </div>
            )}
        </div>
    )
}

export default UILayout

interface YaklangEngineHintProps {
    system: YakitSystem
}
const YaklangEngineHint: React.FC<YaklangEngineHintProps> = React.memo((props) => {
    const [platformArch, setPlatformArch] = useState<string>("")
    const [install, setInstall] = useState<boolean>(false)

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-platform-and-arch").then((e: string) => {
            setPlatformArch(e)
        })
    }, [])

    const copyCommand = useMemoizedFn(() => {
        ipcRenderer.invoke("set-copy-clipboard", "softwareupdate --install-rosetta")
    })

    return (
        <div className={styles["yaklang-engine-hint-wrapper"]}>
            <div className={styles["yaklang-engine-hint-body"]}>
                <div className={styles["hint-left-wrapper"]}>
                    <div>
                        <YaklangInstallHintSvgIcon />
                    </div>
                    <YakitPopover
                        placement='topLeft'
                        trigger={["click"]}
                        content={
                            <div>
                                <Space direction={"vertical"}>
                                    <Space>
                                        Windows(x64) 下载：
                                        <div>
                                            https://yaklang.oss-cn-beijing.aliyuncs.com/yak/
                                            {123 || "latest"}/yak_windows_amd64.exe
                                        </div>
                                    </Space>
                                    <Space>
                                        MacOS(intel/m1) 下载：
                                        <div>
                                            https://yaklang.oss-cn-beijing.aliyuncs.com/yak/
                                            {123 || "latest"}/yak_darwin_amd64
                                        </div>
                                    </Space>
                                    <Space>
                                        Linux(x64) 下载：
                                        <div>
                                            https://yaklang.oss-cn-beijing.aliyuncs.com/yak/
                                            {123 || "latest"}/yak_linux_amd64
                                        </div>
                                    </Space>
                                    <Alert
                                        message={
                                            <div>
                                                手动下载完成后 Windows 用户可以把引擎放在
                                                %HOME%/yakit-projects/yak-engine/yak.exe 即可识别
                                                <br />
                                                MacOS / Linux 用户可以把引擎放在 ~/yakit-projects/yak-engine/yak
                                                即可识别
                                            </div>
                                        }
                                    />
                                </Space>
                            </div>
                        }
                        // onVisibleChange={(visible) => setShow(visible)}
                    >
                        <div>
                            <HelpSvgIcon />
                        </div>
                    </YakitPopover>
                </div>

                <div className={styles["hint-right-wrapper"]}>
                    {install ? (
                        <div className={styles["hint-right-download"]}>
                            <div className={styles["hint-right-title"]}>引擎安装中...</div>
                            <div className={styles["download-progress"]}>
                                <Progress strokeColor='#F28B44' trailColor='#F0F2F5' percent={30} />
                            </div>
                            <div className={styles["download-info-wrapper"]}>
                                <div>剩余时间 : 0.06s</div>
                                <div className={styles["divider-wrapper"]}>
                                    <div className={styles["divider-style"]}></div>
                                </div>
                                <div>耗时 : 0.04s</div>
                                <div className={styles["divider-wrapper"]}>
                                    <div className={styles["divider-style"]}></div>
                                </div>
                                <div>下载速度 : 0.00M/s</div>
                            </div>
                            <div style={{marginTop: 24}}>
                                <Button className={classnames(styles["btn-wrapper"], styles["btn-default-wrapper"])}>
                                    取消
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={styles["hint-right-title"]}>未安装引擎</div>
                            <div className={styles["hint-right-content"]}>
                                你可选择安装 Yak 引擎启动软件，或远程连接启动
                            </div>

                            {platformArch === "darwin-arm64" && (
                                <div className={styles["hint-right-macarm"]}>
                                    <div style={{width: "100%"}}>
                                        <div className={styles["mac-arm-hint"]}>
                                            当前系统为(darwin-arm64)，如果未安装 Rosetta 2, 将无法运行 Yak 核心引擎
                                            <br />
                                            运行以下命令可手动安装 Rosetta，如已安装可忽略
                                        </div>
                                        <div className={styles["mac-arm-command"]}>
                                            softwareupdate --install-rosetta
                                            <div className={styles["copy-icon"]} onClick={copyCommand}>
                                                <YakitCopySvgIcon />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className={styles["hint-right-btn"]}>
                                <div>
                                    <Button
                                        className={classnames(styles["btn-wrapper"], styles["btn-default-wrapper"])}
                                    >
                                        取消
                                    </Button>
                                </div>
                                <div className={styles["btn-group-wrapper"]}>
                                    <Button
                                        className={classnames(styles["btn-wrapper"], styles["btn-default-wrapper"])}
                                    >
                                        远程连接
                                    </Button>
                                    <Button className={classnames(styles["btn-wrapper"], styles["btn-theme-wrapper"])}>
                                        一键安装
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
})
