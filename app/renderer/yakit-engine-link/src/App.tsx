import {memo} from "react"

import "./App.css"
import {Main} from "./pages/main"

const App: React.FC = memo(() => {
    return (
        <div style={{padding: 20}}>
            <Main />
        </div>
    )
})

export default App
