import {GitRepo} from "./gitrepo";
import {Rewrite} from "./rewrite";
import VError from "verror";

export interface PullOptions {
    sourceDir?: string
    targetDir?: string
    initial?: boolean
    dump?: boolean
}

export async function pull(from: GitRepo, to : GitRepo, {sourceDir, targetDir, initial, dump}: PullOptions) {
    if (sourceDir !== undefined && targetDir !== undefined) {
        throw new Error("sourceDir and targetDir are mutually exclusive options");
    }

    if (initial === undefined)
        initial = false;
    if (dump === undefined)
        dump = false;

    await to.git(["fetch", from.path])

    if (sourceDir) {
        const response = await to.gitCapture(["status", "--porcelain"]);
        if (response.stdout !== '') {
            throw new Error("target git working directory must be clean");
        }
    }

    const fastExport = (await from.gitCapture(["fast-export", "--no-data", "main"])).stdout;

    if (dump) {
        console.log("Original fast export");
        console.log(fastExport);
    }

    const rewriter = new Rewrite(fastExport);

    const rewritten = rewriter.rewritePaths(targetDir, sourceDir);

    if (dump) {
        console.log("Rewritten");
        console.log(rewritten);
    }

    let fastImportOutput;
    try {
        fastImportOutput = await to.gitWithInput(["fast-import"], {
            input: rewritten,
            capture: true,
            allowedRetcodes: [0, 1]
        });
        if (dump) {
            console.log(fastImportOutput);
        }
    } catch (e) {
        let e2 = new VError(e, 'fast-import failed');
        e2.rewritten = rewritten;
        throw e2;
    }

    if (sourceDir) {
        const match = /warning: Not updating refs\/heads\/main \(new tip (\S+) does not contain/.exec(fastImportOutput.stderr);
        if (match) {
            const newTipHash = match[1];
            const mergeCommand = ["merge", "-m", `Merge upstream ${sourceDir}`, newTipHash];
            await to.git(mergeCommand);
        }

        await to.git(["reset", "--hard"])
    } else {
        const match = /new tip (\S+)/.exec(fastImportOutput.stderr);
        if (match === null)
            throw new Error("did not return new tip");
        const newTipHash = match[1];

        const mergeCommand = ["merge", "-m", `Merge ${targetDir}`, newTipHash];
        if (initial)
            mergeCommand.splice(1, 0, '--allow-unrelated-histories')
        await to.git(mergeCommand);
    }
}
