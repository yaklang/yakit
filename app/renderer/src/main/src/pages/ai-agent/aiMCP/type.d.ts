import {MCPServer, MCPServerTool} from "../type/aiMCP"

export interface AIMCPProps {}
export interface AIMCPListProps {
    setCurrentMCP: (item: MCPServer) => void
}
export interface AIMCPToolListProps {
    item: MCPServer
    onBack: () => void
}
export interface AIMCPToolItemProps {
    toolItem: MCPServerTool
}
export interface AIMCPToolItemPopoverContentProps {
    toolItem: MCPServerTool
}
export interface AIMCPListItemProps {
    item: MCPServer
    onRefresh: () => void
    setCurrentMCP: (item: MCPServer) => void
    onSetData: (item: MCPServer) => void
}
