import { RenderInfo } from './interfaces';
import { BaseTableProps } from './table';
export interface HtmlTableProps extends Required<Pick<BaseTableProps, 'getRowProps' | 'primaryKey' | 'components'>> {
    tbodyHtmlTag: 'tbody' | 'tfoot';
    data: any[];
    horizontalRenderInfo: Pick<RenderInfo, 'flat' | 'visible' | 'horizontalRenderRange' | 'stickyLeftMap' | 'stickyRightMap'>;
    verticalRenderInfo: {
        offset: number;
        first: number;
        last: number;
        limit: number;
    };
}
export declare function HtmlTable({ tbodyHtmlTag, getRowProps, primaryKey, data, verticalRenderInfo: verInfo, horizontalRenderInfo: hozInfo, components: { Row, Cell, TableBody }, }: HtmlTableProps): JSX.Element;
