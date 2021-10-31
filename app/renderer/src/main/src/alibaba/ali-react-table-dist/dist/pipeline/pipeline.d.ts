import { BaseTableProps, PrimaryKey } from '../base-table';
import { ArtColumn, TableTransform, Transform } from '../interfaces';
declare type RowPropsGetter = BaseTableProps['getRowProps'];
export interface TablePipelineIndentsConfig {
    iconIndent: number;
    iconWidth: 16;
    iconGap: number;
    indentSize: number;
}
export interface TablePipelineCtx {
    primaryKey?: PrimaryKey;
    components: {
        [name: string]: any;
    };
    indents: TablePipelineIndentsConfig;
    [key: string]: any;
}
/**
 * 表格数据处理流水线。TablePipeline 提供了表格数据处理过程中的一些上下方与工具方法，包括……
 *
 * 1. ctx：上下文环境对象，step（流水线上的一步）可以对 ctx 中的字段进行读写。
 * ctx 中部分字段名称有特定的含义（例如 primaryKey 表示行的主键），使用自定义的上下文信息时注意避开这些名称。
 *
 * 2. rowPropsGetters：getRowProps 回调队列，step 可以通过 pipeline.appendRowPropsGetter 向队列中追加回调函数，
 *   在调用 pipeline.props() 队列中的所有函数会组合形成最终的 getRowProps
 *
 * 3. 当前流水线的状态，包括 dataSource, columns, rowPropsGetters 三个部分
 *
 * 4. snapshots，调用 pipeline.snapshot(name) 可以记录当前的状态，后续可以通过 name 来读取保存的状态
 * */
export declare class TablePipeline {
    private readonly _snapshots;
    private readonly _rowPropsGetters;
    private _dataSource;
    private _columns;
    static defaultIndents: TablePipelineIndentsConfig;
    readonly ctx: TablePipelineCtx;
    private readonly state;
    private readonly setState;
    constructor({ state, setState, ctx, }: {
        state: any;
        setState: TablePipeline['setState'];
        ctx: Partial<TablePipelineCtx>;
    });
    appendRowPropsGetter(getter: RowPropsGetter): this;
    getDataSource(name?: string): any[];
    getColumns(name?: string): any[];
    getStateAtKey<T = any>(stateKey: string, defaultValue?: T): T;
    /** 将 stateKey 对应的状态设置为 partialState  */
    setStateAtKey(stateKey: string, partialState: any, extraInfo?: any): void;
    /** 确保 primaryKey 已被设置，并返回 primaryKey  */
    ensurePrimaryKey(hint?: string): PrimaryKey;
    /** 设置流水线的输入数据 */
    input(input: {
        dataSource: any[];
        columns: ArtColumn[];
    }): this;
    /** 设置 dataSource */
    dataSource(rows: any[]): this;
    /** 设置 columns */
    columns(cols: ArtColumn[]): this;
    /** 设置主键 */
    primaryKey(key: PrimaryKey): this;
    /** 保存快照 */
    snapshot(name: string): this;
    /** @deprecated
     *  应用一个 ali-react-table-dist Table transform */
    useTransform(transform: TableTransform): this;
    /** 使用 pipeline 功能拓展 */
    use(step: (pipeline: this) => this): this;
    /** 转换 dataSource */
    mapDataSource(mapper: Transform<any[]>): this;
    /** 转换 columns */
    mapColumns(mapper: Transform<ArtColumn[]>): this;
    /** 获取 BaseTable 的 props，结果中包含 dataSource/columns/primaryKey/getRowProps 四个字段 */
    getProps(): BaseTableProps;
}
export declare function useTablePipeline(ctx?: Partial<TablePipelineCtx>): TablePipeline;
export {};
