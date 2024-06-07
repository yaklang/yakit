import { yakitNotify } from "@/utils/notification"
import { CodeScoreSmokingEvaluateResponseProps } from "../plugins/funcTemplateType"
import {RequestYakURLResponse} from "../yakURLTree/data"
import {FileNodeProps} from "./FileTree/FileTreeType"
import {FileDefault, FileSuffix, FolderDefault} from "./FileTree/icon"
import { StringToUint8Array } from "@/utils/str"
import { ConvertYakStaticAnalyzeErrorToMarker, YakStaticAnalyzeErrorResult } from "@/utils/editorMarkers"

const {ipcRenderer} = window.require("electron")

export const grpcFetchFileTree: (path: string) => Promise<FileNodeProps[]> = (path) => {
    return new Promise(async (resolve, reject) => {
        const params = {
            Method: "GET",
            Url: {Schema: "file", Query: [{Key: "op", Value: "list"}], Path: path}
        }

        try {
            const list: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)

            const data: FileNodeProps[] = list.Resources.map((item) => {
                const isFile = !item.ResourceType
                const isFolder = item.ResourceType === "dir"
                const suffix = isFile && item.ResourceName.indexOf(".") > -1 ? item.ResourceName.split(".").pop() : ""
                const isLeaf = isFile || !item.HaveChildrenNodes
                return {
                    name: item.ResourceName,
                    path: item.Path,
                    isFolder: isFolder,
                    icon: isFolder ? FolderDefault : suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
                    isLeaf: isLeaf
                }
            })

            resolve(data)
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 更新树数据里某个节点的children数据
 */
export const updateFileTree: (data: FileNodeProps[], key: string, updateData: FileNodeProps[]) => FileNodeProps[] = (
    data,
    key,
    updateData
) => {
    if (!key) return data

    const isValid = updateData && updateData.length > 0

    return data.map((node) => {
        if (node.path === key) {
            return {...node, isLeaf: !isValid, children: isValid ? updateData : undefined}
        }
        if (node.children && node.children.length > 0) {
            return {
                ...node,
                children: updateFileTree(node.children, key, updateData)
            }
        }
        return node
    })
}

/**
 * @name 语法检查
 */
export const onSyntaxCheck = (code:string) => {
    return new Promise(async (resolve, reject) => {
        // StaticAnalyzeError
        ipcRenderer
                    .invoke("StaticAnalyzeError", {Code: StringToUint8Array(code), PluginType: "yak"})
                    .then((e: {Result: YakStaticAnalyzeErrorResult[]}) => {
                        if (e && e.Result.length > 0) {
                            const markers = e.Result.map(ConvertYakStaticAnalyzeErrorToMarker)
                            // monaco.editor.setModelMarkers(model, "owner", markers)
                            resolve(markers)
                        } else {
                            resolve([])
                        }
                    }).catch(() => {
                        resolve([])
                    })
    })
}