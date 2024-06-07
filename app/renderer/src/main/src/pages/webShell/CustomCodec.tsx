import httpQueryStyles from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfig.module.scss";
import matcherStyles from "@/pages/fuzzer/MatcherAndExtractionCard/MatcherAndExtraction.module.scss";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {
    HollowLightningBoltIcon,
    QuestionMarkCircleIcon,
    RemoveIcon,
    TerminalIcon,
    TrashIcon
} from "@/assets/newIcon";
import React, {ReactNode, useContext, useEffect, useMemo, useState} from "react";
import {Form, Tooltip} from "antd";
import classNames from "classnames";
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer";

import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {YakEditor} from "@/utils/editors";
import mitmStyles from "@/pages/mitm/MITMRule/MITMRule.module.scss";
import {openExternalWebsite} from "@/utils/openWebsite";
import {RuleExportAndImportButton} from "@/pages/mitm/MITMRule/MITMRule";
import {useDebounceEffect, useGetState, useMemoizedFn} from "ahooks";
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect";
import {InputItem, ManyMultiSelectForString, SelectOne} from "@/utils/inputUtil";
import {YakScript} from "@/pages/invoker/schema";

import webFuzzerStyles from "@/pages/fuzzer/WebFuzzerPage/WebFuzzerPage.module.scss";
import {OutlineAdjustmentsIcon, OutlineCodeIcon, OutlineCollectionIcon, OutlineQrcodeIcon} from "@/assets/icon/outline";

import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor";
import style from "@/pages/customizeMenu/CustomizeMenu.module.scss";
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover";
import {failed, info, success, warn} from "@/utils/notification";
import {ShellScript} from "@/pages/webShell/models";
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"

const {ipcRenderer} = window.require("electron")

interface CustomCodecListProps {
    customCodecList: YakScript[]
    onAdd?: () => void
    onRemove: (index: number) => void
    onEdit: (index: number) => void
}

export const CustomCodecList: React.FC<CustomCodecListProps> = React.memo((props) => {
    const {customCodecList, onAdd, onRemove, onEdit} = props
    return (
        <>
            <Form.Item name='customCodec' noStyle>
                {customCodecList.map((item, index) => (
                    <div className={httpQueryStyles["matchersList-item"]} key={`${item}-${index}`}>
                        <div className={httpQueryStyles["matchersList-item-heard"]}>
                            <span className={httpQueryStyles["item-number"]}>{index}</span>
                            <span style={{"color": "#f69c5d"}}>{item.ScriptName}</span>
                            <span className={httpQueryStyles["item-number"]}>
                                {

                                    (item.Tags||"").split(",").filter((i) => i !== "webshell-packet-codec" && i !== "webshell-payload-codec").join(",")
                                }
                            </span>

                        </div>
                        <CustomCodecListItemOperate
                            onRemove={() => onRemove(index)}
                            onEdit={() => onEdit(index)}
                            popoverContent={
                                <YakitEditor type={"yak"} value={item.Content} readOnly={true}/>
                            }
                        />
                    </div>
                ))}
            </Form.Item>
            {/*{(*/}
            {/*    <Form.Item wrapperCol={{span: 24}}>*/}
            {/*        <YakitButton*/}
            {/*            type='outline2'*/}
            {/*            onClick={() => onAdd()}*/}
            {/*            icon={<PlusIcon/>}*/}
            {/*            className={httpQueryStyles["plus-button-bolck"]}*/}
            {/*            block*/}
            {/*        >*/}
            {/*            添加*/}
            {/*        </YakitButton>*/}
            {/*    </Form.Item>*/}
            {/*)}*/}
        </>
    )
})

interface CustomCodecListItemOperateProps {
    onRemove: () => void
    onEdit: () => void
    popoverContent: ReactNode
}

