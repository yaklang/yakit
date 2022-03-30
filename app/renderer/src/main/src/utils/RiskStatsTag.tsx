import React from "react";
import {Badge, Button, Popover, Space, Tag} from "antd";
import {info} from "./notification";
import {showDrawer} from "./showModal";
import {RiskTable} from "../pages/risks/RiskTable";

export interface RiskStatsTagProp {
    delta: number
    onUpdate?: () => any
}

const {ipcRenderer} = window.require("electron");

export const RiskStatsTag: React.FC<RiskStatsTagProp> = React.memo((props) => {
    return <Popover title={"漏洞通知小工具"}
                    content={<Space>
                        <Button onClick={() => {
                            ipcRenderer.invoke("ResetRiskTableStats", {}).then(() => {
                                info("重置计数")
                            }).catch(() => {
                            }).finally(() => {
                                if (props.onUpdate) props.onUpdate();
                            })
                        }} size={"small"}>标为已读</Button>
                        <Button type={"primary"} size={"small"}
                                onClick={() => {
                                    showDrawer({
                                        title: "Vulnerabilities && Risks",
                                        width: "70%",
                                        content: <>
                                            <RiskTable/>
                                        </>
                                    })
                                }}
                        >所有漏洞与风险</Button>
                    </Space>}

    >
        <Badge size={"small"} overflowCount={99} count={props.delta} style={{marginRight: 6}}>
            <Tag color={"red"}>风险/漏洞</Tag>
        </Badge>
    </Popover>
});