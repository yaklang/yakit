import React, {memo, useEffect, useRef, useState} from "react"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {UISettingSvgIcon} from "@/components/layout/icons"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {PageNodeItemProps, usePageInfo, WebsocketFuzzerPageInfoProps} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {useInViewport, useMemoizedFn, useThrottleFn, useVirtualList} from "ahooks"
import {YakitRoute} from "@/enums/yakitRoute"
import {defaultWebsocketFuzzerPageInfo} from "@/defaultConstants/WebsocketFuzzer"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {randomString} from "@/utils/randomUtil"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {Form} from "antd"
import {yakitNotify} from "@/utils/notification"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {OneLine} from "@/utils/inputUtil"
import classNames from "classnames"
import {useHotkeys} from "react-hotkeys-hook"
import styles from "./WebsocketFuzzer.module.scss"
const {ipcRenderer} = window.require("electron")

interface WebsocketFuzzerProp {
    pageId: string
}
export const WebsocketFuzzer: React.FC<WebsocketFuzzerProp> = (props) => {
    const {pageId} = props
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.WebsocketFuzzer, pageId)
        if (currentItem && currentItem.pageParamsInfo.websocketFuzzerPageInfo) {
            return currentItem.pageParamsInfo.websocketFuzzerPageInfo
        }
        return {...defaultWebsocketFuzzerPageInfo}
    })
    const [pageInfo, setPageInfo] = useState<WebsocketFuzzerPageInfoProps>(initPageInfo())
    const [wsFlowList, setWsFlowList] = useState<WebsocketFlowFromFuzzer[]>([])
    const [loading, setLoading] = useState<boolean>(false)

    return (
        <div className={styles["websocketFuzzer"]}>
            <YakitResizeBox
                isVer={false}
                lineDirection='left'
                firstNode={
                    <WebsocketClientOperator
                        tls={pageInfo.wsTls}
                        request={pageInfo.wsRequest}
                        toServer={pageInfo.wsToServer}
                        onSetWsFlowList={setWsFlowList}
                        onSetLoading={setLoading}
                    />
                }
                firstRatio='30%'
                firstMinSize='450px'
                firstNodeStyle={{padding: 0}}
                secondNode={<WebsocketFlowViewer wsFlowList={wsFlowList} loading={loading} />}
                secondRatio='70%'
                secondMinSize='850px'
            ></YakitResizeBox>
        </div>
    )
}

interface WebsocketFlowFromFuzzer {
    SwitchProtocolSucceeded: boolean
    IsDataFrame: boolean
    FromServer: boolean
    GuessEncode: string[]
    StatusVerbose: string
    ReasonVerbose: string

    DataLength: number
    Data: Uint8Array

    IsJson: boolean
    IsProtobuf: boolean
    DataFrameIndex: number
    DataSizeVerbose: string
    DataVerbose: string

    IsUpgradeResponse: boolean
    UpgradeResponse: Uint8Array
}

