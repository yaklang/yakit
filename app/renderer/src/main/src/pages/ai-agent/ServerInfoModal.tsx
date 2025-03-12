import React, {useEffect, useRef, useState} from "react"
import {RenderTools, RenderToolsParam, ServerInfoModalProps} from "./aiAgentType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {convertMCPTools} from "./utils"
import cloneDeep from "lodash/cloneDeep"
import {OutlineCubeIcon, OutlineQuestionmarkcircleIcon, OutlineTemplateIcon} from "@/assets/icon/outline"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {useMemoizedFn} from "ahooks"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

export const ServerInfoModal: React.FC<ServerInfoModalProps> = (props) => {
    const {info, visible, onCancel: handleCancel} = props

    // tools 的全部数据
    const toolsData = useRef<RenderTools[]>([])
    // tools 的展示数据(包括过滤了搜索情况后的数据)
    const [showTools, setShowTools] = useState<RenderTools[]>([])
    useEffect(() => {
        const {tools} = info
        if (tools && tools.length > 0) {
            const newData: RenderTools[] = tools.map((item) => {
                const newEl = cloneDeep(item)
                const newParams: RenderToolsParam[] = []
                convertMCPTools("", newEl.params, newParams)
                newEl.params = newParams
                return newEl
            })
            toolsData.current = [...newData]
            setShowTools([...newData])
        } else {
            toolsData.current = []
            setShowTools([])
        }

        return () => {
            handleReset()
        }
    }, [visible])

    const handleToolSearch = useMemoizedFn((value: string) => {
        if (!value) {
            setShowTools([...toolsData.current])
        } else {
            setShowTools(
                toolsData.current.filter((item) => {
                    const {name} = item
                    return name.toLocaleLowerCase().indexOf(value.toLocaleLowerCase()) > -1
                })
            )
        }
    })

    const [active, setActive] = useState<"tools" | "resourceTemplates">("tools")

    const handleReset = useMemoizedFn(() => {
        toolsData.current = []
        setShowTools([])
        setActive("tools")
    })

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
                                label: `工具 (${info.tools?.length || 0})`
                            },
                            {
                                value: "resourceTemplates",
                                label: `资源模板 (${info.resourceTemplates?.length || 0})`
                            }
                        ]}
                    />
                </div>

                <div className={styles["content"]}>
                    <div
                        className={classNames(styles["active-content"], styles["tools-wrapper"], {
                            [styles["hidden-content"]]: active !== "tools"
                        })}
                    >
                        <YakitInput.Search placeholder='请输入工具名' allowClear={true} onSearch={handleToolSearch} />
                        <div className={styles["tools-body"]}>
                            {showTools?.map((item) => {
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
                    </div>

                    <div
                        className={classNames(styles["active-content"], {
                            [styles["hidden-content"]]: active !== "resourceTemplates"
                        })}
                    >
                        {info.resourceTemplates?.map((item) => (
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
