import React, {createContext, useContext, useEffect,useState} from "react";
import {AutoCard} from "@/components/AutoCard";
import { Form, Menu, Select} from "antd";
import { Uint8ArrayToString} from "@/utils/str";
import codecStyle from "./style.module.css";
import {YakCodeEditor} from "@/utils/editors";
import {YakScript, YakScriptParam} from "@/pages/invoker/schema";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {failed} from "@/utils/notification";
import menuStyle from "@/pages/customizeMenu/CustomizeMenu.module.scss";
import classNames from "classnames";
import {DragSortIcon, PencilAltIcon, RemoveIcon} from "@/assets/newIcon";
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput";
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal";
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import { useMemoizedFn} from "ahooks"
import {queryYakScriptList} from "@/pages/yakitStore/network";
import {CodecPluginTemplate} from "@/pages/invoker/data/CodecPluginTemplate";


export interface NewCodecPageProp {

}

interface CodecType {
    key?: string
    verbose: string
    subTypes?: CodecType[]
    params?: YakScriptParam[]
    help?: React.ReactNode
    isYakScript?: boolean
}


interface NewCodecType {
    verbose: string
    subTypes?: NewCodeSubType[]
    params?: YakScriptParam[]
    help?: React.ReactNode
}


interface NewCodeSubType {
    key: string
    verbose: string
    params?: YakScriptParam[]
    help?: React.ReactNode
}

const codecAllList: NewCodecType[] = [
    {
        verbose: "国密算法(sm4)对称加解密",
        subTypes: [
            {key: "sm4-cbc-encrypt", verbose: "SM4-CBC 加密",},
            {key: "sm4-cbc-decrypt", verbose: "SM4-CBC 解密",},
            {key: "sm4-cfb-encrypt", verbose: "SM4-CFB 加密",},
            {key: "sm4-cfb-decrypt", verbose: "SM4-CFB 解密",},
            {key: "sm4-ebc-encrypt", verbose: "SM4-EBC 加密",},
            {key: "sm4-ebc-decrypt", verbose: "SM4-EBC 解密",},
            {key: "sm4-ofb-encrypt", verbose: "SM4-OFB 加密",},
            {key: "sm4-ofb-decrypt", verbose: "SM4-OFB 解密",},
            {key: "sm4-gcm-encrypt", verbose: "SM4-GCM 加密",},
            {key: "sm4-gcm-decrypt", verbose: "SM4-GCM 解密",}
        ]
    },
    {
        verbose: "AES对称加解密",
        subTypes: [
            {key: "aes-cbc-encrypt", verbose: "AES-CBC 加密",},
            {key: "aes-cbc-decrypt", verbose: "AES-CBC 解密",},
            {key: "aes-gcm-encrypt", verbose: "AES-GCM 加密",},
            {key: "aes-gcm-decrypt", verbose: "AES-GCM 解密",}
        ]
    },
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
            {key: "json-inline", verbose: "JSON 压缩成一行"}
        ]
    },
    {
        verbose: "HTTP",
        subTypes: [
            {key: "http-get-query", verbose: "解析 HTTP 参数"},
            {key: "pretty-packet", verbose: "HTTP 数据包美化"},
            {key: "packet-from-url", verbose: "从 URL 中加载数据包"},
            {key: "packet-to-curl", verbose: "数据包转 CURL 命令"},
        ]
    },
    {
        verbose: "模糊测试(标签同 Web Fuzzer)",
        subTypes: [
            {key: "fuzz", verbose: "模糊测试(标签同 Web Fuzzer)"},
        ]
    },
    {
        verbose: "Codec插件与临时插件",
        subTypes: [
            {key: "custom-script", verbose: "临时插件"},
            {key: "plugin", verbose: "Codec插件"}
        ]
    },
    {
        verbose: "JWT解析与弱密码",
        subTypes: [
            {key: "jwt-parse-weak", verbose: "JWT解析与弱密码"}
        ]
    }
]

