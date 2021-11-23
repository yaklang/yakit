import React, {useEffect, useState} from "react";
import {Button, Card, Col, Form, Input, Pagination, Row, Space, Switch, Tabs, Tree} from "antd";
import {AntDTreeData, ConvertWebsiteForestToTreeData, WebsiteForest} from "../../../components/WebsiteTree";
import {HTTPFlowTable} from "../../../components/HTTPFlowTable";
import {HTTPFlowMiniTable} from "../../../components/HTTPFlowMiniTable";
import {genDefaultPagination} from "../../invoker/schema";
import {ReloadOutlined, SearchOutlined} from "@ant-design/icons";
import {InputItem} from "../../../utils/inputUtil";

export interface WebsiteTreeViewerProp {
    pageMode?: boolean
    targets?: string
    interval_seconds?: number
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
}


const {ipcRenderer} = window.require("electron");
export const WebsiteTreeViewer: React.FC<WebsiteTreeViewerProp> = (props) => {
    const [treeData, setTreeData] = useState<AntDTreeData[]>([]);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [selected, setSelected] = useState(props.targets);
    const [limit, setLimit] = useState(20);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchTarget, setSearchTarget] = useState(props.targets)

    const refresh = () => {
        ipcRenderer.invoke("GenerateWebsiteTree", {
            Targets: searchTarget,
        }).then((data: { TreeDataJson: Uint8Array }) => {
            const treeDataRaw = ConvertWebsiteForestToTreeData(JSON.parse(Buffer.from(data.TreeDataJson).toString("utf8")) as WebsiteForest) as AntDTreeData[];
            setTreeData([...treeDataRaw])
        })
    }

    // 构建 table
    const uidToNodeMap = new Map<string, AntDTreeData>()
    const viewNode = (node: AntDTreeData) => {
        node.children.map(viewNode)
        uidToNodeMap.set(node.key, node);
    };
    treeData.forEach(viewNode)

    useEffect(() => {
        setSearchTarget(props.targets)
        refresh()
    }, [props.targets])

    useEffect(() => {
        const id = setInterval(() => {
            if (!autoRefresh) {
                return
            }

            refresh()
        }, 3000)
        return () => {
            clearInterval(id)
        }
    }, [autoRefresh])

    return <>
        <Row gutter={8}>
            <Col span={7}>
                <Card
                    title={<Space>
                        业务结构
                        <Button
                            type={"link"} size={"small"} icon={<ReloadOutlined/>}
                            onClick={() => {
                                refresh()
                            }}
                        />
                    </Space>}
                    size={"small"}
                    extra={
                        !props.targets && <Space>
                            <Form size={"small"} onSubmitCapture={(e) => {
                                e.preventDefault()

                                refresh()
                            }} layout={"inline"}>
                                <InputItem
                                    label={"URL关键字"} value={searchTarget} setValue={setSearchTarget}
                                    width={100}
                                />
                                <Form.Item style={{marginLeft: 0, marginRight: 0}}>
                                    <Button
                                        size={"small"} type="link" htmlType="submit"
                                        icon={<SearchOutlined/>}
                                        style={{marginLeft: 0, marginRight: 0}}
                                    />
                                </Form.Item>
                            </Form>
                            {/*<Input onBlur={r => setSearchTarget(r.target.value)} size={"small"}/>*/}
                        </Space>
                    }
                >
                    <Tree
                        showLine={true} treeData={treeData}
                        onSelect={(key) => {
                            if (key.length <= 0) {
                                return
                            }
                            const selectedKey = key[0];
                            const node = uidToNodeMap.get(selectedKey as string);
                            if (!node) {
                                return
                            }
                            let path = [
                                node.title,
                            ];
                            let parent = node.parent;
                            while (!!parent) {
                                path.unshift(!parent.parent ? parent.title + "/" : parent.title)
                                parent = parent.parent
                            }
                            const pathStr = (path || []).join("")
                            setSelected(pathStr)
                        }}
                        autoExpandParent={true} defaultExpandAll={true}
                    />
                </Card>

            </Col>
            <Col span={17}>
                <Card
                    size={"small"} title={"HTTP Flow Record"}
                    bodyStyle={{padding: 0}}
                    extra={
                        <Pagination
                            simple={true}
                            defaultCurrent={1}
                            size={"small"}
                            pageSize={limit}
                            current={page}
                            onChange={(page, size) => {
                                setPage(page);
                                setLimit(size || 20);
                            }}
                            total={total}
                        />
                    }
                >
                    <HTTPFlowMiniTable onTotal={setTotal} onSendToWebFuzzer={props.onSendToWebFuzzer} filter={{
                        SearchURL: selected,
                        Pagination: {...genDefaultPagination(20), Page: page, Limit: limit}
                    }} source={""}/>
                </Card>
            </Col>
        </Row>

    </>
};