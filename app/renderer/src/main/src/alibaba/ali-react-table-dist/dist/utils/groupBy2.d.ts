export default function groupBy2<T, K extends string | number>(list: T[], iteratee: (t: T) => K): Map<K, T[]>;
