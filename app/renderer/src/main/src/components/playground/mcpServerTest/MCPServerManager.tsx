import React, {useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {MCPServerList} from "./MCPServerList"
import {MCPServerDetail} from "./MCPServerDetail"
import {MCPServer} from "./types"
import styles from "./MCPServerManager.module.scss"

export const MCPServerManager: React.FC = () => {
    const [selectedServer, setSelectedServer] = useState<MCPServer>()
    const [refreshKey, setRefreshKey] = useState(0)

    const handleSelectServer = (server: MCPServer) => {
        setSelectedServer(server)
    }

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1)
    }

    return (
        <div className={styles["mcp-server-manager"]}>
            <AutoCard title='MCP Server 管理' bodyStyle={{padding: 0, overflow: "hidden"}} style={{height: "100%"}}>
                <YakitResizeBox
                    firstNode={
                        <MCPServerList
                            key={refreshKey}
                            selectedServerId={selectedServer?.ID}
                            onSelectServer={handleSelectServer}
                            onRefresh={handleRefresh}
                        />
                    }
                    firstMinSize='300px'
                    firstRatio='300px'
                    secondNode={<MCPServerDetail server={selectedServer} onRefresh={handleRefresh} />}
                />
            </AutoCard>
        </div>
    )
}

