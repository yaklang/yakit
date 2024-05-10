import React, {ReactElement, memo} from "react"
import {CollapseListProp, HelpInfoListProps} from "./CollapseListType"
import {OutlineChevronrightIcon} from "@/assets/icon/outline"
import {Collapse} from "antd"
import {ChatMarkdown} from "@/components/yakChat/ChatMarkdown"

import classNames from "classnames"
import styles from "./CollapseList.module.scss"

const {Panel} = Collapse

const content = `chr 将传入的值根据ascii码表转换为对应的字符\n\nExample:\n\`\`\`\nchr(65) // A\nchr("65") // A\n\`\`\``

export const CollapseList: <T>(props: CollapseListProp<T>) => ReactElement | null = memo((props) => {
    const {onlyKey, list, titleRender, renderItem} = props

    return (
        <div className={styles["collapse-list"]}>
            <Collapse
                ghost
                className={styles["collapse-list-container"]}
                expandIcon={(panelProps) => {
                    const {isActive} = panelProps
                    return <OutlineChevronrightIcon className={classNames({"collapse-expand-arrow": !!isActive})} />
                }}
            >
                {list.map((item, index) => {
                    return (
                        <Panel header={titleRender(item)} key={item[onlyKey] || `collapse-list-${index}`}>
                            <div className={styles["list-item-render"]}>
                                <div className={styles["render-tail"]}></div>
                                {renderItem(item)}
                            </div>
                        </Panel>
                    )
                })}
            </Collapse>
        </div>
    )
})

export const HelpInfoList: React.FC<HelpInfoListProps> = memo((props) => {
    const {list} = props

    const titleRender = (info: {key: number}) => {
        return <div className={styles["title-render"]}>str.IsTLSServer</div>
    }

    const renderItem = (info: {key: number}) => {
        return (
            <div className={styles["render"]}>
                <ChatMarkdown content={content} />
            </div>
        )
    }

    return (
        <div className={styles["help-info-list"]}>
            <CollapseList onlyKey='key' list={list} titleRender={titleRender} renderItem={renderItem} />
        </div>
    )
})
