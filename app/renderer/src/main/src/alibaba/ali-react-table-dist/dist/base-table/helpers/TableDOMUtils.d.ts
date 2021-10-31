export declare class TableDOMHelper {
    readonly artTableWrapper: HTMLDivElement;
    readonly artTable: HTMLDivElement;
    readonly tableHeader: HTMLDivElement;
    readonly tableBody: HTMLDivElement;
    readonly tableFooter: HTMLDivElement;
    readonly stickyScroll: HTMLDivElement;
    readonly stickyScrollItem: HTMLDivElement;
    constructor(artTableWrapper: HTMLDivElement);
    getVirtualTop(): HTMLDivElement;
    getTableRows(): NodeListOf<HTMLTableRowElement>;
    getTableBodyHtmlTable(): HTMLTableElement;
    getLeftLockShadow(): HTMLDivElement;
    getRightLockShadow(): HTMLDivElement;
    getLoadingIndicator(): HTMLDivElement;
}