interface WebsocketClientOperatorProp {
    tls?: boolean
    request?: Uint8Array
    toServer?: Uint8Array
    onSetWsFlowList: (flow: WebsocketFlowFromFuzzer[]) => void
    onSetLoading: (l: boolean) => void
}
const WebsocketClientOperator: React.FC<WebsocketClientOperatorProp> = memo((props) => {
    const {tls = false, request = new Uint8Array(), toServer = new Uint8Array(), onSetWsFlowList, onSetLoading} = props
    const [mode, setMode] = useState<"request" | "response">("request")
    const [executing, setExecuting] = useState<boolean>(false)
    const [wsTls, setWsTls] = useState(tls)
    const [wsRequest, setWsRequest] = useState<Uint8Array>(request)
    const [wsToServer, setWsToServer] = useState<string>(Uint8ArrayToString(toServer))
    const [form] = Form.useForm()
    const [timeoutSeconds, setTimeoutSeconds] = useState<number>(3600)
    const [proxy, setProxy] = useState<string>("")
    const [token, setToken] = useState<string>(randomString(30))
    const [ursp, setUrsp] = useState<string>("")
    const flowsRef = useRef<WebsocketFlowFromFuzzer[]>([])

    useEffect(() => {
        let hasNewData = false
        const updateWsFlowList = () => {
            if (hasNewData && flowsRef.current.length) {
                onSetWsFlowList([...flowsRef.current])
                hasNewData = false
                onSetLoading(false)
            }
        }
        const timer = setInterval(updateWsFlowList, 300)
        ipcRenderer.on(`${token}-data`, async (e, data: WebsocketFlowFromFuzzer) => {
            if (data.IsUpgradeResponse) {
                setUrsp(Uint8ArrayToString(data.UpgradeResponse))
                setMode("response")
            }

            if (data.DataLength > 0) {
                flowsRef.current.unshift(data)
                hasNewData = true
            }
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            onSetWsFlowList([...flowsRef.current])
            onSetLoading(false)
            setToken(randomString(30))
            setExecuting(false)
            setMode("request")
            yakitNotify("info", "[CreateWebsocketFuzzer] finished")
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            onSetLoading(false)
            if (`${error}`.includes(`Cancelled on client`)) {
                return
            }
            yakitNotify("error", `[CreateWebsocketFuzzer] error:  ${error}`)
        })
        return () => {
            ipcRenderer.invoke("cancel-CreateWebsocketFuzzer", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
            clearInterval(timer)
        }
    }, [token])

    const handleConnect = useMemoizedFn(() => {
        // 重置
        flowsRef.current = []
        onSetWsFlowList([])
        setUrsp("")
        ipcRenderer
            .invoke(
                "CreateWebsocketFuzzer",
                {
                    IsTLS: wsTls,
                    UpgradeRequest: wsRequest,
                    ToServer: StringToUint8Array(wsToServer),
                    Proxy: proxy,
                    TotalTimeoutSeconds: timeoutSeconds
                },
                token
            )
            .then(() => {
                onSetLoading(true)
                setExecuting(true)
            })
    })

    const handleDisConnect = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-CreateWebsocketFuzzer", token)
    })

    const handleSendToServer = useMemoizedFn(() => {
        ipcRenderer.invoke(
            "CreateWebsocketFuzzer",
            {
                ToServer: StringToUint8Array(wsToServer)
            },
            token
        ).then(() => {
            setWsToServer("")
        })
    })

    return (
        <YakitResizeBox
            isVer={true}
            lineDirection='bottom'
            firstNode={
                <YakitCard
                    className={styles["websocketClientOperator-card"]}
                    headStyle={{
                        background: "#fff",
                        height: 32,
                        minHeight: 32,
                        boxSizing: "content-box",
                        borderBottom: "1px solid var(--yakit-border-color)",
                        paddingLeft: 0
                    }}
                    bodyStyle={{padding: 0, width: "100%", height: "calc(100% - 32px)"}}
                    title={
                        <div className={styles["websocketClientOperator-card-title"]}>
                            <YakitRadioButtons
                                size='small'
                                buttonStyle='solid'
                                value={mode}
                                options={[
                                    {value: "request", label: "请求"},
                                    {value: "response", label: "响应"}
                                ]}
                                onChange={(e) => setMode(e.target.value)}
                            />
                            {executing && !!ursp ? (
                                <YakitTag color='green'>已建立连接</YakitTag>
                            ) : (
                                <YakitTag color='yellow'>连接未建立</YakitTag>
                            )}
                        </div>
                    }
                    extra={
                        <div className={styles["websocketClientOperator-card-extra"]}>
                            <YakitPopover
                                title='设置额外参数'
                                trigger={["click"]}
                                content={
                                    <>
                                        <Form form={form} layout='vertical' initialValues={{proxy, timeoutSeconds}}>
                                            <Form.Item label='设置代理' name='proxy'>
                                                <YakitAutoComplete
                                                    options={[
                                                        {
                                                            label: "http://127.0.0.1:7890",
                                                            value: "http://127.0.0.1:7890"
                                                        },
                                                        {
                                                            label: "socks5://127.0.0.1:7890",
                                                            value: "socks5://127.0.0.1:7890"
                                                        },
                                                        {
                                                            label: "http://127.0.0.1:8085",
                                                            value: "http://127.0.0.1:8085"
                                                        },
                                                        {
                                                            label: "http://127.0.0.1:7891",
                                                            value: "http://127.0.0.1:7891"
                                                        },
                                                        {
                                                            label: "http://127.0.0.1:8083",
                                                            value: "http://127.0.0.1:8083"
                                                        },
                                                        {
                                                            label: "http://127.0.0.1:8080",
                                                            value: "http://127.0.0.1:8080"
                                                        },
                                                        {
                                                            label: "http://127.0.0.1:8081",
                                                            value: "http://127.0.0.1:8081"
                                                        }
                                                    ]}
                                                ></YakitAutoComplete>
                                            </Form.Item>
                                            <Form.Item label='设置超时(s)' name='timeoutSeconds'>
                                                <YakitInputNumber type='horizontal' size='small' min={10} />
                                            </Form.Item>
                                        </Form>
                                    </>
                                }
                                onVisibleChange={(v) => {
                                    if (!v) {
                                        form.validateFields().then((values) => {
                                            setTimeoutSeconds(values.timeoutSeconds)
                                            setProxy(values.proxy)
                                        })
                                    }
                                }}
                            >
                                <UISettingSvgIcon className={styles["UISettingSvgIcon"]} />
                            </YakitPopover>
                            <YakitCheckbox
                                checked={wsTls}
                                onChange={(e) => {
                                    setWsTls(e.target.checked)
                                }}
                            >
                                TLS
                            </YakitCheckbox>
                            {executing ? (
                                <YakitPopconfirm title='确定要关闭 Websocket 连接吗？' onConfirm={handleDisConnect}>
                                    <YakitButton type='primary' size='small' colors='danger'>
                                        断开
                                    </YakitButton>
                                </YakitPopconfirm>
                            ) : (
                                <YakitButton type='primary' size='small' onClick={handleConnect}>
                                    连接
                                </YakitButton>
                            )}
                        </div>
                    }
                >
                    <div className={styles["websocketClientOperator-card-body"]}>
                        <div style={{display: mode === "request" ? "block" : "none", height: "100%"}}>
                            <YakitEditor
                                type='http'
                                value={Uint8ArrayToString(wsRequest)}
                                setValue={(value) => {
                                    setWsRequest(StringToUint8Array(value, "utf8"))
                                }}
                                noMiniMap={true}
                                noLineNumber={true}
                            />
                        </div>
                        <div style={{display: mode === "response" ? "block" : "none", height: "100%"}}>
                            <YakitSpin spinning={!ursp} tip='正在构建 Websocket 连接'>
                                <YakitEditor
                                    type='http'
                                    value={ursp}
                                    readOnly={true}
                                    noMiniMap={true}
                                    noLineNumber={true}
                                />
                            </YakitSpin>
                        </div>
                    </div>
                </YakitCard>
            }
            firstRatio='50%'
            firstMinSize='400px'
            firstNodeStyle={{padding: 0}}
            secondNode={
                <YakitCard
                    className={styles["websocketClientOperator-card"]}
                    headStyle={{
                        background: "#fff",
                        height: 32,
                        minHeight: 32,
                        boxSizing: "content-box",
                        borderBottom: "1px solid var(--yakit-border-color)",
                        paddingLeft: 0
                    }}
                    bodyStyle={{padding: 0, width: "100%", height: "calc(100% - 32px)"}}
                    title={
                        <div className={styles["websocketClientOperator-card-title"]}>
                            <span className={styles["websocketClientOperator-card-title-text"]}>发送数据</span>
                        </div>
                    }
                    extra={
                        <div className={styles["websocketClientOperator-card-extra"]}>
                            <YakitButton
                                disabled={!(executing && !!ursp)}
                                type='primary'
                                size='small'
                                onClick={handleSendToServer}
                            >
                                发送到服务器
                            </YakitButton>
                        </div>
                    }
                >
                    <div className={styles["websocketClientOperator-card-body"]}>
                        <YakitEditor type='html' value={wsToServer} setValue={setWsToServer} lineNumbersMinChars={3} />
                    </div>
                </YakitCard>
            }
            secondRatio='50%'
            secondMinSize='400px'
        ></YakitResizeBox>
    )
})

