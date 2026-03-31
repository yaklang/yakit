import React, {useEffect, useRef, useState} from "react"
import {DataProps, YakHelpDocItemLoadProps, YakHelpDocProps} from "./YakHelpDocType"
import styles from "./YakHelpDoc.module.scss"
import {loadFromYakURLRaw, requestYakURLList} from "@/pages/yakURLTree/netif"
import {CollapseList} from "../CollapseList/CollapseList"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {OutlineGlobealtIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Tooltip} from "antd"
import {useMemoizedFn, useThrottleFn} from "ahooks"
import {openExternalWebsite} from "@/utils/openWebsite"
import {WebsiteGV} from "@/enums/website"
import { SafeMarkdown, StreamMarkdown } from "@/pages/assetViewer/reportRenders/markdownRender"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import i18n from "@/i18n/i18n"

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
                        <SafeMarkdown source={item[0].Value} />
                    </div>
                )
            } else {
                return <>{i18n.t("YakHelpDoc.noData", {ns: "yakRunner"})}</>
            }
        } catch (error) {
            return <>{i18n.t("YakHelpDoc.error", {ns: "yakRunner"})}</>
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
                        <>{i18n.t("YakHelpDoc.fetchFailed", {ns: "yakRunner"})}</>
                    )}
                </>
            )}
        </div>
    )
}

export const YakHelpDoc: React.FC<YakHelpDocProps> = (props) => {
    const [data, setData] = useState<DataProps[]>([])
    const searchRef = useRef<string>("")
    const [activeKey, setActiveKey] = useState<string | string[]>()
    const {t} = useI18nNamespaces(["yakRunner"])

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
                <div className={styles["title"]}>{t("YakRunner.helpDocumentation")}</div>
                <div className={styles["extra"]}>
                    <Tooltip title={t("YakHelpDoc.goToOfficialDocs")}>
                        <YakitButton
                            icon={<OutlineGlobealtIcon />}
                            type='text2'
                            onClick={() => openExternalWebsite(WebsiteGV.YakHelpDocAddress)}
                        />
                    </Tooltip>
                </div>
            </div>
            <div className={styles["filter-box"]}>
                <YakitInput
                    placeholder={t("YakHelpDoc.functionKeywordPlaceholder")}
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
                        onChange: (v) => {
                            setActiveKey(v)
                        }
                    }}
                />
            </div>
        </div>
    )
}
