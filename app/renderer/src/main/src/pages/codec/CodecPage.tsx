import React, { useEffect, useState } from "react"
import { Button, PageHeader, Popover, Space, Spin, Dropdown, Menu, Row, Col } from "antd"
import { DownOutlined, SwapOutlined } from "@ant-design/icons"
import { YakEditor } from "../../utils/editors"
import { failed } from "../../utils/notification"

import "./style.css"

const { ipcRenderer } = window.require("electron")

export interface CodecType {
    key?: string
    verbose: string
    subTypes?: CodecType[]
}

const CodecMenu: CodecType[] = [
    {
        verbose: "解码",
        subTypes: [
            { key: "base64-decode", verbose: "Base64 解码" },
            { key: "htmldecode", verbose: "HTML 解码" },
            { key: "urlunescape", verbose: "URL 解码" },
            { key: "urlunescape-path", verbose: "URL 路径解码" },
            { key: "double-urldecode", verbose: "双重 URL 解码" },
            { key: "hex-decode", verbose: "十六进制解码" },
            { key: "json-unicode-decode", verbose: "Unicode 中文解码" }
        ]
    },
    {
        verbose: "编码",
        subTypes: [
            { key: "base64", verbose: "Base64 编码" },
            { key: "htmlencode", verbose: "HTML 实体编码（强制）" },
            { key: "htmlencode-hex", verbose: "HTML 实体编码（强制十六进制模式）" },
            { key: "htmlescape", verbose: "HTML 实体编码（只编码特殊字符）" },
            { key: "urlencode", verbose: "URL 编码（强制）" },
            { key: "urlescape", verbose: "URL 编码（只编码特殊字符）" },
            { key: "urlescape-path", verbose: "URL 路径编码（只编码特殊字符）" },
            { key: "double-urlencode", verbose: "双重 URL 编码" },
            { key: "hex-encode", verbose: "十六进制编码" },
            { key: "json-unicode", verbose: "Unicode 中文编码" }
        ]
    },
    {
        verbose: "计算",
        subTypes: [
            { key: "md5", verbose: "计算 md5" },
            { key: "sha1", verbose: "计算 Sha1" },
            { key: "sha256", verbose: "计算 Sha256" },
            { key: "sha512", verbose: "计算 Sha512" }
        ]
    },
    {
        verbose: "Json处理",
        subTypes: [
            { key: "json-formatter", verbose: "JSON 美化" },
            { key: "json-inline", verbose: "JSON 压缩成一行" }
        ]
    },
    { key: "fuzz", verbose: "模糊测试(标签同 Web Fuzzer)" },
    { key: "http-get-query", verbose: "解析 HTTP 参数" }
]

export interface CodecPageProp {}

export const CodecPage: React.FC<CodecPageProp> = (props) => {
    const [codeType, setCodeType] = useState<string>()
    const [text, setText] = useState("")
    const [result, setResult] = useState("")
    const [loading, setLoading] = useState(true)

    const codec = (t: string) => {
        if (!t) {
            failed("BUG: 空的解码类型")
            return
        }
        ipcRenderer.invoke("codec", { Type: t, Text: text })
    }

    const onHandledResult = (e: any, data: string) => {
        setResult(data)
    }
    const onHandleError = (e: any, err: string) => {
        if (err) {
            failed(`CODEC 解码失败：${err}`)
        }
    }

    useEffect(() => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 300)

        ipcRenderer.on("client-codec", onHandledResult)
        ipcRenderer.on("client-codec-error", onHandleError)

        return () => {
            ipcRenderer.removeListener("client-codec", onHandledResult)
            ipcRenderer.removeListener("client-codec-error", onHandleError)
        }
    }, [])

    return (
        <Spin spinning={loading} wrapperClassName={"codec-spin"}>
            <PageHeader title={"Codec"} className={"codec-pageheader-title"}></PageHeader>
            <div className={"codec-function-bar"}>
                <Space>
                    {CodecMenu.map((item, index) => {
                        if ((item.subTypes || []).length > 0) {
                            return (
                                <Dropdown
                                    overlay={
                                        <Menu>
                                            {item.subTypes?.map((subItem, subIndex) => {
                                                return (
                                                    <Menu.Item key={`${subItem.key}-${subIndex}`}>
                                                        <span
                                                            onClick={() => {
                                                                codec(subItem.key || "")
                                                            }}
                                                        >
                                                            {subItem.verbose}
                                                        </span>
                                                    </Menu.Item>
                                                )
                                            })}
                                        </Menu>
                                    }
                                    placement='bottomLeft'
                                >
                                    <Button>
                                        {item.verbose}
                                        <DownOutlined />
                                    </Button>
                                </Dropdown>
                            )
                        } else {
                            return (
                                <Button
                                    key={item.key}
                                    onClick={() => {
                                        codec(item.key || "")
                                    }}
                                    style={{ marginRight: 8 }}
                                >
                                    {item.verbose}
                                </Button>
                            )
                        }
                    })}
                </Space>
            </div>
            <div className={"codec-content"}>
                <Row wrap={false} justify='space-between' style={{ flexGrow: 1 }}>
                    <Col flex='0 1 49%'>
                        <div style={{ width: "100%", height: "100%" }}>
                            <YakEditor value={text} setValue={setText} />
                        </div>
                    </Col>
                    <Col flex='0 1 2%'>
                        <div className={"exchange-btn"}>
                            <SwapOutlined
                                className={"exchange-icon"}
                                onClick={() => {
                                    const left = text
                                    const right = result
                                    setText(right)
                                    setResult(left)
                                }}
                            />
                        </div>
                    </Col>
                    <Col flex='0 1 49%'>
                        <div style={{ width: "100%", height: "100%" }}>
                            <YakEditor value={result} setValue={setResult} readOnly={true} type={"http"} />
                        </div>
                    </Col>
                </Row>
            </div>
        </Spin>
    )
}
