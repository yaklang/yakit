'use strict';
const util = require('util');
const path = require('path');
const childProcess = require('child_process');

const TEN_MEGABYTES = 1000 * 1000 * 10;
const execFile = util.promisify(childProcess.execFile);

const windows = async () => {
    // Source: https://github.com/MarkTiedemann/fastlist
    let bin;
    switch (process.arch) {
        case 'x64':
            bin = 'fastlist-0.3.0-x64.exe';
            break;
        case 'ia32':
            bin = 'fastlist-0.3.0-x86.exe';
            break;
        default:
            throw new Error(`Unsupported architecture: ${process.arch}`);
    }

    const binPath = path.join(__dirname, 'extVendor', bin);
    const {stdout} = await execFile(binPath, {
        maxBuffer: TEN_MEGABYTES,
        windowsHide: true
    });

    return stdout
        .trim()
        .split('\r\n')
        .map(line => line.split('\t'))
        .map(([pid, ppid, name]) => ({
            pid: Number.parseInt(pid, 10),
            ppid: Number.parseInt(ppid, 10),
            name
        }));
};

const nonWindowsMultipleCalls = async (options = {}) => {
    const flags = (options.all === false ? '' : 'a') + 'wwxo';
    const ret = {};

    await Promise.all(['comm', 'args', 'ppid', 'uid', '%cpu', '%mem'].map(async cmd => {
        const {stdout} = await execFile('ps', [flags, `pid,${cmd}`], {maxBuffer: TEN_MEGABYTES});

        for (let line of stdout.trim().split('\n').slice(1)) {
            line = line.trim();
            const [pid] = line.split(' ', 1);
            const val = line.slice(pid.length + 1).trim();

            if (ret[pid] === undefined) {
                ret[pid] = {};
            }

            ret[pid][cmd] = val;
        }
    }));

    // Filter out inconsistencies as there might be race
    // issues due to differences in `ps` between the spawns
    return Object.entries(ret)
        .filter(([, value]) => value.comm && value.args && value.ppid && value.uid && value['%cpu'] && value['%mem'])
        .map(([key, value]) => ({
            pid: Number.parseInt(key, 10),
            name: path.basename(value.comm),
            cmd: value.args,
            ppid: Number.parseInt(value.ppid, 10),
            uid: Number.parseInt(value.uid, 10),
            cpu: Number.parseFloat(value['%cpu']),
            memory: Number.parseFloat(value['%mem'])
        }));
};

const ERROR_MESSAGE_PARSING_FAILED = 'ps output parsing failed';

const psFields = 'pid,ppid,uid,%cpu,%mem,comm,args';
// const psFields = 'pid,ppid,uid,comm,args';

// TODO: Use named capture groups when targeting Node.js 10
const psOutputRegex = /^[ \t]*(?<pid>\d+)[ \t]+(?<ppid>\d+)[ \t]+(?<uid>\d+)[ \t]+(?<cpu>\d+\.\d+)[ \t]+(?<memory>\d+\.\d+)[ \t]+/;
// const psOutputRegex = /^[ \t]*(?<pid>\d+)[ \t]+(?<ppid>\d+)[ \t]+(?<uid>\d+)[ \t]+/;

const nonWindowsSingleCall = async (options = {}) => {
    let stdout = "";
    try {
        const flags = options.all === false ? 'wwxo' : 'awwxo';
        // TODO: Use the promise version of `execFile` when https://github.com/nodejs/node/issues/28244 is fixed.
        const [psPid, stdoutRaw] = await new Promise((resolve, reject) => {
            const child = childProcess.exec(`ps ${flags} ${psFields} | grep 'yak[a-zA-Z_]*\\sgrpc' | grep -v grep`, {maxBuffer: TEN_MEGABYTES}, (error, stdout) => {
                if (error === null) {
                    resolve([child.pid, stdout]);
                } else {
                    reject(error);
                }
            });
        });
        stdout = stdoutRaw;
    } catch (e) {
        stdout = ""
    }

    const lines = stdout.trim().split('\n').filter(i => !!i);

    const processes = lines.map((line, index) => {
        const match = psOutputRegex.exec(line);
        if (match === null) {
            return {pid: 0};
        }

        const {pid, ppid, uid, cpu, memory} = match.groups;
        // const {pid, ppid, uid} = match.groups;

        return {
            pid: Number.parseInt(pid, 10),
            ppid: Number.parseInt(ppid, 10),
            uid: Number.parseInt(uid, 10),
            cpu: Number.parseFloat(cpu),
            memory: Number.parseFloat(memory),
            name: undefined,
            cmd: line
        };
    });

    // if (psIndex === undefined || commPosition === -1 || argsPosition === -1) {
    //     throw new Error(ERROR_MESSAGE_PARSING_FAILED);
    // }

    // const commLength = argsPosition - commPosition;
    // for (const [index, line] of lines.entries()) {
    //     processes[index].name = line.slice(commPosition, commPosition + commLength).trim();
    //     processes[index].cmd = line.slice(argsPosition).trim();
    // }

    return processes;
};

const nonWindows = async (options = {}) => {
    try {
        return await nonWindowsSingleCall(options);
    } catch (err) { // If the error is not a parsing error, it should manifest itself in multicall version too.
        return await new Promise((_, rej) => {
            rej(err)
        })
        // return nonWindowsMultipleCalls(options);
    }
};

module.exports = process.platform === 'win32' ? windows : nonWindows;
