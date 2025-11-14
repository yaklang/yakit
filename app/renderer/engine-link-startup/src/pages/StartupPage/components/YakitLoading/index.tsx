import React, {useEffect, useMemo, useState} from "react"
import {getReleaseEditionName, isCommunityEdition, isEnpriTrace, isEnpriTraceAgent, isIRify} from "@/utils/envfile"
import {Checkbox, Dropdown, Form, Tooltip} from "antd"
import {getLocalValue, setLocalValue} from "@/utils/kv"
import yakitSE from "@/assets/yakitSE.png"
import yakitEE from "@/assets/yakitEE.png"
import yakitSS from "@/assets/yakitSS.png"
import {YakitLoadingSvgIcon, YakitThemeLoadingSvgIcon} from "@/assets/newIcon"
import {OutlineQuestionmarkcircleIcon} from "@/assets/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {LoadingClickExtra, ModalIsTop, System, YakitStatusType, YaklangEngineMode} from "../../types"
import {useDebounceEffect, useMemoizedFn} from "ahooks"
import {AgreementContentModal} from "../AgreementContentModal"
import {LocalGVS} from "@/enums/yakitGV"
import {grpcOpenYaklangPath} from "../../grpc"
import {openABSFileLocated} from "@/utils/openWebsite"

import classNames from "classnames"
import styles from "./YakitLoading.module.scss"

/** 首屏加载蒙层展示语 */
const LoadingTitle: string[] = [
    "没有困难的工作，只有勇敢的打工人。",
    "打工累吗？累！但我不能哭，因为骑电动车擦眼泪不安全。",
    "打工不仅能致富，还能交友娶媳妇",
    "今天搬砖不狠，明天地位不稳",
    "打工可能会少活十年，不打工你一天也活不下去。",
    "有人相爱，有人夜里看海，有人七八个闹钟起不来，早安打工人!",
    "打工人，打工魂，打工人是人上人",
    `@所有人，据说用了${getReleaseEditionName()}后就不必再卷了！`,
    `再不用${getReleaseEditionName()}，卷王就是别人的了`,
    `来用${getReleaseEditionName()}啦？安全圈还是你最成功`,
    `这届网安人，人手一个${getReleaseEditionName()}，香惨了！`,

    "webfuzzer时根目录插入字典，会有意想不到的收获 ——是果实菌啊",
    `${getReleaseEditionName()}写监听参数时不必写socks的版本号 ——是果实菌啊`,
    "使用热标签，可以中间处理des aes等加密，无需再碰py ——是果实菌啊",
    `${getReleaseEditionName()}，为您提供渗透问题的完美解决方案 ——酒零`,
    "热加载fuzz快速定位，轻松挖洞无压力 ——k1115h0t",
    "别让无聊占据你的时间，来探索新世界吧！——Chelth",
    `<script>alert(‘Hello ${getReleaseEditionName()}!’)</script> ——红炉点雪`,
    "你的鼠标，掌控世界！——Chelth"
]

export interface YakitLoadingProp {
    isTop: ModalIsTop
    setIsTop: (top: ModalIsTop) => void

    /** 操作系统 */
    system: System
    /** 内置引擎版本号 */
    buildInEngineVersion: string
    /** yakit模式 */
    yakitStatus: YakitStatusType
    /** 引擎模式 */
    engineMode: YaklangEngineMode

    /** 软件检查日志 */
    checkLog: string[]

    /** 手动重连引擎时的按钮loading */
    restartLoading: boolean
    /** 远程控制时的刷新按钮loading */
    remoteControlRefreshLoading: boolean

    /** 数据库修复失败时，数据库路径 */
    dbPath: string[]

    btnClickCallback: (type: YaklangEngineMode | YakitStatusType, extra?: LoadingClickExtra) => void
}

