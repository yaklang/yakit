import React, {useEffect, useState} from "react";
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    Divider,
    Empty,
    Form,
    List,
    Popconfirm,
    Row,
    Space,
    Statistic,
    Tag, Tooltip
} from "antd";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {showModal} from "../../utils/showModal";
import {YakModuleList} from "../yakitStore/YakitStorePage";
import {YakitLogViewers} from "../invoker/YakitLogFormatter";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import "../main.css";
import {MITMPluginCardProp} from "./MITMPluginCard";
import {CopyableField, SelectOne} from "../../utils/inputUtil";
import {EditorProps, YakCodeEditor} from "../../utils/editors";
import {YakScript, YakScriptHooks} from "../invoker/schema";
import {useMap, useMemoizedFn} from "ahooks";
import {failed} from "../../utils/notification";
import {
    PoweroffOutlined,
    ThunderboltFilled,
    UserOutlined,
    QuestionCircleOutlined,
    ReloadOutlined
} from "@ant-design/icons";
import {AutoCard} from "../../components/AutoCard";
import {StatusCardProps} from "../yakitStore/viewers/base";
import moment from "moment";
import {formatDate} from "../../utils/timeUtil";
import {MITMPluginTemplateShort} from "../invoker/data/MITMPluginTamplate";
import {getValue, saveValue} from "../../utils/kv";
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer";
import {MITM_HOTPATCH_CODE, MITMPluginList, MITMPluginListProp} from "./MITMPluginList";
import {MITMYakScriptLoader, StatusCardViewer} from "./MITMYakScriptLoader";
import {MITMPluginLogViewer, MITMPluginLogViewerProp} from "./MITMPluginLogViewer";

const defaultScript = MITMPluginTemplateShort;

const {ipcRenderer} = window.require("electron");


export interface MITMPluginOperatorProps extends MITMPluginListProp, MITMPluginLogViewerProp {
}


export const MITMPluginOperator = React.memo((props: MITMPluginOperatorProps) => {
    const userDefined = true;
    return <div id={"plugin-operator"} style={{height: "100%"}}>
        <Row style={{height: "100%"}} gutter={12}>
            <Col span={userDefined ? 16 : 8}
                 style={{height: "100%", overflowY: "auto", display: "flex", flexDirection: "column"}}
            >
                <Alert type={"success"} style={{marginBottom: 12, fontSize: 15}} message={<>
                    <Space direction={"vertical"}>
                        <Space> 设置代理 <CopyableField text={props.proxy}/> 以扫描流量 </Space>
                        {props.downloadCertNode && props.downloadCertNode()}
                        {props.setFilterNode && props.setFilterNode()}
                    </Space>
                </>}/>
                <div style={{flex: 1}}>
                    <MITMPluginList
                        {...props as MITMPluginListProp}
                    />
                </div>
            </Col>
            <Col span={userDefined ? 8 : 16} style={{height: "100%", overflow: "hidden"}}>
                <MITMPluginLogViewer messages={props.messages} status={props.status}/>
            </Col>
        </Row>
    </div>
});
