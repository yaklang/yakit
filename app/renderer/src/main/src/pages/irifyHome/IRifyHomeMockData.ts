export const MOCK_HOME_DATA = {
  riskDistribution: {
    total: 1137,
    totalLabel: '文件类型名称',
    items: [
      { name: '风险类型名称', value: 15, percent: 0.1 },
      { name: '风险类型名称', value: 15, percent: 0.1 },
      { name: '风险类型名称', value: 15, percent: 0.1 },
      { name: '风险类型名称', value: 15, percent: 0.1 },
      { name: '风险类型名称', value: 15, percent: 0.1 },
    ],
  },
  ruleHitsTop5: [
    { name: '硬编码密钥', value: 37 },
    { name: 'SQL 注入', value: 20 },
    { name: 'SQL 注入', value: 24 },
    { name: 'SQL 注入', value: 13 },
    { name: 'SQL 注入', value: 3 },
  ],
  recentProjects: Array.from({ length: 5 }, () => ({
    name: '使用工具扫描127.0.0.1的端口',
    language: 'Go',
    risk: 'high' as const,
    riskCount: 12,
    updateTime: '2026-06-02 10:50:55',
  })),
}
