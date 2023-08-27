import React, {useEffect, useState} from "react";
import {Tree} from "antd";
import {useMemoizedFn} from "ahooks";
import {debugYakitModal, debugYakitModalAny} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {yakitFailed, yakitInfo} from "@/utils/notification";
import {pathExists} from "fs-extra";
import {loadFromYakURLRaw, requestYakURLList} from "@/pages/yakURLTree/netif";
import {YakURLResource} from "@/pages/yakURLTree/data";

export interface YakURLTreeProp {

}

const DirectoryTree = Tree.DirectoryTree;


interface TreeNode {
    title: string;
    key: string;
    isLeaf?: boolean;
    children?: TreeNode[];
    data?: YakURLResource
}

export const YakURLTree: React.FC<YakURLTreeProp> = (props) => {
        const [data, setData] = useState<TreeNode[]>([]);

        useEffect(() => {
            loadFromYakURLRaw(`file:///tmp`, rsp => {
                setData(rsp.Resources.map((i, index) => ({
                    title: i.VerboseName,
                    key: `${index}`,
                    data: i,
                    isLeaf: !i.HaveChildrenNodes,
                })))
            }).catch(e => {
                yakitFailed(`加载失败: ${e}`)
            })
        }, [])


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

        return <DirectoryTree<TreeNode>
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
                        setData([...refreshChildrenByParent(node.key, newNodes)])
                        resolve(rsp)
                    }, reject)
                })
            }}
            treeData={data}
        />
    }
;