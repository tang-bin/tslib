"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CmdSet = void 0;
const child_process_1 = require("child_process");
const out_node_1 = __importDefault(require("./out.node"));
const timeUtil_1 = __importDefault(require("../utils/timeUtil"));
/**
 * Node.js only.
 */
class CmdSet {
    fullCmd = "";
    cwd = "";
    title = "";
    listeners = {
        onStdout: undefined,
        onStderr: undefined,
        onError: undefined,
    };
}
exports.CmdSet = CmdSet;
class Cmd {
    verbal = false;
    printStderr = false;
    exec(cmdList, cwd, title, callbacks) {
        const startTime = new Date().getTime();
        callbacks = callbacks || {};
        const originalOnClose = callbacks.onClose || undefined;
        callbacks.onClose = (code) => {
            if (this.verbal)
                out_node_1.default.line("[SPAWN Close]: " + code);
            if (code === 0) {
                // end without error.
                if (!this.verbal) {
                    const endTime = new Date().getTime(), durStr = timeUtil_1.default.formatDuring(endTime - startTime), duration = `[${durStr}]`;
                    out_node_1.default.stopSpinner();
                    out_node_1.default.prefix(out_node_1.default.successMark);
                    out_node_1.default.append(duration, true);
                }
            }
            else {
                // end with error.
                if (!this.verbal) {
                    out_node_1.default.stopSpinner();
                    out_node_1.default.prefix(out_node_1.default.failedMark, true);
                }
            }
            originalOnClose?.call(null, code);
        };
        if (title) {
            out_node_1.default.line("   " + title, true, false);
            if (!this.verbal)
                out_node_1.default.startSpinner(true);
        }
        if (typeof cmdList === "string")
            cmdList = [cmdList];
        if (this.verbal) {
            out_node_1.default.line("[yellow][SPAWN]:[/yellow] " + cmdList);
        }
        return this.runCmdList(cmdList, cwd, callbacks);
    }
    parseCmd(fullCmd) {
        const input = fullCmd
            .split(" ")
            .map((s) => String(s || "").trim())
            .filter((s) => s), cmd = input[0], args = input.slice(1);
        return [cmd, args];
    }
    serial(cmds) {
        let result = Promise.resolve();
        cmds.forEach((d) => {
            result = result.then(() => this.exec(d[0], d[1], d[2], d[3]));
        });
        return result;
    }
    runCmdList(cmdList, cwd, options) {
        let result = Promise.resolve();
        cmdList.forEach((cmd) => {
            result = result.then(() => this.runCmd(cmd, cwd, options));
        });
        return result;
    }
    runCmd(fullCmd, cwd, options) {
        const [cmd, argv] = this.parseCmd(fullCmd);
        return new Promise((resolve, reject) => {
            if (options?.fake) {
                setTimeout(() => {
                    options?.callbacks?.onClose?.call(null, 0);
                    resolve(0);
                    return;
                }, Math.random() * 5000 + 2000);
            }
            const proc = (0, child_process_1.spawn)(cmd, argv, cwd ? { cwd } : undefined);
            proc.stdout.on("data", (data) => {
                if (this.verbal)
                    out_node_1.default.line(data, false, false);
                options?.callbacks?.onStdout?.call(null, data.toString());
            });
            proc.stderr.on("data", (data) => {
                if (this.printStderr)
                    out_node_1.default.line("[red]stderr:[/red] " + data, false, false);
                options?.callbacks?.onStderr?.call(null, data.toString());
            });
            proc.on("error", (err) => options?.callbacks?.onError?.call(null, err));
            proc.on("close", (code) => {
                options?.callbacks?.onClose?.call(null, code);
                if (code === 0)
                    resolve(code);
                else
                    reject(code);
            });
        });
    }
}
const cmd = new Cmd();
exports.default = cmd;
