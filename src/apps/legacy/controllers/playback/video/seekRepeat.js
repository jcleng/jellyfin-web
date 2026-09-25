const INITIAL_DELAY = 500;
const REPEAT_INTERVAL = 200;

export function createSeekRepeat(onRepeat, step, initialDelay = INITIAL_DELAY, repeatInterval = REPEAT_INTERVAL) {
    let initialTimer;
    let repeatTimer;
    let position;
    let generation = 0;

    function stop() {
        generation += 1;
        if (initialTimer !== undefined) {
            clearTimeout(initialTimer);
            initialTimer = undefined;
        }

        if (repeatTimer !== undefined) {
            clearInterval(repeatTimer);
            repeatTimer = undefined;
        }

        position = undefined;
    }

    function start(direction, startPosition) {
        stop();
        const currentGeneration = generation;
        position = startPosition;
        initialTimer = setTimeout(() => {
            if (currentGeneration !== generation) {
                return;
            }

            initialTimer = undefined;
            position += direction * step;
            onRepeat(direction, position);
            if (currentGeneration !== generation) {
                return;
            }

            repeatTimer = setInterval(() => {
                if (currentGeneration !== generation) {
                    return;
                }

                position += direction * step;
                onRepeat(direction, position);
            }, repeatInterval);
        }, initialDelay);
    }

    return { start, stop };
}

export function createSeekQueue(seek) {
    let pendingPosition;
    let inFlight = false;

    function flush() {
        if (inFlight || pendingPosition === undefined) {
            return;
        }

        const position = pendingPosition;
        pendingPosition = undefined;
        inFlight = true;

        let request;
        try {
            request = seek(position);
        } catch {
            inFlight = false;
            flush();
            return;
        }

        Promise.resolve(request)
            .catch(() => undefined)
            .finally(() => {
                inFlight = false;
                flush();
            });
    }

    function enqueue(position) {
        pendingPosition = position;
        flush();
    }

    function clear() {
        pendingPosition = undefined;
    }

    return { enqueue, clear };
}
