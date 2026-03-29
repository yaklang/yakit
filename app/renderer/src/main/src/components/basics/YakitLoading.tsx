import React, {useMemo} from "react"
import {YakitLoadingSvgIcon, YakitThemeLoadingSvgIcon} from "./icon"
import {EngineOtherOperation, YakitStatusType, YaklangEngineMode} from "@/yakitGVDefine"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {
    fetchEnv,
    getReleaseEditionName,
    isCommunityEdition,
    isEnpriTrace,
    isEnpriTraceAgent,
    isIRify
} from "@/utils/envfile"
import {DynamicStatusProps} from "@/store"
import {Divider, Dropdown, Form, Tooltip} from "antd"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {setLocalValue} from "@/utils/kv"
import {getEnginePortCacheKey} from "@/utils/localCache/engine"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import i18n from "@/i18n/i18n"

import IRifyPrimaryBg from "../../assets/uiLayout/IRifyPrimaryBg.png"
import MemfitAIPrimaryBg from "@/assets/uiLayout/MemfitAIPrimaryBg.png"
import YakitPrimaryBg from "@/assets/uiLayout/YakitPrimaryBg.png"

import yakitSE from "@/assets/yakitSE.png"
import yakitEE from "@/assets/yakitEE.png"
import yakitSS from "@/assets/yakitSS.png"
import styles from "./yakitLoading.module.scss"

const {ipcRenderer} = window.require("electron")

