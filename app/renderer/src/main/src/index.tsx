import ReactDOM from "react-dom"
import reportWebVitals from "./reportWebVitals"
/** 该样式必须放在APP组件的前面，因为里面有antd样式，放后面会把APP组件内的样式覆盖 */
import "./index.css"
import NewApp from "./NewApp"
import {HTML5Backend} from "react-dnd-html5-backend"
import {DndProvider} from "react-dnd"
import "./yakitUI.scss"
import "./theme/yakit.scss"
import "./yakitLib.scss"
import "./assets/global.scss"

ReactDOM.render(
    // <React.StrictMode>
    <DndProvider backend={HTML5Backend}>
        <NewApp />
    </DndProvider>,
    // </React.StrictMode>,
    document.getElementById("root")
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
