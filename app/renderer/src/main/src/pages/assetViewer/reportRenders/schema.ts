export interface ReportItem {
    type: string
    content: string
    direction?:boolean
}

/**
 * @name 报告-json数据类型种类
 */
export type ReportJsonKindData = {
    /**
     * @name 柱状图
     */
    "bar-graph": {
      color: string[];
      data: { name: string; value: number }[];
      type: string;
      title?: string
    };
    /**
     * @name 报告封面
     */
    "report-cover": {
      type: string;
      data: "critical" | "high" | "warning" | "low" | "security";
    };
  };