const AllTypeMap = new Map<string, string>([
    ["java-unserialize-hex-dumper", "反序列化(SerialDumper)"],
    ["java-unserialize-hex", "反序列化 Java 对象流(hex)"],
    ["java-unserialize-base64", "反序列化 Java 对象流(base64)"],
    ["java-serialize-json", "Java 对象流序列化（JSON=>HEX）"],
    ["base64-decode", "Base64 解码"],
    ["htmldecode", "HTML 解码"],
    ["urlunescape", "URL 解码"],
    ["urlunescape-path", "URL 路径解码"],
    ["double-urldecode", "双重 URL 解码"],
    ["hex-decode", "十六进制解码"],
    ["json-unicode-decode", "Unicode 中文解码"],
    ["base64", "Base64 编码"],
    ["htmlencode", "HTML 实体编码（强制）"],
    ["htmlencode-hex", "HTML 实体编码（强制十六进制模式）"],
    ["htmlescape", "HTML 实体编码（只编码特殊字符）"],
    ["urlencode", "URL 编码（强制）"],
    ["urlescape", "URL 编码（只编码特殊字符）"],
    ["urlescape-path", "URL 路径编码（只编码特殊字符）"],
    ["double-urlencode", "双重 URL 编码"],
    ["hex-encode", "十六进制编码"],
    ["json-unicode", "Unicode 中文编码"],
    ["md5", "计算 md5"],
    ["sm3", "计算 SM3(国密3)"],
    ["sha1", "计算 Sha1"],
    ["sha256", "计算 Sha256"],
    ["sha512", "计算 Sha512"],
    ["json-formatter", "JSON 美化（缩进4）"],
    ["json-formatter-2", "JSON 美化（缩进2）"],
    ["json-inline", "JSON 压缩成一行"],
    ["pretty-packet", "HTTP 数据包美化"],
    ["json-formatter", "JSON 美化（缩进4）"],
    ["json-formatter-2", "JSON 美化（缩进2）"],
    ["json-inline", "JSON 压缩成一行"],
    ["http-get-query", "解析 HTTP 参数"],
    ["pretty-packet", "HTTP 数据包美化"],
    ["packet-from-url", "从 URL 中加载数据包"],
    ["packet-to-curl", "数据包转 CURL 命令"],
    ["fuzz", "模糊测试(标签同 Web Fuzzer)"],
    ["jwt-parse-weak", "JWT解析与弱密码"],
    ["sm4-cbc-encrypt", "SM4-CBC 加密"],
    ["sm4-cbc-decrypt", "SM4-CBC 解密"],
    ["sm4-cfb-encrypt", "SM4-CFB 加密"],
    ["sm4-cfb-decrypt", "SM4-CFB 解密"],
    ["sm4-ebc-encrypt", "SM4-EBC 加密"],
    ["sm4-ebc-decrypt", "SM4-EBC 解密",],
    ["sm4-ofb-encrypt", "SM4-OFB 加密"],
    ["sm4-ofb-decrypt", "SM4-OFB 解密"],
    ["sm4-gcm-encrypt", "SM4-GCM 加密"],
    ["sm4-gcm-decrypt", "SM4-GCM 解密"],
    ["aes-cbc-encrypt", "AES-CBC 加密"],
    ["aes-cbc-decrypt", "AES-CBC 解密"],
    ["aes-gcm-encrypt", "AES-GCM 加密"],
    ["aes-gcm-decrypt", "AES-GCM 解密"]
])


interface work {
    CodecType: string
    Script: string
    PluginName: string
    Params: encryptionParam[]
}


interface encryptionParam {
    Key: string
    Value: string
}


const {ipcRenderer} = window.require("electron");

const CodecCtx = createContext<{
    workFlow: work[],
    setWorkFlow: (workFlow: work[]) => void,
} | null>(null);

/**
 * @description 
 * 前端建议(pr的审核建议): 后续的前端页面优化，可以不使用createContext API 就能实现相同功能
 */
export const NewCodecPage: React.FC<NewCodecPageProp> = (props) => {
    const [openIndex, setOpenIndex] = useState(-1);

    return <Context>
        <div className={codecStyle["container"]}>
            <div className={codecStyle["left"]} style={{overflow: "auto"}}>
                {codecAllList.map((item, index) => (
                    <CodecTypeList key={index} dateItem={item.subTypes} title={item.verbose} isOpen={openIndex == index}
                                   onclick={() => (index == openIndex) ? setOpenIndex(-1) : setOpenIndex(index)}></CodecTypeList>
                ))}
            </div>

            <div className={codecStyle["center"]} style={{overflow: "auto"}}>
                <CodecWorkFlow></CodecWorkFlow>
            </div>
            <CodecEditor></CodecEditor>
        </div>

    </Context>
};


