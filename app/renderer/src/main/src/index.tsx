import ReactDOM from "react-dom"
import reportWebVitals from "./reportWebVitals"
/** 该样式必须放在APP组件的前面，因为里面有antd样式，放后面会把APP组件内的样式覆盖 */
import "./index.css"
import NewApp from "./NewApp"
import {HTML5Backend} from "react-dnd-html5-backend"
import {DndProvider} from "react-dnd"
// import {createRoot} from "react-dom/client"
import "./yakitUI.scss"
import "./theme/yakit.scss"
import "./yakitLib.scss"
import "./assets/global.scss"
import {useEffect, useState} from "react"
import ChildNewApp from "./ChildNewApp"

window.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        return `./static/js/${label}.worker.js`
    }
}

const getQueryParam = (param) => {
    return new URLSearchParams(window.location.search).get(param)
}

const App = () => {
    const [windowType, setWindowType] = useState(getQueryParam("window"))

    useEffect(() => {
        const onPopState = () => {
            setWindowType(getQueryParam("window"))
        }

        window.addEventListener("popstate", onPopState)
        return () => window.removeEventListener("popstate", onPopState)
    }, [])
    return windowType === "child" ? <ChildNewApp /> : <NewApp />
}

// 只在子窗口移除 loading
if (window.location.search.includes("window=child")) {
    const initialLoading = document.getElementById("initial-loading")
    if (initialLoading) {
        initialLoading.remove()
    }
}

// const divRoot = document.getElementById("root")
// if (divRoot) {
//     createRoot(divRoot).render(
//         // <React.StrictMode>
//         <DndProvider backend={HTML5Backend}>
//             <NewApp />
//         </DndProvider>
//         // </React.StrictMode>,
//     )
// } else {
//     // 正常情况/理论情况下，是不会出现这个情况
//     createRoot(document.body).render(<div>此安装包有问题,请联系Yakit官方管理员</div>)
// }
// ahooks useVirtualList在createRoot(divRoot).render生成下的元素会出现渲染不及时，掉帧闪的问题，暂时先换成ReactDOM.render，期待官方修复
// antd menu 存在多个二级菜单时, 在createRoot(divRoot).render生成下，会导致鼠标从一个二级菜单移动到下一个二级菜单后，前一个二级菜单不消失的情况，暂不确定原因，等升级antd5后再次尝试
ReactDOM.render(
    // <React.StrictMode>
    <DndProvider backend={HTML5Backend}>
        <App />
    </DndProvider>,
    // </React.StrictMode>,
    document.getElementById("root")
)
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
