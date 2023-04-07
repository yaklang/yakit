import React, {CSSProperties, useEffect, useRef, useState} from "react";
import {
    AutoComplete,
    Button,
    Checkbox,
    Col,
    Form,
    Input,
    InputNumber,
    Popover,
    Radio,
    Row,
    Select,
    Spin,
    Switch,
    Tag, Tooltip,
    Typography,
    Upload
} from 'antd';
import '@ant-design/compatible/assets/index.css';
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons"
import TimeRange, {TimePoint} from "./timeRange";
import {CheckboxOptionType} from "antd/lib/checkbox";
import {CheckboxValueType} from "antd/es/checkbox/Group";
import "./editableTagsGroup.css"
import {randomColor} from "./randomUtil";
import {LiteralUnion} from "antd/lib/_util/type";
import {FormItemProps} from "@ant-design/compatible/lib/form";
import "./inputUtil.scss";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons";
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch";

export interface OneLineProp {
    width?: string | number
    overflow?: string
    maxWidth?: string | any
    title?: string
    children?: React.ReactNode
}

export const OneLine: React.FC<OneLineProp> = (props) => {
    return <div
        style={{
            whiteSpace: "nowrap",
            width: props.width,
            overflow: props.overflow || "auto",
            maxWidth: props.maxWidth,
            textOverflow: "ellipsis"// props.overflow === "hidden" ? "ellipsis" : undefined
        }}>
        {props?.title ? <Tooltip title={props.title}>
            {props.children}
        </Tooltip> : props.children}
    </div>
};

const {Item} = Form;

export interface InputItemProps {
    label: string | any
    value?: string
    placeholder?: string
    disable?: boolean
    required?: boolean
    help?: string | any

    setValue?(s: string): any

    autoComplete?: string[]
    type?: LiteralUnion<'button' | 'checkbox' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit' | 'tel' | 'text' | 'time' | 'url' | 'week', string>
    width?: string | number
    style?: React.CSSProperties
    extraFormItemProps?: FormItemProps
    textarea?: boolean
    textareaRow?: number
    textareaCol?: number
    autoSize?: boolean | object
    allowClear?: boolean

    prefix?: React.ReactNode
    suffix?: React.ReactNode

    // 放在form-item里面的前缀元素
    prefixNode?: React.ReactNode
    // 放在form-item里面的前缀元素
    suffixNode?: React.ReactNode
    // 是否阻止事件冒泡
    isBubbing?: boolean
}


export const InputItem: React.FC<InputItemProps> = (props) => {
    return <Item
        label={props.label}
        required={!!props.required} style={props.style} {...props.extraFormItemProps}
        help={props.help}
    >
        {props.prefixNode}
        {props.autoComplete ? <AutoComplete
            style={{width: props.width || "100%"}}
            dropdownMatchSelectWidth={400}
            disabled={!!props.disable}
            placeholder={props.placeholder}
            allowClear={true}
            value={props.value} onChange={e => props.setValue && props.setValue(e)}
            options={(props.autoComplete || []).map(i => {
                return {value: i}
            })}
        /> : props.textarea ? <>
            <Input.TextArea
                style={{width: props.width}}
                // type={props.type}
                rows={props.textareaRow}
                autoSize={props.autoSize}
                cols={props.textareaCol}
                required={!!props.required}
                disabled={!!props.disable}
                placeholder={props.placeholder}
                allowClear={props.allowClear}
                value={props.value} onChange={e => {
                props.setValue && props.setValue(e.target.value);
                if (props.isBubbing) e.stopPropagation()
            }}
                onPressEnter={(e) => {
                    if (props.isBubbing) e.stopPropagation()
                }}
                onFocus={(e) => {
                    if (props.isBubbing) e.stopPropagation()
                }}
                onClick={(e) => {
                    if (props.isBubbing) e.stopPropagation()
                }}
            />
        </> : <Input
            style={{width: props.width}}
            type={props.type}
            required={!!props.required}
            disabled={!!props.disable}
            placeholder={props.placeholder}
            allowClear={props.allowClear}
            value={props.value} onChange={e => {
            props.setValue && props.setValue(e.target.value);
            if (props.isBubbing) e.stopPropagation()
        }}
            prefix={props.prefix}
            suffix={props.suffix}
            onPressEnter={(e) => {
                if (props.isBubbing) e.stopPropagation()
            }}
            onFocus={(e) => {
                if (props.isBubbing) e.stopPropagation()
            }}
            onClick={(e) => {
                if (props.isBubbing) e.stopPropagation()
            }}
        />}
        {props.suffixNode}
    </Item>
};

