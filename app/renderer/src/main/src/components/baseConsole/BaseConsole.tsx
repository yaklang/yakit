import React, {ReactNode, useEffect, useRef, useState} from "react"
import {useDebounce, useGetState, useMemoizedFn} from "ahooks"
import Draggable from "react-draggable"
import {useSize} from "ahooks"
import type {DraggableEvent, DraggableData} from "react-draggable"
import classnames from "classnames"
import {
    YakitConsoleShrinkSvgIcon,
    YakitConsoleLeftSvgIcon,
    YakitConsoleRightSvgIcon,
    YakitConsoleBottomSvgIcon,
    YakitConsoleDotsSvgIcon
} from "../layout/icons"
import {Space} from "antd"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {Resizable} from "re-resizable"
import styles from "./baseConsole.module.scss"
import {CloseOutlined} from "@ant-design/icons"
import {ExecResult} from "@/pages/invoker/schema"
import {failed, info} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {writeXTerm, xtermFit} from "@/utils/xtermUtils"
import {Uint8ArrayToString} from "@/utils/str"
import {XTerm} from "xterm-for-react"
import ReactResizeDetector from "react-resize-detector"
import {useStore} from "../baseConsole/StoreConsole"

const {ipcRenderer} = window.require("electron")

export interface EngineConsoleProp {}
export const EngineConsole: React.FC<EngineConsoleProp> = (props) => {
    const xtermRef = useRef<any>(null)
    // 缓存Console日志信息
    const {consoleLog, setConsoleInfo,isFirst,setIsFirst} = useStore()
    useEffect(()=>{
        if(consoleLog.length>0){
            writeXTerm(xtermRef,consoleLog)
        }
    },[])
    useEffect(() => {
        if (!xtermRef) {
            return
        }
        if(consoleLog.length>0){
            writeXTerm(xtermRef,consoleLog)
        }
        const token = randomString(40)
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {
            try {
                setConsoleInfo(consoleLog+Uint8ArrayToString(data.Raw) + "\r\n")
                writeXTerm(xtermRef, Uint8ArrayToString(data.Raw) + "\r\n")
            } catch (e) {
                console.info(e)
            }
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[AttachCombinedOutput] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[AttachCombinedOutput] finished")
        })

        ipcRenderer.invoke("AttachCombinedOutput", {}, token).then(() => {
            if(isFirst) {
                info(`启动输出监控成功`)
                setIsFirst(false)
            }
        })

        return () => {
            ipcRenderer.invoke("cancel-AttachCombinedOutput", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [xtermRef])

    return (
        <div className={styles["engine-console"]}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) return

                    const row = Math.floor(height / 18.5)
                    const col = Math.floor(width / 10)
                    if (xtermRef) xtermFit(xtermRef, col, row)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <XTerm
                ref={xtermRef}
                options={{
                    convertEol: true,
                    theme: {
                        foreground: "#536870",
                        background: "#E8E9E8",
                        cursor: "#536870",

                        black: "#002831",
                        brightBlack: "#001e27",

                        red: "#d11c24",
                        brightRed: "#bd3613",

                        green: "#738a05",
                        brightGreen: "#475b62",

                        yellow: "#a57706",
                        brightYellow: "#536870",

                        blue: "#2176c7",
                        brightBlue: "#708284",

                        magenta: "#c61c6f",
                        brightMagenta: "#5956ba",

                        cyan: "#259286",
                        brightCyan: "#819090",

                        white: "#eae3cb",
                        brightWhite: "#fcf4dc"
                    }
                }}
            />
        </div>
    )
}

export interface RightIconMenuProps {
    callBackSource?: (v: OperationProps) => void
}
export const RightIconMenu: React.FC<RightIconMenuProps> = (props) => {
    const {callBackSource} = props
    const [show, setShow] = useState<boolean>(false)
    const menu = (
        <RightIconBox
            activeSource={"shrink"}
            callBackSource={(v: OperationProps) => {
                setShow(false)
                callBackSource && callBackSource(v)
            }}
        />
    )
    return (
        <YakitPopover
            overlayClassName={classnames(styles["right-icon-menu"])}
            title={<span>停靠方位</span>}
            placement={"bottom"}
            content={menu}
            trigger='hover'
            visible={show}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <YakitConsoleDotsSvgIcon className={styles["right-dots-icon"]} />
        </YakitPopover>
    )
}
export type OperationProps = "shrink" | "left" | "bottom" | "right"
export interface RightIconBoxProps {
    activeSource: OperationProps
    callBackSource?: (v: OperationProps) => void
}
export const RightIconBox: React.FC<RightIconBoxProps> = (props) => {
    const {activeSource, callBackSource} = props
    const clickType = (v: OperationProps) => {
        if (v !== activeSource) {
            callBackSource && callBackSource(v)
        }
    }
    return (
        <div className={styles["right-icon-box"]}>
            <Space>
                <span
                    onClick={() => {
                        clickType("shrink")
                    }}
                >
                    <YakitConsoleShrinkSvgIcon
                        className={classnames(styles["item-icon"], {
                            [styles["item-icon-active"]]: activeSource === "shrink"
                        })}
                    />
                </span>
                <span
                    onClick={() => {
                        clickType("left")
                    }}
                >
                    <YakitConsoleLeftSvgIcon
                        className={classnames(styles["item-icon"], {
                            [styles["item-icon-active"]]: activeSource === "left"
                        })}
                    />
                </span>
                <span
                    onClick={() => {
                        clickType("bottom")
                    }}
                >
                    <YakitConsoleBottomSvgIcon
                        className={classnames(styles["item-icon"], {
                            [styles["item-icon-active"]]: activeSource === "bottom"
                        })}
                    />
                </span>
                <span
                    onClick={() => {
                        clickType("right")
                    }}
                >
                    <YakitConsoleRightSvgIcon
                        className={classnames(styles["item-icon"], {
                            [styles["item-icon-active"]]: activeSource === "right"
                        })}
                    />
                </span>
            </Space>
        </div>
    )
}

export interface BaseConsoleTitleProps {
    setIsShowBaseConsole: (v: boolean) => void
    callBackSource: (v: OperationProps) => void
    direction: "left" | "bottom" | "right"
}

export const BaseConsoleTitle: React.FC<BaseConsoleTitleProps> = (props) => {
    const {setIsShowBaseConsole, callBackSource, direction} = props
    const {setConsoleInfo,setIsFirst} = useStore()
    return (
        <div className={styles["base-console-title"]}>
            <div className={styles["title"]}>引擎 Console</div>
            <div className={styles["operation"]}>
                <RightIconBox activeSource={direction} callBackSource={callBackSource} />
                <CloseOutlined
                    className={styles["close"]}
                    onClick={() => {
                        setConsoleInfo("")
                        setIsFirst(true)
                        setIsShowBaseConsole(false)
                    }}
                />
            </div>
        </div>
    )
}

export interface BaseConsoleProps {
    directionBaseConsole: "left" | "bottom" | "right"
    setIsShowBaseConsole: (v: boolean) => void
}

export const BaseConsole: React.FC<BaseConsoleProps> = (props) => {
    const {setIsShowBaseConsole, directionBaseConsole} = props
    const [direction, setDirection] = useState<"left" | "bottom" | "right">(directionBaseConsole)
    const callBackSource = (v: OperationProps) => {
        if (v === "shrink") {
            setIsShowBaseConsole(false)
            ipcRenderer.invoke("shrink-console-log", {open: true})
        } else {
            setDirection(v)
        }
    }
    const commonComponent = () => (
        <div className={styles["base-console-box"]}>
            <BaseConsoleTitle
                direction={direction}
                setIsShowBaseConsole={setIsShowBaseConsole}
                callBackSource={callBackSource}
            />
            <div className={styles["console-content"]}>
                <EngineConsole />
            </div>
        </div>
    )
    return (
        <div>
            {direction === "bottom" && (
                <Resizable
                    style={{position: "absolute", bottom: 0, zIndex: 1001}}
                    defaultSize={{width: "100%", height: 400}}
                    minWidth={"100%"}
                    minHeight={176}
                    maxHeight={"66vh"}
                >
                    {commonComponent()}
                </Resizable>
            )}
            {direction === "right" && (
                <Resizable
                    style={{position: "absolute", right: 0, top: 0, zIndex: 1001}}
                    defaultSize={{width: 400, height: "100%"}}
                    minWidth={280}
                    minHeight={"100%"}
                    maxWidth={"95vw"}
                >
                    {commonComponent()}
                </Resizable>
            )}
            {direction === "left" && (
                <Resizable
                    style={{position: "absolute", left: 0, top: 0, zIndex: 1001}}
                    defaultSize={{width: 400, height: "100%"}}
                    minWidth={280}
                    minHeight={"100%"}
                    maxWidth={"95vw"}
                >
                    {commonComponent()}
                </Resizable>
            )}
        </div>
    )
}

export interface BaseConsoleMiniProps {
    visible: boolean
    setVisible: (v: boolean) => any
}

export const BaseMiniConsole: React.FC<BaseConsoleMiniProps> = (props) => {
    const {visible, setVisible} = props
    const {setConsoleInfo,setIsFirst} = useStore()
    const draggleRef = useRef<HTMLDivElement>(null)
    const size = useSize(draggleRef)
    const [disabled, setDisabled] = useState(false)
    const [bounds, setBounds, getBounds] = useGetState({left: 0, top: 0, bottom: 0, right: 0})
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
    const onResizeStart = (e) => {
        // console.log("onResizeStart执行")
        // console.log(e)
    }
    const onResize = (e, direction, ref, d) => {
        // console.log("onResize执行")
        // console.log(direction, d)
        // if (direction === "left") {
        // }
        // else if(direction === "top"){
        // }
    }
    const onResizeStop = (e, direction, ref, d) => {
        // console.log("onResizeStop执行")
        // console.log(e, direction, ref, d)
    }

    const callBackSource = (v: OperationProps) => {
        setVisible(false)
        ipcRenderer.invoke("direction-console-log", {direction: v})
    }

    return (
        <Draggable
            defaultClassName={classnames(
                styles["yaklang-console-modal"],
                visible ? styles["engine-console-modal-wrapper"] : styles["engine-console-modal-hidden-wrapper"]
            )}
            disabled={disabled}
            bounds={bounds}
            onStart={(event, uiData) => onStart(event, uiData)}
            // onDrag={(event, uiData)=>{
            //     console.log("uiData",uiData.x,uiData.y)
            // }}
        >
            <div ref={draggleRef}>
                <Resizable
                    defaultSize={{width: 400, height: 400}}
                    // onResize={onResize}
                    // onResizeStart={(e) => onResizeStart(e)}
                    // onResizeStop={onResizeStop}
                    minWidth={256}
                    minHeight={176}
                    bounds={"window"}
                    enable={{ top:false, right:true, bottom:true, left:false, topRight:false, bottomRight:true, bottomLeft:false, topLeft:false }}
                >
                    <div className={styles["modal-yaklang-engine-console"]}>
                        <div className={styles["yaklang-engine-console-wrapper"]}>
                            <div
                                className={styles["console-draggle-header"]}
                                onMouseEnter={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseLeave={() => setDisabled(true)}
                            >
                                <div className={styles["header-box"]}>
                                    <div className={styles["header-left"]}>
                                        <div
                                            className={styles["dot"]}
                                            onClick={() => {
                                                setConsoleInfo("")
                                                setIsFirst(true)
                                                setVisible(false)
                                            }}
                                        ></div>
                                    </div>
                                    <div className={styles["header-center"]}>引擎 Console</div>
                                    <div className={styles["header-right"]}>
                                        {size && size.width > 400 && (
                                            <RightIconBox activeSource={"shrink"} callBackSource={callBackSource} />
                                        )}
                                        {size && size.width <= 400 && <RightIconMenu callBackSource={callBackSource} />}
                                    </div>
                                </div>
                            </div>
                            <div className={styles["console-draggle-body"]}>
                                {visible&&<EngineConsole />}
                            </div>
                        </div>
                    </div>
                </Resizable>
            </div>
        </Draggable>
    )
}
