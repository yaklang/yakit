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
    {key: "json-unicode", label: "Unicode 中文编码"}
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
    const [codeShow, setCodeShow] = useState<boolean>(false)
    const codeMenu = useMemo(
        () => <YakitMenu width={245} selectedKeys={[]} data={CodeMenuInfo} onClick={({key}) => onCodec(key)} />,
        []
    )
    const [decodeShow, setDecodeShow] = useState<boolean>(false)
    const decodeMenu = useMemo(
        () => <YakitMenu width={142} selectedKeys={[]} data={DecodeMenuInfo} onClick={({key}) => onCodec(key)} />,
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
        ipcRenderer
            .invoke("Codec", {Type: key, Text: question, Params: [], ScriptName: ""})
            .then((res) => {
                setAnswer(res?.Result || "")
            })
            .catch((err) => {
                yakitNotify("error", `CODEC 解码失败：${err}`)
            })
            .finally(() => (isExec.current = false))
    })

    return (
        <div className={styles["menu-codec-wrapper"]}>
            <div className={styles["func-btn-body"]}>
                <YakitPopover
                    overlayClassName={styles["codec-menu-popover"]}
                    overlayStyle={{paddingTop: 2}}
                    placement='bottomLeft'
                    trigger={"click"}
                    content={decodeMenu}
                    visible={codeShow}
                    onVisibleChange={(visible) => setCodeShow(visible)}
                >
                    <YakitButton type='primary' onClick={(e) => e.preventDefault()}>
                        解码
                        {codeShow ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </YakitButton>
                </YakitPopover>
                <YakitPopover
                    overlayClassName={styles["codec-menu-popover"]}
                    overlayStyle={{paddingTop: 2}}
                    placement='bottomLeft'
                    trigger={"click"}
                    content={codeMenu}
                    visible={decodeShow}
                    onVisibleChange={(visible) => setDecodeShow(visible)}
                >
                    <YakitButton type='outline2' onClick={(e) => e.preventDefault()}>
                        编码
                        {decodeShow ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </YakitButton>
                </YakitPopover>
            </div>

            <div className={styles["input-textarea-wrapper"]}>
                <YakitInput.TextArea
                    className={styles["input-textarea-body"]}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                />
                <div className={styles["input-textarea-copy"]}>
                    <CopyComponents className={styles["copy-icon-style"]} copyText={question} iconColor='#85899e' />
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
                />
                <div className={styles["input-textarea-copy"]}>
                    <CopyComponents className={styles["copy-icon-style"]} copyText={answer} iconColor='#85899e' />
                </div>
            </div>
        </div>
    )
})
