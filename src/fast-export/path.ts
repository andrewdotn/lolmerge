import {inspect} from "util";

const special_escapes_by_char: {[key: string]: number} = {
    a: 7,
    b: 8,
    t: 9,
    n: 10,
    v: 11,
    f: 12,
    r: 13,
    '"': 34,
    '\\': 92,
};
const special_escapes_by_number: {[key: number]: string} = {}
for (let [k, v] of Object.entries(special_escapes_by_char)) {
    special_escapes_by_number[v] = k;
}

function octalDigitAt(s: string, n: number) {
    let c = s.charCodeAt(n) - 0x30;
    if (c >=0 && c <= 7)
        return c;
    return NaN;
}

/**
 * This will return NaN if any of those items is off
 */
function parseOctalString(a: string, pos: number) {
    let ret = (octalDigitAt(a, pos) * 8 * 8
        + octalDigitAt(a, pos + 1) * 8
        + octalDigitAt(a, pos + 2));
    return ret;
}

export class InvalidPathError extends Error {};

/**
 * A path in a git repository, which gets quoted in fast-export files due to
 * containing elements such as unicode, spaces, or non-printing characters.
 *
 * See `quote_c_style` in git’s `quote.c` for more details.
 */
export class FastExportPath {
    private constructor(unquotedPath: string) {
        this._path = unquotedPath;
    }

    static fromQuoted(s: string) {
        if (s.length === 0) {
            throw new InvalidPathError(`Path cannot be zero-length`);
        }
        if (s.startsWith('"')) {
            if (!s.endsWith('"') || s.length < 3) {
                throw new InvalidPathError(`Cannot decode ${inspect(s)}`);
            }
            s = s.substring(1, s.length - 1);

            let buf = Buffer.alloc(s.length);
            let outPos = 0;
            for (let pos = 0; pos < s.length; pos++) {
                if (s[pos] == '\\') {
                    if (special_escapes_by_char[s[pos + 1]]) {
                        buf[outPos++] = special_escapes_by_char[s[pos + 1]];
                        pos++;
                    } else if (parseOctalString(s, pos + 1) >= 0) {
                        buf[outPos++] = parseOctalString(s, pos + 1);
                        pos += 3;
                    } else {
                        throw new InvalidPathError(`Cannot decode ${inspect(s)}`);
                    }
                } else {
                    buf[outPos++] = s.charCodeAt(pos);
                }
            }
            s = buf.subarray(0, outPos).toString();
        }
        return new FastExportPath(s);
    }

    static fromUnQuoted(s: string) {
        return new FastExportPath(s);
    }

    toQuoted() {
        let needsQuotes = false;

        let ret = '';
        const buf = Buffer.from(this._path);
        for (let c of buf) {
            if (special_escapes_by_number[c]) {
                ret += '\\' + special_escapes_by_number[c];
                needsQuotes = true;
            } else if (c < 0x20 || c >= 0x7f) {
                ret += '\\' + c.toString(8).padStart(3, '0');
                needsQuotes = true;
            } else {
                if (c === 0x20) { // space
                    needsQuotes = true;
                }
                ret += String.fromCharCode(c);
            }
        }
        if (needsQuotes)
            ret = `"${ret}"`;

        return ret;
    }

    toString() {
        return this._path;
    }

    private _path: string
}
