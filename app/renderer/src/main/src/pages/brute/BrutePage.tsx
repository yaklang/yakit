import React, {useEffect, useState} from "react";
import {Button, Card, Col, Form, Layout, List, Checkbox, Row, Upload, Space} from "antd";
import {InboxOutlined, ReloadOutlined, UploadOutlined} from "@ant-design/icons";
import {InputInteger, InputItem, SwitchItem} from "../../utils/inputUtil";

const {ipcRenderer} = window.require("electron");

export interface BrutePageProp {

}

export const BrutePage: React.FC<BrutePageProp> = (props) => {
    const [availableTypes, setAvailableTypes] = useState<string[]>([]);
    const [typeLoading, setTypeLoading] = useState(false);
    const [selectedType, setSelectedType] = useState<string[]>([]);

    const loadTypes = () => {
        setTypeLoading(true);
        ipcRenderer.invoke("GetAvailableBruteTypes").then((d: { Types: string[] }) => {
            setAvailableTypes(d.Types)

            if (selectedType.length <= 0 && d.Types.length > 0) {
                setSelectedType([d.Types[0]])
            }
        }).catch(e => {
        }).finally(() => setTimeout(() => setTypeLoading(false), 300))
    }

    useEffect(() => {
        loadTypes()
    }, [])

    return <div style={{height: "100%", backgroundColor: "#fff", width: "100%", display: "flex"}}>
        <div style={{height: "100%", width: 200,}}>
            <Card
                loading={typeLoading}
                size={"small"}
                style={{marginRight: 8, height: "100%"}} bodyStyle={{padding: 8}}
                title={<div>
                    可用爆破类型 <Button
                    type={"link"}
                    size={"small"}
                    icon={<ReloadOutlined/>}
                    onClick={() => {
                        loadTypes()
                    }}
                />
                </div>}
            >
                <List<string>
                    dataSource={availableTypes}
                    renderItem={i => {
                        const included = selectedType.includes(i);
                        return <div key={i} style={{margin: 4}}>
                            <Checkbox checked={included} onChange={e => {
                                e.preventDefault()

                                if (included) {
                                    setSelectedType([...selectedType.filter(target => i !== target)])
                                } else {
                                    setSelectedType([...selectedType.filter(target => i !== target), i])
                                }
                            }}>
                                {i}
                            </Checkbox>
                            {/*<SwitchItem label={i} value={included} setValue={*/}
                            {/*    () => {*/}
                            {/*        if (included) {*/}
                            {/*            setSelectedType([...selectedType.filter(target => i !== target)])*/}
                            {/*        } else {*/}
                            {/*            setSelectedType([...selectedType.filter(target => i !== target), i])*/}
                            {/*        }*/}
                            {/*    }*/}
                            {/*}/>*/}
                            {/*<Button*/}
                            {/*    type={included ? "primary" : "link"}*/}
                            {/*    style={{width: "100%", backgroundColor: included ? "#91d5ff" : undefined}}*/}
                            {/*    onClick={() => {*/}

                            {/*    }}*/}
                            {/*>{i}</Button>*/}
                        </div>
                    }}
                />
            </Card>
        </div>
        <div style={{flex: "1 1", height: "100%", display: "flex", flexDirection: "column"}}>
            <Row style={{marginBottom: 8}}>
                <Col span={24}>
                    <Card title={"配置参数"} style={{width: "100%"}} size={"small"}>
                        <Form onSubmitCapture={e => {
                            e.preventDefault()
                        }} size={"small"}>
                            <Row gutter={12}>
                                <Col span={8}>
                                    <Space direction={"vertical"} style={{width: "100%"}}>
                                        <InputItem label={"扫描目标"} style={{marginBottom: 0}}/>
                                        <Form.Item label={"导入文件"} style={{marginBottom: 0}}>
                                            <Upload
                                                multiple={false} maxCount={1}
                                                onRemove={r => {
                                                    // setParams({...params, TargetsFile: ""})
                                                    return
                                                }}
                                                beforeUpload={(f) => {
                                                    // setParams({...params, TargetsFile: f.path})
                                                    return false
                                                }}>
                                                <Button size={"small"} style={{width: "100%"}} icon={<UploadOutlined/>}>
                                                    选择目标文件
                                                </Button>
                                            </Upload>
                                        </Form.Item>
                                    </Space>

                                </Col>
                                <Col span={8}>
                                    <Space direction={"vertical"} style={{width: "100%"}}>
                                        <SwitchItem label={"自动字典"} setValue={() => {
                                        }} formItemStyle={{marginBottom: 0}}/>
                                        <InputItem
                                            label={"爆破用户"} style={{marginBottom: 0}}
                                            suffix={<Button size={"small"} type={"link"}>
                                                导入文件
                                            </Button>}
                                        />
                                        <InputItem
                                            label={"爆破密码"} style={{marginBottom: 0}}
                                            suffix={<Button size={"small"} type={"link"}>
                                                导入文件
                                            </Button>}
                                        />
                                    </Space>
                                </Col>
                                <Col span={8}>
                                    <Space direction={"vertical"} style={{width: "100%"}}>
                                        <InputInteger label={"并发目标"} setValue={() => {
                                        }} formItemStyle={{marginBottom: 0}}/>
                                        <InputInteger label={"随机延时"} setValue={() => {
                                        }} formItemStyle={{marginBottom: 0}}/>
                                        <Button type={"primary"} style={{width: "100%"}}>
                                            启动
                                        </Button>
                                    </Space>
                                </Col>
                            </Row>
                        </Form>
                    </Card>
                </Col>
            </Row>
            <Card style={{flex: '1 1 0%'}}>

            </Card>
        </div>
    </div>
};