import {Repository} from "./fast-export/repository";
import {FastExportPath} from "./fast-export/path";
import {inspect} from "util";
import {isEmpty} from 'lodash';

/**
 * OO representation of the output of `git-fast-export`.
 */
export class Rewrite {
    constructor(data: string) {
        this.data = Repository.fromFastExport(data);
    }

    rewritePaths(targetDir?: string, sourceDir?: string): string {
        if (sourceDir && targetDir) {
            throw new Error("sourceDir and targetDir are mutually exclusive");
        }
        if (!sourceDir && !targetDir) {
            throw new Error("must specify one of sourceDir and targetDir");
        }

        for (let commit of this.data.commits) {
            let newEntries = [];
            for (let entry of commit.tree) {
                if (targetDir) {
                    entry.filename = FastExportPath.fromUnQuoted(targetDir + '/' + entry.filename.toString());
                    newEntries.push(entry);
                } else if (sourceDir && entry.filename.toString().startsWith(`${sourceDir}/`)) {
                    entry.filename = FastExportPath.fromUnQuoted(entry.filename.toString().substring(sourceDir.length + 1));
                    newEntries.push(entry);
                }
            }
            commit.tree = newEntries;
        }

        if (sourceDir) {
            let update = true;
            let n = 0;
updateLoop:
            while (update) {
    console.log(`update loop ${n++}`);
                update = false;
                for (let c of this.data.commits) {
                    // No references to source dir, and is leaf
                    if (isEmpty(c.parents) && isEmpty(c.tree)) {
                        console.log(`Dropping commit ${c.mark}: ${inspect(c.commitMessage)}`);
                        this.data.dropCommit({mark: c.mark});
                        update = true;
                        continue updateLoop;
                    }

                    // No references to source dir, and is head
                    if (isEmpty(c.tree) && isEmpty(this.data.getCommitsPointingAt({mark: c.mark}))) {
                        this.data.dropCommit({mark: c.mark});
                        update = true;
                        continue updateLoop;
                    }
                }
            }
        }

        return this.data.toFastExport();
    }

    data: Repository;
}
