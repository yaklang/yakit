import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {Tooltip} from "antd"
import {} from "@ant-design/icons"
import {useMemoizedFn, useSize} from "ahooks"
import styles from "./DocumentCollect.module.scss"
import {failed} from "@/utils/notification"
import classNames from "classnames"
import {DocumentCollectProps, HoleResourceType, HoleTreeNode} from "./DocumentCollectType"
import {grpcFetchHoleTree} from "../utils"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {OutlineDocumentIcon, OutlineLink2Icon, OutlineVariableIcon} from "@/assets/icon/outline"
import YakitTree, {TreeKey} from "@/components/yakitUI/YakitTree/YakitTree"
import {RequestYakURLResponse} from "@/pages/yakURLTree/data"
import {SolidFolderIcon, SolidFolderopenIcon} from "@/assets/icon/solid"
import {SSARisksFilter} from "../YakitAuditHoleTable/YakitAuditHoleTableType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {RefreshIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {RiskTree} from "@/pages/yakRunnerAuditCode/RunnerFileTree/RunnerFileTree"

const renderTreeNodeIcon = (treeNodeType: HoleResourceType) => {
    const iconsEle = {
        ["function"]: <OutlineDocumentIcon className='yakitTreeNode-icon' />,
        ["program"]: <OutlineVariableIcon className='yakitTreeNode-icon' />,
        ["source"]: <OutlineLink2Icon className='yakitTreeNode-icon' />
    }
    return iconsEle[treeNodeType] || <></>
}

export const DocumentCollect: React.FC<DocumentCollectProps> = (props) => {
    const {query, setQuery} = props
    const [searchValue, setSearchValue] = useState<string>("")
    // 真实搜索请求
    const [realSearch,setRealSearch] = useState<string>("")
    // 重置
    const [init,setInit] = useState<boolean>(false)

    const refreshChildrenByParent = useMemoizedFn(
        (origin: HoleTreeNode[], parentKey: string, nodes: HoleTreeNode[]) => {
            const arr: HoleTreeNode[] = origin.map((node) => {
                if (node.key === parentKey) {
                    return {
                        ...node,
                        children: nodes
                    } as HoleTreeNode
                }
                if (node.children) {
                    return {
                        ...node,
                        children: refreshChildrenByParent(node.children, parentKey, nodes)
                    } as HoleTreeNode
                }
                return node
            })
            return arr
        }
    )

    const cacheQueryRef = useRef<SSARisksFilter>({})

    // 搜索框
    const onSearchChange = useMemoizedFn((e: {target: {value: string}}) => {
        const value = e.target.value
        setSearchValue(value)
    })

    const reset = useMemoizedFn(() => {
        setSearchValue("")
        setRealSearch("")
    })

    // 搜索树
    const onSearchTree = useMemoizedFn((value: string) => {
        setSearchValue(value)
        setRealSearch(value)
    })

    // 刷新树
    const refreshTreeFun = useMemoizedFn(() => {
        // 当表格查询参数未完全清空时
        if (cacheQueryRef.current) {
            setQuery({...query, ...cacheQueryRef.current})
        }
        reset()
        setInit(!init)
    })

    return (
        <div className={styles["document-collect"]}>
            <div className={styles["tree-top-wrap"]}>
                <YakitInput.Search
                    wrapperStyle={{width: "calc(100% - 40px)", marginBottom: 15}}
                    placeholder={"请输入文件名或函数进行搜索"}
                    allowClear
                    onChange={onSearchChange}
                    onSearch={onSearchTree}
                    value={searchValue}
                />
                <YakitButton type='text2' icon={<RefreshIcon />} onClick={refreshTreeFun} style={{marginBottom: 15}} />
            </div>
            <div className={styles["tree-wrap"]}>
                <RiskTree
                    type='risk'
                    projectName='/'
                    init={init}
                    search={realSearch}
                    onSelectedNodes={(node) => {
                        const filter = node.data?.Extra.find((item) => item.Key === "filter")?.Value
                        if (filter) {
                            try {
                                const newParams = JSON.parse(filter)
                                setQuery({...query, ...cacheQueryRef.current, ...newParams})
                                // 缓存选中前所更改的参数内容 将其置为空用于还原
                                let cache: SSARisksFilter = {}
                                Object.keys(newParams).forEach((key) => {
                                    cache[key] = []
                                })
                                cacheQueryRef.current = cache
                            } catch (_) {
                                setQuery({...query, ...cacheQueryRef.current})
                                cacheQueryRef.current = {}
                            }
                        } else {
                            setQuery({...query, ...cacheQueryRef.current})
                            cacheQueryRef.current = {}
                        }
                    }}
                />
            </div>
        </div>
    )
}
