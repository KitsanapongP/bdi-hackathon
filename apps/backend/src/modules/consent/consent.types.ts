/** Row from user_consent_documents */
export interface ConsentDocRow {
    consent_doc_id: number;
    doc_code: string;
    version: string;
    title_th: string;
    title_en: string;
    content_th: string | null;
    content_en: string | null;
    is_active: number;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

/** Row from user_consents */
export interface UserConsentRow {
    user_consent_id: number;
    user_id: number;
    consent_doc_id: number;
    accepted_at: string;
    accept_source: string | null;
    accept_ip: string | null;
    user_agent: string | null;
    created_at: string;
}

/** Safe consent document for API response */
export interface ConsentDocSafe {
    consentDocId: number;
    docCode: string;
    version: string;
    titleTh: string;
    titleEn: string;
    contentTh: string | null;
    contentEn: string | null;
    publishedAt: string | null;
}

/** User consent status for API response */
export interface UserConsentSafe {
    consentDocId: number;
    docCode: string;
    version: string;
    titleTh: string;
    titleEn: string;
    accepted: boolean;
    acceptedAt: string | null;
}