export interface InputStringOrJsonItemProps extends InputItemProps {
    defaultItems?: { key: string, value: string }[]
    valueIsStringArray?: boolean
}

export const InputStringOrJsonItem: React.FC<InputStringOrJsonItemProps> = (props) => {
    const [mode, setMode] = useState<"string" | "json">("json");
    const [items, setItems] = useState<{ key: string, value?: string }[]>([{key: "", value: undefined}]);
    const [initValue, setInitValue] = useState(props.value || "");

    useEffect(() => setInitValue(props.value || ""), [props.value])

    useEffect(() => {
        if (initValue.trimStart().startsWith("{")) {
            const ret: { key: string, value?: string }[] = [];
            try {
                JSON.parse(initValue, (key: string, value?: string) => {
                    if (!!key) {
                        value = value || undefined
                        ret.push({key, value: value})
                    }
                })
                if (ret.length > 0) {
                    for (const obj of ret) {
                        for (let {key, value} of props.defaultItems || []) {
                            if (obj.key == key) {
                                obj.value = value || undefined
                            }
                        }
                    }
                    setItems(ret)

                    setMode("json")
                }
            } catch (e) {
                setMode("string")
                setItems([])
            }
        }
    }, [initValue])

    useEffect(() => {
        if (!!items) {
            const data: any = {};
            items.map(value => {
                if (!!value.key) {
                    data[value.key] = value.value || ""
                }
            })

            props.setValue && props.setValue(JSON.stringify(data))
        }
    }, [items]);

    return <div>
        <SelectOne label={props.label + "[Type]"} data={[
            {text: "RawString", value: "string"},
            {text: "KeyValue", value: "json"},
        ]} value={mode} setValue={mode => setMode(mode)} help={props.help}/>
        {mode === "string" ? <Item label={props.label} required={!!props.required}>
            <Input
                required={!!props.required}
                disabled={!!props.disable}
                placeholder={props.placeholder}
                size={"middle"}
                allowClear={true}
                value={props.value} onChange={e => props.setValue && props.setValue(e.target.value)}
            />
        </Item> : <>{items.map((item, index) => {
            return <Form.Item label={`参数[${index}]`}>
                <Input.Group>
                    <Row gutter={10}>
                        <Col span={6}>
                            <Input placeholder={"Key"} allowClear={true}
                                   value={items[index].key}
                                   onChange={e => {
                                       const key = e.target.value
                                       items[index].key = key
                                       setItems([...items])
                                   }}/>
                        </Col>
                        <Col span={10}>
                            {props.valueIsStringArray ? <div style={{width: "100%"}}>
                                <OneLine>
                                    <Select
                                        style={{width: "100%"}}
                                        allowClear={true}
                                        autoClearSearchValue={true}
                                        placeholder={"参数使用 | 分割数组"}
                                        dropdownMatchSelectWidth={200}
                                        mode={"tags"}
                                        value={items[index].value?.split("|") || []} maxTagTextLength={20}
                                        onChange={(value, _) => {
                                            if (!value) {
                                                items[index].value = undefined
                                                setItems([...items])
                                                return
                                            }
                                            value = value.filter(i => {
                                                return !!i
                                            })
                                            items[index].value = value.join("|")
                                            setItems([...items])
                                        }}

                                    />

                                </OneLine>
                            </div> : <>
                                <Input placeholder={"Value"} allowClear={true}
                                       value={items[index].value}
                                       onChange={e => {
                                           const value = e.target.value;
                                           items[index].value = value.trim();
                                           setItems([...items])
                                       }}
                                    // addonAfter={<>
                                    //     <DeleteOutlined
                                    //         style={{color: "red"}}
                                    //         onClick={() => {
                                    //             if (index > 0) {
                                    //                 items.splice(index, 1)
                                    //                 setItems([...items])
                                    //             }
                                    //         }}/>
                                    // </>}
                                />
                            </>}
                        </Col>
                        <Col span={8}>
                            <Button type={"dashed"} onClick={() => {
                                if (index > 0) {
                                    items.splice(index, 1)
                                    setItems([...items])
                                }
                            }} danger={true}>
                                <DeleteOutlined/>
                            </Button>
                        </Col>
                    </Row>
                </Input.Group>
            </Form.Item>
        })}
            <Item label={" "} colon={false}>
                <Button type={"dashed"}
                        onClick={e => {
                            setItems([...items, {key: "", value: undefined}])
                        }}
                >添加 Key-Value Pair</Button></Item>
        </>}
    </div>
}


