export declare function flatMap<T, U>(array: T[], callback: (value: T, index: number, array: T[]) => U[]): U[];
export declare function fromEntries<T = any>(entries: Iterable<readonly [PropertyKey, T]>): {
    [x: string]: T;
    [x: number]: T;
};
export declare const arrayUtils: {
    readonly diff: (arr1: string[], arr2: Iterable<string>) => string[];
    readonly merge: (arr1: string[], arr2: string[]) => string[];
};
export declare function always<T>(value: T): (...args: any[]) => T;
