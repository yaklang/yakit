import { Subscription } from 'rxjs';
/** styled-components 类库的版本，ali-react-table-dist 同时支持 v3 和 v5 */
export declare const STYLED_VERSION: string;
export declare const STYLED_REF_PROP: string;
export declare const OVERSCAN_SIZE = 100;
export declare const AUTO_VIRTUAL_THRESHOLD = 100;
export declare function sum(arr: number[]): number;
export declare const throttledWindowResize$: import("rxjs").Observable<Event>;
export declare function getScrollbarSize(): {
    width: number;
    height: number;
};
/** 同步多个元素之间的 scrollLeft, 每当 scrollLeft 发生变化时 callback 会被调用 */
export declare function syncScrollLeft(elements: HTMLElement[], callback: (scrollLeft: number) => void): Subscription;
/**
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 */
export declare function shallowEqual<T>(objA: T, objB: T): boolean;
