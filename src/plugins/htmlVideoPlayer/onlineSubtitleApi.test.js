/* eslint-disable sonarjs/no-clear-text-protocols -- fixtures document a self hosted local http subtitle service */
import { describe, expect, it, vi } from 'vitest';

import { buildDownloadUrl, buildSearchUrl, normalizeApiBase, parseSearchResults } from './onlineSubtitleApi';

describe('normalizeApiBase', () => {
    it('trims whitespace and strips trailing slashes', () => {
        expect(normalizeApiBase('  http://127.0.0.1:4000///  ')).toBe('http://127.0.0.1:4000');
        expect(normalizeApiBase('http://127.0.0.1:4000')).toBe('http://127.0.0.1:4000');
        expect(normalizeApiBase(undefined)).toBe('');
    });
});

describe('buildSearchUrl', () => {
    it('percent encodes the query so url syntax in a title cannot leak', () => {
        expect(buildSearchUrl('http://127.0.0.1:4000/', '钢铁侠'))
            .toBe('http://127.0.0.1:4000/search?q=%E9%92%A2%E9%93%81%E4%BE%A0');
        expect(buildSearchUrl('http://x:4000', 'a&b=c#d'))
            .toBe('http://x:4000/search?q=a%26b%3Dc%23d');
    });

    it('trims the query and tolerates a missing base', () => {
        expect(buildSearchUrl('http://x:4000', '  spider man  ')).toBe('http://x:4000/search?q=spider%20man');
        expect(buildSearchUrl('', 'a')).toBe('/search?q=a');
    });

    it('appends the page for pages after the first and omits it for the first', () => {
        expect(buildSearchUrl('http://x:4000', '恐怖游轮', 3)).toBe('http://x:4000/search?q=%E6%81%90%E6%80%96%E6%B8%B8%E8%BD%AE&page=3');
        expect(buildSearchUrl('http://x:4000/', 'a', 2)).toBe('http://x:4000/search?q=a&page=2');
        expect(buildSearchUrl('http://x:4000', 'a', 1)).toBe('http://x:4000/search?q=a');
        expect(buildSearchUrl('http://x:4000', 'a')).toBe('http://x:4000/search?q=a');
    });

    it('ignores a page that is not a usable number', () => {
        expect(buildSearchUrl('http://x:4000', 'a', 0)).toBe('http://x:4000/search?q=a');
        expect(buildSearchUrl('http://x:4000', 'a', -2)).toBe('http://x:4000/search?q=a');
        expect(buildSearchUrl('http://x:4000', 'a', 1.5)).toBe('http://x:4000/search?q=a');
        expect(buildSearchUrl('http://x:4000', 'a', NaN)).toBe('http://x:4000/search?q=a');
    });
});

describe('buildDownloadUrl', () => {
    it('appends the srt extension to the id', () => {
        expect(buildDownloadUrl('http://127.0.0.1:4000/', '665025'))
            .toBe('http://127.0.0.1:4000/download/665025.srt');
    });

    it('escapes ids that contain url unsafe characters', () => {
        expect(buildDownloadUrl('http://x:4000', 'a/b c')).toBe('http://x:4000/download/a%2Fb%20c.srt');
    });
});

describe('parseSearchResults', () => {
    it('maps the real search payload and normalizes a null version', () => {
        const payload = [{
            id: '712469',
            title: '辐射 第二季 Fallout (2025) S02E01',
            version: '辐射 WEB简繁英双语精修字幕',
            format: 'Subrip(srt)',
            language: '英 简 繁 双语',
            date: '2026-01-09 07:08:58',
            detailUrl: 'https://assrt.net/xml/sub/712/712469.xml'
        }, {
            id: '695516',
            title: 'Iron.Man.3.2013.BluRay.1080p',
            version: null,
            format: 'Subrip(srt)',
            language: '简',
            date: '2024-12-03 00:30:54',
            detailUrl: 'https://assrt.net/xml/sub/695/695516.xml'
        }];

        expect(parseSearchResults(payload)).toEqual([{
            id: '712469',
            title: '辐射 第二季 Fallout (2025) S02E01',
            version: '辐射 WEB简繁英双语精修字幕',
            language: '英 简 繁 双语'
        }, {
            id: '695516',
            title: 'Iron.Man.3.2013.BluRay.1080p',
            version: '',
            language: '简'
        }]);
    });

    it('trims the id, title, version and language it keeps', () => {
        expect(parseSearchResults([
            { id: '  7  ', title: '  Padded  ', version: '  v  ', format: 'srt', language: '  简  ' }
        ])).toEqual([{ id: '7', title: 'Padded', version: 'v', language: '简' }]);
    });

    it('skips entries without an id or a title', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        const results = parseSearchResults([
            { id: '', title: 'No id', format: 'Subrip(srt)' },
            { id: '   ', title: 'Blank id', format: 'Subrip(srt)' },
            { title: 'No id field', format: 'Subrip(srt)' },
            { id: '7', format: 'Subrip(srt)' },
            null,
            'garbage'
        ]);

        expect(results).toEqual([]);
        expect(warn).toHaveBeenCalledTimes(4);
    });

    it('skips entries whose format is not srt', () => {
        expect(parseSearchResults([
            { id: '1', title: 'Ass only', version: null, format: 'Advanced SubStation Alpha', language: '简' },
            { id: '2', title: 'Srt wins', version: null, format: 'Subrip(srt)', language: '简' },
            { id: '3', title: 'No format field', version: null, language: '简' },
            { id: '4', title: 'Upper case format', version: null, format: 'SRT', language: '英' }
        ]).map((r) => r.id)).toEqual(['2', '3', '4']);
    });

    it('returns an empty array for non array payloads', () => {
        expect(parseSearchResults({ results: [] })).toEqual([]);
        expect(parseSearchResults(null)).toEqual([]);
        expect(parseSearchResults('nope')).toEqual([]);
    });
});
/* eslint-enable sonarjs/no-clear-text-protocols */
