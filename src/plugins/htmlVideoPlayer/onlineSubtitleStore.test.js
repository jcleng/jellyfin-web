/* eslint-disable sonarjs/no-clear-text-protocols -- fixtures document a self hosted local http subtitle service */
import { describe, expect, it } from 'vitest';

import { readSavedOnlineSubtitles, saveOnlineSubtitle } from './onlineSubtitleStore';

const STORAGE_KEY = 'htmlvideoplayer.onlineSubtitles';

const CUES = [
    { StartPositionTicks: 10000000, EndPositionTicks: 20000000, Text: '第一行' },
    { StartPositionTicks: 30000000, EndPositionTicks: 40000000, Text: '第二行' }
];

function createStorage(initial = {}) {
    const data = { ...initial };
    return {
        getItem: (key) => (key in data ? data[key] : null),
        setItem: (key, value) => {
            data[key] = value;
        },
        data
    };
}

describe('saveOnlineSubtitle', () => {
    it('remembers a record and reads it back', () => {
        const storage = createStorage();

        saveOnlineSubtitle({ apiBase: 'http://x:4000', id: '1', title: '钢铁侠', trackEvents: CUES }, storage);

        expect(readSavedOnlineSubtitles(storage)).toEqual([{
            apiBase: 'http://x:4000',
            id: '1',
            title: '钢铁侠',
            trackEvents: CUES
        }]);
    });

    it('moves an already known record back to the front', () => {
        const storage = createStorage();

        saveOnlineSubtitle({ apiBase: 'http://x:4000', id: '1', title: 'A', trackEvents: CUES }, storage);
        saveOnlineSubtitle({ apiBase: 'http://x:4000', id: '2', title: 'B', trackEvents: CUES }, storage);
        saveOnlineSubtitle({ apiBase: 'http://x:4000', id: '1', title: 'A', trackEvents: CUES }, storage);

        expect(readSavedOnlineSubtitles(storage).map((item) => item.id)).toEqual(['1', '2']);
    });

    it('keeps records of different subtitle services apart', () => {
        const storage = createStorage();

        saveOnlineSubtitle({ apiBase: 'http://x:4000', id: '1', title: 'A', trackEvents: CUES }, storage);
        saveOnlineSubtitle({ apiBase: 'http://y:4000', id: '1', title: 'B', trackEvents: CUES }, storage);

        expect(readSavedOnlineSubtitles(storage)).toHaveLength(2);
    });

    it('caps the list and keeps the newest entries', () => {
        const storage = createStorage();

        for (let i = 0; i < 25; i++) {
            saveOnlineSubtitle({ apiBase: 'http://x:4000', id: String(i), title: 'T' + i, trackEvents: CUES }, storage);
        }

        const records = readSavedOnlineSubtitles(storage);
        expect(records).toHaveLength(20);
        expect(records[0].id).toBe('24');
        expect(records[19].id).toBe('5');
    });

    it('drops records that are missing required fields or cues', () => {
        const storage = createStorage();

        expect(saveOnlineSubtitle({ apiBase: '', id: '1', title: 'A', trackEvents: CUES }, storage)).toEqual([]);
        expect(saveOnlineSubtitle({ apiBase: 'http://x:4000', title: 'A', trackEvents: CUES }, storage)).toEqual([]);
        expect(saveOnlineSubtitle({ apiBase: 'http://x:4000', id: '1', title: 'A' }, storage)).toEqual([]);
        expect(saveOnlineSubtitle({ apiBase: 'http://x:4000', id: '1', title: 'A', trackEvents: [] }, storage)).toEqual([]);
    });

    it('normalizes stored cues and drops the unusable ones', () => {
        const storage = createStorage();

        saveOnlineSubtitle({
            apiBase: ' http://x:4000 ',
            id: ' 1 ',
            title: ' A ',
            trackEvents: [
                { StartPositionTicks: '10000000', EndPositionTicks: '20000000', Text: 'ok' },
                { StartPositionTicks: 5, EndPositionTicks: 5, Text: 'backwards' },
                'garbage',
                null
            ]
        }, storage);

        expect(readSavedOnlineSubtitles(storage)).toEqual([{
            apiBase: 'http://x:4000',
            id: '1',
            title: 'A',
            trackEvents: [{ StartPositionTicks: 10000000, EndPositionTicks: 20000000, Text: 'ok' }]
        }]);
    });

    it('survives a storage that throws on write', () => {
        const storage = {
            getItem: () => null,
            setItem: () => {
                throw new Error('QuotaExceededError');
            }
        };

        expect(saveOnlineSubtitle({ apiBase: 'http://x:4000', id: '1', title: 'A', trackEvents: CUES }, storage)).toEqual([]);
    });
});

describe('readSavedOnlineSubtitles', () => {
    it('returns an empty array for missing, empty or broken storage', () => {
        expect(readSavedOnlineSubtitles(createStorage())).toEqual([]);
        expect(readSavedOnlineSubtitles(createStorage({ [STORAGE_KEY]: '' }))).toEqual([]);
        expect(readSavedOnlineSubtitles(createStorage({ [STORAGE_KEY]: '{oops' }))).toEqual([]);
        expect(readSavedOnlineSubtitles(createStorage({ [STORAGE_KEY]: '{"a":1}' }))).toEqual([]);
        expect(readSavedOnlineSubtitles(null)).toEqual([]);
    });

    it('skips broken entries in a partially corrupted list', () => {
        const storage = createStorage({
            [STORAGE_KEY]: JSON.stringify([
                { apiBase: 'http://x:4000', id: '1', title: 'A', trackEvents: CUES },
                null,
                { apiBase: 'http://x:4000', id: '2', title: '', trackEvents: CUES },
                { apiBase: 'http://x:4000', id: '3', title: 'C', trackEvents: 'nope' }
            ])
        });

        expect(readSavedOnlineSubtitles(storage).map((item) => item.id)).toEqual(['1']);
    });
});

/* eslint-enable sonarjs/no-clear-text-protocols */