//Context组件
function Context({children}) {
    const [workFlow, setWorkFlow] = useState<work[]>([]);

    return (
        <CodecCtx.Provider value={{workFlow, setWorkFlow}}>
            {children}
        </CodecCtx.Provider>
    );
}

//CodecTypeList 所有的Codec选项
const CodecTypeList = ({title, dateItem, isOpen, onclick, key}) => {
    return (
        <div className={`codec-item ${isOpen ? 'open' : ''}`}>
            <AutoCard size='small' bordered={false}>
                <a onClick={onclick}>{title}</a>
            </AutoCard>
            {isOpen && <CodecTypeItem codecDate={dateItem} listKey={key}></CodecTypeItem>}
        </div>
    );
};

const CodecTypeItem = ({codecDate, listKey}) => {
    const [selectedKeys, setSelectedKeys] = useState([]);
    const ctx = useContext(CodecCtx)

    const {workFlow, setWorkFlow} = ctx!
    return <Menu selectedKeys={selectedKeys}>
        {codecDate.map((date, index) => (
            <Menu.Item
                key={index}
                onClick={() => {
                    setSelectedKeys([]);
                    const itemWork: work = {
                        CodecType: date.key,
                        Script: "",
                        PluginName: date.pluginName,
                        Params: []
                    }
                    setWorkFlow([...workFlow, itemWork])
                }
                }>
                <span>{date.verbose}</span>
            </Menu.Item>

        ))}
    </Menu>
}

