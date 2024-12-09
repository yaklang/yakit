import React, {useMemo, useRef, useState} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ChevronDownIcon, SwitchHorizontalIcon, ChevronUpIcon} from "@/assets/newIcon"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"

import classNames from "classnames"
import styles from "./MenuCodec.module.scss"

const {ipcRenderer} = window.require("electron")

interface MenuCodecProps {}

const CodeMenuInfo: YakitMenuItemProps[] = [
    {key: "base64", label: "Base64 编码"},
    {key: "htmlencode", label: "HTML 实体编码（强制）"},
    {key: "htmlencode-hex", label: "HTML 实体编码（强制十六进制模式）"},
    {key: "htmlescape", label: "HTML 实体编码（只编码特殊字符）"},
    {key: "urlencode", label: "URL 编码（强制）"},
    {key: "urlescape", label: "URL 编码（只编码特殊字符）"},
    {key: "urlescape-path", label: "URL 路径编码（只编码特殊字符）"},
    {key: "double-urlencode", label: "双重 URL 编码"},
    {key: "hex-encode", label: "十六进制编码"},
    {key: "json-unicode", label: "Unicode 中文编码"},
    {key: "MD5", label: "MD5 编码"},
    {key: "SM3", label: "SM3 编码"},
    {key: "SHA1", label: "SHA1 编码"},
    {key: "SHA-256", label: "SHA-256 编码"},
    {key: "SHA-512", label: "SHA-512 编码"}
]
const DecodeMenuInfo: YakitMenuItemProps[] = [
    {key: "base64-decode", label: "Base64 解码"},
    {key: "htmldecode", label: "HTML 解码"},
    {key: "urlunescape", label: "URL 解码"},
    {key: "urlunescape-path", label: "URL 路径解码"},
    {key: "double-urldecode", label: "双重 URL 解码"},
    {key: "hex-decode", label: "十六进制解码"},
    {key: "json-unicode-decode", label: "Unicode 中文解码"}
]

