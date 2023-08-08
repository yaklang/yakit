import React, {useEffect, useState} from "react"
import {MinusSquareOutlined, PlusSquareOutlined} from "@ant-design/icons"
import styles from "./ReportExtendCard.module.scss"
import MDEditor from "@uiw/react-md-editor"
import {YakEditor} from "@/utils/editors"
const {Markdown} = MDEditor

interface FoldHoleCardItemProps {
    [key: string]: any
}

export interface FoldHoleCardProps {
    data: FoldHoleCardItemProps
}
export const FoldHoleCard: React.FC<FoldHoleCardProps> = (props) => {
    const {data} = props
    const [dataSource, setDataSource] = useState<any[]>([])
    const [extendItem, setExtendItem] = useState<boolean>(false)
    useEffect(() => {
        let newArr = (Object.entries(data) || []).filter((item) => typeof item[1] !== "string")
        newArr.sort(function (a, b) {
            return a[1].sort - b[1].sort
        })
        setDataSource(newArr)
    }, [])

    return (
        <div className={styles["fold-hole"]}>
            {dataSource.map((item: any) => {
                const content = item[1].value
                if (item[1]?.fold) {
                    return (
                        <div className={styles["fold-hole-title"]} onClick={() => setExtendItem(!extendItem)}>
                            {extendItem ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
                            <Markdown source={`#### ${content}`} />
                        </div>
                    )
                }
            })}
            {extendItem && (
                <div className={styles["card-content"]}>
                    {dataSource.map((item: any) => {
                        const title = item[0]
                        const content = item[1].value
                        if (item[1]?.type === "code") {
                            return (
                                <div className={styles["fold-hole-code"]}>
                                    <div className={styles["title"]}>
                                        {title}：{!content ? "-" : ""}
                                    </div>
                                    <div className={styles["content"]}>
                                        {content ? (
                                            <div style={{height: 300}}>
                                                <YakEditor value={content} />
                                            </div>
                                        ) : (
                                            ""
                                        )}
                                    </div>
                                </div>
                            )
                        } else {
                            return (
                                <div className={styles["fold-hole-item"]}>
                                    <div className={styles["title"]}>{title}：</div>
                                    <div className={styles["content"]}>
                                        {content ? <Markdown source={content} /> : "-"}
                                    </div>
                                </div>
                            )
                        }
                    })}
                </div>
            )}
        </div>
    )
}

interface FoldRuleCardItemProps {
    data: any[]
    title: string
}

interface FoldRuleCardProps {
    content: FoldRuleCardItemProps
}

export const FoldRuleCard: React.FC<FoldRuleCardProps> = (props) => {
    const {content} = props
    const {data, title} = content
    const [extendItem, setExtendItem] = useState<boolean>(false)
    return (
        <div className={styles["rule-risk"]}>
            <div className={styles["rule-risk-title"]} onClick={() => setExtendItem(!extendItem)}>
                {extendItem ? <MinusSquareOutlined size={12} /> : <PlusSquareOutlined size={12} />}
                <Markdown source={`#### ${title} (共${data.length}个)`} />
            </div>
            {extendItem && (
                <div className={styles["rule-risk-content"]}>
                    {data.map((item) => {
                        return <FoldHoleCard data={item} />
                    })}
                </div>
            )}
        </div>
    )
}
