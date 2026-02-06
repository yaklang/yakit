import React, {useEffect, useMemo, useState} from "react"
import {Checkbox, Divider, Form, Tooltip} from "antd"
import {getLocalValue, setLocalValue} from "@/utils/kv"
import {OutlineArrowcirclerightIcon, OutlineExitIcon, OutlineQuestionmarkcircleIcon} from "@/assets/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {LoadingClickExtra, ModalIsTop, System, YakitStatusType, YaklangEngineMode} from "../../types"
import {useDebounceEffect, useMemoizedFn} from "ahooks"
import {AgreementContentModal} from "../AgreementContentModal"
import {LocalGVS} from "@/enums/yakitGV"
import {grpcOpenYaklangPath} from "../../grpc"
import {openABSFileLocated} from "@/utils/openWebsite"
import {EngineModeVerbose} from "../../utils"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {ipcEventPre} from "@/utils/ipcEventPre"
import {SoftwareBasics, SoftwareBasicsProps} from "../SoftwareBasics"

import classNames from "classnames"
import styles from "./YakitLoading.module.scss"
const {ipcRenderer} = window.require("electron")
export interface YakitLoadingProp extends SoftwareBasicsProps {
    /** loading 文案 */
    yakitLoadingTip: string
    /** 界面暂时无法操作 */
    disableYakitLoading: boolean

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

    /** 数据库修复失败时，数据库路径 */
    dbPath: string[]

    /** 当前连接端口号 */
    port: number

    /** 倒计时秒数 */
    countdown?: number

    btnClickCallback: (type: YaklangEngineMode | YakitStatusType, extra?: LoadingClickExtra) => void
}