const CustomCodecListItemOperate: React.FC<CustomCodecListItemOperateProps> = React.memo(
    (props) => {
        const {onRemove, onEdit, popoverContent} = props
        const [visiblePopover, setVisiblePopover] = useState<boolean>(false)
        return (
            <div
                className={classNames(httpQueryStyles["matchersList-item-operate"], {
                    [httpQueryStyles["matchersList-item-operate-hover"]]: visiblePopover
                })}
            >
                <TrashIcon className={httpQueryStyles["trash-icon"]} onClick={() => onRemove()}/>

                <Tooltip title='调试'>
                    <HollowLightningBoltIcon
                        className={httpQueryStyles["hollow-lightningBolt-icon"]}
                        onClick={() => {
                            onEdit()
                        }}
                    />
                </Tooltip>
                {/*<TerminalPopover*/}
                {/*    popoverContent={popoverContent}*/}
                {/*    visiblePopover={visiblePopover}*/}
                {/*    setVisiblePopover={setVisiblePopover}*/}
                {/*/>*/}
                <YakitPopover
                    placement='topRight'
                    overlayClassName={style["terminal-popover"]}
                    content={popoverContent}
                >
                    <TerminalIcon className={style["plugin-local-icon"]}/>
                </YakitPopover>
            </div>
        )
    }
)

interface CustomCodecEditorProps {
    currCodec: YakScript
    setCurrCodec: (y: YakScript) => void
    resultMode: boolean
    packetMode: boolean
    addAction: boolean
    editAction: boolean
    onchange: boolean
    setOnchange: (b: boolean) => void
    title: string
    visibleDrawer: boolean
    onClose: () => void
}