export interface SelectOneItemProps {
    value: any
    text: string
    disabled?: boolean
}

export interface SelectOneProps extends InputBase {
    disabled?: boolean
    value?: any
    help?: string
    colon?: boolean
    placeholder?: string
    size?: any

    setValue?(a: any): any

    data: SelectOneItemProps[]
    formItemStyle?: CSSProperties
}

/*
* <Radio.Button
                style={{borderRadius: "6px"}}
                key={`${e.value}`}
                // type={current == e.value ? "primary" : undefined}
                disabled={(p.value === e.value ? false : !!p.disabled) || e.disabled}
                value={e.value}>{e.text}</Radio.Button>
* */
export const SelectOne: React.FC<SelectOneProps> = (p) => {
    // const [current, setCurrent] = useState<any>();
    return <Item label={p.label} help={p.help} colon={p.colon} style={{...p.formItemStyle}}>
        <YakitRadioButtons
            className={"old-theme-html select-one"}
            disabled={p.disabled}
            size={p.size}
            value={p.value}
            onChange={(e) => {
                // setCurrent(e.target.value)
                p.setValue && p.setValue(e.target.value)
            }}
            buttonStyle='solid'
            options={p.data.map(item => {
                const info ={
                    value:item.value,
                    label:item.text,
                    disabled:item.disabled
                }
                return info
            })}
        />
        {/*<Radio.Group className={"select-one"} onChange={e => {*/}
        {/*    // setCurrent(e.target.value)*/}
        {/*    p.setValue && p.setValue(e.target.value)*/}
        {/*}} value={p.value} buttonStyle="solid" size={p.size} style={{border: "unset", display: "inline-flex", gap: 4}}*/}
        {/*>*/}

        {/*    {p.data.map(e => {*/}
        {/*        const active = e.value === p.value;*/}
        {/*        return <YakitButton*/}
        {/*            onClick={()=>{*/}
        {/*                if (p.setValue) {*/}
        {/*                    p.setValue(e.value)*/}
        {/*                }*/}
        {/*            }}*/}
        {/*            value={e.value} key={`${e.value}`} size={p.size}  type={active ? "primary" : "outline2"}*/}
        {/*            disabled={(p.value === e.value ? false : !!p.disabled) || e.disabled}>*/}
        {/*            {e.text}*/}
        {/*        </YakitButton>*/}
        {/*    })}*/}
        {/*</Radio.Group>*/}
    </Item>
};

export interface InputBase {
    label?: string | any
    help?: any
    formItemStyle?: CSSProperties
}

export interface InputTimePointProps extends InputBase {
    value?: number
    placeholder?: string

    setValue(value?: number): any
}

export const InputTimePoint: React.FC<InputTimePointProps> = (p) => {
    return <Item label={p.label} style={p.formItemStyle}>
        <TimePoint value={p.value} setValue={p.setValue} placeholder={p.placeholder}/>
    </Item>
}

export interface InputNumberProps extends InputBase {
    min?: number
    size?: any
    max?: number

    value?: number
    defaultValue?: number
    disable?: boolean

    width?: string | number | any

    setValue(value: number): any
}

export const InputFloat: React.FC<InputNumberProps> = (p) => {
    return <Item label={p.label} style={{...p.formItemStyle}} help={p.help}>
        <InputNumber size={p.size} min={p.min} max={p.max} step={0.01} defaultValue={p.defaultValue} value={p.value}
                     onChange={value => {
                         switch (typeof value) {
                             case "number":
                                 value && p.setValue(value)
                                 return
                             default:
                                 p.setValue(0);
                         }
                     }} width={"100%"}
        />
    </Item>
};


export const InputInteger: React.FC<InputNumberProps> = (p) => {
    return <Item label={p.label} style={{...p.formItemStyle}} help={p.help}>
        <InputNumber width={p.width && "100%"} disabled={p.disable} style={{width: p.width}}
                     defaultValue={p.defaultValue} size={p.size}
                     min={p.min} max={p.max} step={1} value={p.value} onChange={e => p.setValue(e as number)}/>
    </Item>
}

export interface MultiSelectForStringProps extends InputBase {
    value?: string
    mode?: "multiple" | "tags"
    help?: string

    defaultSep?: string

    setValue(s: string): any

