import React, {useEffect, useState} from "react"
import {
    Button,
    PageHeader,
    Space,
    Dropdown,
    Menu,
    Row,
    Col,
    Tag,
    Divider,
    Typography,
    Alert,
    Popover,
    Input,
    List
} from "antd"
import {DownOutlined, SwapOutlined, ArrowsAltOutlined} from "@ant-design/icons"
import {YakEditor} from "../../utils/editors"
import {failed} from "../../utils/notification"
import {LineConversionIcon} from "../../assets/icons"
import {AutoCard} from "../../components/AutoCard"
import {AutoSpin} from "../../components/AutoSpin"
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {YakScript, YakScriptParam} from "../invoker/schema";
import {useMemoizedFn} from "ahooks";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import {queryYakScriptList} from "../yakitStore/network";

import "./style.css"
import {execCodec} from "../../utils/encodec";

const {ipcRenderer} = window.require("electron")

export interface CodecType {
    key?: string
    verbose: string
    subTypes?: CodecType[]
    params?: YakScriptParam[],
    help?: React.ReactNode
    isYakScript?: boolean
}

const {Text} = Typography;

const generateSM4AmpAESParams = () => {
    return [
        {
            Field: "key",
            FieldVerbose: "密钥（HEX 编码）",
            Required: true,
            TypeVerbose: "string",
            Help: "HEX(十六进制) 编码后的 KEY"
        },
        {Field: "iv", FieldVerbose: "IV-初始块（HEX 编码）", TypeVerbose: "string", Help: "十六进制编码后的 IV（初始块）"},
    ] as YakScriptParam[]
};

const SM4AmpAESEncHelp = () => {
    return <>
        <Text>加密：任何文本被加密成的 <Text mark={true}>结果经过 HEX 编码</Text></Text>
        <br/>
        <Text>密钥：<Text mark={true}>被 HEX 编码</Text> 的 <Text mark={true}>长度为16位</Text> 的字符串 （为兼容 Key 中不可见字符）</Text>
    </>
}


const SM4AmpAESDecHelp = () => {
    return <>
        <Text>解密：解密的密文需要经过 <Text mark={true}>HEX 编码</Text> 后作为输入</Text>
        <br/>
        <Text>密钥：<Text mark={true}>被 HEX 编码</Text> 的 <Text mark={true}>长度为16位</Text> 的字符串（为兼容 Key 中不可见字符）</Text>
    </>
}

const EncAmpDecMenu: CodecType[] = [
    {
        verbose: "国密算法(sm4)对称加解密",
        subTypes: [
            {
                key: "sm4-cbc-encrypt", verbose: "SM4-CBC 加密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp(),
            },
            {
                key: "sm4-cbc-decrypt", verbose: "SM4-CBC 解密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp(),
            },
            {
                key: "sm4-cfb-encrypt",
                verbose: "SM4-CFB 加密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp()
            },
            {
                key: "sm4-cfb-decrypt",
                verbose: "SM4-CFB 解密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp()
            },
            {
                key: "sm4-ebc-encrypt",
                verbose: "SM4-EBC 加密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp()
            },
            {
                key: "sm4-ebc-decrypt",
                verbose: "SM4-EBC 解密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp()
            },
            {
                key: "sm4-ofb-encrypt",
                verbose: "SM4-OFB 加密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp()
            },
            {
                key: "sm4-ofb-decrypt",
                verbose: "SM4-OFB 解密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp()
            },
            {
                key: "sm4-gcm-encrypt",
                verbose: "SM4-GCM 加密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp()
            },
            {
                key: "sm4-gcm-decrypt",
                verbose: "SM4-GCM 解密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp()
            },
        ],
    },
    {
        verbose: "AES对称加解密",
        subTypes: [
            {
                key: "aes-cbc-encrypt",
                verbose: "AES-CBC 加密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp()
            },
            {
                key: "aes-cbc-decrypt",
                verbose: "AES-CBC 解密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp()
            },
            {
                key: "aes-gcm-encrypt",
                verbose: "AES-GCM 加密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp()
            },
            {
                key: "aes-gcm-decrypt",
                verbose: "AES-GCM 解密",
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp()
            },
        ],
    }
];

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
        verbose: "计算(HASH)",
        subTypes: [
            {key: "md5", verbose: "计算 md5"},
            {key: "sm3", verbose: "计算 SM3(国密3)"},
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
    {
        verbose: "美化",
        subTypes: [
            {key: "pretty-packet", verbose: "HTTP 数据包美化"},
            {key: "json-formatter", verbose: "JSON 美化（缩进4）"},
            {key: "json-formatter-2", verbose: "JSON 美化（缩进2）"},
            {key: "json-inline", verbose: "JSON 压缩成一行"},
        ],
    },
    {key: "fuzz", verbose: "模糊测试(标签同 Web Fuzzer)"},
    {
        verbose: "HTTP", subTypes: [
            {key: "http-get-query", verbose: "解析 HTTP 参数"},
            {key: "pretty-packet", verbose: "HTTP 数据包美化"},
            {key: "packet-from-url", verbose: "从 URL 中加载数据包"},
        ]
    },
]

