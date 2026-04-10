import type { DB } from '../../config/db.js';
import path from 'node:path';
import { mkdir, unlink } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import * as repo from './content.repo.js';
import type {
    ContentDataset,
    ContentCarouselSlide,
    ContentCarouselSlideAdmin,
    ContentContact,
    ContentContactCategory,
    ContentContactAdmin,
    ContentContactChannelAdmin,
    ContentPage,
    ContentPageAdmin,
    ContentParticipationOverview,
    ContentParticipationPeriodCountRow,
    ContentParticipationTrendPoint,
    ContentReward,
    ContentRewardAdmin,
    ContentSponsor,
    ContentSponsorAdmin,
    ContentSponsorGroup,
    ContentSponsorGroupAdmin,
    ContentSponsorGroupWithSponsors,
    ContentVenue,
    ContentVenueAdmin,
    ContentVenueCategory,
    ContentVenueImageAdmin,
} from './content.types.js';
import { BadRequestError, NotFoundError } from '../../shared/errors.js';

const PARTICIPATION_OVERVIEW_CACHE_TTL_MS = 5 * 60 * 1000;
const VENUE_CATEGORIES: ContentVenueCategory[] = ['venue', 'accommodation', 'transportation', 'attraction'];

let participationOverviewCache:
    | {
        payload: ContentParticipationOverview;
        expiresAt: number;
    }
    | null = null;

function toNumber(value: unknown): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return Math.trunc(numeric);
}

function mergeParticipationTrend(
    interestedRows: ContentParticipationPeriodCountRow[],
    teamRows: ContentParticipationPeriodCountRow[],
): ContentParticipationTrendPoint[] {
    const bucket = new Map<string, ContentParticipationTrendPoint>();

    for (const row of interestedRows) {
        const periodStart = String(row.period_start || '');
        if (!periodStart) continue;

        bucket.set(periodStart, {
            periodStart,
            interestedParticipants: toNumber(row.total),
            totalTeams: bucket.get(periodStart)?.totalTeams ?? 0,
        });
    }

    for (const row of teamRows) {
        const periodStart = String(row.period_start || '');
        if (!periodStart) continue;

        const existing = bucket.get(periodStart);
        if (existing) {
            existing.totalTeams = toNumber(row.total);
            continue;
        }

        bucket.set(periodStart, {
            periodStart,
            interestedParticipants: 0,
            totalTeams: toNumber(row.total),
        });
    }

    return Array.from(bucket.values()).sort((left, right) => left.periodStart.localeCompare(right.periodStart));
}

function keepRecentPeriods(points: ContentParticipationTrendPoint[], limit: number): ContentParticipationTrendPoint[] {
    if (points.length <= limit) return points;
    return points.slice(points.length - limit);
}

function toRewardAdminResponse(row: any): ContentRewardAdmin {
    return {
        id: row.reward_id,
        rank: row.reward_rank,
        title: row.reward_name_en,
        titleTh: row.reward_name_th,
        amount: row.prize_amount === null ? null : Number(row.prize_amount),
        currency: row.prize_currency,
        prizeTextTh: row.prize_text_th,
        prizeTextEn: row.prize_text_en,
        descriptionTh: row.description_th,
        descriptionEn: row.description_en,
        sortOrder: row.sort_order,
        isActive: row.is_enabled === 1,
    };
}

const DEFAULT_SPONSOR_TIER = {
    code: 'co_organizer',
    nameTh: 'ผู้ร่วมจัด',
    nameEn: 'Co-Organizer',
};

const DEFAULT_SPONSOR_GROUP_CODE = 'technology_partner';

function normalizeTierCode(tierCode?: string | null): string {
    const normalized = (tierCode || '').trim();
    return normalized || DEFAULT_SPONSOR_TIER.code;
}

function normalizeSponsorGroupCode(groupCode?: string | null): string {
    const normalized = (groupCode || '').trim();
    return normalized || DEFAULT_SPONSOR_GROUP_CODE;
}

function toSponsorGroupResponse(row: any): ContentSponsorGroup {
    return {
        id: row.sponsor_group_id,
        code: row.group_code,
        nameTh: row.group_name_th,
        nameEn: row.group_name_en,
        sortOrder: row.sort_order,
    };
}

function toSponsorPublicResponse(row: any): ContentSponsor {
    const sponsorGroup = row.sponsor_group_id
        ? {
            id: row.sponsor_group_id,
            code: row.group_code || '',
            nameTh: row.group_name_th || '',
            nameEn: row.group_name_en || '',
            sortOrder: Number(row.group_sort_order ?? 0),
        }
        : null;

    return {
        id: row.sponsor_id,
        nameTh: row.sponsor_name_th,
        nameEn: row.sponsor_name_en,
        logoStorageKey: row.logo_storage_key,
        logoUrl: row.logo_storage_key,
        websiteUrl: row.website_url,
        tierCode: row.tier_code,
        tierNameTh: row.tier_name_th,
        tierNameEn: row.tier_name_en,
        sponsorGroupId: row.sponsor_group_id ?? null,
        sponsorGroup,
        sortOrder: row.sort_order,
    };
}

function normalizeSponsorLogoStorageKey(logoInput: string, tierCode?: string | null): string {
    const tierFolder = normalizeTierCode(tierCode).replace(/_/g, '-');
    let normalizedPath = (logoInput || '').trim();

    if (/^https?:\/\//i.test(normalizedPath)) {
        try {
            normalizedPath = new URL(normalizedPath).pathname;
        } catch {
            normalizedPath = '';
        }
    }

    normalizedPath = normalizedPath.replace(/^\/+/, '');

    if (normalizedPath.startsWith('static/content/sponsors/')) {
        return `/${normalizedPath}`;
    }

    if (normalizedPath.startsWith('content/sponsors/')) {
        return `/static/${normalizedPath}`;
    }

    const fileName = path.posix.basename(normalizedPath);
    return `/static/content/sponsors/${tierFolder}/${fileName}`;
}

function sanitizeFileName(name: string): string {
    const parsed = path.parse((name || '').trim());
    const normalizedBase = (parsed.name || 'sponsor-logo')
        .normalize('NFKD')
        .replace(/[^\x00-\x7F]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
    const safeBase = normalizedBase || 'sponsor-logo';

    const ext = (parsed.ext || '').toLowerCase();
    const allowedExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
    const safeExt = allowedExts.has(ext) ? ext : '';

    return `${safeBase}${safeExt}`;
}

function extensionFromMimeType(mimeType: string): string {
    switch ((mimeType || '').toLowerCase()) {
        case 'image/png': return '.png';
        case 'image/jpeg': return '.jpg';
        case 'image/webp': return '.webp';
        case 'image/svg+xml': return '.svg';
        default: return '';
    }
}

function normalizeNullableText(value: string | null | undefined): string | null {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized || null;
}

function normalizeVenueGoogleMapsUrl(value: string | null | undefined): string | null {
    const normalized = normalizeNullableText(value);
    if (!normalized) return null;

    let parsed: URL;
    try {
        parsed = new URL(normalized);
    } catch {
        throw new BadRequestError('googleMapsUrl ต้องเป็น URL ที่ถูกต้อง');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new BadRequestError('googleMapsUrl รองรับเฉพาะ http หรือ https');
    }

    const hostname = parsed.hostname.toLowerCase();
    const isGoogleDomain = hostname === 'google.com'
        || hostname.endsWith('.google.com')
        || /^google\.[a-z.]+$/.test(hostname)
        || /\.google\.[a-z.]+$/.test(hostname);

    const isGoogleMapsHost = isGoogleDomain
        || hostname === 'goo.gl'
        || hostname.endsWith('.goo.gl')
        || hostname === 'maps.app.goo.gl'
        || hostname.endsWith('.maps.app.goo.gl');

    if (!isGoogleMapsHost) {
        throw new BadRequestError('googleMapsUrl ต้องเป็นลิงก์จาก Google Maps');
    }

    return parsed.toString();
}

function normalizeLatitude(value: number | null): number | null {
    if (value === null) return null;

    const latitude = Number(value);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        throw new BadRequestError('latitude ต้องอยู่ในช่วง -90 ถึง 90');
    }

    return Number(latitude.toFixed(7));
}

function normalizeLongitude(value: number | null): number | null {
    if (value === null) return null;

    const longitude = Number(value);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new BadRequestError('longitude ต้องอยู่ในช่วง -180 ถึง 180');
    }

    return Number(longitude.toFixed(7));
}

function normalizeVenueCategory(value: string | null | undefined): ContentVenueCategory | undefined {
    if (value === undefined || value === null) return undefined;

    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return undefined;

    if ((VENUE_CATEGORIES as string[]).includes(normalized)) {
        return normalized as ContentVenueCategory;
    }

    throw new BadRequestError('category ไม่ถูกต้อง');
}

function resolveVenueImageDiskPath(imageStorageKey: string | null | undefined): string | null {
    const raw = String(imageStorageKey || '').trim();
    if (!raw) return null;

    let pathname = raw;
    if (/^https?:\/\//i.test(raw)) {
        try {
            pathname = new URL(raw).pathname;
        } catch {
            return null;
        }
    }

    const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const staticPrefix = '/static/content/venues/';
    if (!normalizedPathname.startsWith(staticPrefix)) {
        return null;
    }

    let decodedRelativePath: string;
    try {
        decodedRelativePath = decodeURIComponent(normalizedPathname.slice(staticPrefix.length));
    } catch {
        return null;
    }

    const relativePath = decodedRelativePath.replace(/^[/\\]+/, '');
    if (!relativePath) return null;

    const venuesRoot = path.resolve(process.cwd(), 'public', 'content', 'venues');
    const diskPath = path.resolve(venuesRoot, relativePath);
    const safePrefix = `${venuesRoot}${path.sep}`;
    if (diskPath !== venuesRoot && !diskPath.startsWith(safePrefix)) {
        return null;
    }

    return diskPath;
}

function toVenueImageAdminResponse(row: {
    venue_image_id: number;
    venue_id: number;
    image_storage_key: string;
    image_alt_th: string | null;
    image_alt_en: string | null;
    sort_order: number;
    is_cover: number;
    is_enabled: number;
}): ContentVenueImageAdmin {
    return {
        id: row.venue_image_id,
        venueId: row.venue_id,
        imageStorageKey: row.image_storage_key,
        imageUrl: row.image_storage_key,
        altTh: row.image_alt_th,
        altEn: row.image_alt_en,
        sortOrder: row.sort_order,
        isCover: row.is_cover === 1,
        isEnabled: row.is_enabled === 1,
    };
}

