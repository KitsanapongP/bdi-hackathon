const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const normalizedApiBaseUrl = rawApiBaseUrl
    ? rawApiBaseUrl.replace(/\/+$/, '')
    : '';

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