interface WebsocketFlowViewerProp {
    wsFlowList: WebsocketFlowFromFuzzer[]
    loading: boolean
}
const WebsocketFlowViewer: React.FC<WebsocketFlowViewerProp> = memo((props) => {
    const {wsFlowList, loading} = props
    const [currSelected, setCurrSelected] = useState<WebsocketFlowFromFuzzer>()
    const containerRef = useRef<HTMLDivElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [list] = useVirtualList(wsFlowList, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 28,
        overscan: 10
    })
    const [inViewport] = useInViewport(containerRef)

    useEffect(() => {
        if (!wsFlowList.length) {
            setCurrSelected(undefined)
        }
    }, [wsFlowList])

    useHotkeys(
        "up",
        () => {
            if (!currSelected) {
                setCurrSelected(wsFlowList[0])
                return
            }
            let index
            for (let i = 0; i < wsFlowList.length; i++) {
                if (wsFlowList[i]["DataFrameIndex"] === currSelected["DataFrameIndex"]) {
                    if (i === 0) {
                        index = i
                        break
                    } else {
                        index = i - 1
                        break
                    }
                }
            }
            if (index >= 0) {
                setCurrSelected(wsFlowList[index])
                smoothToIndex(index)
            }
        },
        {enabled: inViewport && !!wsFlowList.length},
        [wsFlowList, currSelected]
    )
    useHotkeys(
        "down",
        () => {
            if (!currSelected) {
                setCurrSelected(wsFlowList[0])
                return
            }
            let index
            for (let i = 0; i < wsFlowList.length; i++) {
                if (wsFlowList[i]["DataFrameIndex"] === currSelected["DataFrameIndex"]) {
                    if (i === wsFlowList.length - 1) {
                        index = i
                        break
                    } else {
                        index = i + 1
                        break
                    }
                }
            }

            if (index) {
                setCurrSelected(wsFlowList[index])
                smoothToIndex(index)
            }
        },
        {enabled: inViewport && !!wsFlowList.length},
        [wsFlowList, currSelected]
    )

    const smoothToIndex = useThrottleFn(
        (index: number) => {
            const selectedElement = document.getElementById("websocketFlow-" + wsFlowList[index].DataFrameIndex)
            if (selectedElement && containerRef.current) {
                const containerTop = containerRef.current.scrollTop
                const containerHeight = containerRef.current.clientHeight
                const containerBottom = containerTop + containerHeight
                const elementTop = selectedElement.offsetTop
                const elementBottom = elementTop + selectedElement.offsetHeight

                // 滚动选中项到完全可见的位置
                if (elementBottom > containerBottom) {
                    containerRef.current.scrollTo({
                        top: elementBottom - containerHeight, // 确保选中的行完全显示在底部
                        behavior: "smooth"
                    })
                } else if (elementTop < containerTop) {
                    containerRef.current.scrollTo({
                        top: elementTop, // 如果在顶部外，滚动到顶部
                        behavior: "smooth"
                    })
                }
            }
        },
        {wait: 100}
    ).run

    return (
        <YakitResizeBox
            isVer={true}
            lineDirection='bottom'
            firstNode={
                <YakitCard
                    className={styles["websocketClientOperator-card"]}
                    headStyle={{
                        background: "#fff",
                        height: 32,
                        minHeight: 32,
                        boxSizing: "content-box",
                        borderBottom: "1px solid var(--yakit-border-color)"
                    }}
                    bodyStyle={{padding: 0, width: "100%", height: "calc(100% - 32px)"}}
                    title={
                        <div className={styles["websocketClientOperator-card-title"]}>
                            <span className={styles["websocketClientOperator-card-title-text"]}>
                                Websocket 数据帧实时预览
                            </span>
                        </div>
                    }
                >
                    <div className={styles["websocketClientOperator-card-body"]}>
                        <YakitSpin spinning={loading}>
                            {!!wsFlowList.length ? (
                                <div ref={containerRef} className={styles["websocketFlow-list-container"]}>
                                    <div ref={wrapperRef} className={styles["websocketFlow-list-wrapper"]}>
                                        {list.map((item) => (
                                            <div
                                                id={"websocketFlow-" + item.data.DataFrameIndex}
                                                className={classNames(styles["websocketFlow-list-item"], {
                                                    [styles["websocketFlow-list-item-active"]]:
                                                        currSelected?.DataFrameIndex === item.data.DataFrameIndex
                                                })}
                                                key={item.data.DataFrameIndex}
                                                onClick={() => setCurrSelected(item.data)}
                                            >
                                                {item.data.DataFrameIndex}
                                                <YakitTag color='blue'>{item.data.DataSizeVerbose}</YakitTag>
                                                {item.data.FromServer ? (
                                                    <YakitTag color='purple'>服务器响应</YakitTag>
                                                ) : (
                                                    <YakitTag color='green'>客户端请求</YakitTag>
                                                )}
                                                {item.data.IsJson && <YakitTag color='bluePurple'>JSON</YakitTag>}
                                                {item.data.IsProtobuf && <YakitTag color='danger'>Protobuf</YakitTag>}
                                                <OneLine overflow={"hidden"}>{item.data.DataVerbose}</OneLine>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <YakitEmpty className={styles["webSocket-fuzzer-empty"]} />
                            )}
                        </YakitSpin>
                    </div>
                </YakitCard>
            }
            firstRatio='50%'
            firstMinSize='400px'
            firstNodeStyle={{padding: 0}}
            secondNode={
                currSelected ? (
                    <YakitCard
                        className={styles["websocketClientOperator-card"]}
                        headStyle={{
                            background: "#fff",
                            height: 32,
                            minHeight: 32,
                            boxSizing: "content-box",
                            borderBottom: "1px solid var(--yakit-border-color)"
                        }}
                        bodyStyle={{padding: 0, width: "100%", height: "calc(100% - 32px)"}}
                        title={
                            <div className={styles["websocketClientOperator-card-title"]}>
                                <span className={styles["websocketClientOperator-card-title-text"]}>数据帧详情</span>
                                {currSelected.FromServer ? (
                                    <YakitTag color='yellow'>服务器响应</YakitTag>
                                ) : (
                                    <YakitTag color='green'>客户端请求</YakitTag>
                                )}
                                <YakitTag color='info'>index: {currSelected.DataFrameIndex}</YakitTag>
                                <YakitTag color='info'>数据大小: {currSelected.DataSizeVerbose}</YakitTag>
                            </div>
                        }
                        extra={
                            <div className={styles["websocketClientOperator-card-extra"]}>
                                <CopyComponents copyText={Uint8ArrayToString(currSelected?.Data)} />
                            </div>
                        }
                    >
                        <div className={styles["websocketClientOperator-card-body"]}>
                            <YakitEditor
                                type={currSelected.IsJson || currSelected.IsProtobuf ? "json" : "html"}
                                value={Uint8ArrayToString(currSelected.Data)}
                                readOnly={true}
                                noMiniMap={true}
                            />
                        </div>
                    </YakitCard>
                ) : (
                    <YakitEmpty
                        title='选择 Websocket Data Frame 以查看详情'
                        className={styles["webSocket-fuzzer-empty"]}
                    />
                )
            }
            secondRatio='50%'
            secondMinSize='400px'
        ></YakitResizeBox>
    )
})

export const newWebsocketFuzzerTab = (
    isHttps: boolean,
    request: Uint8Array,
    openFlag?: boolean,
    toServer?: Uint8Array
) => {
    return ipcRenderer
        .invoke("send-to-tab", {
            type: "websocket-fuzzer",
            data: {tls: isHttps, request: request, openFlag, toServer}
        })
        .then(() => {
            openFlag === false && yakitNotify("info", "发送成功")
        })
}
