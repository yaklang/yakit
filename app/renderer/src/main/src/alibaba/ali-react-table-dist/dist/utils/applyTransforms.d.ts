import { Transform } from '../interfaces';
/**
 * 以 input 作为输入，按序使用 transform.
 *
 * `applyTransforms(input, f1, f2, f3)` 等价于 `f3(f2(f1(input)))` */
export default function applyTransforms<T>(input: T, ...transforms: Transform<T>[]): T;
