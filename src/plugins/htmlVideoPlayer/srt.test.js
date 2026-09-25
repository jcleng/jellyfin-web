import { describe, expect, it } from 'vitest';

import { parseSrt } from './srt';

describe('parseSrt', () => {
    it('parses sequence numbers, timestamps and multi line cue text', () => {
        const srt = [
            '1',
            '00:00:01,000 --> 00:00:04,000',
            '第一行',
            '第二行',
            '',
            '2',
            '00:01:05,500 --> 00:01:07,250',
            'Hello <b>world</b>',
            ''
        ].join('\n');

        expect(parseSrt(srt)).toEqual([
            { StartPositionTicks: 10000000, EndPositionTicks: 40000000, Text: '第一行\n第二行' },
            { StartPositionTicks: 655000000, EndPositionTicks: 672500000, Text: 'Hello <b>world</b>' }
        ]);
    });

    it('tolerates CRLF line endings and a leading byte order mark', () => {
        const srt = '1\r\n00:00:01,000 --> 00:00:04,000\r\nHi\r\n';

        expect(parseSrt('\uFEFF' + srt)).toEqual([
            { StartPositionTicks: 10000000, EndPositionTicks: 40000000, Text: 'Hi' }
        ]);
    });

    it('accepts cues without a sequence number', () => {
        const srt = '00:00:02,000 --> 00:00:03,000\nNo index';

        expect(parseSrt(srt)).toEqual([
            { StartPositionTicks: 20000000, EndPositionTicks: 30000000, Text: 'No index' }
        ]);
    });

    it('accepts a dot as the millisecond separator and short MM:SS timestamps', () => {
        const srt = [
            '00:00:01.000 --> 00:00:02.500',
            'Dot separator',
            '',
            '00:03,250 --> 00:04,000',
            'Short timestamp',
            ''
        ].join('\n');

        expect(parseSrt(srt)).toEqual([
            { StartPositionTicks: 10000000, EndPositionTicks: 25000000, Text: 'Dot separator' },
            { StartPositionTicks: 32500000, EndPositionTicks: 40000000, Text: 'Short timestamp' }
        ]);
    });

    it('converts timestamps that carry an hours component', () => {
        const srt = '1\n01:00:00,000 --> 01:00:01,500\nPast the hour\n';

        expect(parseSrt(srt)).toEqual([
            { StartPositionTicks: 36000000000, EndPositionTicks: 36015000000, Text: 'Past the hour' }
        ]);
    });

    it('treats a short millisecond field as a fraction, not a digit count', () => {
        expect(parseSrt('00:00:01,5 --> 00:00:02,05\nShort ms')).toEqual([
            { StartPositionTicks: 15000000, EndPositionTicks: 20500000, Text: 'Short ms' }
        ]);
    });

    it('ignores WebVTT cue settings after the end timestamp', () => {
        const srt = '00:00:01,000 --> 00:00:02,000 line:90%\nVtt text';

        expect(parseSrt(srt)).toEqual([
            { StartPositionTicks: 10000000, EndPositionTicks: 20000000, Text: 'Vtt text' }
        ]);
    });

    it('skips blocks that have no timing line', () => {
        const srt = 'WEBVTT\n\n1\n00:00:01,000 --> 00:00:02,000\nKept\n\njust some prose\n\n3\n00:00:03,000 --> 00:00:04,000\nAlso kept\n';

        expect(parseSrt(srt)).toEqual([
            { StartPositionTicks: 10000000, EndPositionTicks: 20000000, Text: 'Kept' },
            { StartPositionTicks: 30000000, EndPositionTicks: 40000000, Text: 'Also kept' }
        ]);
    });

    it('treats whitespace only lines as cue separators', () => {
        const srt = '1\n00:00:01,000 --> 00:00:02,000\nHi\n \n2\n00:00:03,000 --> 00:00:04,000\nBye\n\t\n3\n00:00:05,000 --> 00:00:06,000\nCue\n';

        expect(parseSrt(srt)).toEqual([
            { StartPositionTicks: 10000000, EndPositionTicks: 20000000, Text: 'Hi' },
            { StartPositionTicks: 30000000, EndPositionTicks: 40000000, Text: 'Bye' },
            { StartPositionTicks: 50000000, EndPositionTicks: 60000000, Text: 'Cue' }
        ]);
    });

    it('drops cues whose end is not after their start', () => {
        const srt = '1\n00:00:04,000 --> 00:00:04,000\nBackwards\n\n2\n00:00:01,000 --> 00:00:02,000\nFine\n';

        expect(parseSrt(srt)).toEqual([
            { StartPositionTicks: 10000000, EndPositionTicks: 20000000, Text: 'Fine' }
        ]);
    });

    it('drops cues with empty text', () => {
        const srt = '1\n00:00:01,000 --> 00:00:02,000\n\n\n2\n00:00:03,000 --> 00:00:04,000\nKept\n';

        expect(parseSrt(srt)).toEqual([
            { StartPositionTicks: 30000000, EndPositionTicks: 40000000, Text: 'Kept' }
        ]);
    });

    it('returns an empty array for empty, blank and non string input', () => {
        expect(parseSrt('')).toEqual([]);
        expect(parseSrt('\n\n\n')).toEqual([]);
        expect(parseSrt('not a subtitle at all\njust prose')).toEqual([]);
        expect(parseSrt(null)).toEqual([]);
        expect(parseSrt(undefined)).toEqual([]);
        expect(parseSrt(123)).toEqual([]);
    });
});
