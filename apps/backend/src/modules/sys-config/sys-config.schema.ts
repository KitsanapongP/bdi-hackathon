import { z } from 'zod';

export const updateConfigSchema = z.object({
    configValue: z.string().min(1, 'กรุณากรอกค่า config'),
});
