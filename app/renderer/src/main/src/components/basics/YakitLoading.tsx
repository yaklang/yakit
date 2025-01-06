import React, {useMemo, useState} from "react"
import {YakitLoadingSvgIcon, YakitThemeLoadingSvgIcon} from "./icon"
import {EngineOtherOperation, YakitStatusType, YaklangEngineMode} from "@/yakitGVDefine"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {getReleaseEditionName, isCommunityEdition, isEnpriTrace, isEnpriTraceAgent} from "@/utils/envfile"
import {DynamicStatusProps} from "@/store"
import {Divider, Dropdown, Form, Tooltip} from "antd"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"

import yakitSE from "@/assets/yakitSE.png"
import yakitEE from "@/assets/yakitEE.png"
import styles from "./yakitLoading.module.scss"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {setLocalValue} from "@/utils/kv"
import {LocalGV} from "@/yakitGV"

const {ipcRenderer} = window.require("electron")

/** 首屏加载蒙层展示语 */
const LoadingTitle: string[] = [
    "没有困难的工作，只有勇敢的打工人。",
    "打工累吗？累！但我不能哭，因为骑电动车擦眼泪不安全。",
    "打工不仅能致富，还能交友娶媳妇",
    "今天搬砖不狠，明天地位不稳",
    "打工可能会少活十年，不打工你一天也活不下去。",
    "有人相爱，有人夜里看海，有人七八个闹钟起不来，早安打工人!",
    "打工人，打工魂，打工人是人上人",
    "@所有人，据说用了Yakit后就不必再卷了！",
    "再不用Yakit，卷王就是别人的了",
    "来用Yakit啦？安全圈还是你最成功",
    "这届网安人，人手一个Yakit，香惨了！",

    "webfuzzer时根目录插入字典，会有意想不到的收获 ——是果实菌啊",
    "yakit写监听参数时不必写socks的版本号 ——是果实菌啊 ",
    "使用热标签，可以中间处理des aes等加密，无需再碰py ——是果实菌啊",
    "Yakit，为您提供渗透问题的完美解决方案 ——酒零",
    "热加载fuzz快速定位，轻松挖洞无压力 ——k1115h0t",
    "别让无聊占据你的时间，来探索新世界吧！——Chelth",
    "<script>alert(‘Hello Yakit!’)</script> ——红炉点雪",
    "你的鼠标，掌控世界！——Chelth"
]

export const EngineModeVerbose = (m: YaklangEngineMode, n?: DynamicStatusProps) => {
    if (n && n.isDynamicStatus) {
        return "控制模式"
    }
    switch (m) {
        case "local":
            return "本地模式"
        case "remote":
            return "远程模式"
        default:
            return "未知模式"
    }
}

export interface YakitLoadingProp {
    /** yakit模式 */
    yakitStatus: YakitStatusType
    /** 引擎模式 */
    engineMode: YaklangEngineMode

    /** 软件检查日志 */
    checkLog: string[]

    showEngineLog: boolean
    setShowEngineLog: (flag: boolean) => any

    /** 手动重连引擎时的按钮loading */
    restartLoading: boolean
    /** 远程控制时的刷新按钮loading */
    remoteControlRefreshLoading: boolean

    btnClickCallback: (type: YaklangEngineMode | YakitStatusType | EngineOtherOperation) => any
}

