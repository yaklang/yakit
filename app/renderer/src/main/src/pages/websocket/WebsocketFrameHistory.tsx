import React, {useEffect, useRef, useState} from "react"
import {useMemoizedFn, useThrottleFn, useVirtualList} from "ahooks"
import {genDefaultPagination, QueryGeneralResponse} from "@/pages/invoker/schema"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import HexEditor from "react-hex-editor"
import {Uint8ArrayToString} from "@/utils/str"
import {filterColorTag, isCellRedSingleColor, parseColorTag} from "@/components/TableVirtualResize/utils"
import {OutlineRefreshIcon} from "@/assets/icon/outline"
import {Tooltip} from "antd"

import classNames from "classnames"
import styles from "./WebsocketFrameHistory.module.scss"

const {ipcRenderer} = window.require("electron")

export interface WebsocketFrameHistoryProp {
    websocketHash: string
}

export interface WebsocketFlow {
    FrameIndex: number
    MessageType: string
    Data: Uint8Array
    DataSizeVerbose: string
    DataLength: number
    DataVerbose: string
    FromServer: boolean
    IsJson: boolean
    IsProtobuf: boolean
    cellClassName?: string
    Tags: string
}

export interface WebsocketFlowParams {
    WebsocketRequestHash: string
}

export const WebsocketFrameHistory: React.FC<WebsocketFrameHistoryProp> = (props) => {
    const {websocketHash} = props

    /** ---------- 表格数据+逻辑 Start ---------- */
    const initLoading = useRef<boolean>(false)
    const [loading, setLoading] = useState(false)
    const [response, setResponse] = useState<QueryGeneralResponse<WebsocketFlow>>({
        Pagination: genDefaultPagination(30, 1),
        Data: [],
        Total: 0
    })
    const hasMore = useRef<boolean>(true)

    const wrapperRef = useRef<HTMLDivElement>(null)
    const bodyRef = useRef<HTMLDivElement>(null)
    const [list, scrollTo] = useVirtualList(response.Data, {
        containerTarget: wrapperRef,
        wrapperTarget: bodyRef,
        itemHeight: 33,
        overscan: 5
    })

    const fetchList = useMemoizedFn((isInit?: boolean) => {
        if (!websocketHash) return
        if (loading) return

        if (isInit) {
            initLoading.current = true
        }

        setLoading(true)
        const pageNum = isInit ? 1 : Number(response.Pagination.Page) + 1
        ipcRenderer
            .invoke("QueryWebsocketFlowByHTTPFlowWebsocketHash", {
                WebsocketRequestHash: websocketHash,
                Pagination: {Page: pageNum, Limit: 20}
            })
            .then((r: QueryGeneralResponse<WebsocketFlow>) => {
                const newData = r.Data.map((item) => {
                    item.cellClassName = filterColorTag(item.Tags)
                    return item
                })
                const length = isInit ? newData.length : response.Data.length + newData.length
                hasMore.current = length < Number(r.Total)

                if (isInit) {
                    scrollTo(0)
                    setResponse({...r, Data: newData})
                } else {
                    setResponse((old) => ({...r, Data: old.Data.concat(newData)}))
                }
            })
            .finally(() =>
                setTimeout(() => {
                    initLoading.current = false
                    setLoading(false)
                }, 300)
            )
    })

    useEffect(() => {
        fetchList(true)
    }, [websocketHash])

    const handleScroll = useThrottleFn(
        () => {
            if (wrapperRef && wrapperRef.current && !loading && hasMore.current) {
                const cHeight = wrapperRef.current.getBoundingClientRect().height || 0
                const scrollHeight = wrapperRef.current.scrollHeight
                const scrollTop = wrapperRef.current.scrollTop
                const scrollToBottom = scrollHeight - cHeight - scrollTop
                if (scrollToBottom <= 80) {
                    fetchList()
                }
            }
        },
        {wait: 200}
    ).run
    /** ---------- 表格数据+逻辑 End ---------- */

    /** ---------- 数据帧详情 Start ---------- */
    const infoDetail = useRef<{content: string; hex: Uint8Array}>()
    const [showDetail, setShowDetail] = useState(false)
    const [activeTab, setActiveTab] = useState<"utf8" | "hex">("utf8")

    const handleOpenInfoDetail = useMemoizedFn((info: WebsocketFlow) => {
        if (showDetail) return
        infoDetail.current = {content: Uint8ArrayToString(info.Data), hex: info.Data}
        setActiveTab("utf8")
        setShowDetail(true)
    })
    const handleCancelInfoDetail = useMemoizedFn(() => {
        infoDetail.current = undefined
        setActiveTab("utf8")
        setShowDetail(false)
    })
    /** ---------- 数据帧详情 End ---------- */

    return (
        <YakitCard
            title={"Websocket 数据帧"}
            bodyStyle={{padding: 0}}
            extra={
                <Tooltip title='刷新' placement='top'>
                    <YakitButton
                        type='text2'
                        icon={<OutlineRefreshIcon />}
                        onClick={() => {
                            fetchList(true)
                        }}
                    />
                </Tooltip>
            }
        >
            <div className={styles["websocket-frame-history"]}>
                <div className={styles["table-header"]}>
                    <div style={{width: 50}} className={classNames(styles["header-cell"], styles["base-cell"])}>
                        序号
                    </div>
                    <div style={{width: 100}} className={classNames(styles["header-cell"], styles["base-cell"])}>
                        数据方向
                    </div>
                    <div style={{width: 97}} className={classNames(styles["header-cell"], styles["base-cell"])}>
                        Type
                    </div>
                    <div className={classNames(styles["header-cell"], styles["base-cell"], styles["flex-cell"])}>
                        预览
                    </div>
                    <div style={{width: 63}} className={classNames(styles["header-cell"], styles["base-cell"])}>
                        操作
                    </div>
                </div>

                <div className={styles["websocket-frame-history-table"]}>
                    <YakitSpin spinning={initLoading.current && loading}>
                        <div ref={wrapperRef} className={styles["table-body"]} onScroll={handleScroll}>
                            <div ref={bodyRef}>
                                {list.map((item) => {
                                    const {data} = item
                                    const {FrameIndex, FromServer, IsJson, IsProtobuf, DataVerbose, cellClassName} =
                                        data
                                    const colorClassName = parseColorTag(cellClassName)
                                    const onlyRed = isCellRedSingleColor(cellClassName)
                                    return (
                                        <div
                                            key={FrameIndex}
                                            className={classNames(styles["table-tr"], {
                                                [styles[`table-row-${colorClassName}`]]: !!colorClassName
                                            })}
                                        >
                                            <div
                                                style={{width: 50, color: onlyRed ? "#fff" : undefined}}
                                                className={classNames(styles["tr-cell"], styles["base-cell"])}
                                            >
                                                {FrameIndex}
                                            </div>
                                            <div
                                                style={{width: 100}}
                                                className={classNames(styles["tr-cell"], styles["base-cell"])}
                                            >
                                                {FromServer ? (
                                                    <YakitTag className={styles["cell-tag-style"]}>服务端响应</YakitTag>
                                                ) : (
                                                    <YakitTag className={styles["cell-tag-style"]}>客户端请求</YakitTag>
                                                )}
                                            </div>
                                            <div
                                                style={{width: 97}}
                                                className={classNames(styles["tr-cell"], styles["base-cell"])}
                                            >
                                                {IsJson && (
                                                    <YakitTag className={styles["cell-tag-style"]}>Json</YakitTag>
                                                )}
                                                {IsProtobuf && (
                                                    <YakitTag className={styles["cell-tag-style"]}>Protobuf</YakitTag>
                                                )}
                                            </div>
                                            <div
                                                className={classNames(
                                                    styles["tr-cell"],
                                                    styles["base-cell"],
                                                    styles["flex-cell"]
                                                )}
                                            >
                                                <span
                                                    style={{color: onlyRed ? "#fff" : undefined}}
                                                    className={classNames(
                                                        styles["cell-data-verbose"],
                                                        "yakit-content-single-ellipsis"
                                                    )}
                                                    title={DataVerbose}
                                                >
                                                    {DataVerbose}
                                                </span>
                                            </div>
                                            <div
                                                style={{width: 63}}
                                                className={classNames(styles["tr-cell"], styles["base-cell"])}
                                            >
                                                <YakitButton
                                                    type='text'
                                                    size='small'
                                                    onClick={() => {
                                                        handleOpenInfoDetail(data)
                                                    }}
                                                >
                                                    详情
                                                </YakitButton>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {!initLoading.current && loading && (
                                <div className={styles["table-footer-loading"]}>
                                    <YakitSpin wrapperClassName={styles["loading-style"]} spinning={true} tip='' />
                                </div>
                            )}
                            {!loading && !hasMore.current && (
                                <div className={styles["table-footer-empty"]}>暂无数据</div>
                            )}
                        </div>
                    </YakitSpin>
                </div>
            </div>

            <YakitModal
                type='white'
                title='数据帧详情'
                centered={true}
                width={"60%"}
                footer={null}
                visible={showDetail}
                onCancel={handleCancelInfoDetail}
            >
                <div className={styles["websocket-detail-modal"]}>
                    <div>
                        <YakitRadioButtons
                            buttonStyle='solid'
                            value={activeTab}
                            options={[
                                {value: "utf8", label: "UTF8"},
                                {value: "hex", label: "HEX"}
                            ]}
                            onChange={(e) => setActiveTab(e.target.value)}
                        />
                    </div>
                    <div className={styles["editor-body"]}>
                        {activeTab === "utf8" ? (
                            <YakitEditor readOnly={true} type='plaintext' value={infoDetail.current?.content || ""} />
                        ) : (
                            <HexEditor
                                readOnly={true}
                                asciiWidth={18}
                                data={infoDetail.current?.hex}
                                overscanCount={0x03}
                                showAscii={true}
                                showColumnLabels={true}
                                showRowLabels={true}
                                highlightColumn={true}
                            />
                        )}
                    </div>
                </div>
            </YakitModal>
        </YakitCard>
    )
}
