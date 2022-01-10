import React, {useEffect, useRef, useState} from "react";
import {AutoCard} from "../../components/AutoCard";
import {XTerm} from "xterm-for-react";
import {FitAddon} from "xterm-addon-fit";
import {SearchAddon} from "xterm-addon-search";
import {SearchBarAddon} from 'xterm-addon-search-bar';
import {Unicode11Addon} from "xterm-addon-unicode11";
import {Terminal as ITerminal} from "xterm";
import {randomString} from "../../utils/randomUtil";
import {failed} from "../../utils/notification";
import {useMemoizedFn} from "ahooks";

const {ipcRenderer} = window.require("electron");

export const Terminal = React.memo(() => {
    // https://github.com/77Z/electron-local-terminal-prototype
    const xtermRef = useRef(null);
    const [term, setTerm] = useState<ITerminal>();
    const [token, _] = useState(randomString(40));

    useEffect(() => {
        // @ts-ignore
        if (!xtermRef || !xtermRef.current || !(xtermRef.current?.terminal)) {
            return
        }
        // You can call any method in XTerm.js by using 'xterm xtermRef.current.terminal.[What you want to call]
        // @ts-ignore
        const terminal = xtermRef.current.terminal;
        setTerm(terminal)
    }, [xtermRef])

    useEffect(() => {
        if (!term) {
            return
        }

        const searchAddon = new SearchAddon();
        const searchAddonBar = new SearchBarAddon({searchAddon});
        term.loadAddon(new FitAddon());
        term.loadAddon(searchAddon);
        term.loadAddon(searchAddonBar);
        term.loadAddon(new Unicode11Addon());

        ipcRenderer.on(`${token}-message`, async (e, message: Uint8Array) => {
            term.write("Hello 111")
            term.write(new Buffer(message).toString())
        })

        ipcRenderer.invoke("terminal", token)
        return () => {
            ipcRenderer.removeAllListeners(`${token}-message`)
        }
    }, [term])

    const write = useMemoizedFn((data: any) => {
        ipcRenderer.invoke("write-terminal", token, data)
    })

    return <AutoCard bodyStyle={{padding: 0}}>
        <div style={{width: "100%"}}>
            <XTerm
                ref={xtermRef}
                options={{
                    convertEol: true
                }}
                onKey={(event) => {
                    try {
                        if (term) {
                            const code = event.key.charCodeAt(0)
                            if (code === 13) {
                                write("\n")
                                return
                            }
                            write(event.key)
                        }
                    } catch (e) {
                        failed(`write key failed: ${e}`)
                    }

                }}
            />
        </div>
    </AutoCard>
})