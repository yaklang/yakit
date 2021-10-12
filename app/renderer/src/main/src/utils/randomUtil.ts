export const randomString = (length: number) => {
    let chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
};

export const getRandomInt = (max: number): number => {
    return Math.floor(Math.random() * Math.floor(max));
}

const availableColors = [
    "magenta",
    "red",
    "volcano",
    "orange",
    "gold",
    "lime",
    "green",
    "cyan",
    "blue",
    "geekblue",
    "purple",
];

export const randomColor = (): string => {
    return availableColors[getRandomInt(availableColors.length)]
};