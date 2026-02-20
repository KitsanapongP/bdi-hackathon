import { z } from 'zod';

export const acceptConsentSchema = z.object({
    consentDocId: z.number({ message: 'กรุณาระบุ consentDocId' }).int().positive(),
});
