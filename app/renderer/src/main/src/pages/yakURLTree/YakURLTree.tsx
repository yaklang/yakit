import React, {useEffect, useState} from "react";
import {Form, Tree} from "antd";
import {useMemoizedFn} from "ahooks";
import {debugYakitModal, debugYakitModalAny} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {yakitFailed, yakitInfo} from "@/utils/notification";
import {pathExists} from "fs-extra";
import {loadFromYakURLRaw, requestYakURLList} from "@/pages/yakURLTree/netif";
import {YakURLResource} from "@/pages/yakURLTree/data";
import {AutoCard} from "@/components/AutoCard";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {InputItem} from "@/utils/inputUtil";
import { TreeNode } from "@/components/WebTree/WebTree";

export interface YakURLTreeProp {

}

const DirectoryTree = Tree.DirectoryTree;


export const YakURLTree: React.FC<YakURLTreeProp> = (props) => {
        const [data, setData] = useState<TreeNode[]>([]);
        const [yakurl, setYakURL] = useState<string>("website:///");
        const [selected, setSelected] = useState<YakURLResource>();

        useEffect(() => {
            if (!yakurl) {
                return
            }
            loadFromYakURLRaw(yakurl, rsp => {
                setData(rsp.Resources.map((i, index) => ({
                    title: i.VerboseName,
                    key: `${index}`,
                    data: i,
                    isLeaf: !i.HaveChildrenNodes,
                })))
            }).catch(e => {
                yakitFailed(`加载失败: ${e}`)
                setData([])
            })
        }, [yakurl])


        const refreshChildrenByParent = useMemoizedFn((parentKey: string, nodes: TreeNode[]) => {
            const pathsBlock: string[] = parentKey.split("-")
            const paths: string[] = pathsBlock.map((_, index) => {
                return pathsBlock.slice(undefined, index + 1).join("-")
            })

            function visitData(d: TreeNode[], depth: number) {
                if (depth + 1 > paths.length) {
                    return
                }
                d.forEach(i => {
                    if (i.key !== paths[depth]) {
                        return
                    }

                    if (depth + 1 !== paths.length) {
                        visitData(i.children || [], depth + 1)
                        return
                    }
                    i.children = nodes
                })
            }

            visitData(data, 0)
            return data;
        })

        return <AutoCard
            title={<Form layout={"inline"} onSubmitCapture={e => {
                e.preventDefault()
            }}><InputItem label={"YakURL"} value={yakurl} setValue={setYakURL}/></Form>}
            size={"small"} bodyStyle={{overflowY: "hidden", padding: 0, margin: 0}}
        >
            <YakitResizeBox
                isVer={false}
                firstMinSize={"300ox"} firstRatio={"350px"}
                firstNode={<DirectoryTree<TreeNode>
                    loadData={(node) => {
                        const originData = node.data;
                        return new Promise((resolve, reject) => {
                            if (originData === undefined) {
                                reject("node.data is empty")
                                return
                            }

                            requestYakURLList(originData.Url, rsp => {
                                const newNodes: TreeNode[] = rsp.Resources.map((i, index) => ({
                                    title: i.VerboseName,
                                    key: `${node.key}-${index}`,
                                    data: i,
                                    isLeaf: !i.HaveChildrenNodes,
                                }));
                                setData([...refreshChildrenByParent(node.key + "", newNodes)])
                                resolve(rsp)
                            }, reject)
                        })
                    }}
                    onSelect={(selectedKeys, info) => {
                        const node = info.node as any as TreeNode;
                        if (node.data === undefined) {
                            return
                        }
                        setSelected(node.data as YakURLResource);
                    }}
                    treeData={data}
                />}
                secondNode={<div>
                    {selected ? <div>SELECTED {`${JSON.stringify(selected)}`}</div> : <div>未选择</div>}
                </div>}
            />
        </AutoCard>
    }
;