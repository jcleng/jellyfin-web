const SRT_FORMAT_PATTERN = /srt/i;

/**
 * Strips trailing slashes so callers can always append `/segment` safely.
 * @param {string} url The user supplied API base url.
 * @returns {string} The normalized base url.
 */
export function normalizeApiBase(url) {
    let base = String(url || '').trim();

    while (base.endsWith('/')) {
        base = base.slice(0, -1);
    }

    return base;
}

/**
 * @param {string} apiBase The subtitle API base url.
 * @param {string} query The search keyword.
 * @param {number} [page] The 1 based page to request. The first page is the
 *     default on the service, so the parameter is omitted for it.
 * @returns {string} The search url.
 */
export function buildSearchUrl(apiBase, query, page) {
    const url = normalizeApiBase(apiBase) + '/search?q=' + encodeURIComponent(String(query || '').trim());
    const pageNumber = Number(page);

    return Number.isSafeInteger(pageNumber) && pageNumber > 1 ? url + '&page=' + pageNumber : url;
}

/**
 * @param {string} apiBase The subtitle API base url.
 * @param {string} id The subtitle id returned by the search endpoint.
 * @returns {string} The download url.
 */
export function buildDownloadUrl(apiBase, id) {
    return normalizeApiBase(apiBase) + '/download/' + encodeURIComponent(String(id ?? '')) + '.srt';
}

/**
 * Maps the search endpoint payload onto the fields the player needs. The
 * endpoint returns a bare array; anything unusable is dropped so a single bad
 * row cannot break the whole result list.
 * @param {unknown} payload The parsed JSON body of `/search`.
 * @returns {Array<{id: string, title: string, version: string, language: string}>} The usable results.
 */
export function parseSearchResults(payload) {
    if (!Array.isArray(payload)) {
        return [];
    }

    const results = [];

    for (const item of payload) {
        if (!item || typeof item !== 'object') {
            continue;
        }

        const id = item.id == null ? '' : String(item.id).trim();
        const title = typeof item.title === 'string' ? item.title.trim() : '';
        if (!id || !title) {
            console.warn('[htmlVideoPlayer] skipping online subtitle result without an id or title', item);
            continue;
        }

        if (item.format && !SRT_FORMAT_PATTERN.test(String(item.format))) {
            continue;
        }

        results.push({
            id,
            title,
            version: typeof item.version === 'string' ? item.version.trim() : '',
            language: typeof item.language === 'string' ? item.language.trim() : ''
        });
    }

    return results;
}
