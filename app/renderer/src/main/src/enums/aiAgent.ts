export enum RemoteAIAgentGV {
    /** @name ai-agent-chat 全局配置 */
    AIAgentChatSetting = "ai-agent-chat-setting",
    /** @name 客户端列表 */
    MCPClientList = "mcp-aiagent-list",
    /** @name 历史对话 */
    AIAgentChatHistory = "ai-agent-chat-history",

    /**
     * 清空用户缓存数据的依据
     * 代码会向缓存里设置一个固定值，如果缓存值和固定值不一样, 则需要清除缓存数据，一样则不需要清除
     */
    AIAgentCacheClear = "ai-agent-cache-clear"
}
