import React, {useEffect, useRef, useState} from "react"
import {Avatar, Timeline} from "antd"
import {FormOutlined, PlusOutlined} from "@ant-design/icons"
import {useGetState} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./HTTPFuzzerEditorMenu.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {DocumentDuplicateSvgIcon, DragSortIcon, SolidTerminalIcon, TerminalIcon, TrashIcon} from "@/assets/newIcon"
import {YakitSegmented} from "@/components/yakitUI/YakitSegmented/YakitSegmented"
import {AutoDecodeResult} from "@/utils/encodec"
import {callCopyToClipboard} from "@/utils/basic"
const {ipcRenderer} = window.require("electron")
export interface HTTPFuzzerClickEditorMenuProps {
    close: () => void
    insert: (v: LabelDataProps) => void
}

export interface LabelDataProps {
    title?: string
    sub_title?: string
}
export const HTTPFuzzerClickEditorMenu: React.FC<HTTPFuzzerClickEditorMenuProps> = (props) => {
    const {close, insert} = props
    const [labelData, setLabelData] = useState<LabelDataProps[]>([])
    const defaultLabel = useRef<LabelDataProps[]>([
        {
            sub_title: "{{md5(x(pass_top))}}"
        },
        {
            title: "4位验证码",
            sub_title: "{{int(0000-9999|4)}}"
        },
        {
            title: "6位验证码",
            sub_title: "{{int(000000-999999|6)}}"
        },
        {
            title: "用户名爆破",
            sub_title: "{{x(pass_top25)}}"
        },
        {
            title: "密码爆破",
            sub_title: "{{int(0000-9999|4)}}"
        },
        {
            title: "插入本地文件"
        },
        {
            title: "重复发包",
            sub_title: "{{repeat(3)}}"
        },
        {
            title: "随机生成字符串数",
            sub_title: "{{randstr(1,1010)}}"
        },
        {
            title: "整数标签",
            sub_title: "{{int(0,100)}}"
        },
        {
            title: "时间戳",
            sub_title: "{{timestamp(seconds)}}"
        },
        {
            title: "空字符",
            sub_title: "{{null(2}}"
        }
    ])
    useEffect(() => {
        setLabelData(defaultLabel.current)
    }, [])
    const addLabel = () => {
        console.log("addLabel")
    }
    const insertLabel = (item: LabelDataProps) => {
        insert(item)
    }
    const delLabel = () => {
        console.log("delLabel")
    }
    return (
        <div className={styles["http-fuzzer-click-editor-menu"]}>
            <div className={styles["menu-header"]}>
                <div className={styles["menu-header-left"]}>
                    常用标签
                    <span className={styles["menu-header-left-count"]}>{labelData.length || ""}</span>
                </div>
                <div className={styles["menu-header-opt"]}>
                    <YakitButton type='text' onClick={() => addLabel()}>
                        添加 <PlusOutlined className={styles["add-icon"]} />
                    </YakitButton>
                </div>
            </div>
            <div className={styles["menu-list"]}>
                {labelData.map((item, index) => (
                    <div
                        key={`${item?.sub_title}-${index}`}
                        className={styles["menu-list-item"]}
                        onClick={() => insertLabel(item)}
                    >
                        <div className={styles["menu-list-item-info"]}>
                            <DragSortIcon className={styles["drag-sort-icon"]} />
                            <div className={styles["title"]}>{item.title}</div>
                            <div
                                className={classNames(styles["sub-title"], {
                                    [styles["sub-title-left"]]: !!item.title
                                })}
                            >
                                {item.sub_title}
                            </div>
                        </div>
                        <div className={styles["menu-list-item-opt"]}>
                            <FormOutlined
                                className={styles["form-outlined"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                            />
                            <TrashIcon
                                className={styles["trash-icon"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    delLabel()
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
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
    // 是否允许替换
    isReplace?: boolean
    replace?: (v: string) => void
}

export const DecodeCopyReplace: React.FC<DecodeCopyReplaceProps> = (props) => {
    const {item, index, isShowBorder, isReplace=true, replace} = props
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
                    {isReplace && (
                        <YakitButton
                            size='small'
                            onClick={() => {
                                replace&&replace(itemStr)
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
    isShowTitle?: boolean
    rangeValue: string
    replace?: (v: string) => void
}

export const DecodeComponent: React.FC<DecodeComponentProps> = (props) => {
    const {isShowTitle, rangeValue, replace} = props
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
            {isShowTitle && <div className={styles["title"]}>智能解码</div>}
            {status === "only" && (
                <div className={styles["only-one"]}>
                    <DecodeCopyReplace item={result[0]} isShowBorder={true} replace={replace} />
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
    insert: (v: any) => void
    rangeValue: string
    replace?: (v: string) => void
}
export const HTTPFuzzerRangeEditorMenu: React.FC<HTTPFuzzerRangeEditorMenuProps> = (props) => {
    const {insert, rangeValue, replace} = props
    const [segmentedType, setSegmentedType] = useState<"decode" | "encode">("encode")
    return (
        <div className={styles["http-fuzzer-range-editor-menu"]}>
            <div className={styles["menu-header"]}>
                <YakitSegmented
                    className={styles["segmented-type"]}
                    value={segmentedType}
                    onChange={(v) => {
                        // @ts-ignore
                        setSegmentedType(v)
                    }}
                    options={[
                        {
                            label: "编码",
                            value: "encode"
                        },
                        {
                            label: "智能解码",
                            value: "decode"
                        }
                    ]}
                />
            </div>
            <div className={styles["menu-content"]}>
                {segmentedType === "encode" ? (
                    <EncodeComponent insert={insert} />
                ) : (
                    <DecodeComponent rangeValue={rangeValue} replace={replace} />
                )}
            </div>
        </div>
    )
}
