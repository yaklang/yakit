import {YakURL,} from "@/pages/yakURLTree/data";
import {yakitFailed} from "@/utils/notification";
import {requestYakURLList} from "./yakURLTree/netif";
import {showModal} from "@/utils/showModal";
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor";
import {showYakitModal, YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {Divider} from "antd";
import { TreeNode } from "@/components/WebTree/WebTree";

const {ipcRenderer} = window.require("electron");

// export const showFile = (url: YakURL, content: string, setContent: (value: string) => void, setLoading: (value: boolean) => void) => {
//     url.Query = url.Query.map(queryItem => {
//         if (queryItem.Key === 'mode') {
//             return {...queryItem, Value: 'show'};  // 如果键是 'mode'，则将值改为 'show'
//         } else {
//             return queryItem;  // 否则保持原样
//         }
//     });
//     setLoading(true);  // 开始请求前，设置加载状态为 true
//
//     requestYakURLList({url}).then(
//         (rsp) => {
//             content = rsp.Resources[0]?.Extra.find(extra => extra.Key === 'content')?.Value || '';
//             // 找到回显的结果，并将其值赋给 'content'
//             console.log(content);
//             setLoading(false);  // 请求结束后，设置加载状态为 false
//             const edit = showYakitModal({
//                 title: "编辑 Shell",
//                 width: "60%",
//                 onCancelText: "返回",
//                 onOkText: "保存",
//                 content: (
//                     <>
//                         <div style={{height: 500, overflow: "hidden"}}>
//                             <YakitEditor
//                                 type={"yak"}
//                                 value={content}
//                                 setValue={setContent}
//                             />
//                         </div>
//                         <Divider type='vertical' style={{margin: "5px 0px 0px 5px", top: 1}}/>
//                     </>
//                 ),
//                 onOk: () => {
//                     console.log("content: ", content)
//                     requestYakURLList({ url, method: "PUT" }, Buffer.from(content)).then((r) => {
//                         console.log(r);
//                         edit.destroy();
//                     }).catch((e) => {
//                             yakitFailed(`更新失败: ${e}`);
//                         }
//                     );
//                 },
//                 onCancel: () => {
//                     edit.destroy();
//                 },
//
//                 modalAfterClose: () => edit && edit.destroy(),
//             });
//         }
//     ).finally(() => {
//             setLoading(false);
//         }
//     );
//
//     //     rsp => {
//     //     const content = rsp.Resources[0]?.Extra.find(extra => extra.Key === 'content')?.Value || '';
//     //     // 找到回显的结果，并将其值赋给 'content'
//     //     console.log(content);
//     //     setLoading(false);  // 请求结束后，设置加载状态为 false
//     //     const edit = YakitModalConfirm({
//     //         title: "编辑 Shell",
//     //         width: "60%",
//     //         onCancelText: "返回",
//     //         onOkText: "保存",
//     //         content: (
//     //             <div style={{height: 500, overflow: "hidden"}}>
//     //                 <YakitEditor
//     //                     type={"yak"}
//     //                     value={content}
//     //                     setValue={setContent}
//     //                 />
//     //             </div>
//     //         ),
//     //         onOk: () => {
//     //             requestYakURLList({ url, method: "PUT" }, "PUT", Buffer.from(content)).then((r) => {
//     //                 console.log(r);
//     //                 edit.destroy();
//     //             }).catch((e) => {
//     //                     yakitFailed(`更新失败: ${e}`);
//     //                 }
//     //             );
//     //         },
//     //         onCancel: () => {
//     //             edit.destroy();
//     //         },
//     //
//     //         modalAfterClose: () => edit && edit.destroy(),
//     //     });
//     // }).finally(() => {
//     //     setLoading(false);
//     // });
//
// }

// 返回上一层
export const goBack = (url: YakURL, setLoading: (value: boolean) => void, setGoBackTree: (data: TreeNode[]) => void) => {
    url.Path = url.Path + "../"
    setLoading(true);  // 开始请求前，设置加载状态为 true

    requestYakURLList({url}, rsp => {
        const resources = rsp.Resources;
        let indexCounter = 0; // 设置索引计数器
        const files: TreeNode[] = resources
            .filter(i => !i.HaveChildrenNodes) // 过滤掉有子节点的项，即文件
            .map((i, index) => ({
                title: i.VerboseName,
                key: `${indexCounter++}`,
                data: i,
                isLeaf: !i.HaveChildrenNodes,
            }));

        const dirs: TreeNode[] = resources
            .filter(i => i.HaveChildrenNodes) // 过滤掉没有子节点的项，即目录
            .map((i, index) => ({
                title: i.VerboseName,
                key: `${indexCounter++}`,
                data: i,
                isLeaf: !i.HaveChildrenNodes,
            }));
        setGoBackTree(dirs);
        setLoading(false);  // 请求结束后，设置加载状态为 false
    });
}


export const updateFile = (url: YakURL, setLoading: (value: boolean) => void) => {
    url.Query = url.Query.map(queryItem => {
        if (queryItem.Key === 'mode') {
            return {...queryItem, Value: 'show'};  // 如果键是 'mode'，则将值改为 'show'
        } else {
            return queryItem;  // 否则保持原样
        }
    });
    setLoading(true);  // 开始请求前，设置加载状态为 true

    requestYakURLList({url}, rsp => {
        const content = rsp.Resources[0]?.Extra.find(extra => extra.Key === 'content')?.Value || '';
        // 找到回显的结果，并将其值赋给 'content'
        setLoading(false);  // 请求结束后，设置加载状态为 false
        const edit = showModal({
            title: "编辑 Shell",
            width: "60%",
            content: (
                <div style={{height: 500, overflow: "hidden"}}>
                    <YakitEditor
                        type={"yak"}
                        value={content}
                        readOnly={true}
                    />
                </div>
            ),
            modalAfterClose: () => edit && edit.destroy(),
        });
    });
}