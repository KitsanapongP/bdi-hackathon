import { BadRequestError } from './errors.js';

/**
 * แปลง datetime string ที่เป็น "wall-clock" (เวลาไทยที่ผู้ใช้กรอกจาก datetime-local)
 * ให้อยู่ในรูปแบบ 'YYYY-MM-DD HH:mm:ss' สำหรับเก็บลงคอลัมน์ DATETIME โดย "คงเลขเวลาเดิมไว้"
 *
 * จุดสำคัญ: ใช้ local getters (getHours/getMonth/...) ฟอร์แมตเอง ไม่เรียก Date.toISOString()
 * เพราะ toISOString() จะ shift ค่าเป็น UTC ตาม timezone ของ server ทำให้ค่าใน DB เพี้ยน
 * (แต่ตอนแสดงผลกลับถูกเพราะ frontend บวก offset คืน — เลยมองไม่เห็นว่าใน DB เพี้ยน)
 *
 * รองรับ input รูปแบบ datetime-local ('YYYY-MM-DDTHH:mm') และรูปแบบอื่นที่ Date parse ได้
 */
export function normalizeWallClockToDb(rawValue: string, fieldName?: string): string {
    const raw = String(rawValue || '').trim();
    let date: Date;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
        date = new Date(`${raw}:00`);
    } else {
        date = new Date(raw);
    }
    if (Number.isNaN(date.getTime())) {
        throw new BadRequestError(fieldName ? `รูปแบบ ${fieldName} ไม่ถูกต้อง` : 'รูปแบบวันเวลาไม่ถูกต้อง');
    }

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}