export const YakitLoading: React.FC<YakitLoadingProp> = (props) => {
    const {
        yakitStatus,
        engineMode,
        showEngineLog,
        setShowEngineLog,
        restartLoading,
        remoteControlRefreshLoading,
        btnClickCallback,
        checkLog
    } = props

    const [form] = Form.useForm()

    const changePortBtn = () => {
        return (
            <Dropdown
                trigger={["click"]}
                placement='bottomLeft'
                overlay={() => (
                    <div style={{margin: 15}}>
                        <Form form={form} layout={"horizontal"} labelCol={{span: 6}} wrapperCol={{span: 18}}>
                            <Form.Item
                                label={"端口号"}
                                rules={[
                                    {required: true, message: `请输入端口号`},
                                    {
                                        pattern: /^(?:[1-9]\d{0,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])$/,
                                        message: "请输入正确的端口号"
                                    }
                                ]}
                                name={"newLinkport"}
                            >
                                <YakitInput />
                            </Form.Item>
                        </Form>
                        <div style={{textAlign: "right", marginTop: 10}}>
                            <YakitButton
                                size='small'
                                loading={restartLoading}
                                onClick={() => {
                                    form.validateFields().then((res) => {
                                        setLocalValue(LocalGV.YaklangEnginePort, res.newLinkport)
                                        btnClickCallback("changePort")
                                    })
                                }}
                            >
                                确定
                            </YakitButton>
                        </div>
                    </div>
                )}
                overlayClassName={styles["change-port-dropdown-menu"]}
            >
                <YakitButton size='max' type='text'>
                    切换端口
                </YakitButton>
            </Dropdown>
        )
    }

    const btns = useMemo(() => {
        if (yakitStatus === "checkError") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("checkError")}
                    >
                        手动连接引擎
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='outline2'
                        loading={restartLoading}
                        onClick={() => btnClickCallback(engineMode === "local" ? "remote" : "local")}
                    >
                        切换为{engineMode === "local" ? "远程" : "本地"}模式
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "break") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("break")}
                    >
                        手动连接引擎
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='outline2'
                        loading={restartLoading}
                        onClick={() => btnClickCallback(engineMode === "local" ? "remote" : "local")}
                    >
                        切换为{engineMode === "local" ? "远程" : "本地"}模式
                    </YakitButton>

                    <div>
                        {changePortBtn()}
                    </div>
                </>
            )
        }
        if (yakitStatus === "error") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("error")}
                    >
                        手动连接引擎
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='outline2'
                        loading={restartLoading}
                        onClick={() => btnClickCallback(engineMode === "local" ? "remote" : "local")}
                    >
                        切换为{engineMode === "local" ? "远程" : "本地"}模式
                    </YakitButton>

                    <div>
                        <YakitButton size='max' type='text' onClick={() => setShowEngineLog(!showEngineLog)}>
                            {showEngineLog ? "隐藏日志" : "查看日志"}
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        {changePortBtn()}
                    </div>
                </>
            )
        }

        if (yakitStatus === "control-remote") {
            return (
                <>
                    <YakitButton
                        loading={remoteControlRefreshLoading}
                        className={styles["btn-style"]}
                        size='max'
                        onClick={() => btnClickCallback("control-remote")}
                    >
                        刷新
                    </YakitButton>
                    <YakitButton
                        loading={remoteControlRefreshLoading}
                        className={styles["btn-style"]}
                        type='outline2'
                        size='max'
                        onClick={() => btnClickCallback("local")}
                    >
                        返回
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "control-remote-timeout") {
            return (
                <YakitButton
                    loading={restartLoading}
                    className={styles["btn-style"]}
                    type='outline2'
                    size='max'
                    onClick={() => btnClickCallback("local")}
                >
                    返回本地连接
                </YakitButton>
            )
        }

        return <></>
    }, [yakitStatus, restartLoading, remoteControlRefreshLoading, engineMode, showEngineLog])

    /** 加载页随机宣传语 */
    const loadingTitle = useMemo(() => LoadingTitle[Math.floor(Math.random() * (LoadingTitle.length - 0)) + 0], [])
    /** Title */
    const Title = useMemo(
        () => (yakitStatus === "control-remote" ? "远程控制中 ..." : `欢迎使用 ${getReleaseEditionName()}`),
        [yakitStatus]
    )

    return (
        <div className={styles["yakit-loading-wrapper"]}>
            <div className={styles["yakit-loading-body"]}>
                <div className={styles["body-content"]}>
                    <div className={styles["yakit-loading-title"]}>
                        <div className={styles["title-style"]}>{Title}</div>
                        {isCommunityEdition() && <div className={styles["subtitle-stlye"]}>{loadingTitle}</div>}
                    </div>

                    {/* 社区版 - 启动Logo */}
                    {isCommunityEdition() && (
                        <div className={styles["yakit-loading-icon-wrapper"]}>
                            <div className={styles["theme-icon-wrapper"]}>
                                <div className={styles["theme-icon"]}>
                                    <YakitThemeLoadingSvgIcon />
                                </div>
                            </div>
                            <div className={styles["white-icon"]}>
                                <YakitLoadingSvgIcon />
                            </div>
                        </div>
                    )}
                    {/* 企业版 - 启动Logo */}
                    {isEnpriTrace() && (
                        <div className={styles["yakit-loading-icon-wrapper"]}>
                            <div className={styles["white-icon"]}>
                                <img src={yakitEE} alt='暂无图片' />
                            </div>
                        </div>
                    )}
                    {/* 便携版 - 启动Logo */}
                    {isEnpriTraceAgent() && (
                        <div className={styles["yakit-loading-icon-wrapper"]}>
                            <div className={styles["white-icon"]}>
                                <img src={yakitSE} alt='暂无图片' />
                            </div>
                        </div>
                    )}

                    <div className={styles["yakit-loading-content"]}>
                        <div className={styles["log-wrapper"]}>
                            <div className={styles["log-body"]}>
                                {checkLog.map((item, index) => {
                                    return <div key={item}>{item}</div>
                                })}
                            </div>
                        </div>

                        <div className={styles["engine-log-btn"]}>
                            {btns}
                            <div
                                className={styles["engine-help-wrapper"]}
                                onClick={() => {
                                    ipcRenderer.invoke("open-yaklang-path")
                                }}
                            >
                                打开引擎所在文件
                                <Tooltip title={`打开文件夹后运行'start-engine-grpc'，命令行启动引擎查看具体问题`}>
                                    <OutlineQuestionmarkcircleIcon />
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
