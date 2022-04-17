import React, {useEffect, useRef, useState} from "react"
import {Row, Col, Input, Button, Pagination, List, Space, Tag, Card, Tooltip, Progress, Typography, Radio} from "antd"
import {StarOutlined, StarFilled, ArrowLeftOutlined, DownloadOutlined} from "@ant-design/icons"

import "./YakitPluginInfo.css"
import {YakScript} from "../invoker/schema"
import {useMemoizedFn} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {failed} from "../../utils/notification"
import {ItemSelects} from "../../components/baseTemplate/FormItemUtil"
import {CopyableField} from "../../utils/inputUtil"

const {ipcRenderer} = window.require("electron")
const {Title, Paragraph} = Typography

export interface YakitPluginInfoProp {
    info: YakScript
    onBack: () => any
}

export const YakitPluginInfo: React.FC<YakitPluginInfoProp> = (props) => {
    const {info, onBack} = props
    return (
        <div style={{width: "100%", height: "100%", position: "relative", display: "flex"}}>
            <div style={{position: "absolute", top: 5, left: 5, cursor: "pointer"}} onClick={onBack}>
                <ArrowLeftOutlined />
                <span>返回</span>
            </div>

            <div style={{maxWidth: 700, margin: "10px auto 0 auto", display: "flex", flexFlow: "column"}}>
                <div style={{display: "flex", justifyContent: "space-between"}}>
                    <div>
                        <Title
                            level={3}
                            style={{maxWidth: 540}}
                            ellipsis={{tooltip: true}}
                            title={info.ScriptName + "dqwdqwdqwdqwdqwdqwd"}
                        >
                            {info.ScriptName + "dqwdqwdqwdqwdqwdqwd"}
                        </Title>
                        <div>
                            <Space size={20}>
                                {`作者: ${info.Author}`}
                                <span>
                                    <StarOutlined />
                                    1231
                                </span>
                                <span>
                                    <DownloadOutlined />
                                    31233
                                </span>
                            </Space>
                        </div>
                    </div>
                    <div style={{display: "flex", flexFlow: "column", justifyContent: "center"}}>
                        <Button style={{height: 40}} type='primary' shape='round'>
                            添加到插件仓库
                        </Button>
                    </div>
                </div>

                <div style={{margin: "20px 0"}}>{`最近更新时间：${"123:123:123"}`}</div>

                <Typography>
                    <Title level={5}>概述</Title>
                    <Paragraph
                        ellipsis={{
                            rows: 1,
                            expandable: true,
                            symbol: "展开"
                        }}
                        title={info.Help}
                    >
                        {info.Help +
                            "123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123123"}
                    </Paragraph>
                </Typography>

                <div>
                    <span>全部评论</span>
                    <div>123</div>
                </div>

                <div style={{display: "flex", justifyContent: "space-between"}}>
                    <div>
                        审核{" "}
                        <Radio.Group
                            options={[
                                {label: "通过不通过", value: ""},
                                {label: "通过不通过", value: ""}
                            ]}
                        ></Radio.Group>
                    </div>
                    <Button>提交</Button>
                </div>
            </div>
        </div>
    )
}