//WorkFlow Codec工作流
const CodecWorkFlow = () => {
    const ctx = useContext(CodecCtx)
    const {workFlow, setWorkFlow} = ctx!
    const onDragEnd = useMemoizedFn((result) => {
        if (!result?.destination){
            return
        }
        if (result.destination.droppableId === "workList") {
            if (result.source.droppableId === "workList") {
                const [remove] = workFlow.splice(result.source.index, 1);
                workFlow.splice(result.destination.index, 0, remove);
                setWorkFlow(workFlow)
            }
        }
    })


    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className={menuStyle["second-menu"]}>
                <div className={menuStyle["second-menu-list"]}>
                    <Droppable droppableId="workList">
                        {(provided, snapshot) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={menuStyle["second-menu-drop"]}
                                style={{marginBottom: 70}}
                            >
                                {workFlow.map((item, index) => (
                                    <Draggable
                                        key={index}
                                        draggableId={index.toString()}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                key={index}
                                            >
                                                <CodecWork index={index} type={item.CodecType}
                                                           isDragging={snapshot.isDragging}></CodecWork>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>
            </div>
        </DragDropContext>
    )
}


interface workProps {
    type: string
    index: number
    isDragging: boolean
    verbose?: string
}

interface CodecPlugin {
    value: string
    label: string
}


const CodecWork: React.FC<workProps> = React.memo((props) => {
    //常量定义
    const {type, index, isDragging} = props
    let verbose = AllTypeMap.get(type)
    let needCode = false
    let needParam = false
    let needPlugin = false


    switch (type) {
        case 'custom-script':
            verbose = "临时插件"
            return <CustomWork isDragging={isDragging} verbose={verbose} index={index} type={type}></CustomWork>
        case 'plugin':
            verbose = "社区插件"
            return <PluginWork isDragging={isDragging} verbose={verbose} index={index} type={type}></PluginWork>
        default:
            if (type.includes("sm4") || type.includes("aes")) {
                return <ParamsWork isDragging={isDragging} verbose={verbose} index={index} type={type}></ParamsWork>
            }
            return <DefaultWork isDragging={isDragging} verbose={verbose} index={index} type={type}></DefaultWork>
    }

})
//默认work
const DefaultWork = (props: workProps) => {
    const {verbose, index, isDragging} = props
    const ctx = useContext(CodecCtx)
    const {workFlow, setWorkFlow} = ctx!
    return (
        <div className={menuStyle["second-menu-item-content"]}>
            <div
                className={classNames(menuStyle["second-menu-item"], {
                    [menuStyle["menu-item-drag"]]: isDragging
                })}
            >
                <DragSortIcon
                    className={classNames({
                        [menuStyle["content-icon-active"]]: isDragging
                    })}
                />

                <div className={menuStyle["second-menu-label-body"]}>
                    <div className={menuStyle["second-menu-label-content"]}>
                        <span className={menuStyle["second-menu-label"]}>{verbose}</span>
                    </div>
                    <div className={menuStyle["second-menu-describe"]}>

                    </div>
                </div>
                <YakitButton size="small" type="text2" icon={<RemoveIcon className={menuStyle['close-icon']}/>}
                             onClick={() => {
                                 const newWorkFlow = [...workFlow]
                                 newWorkFlow.splice(index, 1);
                                 setWorkFlow(newWorkFlow);
                             }}/>
            </div>
        </div>
    )
}
//自定义临时插件work
const CustomWork = (props: workProps) => {
    const {verbose, index, isDragging} = props
    const [visibleSubWork, setvisibleSubWork] = useState(false)
    const ctx = useContext(CodecCtx)
    const {workFlow, setWorkFlow} = ctx!
    if (workFlow[index].Script == null || workFlow[index].Script.trim().length === 0) {
        workFlow[index].Script = CodecPluginTemplate
    }
    let customScript = workFlow[index].Script
    return (
        <div className={menuStyle["second-menu-item-content"]}>
            <div
                className={classNames(menuStyle["second-menu-item"], {
                    [menuStyle["menu-item-drag"]]: isDragging
                })}
            >
                <DragSortIcon
                    className={classNames({
                        [menuStyle["content-icon-active"]]: isDragging
                    })}
                />
                <YakitModal
                    closable={false}
                    footer={null}
                    visible={visibleSubWork}
                    onCancel={() => setvisibleSubWork(false)}
                    width={800}
                >

                    <div className={menuStyle["subMenu-edit-modal"]}>
                        <div className={menuStyle["subMenu-edit-modal-heard"]}>
                            <div className={menuStyle["subMenu-edit-modal-title"]}>编写临时插件</div>
                            <div className={menuStyle["close-icon"]} onClick={() => setvisibleSubWork(false)}>
                                <RemoveIcon/>
                            </div>
                        </div>
                        <div className={menuStyle["subMenu-edit-modal-body"]}>
                            <div className="top" style={{height: 600}}>
                                <YakCodeEditor
                                    noTitle={true}
                                    language={"yak"}
                                    originValue={Buffer.from(customScript, "utf8")}
                                    hideSearch={true}
                                    onChange={i => {
                                        customScript = Uint8ArrayToString(i, "utf8")
                                    }}
                                    noHex={false}
                                    noHeader={true}
                                />

                            </div>
                        </div>
                        <div className={menuStyle["subMenu-edit-modal-footer"]}>
                            <YakitButton type='primary' onClick={() => {
                                workFlow[index].Script = customScript
                                setvisibleSubWork(false)
                                setWorkFlow(workFlow)
                            }}>
                                确定
                            </YakitButton>
                        </div>
                    </div>
                </YakitModal>
                <div className={menuStyle["second-menu-label-body"]}>
                    <div className={menuStyle["second-menu-label-content"]}>
                        <span className={menuStyle["second-menu-label"]}>{verbose}</span>
                        <PencilAltIcon
                            className={menuStyle["second-menu-edit-icon"]}
                            onClick={() => {
                                setvisibleSubWork(true)
                            }}
                        />
                    </div>
                    <div className={menuStyle["second-menu-describe"]}>

                    </div>
                </div>
                <YakitButton size="small" type="text2" icon={<RemoveIcon className={menuStyle['close-icon']}/>}
                             onClick={() => {
                                 const newWorkFlow = [...workFlow]
                                 newWorkFlow.splice(index, 1);
                                 setWorkFlow(newWorkFlow);
                             }}/>
            </div>
        </div>
    )
}

//社区插件work
const PluginWork = (props: workProps) => {
    const {verbose, index, isDragging} = props
    const ctx = useContext(CodecCtx)
    const {workFlow, setWorkFlow} = ctx!
    const [codecPlugin, setCodecPlugin] = useState<CodecPlugin[]>([])
    if (codecPlugin.length === 0) {
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                if (!total || total == 0) {
                    return
                }
                setCodecPlugin(i.map((script) => {
                    return {
                        value: script.ScriptName,
                        label: script.ScriptName,
                    } as CodecPlugin
                }))
            }
        )
    }

    return (
        <div className={menuStyle["second-menu-item-content"]}>
            <div
                className={classNames(menuStyle["second-menu-item"], {
                    [menuStyle["menu-item-drag"]]: isDragging
                })}
            >
                <DragSortIcon
                    className={classNames({
                        [menuStyle["content-icon-active"]]: isDragging
                    })}
                />

                <div className={menuStyle["second-menu-label-body"]}>
                    <div className={menuStyle["second-menu-label-content"]}>
                        <span className={menuStyle["second-menu-label"]}>{verbose}</span>
                    </div>
                    <div className={menuStyle["second-menu-describe"]}>
                        <Select
                            value={workFlow[index].PluginName}
                            showSearch
                            style={{width: 200}}
                            // placeholder={workFlow[index].PluginName}
                            optionFilterProp="children"
                            filterOption={(input, option) => ((option?.label as string) || "").includes(input)}
                            filterSort={(optionA, optionB) =>
                                ((optionA?.label as string) || '').toLowerCase().localeCompare(((optionB?.label as string) || '').toLowerCase())
                            }
                            onSelect={(val) => {
                                workFlow[index].PluginName = val
                            }}
                            options={codecPlugin}
                        />
                    </div>
                </div>
                <YakitButton size="small" type="text2" icon={<RemoveIcon className={menuStyle['close-icon']}/>}
                             onClick={() => {
                                 const newWorkFlow = [...workFlow]
                                 newWorkFlow.splice(index, 1);
                                 setWorkFlow(newWorkFlow);
                             }}/>
            </div>
        </div>
    )
}

//需要参数的work

const ParamsWork = (props: workProps) => {
    const {verbose, index, isDragging, type} = props
    const ctx = useContext(CodecCtx)
    const {workFlow, setWorkFlow} = ctx!
    const [visibleSubWork, setvisibleSubWork] = useState(false)
    const regexAesKey = "^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{48}|[0-9a-fA-F]{64})$"
    const regexSm4Key = "^[0-9a-fA-F]{32}$"
    let needIv = true
    let checkKeyFunc = (_, value) => {
    }
    let checkIvFunc = (_, value) => {
    }


    const parts = type.split("-")
    const alg = parts[0]
    const mode = parts[1]

    const checkFuncMaker = (reg: string, checkTarget: string) => {
        return (_, value) => {
            const regex = new RegExp(reg)
            if (!regex.test(value)) {
                return Promise.reject('不合法的' + checkTarget)
            }
            return Promise.resolve();
        }
    }

    const getRegByModeAndAlg = (alg: string, mode: string) => {
        let len = "32"
        switch (alg) {
            case "aes":
                len = "32"
                break
            case "sm4":
                len = "32"
        }
        return "^[0-9a-fA-F]{" + len + "}$"
    }

    if (alg === "aes") {
        checkKeyFunc = checkFuncMaker(regexAesKey, "key")
    } else if (alg === "sm4") {
        checkKeyFunc = checkFuncMaker(regexSm4Key, "key")
    }

    switch (mode) {
        case "ebc":
            needIv = false
            break
        default:
            checkIvFunc = checkFuncMaker(getRegByModeAndAlg(alg, mode), "iv")
    }

    //参数表单
    const [form] = Form.useForm();
    //表单布局
    const formItemLayout = {
        labelCol: {span: 8},
        wrapperCol: {span: 15},
    }
    const formTailLayout = {
        labelCol: {span: 8},
        wrapperCol: {span: 15, offset: 21},
    }

    let data = {
        key: "",
        iv: ""
    }
    for (let i = 0; i < workFlow[index].Params.length; i++) {
        let param = workFlow[index].Params[i]
        if (param.Key === "key") {
            data.key = param.Value

        } else if (param.Key === "iv") {
            data.iv = param.Value
        }
    }
    form.setFieldsValue(data)

    //更新参数
    const updateParams = () => {
        form.validateFields().then(() => {
            const values = form.getFieldsValue(['key', 'iv'])
            console.log(values)
            const newParams: encryptionParam[] = [];

            newParams.push({
                Key: "key",
                Value: values.key
            })

            if (values.iv != undefined) {
                newParams.push({
                    Key: "iv",
                    Value: values.iv
                })
            }

            workFlow[index].Params = newParams
            setvisibleSubWork(false)
            setWorkFlow(workFlow)
        }).catch((error) => {
        });
    }
    return (<div className={menuStyle["second-menu-item-content"]}>
            <div
                className={classNames(menuStyle["second-menu-item"], {
                    [menuStyle["menu-item-drag"]]: isDragging
                })}
            >
                <DragSortIcon
                    className={classNames({
                        [menuStyle["content-icon-active"]]: isDragging
                    })}
                />
                <YakitModal
                    closable={false}
                    footer={null}
                    visible={visibleSubWork}
                    onCancel={() => setvisibleSubWork(false)}
                >

                    <div className={menuStyle["subMenu-edit-modal"]}>
                        <div className={menuStyle["subMenu-edit-modal-heard"]}>
                            <div className={menuStyle["subMenu-edit-modal-title"]}>设置参数</div>
                            <div className={menuStyle["close-icon"]} onClick={() => setvisibleSubWork(false)}>
                                <RemoveIcon/>
                            </div>
                        </div>

                        <div className={menuStyle["subMenu-edit-modal-body"]}>
                            <Form form={form}>
                                <Form.Item
                                    {...formItemLayout}
                                    name="key"
                                    label="密钥（HEX 编码）"
                                    rules={[
                                        {
                                            required: true,
                                        },
                                        {
                                            validator: checkKeyFunc
                                        }
                                    ]}

                                >
                                    <YakitInput placeholder="Please input your key"/>
                                </Form.Item>
                                {needIv &&
                                    <Form.Item
                                        {...formItemLayout}
                                        name="iv"
                                        label="IV-初始块（HEX 编码）"
                                        rules={[
                                            {
                                                required: true,
                                            },
                                            {
                                                validator: checkIvFunc
                                            }
                                        ]}
                                    >
                                        <YakitInput placeholder="Please input your iv"/>
                                    </Form.Item>
                                }
                                <Form.Item {...formTailLayout}>
                                    <YakitButton type="primary" onClick={updateParams}>
                                        设置
                                    </YakitButton>
                                </Form.Item>
                            </Form>
                        </div>


                    </div>
                </YakitModal>
                <div className={menuStyle["second-menu-label-body"]}>
                    <div className={menuStyle["second-menu-label-content"]}>
                        <span className={menuStyle["second-menu-label"]}>{verbose}</span>
                        <PencilAltIcon
                            className={menuStyle["second-menu-edit-icon"]}
                            onClick={() => {
                                setvisibleSubWork(true)
                            }}
                        />
                    </div>
                </div>
                <YakitButton size="small" type="text2" icon={<RemoveIcon className={menuStyle['close-icon']}/>}
                             onClick={() => {
                                 const newWorkFlow = [...workFlow]
                                 newWorkFlow.splice(index, 1);
                                 setWorkFlow(newWorkFlow);
                             }}/>
            </div>
        </div>
    )
}

//输入框
const CodecEditor = () => {
    const [text, setText] = useState("")
    const [result, setResult] = useState("")
    const ctx = useContext(CodecCtx)
    const {workFlow} = ctx!
    const newCodec = (text: string, workFlow: work[]) => {
        if (workFlow.length == 0) {
            return
        }
        if (!text) {
            return
        }

        ipcRenderer
            .invoke("newCodec", {Text: text, WorkFlow: workFlow})
            .then((res) => {
                setResult(res?.Result || "")

            })
            .catch((err) => {
                if (err) failed(`CODEC 解码失败：${err}`)
            })
    }


    useEffect(() => {
        if (text.length === 0) {
            setResult("")
        }
        newCodec(text, workFlow)
    }, [text])

    useEffect(() => {
        newCodec(text, workFlow)
    }, [workFlow])

    return <div className={codecStyle["right"]}>
        <div className={codecStyle["top"]}>
            <YakCodeEditor
                noMinimap={true}
                noTitle={true}
                language={"text"}
                originValue={Buffer.from(text, "utf8")}
                hideSearch={true}
                onChange={i => setText(Uint8ArrayToString(i, "utf8"))}
                noHex={false}
                noHeader={true}
            />
        </div>
        <div className={codecStyle["bottom"]}>
            <YakCodeEditor
                noMinimap={true}
                noTitle={true}
                language={"text"}
                readOnly={true}
                originValue={Buffer.from(result, "utf8")}
                hideSearch={true}
                noHex={false}
                noHeader={true}
            />
        </div>
    </div>
}