    maxTagTextLength?: number
    placeholder?: string

    data: CheckboxOptionType[]
    disabled?: boolean
}

export const MultiSelectForString: React.FC<MultiSelectForStringProps> = (p) => {
    let sep = p.defaultSep || ",";
    return <MultiSelect disabled={p.disabled} label={p.label} value={p.value ? p.value.split(sep) : []} data={p.data}
                        setValue={(items) => {
                            items && p.setValue(items.join(sep))
                        }}/>
};

export const ManyMultiSelectForString: React.FC<MultiSelectForStringProps> = (p) => {
    let sep = p.defaultSep || ","
    let value: string[];
    if (!p.value) {
        value = []
    } else {
        value = p.value?.split(sep) || []
    }
    return <Item label={p.label} help={p.help} style={p.formItemStyle}>
        <Select
            disabled={p.disabled}
            style={{width: "200"}}
            allowClear={true}
            autoClearSearchValue={true}
            dropdownMatchSelectWidth={200}
            mode={p.mode || "multiple"}
            value={value} maxTagTextLength={30}
            onChange={(value, _) => {
                p.setValue(value.join(sep) || "")
            }}
            placeholder={p.placeholder}
        >
            {p.data.map(i => {
                return <Select.Option
                    key={`${i.value}`}
                    value={i.value.toString()}
                >{i?.label?.toString()}</Select.Option>
            })}
        </Select>
    </Item>
}

export interface MultiSelectProps extends InputBase {
    value?: string[]
    disabled?: boolean

    setValue(s?: string[]): any

    data: CheckboxOptionType[]
}

export const MultiSelect: React.FC<MultiSelectProps> = (p) => {
    return <Item label={p.label}>
        <Checkbox.Group disabled={p.disabled} options={p.data} value={p.value}
                        onChange={(values: CheckboxValueType[]) => {
                            let a = values as string[];
                            p.setValue(a)
                        }}/>
    </Item>
};

export interface SwitchItemProps extends InputBase {
    size?: "small" | "default"
    value?: boolean
    help?: string
    disabled?: boolean

    setValue(b: boolean): any
}

export interface InputFileNameItemProps {
    label?: string
    content?: string
    loadContent?: boolean
    setContent?: (i: string) => any
    filename?: string
    setFileName?: (i: string) => any
    accept?: string[]
    required?: boolean
    disabled?: boolean

    // 提示信息内容组件
    hint?: React.ReactNode
}

const {ipcRenderer} = window.require("electron");
export const InputFileNameItem: React.FC<InputFileNameItemProps> = p => {
    const [uploadLoading, setUploadLoading] = useState(false);
    return <Item label={p.label} required={p.required}>
        <Upload.Dragger
            disabled={p.disabled}
            className='targets-upload-dragger'
            accept={(p.accept || [])?.join(",")}
            multiple={false}
            maxCount={1}
            showUploadList={false}
            beforeUpload={(f: any) => {
                // 设置名字
                p.setFileName && p.setFileName(f?.path)
                if (!p.loadContent) {
                    return false
                }

                setUploadLoading(true)
                ipcRenderer.invoke("fetch-file-content", (f as any).path).then((res) => {
                    p.setContent && p.setContent(res)
                    setTimeout(() => {
                        setUploadLoading(false)
                    }, 100);
                })
                return false
            }}>
            <Spin spinning={uploadLoading}>
                {p.loadContent ? <InputItem
                    // label={p.label}
                    label={""}
                    setValue={Targets => p.setContent && p.setContent(Targets)}
                    value={p.content} textarea={true} textareaRow={6}
                    placeholder="请输入绝对路径"
                    isBubbing={true}
                    help={p.hint ? p.hint : (<div>
                        可将文件拖入框内或<span style={{color: 'rgb(25,143,255)'}}>点击此处</span>上传
                    </div>)}
                /> : <InputItem
                    label={""}
                    value={p.filename} setValue={f => p.setFileName && p.setFileName(f)}
                    placeholder="请输入绝对路径"
                    isBubbing={true} allowClear={false} help={p.hint ? p.hint : (<div>
                    可将文件拖入框内或<span style={{color: 'rgb(25,143,255)'}}>点击此处</span>上传
                </div>)}
                />
                }

            </Spin>
        </Upload.Dragger>
    </Item>
}

export const SwitchItem: React.FC<SwitchItemProps> = p => {
    return <Item className="old-theme-html" label={p.label} help={p.help} style={p.formItemStyle}>
        <YakitSwitch checked={p.value} onChange={e => p.setValue(e)} disabled={p.disabled}/>
    </Item>
}

