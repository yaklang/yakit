import httpQueryStyles from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfig.module.scss";
import matcherStyles from "@/pages/fuzzer/MatcherAndExtractionCard/MatcherAndExtraction.module.scss";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {HollowLightningBoltIcon, PlusIcon, QuestionMarkCircleIcon, RemoveIcon, TrashIcon} from "@/assets/newIcon";
import React, {ReactNode, useContext, useEffect, useMemo, useState} from "react";
import {Button, Form, Tooltip} from "antd";
import classNames from "classnames";
import {TerminalPopover} from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfig";
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer";
import {MainOperatorContext} from "@/pages/layout/MainContext";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {YakEditor} from "@/utils/editors";
import mitmStyles from "@/pages/mitm/MITMRule/MITMRule.module.scss";
import {openExternalWebsite} from "@/utils/openWebsite";
import {RuleExportAndImportButton} from "@/pages/mitm/MITMRule/MITMRule";
import {useMemoizedFn} from "ahooks";
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect";
import {WebShellDetail} from "@/pages/webShell/models";
import {InputItem, ManyMultiSelectForString, SelectOne} from "@/utils/inputUtil";
import {YakScript} from "@/pages/invoker/schema";

import webFuzzerStyles from "@/pages/fuzzer/WebFuzzerPage/WebFuzzerPage.module.scss";
import {OutlineAdjustmentsIcon, OutlineCodeIcon, OutlineCollectionIcon, OutlineQrcodeIcon} from "@/assets/icon/outline";


interface CustomCodecValueProps {
    customCodecList: string[]
}

interface CustomCodecListProps {
    customCodecValue: CustomCodecValueProps
    onAdd: () => void
    onRemove: (index: number) => void
    onEdit: (index: number) => void
}

export const CustomCodecList: React.FC<CustomCodecListProps> = React.memo((props) => {
    const {customCodecValue, onAdd, onRemove, onEdit} = props
    const {customCodecList} = customCodecValue
    return (
        <>
            <Form.Item name='customCodec' noStyle>
                {customCodecList.map((item, index) => (
                    <div className={httpQueryStyles["matchersList-item"]} key={`${item}-${index}`}>
                        <div className={httpQueryStyles["matchersList-item-heard"]}>
                            <span className={httpQueryStyles["item-number"]}>{index}</span>
                            <span style={{"color": "#f69c5d"}}>{item}</span>
                        </div>
                        <CustomCodecListItemOperate
                            onRemove={() => onRemove(index)}
                            onEdit={() => onEdit(index)}
                            popoverContent={
                                <div>111111111111</div>
                            }
                        />
                    </div>
                ))}
            </Form.Item>
            {customCodecList?.length === 0 && (
                <Form.Item wrapperCol={{span: 24}}>
                    <YakitButton
                        type='outline2'
                        onClick={() => onAdd()}
                        icon={<PlusIcon/>}
                        className={httpQueryStyles["plus-button-bolck"]}
                        block
                    >
                        添加
                    </YakitButton>
                </Form.Item>
            )}
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
                <TerminalPopover
                    popoverContent={popoverContent}
                    visiblePopover={visiblePopover}
                    setVisiblePopover={setVisiblePopover}
                />
            </div>
        )
    }
)

interface CustomCodecEditorProps {
    resultMode: boolean
    packetMode: boolean
    title: string
    visibleDrawer: boolean
    onClose: () => void
}

export const CustomCodecEditor: React.FC<CustomCodecEditorProps> = React.memo((props) => {
    const {resultMode, packetMode, title, visibleDrawer, onClose} = props
    const {tabMenuHeight} = useContext(MainOperatorContext)
    const heightDrawer = useMemo(() => {
        return tabMenuHeight - 40
    }, [tabMenuHeight])
    const onOkImport = useMemoizedFn(() => {
        console.log("onOkImport")
    })
    const onSaveToDataBase = useMemoizedFn(() => {
        console.log("onSaveToDataBase", params)
    })
    const onExecute = useMemoizedFn(() => {
        console.log("onExecute")
    })
    const [params, setParams] = useState<YakScript>({} as YakScript)
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
                params={params}
                setParams={setParams}
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
    onClose?: () => void
    // children?: ReactNode
    type?: string
}

const CustomEditor: React.FC<CustomEditorProps> = React.memo((props) => {
    const {params, setParams, modified, packetMode, resultMode, onClose} = props
    const [enPacketValue, setEnPacketValue] = useState<string>("")
    const [dePacketValue, setDePacketValue] = useState<string>("")

    const [enPayloadValue, setEnPayloadValue] = useState<string>("")
    const [dePayloadValue, setDePayloadValue] = useState<string>("")

    const [packetCode, setPacketCode] = useState<string>("")
    const [payloadCode, setPayloadCode] = useState<string>("")

    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)
    useEffect(() => {
        setEnPacketValue(enPacketValue || defPacketEncoder)
        setDePacketValue(dePacketValue || defPacketDecoder)
        setEnPayloadValue(enPayloadValue || defPayloadEncoder)
        setDePayloadValue(dePayloadValue || defPayloadDecoder)
        setRefreshTrigger(!refreshTrigger)
    }, [enPacketValue, dePacketValue, enPayloadValue, dePayloadValue])
    const [shellScript, setShellScript] = useState<string>("")

    useEffect(() => {
        console.log("shellScript", shellScript)
        if (!shellScript) {
            console.log("!shellScript", shellScript)
            setShellScript("jsp");
        }
        if( !params.Content && params.Tags.includes("packet-encoder")) {
            setEnPacketValue(params.Content)
            setDePacketValue(params.Content)
        }
    }, []);

    // 定义一个状态变量和一个设置这个状态变量的函数
    const [selectedTab, setSelectedTab] = useState("enCoder");
    const [disabled, setDisabled] = useState(false);
// 定义一个处理点击事件的函数
    const handleTabClick = (key: string) => {
        setSelectedTab(key);
    };

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
                                {selectedTab === "enCoder" ? (packetMode ?
                                        (
                                            <YakEditor
                                                type={"yak"} noMiniMap={true}
                                                value={enPacketValue} setValue={setEnPacketValue}
                                            />
                                        ) : (
                                            <YakEditor
                                                type={"yak"} noMiniMap={true}
                                                value={dePayloadValue} setValue={setDePayloadValue}
                                            />
                                        )
                                ) : (
                                    packetMode ?
                                        (
                                            <YakEditor
                                                type={"yak"} noMiniMap={true}
                                                value={packetCode} setValue={setPacketCode}
                                            />
                                        ) : (
                                            <YakEditor
                                                type={"yak"} noMiniMap={true}
                                                value={defPayloadDecoder}
                                            />
                                        )
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
                        <Form.Item label={"脚本类型"} name={"脚本类型"} required={true}>
                            <YakitSelect
                                value={shellScript || "jsp"}
                                onSelect={(val) => {
                                    setShellScript(val)
                                    packetMode ?
                                        setParams({...params, Tags: [val, "packet-encoder"].join(",")}) :
                                        setParams({...params, Tags: [val, "result-decoder"].join(",")})
                                }}
                                autoClearSearchValue={true}
                            >
                                <YakitSelect.Option value='jsp'>JSP</YakitSelect.Option>
                                <YakitSelect.Option value='jspx'>JSPX</YakitSelect.Option>
                                <YakitSelect.Option value='php'>PHP</YakitSelect.Option>
                                <YakitSelect.Option value='asp'>ASP</YakitSelect.Option>
                                <YakitSelect.Option value='aspx'>ASPX</YakitSelect.Option>
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