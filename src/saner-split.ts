import escapeStringRegexp from 'escape-string-regexp';

function regExpCopyWithGlobalFlag(r: RegExp) {
    let newFlags = r.flags;
    if (!r.flags.includes('g')) {
        newFlags += 'g'
    }
    return new RegExp(r.source, newFlags);
}

/**
 * A saner split function to split a string into at most `limit` pieces.
 *
 * In most programming languages, passing a limit to split() means to make at
 * most `limit` splits, or split the string into at most `limit` pieces, and
 * return the last part of the string un-split.
 *
 * For example:
 *
 *     "foo bar blah blah blah".split(limit=3) => ["foo", "bar", "blah blah blah"]
 *
 * But JS *truncates* the string instead
 *
 *     > "foo bar blah blah blah".split(/\s+/, 2)
 *     [ 'foo', 'bar' ]
 *
 * which seems pretty crazy to me, which is why I wrote this replacement.
  */
export function sanerSplit(s: string, r?: RegExp | string, limit = 0) {
    let pattern : RegExp;
    if (r instanceof RegExp) {
        pattern = regExpCopyWithGlobalFlag(r);
    } else if (r === undefined) {
        pattern = /\s+/g;
    } else {
        pattern = new RegExp(escapeStringRegexp(r), 'g');
    }

    let ret = [];
    let startIndex = 0;
    for (let p of s.matchAll(pattern)) {
        ret.push(s.substring(startIndex, p.index));
        startIndex = p.index! + p[0].length;
        if (limit > 0 && ret.length >= limit - 1)
            break;
    }
    if (startIndex < s.length + 1)
        ret.push(s.substring(startIndex, s.length));
    return ret;
}
