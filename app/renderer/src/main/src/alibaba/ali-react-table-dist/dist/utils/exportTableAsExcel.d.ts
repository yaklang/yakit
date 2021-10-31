import type XLSX_NS from 'xlsx';
import { ArtColumn } from '../interfaces';
/** 根据 BaseTable 的 dataSource 和 column，将表格数据导出为 Excel 文件 */
export default function exportTableAsExcel(xlsxPackage: typeof XLSX_NS, dataSource: any[], columns: ArtColumn[], filename: string): void;
