import yargs from 'yargs';
import {GitRepo} from "./gitrepo";
import {pull, PullOptions} from "./pull";

export async function main(args?: string[]) {
    return new Promise((resolve, reject) => {
        (args !== undefined ? yargs(args) : yargs).strict()
            .demandCommand(1, 1)
            .command('pull', 'pull changes across repos',
                yargs =>
                    yargs
                        .strict()
                        .option('from', {required: true})
                        .option('initial', {
                            type: "boolean"
                        })
                        .option('source-dir', {})
                        .option('target-dir', {})
                        .option('dump', {type: "boolean"})
                        .conflicts('source-dir', 'target-dir')
                        .option('to', {
                            default: '.'
                        }),
                argv => {
                    const from = new GitRepo(<string>argv.from);
                    const to = new GitRepo(<string>argv.to);
                    const options : PullOptions = {}
                    if (argv.initial !== undefined)
                        options.initial = !!argv.initial;
                    if (argv.targetDir !== undefined)
                        options.targetDir = <string>argv.targetDir;
                    if (argv.sourceDir !== undefined)
                        options.sourceDir = <string>argv.sourceDir;
                    if (argv.dump !== undefined)
                        options.dump = <boolean>argv.dump;
                    pull(from, to, options).then(resolve).catch(reject);
                })
            .argv;
        // TODO: how to resolve if no command given?
    });
}

if (require.main === module) {
    main().catch(e => {
        console.error(e);
        process.exit(1);
    })
}
