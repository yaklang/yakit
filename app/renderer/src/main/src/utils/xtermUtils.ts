import {ExecResult} from "../pages/invoker/schema";

export const writeXTerm = (xterm: any, data: string) => {
    if (xterm && xterm?.current) {
        xterm.current.terminal.write(data)
    }
};

export const writeExecResultXTerm = (xterm: any, result: ExecResult, encoding?: "utf8" | "latin1") => {
    if ((result?.Raw || []).length > 0) {
        writeXTerm(xterm, Buffer.from(result.Raw).toString(encoding && "utf8"))
    }
};

export const xtermFit = (xtermRef: any, columns?: number, rows?: number) => {
    if (xtermRef && xtermRef?.current && xtermRef.current.terminal) {
        xtermRef.current.terminal.resize(columns || 100, rows || 10);
    }
};

export const xtermClear = (xtermRef: any, columns?: number, rows?: number) => {
    if (xtermRef && xtermRef?.current && xtermRef.current.terminal) {
        xtermRef.current.terminal.clear();
    }
};