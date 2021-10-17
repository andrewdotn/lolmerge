import {spawn, SpawnOptions, StdioOptions} from "child_process";
import {has} from 'lodash';
import {inspect} from "util";
import {Readable} from "stream";

/** Run command, raising an exception if the return code is non-zero. */
export async function runCommand(command: string[], options: SpawnOptions) {
    const proc = spawn(command[0], command.slice(1), {stdio: 'inherit', ...options});

    const retCode: number = await new Promise((resolve) =>
        proc.on('close', resolve));
    if (retCode !== 0) {
        throw new Error(`Command ${inspect(command)} returned ${retCode}`);
    }
}

export interface CommandOutput {
    stdout: string,
    stderr: string,
    retCode: number,
}

export async function runCommandAndCaptureOutput(command: string[], options: SpawnOptions): Promise<CommandOutput> {

    if (has(options, 'stdio')) {
        throw new Error('attempted to override stdio options');
    }

    const proc = spawn(command[0], command.slice(1), {stdio: ['ignore', 'pipe', 'pipe'], ...options});

    const output = {stdout: '', stderr: ''};

    proc.stdio[1]!.on('data', data => output.stdout += data);
    proc.stdio[2]!.on('data', data => output.stderr += data);

    const retCode: number = await new Promise((resolve) => proc.on('close', resolve));
    if (retCode !== 0) {
        throw new Error(`${inspect(command)} returned ${retCode}, out was ${inspect(output.stdout)}, err was ${inspect(output.stderr)}`);
    }
    return {retCode, ...output};
}

export interface WithInputOptions {
    allowedRetcodes?: number[]
    input: string
    capture?: boolean // defaults to false
}

export async function runCommandWithInput(command: string[], {input, capture, allowedRetcodes}: WithInputOptions, options: SpawnOptions = {}) {

    if (allowedRetcodes === undefined)
        allowedRetcodes = [0];
    if (capture === undefined)
        capture = false;
    if (has(options, 'stdio')) {
        throw new Error('attempted to override stdio options');
    }

    let stdioOpts: StdioOptions;
    if (capture) {
        stdioOpts = ['pipe', 'pipe', 'pipe'];
    } else {
        stdioOpts = ['pipe', 'inherit', 'inherit'];
    }

    const proc = spawn(command[0], command.slice(1), {stdio: stdioOpts, ...options});

    const stream = new Readable();
    stream.push(input);
    stream.push(null);
    stream.pipe(proc.stdio[0]!);

    const output = {stdout: '', stderr: ''};

    if (capture) {
        proc.stdio[1]!.on('data', data => output.stdout += data);
        proc.stdio[2]!.on('data', data => output.stderr += data);
    }

    const retCode: number = await new Promise(resolve => proc.on('close', resolve));
    if (!allowedRetcodes.includes(retCode)) {
        let errorMessage = `${inspect(command)} returned ${retCode}`;
        if (capture) {
            errorMessage += `, output was ${inspect(output)}`;
        }
        throw new Error(errorMessage);
    }

    return {retCode, ...output}
}
