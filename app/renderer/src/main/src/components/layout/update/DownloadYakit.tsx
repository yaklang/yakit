import React, {useState, useRef, useEffect} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {isCommunityEdition, isEnterpriseEdition, getReleaseEditionName, isEnpriTrace} from "@/utils/envfile"
import {success, failed} from "@/utils/notification"
import {YakitSystem, DownloadingState} from "@/yakitGVDefine"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import {useDebounce, useGetState, useMemoizedFn} from "ahooks"
import {Progress} from "antd"
import {YaklangInstallHintSvgIcon, MacUIOpCloseSvgIcon, WinUIOpCloseSvgIcon} from "../icons"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"
import emiter from "@/utils/eventBus/eventBus"
import {safeFormatDownloadProcessState} from "../utils"
import {grpcFetchLatestYakitVersion} from "@/apiUtils/grpc"
import {WebsiteGV} from "@/enums/website"

import classNames from "classnames"
import styles from "./DownloadYakit.module.scss"

const {ipcRenderer} = window.require("electron")

interface DownloadYakitProps {
    system: YakitSystem
    visible: boolean
    setVisible: (flag: boolean) => any
}

/** @name Yakit软件更新下载弹窗 */
export const DownloadYakit: React.FC<DownloadYakitProps> = React.memo((props) => {
    const {system, visible, setVisible} = props

    /** 常见问题弹窗是否展示 */
    const [qsShow, setQSShow] = useState<boolean>(false)

    /** 是否置顶 */
    const [isTop, setIsTop] = useState<0 | 1 | 2>(0)

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const debouncedBounds = useDebounce(bounds, {wait: 500})
    const draggleRef = useRef<HTMLDivElement>(null)

    /** 下载进度条数据 */
    const [downloadProgress, setDownloadProgress, getDownloadProgress] = useGetState<DownloadingState>()

    // 是否中断下载进程
    const isBreakRef = useRef<boolean>(false)

    /**
     * 1. 获取最新软件版本号，并下载
     * 2. 监听本地下载软件进度数据
     * @returns 删除监听事件2
     */
    useEffect(() => {
        if (visible) {
            if (isCommunityEdition() || isEnpriTrace()) {
                isBreakRef.current = true
                setDownloadProgress(undefined)
                grpcFetchLatestYakitVersion()
                    .then((data: string) => {
                        let version = data
                        if (version.startsWith("v")) version = version.slice(1)

                        ipcRenderer
                            .invoke("download-latest-yakit", version, isEnterpriseEdition())
                            .then(() => {
                                if (!isBreakRef.current) return
                                success("下载完毕")
                                if (!getDownloadProgress()?.size) return
                                setDownloadProgress({
                                    time: {
                                        elapsed: downloadProgress?.time.elapsed || 0,
                                        remaining: 0
                                    },
                                    speed: 0,
                                    percent: 100,
                                    // @ts-ignore
                                    size: getDownloadProgress().size
                                })
                                ipcRenderer.invoke("open-yakit-path")
                                emiter.emit("downloadedYakitFlag")
                            })
                            .catch((e: any) => {
                                if (!isBreakRef.current) return
                                failed(`下载失败: ${e}`)
                            })
                            .finally(() => setVisible(false))
                    })
                    .catch((e: any) => {
                        if (!isBreakRef.current) return
                        setVisible(false)
                    })
            }
            // 如需编写 Yakit-EE 下载功能，可在此处添加

            ipcRenderer.on("download-yakit-engine-progress", (e: any, state: DownloadingState) => {
                if (!isBreakRef.current) return
                setDownloadProgress(safeFormatDownloadProcessState(state))
            })
            return () => {
                ipcRenderer.removeAllListeners("download-yakit-engine-progress")
            }
        } else {
            isBreakRef.current = false
        }
    }, [visible])

    /** 弹窗拖拽移动触发事件 */
    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        const {clientWidth, clientHeight} = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return

        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y + 36,
            bottom: clientHeight - (targetRect.bottom - uiData.y)
        })
    })

    /** 取消下载事件 */
    const onCancel = useMemoizedFn(() => {
        isBreakRef.current = false
        setVisible(false)
        setDownloadProgress(undefined)
        ipcRenderer.invoke("cancel-download-yakit-version")
    })

    return (
        <>
            <Draggable
                defaultClassName={classNames(
                    styles["draggable-modal"],
                    visible ? styles["download-yakit-modal"] : styles["draggable-hidden-modal"],
                    {[styles["modal-top-wrapper"]]: isTop === 0}
                )}
                disabled={disabled}
                bounds={debouncedBounds}
                onStart={(event, uiData) => onStart(event, uiData)}
            >
                <div ref={draggleRef}>
                    <div className={styles["modal-yaklang-engine-hint"]} onClick={() => setIsTop(0)}>
                        <div className={styles["yaklang-engine-hint-wrapper"]}>
                            <div
                                className={styles["hint-draggle-body"]}
                                onMouseEnter={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseLeave={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(0)}
                            ></div>

                            <div className={styles["hint-left-wrapper"]}>
                                <div className={styles["hint-icon"]}>
                                    <YaklangInstallHintSvgIcon />
                                </div>
                                <div
                                    className={styles["qs-icon"]}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setQSShow(true)
                                        setIsTop(2)
                                    }}
                                >
                                    <OutlineQuestionmarkcircleIcon />
                                </div>
                            </div>

                            <div className={styles["hint-right-wrapper"]}>
                                <div className={styles["hint-right-download"]}>
                                    <div className={styles["hint-right-title"]}>
                                        {getReleaseEditionName()} 软件下载中...
                                    </div>
                                    <div className={styles["download-progress"]}>
                                        <Progress
                                            strokeColor='#F28B44'
                                            trailColor='#F0F2F5'
                                            percent={Math.floor((downloadProgress?.percent || 0) * 100)}
                                        />
                                    </div>
                                    <div className={styles["download-info-wrapper"]}>
                                        <div>剩余时间 : {(downloadProgress?.time.remaining || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>耗时 : {(downloadProgress?.time.elapsed || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>下载速度 : {((downloadProgress?.speed || 0) / 1000000).toFixed(2)}M/s</div>
                                    </div>
                                    <div style={{marginTop: 24}}>
                                        <YakitButton size='max' type='outline2' onClick={onCancel}>
                                            取消
                                        </YakitButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Draggable>
            <YakitQuestionModal
                isTop={isTop}
                setIsTop={setIsTop}
                system={system}
                visible={qsShow}
                setVisible={setQSShow}
            />
        </>
    )
})

interface AgrAndQSModalProps {
    /** 窗口置顶 */
    isTop: 0 | 1 | 2
    setIsTop: (type: 0 | 1 | 2) => any
    system: YakitSystem
    visible: boolean
    setVisible: (flag: boolean) => any
}

/** @name Yakit-常见问题弹窗 */
const YakitQuestionModal: React.FC<AgrAndQSModalProps> = React.memo((props) => {
    const {isTop, setIsTop, system, visible, setVisible} = props

    const [show, setShow] = useState<boolean>(false)

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        const {clientWidth, clientHeight} = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return

        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y + 36,
            bottom: clientHeight - (targetRect.bottom - uiData.y)
        })
    })

    return (
        <Draggable
            defaultClassName={classNames(
                styles["draggable-modal"],
                {[styles["modal-top-wrapper"]]: isTop === 2},
                visible ? styles["qs-modal"] : styles["draggable-hidden-modal"]
            )}
            disabled={disabled}
            bounds={bounds}
            onStart={(event, uiData) => onStart(event, uiData)}
        >
            <div ref={draggleRef}>
                <div className={styles["yakit-agr-and-qs-modal"]} onClick={() => setIsTop(2)}>
                    <div className={styles["question-modal-wrapper"]}>
                        {system === "Darwin" ? (
                            <div
                                className={classNames(styles["modal-header"], styles["mac-header"])}
                                onMouseEnter={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseLeave={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(2)}
                            >
                                <div
                                    className={styles["close-wrapper"]}
                                    onMouseEnter={() => setShow(true)}
                                    onMouseLeave={() => setShow(false)}
                                    onClick={() => setVisible(false)}
                                >
                                    {show ? (
                                        <MacUIOpCloseSvgIcon />
                                    ) : (
                                        <div className={styles["close-btn"]}>
                                            <div className={styles["btn-icon"]}></div>
                                        </div>
                                    )}
                                </div>
                                <span>Yakit 软件官网下载链接</span>
                            </div>
                        ) : (
                            <div
                                className={classNames(styles["modal-header"], styles["win-header"])}
                                onMouseOver={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseOut={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(2)}
                            >
                                <span className={styles["header-title"]}>Yakit 软件官网下载链接</span>
                                <div className={styles["close-wrapper"]} onClick={() => setVisible(false)}>
                                    <WinUIOpCloseSvgIcon className={styles["icon-style"]} />
                                </div>
                            </div>
                        )}
                        <div className={styles["modal-body"]}>
                            <div className={styles["yakit-update-hint"]}>如遇网络问题无法下载，可到官网下载安装：</div>

                            <div className={styles["yakit-update-link"]}>
                                官网地址
                                <div className={styles["link-wrapper"]}>
                                    {WebsiteGV.OfficialWebsite}
                                    <CopyComponents
                                        className={styles["copy-icon"]}
                                        copyText={WebsiteGV.OfficialWebsite}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Draggable>
    )
})
