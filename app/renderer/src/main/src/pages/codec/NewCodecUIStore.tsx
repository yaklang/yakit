import React, {useEffect, useMemo, useRef, useState} from "react"
import {Checkbox, CheckboxProps, Divider} from "antd"
import {DownOutlined} from "@ant-design/icons"
import {useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./NewCodecUIStore.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {CheckboxValueType} from "antd/lib/checkbox/Group"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {OutlineArrowscollapseIcon, OutlineArrowsexpandIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {IMonacoEditor, NewHTTPPacketEditor, YakEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {YakitInputProps} from "@/components/yakitUI/YakitInput/YakitInputType"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import { DefaultOptionType } from "antd/lib/select"
import { queryYakScriptList } from "../yakitStore/network"
import { YakScript } from "../invoker/schema"
import { YakParamProps } from "../plugins/pluginsType"
const {ipcRenderer} = window.require("electron")
export interface NewCodecInputUIProps extends YakitInputProps {
    // 标题
    title?: string
    extra?: React.ReactNode
    // 是否为必填
    require?: boolean
    // 左右布局时 border圆角方向
    direction?: "left" | "right"
}
export const NewCodecInputUI: React.FC<NewCodecInputUIProps> = (props) => {
    const {title, extra, require, direction, ...restProps} = props
    const [isFocus, setFocus] = useState<boolean>(false)
    const inputRef = useRef<any>(null)

    useEffect(() => {
        if (restProps.disabled) {
            setFocus(false)
        }
    }, [restProps.disabled])

    const onFocusBox = useMemoizedFn(() => {
        if (inputRef.current) {
            inputRef.current.focus()
        }
    })

    const onFocus = useMemoizedFn((e) => {
        setFocus(true)
    })

    const onBlur = useMemoizedFn((e) => {
        setFocus(false)
    })
    return (
        <div
            className={classNames(styles["new-codec-input-ui"], {
                [styles["new-codec-left-border-input-ui"]]: direction === "left"
            })}
            onClick={onFocusBox}
        >
            <div
                className={classNames(styles["main"], {
                    [styles["main-focus"]]: isFocus,
                    [styles["main-left-focus"]]: direction === "left"
                })}
            >
                <div className={styles["header"]}>
                    <div className={styles["title"]}>{title}</div>
                    {require && <div className={styles["icon"]}>*</div>}
                </div>
                <div className={styles["content"]}>
                    <YakitInput
                        onFocus={onFocus}
                        onBlur={onBlur}
                        ref={inputRef}
                        placeholder='请输入...'
                        {...restProps}
                    />
                </div>
            </div>
            {extra && <div className={styles["extra"]}>{extra}</div>}
        </div>
    )
}

export interface NewCodecCheckUIProps {
    // 是否禁用
    disabled?: boolean
    // 可供选择值
    options?: {label: string; value: string}[]
    // 选中值
    value?: CheckboxValueType[]
    onChange?: (v: CheckboxValueType[]) => void
}
export const NewCodecCheckUI: React.FC<NewCodecCheckUIProps> = (props) => {
    const {disabled, options = [], value, onChange} = props
    return (
        <div className={styles["new-codec-check-ui"]}>
            <Checkbox.Group value={value} onChange={onChange}>
                {options.map((item) => (
                    <YakitCheckbox key={item.label} value={item.value} disabled={disabled}>
                        <div className={styles["text"]}>{item.label}</div>
                    </YakitCheckbox>
                ))}
            </Checkbox.Group>
        </div>
    )
}

export interface CodecType {
    key?: string
    verbose: string
    help?: React.ReactNode
    isYakScript?: boolean
}

export interface NewCodecSelectUIProps extends YakitSelectProps {
    // 标题
    title?: string
    // 是否为必填
    require?: boolean
    // 是否可搜索
    showSearch?: boolean
    // 左右布局时 border圆角方向
    directionBox?: "left" | "right"
    // 是否启用社区插件查询
    isPlugin?: boolean
}
// 当前控件样式仅适配此尺寸 - 如需更多尺寸请自行扩展
export const NewCodecSelectUI: React.FC<NewCodecSelectUIProps> = (props) => {
    const {require, title, showSearch, directionBox, options = [],isPlugin,onSearch, ...restProps} = props
    const [show, setShow] = useState<boolean>(false)
    const [optionsList,setOptionsList] = useState<DefaultOptionType[]>(options)

    const [codecPlugin, setCodecPlugin] = useState<CodecType[]>([])
    useEffect(()=>{
        if(isPlugin){
            search()
        }
    },[])

    const search = useMemoizedFn((keyword?: string) => {
        // setPluginLoading(true)
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                const codecPlugin:CodecType[] = i.map((script) => {
                    return {
                        key: script.ScriptName,
                        help: script.Help,
                        verbose: script.ScriptName,
                        isYakScript: true
                    }
                })
                const codecPluginSelect = codecPlugin.map((item)=>({label:item.key||"",value:item.key||""}))
                setCodecPlugin(codecPlugin)
                setOptionsList(codecPluginSelect)
            },
            () => setTimeout(() => {
                // setPluginLoading(false)
            }, 300),
            10,
            undefined,
            keyword
        )
    })

    return (
        <div
            className={classNames(styles["new-codec-select-ui"], {
                [styles["new-codec-title-select-ui"]]: title,
                [styles["new-codec-no-title-select-ui"]]: !title,
                [styles["new-codec-no-title-search-select-ui"]]: showSearch&&!title,
                [styles["new-codec-title-search-select-ui"]]: showSearch&&title,
                [styles["new-codec-right-border-select-ui"]]: directionBox === "right"
            })}
        >
            {title && (
                <div className={styles["header"]}>
                    <div className={styles["title"]}>{title}</div>
                    {require && <div className={styles["icon"]}>*</div>}
                </div>
            )}
            <YakitSelect
                showSearch={showSearch}
                placeholder='请选择...'
                suffixIcon={
                    showSearch ? (
                        <div className={styles["search-icon"]}>
                            <OutlineSearchIcon />
                            {/* <DownOutlined /> */}
                        </div>
                    ) : undefined
                }
                onDropdownVisibleChange={(v) => setShow(v)}
                // wrapperClassName={style["unit-select"]}
                onSearch={(v) => {
                    if(isPlugin){
                        search(v)
                    }
                    else{
                        onSearch&&onSearch(v)
                    }
                }}
                {...restProps}
            >
                {optionsList.map((item) => (
                    <YakitSelect value={item.value}>{item.label}</YakitSelect>
                ))}
            </YakitSelect>
        </div>
    )
}
interface NewCodecEditorBodyProps extends NewCodecEditorProps {
    // 值
    editorValue: string
    setEditorValue: (v: string) => void
    // 是否是全屏
    extend: boolean
    // 全屏回调
    onExtend?: () => void
    // 缩小回调
    onClose?: () => void
    // 是否打开弹层
    isShowExtend?: boolean
}
export const NewCodecEditorBody: React.FC<NewCodecEditorBodyProps> = (props) => {
    const {
        title,
        require,
        extend,
        onExtend,
        onClose,
        isShowExtend,
        disabled,
        value = "",
        editorValue,
        setEditorValue,
        onChange
    } = props

    // 编辑器实例
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    // 编辑器焦点状态
    const [editorFocus, setEditorFocus] = useState<boolean>(false)
    // 编辑器
    useEffect(() => {
        if (reqEditor) {
            // 添加焦点获取的监听器
            reqEditor.onDidFocusEditorText(() => {
                setEditorFocus(true)
            })
            // 添加焦点失去的监听器
            reqEditor.onDidBlurEditorText(() => {
                setEditorFocus(false)
            })
        }
    }, [reqEditor])

    useEffect(() => {
        // 当弹窗编辑器更改时
        if (reqEditor&&reqEditor.getValue()!==editorValue) {
            reqEditor.setValue(editorValue)
        }
    }, [reqEditor, editorValue])

    const onFocusEditor = useMemoizedFn(() => {
        if (disabled) return
        reqEditor && reqEditor.focus()
    })

    const onOperate = useMemoizedFn((e) => {
        e.stopPropagation()
        if (disabled) return
        if (extend) {
            onClose && onClose()
        } else {
            onExtend && onExtend()
        }
    })

    const editorContChange = useDebounceFn(
        (content) => {
            const str = Uint8ArrayToString(content)
            setEditorValue(str)
        },
        {wait: 100}
    ).run

    return (
        <div
            className={classNames(styles["new-codec-editor"], {
                [styles["new-codec-editor-no-extend"]]: !extend,
                [styles["new-codec-editor-extend"]]: extend,
                [styles["new-codec-editor-focus"]]: editorFocus
            })}
            onClick={onFocusEditor}
        >
            <div className={styles["header"]}>
                <div className={styles["title"]}>
                    {title}
                    {require && <div className={styles["icon"]}>*</div>}
                </div>
                <div className={styles["extra"]}>
                    <div
                        className={classNames(styles["apply"], {
                            [styles["apply-disabled"]]: editorValue === value || disabled
                        })}
                        onClick={(e) => {
                            e.stopPropagation()
                            onChange && onChange(editorValue)
                        }}
                    >
                        应用
                    </div>
                    <Divider
                        type={"vertical"}
                        style={extend ? {margin: "4px 10px 0px 14px"} : {margin: "4px 4px 0px 8px"}}
                    />
                    <div
                        className={classNames(styles["expand-box"], {
                            [styles["expand-hover-box"]]: !disabled,
                            [styles["expand-disabled-box"]]: disabled
                        })}
                        onClick={onOperate}
                    >
                        {extend ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                    </div>
                </div>
            </div>
            <div className={styles["editor-box"]}>
                <NewHTTPPacketEditor
                    language={"yak"}
                    onEditor={(editor) => {
                        setReqEditor(editor)
                    }}
                    disabled={disabled}
                    noHeader={true}
                    originValue={StringToUint8Array(editorValue)}
                    onChange={editorContChange}
                />
            </div>
        </div>
    )
}

export interface NewCodecEditorProps {
    // 标题
    title?: string
    // 值
    value?: string
    // 值变化的回调
    onChange?: (v: string) => void
    // 是否为必填
    require?: boolean
    // 是否禁用
    disabled?: boolean
}
export const NewCodecEditor: React.FC<NewCodecEditorProps> = (props) => {
    const {value = ""} = props
    const [editorValue, setEditorValue] = useState<string>("")
    // 是否打开弹层
    const [isShowExtend, setShowExtend] = useState<boolean>(false)
    useEffect(() => {
        setEditorValue(value)
    }, [value])
    
    return (
        <>
            <NewCodecEditorBody
                isShowExtend={isShowExtend}
                editorValue={editorValue}
                setEditorValue={setEditorValue}
                extend={false}
                onExtend={()=>setShowExtend(true)}
                {...props}
            />
            {isShowExtend&&<YakitModal
                title={null}
                footer={null}
                width={1200}
                type={"white"}
                closable={false}
                maskClosable={false}
                hiddenHeader={true}
                visible={isShowExtend}
                bodyStyle={{padding: 0}}
            >
                <NewCodecEditorBody
                    extend={true}
                    onClose={() => {
                        setShowExtend(false)
                    }}
                    editorValue={editorValue}
                    setEditorValue={(str) => {
                        setEditorValue(str)
                    }}
                    {...props}
                />
            </YakitModal>}
        </>
    )
}
