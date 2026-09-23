export enum GlobalConfigRemoteGV {
  // @name 自动性能采样
  PProfFileAutoAnalyze = 'PProf_File_Auto_Analyze',
  SecondaryTabsNum = 'Secondary_Tabs_Num',
  PerformanceTips = 'Performance_Tips',
  /** MITM/历史列表内联原始包上限（字节）。0=不带包，默认 300K，最大 500K */
  HTTPFlowListInlineMaxContentLength = 'YAKIT_HTTPFLOW_LIST_INLINE_MAX_CONTENT_LENGTH',
}
