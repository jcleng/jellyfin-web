import { MILLISECONDS_PER_HOUR, MILLISECONDS_PER_MINUTE, MILLISECONDS_PER_SECOND, TICKS_PER_MILLISECOND } from 'constants/time';

// Jellyfin measures cue positions in ticks. updateSubtitleText converts back with
// `timeMs * 10000`, so a cue time is assembled in milliseconds and then scaled by
// TICKS_PER_MILLISECOND to land on exactly the scale the player reads.
const TIMESTAMP_PATTERN = /^(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})$/;

/**
 * Parses an SRT/WebVTT style timestamp into Jellyfin ticks.
 * @param {string} value The raw timestamp, e.g. `00:01:05,500`.
 * @returns {number|null} The position in ticks, or null when unparsable.
 */
function parseSrtTimestamp(value) {
    const match = TIMESTAMP_PATTERN.exec(String(value).trim());
    if (!match) {
        return null;
    }

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    // `,5` means 500ms, not 5ms, so pad the field to a real millisecond count.
    const milliseconds = match[4].padEnd(3, '0');

    return Math.round((hours * MILLISECONDS_PER_HOUR + minutes * MILLISECONDS_PER_MINUTE + seconds * MILLISECONDS_PER_SECOND + Number(milliseconds)) * TICKS_PER_MILLISECOND);
}

/**
 * Parses Subrip text into the TrackEvent shape the player already renders.
 * Malformed blocks are skipped rather than thrown, because the caller has no
 * way to recover a partially broken download.
 * @param {string} text The SRT file contents.
 * @returns {Array<{StartPositionTicks: number, EndPositionTicks: number, Text: string}>} The parsed cues.
 */
export function parseSrt(text) {
    if (typeof text !== 'string') {
        return [];
    }

    const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const trackEvents = [];

    // Machine written SRTs pad their blank separator lines with spaces or tabs,
    // so a cue has to end on a whitespace only line rather than a truly empty one.
    for (const block of normalized.split(/\n(?:[^\S\n]*\n)+/)) {
        const lines = block.split('\n');

        let cursor = 0;
        while (cursor < lines.length && !lines[cursor].trim()) {
            cursor++;
        }

        // A sequence number is optional in the wild.
        if (cursor < lines.length && /^\d+$/.test(lines[cursor].trim())) {
            cursor++;
        }

        const timingLine = lines[cursor];
        if (!timingLine || !timingLine.includes('-->')) {
            continue;
        }

        const timingParts = timingLine.split('-->');
        if (timingParts.length !== 2) {
            continue;
        }

        // WebVTT appends cue settings (`line:90%`) after the end timestamp.
        const startPositionTicks = parseSrtTimestamp(timingParts[0]);
        const endPositionTicks = parseSrtTimestamp(timingParts[1].trim().split(/\s+/)[0]);
        if (startPositionTicks === null || endPositionTicks === null || endPositionTicks <= startPositionTicks) {
            continue;
        }

        // Newlines are turned into <br> by normalizeTrackEventText downstream.
        const cueText = lines.slice(cursor + 1).join('\n').trim();
        if (!cueText) {
            continue;
        }

        trackEvents.push({
            StartPositionTicks: startPositionTicks,
            EndPositionTicks: endPositionTicks,
            Text: cueText
        });
    }

    return trackEvents;
}
