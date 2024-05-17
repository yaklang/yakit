import React, {useEffect, useMemo, useRef, useState} from "react"
import {Avatar, Space, Timeline} from "antd"
import {PlusOutlined} from "@ant-design/icons"
import styles from "./HTTPFuzzerEditorMenu.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    ChevronDownIcon,
    ChevronUpIcon,
    DocumentDuplicateSvgIcon,
    DragSortIcon,
    IconSolidCodeIcon,
    IconSolidSparklesIcon,
    IconSolidTagIcon,
    IconOutlinePencilAltIcon,
    TrashIcon
} from "@/assets/newIcon"
import {DragDropContext, Droppable, Draggable, DraggingStyle} from "@hello-pangea/dnd"
import {AutoDecodeResult} from "@/utils/encodec"
import {callCopyToClipboard} from "@/utils/basic"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {QueryFuzzerLabelResponseProps} from "./StringFuzzer"
import {setRemoteValue} from "@/utils/kv"
import {useMemoizedFn, useThrottleFn} from "ahooks"
import { SolidTerminalIcon } from "@/assets/icon/solid"
const {ipcRenderer} = window.require("electron")

export interface CountDirectionProps {
    x?: string
    y?: string
}

export interface EditorDetailInfoProps {
    direction: CountDirectionProps
    top: number
    bottom: number
    left: number
    right: number
    focusX: number
    focusY: number
    lineHeight: number
    scrollTop: number
}

const directionStyle = (editorInfo, isCenter = true) => {
    const {direction, top = 0, left = 0, bottom = 0, right = 0} = editorInfo || {}
    let obj: any = {}
    if (direction) {
        if (direction.x === "middle" && isCenter) {
            obj.transform = "translate(-38%, 0px)"
        }
        if (direction.x === "right") {
            obj.right = 0
        }
        if (direction.y === "bottom") {
            obj.bottom = "32px"
        }
    }
    return obj
}

// 拖拽左右限制
const getItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    // console.log("transform---",transform,isDragging);
    if (isDragging) {
        // 使用正则表达式匹配 translate 函数中的两个参数
        const match = transform.match(/translate\((-?\d+)px, (-?\d+)px\)/)
        if (match) {
            // 提取匹配到的两个值，并将它们转换为数字
            const [value1, value2] = match.slice(1).map(Number)
                const modifiedString = transform.replace(
                    /translate\((-?\d+)px, (-?\d+)px\)/,
                    `translate(0px, ${value2}px)`
                )
                transform = modifiedString
        }
    }

    return {
        ...draggableStyle,
        transform
    }
}

export interface HTTPFuzzerClickEditorMenuProps {
    close: () => void
    editorInfo?: EditorDetailInfoProps
    insert: (v: QueryFuzzerLabelResponseProps) => void
    addLabel: () => void
    className?: string
    // 是否开启关闭倒计时
    fizzSelectTimeoutId?: any
    closeTimeout?: boolean
}

export interface LabelDataProps {
    DefaultDescription: string
    Description?: string
    Label?: string
}

// 注：此处顺序为倒序（新增DefaultDescription记得带-fixed，此处为标识固定项）
export const defaultLabel: LabelDataProps[] = [
    {
        DefaultDescription: "反向正则（单个）-fixed",
        Description: "反向正则（单个）",
        Label: "{{regen:one([0-9a-f]{3})}}"
    },
    {
        DefaultDescription: "反向正则（全部）-fixed",
        Description: "反向正则（全部）",
        Label: "{{regen([0-9a-f]{3})}}"
    },
    {
        DefaultDescription: "时间戳（秒）-fixed",
        Description: "时间戳（秒）",
        Label: "{{timestamp(seconds)}}"
    },
    {
        DefaultDescription: "验证码-fixed",
        Description: "验证码",
        Label: "{{int(0000-9999)}}"
    },
    {
        DefaultDescription: "随机数-fixed",
        Description: "随机数",
        Label: "{{randint(0,10)}}"
    },
    {
        DefaultDescription: "随机字符串-fixed",
        Description: "随机字符串",
        Label: "{{randstr}}"
    },
    {
        DefaultDescription: "整数范围-fixed",
        Description: "整数范围",
        Label: "{{int(1-10)}}"
    },
    {
        DefaultDescription: "插入Payload-fixed",
        Description: "插入Payload"
    },
    {
        DefaultDescription: "插入临时字典-fixed",
        Description: "插入临时字典"
    },
    {
        DefaultDescription: "插入文件-fixed",
        Description: "插入文件"
    },
]