function toVenueAdminResponse(row: {
    venue_id: number;
    venue_category: ContentVenueCategory;
    venue_name_th: string;
    venue_name_en: string | null;
    description_th: string | null;
    description_en: string | null;
    google_maps_url: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
    sort_order: number;
    is_enabled: number;
}, images: ContentVenueImageAdmin[]): ContentVenueAdmin {
    return {
        id: row.venue_id,
        category: row.venue_category,
        nameTh: row.venue_name_th,
        nameEn: row.venue_name_en,
        descriptionTh: row.description_th,
        descriptionEn: row.description_en,
        googleMapsUrl: row.google_maps_url,
        latitude: row.latitude === null ? null : Number(row.latitude),
        longitude: row.longitude === null ? null : Number(row.longitude),
        sortOrder: row.sort_order,
        isEnabled: row.is_enabled === 1,
        images,
    };
}

function normalizeVenueImageStorageKey(value: string): string {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw new BadRequestError('กรุณาระบุ imageStorageKey');
    }

    if (/^https?:\/\//i.test(normalized)) {
        try {
            return new URL(normalized).toString();
        } catch {
            throw new BadRequestError('imageStorageKey ต้องเป็น URL ที่ถูกต้อง');
        }
    }

    return normalized;
}

function normalizeVenuePayload(
    data: {
        category?: string | undefined;
        nameTh?: string | undefined;
        nameEn?: string | null | undefined;
        descriptionTh?: string | null | undefined;
        descriptionEn?: string | null | undefined;
        googleMapsUrl?: string | null | undefined;
        latitude?: number | null | undefined;
        longitude?: number | null | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
    },
    requireName: boolean,
): {
    category?: ContentVenueCategory;
    nameTh?: string;
    nameEn?: string | null;
    descriptionTh?: string | null;
    descriptionEn?: string | null;
    googleMapsUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    sortOrder?: number;
    isEnabled?: boolean;
} {
    const output: {
        category?: ContentVenueCategory;
        nameTh?: string;
        nameEn?: string | null;
        descriptionTh?: string | null;
        descriptionEn?: string | null;
        googleMapsUrl?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        sortOrder?: number;
        isEnabled?: boolean;
    } = {};

    if (data.category !== undefined) {
        const category = normalizeVenueCategory(data.category);
        if (category) {
            output.category = category;
        }
    }

    if (data.nameTh !== undefined) {
        const normalized = data.nameTh.trim();
        if (!normalized) throw new BadRequestError('nameTh ต้องไม่ว่าง');
        output.nameTh = normalized;
    } else if (requireName) {
        throw new BadRequestError('nameTh ต้องไม่ว่าง');
    }

    if (data.nameEn !== undefined) output.nameEn = normalizeNullableText(data.nameEn);
    if (data.descriptionTh !== undefined) output.descriptionTh = normalizeNullableText(data.descriptionTh);
    if (data.descriptionEn !== undefined) output.descriptionEn = normalizeNullableText(data.descriptionEn);
    if (data.googleMapsUrl !== undefined) output.googleMapsUrl = normalizeVenueGoogleMapsUrl(data.googleMapsUrl);
    if (data.latitude !== undefined) output.latitude = normalizeLatitude(data.latitude);
    if (data.longitude !== undefined) output.longitude = normalizeLongitude(data.longitude);
    if (data.isEnabled !== undefined) output.isEnabled = Boolean(data.isEnabled);

    const latitudeProvided = output.latitude !== undefined;
    const longitudeProvided = output.longitude !== undefined;
    if (latitudeProvided !== longitudeProvided) {
        throw new BadRequestError('latitude และ longitude ต้องระบุคู่กัน หรือไม่ระบุทั้งคู่');
    }

    if (latitudeProvided && longitudeProvided) {
        const bothNull = output.latitude === null && output.longitude === null;
        const bothNumber = output.latitude !== null && output.longitude !== null;
        if (!bothNull && !bothNumber) {
            throw new BadRequestError('latitude และ longitude ต้องระบุคู่กัน หรือไม่ระบุทั้งคู่');
        }
    }

    if (data.sortOrder !== undefined) {
        const sortOrder = Number(data.sortOrder);
        if (!Number.isFinite(sortOrder) || sortOrder < 0) {
            throw new BadRequestError('sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
        }
        output.sortOrder = Math.trunc(sortOrder);
    }

    return output;
}

function normalizeVenueImagePayload(
    data: {
        imageStorageKey?: string | undefined;
        imageAltTh?: string | null | undefined;
        imageAltEn?: string | null | undefined;
        sortOrder?: number | undefined;
        isCover?: boolean | undefined;
        isEnabled?: boolean | undefined;
    },
    requireImageStorageKey: boolean,
): {
    imageStorageKey?: string;
    imageAltTh?: string | null;
    imageAltEn?: string | null;
    sortOrder?: number;
    isCover?: boolean;
    isEnabled?: boolean;
} {
    const output: {
        imageStorageKey?: string;
        imageAltTh?: string | null;
        imageAltEn?: string | null;
        sortOrder?: number;
        isCover?: boolean;
        isEnabled?: boolean;
    } = {};

    if (data.imageStorageKey !== undefined) {
        output.imageStorageKey = normalizeVenueImageStorageKey(data.imageStorageKey);
    } else if (requireImageStorageKey) {
        throw new BadRequestError('กรุณาระบุ imageStorageKey');
    }

    if (data.imageAltTh !== undefined) output.imageAltTh = normalizeNullableText(data.imageAltTh);
    if (data.imageAltEn !== undefined) output.imageAltEn = normalizeNullableText(data.imageAltEn);
    if (data.isCover !== undefined) output.isCover = Boolean(data.isCover);
    if (data.isEnabled !== undefined) output.isEnabled = Boolean(data.isEnabled);

    if (data.sortOrder !== undefined) {
        const sortOrder = Number(data.sortOrder);
        if (!Number.isFinite(sortOrder) || sortOrder < 0) {
            throw new BadRequestError('sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
        }
        output.sortOrder = Math.trunc(sortOrder);
    }

    return output;
}

function normalizeCarouselImageStorageKey(imageInput: string): string {
    let normalizedPath = (imageInput || '').trim();
    if (!normalizedPath) {
        throw new BadRequestError('กรุณาระบุรูปภาพสไลด์');
    }

    if (/^https?:\/\//i.test(normalizedPath)) {
        try {
            normalizedPath = new URL(normalizedPath).pathname;
        } catch {
            normalizedPath = '';
        }
    }

    normalizedPath = normalizedPath.replace(/^\/+/, '');

    if (normalizedPath.startsWith('static/content/carousels/')) {
        return `/${normalizedPath}`;
    }

    if (normalizedPath.startsWith('content/carousels/')) {
        return `/static/${normalizedPath}`;
    }

    const fileName = path.posix.basename(normalizedPath);
    if (!fileName) {
        throw new BadRequestError('รูปแบบ image_storage_key ไม่ถูกต้อง');
    }

    return `/static/content/carousels/${fileName}`;
}

function normalizeNullableHttpUrl(value: string | null | undefined, fieldName: string): string | null {
    const normalized = normalizeNullableText(value);
    if (!normalized) return null;

    let parsed: URL;
    try {
        parsed = new URL(normalized);
    } catch {
        throw new BadRequestError(`${fieldName} ต้องเป็น URL ที่ถูกต้อง`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new BadRequestError(`${fieldName} รองรับเฉพาะ http หรือ https`);
    }

    return parsed.toString();
}

function parseDateTimeToDb(value: string | null | undefined, fieldName: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const raw = String(value).trim();
    if (!raw) return null;

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
        throw new BadRequestError(`รูปแบบ ${fieldName} ไม่ถูกต้อง`);
    }

    return date.toISOString().slice(0, 19).replace('T', ' ');
}

function ensureStartEndValid(startAt: string | null, endAt: string | null): void {
    if (!startAt || !endAt) return;
    if (new Date(startAt).getTime() > new Date(endAt).getTime()) {
        throw new BadRequestError('startAt ต้องน้อยกว่าหรือเท่ากับ endAt');
    }
}

function toCarouselResponse(row: {
    slide_id: number;
    title_th: string | null;
    title_en: string | null;
    description_th: string | null;
    description_en: string | null;
    image_storage_key: string;
    image_alt_th: string | null;
    image_alt_en: string | null;
    target_url: string | null;
    open_in_new_tab: number;
    sort_order: number;
}): ContentCarouselSlide {
    return {
        id: row.slide_id,
        titleTh: row.title_th,
        titleEn: row.title_en,
        descriptionTh: row.description_th,
        descriptionEn: row.description_en,
        imageStorageKey: row.image_storage_key,
        imageUrl: row.image_storage_key,
        imageAltTh: row.image_alt_th,
        imageAltEn: row.image_alt_en,
        targetUrl: row.target_url,
        openInNewTab: row.open_in_new_tab === 1,
        sortOrder: row.sort_order,
    };
}

function toCarouselAdminResponse(row: {
    slide_id: number;
    title_th: string | null;
    title_en: string | null;
    description_th: string | null;
    description_en: string | null;
    image_storage_key: string;
    image_alt_th: string | null;
    image_alt_en: string | null;
    target_url: string | null;
    open_in_new_tab: number;
    sort_order: number;
    is_enabled: number;
    start_at: string | null;
    end_at: string | null;
    created_by_user_id: number | null;
}): ContentCarouselSlideAdmin {
    return {
        ...toCarouselResponse(row),
        isEnabled: row.is_enabled === 1,
        startAt: row.start_at,
        endAt: row.end_at,
        createdByUserId: row.created_by_user_id,
    };
}

function normalizeCarouselPayload(
    data: {
        titleTh?: string | null | undefined;
        titleEn?: string | null | undefined;
        descriptionTh?: string | null | undefined;
        descriptionEn?: string | null | undefined;
        imageStorageKey?: string | undefined;
        imageAltTh?: string | null | undefined;
        imageAltEn?: string | null | undefined;
        targetUrl?: string | null | undefined;
        openInNewTab?: boolean | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
        startAt?: string | null | undefined;
        endAt?: string | null | undefined;
    },
    requireRequired: boolean,
): {
    titleTh?: string | null;
    titleEn?: string | null;
    descriptionTh?: string | null;
    descriptionEn?: string | null;
    imageStorageKey?: string;
    imageAltTh?: string | null;
    imageAltEn?: string | null;
    targetUrl?: string | null;
    openInNewTab?: boolean;
    sortOrder?: number;
    isEnabled?: boolean;
    startAt?: string | null;
    endAt?: string | null;
} {
    const output: {
        titleTh?: string | null;
        titleEn?: string | null;
        descriptionTh?: string | null;
        descriptionEn?: string | null;
        imageStorageKey?: string;
        imageAltTh?: string | null;
        imageAltEn?: string | null;
        targetUrl?: string | null;
        openInNewTab?: boolean;
        sortOrder?: number;
        isEnabled?: boolean;
        startAt?: string | null;
        endAt?: string | null;
    } = {};

    if (data.titleTh !== undefined) output.titleTh = normalizeNullableText(data.titleTh);
    if (data.titleEn !== undefined) output.titleEn = normalizeNullableText(data.titleEn);
    if (data.descriptionTh !== undefined) output.descriptionTh = normalizeNullableText(data.descriptionTh);
    if (data.descriptionEn !== undefined) output.descriptionEn = normalizeNullableText(data.descriptionEn);
    if (data.imageAltTh !== undefined) output.imageAltTh = normalizeNullableText(data.imageAltTh);
    if (data.imageAltEn !== undefined) output.imageAltEn = normalizeNullableText(data.imageAltEn);

    if (data.imageStorageKey !== undefined) {
        output.imageStorageKey = normalizeCarouselImageStorageKey(data.imageStorageKey);
    } else if (requireRequired) {
        throw new BadRequestError('กรุณาระบุ imageStorageKey');
    }

    if (data.targetUrl !== undefined) {
        output.targetUrl = normalizeNullableHttpUrl(data.targetUrl, 'targetUrl');
    }

    if (data.openInNewTab !== undefined) output.openInNewTab = Boolean(data.openInNewTab);
    if (data.isEnabled !== undefined) output.isEnabled = Boolean(data.isEnabled);

    if (data.sortOrder !== undefined) {
        const sortOrder = Number(data.sortOrder);
        if (!Number.isFinite(sortOrder) || sortOrder < 0) {
            throw new BadRequestError('sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
        }
        output.sortOrder = Math.trunc(sortOrder);
    }

    const startAt = parseDateTimeToDb(data.startAt, 'startAt');
    if (startAt !== undefined) output.startAt = startAt;
    const endAt = parseDateTimeToDb(data.endAt, 'endAt');
    if (endAt !== undefined) output.endAt = endAt;

    if (requireRequired) {
        const hasAnyTitle = Boolean((output.titleTh || '').trim() || (output.titleEn || '').trim());
        if (!hasAnyTitle) {
            throw new BadRequestError('กรุณาระบุ titleTh หรือ titleEn อย่างน้อย 1 ค่า');
        }
    }

    return output;
}

function toContactChannelAdminResponse(row: {
    channel_id: number;
    contact_id: number;
    channel_type: string;
    label_th: string | null;
    label_en: string | null;
    value: string;
    url: string | null;
    is_primary: number;
    sort_order: number;
    is_enabled: number;
}): ContentContactChannelAdmin {
    return {
        id: row.channel_id,
        contactId: row.contact_id,
        channelType: row.channel_type,
        labelTh: row.label_th,
        labelEn: row.label_en,
        value: row.value,
        url: row.url,
        isPrimary: row.is_primary === 1,
        sortOrder: row.sort_order,
        isEnabled: row.is_enabled === 1,
    };
}

const CONTACT_CATEGORIES: ContentContactCategory[] = ['event_inquiry', 'dataset_inquiry', 'tech_it', 'facility'];

function isContactCategory(value: string): value is ContentContactCategory {
    return CONTACT_CATEGORIES.includes(value as ContentContactCategory);
}

function normalizeContactCategory(
    value: string | null | undefined,
    mode: 'strict' | 'fallback',
): ContentContactCategory {
    const normalized = (value || '').trim().toLowerCase();
    if (isContactCategory(normalized)) {
        return normalized;
    }

    if (mode === 'fallback') {
        return 'event_inquiry';
    }

    throw new BadRequestError('contactCategory ไม่ถูกต้อง');
}

function toContactAdminResponse(row: {
    contact_id: number;
    contact_category: ContentContactCategory;
    display_name_th: string;
    display_name_en: string;
    role_th: string | null;
    role_en: string | null;
    organization_th: string | null;
    organization_en: string | null;
    department_th: string | null;
    department_en: string | null;
    bio_th: string | null;
    bio_en: string | null;
    avatar_url: string | null;
    avatar_alt_th: string | null;
    avatar_alt_en: string | null;
    is_featured: number;
    sort_order: number;
    is_enabled: number;
    published_at: string | null;
}, channels: ContentContactChannelAdmin[]): ContentContactAdmin {
    return {
        id: row.contact_id,
        contactCategory: normalizeContactCategory(row.contact_category, 'fallback'),
        displayNameTh: row.display_name_th,
        displayNameEn: row.display_name_en,
        roleTh: row.role_th,
        roleEn: row.role_en,
        organizationTh: row.organization_th,
        organizationEn: row.organization_en,
        departmentTh: row.department_th,
        departmentEn: row.department_en,
        bioTh: row.bio_th,
        bioEn: row.bio_en,
        avatarUrl: row.avatar_url,
        avatarAltTh: row.avatar_alt_th,
        avatarAltEn: row.avatar_alt_en,
        isFeatured: row.is_featured === 1,
        sortOrder: row.sort_order,
        isEnabled: row.is_enabled === 1,
        publishedAt: row.published_at,
        channels,
    };
}

function parsePublishedAt(value: string | null | undefined): string | null {
    if (value === undefined || value === null) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
        throw new BadRequestError('รูปแบบ publishedAt ไม่ถูกต้อง');
    }

    return date.toISOString().slice(0, 19).replace('T', ' ');
}

function normalizeContactPayload(data: {
    contactCategory?: string | undefined;
    displayNameTh?: string | undefined;
    displayNameEn?: string | undefined;
    roleTh?: string | null | undefined;
    roleEn?: string | null | undefined;
    organizationTh?: string | null | undefined;
    organizationEn?: string | null | undefined;
    departmentTh?: string | null | undefined;
    departmentEn?: string | null | undefined;
    bioTh?: string | null | undefined;
    bioEn?: string | null | undefined;
    avatarUrl?: string | null | undefined;
    avatarAltTh?: string | null | undefined;
    avatarAltEn?: string | null | undefined;
    isFeatured?: boolean | undefined;
    sortOrder?: number | undefined;
    isEnabled?: boolean | undefined;
    publishedAt?: string | null | undefined;
}, requireName: boolean): {
    contactCategory?: ContentContactCategory;
    displayNameTh?: string;
    displayNameEn?: string;
    roleTh?: string | null;
    roleEn?: string | null;
    organizationTh?: string | null;
    organizationEn?: string | null;
    departmentTh?: string | null;
    departmentEn?: string | null;
    bioTh?: string | null;
    bioEn?: string | null;
    avatarUrl?: string | null;
    avatarAltTh?: string | null;
    avatarAltEn?: string | null;
    isFeatured?: boolean;
    sortOrder?: number;
    isEnabled?: boolean;
    publishedAt?: string | null;
} {
    const output: {
        contactCategory?: ContentContactCategory;
        displayNameTh?: string;
        displayNameEn?: string;
        roleTh?: string | null;
        roleEn?: string | null;
        organizationTh?: string | null;
        organizationEn?: string | null;
        departmentTh?: string | null;
        departmentEn?: string | null;
        bioTh?: string | null;
        bioEn?: string | null;
        avatarUrl?: string | null;
        avatarAltTh?: string | null;
        avatarAltEn?: string | null;
        isFeatured?: boolean;
        sortOrder?: number;
        isEnabled?: boolean;
        publishedAt?: string | null;
    } = {};

    if (data.contactCategory !== undefined) {
        output.contactCategory = normalizeContactCategory(data.contactCategory, 'strict');
    }

    if (data.displayNameTh !== undefined) {
        const v = data.displayNameTh.trim();
        if (!v) throw new BadRequestError('displayNameTh ต้องไม่ว่าง');
        output.displayNameTh = v;
    } else if (requireName) {
        throw new BadRequestError('displayNameTh ต้องไม่ว่าง');
    }

    if (data.displayNameEn !== undefined) {
        const v = data.displayNameEn.trim();
        if (!v) throw new BadRequestError('displayNameEn ต้องไม่ว่าง');
        output.displayNameEn = v;
    } else if (requireName) {
        throw new BadRequestError('displayNameEn ต้องไม่ว่าง');
    }

    if (data.roleTh !== undefined) output.roleTh = (data.roleTh || '').trim() || null;
    if (data.roleEn !== undefined) output.roleEn = (data.roleEn || '').trim() || null;
    if (data.organizationTh !== undefined) output.organizationTh = (data.organizationTh || '').trim() || null;
    if (data.organizationEn !== undefined) output.organizationEn = (data.organizationEn || '').trim() || null;
    if (data.departmentTh !== undefined) output.departmentTh = (data.departmentTh || '').trim() || null;
    if (data.departmentEn !== undefined) output.departmentEn = (data.departmentEn || '').trim() || null;
    if (data.bioTh !== undefined) output.bioTh = (data.bioTh || '').trim() || null;
    if (data.bioEn !== undefined) output.bioEn = (data.bioEn || '').trim() || null;
    if (data.avatarUrl !== undefined) output.avatarUrl = (data.avatarUrl || '').trim() || null;
    if (data.avatarAltTh !== undefined) output.avatarAltTh = (data.avatarAltTh || '').trim() || null;
    if (data.avatarAltEn !== undefined) output.avatarAltEn = (data.avatarAltEn || '').trim() || null;

    if (data.isFeatured !== undefined) output.isFeatured = Boolean(data.isFeatured);
    if (data.isEnabled !== undefined) output.isEnabled = Boolean(data.isEnabled);

    if (data.sortOrder !== undefined) {
        const sortOrder = Number(data.sortOrder);
        if (!Number.isFinite(sortOrder) || sortOrder < 0) {
            throw new BadRequestError('sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
        }
        output.sortOrder = Math.trunc(sortOrder);
    }

    if (data.publishedAt !== undefined) {
        output.publishedAt = parsePublishedAt(data.publishedAt);
    }

    return output;
}

function normalizeContactChannelPayload(data: {
    channelType?: string | undefined;
    labelTh?: string | null | undefined;
    labelEn?: string | null | undefined;
    value?: string | undefined;
    url?: string | null | undefined;
    isPrimary?: boolean | undefined;
    sortOrder?: number | undefined;
    isEnabled?: boolean | undefined;
}, requireRequired: boolean): {
    channelType?: string;
    labelTh?: string | null;
    labelEn?: string | null;
    value?: string;
    url?: string | null;
    isPrimary?: boolean;
    sortOrder?: number;
    isEnabled?: boolean;
} {
    const output: {
        channelType?: string;
        labelTh?: string | null;
        labelEn?: string | null;
        value?: string;
        url?: string | null;
        isPrimary?: boolean;
        sortOrder?: number;
        isEnabled?: boolean;
    } = {};

    if (data.channelType !== undefined) {
        const channelType = data.channelType.trim().toLowerCase();
        if (!channelType) throw new BadRequestError('channelType ต้องไม่ว่าง');
        output.channelType = channelType;
    } else if (requireRequired) {
        throw new BadRequestError('channelType ต้องไม่ว่าง');
    }

    if (data.value !== undefined) {
        const value = data.value.trim();
        if (!value) throw new BadRequestError('value ต้องไม่ว่าง');
        output.value = value;
    } else if (requireRequired) {
        throw new BadRequestError('value ต้องไม่ว่าง');
    }

    if (data.labelTh !== undefined) output.labelTh = (data.labelTh || '').trim() || null;
    if (data.labelEn !== undefined) output.labelEn = (data.labelEn || '').trim() || null;
    if (data.url !== undefined) output.url = (data.url || '').trim() || null;
    if (data.isPrimary !== undefined) output.isPrimary = Boolean(data.isPrimary);
    if (data.isEnabled !== undefined) output.isEnabled = Boolean(data.isEnabled);

    if (data.sortOrder !== undefined) {
        const sortOrder = Number(data.sortOrder);
        if (!Number.isFinite(sortOrder) || sortOrder < 0) {
            throw new BadRequestError('sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
        }
        output.sortOrder = Math.trunc(sortOrder);
    }

    return output;
}

export async function getRewards(db: DB): Promise<ContentReward[]> {
    const rewards = await repo.getEnabledRewards(db);

    return rewards.map((reward) => ({
        id: reward.reward_id,
        rank: reward.reward_rank,
        nameTh: reward.reward_name_th,
        nameEn: reward.reward_name_en,
        amount: reward.prize_amount === null ? null : Number(reward.prize_amount),
        currency: reward.prize_currency,
        prizeTextTh: reward.prize_text_th,
        prizeTextEn: reward.prize_text_en,
        descriptionTh: reward.description_th,
        descriptionEn: reward.description_en,
        sortOrder: reward.sort_order,
    }));
}

export async function getParticipationOverview(db: DB): Promise<ContentParticipationOverview> {
    const now = Date.now();
    if (participationOverviewCache && participationOverviewCache.expiresAt > now) {
        return participationOverviewCache.payload;
    }

    const [
        interestedParticipants,
        totalTeams,
        interestedWeekly,
        teamsWeekly,
        interestedMonthly,
        teamsMonthly,
    ] = await Promise.all([
        repo.getInterestedParticipantCount(db),
        repo.getTotalActiveTeamCount(db),
        repo.getInterestedParticipantTrend(db, 'weekly'),
        repo.getTotalActiveTeamTrend(db, 'weekly'),
        repo.getInterestedParticipantTrend(db, 'monthly'),
        repo.getTotalActiveTeamTrend(db, 'monthly'),
    ]);

    const payload: ContentParticipationOverview = {
        totals: {
            interestedParticipants,
            totalTeams,
        },
        trend: {
            weekly: keepRecentPeriods(mergeParticipationTrend(interestedWeekly, teamsWeekly), 24),
            monthly: keepRecentPeriods(mergeParticipationTrend(interestedMonthly, teamsMonthly), 18),
        },
        generatedAt: new Date().toISOString(),
    };

    participationOverviewCache = {
        payload,
        expiresAt: now + PARTICIPATION_OVERVIEW_CACHE_TTL_MS,
    };

    return payload;
}

export async function getAllRewardsAdmin(db: DB): Promise<ContentRewardAdmin[]> {
    const rewards = await repo.getAllRewards(db);
    return rewards.map(toRewardAdminResponse);
}

export async function getRewardByIdAdmin(db: DB, rewardId: number): Promise<ContentRewardAdmin> {
    const reward = await repo.getRewardById(db, rewardId);
    if (!reward) {
        throw new NotFoundError('ไม่พบข้อมูลรางวัลนี้');
    }
    return toRewardAdminResponse(reward);
}

export async function createRewardAdmin(
    db: DB,
    data: {
        rank: string;
        title: string;
        titleTh: string;
        amount: number | null;
        currency: string | null;
        prizeTextTh: string | null;
        prizeTextEn: string | null;
        descriptionTh: string | null;
        descriptionEn: string | null;
        sortOrder: number;
        isActive: boolean;
    }
): Promise<ContentRewardAdmin> {
    const rewardId = await repo.createReward(db, {
        rewardRank: data.rank,
        rewardNameTh: data.titleTh,
        rewardNameEn: data.title,
        prizeAmount: data.amount,
        prizeCurrency: data.currency,
        prizeTextTh: data.prizeTextTh,
        prizeTextEn: data.prizeTextEn,
        descriptionTh: data.descriptionTh,
        descriptionEn: data.descriptionEn,
        sortOrder: data.sortOrder,
        isEnabled: data.isActive,
    });

    const reward = await repo.getRewardById(db, rewardId);
    return toRewardAdminResponse(reward!);
}

export async function updateRewardAdmin(
    db: DB,
    rewardId: number,
    data: {
        rank?: string;
        title?: string;
        titleTh?: string;
        amount?: number | null;
        currency?: string | null;
        prizeTextTh?: string | null;
        prizeTextEn?: string | null;
        descriptionTh?: string | null;
        descriptionEn?: string | null;
        sortOrder?: number;
        isActive?: boolean;
    }
): Promise<ContentRewardAdmin> {
    const existing = await repo.getRewardById(db, rewardId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูลรางวัลนี้');
    }

    await repo.updateReward(db, rewardId, {
        rewardRank: data.rank ?? undefined,
        rewardNameTh: data.titleTh ?? undefined,
        rewardNameEn: data.title ?? undefined,
        prizeAmount: data.amount ?? undefined,
        prizeCurrency: data.currency ?? undefined,
        prizeTextTh: data.prizeTextTh ?? undefined,
        prizeTextEn: data.prizeTextEn ?? undefined,
        descriptionTh: data.descriptionTh ?? undefined,
        descriptionEn: data.descriptionEn ?? undefined,
        sortOrder: data.sortOrder ?? undefined,
        isEnabled: data.isActive,
    });

    const updated = await repo.getRewardById(db, rewardId);
    return toRewardAdminResponse(updated!);
}

export async function deleteRewardAdmin(db: DB, rewardId: number): Promise<void> {
    const existing = await repo.getRewardById(db, rewardId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูลรางวัลนี้');
    }
    await repo.deleteReward(db, rewardId);
}

export async function getSponsors(db: DB, tierCode?: string): Promise<ContentSponsor[]> {
    const sponsors = await repo.getEnabledSponsors(db, tierCode);

    return sponsors.map(toSponsorPublicResponse);
}

export async function getSponsorGroupsWithSponsors(db: DB): Promise<ContentSponsorGroupWithSponsors[]> {
    const [groups, sponsors] = await Promise.all([
        repo.getEnabledSponsorGroups(db),
        repo.getEnabledSponsors(db),
    ]);

    const sponsorsByGroupId = new Map<number, ContentSponsor[]>();
    const ungroupedSponsors: ContentSponsor[] = [];
    for (const sponsor of sponsors) {
        const sponsorResponse = toSponsorPublicResponse(sponsor);

        if (!sponsor.sponsor_group_id) {
            ungroupedSponsors.push(sponsorResponse);
            continue;
        }

        const list = sponsorsByGroupId.get(sponsor.sponsor_group_id) ?? [];
        list.push(sponsorResponse);
        sponsorsByGroupId.set(sponsor.sponsor_group_id, list);
    }

    const groupedSponsors = groups.map((group) => ({
        ...toSponsorGroupResponse(group),
        sponsors: sponsorsByGroupId.get(group.sponsor_group_id) ?? [],
    }));

    if (ungroupedSponsors.length === 0) {
        return groupedSponsors;
    }

    return [
        {
            id: 0,
            code: 'ungrouped',
            nameTh: 'ภาคีที่ไม่ได้อยู่ในกลุ่ม',
            nameEn: 'Ungrouped Partners',
            sortOrder: -1,
            sponsors: ungroupedSponsors,
        },
        ...groupedSponsors,
    ];
}

export async function getCarousels(db: DB): Promise<ContentCarouselSlide[]> {
    const rows = await repo.getEnabledCarouselSlides(db);
    return rows.map(toCarouselResponse);
}

function toSponsorAdminResponse(row: any): ContentSponsorAdmin {
    const sponsorGroup = row.sponsor_group_id
        ? {
            id: row.sponsor_group_id,
            code: row.group_code || '',
            nameTh: row.group_name_th || '',
            nameEn: row.group_name_en || '',
            sortOrder: Number(row.group_sort_order ?? 0),
        }
        : null;

    return {
        id: row.sponsor_id,
        name: row.sponsor_name_en,
        nameTh: row.sponsor_name_th,
        link: row.website_url || '',
        displayOrder: row.sort_order,
        isActive: row.is_enabled === 1,
        logo: row.logo_storage_key || '',
        logoMeta: null,
        tierCode: row.tier_code,
        tierNameTh: row.tier_name_th,
        tierNameEn: row.tier_name_en,
        sponsorGroupId: row.sponsor_group_id ?? null,
        sponsorGroup,
    };
}

function toSponsorGroupAdminResponse(row: any): ContentSponsorGroupAdmin {
    return {
        ...toSponsorGroupResponse(row),
        isActive: row.is_enabled === 1,
    };
}

export async function getAllSponsorGroupsAdmin(db: DB): Promise<ContentSponsorGroupAdmin[]> {
    const groups = await repo.getAllSponsorGroups(db);
    return groups.map(toSponsorGroupAdminResponse);
}

export async function createSponsorGroupAdmin(
    db: DB,
    data: {
        code: string;
        nameTh: string;
        nameEn: string;
        sortOrder: number;
        isActive: boolean;
    }
): Promise<ContentSponsorGroupAdmin> {
    const nameTh = data.nameTh.trim();
    const nameEn = data.nameEn.trim();
    if (!nameTh || !nameEn) {
        throw new BadRequestError('ต้องระบุชื่อกลุ่มภาษาไทยและอังกฤษ');
    }

    const createdId = await repo.createSponsorGroup(db, {
        code: normalizeSponsorGroupCode(data.code),
        nameTh,
        nameEn,
        sortOrder: Number(data.sortOrder),
        isEnabled: data.isActive,
    });

    const created = await repo.getSponsorGroupById(db, createdId);
    if (!created) {
        throw new NotFoundError('ไม่พบข้อมูลกลุ่มภาคีที่เพิ่งสร้าง');
    }

    return toSponsorGroupAdminResponse(created);
}

export async function updateSponsorGroupAdmin(
    db: DB,
    groupId: number,
    data: {
        code?: string;
        nameTh?: string;
        nameEn?: string;
        sortOrder?: number;
        isActive?: boolean;
    }
): Promise<ContentSponsorGroupAdmin> {
    const existing = await repo.getSponsorGroupById(db, groupId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูลกลุ่มภาคีนี้');
    }

    if (data.nameTh !== undefined && !data.nameTh.trim()) {
        throw new BadRequestError('nameTh ต้องไม่ว่าง');
    }

    if (data.nameEn !== undefined && !data.nameEn.trim()) {
        throw new BadRequestError('nameEn ต้องไม่ว่าง');
    }

    await repo.updateSponsorGroup(db, groupId, {
        code: data.code !== undefined ? normalizeSponsorGroupCode(data.code) : undefined,
        nameTh: data.nameTh !== undefined ? data.nameTh.trim() : undefined,
        nameEn: data.nameEn !== undefined ? data.nameEn.trim() : undefined,
        sortOrder: data.sortOrder,
        isEnabled: data.isActive,
    });

    const updated = await repo.getSponsorGroupById(db, groupId);
    if (!updated) {
        throw new NotFoundError('ไม่พบข้อมูลกลุ่มภาคีหลังการอัปเดต');
    }

    return toSponsorGroupAdminResponse(updated);
}

export async function reorderSponsorGroupsAdmin(db: DB, updates: { id: number; sortOrder: number }[]): Promise<void> {
    await repo.updateSponsorGroupsOrder(
        db,
        updates.map((update) => ({
            id: Number(update.id),
            sortOrder: Number(update.sortOrder),
        }))
    );
}

export async function getAllSponsorsAdmin(db: DB): Promise<ContentSponsorAdmin[]> {
    const sponsors = await repo.getAllSponsors(db);
    return sponsors.map(toSponsorAdminResponse);
}

export async function getSponsorByIdAdmin(db: DB, sponsorId: number): Promise<ContentSponsorAdmin> {
    const sponsor = await repo.getSponsorById(db, sponsorId);
    if (!sponsor) {
        throw new NotFoundError('ไม่พบข้อมูล sponsor นี้');
    }
    return toSponsorAdminResponse(sponsor);
}

export async function createSponsorAdmin(
    db: DB,
    data: {
        name: string;
        nameTh?: string;
        link?: string | null;
        displayOrder: number;
        isActive: boolean;
        logo: string;
        tierCode?: string | null;
        tierNameTh?: string | null;
        tierNameEn?: string | null;
        sponsorGroupId?: number | null;
    }
): Promise<ContentSponsorAdmin> {
    const tierCode = normalizeTierCode(data.tierCode);
    const nameEn = data.name.trim();
    const nameTh = (data.nameTh || '').trim() || nameEn;
    const sponsorGroupId = data.sponsorGroupId ?? null;

    if (sponsorGroupId !== null) {
        const group = await repo.getSponsorGroupById(db, sponsorGroupId);
        if (!group) {
            throw new BadRequestError('sponsorGroupId ไม่ถูกต้อง');
        }
    }

    const sponsorId = await repo.createSponsor(db, {
        nameEn,
        nameTh,
        logoStorageKey: normalizeSponsorLogoStorageKey(data.logo, tierCode),
        websiteUrl: (data.link || '').trim() || null,
        tierCode,
        tierNameTh: (data.tierNameTh || '').trim() || DEFAULT_SPONSOR_TIER.nameTh,
        tierNameEn: (data.tierNameEn || '').trim() || DEFAULT_SPONSOR_TIER.nameEn,
        sponsorGroupId,
        sortOrder: data.displayOrder,
        isEnabled: data.isActive,
    });

    const sponsor = await repo.getSponsorById(db, sponsorId);
    return toSponsorAdminResponse(sponsor!);
}

export async function updateSponsorAdmin(
    db: DB,
    sponsorId: number,
    data: {
        name?: string;
        nameTh?: string;
        link?: string | null;
        displayOrder?: number;
        isActive?: boolean;
        logo?: string;
        tierCode?: string | null;
        tierNameTh?: string | null;
        tierNameEn?: string | null;
        sponsorGroupId?: number | null;
    }
): Promise<ContentSponsorAdmin> {
    const existing = await repo.getSponsorById(db, sponsorId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูล sponsor นี้');
    }

    const updatePayload: {
        nameEn?: string | undefined;
        nameTh?: string | undefined;
        logoStorageKey?: string | undefined;
        websiteUrl?: string | null | undefined;
        tierCode?: string | null | undefined;
        tierNameTh?: string | null | undefined;
        tierNameEn?: string | null | undefined;
        sponsorGroupId?: number | null | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
    } = {};

    if (data.name !== undefined) updatePayload.nameEn = data.name.trim();
    if (data.nameTh !== undefined) updatePayload.nameTh = data.nameTh.trim();
    if (data.link !== undefined) updatePayload.websiteUrl = (data.link || '').trim() || null;
    if (data.tierCode !== undefined) updatePayload.tierCode = normalizeTierCode(data.tierCode);
    if (data.tierNameTh !== undefined) updatePayload.tierNameTh = (data.tierNameTh || '').trim() || null;
    if (data.tierNameEn !== undefined) updatePayload.tierNameEn = (data.tierNameEn || '').trim() || null;
    if (data.sponsorGroupId !== undefined) {
        if (data.sponsorGroupId !== null) {
            const group = await repo.getSponsorGroupById(db, data.sponsorGroupId);
            if (!group) {
                throw new BadRequestError('sponsorGroupId ไม่ถูกต้อง');
            }
        }
        updatePayload.sponsorGroupId = data.sponsorGroupId;
    }
    if (data.displayOrder !== undefined) updatePayload.sortOrder = data.displayOrder;
    if (data.isActive !== undefined) updatePayload.isEnabled = data.isActive;

    if (data.logo !== undefined) {
        updatePayload.logoStorageKey = normalizeSponsorLogoStorageKey(
            data.logo,
            data.tierCode !== undefined ? data.tierCode : existing.tier_code
        );
    }

    await repo.updateSponsor(db, sponsorId, updatePayload);

    const updated = await repo.getSponsorById(db, sponsorId);
    return toSponsorAdminResponse(updated!);
}

export async function deleteSponsorAdmin(db: DB, sponsorId: number): Promise<void> {
    const existing = await repo.getSponsorById(db, sponsorId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูล sponsor นี้');
    }
    await repo.deleteSponsor(db, sponsorId);
}

export async function uploadSponsorLogoAdmin(
    db: DB,
    sponsorId: number,
    input: {
        stream: NodeJS.ReadableStream;
        originalName: string;
        mimeType: string;
        requestedFileName?: string | null;
        tierCode?: string | null;
    }
): Promise<ContentSponsorAdmin> {
    const sponsor = await repo.getSponsorById(db, sponsorId);
    if (!sponsor) {
        throw new NotFoundError('ไม่พบข้อมูล sponsor นี้');
    }

    const extFromMime = extensionFromMimeType(input.mimeType);
    if (!extFromMime) {
        throw new BadRequestError('รองรับเฉพาะ PNG/JPG/WEBP/SVG');
    }

    const chosenTierCode = normalizeTierCode(input.tierCode ?? sponsor.tier_code);
    const tierFolder = chosenTierCode.replace(/_/g, '-');

    const preferredName = (input.requestedFileName || '').trim() || input.originalName;
    let safeFileName = sanitizeFileName(preferredName);
    if (!safeFileName || !path.posix.extname(safeFileName)) {
        safeFileName = `${sanitizeFileName(path.posix.parse(preferredName).name || 'sponsor-logo')}${extFromMime}`;
    }

    const uploadDir = path.join(process.cwd(), 'public', 'content', 'sponsors', tierFolder);
    await mkdir(uploadDir, { recursive: true });

    const diskPath = path.join(uploadDir, safeFileName);
    await pipeline(input.stream, createWriteStream(diskPath));

    const logoStorageKey = `/static/content/sponsors/${tierFolder}/${safeFileName}`;

    await repo.updateSponsor(db, sponsorId, {
        logoStorageKey,
        tierCode: chosenTierCode,
    });

    const updated = await repo.getSponsorById(db, sponsorId);
    return toSponsorAdminResponse(updated!);
}

export async function reorderSponsorsAdmin(db: DB, updates: { id: number; displayOrder: number }[]): Promise<void> {
    await repo.updateSponsorsOrder(db, updates.map(u => ({ id: u.id, sortOrder: u.displayOrder })));
}

export async function getAllVenuesAdmin(db: DB): Promise<ContentVenueAdmin[]> {
    const venues = await repo.getAllVenuesAdmin(db);
    const imageRows = await repo.getVenueImagesByVenueIdsAdmin(db, venues.map((venue) => venue.venue_id));

    const imagesByVenue = new Map<number, ContentVenueImageAdmin[]>();
    for (const imageRow of imageRows) {
        const list = imagesByVenue.get(imageRow.venue_id) ?? [];
        list.push(toVenueImageAdminResponse(imageRow));
        imagesByVenue.set(imageRow.venue_id, list);
    }

    return venues.map((venue) =>
        toVenueAdminResponse(venue, imagesByVenue.get(venue.venue_id) ?? []),
    );
}

export async function createVenueAdmin(
    db: DB,
    data: {
        category?: string | undefined;
        nameTh: string;
        nameEn?: string | null | undefined;
        descriptionTh?: string | null | undefined;
        descriptionEn?: string | null | undefined;
        googleMapsUrl?: string | null | undefined;
        latitude?: number | null | undefined;
        longitude?: number | null | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
    }
): Promise<ContentVenueAdmin> {
    const payload = normalizeVenuePayload(data, true);
    if (!payload.category) {
        throw new BadRequestError('category ไม่ถูกต้อง');
    }

    const venueId = await repo.createVenueAdmin(db, {
        category: payload.category,
        nameTh: payload.nameTh!,
        nameEn: payload.nameEn ?? null,
        descriptionTh: payload.descriptionTh ?? null,
        descriptionEn: payload.descriptionEn ?? null,
        googleMapsUrl: payload.googleMapsUrl ?? null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        sortOrder: payload.sortOrder ?? 0,
        isEnabled: payload.isEnabled ?? true,
    });

    const created = await repo.getVenueByIdAdmin(db, venueId);
    if (!created) {
        throw new NotFoundError('ไม่พบข้อมูลสถานที่ที่เพิ่งสร้าง');
    }

    return toVenueAdminResponse(created, []);
}

export async function updateVenueAdmin(
    db: DB,
    venueId: number,
    data: {
        category?: string | undefined;
        nameTh?: string | undefined;
        nameEn?: string | null | undefined;
        descriptionTh?: string | null | undefined;
        descriptionEn?: string | null | undefined;
        googleMapsUrl?: string | null | undefined;
        latitude?: number | null | undefined;
        longitude?: number | null | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
    }
): Promise<ContentVenueAdmin> {
    const existing = await repo.getVenueByIdAdmin(db, venueId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูลสถานที่นี้');
    }

    const payload = normalizeVenuePayload(data, false);
    await repo.updateVenueAdmin(db, venueId, payload);

    const updated = await repo.getVenueByIdAdmin(db, venueId);
    if (!updated) {
        throw new NotFoundError('ไม่พบข้อมูลสถานที่หลังการอัปเดต');
    }

    const imageRows = await repo.getVenueImagesByVenueIdsAdmin(db, [venueId]);
    return toVenueAdminResponse(updated, imageRows.map(toVenueImageAdminResponse));
}

export async function deleteVenueAdmin(db: DB, venueId: number): Promise<void> {
    const existing = await repo.getVenueByIdAdmin(db, venueId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูลสถานที่นี้');
    }

    await repo.deleteVenueAdmin(db, venueId);
}

export async function reorderVenuesAdmin(db: DB, updates: { id: number; sortOrder: number }[]): Promise<void> {
    const normalized = updates.map((update) => {
        const sortOrder = Number(update.sortOrder);
        if (!Number.isFinite(sortOrder) || sortOrder < 0) {
            throw new BadRequestError('sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
        }

        return {
            id: Number(update.id),
            sortOrder: Math.trunc(sortOrder),
        };
    });

    await repo.updateVenuesOrderAdmin(db, normalized);
}

export async function createVenueImageAdmin(
    db: DB,
    venueId: number,
    data: {
        imageStorageKey: string;
        imageAltTh?: string | null | undefined;
        imageAltEn?: string | null | undefined;
        sortOrder?: number | undefined;
        isCover?: boolean | undefined;
        isEnabled?: boolean | undefined;
    }
): Promise<ContentVenueImageAdmin> {
    const venue = await repo.getVenueByIdAdmin(db, venueId);
    if (!venue) {
        throw new NotFoundError('ไม่พบข้อมูลสถานที่นี้');
    }

    const payload = normalizeVenueImagePayload(data, true);
    const existingImages = await repo.getVenueImagesByVenueIdsAdmin(db, [venueId]);
    const maxSortOrder = existingImages.reduce((max, row) => Math.max(max, Number(row.sort_order) || 0), -1);
    const sortOrder = payload.sortOrder ?? (maxSortOrder + 1);
    if (existingImages.some((row) => row.sort_order === sortOrder)) {
        throw new BadRequestError('sortOrder ซ้ำกับรูปเดิมในสถานที่นี้');
    }

    const imageId = await repo.createVenueImageAdmin(db, {
        venueId,
        imageStorageKey: payload.imageStorageKey!,
        imageAltTh: payload.imageAltTh ?? null,
        imageAltEn: payload.imageAltEn ?? null,
        sortOrder,
        isCover: payload.isCover ?? false,
        isEnabled: payload.isEnabled ?? true,
    });

    if (payload.isCover) {
        await repo.clearVenueImageCoverFlagsAdmin(db, venueId, imageId);
    }

    const created = await repo.getVenueImageByIdAdmin(db, imageId);
    if (!created) {
        throw new NotFoundError('ไม่พบข้อมูลรูปที่เพิ่งสร้าง');
    }

    return toVenueImageAdminResponse(created);
}

export async function updateVenueImageAdmin(
    db: DB,
    venueId: number,
    imageId: number,
    data: {
        imageStorageKey?: string | undefined;
        imageAltTh?: string | null | undefined;
        imageAltEn?: string | null | undefined;
        sortOrder?: number | undefined;
        isCover?: boolean | undefined;
        isEnabled?: boolean | undefined;
    }
): Promise<ContentVenueImageAdmin> {
    const venue = await repo.getVenueByIdAdmin(db, venueId);
    if (!venue) {
        throw new NotFoundError('ไม่พบข้อมูลสถานที่นี้');
    }

    const existingImage = await repo.getVenueImageByIdAdmin(db, imageId);
    if (!existingImage || existingImage.venue_id !== venueId) {
        throw new NotFoundError('ไม่พบรูปนี้ในสถานที่ที่เลือก');
    }

    const payload = normalizeVenueImagePayload(data, false);
    if (payload.sortOrder !== undefined) {
        const existingImages = await repo.getVenueImagesByVenueIdsAdmin(db, [venueId]);
        if (existingImages.some((row) => row.venue_image_id !== imageId && row.sort_order === payload.sortOrder)) {
            throw new BadRequestError('sortOrder ซ้ำกับรูปเดิมในสถานที่นี้');
        }
    }

    if (payload.isCover) {
        await repo.clearVenueImageCoverFlagsAdmin(db, venueId, imageId);
    }

    await repo.updateVenueImageAdmin(db, imageId, payload);

    const updated = await repo.getVenueImageByIdAdmin(db, imageId);
    if (!updated) {
        throw new NotFoundError('ไม่พบรูปหลังการอัปเดต');
    }

    return toVenueImageAdminResponse(updated);
}

export async function uploadVenueImageAdmin(
    db: DB,
    venueId: number,
    imageId: number,
    input: {
        stream: NodeJS.ReadableStream;
        originalName: string;
        mimeType: string;
        requestedFileName?: string | null;
    },
): Promise<ContentVenueImageAdmin> {
    const venue = await repo.getVenueByIdAdmin(db, venueId);
    if (!venue) {
        throw new NotFoundError('ไม่พบข้อมูลสถานที่นี้');
    }

    const image = await repo.getVenueImageByIdAdmin(db, imageId);
    if (!image || image.venue_id !== venueId) {
        throw new NotFoundError('ไม่พบรูปนี้ในสถานที่ที่เลือก');
    }

    const extFromMime = extensionFromMimeType(input.mimeType);
    if (!extFromMime) {
        throw new BadRequestError('รองรับเฉพาะ PNG/JPG/WEBP/SVG');
    }

    const preferredName = (input.requestedFileName || '').trim() || input.originalName;
    let safeFileName = sanitizeFileName(preferredName);
    if (!safeFileName || !path.posix.extname(safeFileName)) {
        safeFileName = `${sanitizeFileName(path.posix.parse(preferredName).name || 'venue-image')}${extFromMime}`;
    }

    const categoryFolder = String(venue.venue_category || 'venue').replace(/_/g, '-');
    const uploadDir = path.join(process.cwd(), 'public', 'content', 'venues', categoryFolder);
    await mkdir(uploadDir, { recursive: true });

    const diskPath = path.join(uploadDir, safeFileName);
    await pipeline(input.stream, createWriteStream(diskPath));

    const imageStorageKey = `/static/content/venues/${categoryFolder}/${safeFileName}`;
    await repo.updateVenueImageAdmin(db, imageId, { imageStorageKey });

    const updated = await repo.getVenueImageByIdAdmin(db, imageId);
    if (!updated) {
        throw new NotFoundError('ไม่พบรูปหลังอัปโหลด');
    }

    return toVenueImageAdminResponse(updated);
}

export async function deleteVenueImageAdmin(db: DB, venueId: number, imageId: number): Promise<void> {
    const venue = await repo.getVenueByIdAdmin(db, venueId);
    if (!venue) {
        throw new NotFoundError('ไม่พบข้อมูลสถานที่นี้');
    }

    const image = await repo.getVenueImageByIdAdmin(db, imageId);
    if (!image || image.venue_id !== venueId) {
        throw new NotFoundError('ไม่พบรูปนี้ในสถานที่ที่เลือก');
    }

    const imageStorageKey = image.image_storage_key;
    await repo.deleteVenueImageAdmin(db, imageId);

    if (!imageStorageKey) {
        return;
    }

    const remainingReferences = await repo.countVenueImagesByStorageKey(db, imageStorageKey);
    if (remainingReferences > 0) {
        return;
    }

    const diskPath = resolveVenueImageDiskPath(imageStorageKey);
    if (!diskPath) {
        return;
    }

    try {
        await unlink(diskPath);
    } catch (error: any) {
        if (error?.code === 'ENOENT') return;
        console.warn('[content] Failed to delete venue image file', {
            imageId,
            venueId,
            imageStorageKey,
            diskPath,
            error: error?.message || String(error),
        });
    }
}

export async function reorderVenueImagesAdmin(
    db: DB,
    venueId: number,
    updates: { id: number; sortOrder: number }[]
): Promise<void> {
    const venue = await repo.getVenueByIdAdmin(db, venueId);
    if (!venue) {
        throw new NotFoundError('ไม่พบข้อมูลสถานที่นี้');
    }

    const normalized = updates.map((update) => {
        const sortOrder = Number(update.sortOrder);
        if (!Number.isFinite(sortOrder) || sortOrder < 0) {
            throw new BadRequestError('sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
        }

        return {
            id: Number(update.id),
            sortOrder: Math.trunc(sortOrder),
        };
    });

    const uniqueSortOrder = new Set<number>();
    for (const item of normalized) {
        if (uniqueSortOrder.has(item.sortOrder)) {
            throw new BadRequestError('sortOrder ซ้ำกันไม่ได้ในคำขอเดียวกัน');
        }
        uniqueSortOrder.add(item.sortOrder);
    }

    const existingImages = await repo.getVenueImagesByVenueIdsAdmin(db, [venueId]);
    const imageIds = new Set(existingImages.map((row) => row.venue_image_id));
    for (const item of normalized) {
        if (!imageIds.has(item.id)) {
            throw new BadRequestError('มี image id ที่ไม่อยู่ในสถานที่นี้');
        }
    }

    const updatedIdSet = new Set(normalized.map((item) => item.id));
    const untouchedSortOrders = new Set(
        existingImages
            .filter((row) => !updatedIdSet.has(row.venue_image_id))
            .map((row) => row.sort_order)
    );
    for (const item of normalized) {
        if (untouchedSortOrders.has(item.sortOrder)) {
            throw new BadRequestError('sortOrder ซ้ำกับรูปที่ไม่ได้อยู่ในชุด reorder');
        }
    }

    await repo.updateVenueImagesOrderAdmin(db, venueId, normalized);
}

export async function getAllCarouselsAdmin(db: DB): Promise<ContentCarouselSlideAdmin[]> {
    const rows = await repo.getAllCarouselSlidesAdmin(db);
    return rows.map(toCarouselAdminResponse);
}

export async function createCarouselAdmin(
    db: DB,
    data: {
        titleTh?: string | null | undefined;
        titleEn?: string | null | undefined;
        descriptionTh?: string | null | undefined;
        descriptionEn?: string | null | undefined;
        imageStorageKey?: string | undefined;
        imageAltTh?: string | null | undefined;
        imageAltEn?: string | null | undefined;
        targetUrl?: string | null | undefined;
        openInNewTab?: boolean | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
        startAt?: string | null | undefined;
        endAt?: string | null | undefined;
    },
    createdByUserId: number,
): Promise<ContentCarouselSlideAdmin> {
    const payload = normalizeCarouselPayload(data, true);
    const startAt = payload.startAt ?? null;
    const endAt = payload.endAt ?? null;
    ensureStartEndValid(startAt, endAt);

    const slideId = await repo.createCarouselSlideAdmin(db, {
        titleTh: payload.titleTh ?? null,
        titleEn: payload.titleEn ?? null,
        descriptionTh: payload.descriptionTh ?? null,
        descriptionEn: payload.descriptionEn ?? null,
        imageStorageKey: payload.imageStorageKey!,
        imageAltTh: payload.imageAltTh ?? null,
        imageAltEn: payload.imageAltEn ?? null,
        targetUrl: payload.targetUrl ?? null,
        openInNewTab: payload.openInNewTab ?? true,
        sortOrder: payload.sortOrder ?? 0,
        isEnabled: payload.isEnabled ?? true,
        startAt,
        endAt,
        createdByUserId,
    });

    const created = await repo.getCarouselSlideByIdAdmin(db, slideId);
    if (!created) {
        throw new NotFoundError('ไม่พบข้อมูลสไลด์ที่เพิ่งสร้าง');
    }

    return toCarouselAdminResponse(created);
}

export async function updateCarouselAdmin(
    db: DB,
    slideId: number,
    data: {
        titleTh?: string | null | undefined;
        titleEn?: string | null | undefined;
        descriptionTh?: string | null | undefined;
        descriptionEn?: string | null | undefined;
        imageStorageKey?: string | undefined;
        imageAltTh?: string | null | undefined;
        imageAltEn?: string | null | undefined;
        targetUrl?: string | null | undefined;
        openInNewTab?: boolean | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
        startAt?: string | null | undefined;
        endAt?: string | null | undefined;
    },
): Promise<ContentCarouselSlideAdmin> {
    const existing = await repo.getCarouselSlideByIdAdmin(db, slideId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูล carousel slide นี้');
    }

    const payload = normalizeCarouselPayload(data, false);
    const effectiveStart = payload.startAt !== undefined ? payload.startAt : existing.start_at;
    const effectiveEnd = payload.endAt !== undefined ? payload.endAt : existing.end_at;
    ensureStartEndValid(effectiveStart, effectiveEnd);

    await repo.updateCarouselSlideAdmin(db, slideId, payload);

    const updated = await repo.getCarouselSlideByIdAdmin(db, slideId);
    if (!updated) {
        throw new NotFoundError('ไม่พบข้อมูล carousel slide หลังการอัปเดต');
    }

    return toCarouselAdminResponse(updated);
}

export async function deleteCarouselAdmin(db: DB, slideId: number): Promise<void> {
    const existing = await repo.getCarouselSlideByIdAdmin(db, slideId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูล carousel slide นี้');
    }

    await repo.deleteCarouselSlideAdmin(db, slideId);
}

export async function reorderCarouselsAdmin(db: DB, updates: { id: number; sortOrder: number }[]): Promise<void> {
    const normalized = updates.map((update) => {
        const sortOrder = Number(update.sortOrder);
        if (!Number.isFinite(sortOrder) || sortOrder < 0) {
            throw new BadRequestError('sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
        }
        return {
            id: Number(update.id),
            sortOrder: Math.trunc(sortOrder),
        };
    });

    await repo.updateCarouselSlidesOrderAdmin(db, normalized);
}

export async function uploadCarouselImageAdmin(
    db: DB,
    slideId: number,
    input: {
        stream: NodeJS.ReadableStream;
        originalName: string;
        mimeType: string;
        requestedFileName?: string | null;
    },
): Promise<ContentCarouselSlideAdmin> {
    const slide = await repo.getCarouselSlideByIdAdmin(db, slideId);
    if (!slide) {
        throw new NotFoundError('ไม่พบข้อมูล carousel slide นี้');
    }

    const extFromMime = extensionFromMimeType(input.mimeType);
    if (!extFromMime) {
        throw new BadRequestError('รองรับเฉพาะ PNG/JPG/WEBP/SVG');
    }

    const preferredName = (input.requestedFileName || '').trim() || input.originalName;
    let safeFileName = sanitizeFileName(preferredName);
    if (!safeFileName || !path.posix.extname(safeFileName)) {
        safeFileName = `${sanitizeFileName(path.posix.parse(preferredName).name || 'carousel-slide')}${extFromMime}`;
    }

    const uploadDir = path.join(process.cwd(), 'public', 'content', 'carousels');
    await mkdir(uploadDir, { recursive: true });

    const diskPath = path.join(uploadDir, safeFileName);
    await pipeline(input.stream, createWriteStream(diskPath));

    const imageStorageKey = `/static/content/carousels/${safeFileName}`;
    await repo.updateCarouselSlideAdmin(db, slideId, { imageStorageKey });

    const updated = await repo.getCarouselSlideByIdAdmin(db, slideId);
    if (!updated) {
        throw new NotFoundError('ไม่พบข้อมูล carousel slide หลังอัปโหลดรูป');
    }

    return toCarouselAdminResponse(updated);
}

export async function getAllContactsAdmin(db: DB): Promise<ContentContactAdmin[]> {
    const contacts = await repo.getAllContactsAdmin(db);
    const channels = await repo.getChannelsByContactIdsAdmin(db, contacts.map((contact) => contact.contact_id));

    const channelsByContact = new Map<number, ContentContactChannelAdmin[]>();
    for (const row of channels) {
        const list = channelsByContact.get(row.contact_id) ?? [];
        list.push(toContactChannelAdminResponse(row));
        channelsByContact.set(row.contact_id, list);
    }

    return contacts.map((contact) =>
        toContactAdminResponse(contact, channelsByContact.get(contact.contact_id) ?? [])
    );
}

export async function createContactAdmin(
    db: DB,
    data: {
        contactCategory?: string | undefined;
        displayNameTh: string;
        displayNameEn: string;
        roleTh?: string | null | undefined;
        roleEn?: string | null | undefined;
        organizationTh?: string | null | undefined;
        organizationEn?: string | null | undefined;
        departmentTh?: string | null | undefined;
        departmentEn?: string | null | undefined;
        bioTh?: string | null | undefined;
        bioEn?: string | null | undefined;
        avatarUrl?: string | null | undefined;
        avatarAltTh?: string | null | undefined;
        avatarAltEn?: string | null | undefined;
        isFeatured?: boolean | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
        publishedAt?: string | null | undefined;
    }
): Promise<ContentContactAdmin> {
    const payload = normalizeContactPayload(data, true);
    const contactId = await repo.createContactAdmin(db, {
        contactCategory: payload.contactCategory ?? 'event_inquiry',
        displayNameTh: payload.displayNameTh!,
        displayNameEn: payload.displayNameEn!,
        roleTh: payload.roleTh ?? null,
        roleEn: payload.roleEn ?? null,
        organizationTh: payload.organizationTh ?? null,
        organizationEn: payload.organizationEn ?? null,
        departmentTh: payload.departmentTh ?? null,
        departmentEn: payload.departmentEn ?? null,
        bioTh: payload.bioTh ?? null,
        bioEn: payload.bioEn ?? null,
        avatarUrl: payload.avatarUrl ?? null,
        avatarAltTh: payload.avatarAltTh ?? null,
        avatarAltEn: payload.avatarAltEn ?? null,
        isFeatured: payload.isFeatured ?? false,
        sortOrder: payload.sortOrder ?? 0,
        isEnabled: payload.isEnabled ?? true,
        publishedAt: payload.publishedAt ?? null,
    });

    const created = await repo.getContactByIdAdmin(db, contactId);
    if (!created) {
        throw new NotFoundError('ไม่พบข้อมูล contact ที่เพิ่งสร้าง');
    }

    return toContactAdminResponse(created, []);
}

export async function updateContactAdmin(
    db: DB,
    contactId: number,
    data: {
        contactCategory?: string | undefined;
        displayNameTh?: string | undefined;
        displayNameEn?: string | undefined;
        roleTh?: string | null;
        roleEn?: string | null;
        organizationTh?: string | null;
        organizationEn?: string | null;
        departmentTh?: string | null;
        departmentEn?: string | null;
        bioTh?: string | null;
        bioEn?: string | null;
        avatarUrl?: string | null;
        avatarAltTh?: string | null;
        avatarAltEn?: string | null;
        isFeatured?: boolean;
        sortOrder?: number;
        isEnabled?: boolean;
        publishedAt?: string | null;
    }
): Promise<ContentContactAdmin> {
    const existing = await repo.getContactByIdAdmin(db, contactId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูล contact นี้');
    }

    const payload = normalizeContactPayload(data, false);
    await repo.updateContactAdmin(db, contactId, payload);

    const updated = await repo.getContactByIdAdmin(db, contactId);
    if (!updated) {
        throw new NotFoundError('ไม่พบข้อมูล contact ที่อัปเดตแล้ว');
    }
    const channels = await repo.getChannelsByContactIdsAdmin(db, [contactId]);
    return toContactAdminResponse(updated, channels.map(toContactChannelAdminResponse));
}

export async function deleteContactAdmin(db: DB, contactId: number): Promise<void> {
    const existing = await repo.getContactByIdAdmin(db, contactId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูล contact นี้');
    }

    await repo.softDeleteContactAdmin(db, contactId);
}

export async function reorderContactsAdmin(db: DB, updates: { id: number; sortOrder: number }[]): Promise<void> {
    const normalized = updates.map((update) => {
        const sortOrder = Number(update.sortOrder);
        if (!Number.isFinite(sortOrder) || sortOrder < 0) {
            throw new BadRequestError('sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
        }
        return {
            id: Number(update.id),
            sortOrder: Math.trunc(sortOrder),
        };
    });

    await repo.updateContactsOrderAdmin(db, normalized);
}

export async function createContactChannelAdmin(
    db: DB,
    contactId: number,
    data: {
        channelType: string;
        labelTh?: string | null | undefined;
        labelEn?: string | null | undefined;
        value: string;
        url?: string | null | undefined;
        isPrimary?: boolean | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
    }
): Promise<ContentContactChannelAdmin> {
    const contact = await repo.getContactByIdAdmin(db, contactId);
    if (!contact) {
        throw new NotFoundError('ไม่พบข้อมูล contact นี้');
    }

    const payload = normalizeContactChannelPayload(data, true);
    const channelId = await repo.createContactChannelAdmin(db, {
        contactId,
        channelType: payload.channelType!,
        labelTh: payload.labelTh ?? null,
        labelEn: payload.labelEn ?? null,
        value: payload.value!,
        url: payload.url ?? null,
        isPrimary: payload.isPrimary ?? false,
        sortOrder: payload.sortOrder ?? 0,
        isEnabled: payload.isEnabled ?? true,
    });

    const created = await repo.getContactChannelByIdAdmin(db, channelId);
    if (!created) {
        throw new NotFoundError('ไม่พบข้อมูลช่องทางที่เพิ่งสร้าง');
    }
    return toContactChannelAdminResponse(created);
}

export async function updateContactChannelAdmin(
    db: DB,
    contactId: number,
    channelId: number,
    data: {
        channelType?: string | undefined;
        labelTh?: string | null | undefined;
        labelEn?: string | null | undefined;
        value?: string | undefined;
        url?: string | null | undefined;
        isPrimary?: boolean | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
    }
): Promise<ContentContactChannelAdmin> {
    const contact = await repo.getContactByIdAdmin(db, contactId);
    if (!contact) {
        throw new NotFoundError('ไม่พบข้อมูล contact นี้');
    }

    const existingChannel = await repo.getContactChannelByIdAdmin(db, channelId);
    if (!existingChannel || existingChannel.contact_id !== contactId) {
        throw new NotFoundError('ไม่พบช่องทางการติดต่อนี้ใน contact ที่เลือก');
    }

    const payload = normalizeContactChannelPayload(data, false);
    await repo.updateContactChannelAdmin(db, channelId, payload);

    const updated = await repo.getContactChannelByIdAdmin(db, channelId);
    if (!updated) {
        throw new NotFoundError('ไม่พบข้อมูลช่องทางหลังการอัปเดต');
    }
    return toContactChannelAdminResponse(updated);
}

export async function deleteContactChannelAdmin(db: DB, contactId: number, channelId: number): Promise<void> {
    const contact = await repo.getContactByIdAdmin(db, contactId);
    if (!contact) {
        throw new NotFoundError('ไม่พบข้อมูล contact นี้');
    }

    const existingChannel = await repo.getContactChannelByIdAdmin(db, channelId);
    if (!existingChannel || existingChannel.contact_id !== contactId) {
        throw new NotFoundError('ไม่พบช่องทางการติดต่อนี้ใน contact ที่เลือก');
    }

    await repo.deleteContactChannelAdmin(db, channelId);
}

export async function reorderContactChannelsAdmin(
    db: DB,
    contactId: number,
    updates: { id: number; sortOrder: number }[]
): Promise<void> {
    const contact = await repo.getContactByIdAdmin(db, contactId);
    if (!contact) {
        throw new NotFoundError('ไม่พบข้อมูล contact นี้');
    }

    const normalized = updates.map((update) => {
        const sortOrder = Number(update.sortOrder);
        if (!Number.isFinite(sortOrder) || sortOrder < 0) {
            throw new BadRequestError('sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
        }
        return {
            id: Number(update.id),
            sortOrder: Math.trunc(sortOrder),
        };
    });

    await repo.updateContactChannelsOrderAdmin(db, contactId, normalized);
}

export async function getPublishedPageByCode(db: DB, pageCode: string): Promise<ContentPage> {
    const page = await repo.getPublishedPageByCode(db, pageCode);
    if (!page) {
        throw new NotFoundError('ไม่พบข้อมูลหน้าที่ร้องขอ');
    }

    return {
        id: page.page_id,
        code: page.page_code,
        titleTh: page.title_th,
        titleEn: page.title_en,
        contentHtmlTh: page.content_html_th,
        contentHtmlEn: page.content_html_en,
    };
}

export async function getPageByCodeAdmin(db: DB, pageCode: string): Promise<ContentPageAdmin> {
    const page = await repo.getPageByCodeAdmin(db, pageCode);
    if (!page) {
        throw new NotFoundError('ไม่พบข้อมูลหน้าที่ร้องขอ');
    }

    return {
        id: page.page_id,
        code: page.page_code,
        titleTh: page.title_th,
        titleEn: page.title_en,
        contentHtmlTh: page.content_html_th,
        contentHtmlEn: page.content_html_en,
        isPublished: page.is_published === 1,
        publishedAt: page.published_at,
    };
}

export async function updatePageByCodeAdmin(
    db: DB,
    pageCode: string,
    data: {
        titleTh?: string;
        titleEn?: string;
        contentHtmlTh?: string | null;
        contentHtmlEn?: string | null;
        isPublished?: boolean;
    }
): Promise<ContentPageAdmin> {
    const existing = await repo.getPageByCodeAdmin(db, pageCode);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูลหน้าที่ร้องขอ');
    }

    const updatePayload: {
        titleTh?: string;
        titleEn?: string;
        contentHtmlTh?: string | null;
        contentHtmlEn?: string | null;
        isPublished?: boolean;
    } = {};

    if (data.titleTh !== undefined) updatePayload.titleTh = data.titleTh;
    if (data.titleEn !== undefined) updatePayload.titleEn = data.titleEn;
    if (data.contentHtmlTh !== undefined) updatePayload.contentHtmlTh = data.contentHtmlTh;
    if (data.contentHtmlEn !== undefined) updatePayload.contentHtmlEn = data.contentHtmlEn;
    if (data.isPublished !== undefined) updatePayload.isPublished = data.isPublished;

    await repo.updatePageByCodeAdmin(db, pageCode, updatePayload);

    const updated = await repo.getPageByCodeAdmin(db, pageCode);
    if (!updated) {
        throw new NotFoundError('ไม่พบข้อมูลหน้าหลังการอัปเดต');
    }

    return {
        id: updated.page_id,
        code: updated.page_code,
        titleTh: updated.title_th,
        titleEn: updated.title_en,
        contentHtmlTh: updated.content_html_th,
        contentHtmlEn: updated.content_html_en,
        isPublished: updated.is_published === 1,
        publishedAt: updated.published_at,
    };
}

export async function getContacts(db: DB): Promise<ContentContact[]> {
    const [contacts, channels] = await Promise.all([
        repo.getEnabledContacts(db),
        repo.getEnabledContactChannels(db),
    ]);

    const channelsByContact = new Map<number, ContentContact['channels']>();

    for (const channel of channels) {
        const list = channelsByContact.get(channel.contact_id) ?? [];
        list.push({
            id: channel.channel_id,
            type: channel.channel_type,
            labelTh: channel.label_th,
            labelEn: channel.label_en,
            value: channel.value,
            url: channel.url,
            isPrimary: channel.is_primary === 1,
            sortOrder: channel.sort_order,
        });
        channelsByContact.set(channel.contact_id, list);
    }

    return contacts.map((contact) => ({
        id: contact.contact_id,
        contactCategory: normalizeContactCategory(contact.contact_category, 'fallback'),
        displayNameTh: contact.display_name_th,
        displayNameEn: contact.display_name_en,
        roleTh: contact.role_th,
        roleEn: contact.role_en,
        organizationTh: contact.organization_th,
        organizationEn: contact.organization_en,
        departmentTh: contact.department_th,
        departmentEn: contact.department_en,
        bioTh: contact.bio_th,
        bioEn: contact.bio_en,
        avatarUrl: contact.avatar_url,
        avatarAltTh: contact.avatar_alt_th,
        avatarAltEn: contact.avatar_alt_en,
        isFeatured: contact.is_featured === 1,
        sortOrder: contact.sort_order,
        channels: channelsByContact.get(contact.contact_id) ?? [],
    }));
}

export async function getDatasets(db: DB): Promise<ContentDataset[]> {
    const rows = await repo.getEnabledDatasets(db);

    return rows.map((row) => ({
        id: row.dataset_id,
        datasetName: row.dataset_name,
        owner: row.owner_name,
        attributeNumber: row.attribute_number,
        link: row.dataset_link,
        domain: row.domain_code,
        recordCount: row.record_count === null ? null : Number(row.record_count),
    }));
}

export async function getVenues(db: DB, categoryInput?: string): Promise<ContentVenue[]> {
    const category = normalizeVenueCategory(categoryInput);

    const venues = await repo.getEnabledVenues(db, category);
    const imageRows = await repo.getEnabledVenueImagesByVenueIds(
        db,
        venues.map((venue) => venue.venue_id),
    );

    const imagesByVenue = new Map<number, ContentVenue['images']>();
    for (const imageRow of imageRows) {
        const normalizedImage = {
            id: imageRow.venue_image_id,
            imageStorageKey: imageRow.image_storage_key,
            imageUrl: imageRow.image_storage_key,
            altTh: imageRow.image_alt_th,
            altEn: imageRow.image_alt_en,
            sortOrder: imageRow.sort_order,
            isCover: imageRow.is_cover === 1,
        };

        const list = imagesByVenue.get(imageRow.venue_id);
        if (list) {
            list.push(normalizedImage);
            continue;
        }

        imagesByVenue.set(imageRow.venue_id, [normalizedImage]);
    }

    return venues.map((venue) => ({
        id: venue.venue_id,
        category: venue.venue_category,
        nameTh: venue.venue_name_th,
        nameEn: venue.venue_name_en,
        descriptionTh: venue.description_th,
        descriptionEn: venue.description_en,
        googleMapsUrl: venue.google_maps_url,
        latitude: venue.latitude === null ? null : Number(venue.latitude),
        longitude: venue.longitude === null ? null : Number(venue.longitude),
        sortOrder: venue.sort_order,
        images: imagesByVenue.get(venue.venue_id) ?? [],
    }));
}
