import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AutoCard } from "@/components/AutoCard";
import { Avatar, Button, Form, Menu, Popconfirm, Progress, Space, Tag } from "antd";
import { StringToUint8Array, Uint8ArrayToString } from "@/utils/str";
import "./style.css"
import { YakCodeEditor } from "@/utils/editors";
import { DragPreviewImage, useDrag } from "react-dnd";
import { YakExecutorParam } from "@/pages/invoker/YakExecutorParams";
import { CodecType } from "@/pages/codec/CodecPage";
import { YakScriptParam } from "@/pages/invoker/schema";
import { map } from "rxjs/operators";
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton";
import { failed } from "@/utils/notification";
import { worker } from "monaco-editor";
import { SecondMenuItemProps } from "@/pages/customizeMenu/CustomizeMenuType";
import { isCommunityEdition } from "@/utils/envfile";
import menuStyle from "@/pages/customizeMenu/CustomizeMenu.module.scss";
import { PrivateOutlineDefaultPluginIcon } from "@/routes/privateIcon";
import classNames from "classnames";
import { DragSortIcon, PencilAltIcon, RemoveIcon } from "@/assets/newIcon";
import { YakitRoute } from "@/routes/newRoute";
import { YakitInput } from "@/components/yakitUI/YakitInput/YakitInput";
import { YakitModal } from "@/components/yakitUI/YakitModal/YakitModal";
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import {useCreation, useDebounceEffect, useHover, useMemoizedFn, useThrottleFn} from "ahooks"
import {EnhancedPrivateRouteMenuProps} from "@/pages/layout/HeardMenu/HeardMenuType";
export interface NewCodecPageProp {

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
            { key: "sm4-cbc-encrypt",verbose: "SM4-CBC 加密",},
             {key: "sm4-cbc-decrypt",verbose: "SM4-CBC 解密",},
             {key: "sm4-cfb-encrypt",verbose: "SM4-CFB 加密",},
             {key: "sm4-cfb-decrypt",verbose: "SM4-CFB 解密",},
             {key: "sm4-ebc-encrypt",verbose: "SM4-EBC 加密",},
             {key: "sm4-ebc-decrypt",verbose: "SM4-EBC 解密",},
             {key: "sm4-ofb-encrypt",verbose: "SM4-OFB 加密",},
             {key: "sm4-ofb-decrypt",verbose: "SM4-OFB 解密",},
             {key: "sm4-gcm-encrypt",verbose: "SM4-GCM 加密",},
             {key: "sm4-gcm-decrypt",verbose: "SM4-GCM 解密",}
        ]
    },
    {
        verbose: "AES对称加解密",
        subTypes: [
             {key: "aes-cbc-encrypt",verbose: "AES-CBC 加密",},
             {key: "aes-cbc-decrypt",verbose: "AES-CBC 解密",},
             {key: "aes-gcm-encrypt",verbose: "AES-GCM 加密",},
             {key: "aes-gcm-decrypt",verbose: "AES-GCM 解密",}
        ]
    },
    {
        verbose: "Java",
        subTypes: [
            { key: "java-unserialize-hex-dumper", verbose: "反序列化(SerialDumper)" },
            { key: "java-unserialize-hex", verbose: "反序列化 Java 对象流(hex)" },
            { key: "java-unserialize-base64", verbose: "反序列化 Java 对象流(base64)" },
            { key: "java-serialize-json", verbose: "Java 对象流序列化（JSON=>HEX）" }
        ]
    },
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
        verbose: "计算(HASH)",
        subTypes: [
            { key: "md5", verbose: "计算 md5" },
            { key: "sm3", verbose: "计算 SM3(国密3)" },
            { key: "sha1", verbose: "计算 Sha1" },
            { key: "sha256", verbose: "计算 Sha256" },
            { key: "sha512", verbose: "计算 Sha512" }
        ]
    },
    {
        verbose: "Json处理",
        subTypes: [
            { key: "json-formatter", verbose: "JSON 美化（缩进4）" },
            { key: "json-formatter-2", verbose: "JSON 美化（缩进2）" },
            { key: "json-inline", verbose: "JSON 压缩成一行" }
        ]
    },
    {
        verbose: "美化",
        subTypes: [
            { key: "pretty-packet", verbose: "HTTP 数据包美化" },
            { key: "json-formatter", verbose: "JSON 美化（缩进4）" },
            { key: "json-formatter-2", verbose: "JSON 美化（缩进2）" },
            { key: "json-inline", verbose: "JSON 压缩成一行" }
        ]
    },
    {
        verbose: "HTTP",
        subTypes: [
            { key: "http-get-query", verbose: "解析 HTTP 参数" },
            { key: "pretty-packet", verbose: "HTTP 数据包美化" },
            { key: "packet-from-url", verbose: "从 URL 中加载数据包" },
            { key: "packet-to-curl", verbose: "数据包转 CURL 命令" },
        ]
    },
    {
        verbose: "模糊测试(标签同 Web Fuzzer)",
        subTypes: [
            { key: "fuzz", verbose: "模糊测试(标签同 Web Fuzzer)" },
        ]
    },
    {
        verbose: "Codec插件与临时插件",
        subTypes: [
            { key: "custom-script", verbose: "临时插件" },
            { key: "plugin", verbose: "Codec插件" }
        ]
    },
    {
        verbose: "JWT解析与弱密码",
        subTypes: [
            { key: "jwt-parse-weak", verbose: "JWT解析与弱密码" }
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
    ["sm4-cbc-encrypt","SM4-CBC 加密"],
    ["sm4-cbc-decrypt","SM4-CBC 解密"],
    ["sm4-cfb-encrypt","SM4-CFB 加密"],
    ["sm4-cfb-decrypt","SM4-CFB 解密"],
    ["sm4-ebc-encrypt","SM4-EBC 加密"],
    ["sm4-ebc-decrypt","SM4-EBC 解密",],
    ["sm4-ofb-encrypt","SM4-OFB 加密"],
    ["sm4-ofb-decrypt","SM4-OFB 解密"],
    ["sm4-gcm-encrypt","SM4-GCM 加密"],
    ["sm4-gcm-decrypt","SM4-GCM 解密"],
    ["aes-cbc-encrypt", "AES-CBC 加密"],
    ["aes-cbc-decrypt", "AES-CBC 解密"],
    ["aes-gcm-encrypt", "AES-GCM 加密"],
    ["aes-gcm-decrypt", "AES-GCM 解密"]
])





