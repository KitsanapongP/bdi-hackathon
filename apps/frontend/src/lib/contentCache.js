let cachedCoOrganizerSponsors = null;
let cachedHomeCarouselSlides = null;

const HOME_CAROUSEL_CACHE_KEY = 'gt_home_carousel_slides_v1';
const HOME_CAROUSEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function readJsonFromLocalStorage(key) {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function writeJsonToLocalStorage(key, value) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // ignore storage failures
    }
}

function removeFromLocalStorage(key) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(key);
    } catch {
        // ignore storage failures
    }
}

function normalizeCarouselCachePayload(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const payload = raw;
    if (!Array.isArray(payload.items)) return null;
    if (!Number.isFinite(payload.cachedAt)) return null;
    return {
        items: payload.items,
        cachedAt: Number(payload.cachedAt),
    };
}

function isCarouselCacheExpired(cachedAt) {
    if (!Number.isFinite(cachedAt)) return true;
    return Date.now() - cachedAt > HOME_CAROUSEL_CACHE_TTL_MS;
}

export function getCachedCoOrganizerSponsors() {
    return cachedCoOrganizerSponsors;
}

export function setCachedCoOrganizerSponsors(items) {
    cachedCoOrganizerSponsors = Array.isArray(items) ? items : [];
}

export function getCachedHomeCarouselSlides() {
    if (cachedHomeCarouselSlides) {
        if (isCarouselCacheExpired(cachedHomeCarouselSlides.cachedAt)) {
            cachedHomeCarouselSlides = null;
            removeFromLocalStorage(HOME_CAROUSEL_CACHE_KEY);
            return [];
        }
        return cachedHomeCarouselSlides.items;
    }

    const fromStorage = readJsonFromLocalStorage(HOME_CAROUSEL_CACHE_KEY);
    const normalized = normalizeCarouselCachePayload(fromStorage);

    if (!normalized) {
        cachedHomeCarouselSlides = null;
        return [];
    }

    if (isCarouselCacheExpired(normalized.cachedAt)) {
        cachedHomeCarouselSlides = null;
        removeFromLocalStorage(HOME_CAROUSEL_CACHE_KEY);
        return [];
    }

    cachedHomeCarouselSlides = normalized;
    return normalized.items;
}

export function setCachedHomeCarouselSlides(items) {
    const normalized = Array.isArray(items) ? items : [];
    cachedHomeCarouselSlides = {
        items: normalized,
        cachedAt: Date.now(),
    };
    writeJsonToLocalStorage(HOME_CAROUSEL_CACHE_KEY, cachedHomeCarouselSlides);
}
