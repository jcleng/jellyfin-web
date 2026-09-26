const SAVED_ONLINE_SUBTITLES_KEY = 'htmlvideoplayer.onlineSubtitles';

// Enough room for a handful of movies worth of cues; localStorage is a shared
// 5MB quota, so an unbounded list would eventually break unrelated features.
const MAX_SAVED_ONLINE_SUBTITLES = 20;

/**
 * @param {unknown} value The candidate string.
 * @returns {boolean} Whether the value is a usable non empty string.
 */
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
}

/**
 * Normalizes one cue, dropping anything that is not a usable TrackEvent. The
 * payload comes from localStorage, so it has to be treated as untrusted input.
 * @param {any} event The stored cue.
 * @returns {{StartPositionTicks: number, EndPositionTicks: number, Text: string}|null} The cue, or null.
 */
function normalizeTrackEvent(event) {
    if (!event || typeof event !== 'object') {
        return null;
    }

    const start = Number(event.StartPositionTicks);
    const end = Number(event.EndPositionTicks);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return null;
    }

    return {
        StartPositionTicks: start,
        EndPositionTicks: end,
        Text: typeof event.Text === 'string' ? event.Text : ''
    };
}

/**
 * Normalizes one saved record. Anything unusable is dropped so a corrupted
 * entry cannot break the whole list.
 * @param {any} record The stored record.
 * @returns {{apiBase: string, id: string, title: string, trackEvents: Array<Object>}|null} The record, or null.
 */
function normalizeRecord(record) {
    if (!record || typeof record !== 'object') {
        return null;
    }

    if (!isNonEmptyString(record.apiBase) || !isNonEmptyString(record.id) || !isNonEmptyString(record.title)) {
        return null;
    }

    if (!Array.isArray(record.trackEvents)) {
        return null;
    }

    const trackEvents = record.trackEvents.map(normalizeTrackEvent).filter(Boolean);
    if (!trackEvents.length) {
        return null;
    }

    return {
        apiBase: record.apiBase.trim(),
        id: record.id.trim(),
        title: record.title.trim(),
        trackEvents: trackEvents
    };
}

/**
 * @param {any} storage The localStorage like object.
 * @returns {Storage|null} The storage, or null when it is unavailable.
 */
function getStorage(storage) {
    if (storage) {
        return storage;
    }
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

/**
 * Reads the online subtitles saved by earlier playbacks, most recently selected
 * first, so the caller can default to the newest one.
 * @param {Storage} [storage] The localStorage like object to read from.
 * @returns {Array<Object>} The usable saved records.
 */
export function readSavedOnlineSubtitles(storage) {
    const store = getStorage(storage);
    if (!store) {
        return [];
    }

    try {
        const raw = store.getItem(SAVED_ONLINE_SUBTITLES_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.map(normalizeRecord).filter(Boolean).slice(0, MAX_SAVED_ONLINE_SUBTITLES);
    } catch (err) {
        console.warn('[htmlVideoPlayer] could not read the saved online subtitles', err);
        return [];
    }
}

/**
 * Saves one online subtitle, moving an already known entry back to the front so
 * the list order doubles as "most recently selected first".
 * @param {{apiBase: string, id: string, title: string, trackEvents: Array<Object>}} record The record to remember.
 * @param {Storage} [storage] The localStorage like object to write to.
 * @returns {Array<Object>} The records that are stored now.
 */
export function saveOnlineSubtitle(record, storage) {
    const store = getStorage(storage);
    const normalized = normalizeRecord(record);
    if (!store || !normalized) {
        return readSavedOnlineSubtitles(store);
    }

    const previous = readSavedOnlineSubtitles(store);
    const kept = previous.filter((item) => item.apiBase !== normalized.apiBase || item.id !== normalized.id);
    const records = [normalized, ...kept].slice(0, MAX_SAVED_ONLINE_SUBTITLES);

    try {
        store.setItem(SAVED_ONLINE_SUBTITLES_KEY, JSON.stringify(records));
    } catch (err) {
        // A full quota must not break playback; the subtitle still works for
        // this session, it just will not be remembered next time.
        console.warn('[htmlVideoPlayer] could not persist the online subtitle', err);
        return previous;
    }

    return records;
}