interface work {
    CodecType: string
    Script: string
    PluginName: string
    Params: YakExecutorParam[]
}




const { ipcRenderer } = window.require("electron");

const CodecCtx = createContext<{
    workFlow: work[],
    setWorkFlow: (workFlow: work[]) => void,
} | null>(null);



export const NewCodecPage: React.FC<NewCodecPageProp> = (props) => {
    const [openIndex, setOpenIndex] = useState(-1);
    // const ctx = useContext(CodecCtx)
    // const {workFlow,setWorkFlow} = ctx!
    // const onDragEnd = useMemoizedFn((result) => {
    //     if (result.destination.droppableId === "workList") {
    //         if(result.source.droppableId === "workList"){
    //             const [remove] = workFlow.splice(result.source.index, 1);
    //             workFlow.splice(result.destination.index, 0, remove);
    //             setWorkFlow(workFlow)
    //         }
    //         if(codecAllList[result.source.droppableId] !== undefined){
    //             const type = codecAllList[result.source.droppableId].subTypes![result.source.index].key
    //             const itemWork: work = {
    //                 CodecType: type,
    //                 Script: "",
    //                 PluginName:"",
    //                 Params: []
    //             }
    //             workFlow.splice(result.destination.index, 0,itemWork);
    //             setWorkFlow(workFlow)
    //         }
    //     }
    // })


    return  <Context>
        <div className="container">
            <div className="left">
                {codecAllList.map((item, index) => (
                    <CodecTypeList key={index} dateItem={item.subTypes} title={item.verbose} isOpen={openIndex == index} onclick={() => (index == openIndex) ? setOpenIndex(-1) : setOpenIndex(index)}></CodecTypeList>
                ))}
            </div>

            <div className="center" style={{ overflow: "auto" }}>
                <CodecWorkFlow></CodecWorkFlow>
            </div>
            <CodecEditor></CodecEditor>
        </div>

    </Context>
};



//Context组件
function Context({ children }) {
    const [workFlow, setWorkFlow] = useState<work[]>([]);

    return (
        <CodecCtx.Provider value={{ workFlow, setWorkFlow }}>
            {children}
        </CodecCtx.Provider>
    );
}

//CodecTypeList 所有的Codec选项
const CodecTypeList = ({ title, dateItem, isOpen, onclick ,key}) => {
    return (
        <div className={`codec-item ${isOpen ? 'open' : ''}`}>
            <AutoCard size='small' bordered={false}>
                <a onClick={onclick}>{title}</a>
            </AutoCard>
            {isOpen && <CodecTypeItem codecDate={dateItem} listKey={key}></CodecTypeItem>}
        </div>
    );
};

const CodecTypeItem = ({ codecDate,listKey }) => {
    const [selectedKeys, setSelectedKeys] = useState([]);
    const ctx = useContext(CodecCtx)

    const { workFlow, setWorkFlow } = ctx!
    return <Menu selectedKeys={selectedKeys}>
        {codecDate.map((date, index) => (

            // <Draggable key={index} draggableId={listKey} index={index}>
            //     {(provided, snapshot) => (
            //         <div
            //             ref={provided.innerRef}
            //             {...provided.draggableProps}
            //             {...provided.dragHandleProps}
            //         >
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
                //     </div>
                // )}
            // </Draggable>


        ))}
    </Menu>
}

