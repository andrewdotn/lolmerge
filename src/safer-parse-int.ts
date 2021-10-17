import {inspect} from "util";

export class ParseError extends Error {};

export function saferParseInt(s: string): number {
    if (!/^-?[0-9]+$/.test(s))
        throw new ParseError(`${inspect(s)} is not an integer`);
    const ret = Number(s);
    if (ret.toString() !== s) {
        throw new ParseError(`${inspect(s)} is ambiguous or not a JS-representable integer`);
    }
    return ret;
}
