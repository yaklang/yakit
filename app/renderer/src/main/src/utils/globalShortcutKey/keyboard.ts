/**
 * 参考按键映射信息
 * url: https://www.w3.org/TR/uievents-code/#code-value-tables
 */

/** 可输出型按键 */
export enum YakitKeyBoard {
    // #region 键盘上方数字按键
    Digit_0 = "0",
    Digit_1 = "1",
    Digit_2 = "2",
    Digit_3 = "3",
    Digit_4 = "4",
    Digit_5 = "5",
    Digit_6 = "6",
    Digit_7 = "7",
    Digit_8 = "8",
    Digit_9 = "9",
    // #endregion

    // #region 小键盘数字按键
    Numpad_0 = "Numpad_0",
    Numpad_1 = "Numpad_1",
    Numpad_2 = "Numpad_2",
    Numpad_3 = "Numpad_3",
    Numpad_4 = "Numpad_4",
    Numpad_5 = "Numpad_5",
    Numpad_6 = "Numpad_6",
    Numpad_7 = "Numpad_7",
    Numpad_8 = "Numpad_8",
    Numpad_9 = "Numpad_9",
    // #endregion

    // #region 字母
    KEY_A = "A",
    KEY_B = "B",
    KEY_C = "C",
    KEY_D = "D",
    KEY_E = "E",
    KEY_F = "F",
    KEY_G = "G",
    KEY_H = "H",
    KEY_I = "I",
    KEY_J = "J",
    KEY_K = "K",
    KEY_L = "L",
    KEY_M = "M",
    KEY_N = "N",
    KEY_O = "O",
    KEY_P = "P",
    KEY_Q = "Q",
    KEY_R = "R",
    KEY_S = "S",
    KEY_T = "T",
    KEY_U = "U",
    KEY_V = "V",
    KEY_W = "W",
    KEY_X = "X",
    KEY_Y = "Y",
    KEY_Z = "Z",
    // #endregion

    // #region F数字键
    F1 = "F1",
    F2 = "F2",
    F3 = "F3",
    F4 = "F4",
    F5 = "F5",
    F6 = "F6",
    F7 = "F7",
    F8 = "F8",
    F9 = "F9",
    F10 = "F10",
    F11 = "F11",
    F12 = "F12",
    // #endregion

    // #region 功能键
    Shift = "Shift",
    Control = "Control",
    Alt = "Alt",
    Meta = "Meta",

    Escape = "Escape",
    Tab = "Tab",
    CapsLock = "CapsLock",
    Backspace = "Backspace",
    Enter = "Enter",

    Backquote = "`", // `~
    Minus = "-", // -_
    Equal = "=", // =+
    BracketLeft = "[", // [{
    BracketRight = "]", // ]}
    Backslash = "\\", // \|
    Semicolon = ";", // ;:
    Quote = "'", // '"
    Comma = ",", // ,<
    Period = ".", // .>
    Slash = "/", // /?
    Space = "space", // 空格

    Delete = "delete",
    Insert = "insert",
    Home = "home",
    End = "end",
    PageUp = "pageup",
    PageDown = "pagedown",
    // #endregion

    // #region 方向键
    UpArrow = "up",
    DownArrow = "down",
    LeftArrow = "left",
    RightArrow = "right",
    // #endregion

    // #region 小键盘功能键
    Numpad_Divide = "Numpad_Divide", // /
    Numpad_Multiply = "Numpad_Multiply", // *
    Numpad_Subtract = "Numpad_Subtract", // -
    Numpad_Add = "Numpad_Add", // +
    Numpad_Decimal = "Numpad_Decimal" // .
    // #endregion
}

/** 修饰作用型按键 */
export enum YakitKeyMod {
    Alt = YakitKeyBoard.Alt,
    Shift = YakitKeyBoard.Shift,
    Control = YakitKeyBoard.Control,
    Meta = YakitKeyBoard.Meta,
    /** mac下对应cmd, win下对应ctrl */
    CtrlCmd = "ctrl-cmd"
}
