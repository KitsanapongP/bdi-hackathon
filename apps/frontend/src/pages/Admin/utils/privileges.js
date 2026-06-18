export const PRIVILEGE_TYPE_OPTIONS = [
  {
    value: 'souvenir_qr',
    label: 'ของที่ระลึก (QR)',
    hint: 'ผู้เข้าร่วมแสดง QR เพื่อให้สแกนรับของหน้างาน',
  },
  {
    value: 'auto_admin',
    label: 'อัตโนมัติ (แอดมิน)',
    hint: 'สิทธิ์ที่แอดมินกำหนด/ปรับสถานะให้เอง ไม่ต้องสแกน',
  },
]

const CLAIM_METHOD_LABELS = {
  qr_scan: 'สแกน QR',
  admin_manual: 'แอดมินปรับเอง',
  team_bulk: 'อัปเดตทั้งทีม',
}

export function privilegeTypeLabel(value) {
  return PRIVILEGE_TYPE_OPTIONS.find((item) => item.value === value)?.label || value
}

export function claimMethodLabel(value) {
  if (!value) return '—'
  return CLAIM_METHOD_LABELS[value] || value
}