export const YakitLoading: React.FC<YakitLoadingProp> = (props) => {
    const {
        isTop,
        setIsTop,
        system,
        buildInEngineVersion,
        yakitStatus,
        engineMode,
        restartLoading,
        remoteControlRefreshLoading,
        btnClickCallback,
        checkLog,
        dbPath
    } = props

    const [form] = Form.useForm()
    /** 用户协议勾选状态 */
    const [agrCheck, setAgrCheck] = useState<boolean>(false)
    /** 执行一键安装功能时判断用户协议状态 */
    const [checkStatus, setCheckStatus] = useState<boolean>(false)
    /** 展示抖动动画 */
    const [isShake, setIsShake] = useState<boolean>(false)
    // 弹窗置顶
    const [agrShow, setAgrShow] = useState<boolean>(false)
    useEffect(() => {
        getLocalValue(LocalGVS.IsCheckedUserAgreement).then((val: boolean) => {
            setAgrCheck(val)
        })
    }, [])
    useDebounceEffect(
        () => {
            if (agrCheck) {
                setLocalValue(LocalGVS.IsCheckedUserAgreement, true)
            }
        },
        [agrCheck],
        {wait: 500}
    )
    const agreement = useMemoizedFn(() => {
        return (
            <div
                className={classNames(styles["hint-right-agreement"], {
                    [styles["agr-shake-animation"]]: !agrCheck && isShake
                })}
            >
                <Checkbox
                    className={classNames(
                        {[styles["agreement-checkbox"]]: !(!agrCheck && checkStatus)},
                        {
                            [styles["agreement-danger-checkbox"]]: !agrCheck && checkStatus
                        }
                    )}
                    checked={agrCheck}
                    onChange={(e) => setAgrCheck(e.target.checked)}
                ></Checkbox>
                <span>
                    勾选同意{" "}
                    <span
                        className={styles["agreement-style"]}
                        onClick={(e) => {
                            e.stopPropagation()
                            setAgrShow(true)
                            setIsTop(1)
                        }}
                    >
                        《用户协议》
                    </span>
                    以继续使用
                </span>
            </div>
        )
    })

    const judgmentAgreement = useMemoizedFn(() => {
        setCheckStatus(true)
        if (!agrCheck) {
            /** 抖动提示动画 */
            setIsShake(true)
            setTimeout(() => setIsShake(false), 1000)
            return false
        }
        return true
    })

    const btns = useMemo(() => {
        if (yakitStatus === "install") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => judgmentAgreement() && btnClickCallback("install")}
                    >
                        初始化引擎
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='outline2'
                        loading={restartLoading}
                        onClick={() => judgmentAgreement() && btnClickCallback("remote")}
                    >
                        远程连接
                    </YakitButton>

                    {agreement()}
                </>
            )
        }

        if (yakitStatus === "installNetWork") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => judgmentAgreement() && btnClickCallback("installNetWork")}
                    >
                        下载引擎
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='outline2'
                        loading={restartLoading}
                        onClick={() => judgmentAgreement() && btnClickCallback("remote")}
                    >
                        远程连接
                    </YakitButton>

                    {agreement()}
                </>
            )
        }

        if (yakitStatus === "check_timeout") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("check_timeout")}
                    >
                        重新执行
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        type='text'
                        onClick={() => btnClickCallback("remote")}
                    >
                        远程模式
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "old_version") {
            return (
                <>
                    {buildInEngineVersion ? (
                        <YakitButton
                            className={styles["btn-style"]}
                            size='max'
                            loading={restartLoading}
                            onClick={() => btnClickCallback("install")}
                        >
                            重置引擎版本
                        </YakitButton>
                    ) : (
                        <YakitButton
                            className={styles["btn-style"]}
                            size='max'
                            loading={restartLoading}
                            onClick={() => btnClickCallback("installNetWork")}
                        >
                            下载引擎
                        </YakitButton>
                    )}
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("current_version")}
                    >
                        使用当前版本
                    </YakitButton>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        type='text'
                        onClick={() => btnClickCallback("remote")}
                    >
                        远程模式
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "port_occupied") {
            return (
                <>
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
                                                pattern:
                                                    /^(?:[1-9]\d{0,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])$/,
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
                                                btnClickCallback("port_occupied", {port: res.newLinkport})
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
                        <YakitButton size='max' className={styles["btn-style"]} loading={restartLoading}>
                            切换端口
                        </YakitButton>
                    </Dropdown>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        type='text'
                        onClick={() => btnClickCallback("remote")}
                    >
                        远程模式
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "antivirus_blocked") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        type='text'
                        onClick={() => btnClickCallback("remote")}
                    >
                        远程模式
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "allow-secret-error") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("install")}
                    >
                        重置引擎版本
                    </YakitButton>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        type='text'
                        onClick={() => btnClickCallback("remote")}
                    >
                        远程模式
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "start_timeout") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("start_timeout")}
                    >
                        重新执行
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        type='text'
                        onClick={() => btnClickCallback("remote")}
                    >
                        远程模式
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "skipAgreement_Install") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("install")}
                    >
                        重置引擎版本
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='text'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("remote")}
                    >
                        远程连接
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "skipAgreement_InstallNetWork") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("installNetWork")}
                    >
                        下载引擎
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='text'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("remote")}
                    >
                        远程连接
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "database_error") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("database_error")}
                    >
                        修复数据库
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='text'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("remote")}
                    >
                        远程连接
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "fix_database_error") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='text'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("remote")}
                    >
                        远程连接
                    </YakitButton>
                    <div
                        className={styles["engine-help-wrapper"]}
                        onClick={() => {
                            openABSFileLocated(dbPath[0])
                        }}
                    >
                        {dbPath.join(",")}
                        <Tooltip title={`打开文件夹后，需自行修复数据库`}>
                            <OutlineQuestionmarkcircleIcon />
                        </Tooltip>
                    </div>
                </>
            )
        }

        if (yakitStatus === "fix_database_timeout") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("fix_database_timeout")}
                    >
                        重新执行
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        type='text'
                        onClick={() => btnClickCallback("remote")}
                    >
                        远程模式
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
                        type='text'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("remote")}
                    >
                        远程模式
                    </YakitButton>
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
                        type='text'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("remote")}
                    >
                        远程模式
                    </YakitButton>
                </>
            )
        }

        return null
    }, [
        yakitStatus,
        restartLoading,
        remoteControlRefreshLoading,
        engineMode,
        agrCheck,
        isShake,
        checkStatus,
        buildInEngineVersion,
        JSON.stringify(dbPath)
    ])

    /** 加载页随机宣传语 */
    const loadingTitle = useMemo(() => LoadingTitle[Math.floor(Math.random() * (LoadingTitle.length - 0)) + 0], [])
    /** Title */
    const Title = useMemo(
        () => (yakitStatus === "control-remote" ? "远程控制中 ..." : `欢迎使用 ${getReleaseEditionName()}`),
        [yakitStatus]
    )

    return (
        <>
            <div className={styles["yakit-loading-wrapper"]}>
                <div className={styles["yakit-loading-body"]}>
                    <div className={styles["body-content"]}>
                        <div className={styles["yakit-loading-title"]}>
                            <div className={styles["title-style"]}>{Title}</div>
                            {isCommunityEdition() && <div className={styles["subtitle-stlye"]}>{loadingTitle}</div>}
                        </div>

                        {/* 社区版 - 启动Logo */}
                        {isCommunityEdition() && (
                            <>
                                {isIRify() ? (
                                    <div className={styles["yakit-loading-icon-wrapper"]}>
                                        <div className={styles["white-icon"]}>
                                            <img src={yakitSS} alt='暂无图片' />
                                        </div>
                                    </div>
                                ) : (
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
                            </>
                        )}
                        {/* 企业版 - 启动Logo */}
                        {isEnpriTrace() && (
                            <>
                                {isIRify() ? (
                                    <div className={styles["yakit-loading-icon-wrapper"]}>
                                        <div className={styles["white-icon"]}>
                                            <img src={yakitSS} alt='暂无图片' />
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles["yakit-loading-icon-wrapper"]}>
                                        <div className={styles["white-icon"]}>
                                            <img src={yakitEE} alt='暂无图片' />
                                        </div>
                                    </div>
                                )}
                            </>
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
                                        return (
                                            <div key={item} className={styles["log-item"]}>
                                                {item}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className={styles["engine-log-btn"]}>
                                {btns}
                                <div
                                    className={styles["engine-help-wrapper"]}
                                    onClick={() => {
                                        grpcOpenYaklangPath()
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
            <AgreementContentModal
                isTop={isTop}
                setIsTop={setIsTop}
                system={system}
                visible={agrShow}
                setVisible={setAgrShow}
            />
        </>
    )
}
