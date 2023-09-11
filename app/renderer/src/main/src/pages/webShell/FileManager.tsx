import {RequestYakURLResponse, YakURL, YakURLResource} from "@/pages/yakURLTree/data";
import {yakitFailed} from "@/utils/notification";
import {requestYakURLList} from "@/pages/yakURLTree/netif";
import {showModal} from "@/utils/showModal";
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor";
import {TreeNode} from "@/pages/yakURLTree/YakURLTree";

const {ipcRenderer} = window.require("electron");

export const showFile = (url: YakURL, setLoading: (value: boolean) => void) => {
    url.Query = url.Query.map(queryItem => {
        if (queryItem.Key === 'mode') {
            return {...queryItem, Value: 'show'};  // 如果键是 'mode'，则将值改为 'show'
        } else {
            return queryItem;  // 否则保持原样
        }
    });
    setLoading(true);  // 开始请求前，设置加载状态为 true

    requestYakURLList(url, rsp => {
        const content = rsp.Resources[0]?.Extra.find(extra => extra.Key === 'content')?.Value || '';
        // 找到回显的结果，并将其值赋给 'content'
        console.log(content)
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

// 返回上一层
export  const goBack = (url: YakURL, setLoading: (value: boolean) => void, setGoBackTree: (data: TreeNode[]) => void) => {
    console.log("goBack ",url)
    url.Path = url.Path + "/.."
    setLoading(true);  // 开始请求前，设置加载状态为 true

    requestYakURLList(url, rsp => {
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