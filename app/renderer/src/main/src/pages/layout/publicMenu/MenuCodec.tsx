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
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")

interface MenuCodecProps {}

export const MenuCodec: React.FC<MenuCodecProps> = React.memo((props) => {
    const {t, i18n} = useI18nNamespaces(["layout"])
    const [avtiveKey, setActiveKey] = useState<string>("")

    const [codeShow, setCodeShow] = useState<boolean>(false)

    const codeMenuInfo = useMemo<YakitMenuItemProps[]>(() => {
        return [
            {key: "base64", label: t("Layout.MenuCodec.base64")},
            {key: "htmlencode", label: t("Layout.MenuCodec.htmlencode")},
            {key: "htmlencode-hex", label: t("Layout.MenuCodec.htmlencodeHex")},
            {key: "htmlescape", label: t("Layout.MenuCodec.htmlescape")},
            {key: "urlencode", label: t("Layout.MenuCodec.urlencode")},
            {key: "urlescape", label: t("Layout.MenuCodec.urlescape")},
            {key: "urlescape-path", label: t("Layout.MenuCodec.urlescapePath")},
            {key: "double-urlencode", label: t("Layout.MenuCodec.doubleUrlencode")},
            {key: "hex-encode", label: t("Layout.MenuCodec.hexEncode")},
            {key: "json-unicode", label: t("Layout.MenuCodec.jsonUnicode")},
            {key: "MD5", label: t("Layout.MenuCodec.MD5")},
            {key: "SM3", label: t("Layout.MenuCodec.SM3")},
            {key: "SHA1", label: t("Layout.MenuCodec.SHA1")},
            {key: "SHA-256", label: t("Layout.MenuCodec.SHA256")},
            {key: "SHA-512", label: t("Layout.MenuCodec.SHA512")}
        ]
    }, [i18n.language])

    const codeMenu = useMemo(
        () => (
            <YakitMenu
                width={245}
                selectedKeys={[]}
                data={codeMenuInfo}
                onClick={({key}) => {
                    setActiveKey("code")
                    onCodec(key)
                }}
            />
        ),
        [codeMenuInfo]
    )
    const [decodeShow, setDecodeShow] = useState<boolean>(false)
    const decodeMenuInfo = useMemo<YakitMenuItemProps[]>(() => {
        return [
            {key: "base64-decode", label: t("Layout.MenuCodec.base64Decode")},
            {key: "htmldecode", label: t("Layout.MenuCodec.htmldecode")},
            {key: "urlunescape", label: t("Layout.MenuCodec.urlunescape")},
            {key: "urlunescape-path", label: t("Layout.MenuCodec.urlunescapePath")},
            {key: "double-urldecode", label: t("Layout.MenuCodec.doubleUrldecode")},
            {key: "hex-decode", label: t("Layout.MenuCodec.hexDecode")},
            {key: "json-unicode-decode", label: t("Layout.MenuCodec.jsonUnicodeDecode")}
        ]
    }, [i18n.language])
    const decodeMenu = useMemo(
        () => (
            <YakitMenu
                width={142}
                selectedKeys={[]}
                data={decodeMenuInfo}
                onClick={({key}) => {
                    setActiveKey("decode")
                    onCodec(key)
                }}
            />
        ),
        [decodeMenuInfo]
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
            yakitNotify("error", t("Layout.MenuCodec.messageCodecInProgress"))
            return
        }
        if (!question) {
            yakitNotify("error", t("Layout.MenuCodec.messageCodecNoContent"))
            return
        }
        if (!key) {
            yakitNotify("error", t("Layout.MenuCodec.messageCodecEmptyType"))
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
                                Key: "timeout",
                                Value: "10"
                            },
                            {
                                Key: "limit",
                                Value: "10000"
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
                        <div className={styles["codec-menu-btn"]}>
                            {t("Layout.MenuCodec.decode")}
                            {codeShow ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </div>
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
                        <div className={styles["encode-menu-btn"]}>
                            {t("Layout.MenuCodec.encode")}
                            {decodeShow ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </div>
                    </YakitButton>
                </YakitPopover>
                <YakitButton
                    size='small'
                    type={avtiveKey === "fuzztag" ? "primary" : "outline2"}
                    onClick={() => onCodec("fuzztag")}
                    style={{height: 24}}
                >
                    {t("Layout.MenuCodec.fuzztag")}
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
                        iconColor={
                            !!question
                                ? "var(--Colors-Use-Neutral-Text-3-Secondary)"
                                : "var(--Colors-Use-Neutral-Disable)"
                        }
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
                        iconColor={
                            !!answer
                                ? "var(--Colors-Use-Neutral-Text-3-Secondary)"
                                : "var(--Colors-Use-Neutral-Disable)"
                        }
                    />
                </div>
            </div>
        </div>
    )
})
