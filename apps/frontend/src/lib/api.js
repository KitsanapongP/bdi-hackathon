const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

function normalizeApiBaseUrl(value) {
    if (!value) return '';

    const trimmed = value.trim();
    if (!trimmed) return '';

    const withProtocol = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `http://${trimmed}`;

    return withProtocol.replace(/\/+$/, '');
}

const normalizedApiBaseUrl = normalizeApiBaseUrl(rawApiBaseUrl);

export function apiUrl(path) {
    if (!path) return normalizedApiBaseUrl || '/api';

    if (/^https?:\/\//i.test(path)) return path;

    if (path.startsWith('/')) {
        return normalizedApiBaseUrl ? `${normalizedApiBaseUrl}${path}` : path;
    }

    return normalizedApiBaseUrl
        ? `${normalizedApiBaseUrl}/${path}`
        : `/${path}`;
}
