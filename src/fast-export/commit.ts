import {TreeEntry, treeEntryFromLine} from "./tree-entry";
import {saferParseInt} from "../safer-parse-int";
import {inspect} from "util";
import endent from 'endent';

function stripLeadingColon(s: string) {
    if (s[0] != ':') {
        throw new Error(`Expected ${inspect(s)} to start witih ‘:’`);
    }
    return s.substring(1);
}

/**
 * We’ve been given a byte length, but we have a string. Attempt to pull out a
 * string with the given byte length. We could move everything to buffers if we
 * ever wanted to rewrite data, or if this hack is too slow. But for now, should
 * be safe to assume all commit messages are valid UTF-8.
 */
export function visibleForTesting_extractStringWithGivenByteLength(
    s: string,
    startingCharPosition: number,
    byteLen: number,
): string {
    let ret = s.substring(startingCharPosition, startingCharPosition + byteLen);
    let prevLen = ret.length;

    while (Buffer.from(ret).length != byteLen) {
        ret = ret.substring(0, ret.length - 1);
        if (ret.length === prevLen) {
            throw new Error('failed to sync. bad encoding?');
        }
        prevLen = ret.length;
    }
    return ret;
}

export class Commit {
    /**
     * Create a new Commit object from the git-fast-export output for a single
     * commit.
     *
     * allowTrailers specifies whether the string must be completely consumed by
     * the parsing of a single commit. If true, the length of the input string
     * used can be found in the `origCharLength` property.
     */
    constructor(lines: string, {allowTrailers} = {allowTrailers: false}) {
        this.parents = [];
        this.tree = [];

        let position = 0;
        while (position < lines.length) {
            if (lines[position] === '\n') {
                if (allowTrailers || position === lines.length - 1)
                    break;
            }

            const match = /^(reset|commit|from|merge|mark|author|committer|data|M|D) (.*)\n/.exec(lines.substring(position));
            if (!match) {
                throw new Error(`No match at position ${position} of ${inspect(lines)}: ${inspect(lines.substring(position, position + 10))}…`);
            }
            let keyword = match[1];
            let restOfLine = match[2];
            if (keyword === 'mark') {
                this.mark = saferParseInt(stripLeadingColon(restOfLine));
            } else if (keyword === 'author') {
                this.author = restOfLine;
            } else if (keyword === 'committer') {
                this.committer = restOfLine;
            } else if (keyword === 'data') {
                const dataLength = saferParseInt(restOfLine);
                this.commitMessage = visibleForTesting_extractStringWithGivenByteLength(
                    lines, position + match[0].length, dataLength);
                position += match[0].length + this.commitMessage.length;
                if (lines[position] === '\n')
                    position++;
                // Don’t want normal position adjustment here.
                continue;
            } else if (keyword === 'M' || keyword == 'D') {
                this.tree.push(treeEntryFromLine(match[0]));
            } else if (keyword === 'from') {
                this.parents.unshift(saferParseInt(stripLeadingColon(restOfLine)));
            }else if (keyword === 'merge') {
                this.parents.push(saferParseInt(stripLeadingColon(restOfLine)));
            } else if (keyword === 'reset' || keyword === 'commit') {
                // ignore for now
            } else {
                throw new Error(`Handling for keyword ${keyword} not implemented`);
            }
            position += match[0].length;
        }
        this.origCharLength = position;

        const requiredFields: (keyof Commit)[] = ['mark', 'commitMessage', 'committer', 'author'];
        for (let field of requiredFields) {
            if (this[field] === undefined) {
                throw new Error(`missing field ${field}`);
            }
        }
    }

    toFastExport() {
        let ret = endent`
            commit refs/heads/main
            mark :${this.mark}
            author ${this.author}
            committer ${this.committer}
            data ${Buffer.from(this.commitMessage).length}
            ${this.commitMessage}
        `;
        for (let [i, n] of this.parents.entries()) {
            let keyword = i === 0 ? 'from' : 'merge';
            ret += `${keyword} :${n}\n`;
        }
        for (let e of this.tree) {
            ret += e.toString() + '\n';
        }
        return ret;
    }

    origCharLength: number;
    readonly mark: number
    parents: number[]
    commitMessage: string
    committer: string
    author: string
    tree: TreeEntry[]
}
