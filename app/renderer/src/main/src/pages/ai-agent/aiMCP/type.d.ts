import {MCPServer} from "../type/aiMCP"

export interface AIMCPProps {}
export interface AIMCPListProps {
    setCurrentMCP: (item: MCPServer) => void
}
export interface AIMCPToolListProps {
    item: MCPServer
    onBack: () => void
}
export interface AIMCPListItemProps {
    item: MCPServer
    onRefresh: () => void
    setCurrentMCP: (item: MCPServer) => void
    onSetData: (item: MCPServer) => void
}
