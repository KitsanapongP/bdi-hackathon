/** Standard API response helpers */

export function ok<T>(data: T, message?: string) {
    return { ok: true as const, data, ...(message ? { message } : {}) };
}

export function fail(message: string) {
    return { ok: false as const, message };
}