export const MenuCodec: React.FC<MenuCodecProps> = React.memo((props) => {
    const [avtiveKey, setActiveKey] = useState<string>("")

    const [codeShow, setCodeShow] = useState<boolean>(false)
    const codeMenu = useMemo(
        () => (
            <YakitMenu
                width={245}
                selectedKeys={[]}
                data={CodeMenuInfo}
                onClick={({key}) => {
                    setActiveKey("code")
                    onCodec(key)
                }}
            />
        ),
        []
    )
    const [decodeShow, setDecodeShow] = useState<boolean>(false)
    const decodeMenu = useMemo(
        () => (
            <YakitMenu
                width={142}
                selectedKeys={[]}
                data={DecodeMenuInfo}
                onClick={({key}) => {
                    setActiveKey("decode")
                    onCodec(key)
                }}
            />
        ),
        []
    )

    const [question, setQuestion] = useState<string>("")
    const [answer, setAnswer] = useState<string>("")

    const exchangeValue = useMemoizedFn(() => {
        let value = question
        setQuestion(answer)
        setAnswer(value)
    })

    const isExec = useRef<boolean>(false)
    const onCodec = useMemoizedFn((key: string) => {
        if (isExec.current) {
            yakitNotify("error", "请等待上次编解码执行完后再次尝试")
            return
        }
        if (!question) {
            yakitNotify("error", "请输入需要编解码的内容后再次尝试")
            return
        }
        if (!key) {
            yakitNotify("error", "BUG: 空的编解码类型")
            return
        }
        isExec.current = true
        if (key === "fuzztag") {
            setActiveKey("fuzztag")
            const newCodecParams = {
                Text: question,
                WorkFlow: [
                    {
                        CodecType: "Fuzz",
                        Params: [
                            {
                                "Key": "timeout",
                                "Value": "10"
                            },
                            {
                                "Key": "limit",
                                "Value": "10000"
                            }
                        ]
                    }
                ]
            }
            newCodec(newCodecParams)
        } else if (["SHA-256", "SHA-512"].includes(key)) {
            const newCodecParams = {
                Text: question,
                WorkFlow: [
                    {
                        CodecType: "SHA2",
                        Params: [{Key: "size", Value: key}]
                    }
                ]
            }
            newCodec(newCodecParams)
        } else if (["MD5", "SM3", "SHA1"].includes(key)) {
            const newCodecParams = {
                Text: question,
                WorkFlow: [
                    {
                        CodecType: key,
                        Params: []
                    }
                ]
            }
            newCodec(newCodecParams)
        } else {
            ipcRenderer
                .invoke("Codec", {Type: key, Text: question, Params: [], ScriptName: ""})
                .then((res) => {
                    setAnswer(res?.Result || "")
                })
                .catch((err) => {
                    yakitNotify("error", `${err}`)
                })
                .finally(() => (isExec.current = false))
        }
    })

    const newCodec = (params) => {
        ipcRenderer
            .invoke("NewCodec", params)
            .then((data: {Result: string; RawResult: Uint8Array}) => {
                setAnswer(data.Result || "")
            })
            .catch((e) => {
                yakitNotify("error", `${e}`)
            })
            .finally(() => (isExec.current = false))
    }

    return (
        <div className={styles["menu-codec-wrapper"]}>
            <div className={styles["func-btn-body"]}>
                <YakitPopover
                    overlayClassName={styles["codec-menu-popover"]}
                    overlayStyle={{paddingTop: 2}}
                    placement='bottomLeft'
                    content={decodeMenu}
                    visible={codeShow}
                    onVisibleChange={(visible) => setCodeShow(visible)}
                >
                    <YakitButton
                        type={avtiveKey === "decode" ? "primary" : "outline2"}
                        onClick={(e) => e.preventDefault()}
                    >
                        解码
                        {codeShow ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </YakitButton>
                </YakitPopover>
                <YakitPopover
                    overlayClassName={styles["codec-menu-popover"]}
                    overlayStyle={{paddingTop: 2}}
                    placement='bottomLeft'
                    content={codeMenu}
                    visible={decodeShow}
                    onVisibleChange={(visible) => setDecodeShow(visible)}
                >
                    <YakitButton
                        type={avtiveKey === "code" ? "primary" : "outline2"}
                        onClick={(e) => e.preventDefault()}
                    >
                        编码
                        {decodeShow ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </YakitButton>
                </YakitPopover>
                <YakitButton
                    size='small'
                    type={avtiveKey === "fuzztag" ? "primary" : "outline2"}
                    onClick={() => onCodec("fuzztag")}
                    style={{height: 24}}
                >
                    fuzztag
                </YakitButton>
            </div>

            <div className={styles["input-textarea-wrapper"]}>
                <YakitInput.TextArea
                    className={styles["input-textarea-body"]}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    isShowResize={false}
                />
                <div className={styles["input-textarea-copy"]}>
                    <CopyComponents
                        className={classNames(styles["copy-icon-style"], {[styles["copy-icon-ban"]]: !question})}
                        copyText={question}
                        iconColor={!!question ? "#85899e" : "#ccd2de"}
                    />
                </div>
            </div>

            <div className={styles["exchange-btn-wrapper"]}>
                <div className={styles["exchange-btn"]} onClick={exchangeValue}>
                    <SwitchHorizontalIcon />
                </div>
            </div>

            <div className={styles["input-textarea-wrapper"]}>
                <YakitInput.TextArea
                    className={styles["input-textarea-body"]}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    isShowResize={false}
                />
                <div className={styles["input-textarea-copy"]}>
                    <CopyComponents
                        className={classNames(styles["copy-icon-style"], {[styles["copy-icon-ban"]]: !answer})}
                        copyText={answer}
                        iconColor={!!answer ? "#85899e" : "#ccd2de"}
                    />
                </div>
            </div>
        </div>
    )
})