export interface InputTimeRangeProps extends InputBase {
    start?: number
    end?: number

    setStart: (start: number) => any
    setEnd: (start: number) => any
}

export const InputTimeRange: React.FC<InputTimeRangeProps> = p => {
    return <Item label={p.label}>
        <div style={{marginRight: 8}}>
            <TimeRange onStart={p.setStart} onEnd={p.setEnd} start={p.start} end={p.end}/>
        </div>
    </Item>
};

export interface EditableTagsGroupProps {
    tags: string[]
    onTags?: (r: string[]) => any,
    onTagCreated?: (r: string) => any
    onTagClicked?: (value: string) => any
    randomColor?: boolean
    noOperations?: boolean
}

export interface EditableTagsProps {
    onCreated?: (value: string) => any
}

const EditableTags: React.FC<EditableTagsProps> = (p) => {
    const [inputVisible, setInputVisible] = useState(false);
    const [value, setValue] = useState("");
    const confirmInput = () => {
        setInputVisible(false);
        setValue("");
        p.onCreated && p.onCreated(value)
    };
    const inputRef = useRef<any>(null);

    useEffect(() => {
        if (inputVisible) {
            inputRef.current?.focus()
        }
    }, [inputVisible]);

    return <>
        <Input
            hidden={!inputVisible}
            ref={inputRef}
            className={"tag-input"}
            size={"small"}
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={e => confirmInput()}
            onPressEnter={e => confirmInput()}
        /> {!inputVisible ? <Tag
        className={"site-tag-plus"}
        onClick={e => {
            setInputVisible(!inputVisible)
        }}
    ><span><PlusOutlined/> Add Tag</span></Tag> : ""}
    </>
};

export const EditableTagsGroup: React.FC<EditableTagsGroupProps> = (p) => {
    const [createdTag, setCreatedTag] = useState("");
    const [tags, setTags] = useState<string[]>(p.tags || []);

    useEffect(() => {
        if (tags.includes(createdTag)) {
            return
        }

        p.onTagCreated && createdTag && p.onTagCreated(createdTag);
        createdTag && setTags([...tags, createdTag]);
    }, [createdTag]);

    useEffect(() => {
        if ((p.tags || []).sort().join(",") === tags.sort().join(",")) {
            return
        }
        p.onTags && p.onTags(tags)
    }, [tags]);

    return <div>
        {tags.map((tag, tagIndex) => {
            return <Popover
                title={"Operations"} visible={p.noOperations ? false : undefined}
                content={[
                    <Button
                        danger={true} type={"dashed"} size={"small"}
                        onClick={e => {
                            const index = tags.indexOf(tag)
                            if (index > -1) {
                                tags.splice(index, 1);
                                setTags([...tags]);
                                p.onTags && p.onTags(tags)
                            }
                        }}
                    >删除 Tag</Button>,
                ]}
            ><Tag
                color={p.randomColor ? randomColor() : "geekblue"}
                onClick={e => p.onTagClicked && p.onTagClicked(tag)}
            >{tag}</Tag></Popover>
        })}
        <EditableTags onCreated={(s) => {
            setCreatedTag(s)
        }}/>
    </div>
}


export const ManySelectOne: React.FC<SelectOneProps> = (p) => {
    return <Item label={p.label} help={p.help} style={{...p.formItemStyle}}>
        <Select
            value={p.value} onChange={e => p.setValue && p.setValue(e)}
            disabled={p.disabled} size={p.size}
            placeholder={p.placeholder}
        >
            {p.data.map(e => <Select.Option key={e.value} value={e.value}>
                {e.text}
            </Select.Option>)}
        </Select>
    </Item>
}

export interface CopyableFieldProp {
    text?: string
    width?: any
    maxWidth?: any
    style?: React.CSSProperties;
    noCopy?: boolean
    mark?: boolean
    tooltip?: boolean
}

export const CopyableField: React.FC<CopyableFieldProp> = (props) => {
    return <div style={{width: props.width, maxWidth: props.maxWidth}}>
        <Typography.Paragraph
            copyable={!props.noCopy}
            style={{marginBottom: 0, ...props.style}}
            ellipsis={{rows: 1, tooltip: props.tooltip === undefined ? true : props.tooltip}}
            mark={props.mark}
        >
            {props.text}
        </Typography.Paragraph>
    </div>
};