// This might be more accurately called a branch or commit graph
import {Commit} from "./commit";
import {uniq} from 'lodash';

export class Repository {
    private constructor(commits: Commit[]) {
        this.commits = commits;
        this.commitsByMark = new Map();
        this.commitsReferencingMark = new Map()
        for (let c of commits) {
            this.commitsByMark.set(c.mark, c);
        }
        for (let c of commits) {
            for (let p of c.parents) {
                if (!this.commitsReferencingMark.has(p))
                    this.commitsReferencingMark.set(p, []);
                this.commitsReferencingMark.get(p)!.push(c.mark);
            }
        }
    }

    static fromFastExport(s: string): Repository {
        const commits = []
        let position = 0;

        while(position < s.length) {
            const c = new Commit(s.substring(position), {allowTrailers: true});
            commits.push(c);
            position += c.origCharLength;
            if (s[position] === '\n')
                position++;
        }
        return new Repository(commits);
    }

    getCommit({mark}: {mark: number}): Commit {
        let c = this.commitsByMark.get(mark);
        if (c === undefined)
            throw new Error(`Commit with mark ${mark} not found`);
        return c;
    }

    getCommitsPointingAt({mark}: {mark: number}): Commit[] {
        const ret = [];
        let pointers = this.commitsReferencingMark.get(mark);
        if (!pointers)
            return [];
        for (let m of pointers)
            ret.push(this.getCommit({mark: m}))
        return ret;
    }

    private commitsByMark: Map<number, Commit>;
    private commitsReferencingMark: Map<number, number[]>;
    readonly commits: Commit[];

    toFastExport() {
        return "reset refs/heads/main\n" +
            this.commits.map(c => c.toFastExport()).join("\n") + '\n';
    }

    dropCommit({mark}: {mark: number}) {
        for (let n of this.commitsReferencingMark.get(mark) || []) {
            const c = this.getCommit({mark: n});
            const parentIndex = c.parents.indexOf(mark);
            if (parentIndex !== -1)
                c.parents.splice(parentIndex, 1);
        }
        const c = this.getCommit({mark});
        this.commits.splice(this.commits.indexOf(c), 1);
        this.commitsReferencingMark.delete(mark);
        this.commitsByMark.delete(mark);
    }

    compressCommit({mark}: {mark: number}) {
        const commit = this.getCommit({mark});
        if (commit.parents.length !== 1)
            throw new Error("only single-parent commits implemented right now");
        for (let c of this.getCommitsPointingAt({mark})) {
            c.parents = uniq(c.parents.concat(commit.parents));
            c.parents = c.parents.filter(e => e !== mark);
        }
        this.dropCommit({mark});
    }
}
