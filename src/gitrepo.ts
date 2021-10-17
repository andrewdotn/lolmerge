import {
    CommandOutput,
    runCommand, runCommandAndCaptureOutput,
    runCommandWithInput,
    WithInputOptions
} from "./run";
import {resolve} from "path";

export class GitRepo {
    constructor(path: string) {
        this.path = resolve(path);
    }

    /** Run git command in this repo, e.g., `git(["init"])` */
    async git(command: string[]) {
        return runCommand(["git", ...command], {cwd: this.path})
    }

    /** Run git command with given input */
    async gitWithInput(command: string[], options: WithInputOptions) {
        return runCommandWithInput(["git", ...command], options, {cwd: this.path})
    }

    /** Run git command in this repo and return output, e.g., `git(["log"])` */
    async gitCapture(command: string[]) : Promise<CommandOutput> {
        return runCommandAndCaptureOutput(["git", ...command], {cwd: this.path})
    }

    readonly path: string
}
