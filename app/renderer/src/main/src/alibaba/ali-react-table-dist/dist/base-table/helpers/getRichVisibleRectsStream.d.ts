import { Observable } from 'rxjs';
export declare function getRichVisibleRectsStream(target: HTMLElement, structureMayChange$: Observable<'structure-may-change'>, virtualDebugLabel?: string): Observable<{
    event: unknown;
    targetRect: {
        top: number;
        left: number;
        bottom: number;
        right: number;
    };
    scrollParentRect: {
        top: number;
        left: number;
        bottom: number;
        right: number;
    };
    offsetY: number;
    clipRect: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
}>;
