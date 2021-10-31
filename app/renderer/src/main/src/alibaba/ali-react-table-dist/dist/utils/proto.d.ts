declare type SameKeysWith<T> = T extends object ? {
    [key in keyof T]?: any;
} : T;
interface ObjectProto<T> {
    (v: SameKeysWith<T>): T;
    extends(ext: SameKeysWith<T>): ObjectProto<T>;
}
interface ArrayProto<T> {
    (items: SameKeysWith<T>[]): T[];
    extends(extRecord: SameKeysWith<T>): ArrayProto<T>;
}
export interface ProtoStatic {
    string(v: string): string;
    number(v: number): number;
    notNull<T = any>(v: any): T;
    object<O extends object = any>(base: SameKeysWith<O>): ObjectProto<O>;
    array<T extends object = any>(base: SameKeysWith<T>): ArrayProto<T>;
    readonly empty: unique symbol;
}
declare const _default: ProtoStatic;
export default _default;