export const YakitLoading: React.FC<YakitLoadingProp> = (props) => {
    const {
        yakitLoadingTip,
        disableYakitLoading,
        isTop,
        setIsTop,
        system,
        buildInEngineVersion,
        yakitStatus,
        engineMode,
        restartLoading,
        btnClickCallback,
        checkLog,
        dbPath,
        port,
        countdown = 0,
        softTheme,
        setSoftTheme,
        softMode,
        setSoftMode,
        softLang,
        setSoftLang
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
                        size='large'
                        loading={restartLoading}
                        onClick={() => judgmentAgreement() && btnClickCallback("install")}
                    >
                        初始化引擎
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        type='secondary2'
                        loading={restartLoading}
                        onClick={() => judgmentAgreement() && btnClickCallback("remote")}
                    >
                        远程连接
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "installNetWork") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => judgmentAgreement() && btnClickCallback("installNetWork")}
                    >
                        下载引擎
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        type='secondary2'
                        loading={restartLoading}
                        onClick={() => judgmentAgreement() && btnClickCallback("remote")}
                    >
                        远程连接
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "check_timeout") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("check_timeout")}
                    >
                        重新执行
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
                            size='large'
                            loading={restartLoading}
                            onClick={() => btnClickCallback("install")}
                        >
                            重置引擎版本
                        </YakitButton>
                    ) : (
                        <YakitButton
                            className={styles["btn-style"]}
                            size='large'
                            loading={restartLoading}
                            onClick={() => btnClickCallback("installNetWork")}
                        >
                            下载引擎
                        </YakitButton>
                    )}
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        type='secondary2'
                        onClick={() => btnClickCallback("current_version")}
                    >
                        使用当前版本
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "port_occupied_prev") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("port_occupied_prev", {killCurProcess: true})}
                    >
                        重新连接
                    </YakitButton>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        type='secondary2'
                        onClick={() => btnClickCallback("port_occupied_prev")}
                    >
                        切换端口
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "port_occupied") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => {
                            form.validateFields().then((res) => {
                                btnClickCallback("port_occupied", {port: res.newLinkport})
                            })
                        }}
                    >
                        连接
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "allow-secret-error") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("install")}
                    >
                        重置引擎版本
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "start_timeout") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("start_timeout")}
                    >
                        重新执行
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "skipAgreement_Install") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("install")}
                    >
                        重置引擎版本
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "skipAgreement_InstallNetWork") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("installNetWork")}
                    >
                        下载引擎
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "database_error") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("database_error")}
                    >
                        修复数据库
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "fix_database_error") {
            return (
                <>
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
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("fix_database_timeout")}
                    >
                        重新执行
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "update_yakit") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("update_yakit", {downYakit: true})}
                    >
                        下载更新
                    </YakitButton>

                    <YakitDropdownMenu
                        menu={{
                            data: [
                                {key: "ignoreThisTime", label: "忽略本次"},
                                {key: "ignoreUpdates", label: "不再提示"}
                            ],
                            onClick: ({key}) => {
                                switch (key) {
                                    case "ignoreThisTime":
                                        btnClickCallback("update_yakit", {ignoreYakit: "ignoreThisTime"})
                                        break
                                    case "ignoreUpdates":
                                        btnClickCallback("update_yakit", {ignoreYakit: "ignoreUpdates"})
                                        break
                                    default:
                                        break
                                }
                            },
                            menuWrapperClassName: styles["menuWrapper"],
                            menuItemTitleClassName: styles["menuItemTitle"]
                        }}
                        dropdown={{
                            trigger: ["click"],
                            placement: "bottom"
                        }}
                    >
                        <YakitButton
                            className={styles["btn-style"]}
                            size='large'
                            type='secondary2'
                            loading={restartLoading}
                        >
                            忽略
                        </YakitButton>
                    </YakitDropdownMenu>
                </>
            )
        }

        if (yakitStatus === "update_yak") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("update_yak", {downYak: true})}
                    >
                        安装
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        type='secondary2'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("update_yak")}
                    >
                        忽略
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "check_yak_version_error") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("check_yak_version_error")}
                    >
                        手动连接引擎
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "softwareBasics") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("softwareBasics")}
                    >
                        手动连接引擎
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "break") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("break", {linkAgain: true})}
                    >
                        手动连接引擎
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "reclaimDatabaseSpace_success") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("reclaimDatabaseSpace_success")}
                    >
                        手动连接引擎
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "reclaimDatabaseSpace_error") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("reclaimDatabaseSpace_error")}
                    >
                        手动连接引擎
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "error") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("error")}
                    >
                        手动连接引擎
                    </YakitButton>
                </>
            )
        }

        if (yakitStatus === "link_countdown") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        type='primary'
                        onClick={() => btnClickCallback("link_countdown", {enterNow: true})}
                    >
                        立即进入 ({countdown}s)
                    </YakitButton>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='large'
                        type='secondary2'
                        onClick={() => btnClickCallback("link_countdown")}
                    >
                        取消连接
                    </YakitButton>
                </>
            )
        }

        return null
    }, [yakitStatus, restartLoading, engineMode, checkStatus, buildInEngineVersion, JSON.stringify(dbPath), countdown])

    const logError = useMemo(() => {
        if (!yakitStatus) {
            return false
        }
        return [
            "check_timeout",
            "old_version",
            "skipAgreement_InstallNetWork",
            "skipAgreement_Install",
            "port_occupied_prev",
            "port_occupied",
            "database_error",
            "fix_database_timeout",
            "fix_database_error",
            "reclaimDatabaseSpace_error",
            "antivirus_blocked",
            "allow-secret-error",
            "check_yak_version_error",
            "start_timeout",
            "error",
            "break"
        ].includes(yakitStatus)
    }, [yakitStatus])
    const logSuccess = useMemo(() => {
        if (!yakitStatus) {
            return false
        }
        return ["reclaimDatabaseSpace_success"].includes(yakitStatus)
    }, [yakitStatus])

    useEffect(() => {
        form.setFieldsValue({newLinkport: port})
    }, [port])

    return (
        <YakitSpin spinning={disableYakitLoading} tip={yakitLoadingTip}>
            <div className={styles["startup-loading-wrapper"]}>
                {yakitStatus === "softwareBasics" ? (
                    <SoftwareBasics
                        softTheme={softTheme}
                        setSoftTheme={setSoftTheme}
                        softMode={softMode}
                        setSoftMode={setSoftMode}
                        softLang={softLang}
                        setSoftLang={setSoftLang}
                    />
                ) : (
                    <div
                        className={classNames(styles["log-wrapper"], {
                            [styles["log-default-color"]]: !logError,
                            [styles["log-error-color"]]: logError,
                            [styles["log-success-color"]]: logSuccess
                        })}
                    >
                        <div className={styles["log-body"]}>
                            {yakitStatus === "link_countdown" ? (
                                <div className={styles["log-item"]}>引擎连接成功！{countdown} 秒后自动进入...</div>
                            ) : yakitStatus === "break" ? (
                                <div className={styles["log-item"]}>已主动断开, 请点击手动连接引擎</div>
                            ) : (
                                checkLog.map((item, index, arr) => {
                                    return (
                                        <div key={item} className={styles["log-item"]}>
                                            {item}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}
                <div className={styles["engine-log-btn"]}>
                    <Form
                        form={form}
                        requiredMark={false}
                        colon={false}
                        layout={"horizontal"}
                        labelCol={{span: 0}}
                        wrapperCol={{span: 24}}
                        style={{display: yakitStatus === "port_occupied" ? "block" : "none"}}
                    >
                        <Form.Item
                            label={""}
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
                            <YakitInput placeholder='切换端口...' disabled={restartLoading} />
                        </Form.Item>
                    </Form>
                    {btns}
                </div>
                <div className={styles["footer-wrapper"]}>
                    <span
                        className={styles["exit-btn"]}
                        onClick={() => ipcRenderer.invoke(ipcEventPre + "UIOperate", "close")}
                    >
                        <OutlineExitIcon className={styles["exit-icon"]} />
                        退出
                    </span>
                    {["install", "installNetWork"].includes(yakitStatus) ? (
                        <>
                            <Divider type='vertical'></Divider>
                            {agreement()}
                        </>
                    ) : (
                        <div className={styles["footer-btn"]}>
                            {/* 倒计时状态时不显示底部按钮 */}
                            {yakitStatus !== "link_countdown" && (
                                <>
                                    <Divider type='vertical'></Divider>
                                    <span className={styles["secondary-btn"]} onClick={() => grpcOpenYaklangPath()}>
                                        打开引擎文件
                                    </span>
                                    {/* 中断连接按钮：在空状态或连接状态成功 时显示 */}
                                    {(!yakitStatus || ["link", "ready"].includes(yakitStatus)) && (
                                        <>
                                            <Divider type='vertical'></Divider>
                                            <span
                                                className={classNames(styles["primary-btn"])}
                                                onClick={() => {
                                                    btnClickCallback("break")
                                                }}
                                            >
                                                中断连接
                                            </span>
                                        </>
                                    )}
                                    {/* 回收数据库空间：在非连接状态时显示 */}
                                    {/* {yakitStatus && !["link", "ready", "init"].includes(yakitStatus) && (
                                        <>
                                            <Divider type='vertical'></Divider>
                                            <span
                                                className={classNames(styles["secondary-btn"], {
                                                    [styles["secondary-btn-disable"]]: restartLoading
                                                })}
                                                onClick={() => {
                                                    if (restartLoading) {
                                                        return
                                                    }
                                                    btnClickCallback("reclaimDatabaseSpace_start")
                                                }}
                                            >
                                                回收数据库空间
                                            </span>
                                        </>
                                    )} */}
                                    {/* 远程连接按钮：在非连接状态时显示 */}
                                    {yakitStatus && !["link", "ready", "init", "reclaimDatabaseSpace_start"].includes(yakitStatus) && (
                                        <>
                                            <Divider type='vertical'></Divider>
                                            <span
                                                className={classNames(styles["primary-btn"], {
                                                    [styles["primary-btn-disable"]]: restartLoading
                                                })}
                                                onClick={() => {
                                                    if (restartLoading) {
                                                        return
                                                    }
                                                    btnClickCallback("remote")
                                                }}
                                            >
                                                {EngineModeVerbose("remote")}{" "}
                                                <OutlineArrowcirclerightIcon
                                                    className={styles["arrow-circle-right-icon"]}
                                                />
                                            </span>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <AgreementContentModal
                isTop={isTop}
                setIsTop={setIsTop}
                system={system}
                visible={agrShow}
                setVisible={setAgrShow}
            />
        </YakitSpin>
    )
}
