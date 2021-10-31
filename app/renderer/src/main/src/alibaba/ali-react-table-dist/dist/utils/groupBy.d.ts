export default function groupBy<T, K extends string>(list: T[], iteratee: (t: T) => K): { [key in K]: T[]; };
