import type { FastifyRequest } from 'fastify';

function firstHeaderValue(value: string | string[] | undefined): string {
    const raw = Array.isArray(value) ? value[0] : value;
    return String(raw || '').split(',')[0]?.trim() || '';
}

function protocolFromUrl(value: string): string {
    try {
        const parsed = new URL(value);
        return parsed.protocol.replace(':', '');
    } catch {
        return '';
    }
}

export function getPublicRequestBaseUrl(req: FastifyRequest): string {
    const forwarded = firstHeaderValue(req.headers.forwarded);
    const forwardedProto = forwarded.match(/proto=([^;,]+)/i)?.[1]?.replace(/"/g, '').trim();
    const forwardedHost = forwarded.match(/host=([^;,]+)/i)?.[1]?.replace(/"/g, '').trim();

    const protoFromForwarded = forwardedProto || firstHeaderValue(req.headers['x-forwarded-proto']);
    const protoFromOrigin = protocolFromUrl(firstHeaderValue(req.headers.origin));
    const protoFromReferer = protocolFromUrl(firstHeaderValue(req.headers.referer));
    const protocol = protoFromForwarded || protoFromOrigin || protoFromReferer || req.protocol || 'https';

    const host = forwardedHost || firstHeaderValue(req.headers['x-forwarded-host']) || firstHeaderValue(req.headers.host);
    return host ? `${protocol}://${host}` : '';
}
