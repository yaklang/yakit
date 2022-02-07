import React, {useEffect, useRef, useState} from "react";
import {queryYakScriptList} from "../../yakitStore/network";
import {
    Button,
    Card,
    Checkbox, Col, Form,
    Layout,
    List,
    PageHeader,
    Popconfirm, Popover, Row,
    Select,
    Skeleton,
    Space, Statistic,
    Switch,
    Tag,
    Tooltip
} from "antd";
import {AutoCard} from "../../../components/AutoCard";
import {CopyableField, InputItem, ManySelectOne, OneLine, SelectOne} from "../../../utils/inputUtil";
import {YakScript} from "../schema";
import {AutoSpin} from "../../../components/AutoSpin";
import {gitUrlIcon} from "../../yakitStore/YakitStorePage";
import {SearchOutlined, QuestionCircleOutlined, UserOutlined} from "@ant-design/icons"
import {useGetState, useMemoizedFn, useSize, useThrottleFn, useVirtualList} from "ahooks";
import {hookWindowResize} from "../../../utils/windowResizer";
import ReactResizeDetector from "react-resize-detector";
import {showModal} from "../../../utils/showModal";

export interface BatchExecutorPageProp {

}

export const BatchExecutorPage: React.FC<BatchExecutorPageProp> = (props) => {
    const [pluginType, setPluginType] = useState<"yak" | "nuclei">("yak");
    const [loading, setLoading] = useState(false);
    const [limit, setLimit] = useState(200);
    const [scripts, setScripts, getScripts] = useGetState<YakScript[]>([]);
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState<string[]>([]);
    const [indeterminate, setIndeterminate] = useState(false);
    const [keyword, setKeyword] = useState("");

    // 处理性能问题
    const containerRef = useRef();
    const wrapperRef = useRef();
    const [list] = useVirtualList(getScripts(), {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 50, overscan: 20,
    })
    const [vlistHeigth, setVListHeight] = useState(600);

    useEffect(() => {
        const totalYakScript = scripts.length;
        if (totalYakScript <= 0 || selected.length <= 0) {
            return
        }

        setIndeterminate(totalYakScript > selected.length)
    }, [scripts, selected])

    const search = useMemoizedFn(() => {
        setLoading(true)
        queryYakScriptList(pluginType, (data, total) => {
            setTotal(total || 0)
            setScripts(data)
        }, () => setTimeout(() => setLoading(false), 300), limit, keyword)
    })

    useEffect(() => {
        setSelected([]);
        if (!pluginType) return;
        search()
    }, [pluginType])

    const selectYakScript = useMemoizedFn((y: YakScript) => {
        if (!selected.includes(y.ScriptName)) {
            setSelected([...selected, y.ScriptName])
        }
    });

    const unselectYakScript = useMemoizedFn((y: YakScript) => {
        setSelected(selected.filter(i => i !== y.ScriptName))
    })

    const renderListItem = useMemoizedFn((y: YakScript) => {
        return <YakScriptWithCheckboxLine
            selected={selected.includes(y.ScriptName)} plugin={y} onSelected={selectYakScript}
            onUnselected={unselectYakScript}
        />
    })

    return <div style={{width: "100%", height: "100%", display: "flex", flexDirection: "row"}}>
        <div style={{width: 400, height: "100%"}}>
            <AutoCard
                size={"small"}
                bordered={false}
                title={<Space>
                    <SelectOne label={"插件"} formItemStyle={{marginBottom: 0}} size={"small"} data={[
                        {text: "YAK 插件", value: "yak"},
                        {text: "YAML POC", value: "nuclei"},
                    ]} value={pluginType} setValue={setPluginType}/>
                </Space>}
                bodyStyle={{
                    paddingLeft: 4,
                    paddingRight: 4,
                    overflow: "hidden", display: "flex", flexDirection: "column",
                }}
                extra={<Space>
                    <Popover title={"搜索插件关键字"} trigger={["click"]} content={<div>
                        <Form size={"small"} onSubmitCapture={e => {
                            e.preventDefault()

                            search()
                        }}>
                            <InputItem
                                label={""}
                                extraFormItemProps={{style: {marginBottom: 4}, colon: false}}
                                value={keyword}
                                setValue={setKeyword}
                            />
                            <Form.Item colon={false} label={""} style={{marginBottom: 10}}>
                                <Button type="primary" htmlType="submit">搜索</Button>
                            </Form.Item>
                        </Form>
                    </div>}>
                        <Button size={"small"} type={!!keyword ? "primary" : "link"} icon={<SearchOutlined/>}/>
                    </Popover>
                    <Checkbox indeterminate={indeterminate} onChange={(r) => {
                        if (r.target.checked) {
                            setSelected(scripts.map(i => i.ScriptName));
                        } else {
                            setSelected([]);
                        }
                    }} checked={scripts.length === selected.length}>
                        全选
                    </Checkbox>
                </Space>}
            >
                <div style={{flex: "1", overflow: "hidden"}}>
                    <ReactResizeDetector
                        onResize={(width, height) => {
                            if (!width || !height) {
                                return
                            }
                            setVListHeight(height)
                        }}
                        handleWidth={true} handleHeight={true} refreshMode={"debounce"} refreshRate={50}
                    />
                    <div ref={containerRef as any} style={{height: vlistHeigth, overflow: "auto"}}>
                        <div ref={wrapperRef as any}>
                            {list.map(i => renderListItem(i.data))}
                        </div>
                    </div>
                </div>
            </AutoCard>
        </div>
        <div style={{marginLeft: 12, flex: 1, backgroundColor: "#fff"}}>
            <AutoCard
                title={<Space>
                    {"已选插件 / 当页插件 / 插件总量"}
                    <Tag>{`${selected.length} / ${scripts.length} / ${total}`}</Tag>
                </Space>}
                size={"small"} bordered={false}
                extra={<Button size={"small"}>

                </Button>}
            >
            </AutoCard>
        </div>
    </div>
};

export interface YakScriptWithCheckboxLineProp {
    plugin: YakScript
    selected: boolean,
    onSelected: (i: YakScript) => any
    onUnselected: (i: YakScript) => any
}

export const YakScriptWithCheckboxLine: React.FC<YakScriptWithCheckboxLineProp> = (props) => {
    const {plugin} = props;
    const script = plugin;

    return <Card
        key={plugin.ScriptName} style={{marginBottom: 6}} size={"small"}
        bodyStyle={{paddingLeft: 12, paddingTop: 8, paddingBottom: 8, paddingRight: 12}}
        hoverable={true}
    >
        <div style={{width: "100%", display: "flex", flexDirection: "row"}}>
            <Checkbox style={{marginBottom: 0}} checked={props.selected} onChange={r => {
                if (r.target.checked) {
                    props.onSelected(plugin)
                } else {
                    props.onUnselected(plugin)
                }
            }}>
                <Space>
                    <OneLine maxWidth={270} overflow={"hidden"}>{plugin.ScriptName}</OneLine>
                    {script.Help && <Button
                        size={"small"} type={"link"} onClick={() => {
                        showModal({
                            width: "40%",
                            title: "Help", content: <>
                                {script.Help}
                            </>
                        })
                    }}
                        icon={<QuestionCircleOutlined/>}/>}
                </Space>
            </Checkbox>
            <div style={{flex: 1, textAlign: "right"}}>
                {script.Author && <Tooltip title={script.Author}>
                    <Button size={"small"} type={"link"} icon={<UserOutlined/>}/>
                </Tooltip>}
            </div>
        </div>
    </Card>
};