import React, {useMemo, useState} from "react"
import {RenderTools, RenderToolsParam, ServerInfoModalProps} from "./aiAgentType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {convertMCPTools} from "./utils"
import cloneDeep from "lodash/cloneDeep"
import {OutlineCubeIcon, OutlineQuestionmarkcircleIcon, OutlineTemplateIcon} from "@/assets/icon/outline"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

export const ServerInfoModal: React.FC<ServerInfoModalProps> = (props) => {
    const {info, visible, onCancel: handleCancel} = props

    const {tools, resourceTemplates} = info
    const newTools = useMemo(() => {
        if (!tools) return []
        const newData: RenderTools[] = tools.map((item) => {
            const newEl = cloneDeep(item)
            const newParams: RenderToolsParam[] = []
            convertMCPTools("", newEl.params, newParams)
            newEl.params = newParams
            return newEl
        })
        return newData
    }, [tools])

    const [active, setActive] = useState<"tools" | "resourceTemplates">("tools")

    return (
        <YakitModal
            type='white'
            title='服务器信息'
            width={600}
            maskClosable={false}
            centered={true}
            bodyStyle={{padding: 0}}
            visible={visible}
            footer={null}
            onCancel={handleCancel}
        >
            <div className={styles["server-info"]}>
                <div className={styles["header"]}>
                    <YakitRadioButtons
                        value={active}
                        onChange={(e) => {
                            setActive(e.target.value)
                        }}
                        buttonStyle='solid'
                        options={[
                            {
                                value: "tools",
                                label: `工具 (${tools?.length || 0})`
                            },
                            {
                                value: "resourceTemplates",
                                label: `资源模板 (${resourceTemplates?.length || 0})`
                            }
                        ]}
                    />
                </div>

                <div className={styles["content"]}>
                    <div
                        className={classNames(styles["active-content"], {
                            [styles["hidden-content"]]: active !== "tools"
                        })}
                    >
                        {newTools?.map((item) => {
                            const {params} = item
                            return (
                                <div key={item.name} className={styles["tools-item"]}>
                                    <div className={styles["name"]}>
                                        <OutlineCubeIcon className={styles["icon-style"]} />
                                        {item.name}
                                    </div>
                                    <div className={styles["description"]}>{item.description}</div>
                                    <div className={styles["params"]}>
                                        {params.map((el) => {
                                            const required = el.required
                                            const type = el.type
                                            let notes = ""
                                            if (el.substructure) {
                                                notes += "// 子元素结构\n"
                                                notes += `${el.substructure}\n\n\n`
                                            }
                                            if ((el.extra || []).length > 0) {
                                                notes += "// 额外限制条件\n"
                                                notes += (el.extra || []).join("\n")
                                            }

                                            return (
                                                <div key={el.key} className={styles["param-item"]}>
                                                    <div className={styles["item-info"]}>
                                                        <div
                                                            className={classNames(
                                                                styles["key-style"],
                                                                "yakit-content-single-ellipsis"
                                                            )}
                                                            title={el.key}
                                                        >
                                                            {el.key}
                                                        </div>
                                                        {required ? (
                                                            <span className={styles["required"]}>*</span>
                                                        ) : null}
                                                        <YakitTag className={styles["type-style"]}>{type}</YakitTag>
                                                        {notes && (
                                                            <YakitPopover
                                                                trigger={"click"}
                                                                content={
                                                                    <div className={styles["param-notes-wrapper"]}>
                                                                        <pre>
                                                                            <code>{notes}</code>

                                                                            <div className={styles["copy-icon"]}>
                                                                                <CopyComponents
                                                                                    className={classNames(
                                                                                        styles["icon-style"]
                                                                                    )}
                                                                                    copyText={notes}
                                                                                    iconColor='#85899e'
                                                                                />
                                                                            </div>
                                                                        </pre>
                                                                    </div>
                                                                }
                                                            >
                                                                <OutlineQuestionmarkcircleIcon
                                                                    className={styles["notes-icon"]}
                                                                />
                                                            </YakitPopover>
                                                        )}
                                                    </div>
                                                    <div className={styles["item-description"]}>
                                                        {el.description || "No description"}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        }) || null}
                    </div>

                    <div
                        className={classNames(styles["active-content"], {
                            [styles["hidden-content"]]: active !== "resourceTemplates"
                        })}
                    >
                        {resourceTemplates?.map((item) => (
                            <div key={item.name} className={styles["resource-template-item"]}>
                                <div className={styles["uri"]}>
                                    <OutlineTemplateIcon className={styles["icon-style"]} />
                                    {item.uriTemplate}
                                </div>
                                <div className={styles["name"]}>{item.name}</div>
                            </div>
                        )) || null}
                    </div>
                </div>
            </div>
        </YakitModal>
    )
}
