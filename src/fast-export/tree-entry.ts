import {sanerSplit} from "../saner-split";
import {FastExportPath} from "./path";
import {has} from 'lodash';
import {inspect} from "util";

export class Modification {
    constructor(line: string) {
        if (line.endsWith('\n')) {
            line = line.substring(0, line.length - 1);
        }

        let [code, mode, hash, filename] = sanerSplit(line, ' ', 4);
        if (code !== 'M')
            throw new Error('wrong code');

        this.mode = mode;
        this.hash = hash;
        this.filename = FastExportPath.fromQuoted(filename);
    }

    toString() {
        return `M ${this.mode} ${this.hash} ${this.filename.toQuoted()}`;
    }

    mode: string
    hash: string
    filename: FastExportPath
}

export class Deletion {
    constructor(line: string) {
        if (line.endsWith('\n')) {
            line = line.substring(0, line.length - 1);
        }

        let [code, filename] = sanerSplit(line, ' ', 2);
        if (code !== 'D')
            throw new Error("wrong code");

        this.filename = FastExportPath.fromQuoted(filename);
    }

    toString() {
        return `D ${this.filename.toQuoted()}`;
    }

    filename: FastExportPath
}

export type TreeEntry = Modification | Deletion;
type TreeEntryClass = typeof Modification | typeof Deletion;

export function treeEntryFromLine(line: string): TreeEntry {
    const code = line[0];

    const knownCodes: {[key: string]: TreeEntryClass} = {
        M: Modification,
        D: Deletion
    };

    if (!has(knownCodes, code) || line[1] != ' ') {
        throw new Error(`Unable to parse tree entry ${inspect(line)}`);
    }

    const cls = knownCodes[code];
    return new cls(line);
}
