import React, {useEffect, useRef, useState} from "react"
import {DataProps, YakHelpDocItemLoadProps, YakHelpDocProps} from "./YakHelpDocType"

import classNames from "classnames"
import styles from "./YakHelpDoc.module.scss"
import {loadFromYakURLRaw, requestYakURLList} from "@/pages/yakURLTree/netif"
import {yakitFailed} from "@/utils/notification"
import {CollapseList} from "../CollapseList/CollapseList"
import {ChatMarkdown} from "@/components/yakChat/ChatMarkdown"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {OutlineGlobealtIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Tooltip} from "antd"
import {useMemoizedFn, useThrottleFn} from "ahooks"
import {openExternalWebsite} from "@/utils/openWebsite"

const {ipcRenderer} = window.require("electron")

const titleRender = (info: DataProps) => {
    return <div className={styles["title-render"]}>{info.data.ResourceName}</div>
}

const renderItem = (info: DataProps) => {
    if (info.isLeaf) {
        try {
            const {Extra} = info.data
            const item = Extra.filter((item) => item.Key === "Content")
            if (item.length > 0) {
                return (
                    <div className={styles["render"]}>
                        <ChatMarkdown content={item[0].Value} />
                    </div>
                )
            } else {
                return <>暂无数据</>
            }
        } catch (error) {
            return <>错误</>
        }
    } else {
        return <YakHelpDocItemLoad info={info} />
    }
}

export const YakHelpDocItemLoad: React.FC<YakHelpDocItemLoadProps> = (props) => {
    const {info} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [data, setData] = useState<DataProps[]>([])
    useEffect(() => {
        setLoading(true)
        requestYakURLList(
            info.data.Url,
            (rsp) => {
                const newNodes: DataProps[] = rsp.Resources.map((i, index) => ({
                    title: i.VerboseName,
                    key: `${info.key}-${index}`,
                    data: i,
                    isLeaf: !i.HaveChildrenNodes
                }))
                setData(newNodes)
                setLoading(false)
            },
            () => {
                setLoading(false)
            }
        )
    }, [])

    return (
        <div className={styles["yak-help-doc-item-load"]}>
            {loading ? (
                <YakitSpin />
            ) : (
                <>
                    {data.length > 0 ? (
                        <CollapseList
                            type='sideBar'
                            onlyKey='key'
                            list={data}
                            titleRender={titleRender}
                            renderItem={renderItem}
                        />
                    ) : (
                        <>获取失败</>
                    )}
                </>
            )}
        </div>
    )
}

export const YakHelpDoc: React.FC<YakHelpDocProps> = (props) => {
    const [data, setData] = useState<DataProps[]>([])
    const searchRef = useRef<string>("")
    const [activeKey,setActiveKey] = useState<string|string[]>()

    useEffect(() => {
        update()
    }, [])

    const update = useMemoizedFn(() => {
        setActiveKey(undefined)
        loadFromYakURLRaw(`yakdocument://${searchRef.current}`, (rsp) => {
            setData(
                rsp.Resources.map((i, index) => ({
                    title: i.VerboseName,
                    key: `${index}`,
                    data: i,
                    isLeaf: !i.HaveChildrenNodes
                }))
            )
        }).catch((e) => {
            // yakitFailed(`加载失败: ${e}`)
            setData([])
        })
    })

    const onSearch = useThrottleFn(
        (e) => {
            const {value} = e.target
            searchRef.current = value
            update()
        },
        {wait: 500, leading: false}
    )

    return (
        <div className={styles["yak-help-doc"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>帮助文档</div>
                <div className={styles["extra"]}>
                    <Tooltip title={"跳转到官方文档"}>
                        <YakitButton
                            icon={<OutlineGlobealtIcon />}
                            type='text2'
                            onClick={() => openExternalWebsite("https://www.yaklang.com/docs/intro/")}
                        />
                    </Tooltip>
                </div>
            </div>
            <div className={styles["filter-box"]}>
                <YakitInput
                    placeholder='请输入函数关键词'
                    prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                    onChange={onSearch.run}
                />
            </div>
            <div className={styles["content"]}>
                <CollapseList
                    type='output'
                    onlyKey='key'
                    list={data}
                    titleRender={titleRender}
                    renderItem={renderItem}
                    isShowBottom={true}
                    collapseProps={{
                        activeKey,
                        onChange:(v)=>{setActiveKey(v)}
                    }}
                />
            </div>
        </div>
    )
}
