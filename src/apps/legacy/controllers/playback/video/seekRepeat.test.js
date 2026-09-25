import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSeekQueue, createSeekRepeat } from './seekRepeat';

async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

describe('playback seek helpers', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('waits before repeating, advances the target, and stops cleanly', () => {
        const onRepeat = vi.fn();
        const seekRepeat = createSeekRepeat(onRepeat, 10);

        seekRepeat.start(-1, 100);
        vi.advanceTimersByTime(499);
        expect(onRepeat).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(onRepeat).toHaveBeenCalledTimes(1);
        expect(onRepeat).toHaveBeenLastCalledWith(-1, 90);

        vi.advanceTimersByTime(200);
        expect(onRepeat).toHaveBeenCalledTimes(2);
        expect(onRepeat).toHaveBeenLastCalledWith(-1, 80);

        seekRepeat.stop();
        vi.advanceTimersByTime(200);
        expect(onRepeat).toHaveBeenCalledTimes(2);
    });

    it('restarts the delay and target when the direction changes', () => {
        const onRepeat = vi.fn();
        const seekRepeat = createSeekRepeat(onRepeat, 10);

        seekRepeat.start(-1, 100);
        vi.advanceTimersByTime(300);
        seekRepeat.start(1, 200);
        vi.advanceTimersByTime(499);
        expect(onRepeat).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(onRepeat).toHaveBeenCalledTimes(1);
        expect(onRepeat).toHaveBeenLastCalledWith(1, 210);
    });

    it('does not re-arm after the callback stops the repeat', () => {
        const onRepeat = vi.fn();
        const seekRepeat = createSeekRepeat(() => {
            onRepeat();
            seekRepeat.stop();
        }, 10);

        seekRepeat.start(1, 100);
        vi.advanceTimersByTime(500);
        expect(onRepeat).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1000);
        expect(onRepeat).toHaveBeenCalledTimes(1);
    });

    it('serializes requests and keeps only the latest pending target', async () => {
        const pendingRequests = [];
        const seek = vi.fn(() => new Promise(resolve => {
            pendingRequests.push(resolve);
        }));
        const seekQueue = createSeekQueue(seek);

        seekQueue.enqueue(100);
        expect(seek).toHaveBeenCalledWith(100);

        seekQueue.enqueue(200);
        seekQueue.enqueue(300);
        pendingRequests.shift()();
        await flushPromises();

        expect(seek).toHaveBeenCalledTimes(2);
        expect(seek).toHaveBeenLastCalledWith(300);

        pendingRequests.shift()();
        await flushPromises();
        expect(seek).toHaveBeenCalledTimes(2);
    });

    it('drops pending targets when cleared', async () => {
        const pendingRequests = [];
        const seek = vi.fn(() => new Promise(resolve => {
            pendingRequests.push(resolve);
        }));
        const seekQueue = createSeekQueue(seek);

        seekQueue.enqueue(100);
        seekQueue.enqueue(200);
        seekQueue.clear();
        pendingRequests.shift()();
        await flushPromises();

        expect(seek).toHaveBeenCalledTimes(1);
    });
});