//WorkFlow Codec工作流
const CodecWorkFlow = () => {
    const ctx = useContext(CodecCtx)
    const { workFlow, setWorkFlow } = ctx!

    return (
        <div className={menuStyle["second-menu"]}>
            <div className={menuStyle["second-menu-list"]}>
                {workFlow.map((item, index) => {
                    return <CodecWork index={index} type={item.CodecType}></CodecWork>
            })}
            </div>
        </div>
    )
}


interface workProps {
    type: string
    index: number
}

const CodecWork: React.FC<workProps> = React.memo((props) => {
    const ctx = useContext(CodecCtx)
    const { type, index } = props
    const verbose = AllTypeMap.get(type)
    const { workFlow, setWorkFlow } = ctx!
    const [visibleSubWork, setvisibleSubWork] = useState(false)
    const [needCode, setNeedCode] = useState(false)
    const [needParam, setNeedParam] = useState(false)
    const [needPlugin,setNeedPlugin] = useState(false)

    switch (type) {
        case 'custom-script':
            setNeedCode(true)
            break
        case 'plugin':
            setNeedPlugin(true)
            break
        default:
            if(type.includes("sm4") || type.includes("aes")) {
                setNeedParam(true)
            }
    }


    return (
        <div className={menuStyle["second-menu-item-content"]}>
            <div
                className={classNames(menuStyle["second-menu-item"], {
                    [menuStyle["menu-item-drag"]]: false
                })}
            >
                <DragSortIcon
                    className={classNames({
                        [menuStyle["content-icon-active"]]: true
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
                            <div className={menuStyle["subMenu-edit-modal-title"]}>修改菜单名称</div>
                            <div className={menuStyle["close-icon"]} onClick={() => setvisibleSubWork(false)}>
                                <RemoveIcon />
                            </div>
                        </div>
                        <div className={menuStyle["subMenu-edit-modal-body"]}>
                            <YakitInput.TextArea
                                autoSize={{ minRows: 3, maxRows: 3 }}
                                showCount
                                value={"test"}
                                maxLength={50}
                            />
                        </div>
                        <div className={menuStyle["subMenu-edit-modal-footer"]}>
                            <YakitButton
                                type='outline2'
                                onClick={() => {
                                    setvisibleSubWork(false)
                                }}
                            >
                                取消
                            </YakitButton>
                            <YakitButton type='primary' onClick={() => {
                                setvisibleSubWork(false)
                            }} >
                                确定
                            </YakitButton>
                        </div>
                    </div>
                </YakitModal>
                <div className={menuStyle["second-menu-label-body"]}>
                    <div className={menuStyle["second-menu-label-content"]}>
                        <span className={menuStyle["second-menu-label"]}>{verbose}</span>
                        { (needCode || needParam) &&(
                            <PencilAltIcon
                                className={menuStyle["second-menu-edit-icon"]}
                                onClick={() => {
                                    setvisibleSubWork(true)
                                }}
                            />
                        )}
                    </div>
                    <div className={menuStyle["second-menu-describe"]}>

                    </div>
                </div>
                <div className={menuStyle["close-icon"]} onClick={() => {
                    const newWorkFlow = [...workFlow]
                    newWorkFlow.splice(index, 1);
                    setWorkFlow(newWorkFlow);
                }}>
                    <RemoveIcon />
                </div>
            </div>
        </div>
    )
})



//输入框
const CodecEditor = () => {
    const [text, setText] = useState("")
    const [result, setResult] = useState("")
    const ctx = useContext(CodecCtx)
    const { workFlow } = ctx!
    const newCodec = (text: string, workFlow: work[]) => {
        if (workFlow.length == 0) {
            return
        }
        if (!text) {
            return
        }

        ipcRenderer
            .invoke("newCodec", { Text: text, WorkFlow: workFlow })
            .then((res) => {
                setResult(res?.Result || "")

            })
            .catch((err) => {
                if (err) failed(`CODEC 解码失败：${err}`)
            })
    }


    useEffect(() => {
        newCodec(text, workFlow)
    }, [text])

    useEffect(() => {
        newCodec(text, workFlow)
    }, [workFlow])

    return <div className="right">
        <div className="top">
            <YakCodeEditor
                noTitle={true}
                language={"text"}
                originValue={Buffer.from(text, "utf8")}
                hideSearch={true}
                onChange={i => setText(Uint8ArrayToString(i, "utf8"))}
                noHex={false}
                noHeader={true}
            />
        </div>
        <div className="bottom">
            <YakCodeEditor
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