export const CustomCodecEditor: React.FC<CustomCodecEditorProps> = React.memo((props) => {
    const {
        currCodec,
        setCurrCodec,
        addAction,
        editAction,
        resultMode,
        packetMode,
        onchange,
        setOnchange,
        title,
        visibleDrawer,
        onClose
    } = props
    const {menuBodyHeight} = usePageInfo(
        (s) => ({
            menuBodyHeight: s.menuBodyHeight
        }),
        shallow
    )
    const heightDrawer = useMemo(() => {
        return menuBodyHeight.firstTabMenuBodyHeight - 40
    }, [menuBodyHeight.firstTabMenuBodyHeight])
    const onOkImport = useMemoizedFn(() => {
    })
    const onSaveToDataBase = useMemoizedFn(() => {
        if (!currCodec.ScriptName) {
            warn("请输入插件模块名!")
            return
        }
        if (!currCodec.Content || (currCodec.Tags||"").split(",").length != 2) {

            warn("请输入插件内容/选择类型!")
            return
        }
        ipcRenderer
            .invoke("SaveYakScript", { ...currCodec, Type: "codec" })
            .then((data) => {
                success(`创建 / 保存 ${title} 脚本成功`)
                setCurrCodec(data)
                setOnchange(!onchange)
                setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
            })
            .catch((e: any) => {
                failed(`保存 Yak ${title} 失败: ${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    onClose()
                }, 200)
            })
    })
    const onExecute = useMemoizedFn(() => {
    })

    const [modified, setModified] = useState<YakScript | undefined>()

    return (
        <YakitDrawer
            placement='bottom'
            closable={false}
            onClose={() => onClose()}
            visible={visibleDrawer}
            mask={false}
            destroyOnClose={true}
            style={{height: visibleDrawer ? heightDrawer : 0}}
            className={classNames(mitmStyles["mitm-rule-drawer"])}
            contentWrapperStyle={{boxShadow: "0px -2px 4px rgba(133, 137, 158, 0.2)"}}
            title={<div className={mitmStyles["heard-title"]}>{title}</div>}
            extra={
                <div className={mitmStyles["heard-right-operation"]}>
                    <RuleExportAndImportButton onOkImport={onOkImport}/>
                    <YakitButton
                        type='outline1'
                        onClick={() => onExecute()}
                        className={mitmStyles["button-question"]}
                        size={"small"}
                    >
                        调试执行
                    </YakitButton>
                    <YakitButton
                        type='primary'
                        className={mitmStyles["button-save"]}
                        onClick={() => onSaveToDataBase()}
                    >
                        保存
                    </YakitButton>
                    <Tooltip title='官方网站' placement='top' overlayClassName={mitmStyles["question-tooltip"]}>
                        <YakitButton
                            type='outline2'
                            className={mitmStyles["button-question"]}
                            onClick={() => openExternalWebsite("https://www.yaklang.com/")}
                            icon={<QuestionMarkCircleIcon/>}
                        >
                        </YakitButton>
                    </Tooltip>
                    <div onClick={() => onClose()} className={mitmStyles["icon-remove"]}>
                        <RemoveIcon/>
                    </div>
                </div>
            }
        >
            <CustomEditor
                params={currCodec}
                setParams={setCurrCodec}
                addAction={addAction}
                editAction={editAction}
                modified={modified}
                resultMode={resultMode}
                packetMode={packetMode}
            />
        </YakitDrawer>
    )
})


const defPacketEncoder = `
wsmPacketEncoder = func(reqBody) {
    jsonStr := '{"id":"1","body":{"user":"lucky"}}'
    jsonStr = '{"go0p":"1",asdfakhj,"body":{"user":"lucky"}}'
    encodedData := codec.EncodeBase64(reqBody)
    //encodedData = strings.ReplaceAll(encodedData, "+", "<")
    //encodedData = strings.ReplaceAll(encodedData, "/", ">")
    encodedData = str.ReplaceAll(encodedData, "+", "go0p")
    encodedData = str.ReplaceAll(encodedData, "/", "yakit")
    jsonStr = str.ReplaceAll(jsonStr, "lucky", encodedData)
    return []byte(jsonStr)
}
`

const defPacketDecoder = `
// 写在生成的 WebShell 代码中
// 本质上这个函数是为了准确获取 payload 的值
// 比如说，我的数据包编码器是给 payload 前面添加随机字符串
// 那么这个函数就是为了减去随机的字符串获取 payload 的值
// 比如 payload 是 "abcdef"，编码器给它加了 "Yakit"，
// 数据包如下
// POST /1.jsp HTTP/1.1
// Content-Type: application/json
// Host: www.example.com
//
// Yakitabcdef

// 那这个解码器需要使用对应的 shell 语言来去掉 "Yakit"
`

const defPayloadEncoder = `
wsmPayloadEncoder = func(reqBody) {
    return "yv66"
}

`

const defPayloadDecoder = `
wsmPayloadDecoder = func(reqBody) {
    jsonStr := '{"id":"1","body":{"user":"lucky"}}'
    jsonStr = '{"go0p":"1",asdfakhj,"body":{"user":"lucky"}}'
    encodedData := codec.EncodeBase64(reqBody)
    //encodedData = strings.ReplaceAll(encodedData, "+", "<")
    //encodedData = strings.ReplaceAll(encodedData, "/", ">")
    encodedData = str.ReplaceAll(encodedData, "+", "go0p")
    encodedData = str.ReplaceAll(encodedData, "/", "yakit")
    jsonStr = str.ReplaceAll(jsonStr, "lucky", encodedData)
    return []byte(jsonStr)
}
`

const webFuzzerTabs = [
    {
        key: "enCoder",
        label: "编码器",
        icon: <OutlineCodeIcon/>
    },
    {
        key: "deCoder",
        label: "解码器",
        icon: <OutlineQrcodeIcon/>
    }
]

interface CustomEditorProps {
    params: YakScript
    setParams: (y: YakScript) => void
    modified?: YakScript | undefined
    resultMode: boolean
    packetMode: boolean
    addAction: boolean
    editAction: boolean
    onClose?: () => void
    // children?: ReactNode
    type?: string
}

const CustomEditor: React.FC<CustomEditorProps> = React.memo((props) => {
    const {params, setParams, modified, addAction, editAction, packetMode, resultMode, onClose} = props
    const [enPacketValue, setEnPacketValue] = useState<string>("")
    const [dePacketValue, setDePacketValue] = useState<string>("")

    const [enPayloadValue, setEnPayloadValue] = useState<string>("")
    const [dePayloadValue, setDePayloadValue] = useState<string>("")


    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)
    useEffect(() => {
        if (addAction) {
            setEnPacketValue(defPacketEncoder)
            setDePacketValue(defPacketDecoder)
            setEnPayloadValue(defPayloadEncoder)
            setDePayloadValue(defPayloadDecoder)
        } else if (editAction) {
            let codec = params.Content.split("##############################################")
            if (packetMode && codec.length === 2) {
                setEnPacketValue(codec[0])
                setDePacketValue(codec[1])
            }
            if (resultMode && codec.length === 2) {
                setEnPayloadValue(codec[0])
                setDePayloadValue(codec[1])
            }
        }
        setRefreshTrigger(!refreshTrigger)
    }, [])

    useDebounceEffect(() => {
        if (packetMode) {
            setParams({
                ...params,
                Content: [enPacketValue, dePacketValue].join("\n##############################################")
            });
        } else {
            setParams({
                ...params,
                Content: [enPayloadValue, dePayloadValue].join("\n##############################################")
            });
        }
    }, [enPacketValue, dePacketValue, enPayloadValue, dePayloadValue]);
    const [shellScript, setShellScript] = useState<string>("")

    useEffect(() => {
        let ss =( params.Tags|| "").split(",").filter((item) => item !== "webshell-packet-codec" && item !== "webshell-payload-codec").join(",");
        if (ss) {
            setShellScript(ss);
        }
    }, [shellScript]);

    // 定义一个状态变量和一个设置这个状态变量的函数
    const [selectedTab, setSelectedTab] = useState("enCoder");
    const [disabled, setDisabled] = useState(false);
// 定义一个处理点击事件的函数
    const handleTabClick = (key: string) => {
        setSelectedTab(key);
    };

    useEffect(() => {
        // setShellScript("")
    }, [])

    return (
        <div className={matcherStyles["matching-extraction-resize-box"]} style={{display: 'flex'}}>
            <YakitResizeBox
                freeze={false}
                firstNode={
                    <>
                        <div className={webFuzzerStyles["web-fuzzer"]} style={{"height": "100%"}}>
                            <div className={webFuzzerStyles["web-fuzzer-tab"]}>
                                {webFuzzerTabs.map((item) => (
                                    <div
                                        key={item.key}
                                        className={classNames(webFuzzerStyles["web-fuzzer-tab-item"], {
                                            [webFuzzerStyles["web-fuzzer-tab-item-active"]]: selectedTab === item.key
                                        })}
                                        onClick={() => {
                                            handleTabClick(item.key)
                                        }}
                                    >
                                        <span className={webFuzzerStyles["web-fuzzer-tab-label"]}>{item.label}</span>
                                        {item.icon}
                                    </div>
                                ))}
                            </div>
                            <div
                                className={classNames(webFuzzerStyles["web-fuzzer-tab-content"])}>
                                {
                                    selectedTab === "enCoder" ? (
                                        <YakEditor
                                            key={selectedTab}
                                            type={"yak"} value={packetMode ? enPacketValue : enPayloadValue}
                                            setValue={packetMode ? setEnPacketValue : setEnPayloadValue}
                                        />
                                    ) : (
                                        <YakEditor
                                            key={selectedTab}
                                            type={"yak"} value={packetMode ? dePacketValue : dePayloadValue}
                                            setValue={packetMode ? setDePacketValue : setDePayloadValue}
                                        />
                                    )
                                }
                            </div>
                        </div>
                    </>

                }
                secondNode={
                    <Form
                        labelCol={{span: 5}}
                        wrapperCol={{span: 14}}
                    >
                        <InputItem
                            label={"名称"}
                            required={true}
                            setValue={(ScriptName) => setParams({...params, ScriptName})}
                            value={params.ScriptName}
                            disable={disabled}
                        />
                        <Form.Item label={"脚本类型"}>
                            <YakitSelect
                                value={shellScript}
                                onSelect={(val) => {
                                    setShellScript(val)
                                    packetMode ?
                                        setParams({...params, Tags: [val, "webshell-packet-codec"].join(",")}) :
                                        setParams({...params, Tags: [val, "webshell-payload-codec"].join(",")})
                                }}
                            >
                                <YakitSelect.Option value={ShellScript.JSP}>JSP</YakitSelect.Option>
                                <YakitSelect.Option value={ShellScript.JSPX}>JSPX</YakitSelect.Option>
                                <YakitSelect.Option value={ShellScript.PHP}>PHP</YakitSelect.Option>
                                <YakitSelect.Option value={ShellScript.ASP}>ASP</YakitSelect.Option>
                                <YakitSelect.Option value={ShellScript.ASPX}>ASPX</YakitSelect.Option>
                            </YakitSelect>
                        </Form.Item>

                        <InputItem
                            label={"简要描述"}
                            setValue={(Help) => setParams({...params, Help})}
                            value={params.Help}
                            disable={disabled}
                        />
                        <InputItem
                            label={"作者"}
                            setValue={(Author) => setParams({...params, Author})}
                            value={params.Author}
                            disable={disabled}
                        />

                        <ManyMultiSelectForString
                            label={"Tags"}
                            data={[]}
                            mode={"tags"}
                            setValue={(Tags) => setParams({...params, Tags})}
                            value={params.Tags && params.Tags !== "null" ? params.Tags : ""}
                            disabled={disabled}
                        />


                    </Form>
                }
                secondNodeStyle={{paddingLeft: 5, paddingTop: 15}}
            />
        </div>
    )
})