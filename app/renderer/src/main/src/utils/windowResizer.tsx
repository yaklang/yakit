import React from "react";

export const hookWindowResize = (f: (e: UIEvent) => any) => {
    // 修复 editor 的 resize 问题
    let origin = window.onresize;
    window.onresize = (e) => {
        f(e)
        // @ts-ignore
        if (origin) origin(e);
    };
    return () => {
        window.onresize = origin;
    }
}