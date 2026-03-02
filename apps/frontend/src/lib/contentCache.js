let cachedCoOrganizerSponsors = null;

export function getCachedCoOrganizerSponsors() {
    return cachedCoOrganizerSponsors;
}

export function setCachedCoOrganizerSponsors(items) {
    cachedCoOrganizerSponsors = Array.isArray(items) ? items : [];
}
