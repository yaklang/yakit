import React from "react"
import {Checkbox, Tooltip} from "antd"
import {QuestionCircleOutlined, UserOutlined} from "@ant-design/icons"
import {YakScript} from "../../pages/invoker/schema"
import {showModal} from "../../utils/showModal"

import "./yakitPlugin.css"

export interface PluginListOptInfoProps {
    info: YakScript
    selected: boolean
    onSelect: (flag: boolean) => any
    disabled?: boolean
}

export const PluginListOptInfo: React.FC<PluginListOptInfoProps> = React.memo((props) => {
    const {info, selected, onSelect, disabled = false} = props

    return (
        <div className='plugin-list-opt-info-body'>
            <div className="plugin-list-opt-info-checkbox">
                <Checkbox
                    className='opt-info-checkbox'
                    checked={selected}
                    disabled={disabled}
                    onChange={(e) => onSelect(e.target.checked)}
                >
                    <div className='opt-info-checkbox-title' title={info.ScriptName}>
                        {info.ScriptName}
                    </div>
                </Checkbox>
            </div>
            <div className='plugin-list-opt-info-hint'>
                {info.Help && (
                    <a
                        onClick={() => {
                            showModal({
                                width: "40%",
                                title: "Help",
                                content: <>{info.Help}</>
                            })
                        }}
                        href={"#"}
                        className='opt-info-hint-a'
                    >
                        <QuestionCircleOutlined />
                    </a>
                )}
                {info.Author && (
                    <Tooltip title={info.Author}>
                        <a href={"#"} className='opt-info-hint-a'>
                            <UserOutlined />
                        </a>
                    </Tooltip>
                )}
            </div>
        </div>
    )
})
