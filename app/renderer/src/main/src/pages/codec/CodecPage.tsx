import React, {useEffect, useState} from "react"
import {Button, PageHeader, Space, Dropdown, Menu, Row, Col} from "antd"
import {DownOutlined, SwapOutlined, ArrowsAltOutlined} from "@ant-design/icons"
import {YakEditor} from "../../utils/editors"
import {failed} from "../../utils/notification"
import { LineConversionIcon } from "../../assets/icons"
import { AutoCard } from "../../components/AutoCard"
import { AutoSpin } from "../../components/AutoSpin"

import "./style.css"

const {ipcRenderer} = window.require("electron")

export interface CodecType {
    key?: string
    verbose: string
    subTypes?: CodecType[]
}

const CodecMenu: CodecType[] = [
    {key: "jwt-parse-weak", verbose: "JWT解析与弱密码"},
    {
        verbose: "Java",
        subTypes: [
            {key: "java-unserialize-hex-dumper", verbose: "反序列化(SerialDumper)"},
            {key: "java-unserialize-hex", verbose: "反序列化 Java 对象流(hex)"},
            {key: "java-unserialize-base64", verbose: "反序列化 Java 对象流(base64)"},
            {key: "java-serialize-json", verbose: "Java 对象流序列化（JSON=>HEX）"}
        ]
    },
    {
        verbose: "解码",
        subTypes: [
            {key: "base64-decode", verbose: "Base64 解码"},
            {key: "htmldecode", verbose: "HTML 解码"},
            {key: "urlunescape", verbose: "URL 解码"},
            {key: "urlunescape-path", verbose: "URL 路径解码"},
            {key: "double-urldecode", verbose: "双重 URL 解码"},
            {key: "hex-decode", verbose: "十六进制解码"},
            {key: "json-unicode-decode", verbose: "Unicode 中文解码"}
        ]
    },
    {
        verbose: "编码",
        subTypes: [
            {key: "base64", verbose: "Base64 编码"},
            {key: "htmlencode", verbose: "HTML 实体编码（强制）"},
            {key: "htmlencode-hex", verbose: "HTML 实体编码（强制十六进制模式）"},
            {key: "htmlescape", verbose: "HTML 实体编码（只编码特殊字符）"},
            {key: "urlencode", verbose: "URL 编码（强制）"},
            {key: "urlescape", verbose: "URL 编码（只编码特殊字符）"},
            {key: "urlescape-path", verbose: "URL 路径编码（只编码特殊字符）"},
            {key: "double-urlencode", verbose: "双重 URL 编码"},
            {key: "hex-encode", verbose: "十六进制编码"},
            {key: "json-unicode", verbose: "Unicode 中文编码"}
        ]
    },
    {
        verbose: "计算",
        subTypes: [
            {key: "md5", verbose: "计算 md5"},
            {key: "sha1", verbose: "计算 Sha1"},
            {key: "sha256", verbose: "计算 Sha256"},
            {key: "sha512", verbose: "计算 Sha512"}
        ]
    },
    {
        verbose: "Json处理",
        subTypes: [
            {key: "json-formatter", verbose: "JSON 美化（缩进4）"},
            {key: "json-formatter-2", verbose: "JSON 美化（缩进2）"},
            {key: "json-inline", verbose: "JSON 压缩成一行"}
        ]
    },
    {key: "fuzz", verbose: "模糊测试(标签同 Web Fuzzer)"},
    {key: "http-get-query", verbose: "解析 HTTP 参数"}
]

export interface CodecPageProp {
}

const CodecPage: React.FC<CodecPageProp> = (props) => {
    const [text, setText] = useState("")
    const [result, setResult] = useState("")
    const [loading, setLoading] = useState(true)
    
    const [leftWidth, setLeftWidth] = useState<boolean>(false)
    const [rightWidth, setRightWidth] = useState<boolean>(false)
    const [leftLine,setLeftLine] = useState<boolean>(true)
    const [rightLine,setRightLine] = useState<boolean>(false)

    const codec = (t: string) => {
        if (!t) {
            failed("BUG: 空的解码类型")
            return
        }
        ipcRenderer
            .invoke("Codec", {Type: t, Text: text})
            .then((res) => {
                onHandledResult(res?.Result || "")
            })
            .catch((err) => {
                onHandleError(err.details)
            })
    }

    const onHandledResult = (data: string) => {
        setResult(data)
    }
    const onHandleError = (err: string) => {
        if (err) failed(`CODEC 解码失败：${err}`)
    }

    useEffect(() => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 300)
    }, [])

    return (
        <AutoSpin spinning={loading}>
            <PageHeader title={"Codec"} className={"codec-pageheader-title"}></PageHeader>
            <div className={"codec-function-bar"}>
                <Space>
                    {CodecMenu.map((item) => {
                        if ((item.subTypes || []).length > 0) {
                            return (
                                <Dropdown
                                    key={item.verbose}
                                    overlay={
                                        <Menu>
                                            {item.subTypes?.map((subItem) => {
                                                return (
                                                    <Menu.Item key={`${subItem.key}`}>
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
                                        <DownOutlined/>
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
                                    style={{marginRight: 8}}
                                >
                                    {item.verbose}
                                </Button>
                            )
                        }
                    })}
                </Space>
            </div>
            <div className={"codec-content"}>
                <Row wrap={false} justify='space-between' style={{flexGrow: 1}}>
                    <Col flex={leftWidth ? "0 1 80%" : rightWidth ? "0 1 18%" : "0 1 49%"}>
                        <AutoCard
                            className='codec-card-body'
                            headStyle={{height: 28, minHeight: 28, padding: 0}}
                            bodyStyle={{padding: 0}}
                            extra={
                                <>
                                    <Button
                                        size={"small"}
                                        type={leftLine ? "primary" : "link"}
                                        icon={<LineConversionIcon/>}
                                        onClick={() => setLeftLine(!leftLine)}
                                    />
                                    <Button
                                        size={"small"}
                                        type={leftWidth ? "primary" : "link"}
                                        icon={<ArrowsAltOutlined/>}
                                        onClick={() => {
                                            setLeftWidth(!leftWidth)
                                            setRightWidth(false)
                                        }}
                                    />
                                </>
                            }
                        >
                            <div className='editor-body'>
                                <YakEditor value={text} noWordWrap={!leftLine} setValue={setText}/>
                            </div>
                        </AutoCard>
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
                    <Col flex={rightWidth ? "0 1 80%" : leftWidth ? "0 1 18%" : "0 1 49%"}>
                        <AutoCard
                            className='codec-card-body'
                            headStyle={{height: 28, minHeight: 28, padding: 0}}
                            bodyStyle={{padding: 0}}
                            extra={
                                <>
                                   <Button
                                        size={"small"}
                                        type={rightLine ? "primary" : "link"}
                                        icon={<LineConversionIcon/>}
                                        onClick={() => setRightLine(!rightLine)}
                                    />
                                    <Button
                                        size={"small"}
                                        type={rightWidth ? "primary" : "link"}
                                        icon={<ArrowsAltOutlined/>}
                                        onClick={() => {
                                            setRightWidth(!rightWidth)
                                            setLeftWidth(false)
                                        }}
                                    />
                                </>
                            }
                        >
                            <div className='editor-body'>
                                <YakEditor value={result} noWordWrap={!rightLine} setValue={setResult} readOnly={true} type={"http"}/>
                            </div>
                        </AutoCard>
                    </Col>
                </Row>
            </div>
        </AutoSpin>
    )
}
export default CodecPage;