export const EngineModeVerbose = (m: YaklangEngineMode, n?: DynamicStatusProps) => {
    const t = i18n.getFixedT(null, "layout")
    if (n && n.isDynamicStatus) {
        return t("YakitLoading.controlMode")
    }
    switch (m) {
        case "local":
            return t("YakitLoading.localMode")
        case "remote":
            return t("YakitLoading.remoteMode")
        default:
            return t("YakitLoading.unknownMode")
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
    const {t} = useI18nNamespaces(["layout"])

    const [form] = Form.useForm()
    const loadingTitles = [
        t("YakitLoading.slogan1"),
        t("YakitLoading.slogan2"),
        t("YakitLoading.slogan3"),
        t("YakitLoading.slogan4"),
        t("YakitLoading.slogan5"),
        t("YakitLoading.slogan6"),
        t("YakitLoading.slogan7"),
        t("YakitLoading.slogan8", {edition: getReleaseEditionName()}),
        t("YakitLoading.slogan9", {edition: getReleaseEditionName()}),
        t("YakitLoading.slogan10", {edition: getReleaseEditionName()}),
        t("YakitLoading.slogan11", {edition: getReleaseEditionName()}),
        t("YakitLoading.slogan12"),
        t("YakitLoading.slogan13", {edition: getReleaseEditionName()}),
        t("YakitLoading.slogan14"),
        t("YakitLoading.slogan15", {edition: getReleaseEditionName()}),
        t("YakitLoading.slogan16"),
        t("YakitLoading.slogan17", {edition: getReleaseEditionName()}),
        t("YakitLoading.slogan18")
    ]

    const changePortBtn = () => {
        return (
            <Dropdown
                trigger={["click"]}
                placement='bottomLeft'
                overlay={() => (
                    <div style={{margin: 15}}>
                        <Form form={form} layout={"horizontal"} labelCol={{span: 6}} wrapperCol={{span: 18}}>
                            <Form.Item
                                label={t("YakitLoading.portNumber")}
                                rules={[
                                    {required: true, message: t("YakitLoading.enterPortNumber")},
                                    {
                                        pattern:
                                            /^(?:[1-9]\d{0,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])$/,
                                        message: t("YakitLoading.enterValidPort")
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
                                        setLocalValue(getEnginePortCacheKey(), res.newLinkport)
                                        btnClickCallback("changePort")
                                    })
                                }}
                            >
                                {t("YakitLoading.confirm")}
                            </YakitButton>
                        </div>
                    </div>
                )}
                overlayClassName={styles["change-port-dropdown-menu"]}
            >
                <YakitButton size='max' type='text'>
                    {t("YakitLoading.switchPort")}
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
                        {t("YakitLoading.manualConnectEngine")}
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='outline2'
                        loading={restartLoading}
                        onClick={() => btnClickCallback(engineMode === "local" ? "remote" : "local")}
                    >
                        {t("YakitLoading.switchMode", {mode: engineMode === "local" ? t("YakitLoading.remoteModeShort") : t("YakitLoading.localModeShort")})}
                    </YakitButton>

                    <div>
                        <YakitButton size='max' type='text' onClick={() => setShowEngineLog(!showEngineLog)}>
                            {showEngineLog ? t("YakitLoading.hideLog") : t("YakitLoading.viewLog")}
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        {changePortBtn()}
                    </div>
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
                        {t("YakitLoading.manualConnectEngine")}
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='outline2'
                        loading={restartLoading}
                        onClick={() => btnClickCallback(engineMode === "local" ? "remote" : "local")}
                    >
                        {t("YakitLoading.switchMode", {mode: engineMode === "local" ? t("YakitLoading.remoteModeShort") : t("YakitLoading.localModeShort")})}
                    </YakitButton>

                    <div>
                        <YakitButton size='max' type='text' onClick={() => setShowEngineLog(!showEngineLog)}>
                            {showEngineLog ? t("YakitLoading.hideLog") : t("YakitLoading.viewLog")}
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
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
                        {t("YakitLoading.manualConnectEngine")}
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='outline2'
                        loading={restartLoading}
                        onClick={() => btnClickCallback(engineMode === "local" ? "remote" : "local")}
                    >
                        {t("YakitLoading.switchMode", {mode: engineMode === "local" ? t("YakitLoading.remoteModeShort") : t("YakitLoading.localModeShort")})}
                    </YakitButton>

                    <div>
                        <YakitButton size='max' type='text' onClick={() => setShowEngineLog(!showEngineLog)}>
                            {showEngineLog ? t("YakitLoading.hideLog") : t("YakitLoading.viewLog")}
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        {changePortBtn()}
                    </div>
                </>
            )
        }
        if (yakitStatus === "engine-error") {
            return (
                <>
                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        loading={restartLoading}
                        onClick={() => btnClickCallback("engine-error")}
                    >
                        {t("YakitLoading.resetEngineVersion")}
                    </YakitButton>

                    <YakitButton
                        className={styles["btn-style"]}
                        size='max'
                        type='outline2'
                        loading={restartLoading}
                        onClick={() => btnClickCallback(engineMode === "local" ? "remote" : "local")}
                    >
                        {t("YakitLoading.switchMode", {mode: engineMode === "local" ? t("YakitLoading.remoteModeShort") : t("YakitLoading.localModeShort")})}
                    </YakitButton>

                    <div>
                        <YakitButton size='max' type='text' onClick={() => setShowEngineLog(!showEngineLog)}>
                            {showEngineLog ? t("YakitLoading.hideLog") : t("YakitLoading.viewLog")}
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
                        {t("YakitLoading.refresh")}
                    </YakitButton>
                    <YakitButton
                        loading={remoteControlRefreshLoading}
                        className={styles["btn-style"]}
                        type='outline2'
                        size='max'
                        onClick={() => btnClickCallback("local")}
                    >
                        {t("YakitLoading.back")}
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
                    {t("YakitLoading.backToLocal")}
                </YakitButton>
            )
        }

        return (
            <div>
                <YakitButton size='max' type='text' onClick={() => setShowEngineLog(!showEngineLog)}>
                    {showEngineLog ? t("YakitLoading.hideLog") : t("YakitLoading.viewLog")}
                </YakitButton>
                {!["ready", "link"].includes(yakitStatus) && (
                    <>
                        <Divider type='vertical' style={{margin: 0}} />
                        {changePortBtn()}
                    </>
                )}
            </div>
        )
    }, [yakitStatus, restartLoading, remoteControlRefreshLoading, engineMode, showEngineLog])

    /** 加载页随机宣传语 */
    const loadingTitle = useMemo(() => loadingTitles[Math.floor(Math.random() * loadingTitles.length)], [loadingTitles])
    /** Title */
    const Title = useMemo(
            () => (yakitStatus === "control-remote" ? t("YakitLoading.remoteControlling") : t("YakitLoading.welcome", {edition: getReleaseEditionName()})),
        [yakitStatus]
    )

    const primaryBg = useMemo(() => {
        switch (fetchEnv()) {
            case "irify":
            case "irify-enterprise":
                return `url(${IRifyPrimaryBg})`
            case "memfit":
                return `url(${MemfitAIPrimaryBg})`
            case "enterprise":
            case "simple-enterprise":
            case "yakit":
                return `url(${YakitPrimaryBg})`
            default:
                break
        }
    }, [])

    return (
        <div className={styles["yakit-loading-wrapper"]}>
            <div className={styles["yakit-loading-body"]}>
                <div className={styles["body-content"]} style={{backgroundImage: primaryBg}}>
                    <div className={styles["yakit-loading-title"]}>
                        <div className={styles["title-style"]}>{Title}</div>
                        {isCommunityEdition() && <div className={styles["subtitle-stlye"]}>{loadingTitles[Math.floor(Math.random() * loadingTitles.length)]}</div>}
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
                                    ipcRenderer.invoke("open-yaklang-path")
                                }}
                            >
                                {t("YakitLoading.openEngineFolder")}
                                <Tooltip title={t("YakitLoading.openEngineFolderTip")}>
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