export interface CodecPageProp {
}

const CodecPage: React.FC<CodecPageProp> = (props) => {
    const [text, setText] = useState("")
    const [result, setResult] = useState("")
    const [loading, setLoading] = useState(true)

    const [leftWidth, setLeftWidth] = useState<boolean>(false)
    const [rightWidth, setRightWidth] = useState<boolean>(false)
    const [leftLine, setLeftLine] = useState<boolean>(true)
    const [rightLine, setRightLine] = useState<boolean>(false)

    const [codecType, setCodecType] = useState<CodecType>();
    const [params, setParams] = useState<YakExecutorParam[]>([]);
    const [codecPlugin, setCodecPlugin] = useState<CodecType[]>([]);
    const [pluginLoading, setPluginLoading] = useState<boolean>(false)
    const [pluginVisible, setPluginVisible] = useState<boolean>(false)
    let timer: any = null

    const codec = (t: string, params?: YakExecutorParam[], isYakScript?: boolean) => {
        if (!t) {
            failed("BUG: 空的解码类型")
            return
        }
        if (!text && !isYakScript) {
            failed("左侧编辑器内容为空，请输入内容后重试!")
            return
        }

        ipcRenderer
            .invoke("Codec", {Type: t, Text: text, Params: params || [], ScriptName: isYakScript ? t : ""})
            .then((res) => {
                onHandledResult(res?.Result || "")
            })
            .catch((err) => {
                onHandleError(`${err}`)
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
        setTimeout(() => setLoading(false), 300)
    }, [])

    const renderCodecTypes = useMemoizedFn((items: CodecType[], notAutoExec?: boolean, isYakScript?: boolean) => {
        return (
            items.map((item) => {
                if ((item.subTypes || []).length > 0) {
                    return (
                        <Dropdown
                            key={item.verbose}
                            overlay={
                                <Menu activeKey={codecType?.key}>
                                    {item.subTypes?.map((subItem) => {
                                        return (
                                            <Menu.Item
                                                key={`${subItem.key}`}
                                                onClick={() => {
                                                    setCodecType(subItem)
                                                    if (!notAutoExec) {
                                                        codec(subItem.key || "", [], isYakScript)
                                                    }
                                                }}>
                                                    <span>
                                                        {subItem.verbose}
                                                    </span>
                                            </Menu.Item>
                                        )
                                    })}
                                </Menu>
                            }
                            placement='bottomLeft'
                        >
                            <Button
                                type={((item?.subTypes || []).filter(i => {
                                    return i.key === codecType?.key
                                })).length > 0 ? "primary" : undefined}
                            >
                                {item.verbose}
                                <DownOutlined/>
                            </Button>
                        </Dropdown>
                    )
                } else {
                    return (
                        <Button
                            key={item.key}
                            type={codecType?.key === item.key ? "primary" : undefined}
                            onClick={() => {
                                setCodecType(item);
                                if (!notAutoExec) {
                                    codec(item.key || "", [], isYakScript)
                                }
                            }}
                            style={{marginRight: 8}}
                        >
                            {item.verbose}
                        </Button>
                    )
                }
            })
        )
    })

    const search = useMemoizedFn((keyword?: string) => {
        setPluginLoading(true)
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                setCodecPlugin([{
                    subTypes: i.map(script => {
                        return {
                            key: script.ScriptName,
                            help: script.Help,
                            verbose: script.ScriptName,
                            isYakScript: true
                        }
                    }), key: "from-yakit-codec-plugin", verbose: "CODEC 社区插件"
                }])
            },
            () => setTimeout(() => setPluginLoading(false), 300),
            10,
            keyword
        )
    })

    useEffect(() => {
        search()
    }, [])

    return (
        <AutoSpin spinning={loading}>
            <PageHeader
                title={"Codec"} className={"codec-pageheader-title"}
                subTitle={<>
                    {codecType && <Tag color={"geekblue"}>当前类型：{codecType?.verbose}</Tag>}
                    {codecType && (codecType?.params || []).length <= 0 &&
                    <Button type={"primary"} size={"small"} onClick={e => {
                        codec(codecType?.key || "", [], codecType?.isYakScript)
                    }}>立即执行</Button>}
                </>}
            />
            <div className={"codec-function-bar"}>
                <Space direction={"vertical"} style={{width: "100%"}}>
                    <Space>
                        {renderCodecTypes(CodecMenu)}
                    </Space>
                    <Space>
                        {renderCodecTypes(EncAmpDecMenu, true)}
                        {/* {renderCodecTypes(codecPlugin, false, true)} */}
                        <Popover
                            overlayClassName="codec-plugin-lib"
                            trigger="hover"
                            placement="bottomLeft"
                            visible={pluginVisible}
                            onVisibleChange={setPluginVisible}
                            content={
                                <div style={{width: 250}}>
                                    <Input placeholder="模糊搜索插件名" allowClear onChange={event => {
                                        if (timer) {
                                            clearTimeout(timer)
                                            timer = null
                                        }
                                        timer = setTimeout(() => {
                                            search(event.target.value)
                                        }, 500);
                                    }}></Input>
                                    <List
                                        loading={pluginLoading}
                                        size="small"
                                        dataSource={codecPlugin[0]?.subTypes || []}
                                        rowKey={row => row.key || ""}
                                        renderItem={item => <List.Item>
                                            <div style={{width: "100%", padding: "5px 7px"}} onClick={() => {
                                                setCodecType(item)
                                                codec(item.key || "", [], true)
                                                setPluginVisible(false)
                                            }}>
                                                {item.key || ""}
                                            </div>
                                        </List.Item>}
                                    />
                                </div>
                            }>
                            <Button
                                type={(codecPlugin[0]?.subTypes || []).filter(item => codecType?.key === item.key).length !== 0 ? 'primary' : 'default'}>CODEC
                                社区插件 <DownOutlined style={{fontSize: 10}}/></Button>
                        </Popover>
                    </Space>
                    {codecType && codecType?.params && codecType.params.length > 0 && <Row
                        style={{width: "100%"}}
                        gutter={20}
                    >
                        <Col span={codecType?.help ? 18 : 24}>
                            <Divider>设置参数</Divider>
                            <YakScriptParamsSetter
                                primaryParamsOnly={true} styleSize={"small"}
                                Params={(codecType?.params || [])}
                                params={[]}
                                onParamsConfirm={finalParams => {
                                    setParams([...finalParams])
                                    codec(codecType?.key || "", finalParams, codecType?.isYakScript)
                                }}
                                hideClearButton={true}
                                submitVerbose={"执行"}
                            />
                        </Col>
                        {codecType?.help && <Col span={6} style={{paddingTop: 30}}>
                            <Alert type={"info"} message={codecType?.help}/>
                        </Col>}
                    </Row>}
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
                                <YakEditor value={result} noWordWrap={!rightLine} setValue={setResult} readOnly={true}
                                           type={"http"}/>
                            </div>
                        </AutoCard>
                    </Col>
                </Row>
            </div>
        </AutoSpin>
    )
}
export default CodecPage;