export const FUZZER_LABEL_LIST_NUMBER = "fuzzer-label-list-number"

export const HTTPFuzzerClickEditorMenu: React.FC<HTTPFuzzerClickEditorMenuProps> = (props) => {
    const {close, editorInfo, insert, addLabel, fizzSelectTimeoutId, closeTimeout = true} = props

    const {direction, top = 0, left = 0, bottom = 0, right = 0, scrollTop = 0} = editorInfo || {}
    const [labelData, setLabelData] = useState<QueryFuzzerLabelResponseProps[]>([])
    const [selectLabel, setSelectLabel] = useState<string>()
    const [inputValue, setInputValue] = useState<string>()
    const [isEnterSimple, setEnterSimple] = useState<boolean>(false)
    const [destinationDrag, setDestinationDrag] = useState<string>("droppable-editor")
    // 是否中文输入中
    const isComposition = useRef<boolean>(false)
    // 是否在拖拽中
    const isDragging = useRef<boolean>(false)
    // 鼠标是否进入main
    const isMainEnter = useRef<boolean>(false)
    // 鼠标是否进入simple
    const isSimpleEnter = useRef<boolean>(false)
    // 菜单显示宽度
    const [menuWidth, setMenuWidth] = useState<number>()
    // 菜单显示高度
    const [menuHeight, setMenuHeight] = useState<number>()

    const getData = () => {
        ipcRenderer.invoke("QueryFuzzerLabel").then((data: {Data: QueryFuzzerLabelResponseProps[]}) => {
            const {Data} = data
            if (Array.isArray(Data) && Data.length > 0) {
                setLabelData(Data)
                setSelectLabel(undefined)
            }
        })
    }

    const [boxHidden, setBoxHidden] = useState<boolean>(true)
    // 0.8秒后显示
    useEffect(() => {
        setTimeout(() => {
            setBoxHidden(false)
        }, 800)
    }, [])
    // 5秒无操作自动关闭
    const closeTimeoutFun = useMemoizedFn(() => {
        const closeTimeoutId = setTimeout(() => {
            close()
        }, 5 * 1000)
        // 返回timeoutId，以便稍后取消
        return closeTimeoutId
    })
    useEffect(() => {
        if (closeTimeout && fizzSelectTimeoutId) {
            if (isMainEnter.current || isSimpleEnter.current) {
                fizzSelectTimeoutId.current && clearTimeout(fizzSelectTimeoutId.current)
            } else {
                fizzSelectTimeoutId.current = undefined
                fizzSelectTimeoutId.current = closeTimeoutFun()
            }
        }
    }, [isMainEnter.current, isSimpleEnter.current])

    useEffect(() => {
        if (right - left < 720) {
            let width: number = Math.floor((right - left) / 2)
            setMenuWidth(width)
        }
        if (bottom - top < 700) {
            let height: number = Math.floor((bottom - top) / 2 - 30)
            setMenuHeight(height)
        }
        getData()
    }, [])

    const insertLabel = (item: QueryFuzzerLabelResponseProps) => {
        if (isSelect(item)) {
            // 复原修改项
            setSelectLabel(undefined)
        } else {
            insert(item)
        }
    }
    const delLabel = (Hash: string) => {
        ipcRenderer.invoke("DeleteFuzzerLabel", {Hash}).then(() => {
            getData()
        })
    }
    const reset = () => {
        // 删除标签后重新添加默认标签
        ipcRenderer.invoke("DeleteFuzzerLabel", {}).then(() => {
            setRemoteValue(FUZZER_LABEL_LIST_NUMBER, JSON.stringify({number: defaultLabel.length}))
            ipcRenderer
                .invoke("SaveFuzzerLabel", {
                    Data: defaultLabel
                })
                .then(() => {
                    getData()
                })
        })
    }
    const isSelect = (item: QueryFuzzerLabelResponseProps) => selectLabel === item.Hash

    const dragList = (newItems) => {
        // 重新排序
        ipcRenderer.invoke("DeleteFuzzerLabel", {}).then(() => {
            setRemoteValue(FUZZER_LABEL_LIST_NUMBER, JSON.stringify({number: newItems.length}))
            ipcRenderer.invoke("SaveFuzzerLabel", {
                Data: newItems
            })
        })
    }

    // 拖放完成后的回调函数
    const onDragEnd = (result) => {
        isDragging.current = false
        if (!result.destination) return

        const newItems = Array.from(labelData)
        const [reorderedItem] = newItems.splice(result.source.index, 1)
        newItems.splice(result.destination.index, 0, reorderedItem)

        setLabelData(newItems)
        dragList([...newItems].reverse())
    }

    /**
     * @description: 计算移动的范围是否在目标范围类destinationDrag
     */
    const onDragUpdate = useThrottleFn(
        (result) => {
            if (!result.destination) {
                setDestinationDrag("")
                return
            }
            if (result.destination.droppableId !== destinationDrag) setDestinationDrag(result.destination.droppableId)
        },
        {wait: 200}
    ).run
    return (
        <div
            className={classNames(styles["http-fuzzer-click-editor"], {
                [styles["box-hidden"]]: boxHidden
            })}
            onMouseLeave={() => {
                isMainEnter.current = false
                setTimeout(() => {
                    if (!isSimpleEnter.current && !isDragging.current && !isComposition.current) {
                        setEnterSimple(false)
                    }
                }, 100)
            }}
        >
            <div className={classNames(styles["http-fuzzer-click-editor-simple"], props.className || "")}>
                <div
                    className={styles["show-box"]}
                    onMouseEnter={() => {
                        isMainEnter.current = true
                        setEnterSimple(true)
                    }}
                >
                    <IconSolidTagIcon className={styles["tag"]} />
                    <div className={styles["content"]}>插入标签</div>
                    {isEnterSimple ? (
                        <ChevronUpIcon className={styles["up"]} />
                    ) : (
                        <ChevronDownIcon className={styles["down"]} />
                    )}
                </div>
            </div>
            {isEnterSimple && (
                <div
                    className={classNames(styles["http-fuzzer-click-editor-menu"])}
                    // 此处会引起拖拽卡死
                    onMouseLeave={() => {
                        isSimpleEnter.current = false
                        setTimeout(() => {
                            if (!isDragging.current && !isMainEnter.current && !isComposition.current)
                                setEnterSimple(false)
                        }, 100)
                    }}
                    onMouseEnter={() => {
                        isSimpleEnter.current = true
                    }}
                    onCompositionStart={() => {
                        isComposition.current = true
                    }}
                    onCompositionEnd={() => {
                        isComposition.current = false
                    }}
                    style={{
                        ...directionStyle(editorInfo, false),
                        maxHeight: menuHeight ? menuHeight : 350,
                        width: menuWidth ? menuWidth : 360
                    }}
                >
                    <div className={styles["menu-header"]}>
                        <div className={styles["menu-header-left"]}>
                            常用标签
                            {!(menuWidth && menuWidth < 220) && (
                                <span className={styles["menu-header-left-count"]}>{labelData.length || ""}</span>
                            )}
                        </div>
                        <div className={styles["menu-header-opt"]}>
                            <YakitButton
                                style={{paddingLeft: 2, paddingRight: 2}}
                                type='text'
                                onClick={() => addLabel()}
                            >
                                添加 <PlusOutlined />
                            </YakitButton>
                            <div className={styles["line"]}></div>
                            <YakitButton type='text2' style={{color: "#85899E"}} onClick={() => reset()}>
                                复原
                            </YakitButton>
                        </div>
                    </div>

                    <div className={styles["menu-list"]}>
                        <DragDropContext
                            onDragEnd={onDragEnd}
                            onDragUpdate={onDragUpdate}
                            onBeforeDragStart={() => {
                                isDragging.current = true
                            }}
                        >
                            <Droppable droppableId='droppable-editor'>
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef}>
                                        {labelData.map((item, index) => (
                                            <Draggable key={item?.Description} draggableId={`${item.Id}`} index={index}>
                                                {(provided, snapshot) => {
                                                    const draggablePropsStyle= provided.draggableProps.style as DraggingStyle

                                                    return (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            style={{
                                                                ...draggablePropsStyle,
                                                                ...getItemStyle(snapshot.isDragging, provided.draggableProps.style),
                                                                top: isDragging.current && draggablePropsStyle?.top
                                                                    ? draggablePropsStyle.top -
                                                                      top +
                                                                      scrollTop
                                                                    : "none",
                                                                left: isDragging.current && draggablePropsStyle?.left
                                                                    ? draggablePropsStyle.left - left - 60
                                                                    : "none"
                                                            }}
                                                        >
                                                            <div
                                                                className={classNames(styles["menu-list-item"], {
                                                                    [styles["menu-list-item-drag"]]: snapshot.isDragging
                                                                })}
                                                                onClick={() => insertLabel(item)}
                                                            >
                                                                <div
                                                                    className={styles["menu-list-item-info"]}
                                                                    style={{
                                                                        overflow:"hidden",
                                                                        maxWidth: menuWidth ? menuWidth - 30 : 260
                                                                    }}
                                                                >
                                                                    <DragSortIcon
                                                                        className={styles["drag-sort-icon"]}
                                                                    />
                                                                    {isSelect(item) ? (
                                                                        <YakitInput
                                                                            defaultValue={item.Description}
                                                                            className={styles["input"]}
                                                                            size='small'
                                                                            onChange={(e) => {
                                                                                setInputValue(e.target.value)
                                                                            }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <>
                                                                            <div className={styles["title"]}>
                                                                                {item.Description}
                                                                            </div>
                                                                            {(!menuWidth || menuWidth > 250) && (
                                                                                <div
                                                                                    className={classNames(
                                                                                        styles["sub-title"],
                                                                                        {
                                                                                            [styles["sub-title-left"]]:
                                                                                                !!item.Description
                                                                                        }
                                                                                    )}
                                                                                >
                                                                                    {item.Label}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className={styles["menu-list-item-opt"]}>
                                                                    {isSelect(item) ? (
                                                                        <YakitButton
                                                                            type='text'
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                if (inputValue) {
                                                                                    ipcRenderer
                                                                                        .invoke("SaveFuzzerLabel", {
                                                                                            Data: [
                                                                                                {
                                                                                                    ...item,
                                                                                                    Description:
                                                                                                        inputValue
                                                                                                }
                                                                                            ]
                                                                                        })
                                                                                        .then(() => {
                                                                                            getData()
                                                                                        })
                                                                                }
                                                                            }}
                                                                        >
                                                                            确认
                                                                        </YakitButton>
                                                                    ) : (
                                                                        <>
                                                                        {!item.DefaultDescription.endsWith("-fixed")&&<>
                                                                        <IconOutlinePencilAltIcon
                                                                                className={classNames(
                                                                                    styles["form-outlined"]
                                                                                )}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    setSelectLabel(item.Hash)
                                                                                    setInputValue(item.Description)
                                                                                }}
                                                                            />
                                                                            <TrashIcon
                                                                                className={classNames(
                                                                                    styles["trash-icon"]
                                                                                )}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    delLabel(item.Hash)
                                                                                }}
                                                                            />
                                                                        </>}
                                                                            
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                    // snapshot.isDragging 是否拖拽此项
                                                }}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                </div>
            )}
        </div>
    )
}

export interface EncodeComponentProps {
    insert: (v: any) => void
}
interface decodeDataProps {
    color: string
    avatar: string
    title: string
    sub_title: string
    encode: (v: string) => string
}
export const EncodeComponent: React.FC<EncodeComponentProps> = (props) => {
    const {insert} = props
    const decodeData = useRef<decodeDataProps[]>([
        {
            color: "rgba(136, 99, 247, 0.6)",
            avatar: "m",
            title: "Md5 编码",
            sub_title: "md5",
            encode: (v: string) => `{{md5(${v})}}`
        },
        {
            color: "rgba(74, 148, 248, 0.6)",
            avatar: "b",
            title: "Base64 编码",
            sub_title: "base64enc",
            encode: (v: string) => `{{base64enc(${v})}}`
        },
        {
            color: "rgba(74, 148, 248, 0.6)",
            avatar: "b",
            title: "先 Base64 后 URL 编码",
            sub_title: "{{urlenc(base64enc(xxx))}}",
            encode: (v: string) => `{{urlenc(base64enc(${v}))}}`
        },
        {
            color: "rgba(86, 201, 145, 0.6)",
            avatar: "h",
            title: "HEX 编码（十六进制编码）",
            sub_title: "hexenc",
            encode: (v: string) => `{{hexenc(${v})}}`
        },
        {
            color: "rgba(244, 115, 107, 0.6)",
            avatar: "h",
            title: "HTML 编码",
            sub_title: "htmlenc",
            encode: (v: string) => `{{htmlenc(${v})}}`
        },
        {
            color: "rgba(255, 182, 96, 0.6)",
            avatar: "u",
            title: "URL 编码",
            sub_title: "urlenc",
            encode: (v: string) => `{{urlenc(${v})}}`
        },
        {
            color: "rgba(218, 95, 221, 0.6)",
            avatar: "u",
            title: "URL 编码（只编码特殊字符）",
            sub_title: "urlescape",
            encode: (v: string) => `{{urlescape(${v})}}`
        }
    ])
    return (
        <div className={styles["encode-box"]}>
            {decodeData.current.map((item) => {
                return (
                    <div key={item.title} className={styles["encode-item"]} onClick={() => insert(item.encode)}>
                        <Avatar size={16} style={{color: "rgba(49, 52, 63, 1)", backgroundColor: item.color}}>
                            {item.avatar}
                        </Avatar>
                        <div className={styles["title"]}>{item.title}</div>
                        <div className={styles["sub-title"]}>{item.sub_title}</div>
                    </div>
                )
            })}
        </div>
    )
}

interface DecodeCopyReplaceProps {
    item: AutoDecodeResult
    // 是否显示边框
    isShowBorder: boolean
    index?: number
    // 是否仅可读
    isReadOnly?: boolean
    replace?: (v: string) => void
}

export const DecodeCopyReplace: React.FC<DecodeCopyReplaceProps> = (props) => {
    const {item, index, isShowBorder, isReadOnly, replace} = props
    const itemStr: string = new Buffer(item.Result).toString("utf8")
    return (
        <div className={styles["decode-copy-replace"]}>
            <div
                className={classNames(styles["header"], {
                    [styles["header-solid"]]: isShowBorder
                })}
            >
                <div className={styles["header-info"]}>
                    {!isShowBorder && <div className={styles["title"]}>Step [{index}]</div>}
                    <div className={styles["sub-title"]}>{item.TypeVerbose}</div>
                </div>
                <div className={styles["header-opt"]}>
                    <div
                        className={styles["yakit-copy"]}
                        onClick={() => {
                            callCopyToClipboard(itemStr)
                        }}
                    >
                        <DocumentDuplicateSvgIcon className={styles["document-duplicate-svg-icon"]} />
                    </div>
                    {!isReadOnly && (
                        <YakitButton
                            size='small'
                            onClick={() => {
                                replace && replace(itemStr)
                            }}
                        >
                            替换
                        </YakitButton>
                    )}
                </div>
            </div>
            <div
                className={classNames(styles["content"], {
                    [styles["content-solid"]]: isShowBorder
                })}
            >
                {itemStr}
            </div>
        </div>
    )
}

export interface DecodeComponentProps {
    isReadOnly?: boolean
    rangeValue: string
    replace?: (v: string) => void
}

export const DecodeComponent: React.FC<DecodeComponentProps> = (props) => {
    const {isReadOnly, rangeValue, replace} = props
    const [status, setStatus] = useState<"none" | "only" | "many">()
    const [result, setResult] = useState<AutoDecodeResult[]>([])
    useEffect(() => {
        try {
            if (!rangeValue) {
                setStatus("none")
                return
            }
            ipcRenderer.invoke("AutoDecode", {Data: rangeValue}).then((e: {Results: AutoDecodeResult[]}) => {
                // console.log("Results", e.Results)
                const {Results} = e
                let successArr: AutoDecodeResult[] = []
                let failArr: AutoDecodeResult[] = []
                Results.map((item) => {
                    if (item.Type === "No") {
                        failArr.push(item)
                    } else {
                        successArr.push(item)
                    }
                })
                setResult(successArr)
                if (successArr.length === 0) {
                    setStatus("none")
                } else if (successArr.length === 1) {
                    setStatus("only")
                } else {
                    setStatus("many")
                }
            })
        } catch (e) {
            failed("editor exec auto-decode failed")
        }
    }, [])

    return (
        <div className={styles["decode-box"]}>
            {isReadOnly && <div className={styles["title"]}>智能解码</div>}
            {status === "only" && (
                <div className={styles["only-one"]}>
                    <DecodeCopyReplace isReadOnly={isReadOnly} item={result[0]} isShowBorder={true} replace={replace} />
                </div>
            )}
            {status === "many" && (
                <div className={styles["timeline-box"]}>
                    <Timeline>
                        {result.map((item, index) => {
                            return (
                                <Timeline.Item
                                    className={styles["timeline-item"]}
                                    dot={<SolidTerminalIcon className={styles["solid-terminal-icon"]} />}
                                >
                                    <DecodeCopyReplace
                                        item={item}
                                        index={index + 1}
                                        isShowBorder={false}
                                        replace={replace}
                                        isReadOnly={isReadOnly}
                                    />
                                </Timeline.Item>
                            )
                        })}
                    </Timeline>
                </div>
            )}
            {status === "none" && <div className={styles["none-decode"]}>无解码信息</div>}
        </div>
    )
}

export interface HTTPFuzzerRangeEditorMenuProps {
    close: () => void
    editorInfo?: EditorDetailInfoProps
    insert: (v: any) => void
    rangeValue: string
    replace?: (v: string) => void
    hTTPFuzzerClickEditorMenuProps?: HTTPFuzzerClickEditorMenuProps
    fizzRangeTimeoutId?: any
}
export const HTTPFuzzerRangeEditorMenu: React.FC<HTTPFuzzerRangeEditorMenuProps> = (props) => {
    const {close, editorInfo, insert, rangeValue, replace, hTTPFuzzerClickEditorMenuProps, fizzRangeTimeoutId} = props
    const {direction, top = 0, left = 0, bottom = 0, right = 0} = editorInfo || {}
    // 菜单显示宽度
    const [menuWidth, setMenuWidth] = useState<number>()
    // 菜单显示高度
    const [menuHeight, setMenuHeight] = useState<number>()
    useEffect(() => {
        if (right - left < 720) {
            let width: number = Math.floor((right - left) / 2)
            setMenuWidth(width)
        }
        if (bottom - top < 720) {
            let height: number = Math.floor((bottom - top) / 2 - 30)
            setMenuHeight(height)
        }
    }, [])
    const [segmentedType, setSegmentedType] = useState<"decode" | "encode">()
    // 鼠标是否进入main
    const isMainEnter = useRef<boolean>(false)
    // 鼠标是否进入simple
    const isSimpleEnter = useRef<boolean>(false)

    const [boxHidden, setBoxHidden] = useState<boolean>(true)
    // 0.8秒后显示
    useEffect(() => {
        fizzRangeTimeoutId.current = undefined
        fizzRangeTimeoutId.current = closeTimeoutFun()
        setTimeout(() => {
            setBoxHidden(false)
        }, 800)
    }, [])
    // 5秒无操作自动关闭
    const closeTimeoutFun = useMemoizedFn(() => {
        const closeTimeoutId = setTimeout(() => {
            close()
        }, 5 * 1000)
        // 返回timeoutId，以便稍后取消
        return closeTimeoutId
    })

    return (
        <div
            className={classNames(styles["http-fuzzer-range-editor-body"], {
                [styles["box-hidden"]]: boxHidden
            })}
            onMouseEnter={() => {
                fizzRangeTimeoutId.current && clearTimeout(fizzRangeTimeoutId.current)
            }}
            onMouseLeave={() => {
                fizzRangeTimeoutId.current = undefined
                fizzRangeTimeoutId.current = closeTimeoutFun()
            }}
        >
            {hTTPFuzzerClickEditorMenuProps && (
                <HTTPFuzzerClickEditorMenu
                    className={styles["range-click-editor-menu"]}
                    closeTimeout={false}
                    {...hTTPFuzzerClickEditorMenuProps}
                />
            )}

            <div className={styles["http-fuzzer-range-editor"]}>
                <div className={styles["http-fuzzer-range-editor-simple"]}>
                    <div className={styles["show-box"]}>
                        <div className={styles["line"]}></div>
                        <div
                            className={styles["encode-box"]}
                            onMouseEnter={() => {
                                isMainEnter.current = true
                                setSegmentedType("encode")
                            }}
                            onMouseLeave={() => {
                                isMainEnter.current = false
                                setTimeout(() => {
                                    if (!isSimpleEnter.current) {
                                        setSegmentedType(undefined)
                                    }
                                }, 100)
                            }}
                        >
                            <IconSolidCodeIcon className={styles["tag"]} />
                            <div className={styles["content"]}>编码</div>
                            {segmentedType === "encode" ? (
                                <ChevronUpIcon className={styles["up"]} />
                            ) : (
                                <ChevronDownIcon className={styles["down"]} />
                            )}
                        </div>
                        <div className={styles["line"]}></div>
                        <div
                            className={styles["decode-box"]}
                            onClick={() => {
                                setSegmentedType("decode")
                            }}
                        >
                            <IconSolidSparklesIcon className={styles[""]} />
                            <div className={styles["content"]}>解码</div>
                        </div>
                    </div>
                </div>
                {segmentedType && (
                    <div
                        style={{
                            ...directionStyle(editorInfo),
                            maxHeight: menuHeight ? menuHeight : 360,
                            width: menuWidth ? menuWidth : 360
                        }}
                        className={classNames(styles["http-fuzzer-range-editor-menu"])}
                        onMouseLeave={() => {
                            isSimpleEnter.current = false
                            setTimeout(() => {
                                if (!isMainEnter.current) setSegmentedType(undefined)
                            }, 100)
                        }}
                        onMouseEnter={() => {
                            isSimpleEnter.current = true
                        }}
                    >
                        <div className={styles["menu-content"]}>
                            {segmentedType === "encode" ? (
                                <EncodeComponent insert={insert} />
                            ) : (
                                <DecodeComponent rangeValue={rangeValue} replace={replace} />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

interface HTTPFuzzerRangeReadOnlyEditorMenuProps {
    editorInfo?: EditorDetailInfoProps
    rangeValue: string
    fizzRangeTimeoutId?: any
    close: () => void
}

export const HTTPFuzzerRangeReadOnlyEditorMenu: React.FC<HTTPFuzzerRangeReadOnlyEditorMenuProps> = (props) => {
    const {editorInfo, rangeValue, fizzRangeTimeoutId, close} = props
    const [segmentedType, setSegmentedType] = useState<"decode">()
    const {direction, top = 0, left = 0, bottom = 0, right = 0} = editorInfo || {}
    // 菜单显示宽度
    const [menuWidth, setMenuWidth] = useState<number>()
    // 菜单显示高度
    const [menuHeight, setMenuHeight] = useState<number>()

    const [boxHidden, setBoxHidden] = useState<boolean>(true)
    // 0.8秒后显示
    useEffect(() => {
        fizzRangeTimeoutId.current = undefined
        fizzRangeTimeoutId.current = closeTimeoutFun()
        setTimeout(() => {
            setBoxHidden(false)
        }, 800)
    }, [])
    // 5秒无操作自动关闭
    const closeTimeoutFun = useMemoizedFn(() => {
        const closeTimeoutId = setTimeout(() => {
            close()
        }, 5 * 1000)
        // 返回timeoutId，以便稍后取消
        return closeTimeoutId
    })

    useEffect(() => {
        if (right - left < 720) {
            let width: number = Math.floor((right - left) / 2)
            setMenuWidth(width)
        }
        if (bottom - top < 500) {
            let height: number = Math.floor((bottom - top) / 2 - 30)
            setMenuHeight(height)
        }
    }, [])
    return (
        <div
            className={classNames(styles["http-fuzzer-read-editor"], {
                [styles["box-hidden"]]: boxHidden
            })}
            onMouseEnter={() => {
                fizzRangeTimeoutId.current && clearTimeout(fizzRangeTimeoutId.current)
            }}
            onMouseLeave={() => {
                fizzRangeTimeoutId.current = undefined
                fizzRangeTimeoutId.current = closeTimeoutFun()
            }}
        >
            <div className={styles["http-fuzzer-read-editor-simple"]}>
                <div className={styles["show-box"]}>
                    <div className={styles["decode-box"]} onClick={() => setSegmentedType("decode")}>
                        <IconSolidSparklesIcon className={styles[""]} />
                        <div className={styles["content"]}>解码</div>
                    </div>
                </div>
            </div>
            {segmentedType && (
                <div
                    style={{
                        ...directionStyle(editorInfo),
                        maxHeight: menuHeight ? menuHeight : 250,
                        width: menuWidth ? menuWidth : 360
                    }}
                    className={classNames(styles["http-fuzzer-range-read-only-editor-menu"])}
                    onMouseLeave={() => setSegmentedType(undefined)}
                >
                    <DecodeComponent rangeValue={rangeValue} isReadOnly={true} />
                </div>
            )}
        </div>
    )
}
