import { splitMessageBlocks } from './richMessage'

// render **ตัวหนา** และลิงก์ http(s) แบบเดียวกับที่ผู้รับเห็น (ใช้ในพรีวิว)
export function renderPreviewInline(text, keyPrefix) {
  return String(text || '').split(/(\*\*[^*\n]+\*\*|https?:\/\/[^\s]+)/g).map((part, index) => {
    if (/^\*\*[^*\n]+\*\*$/.test(part)) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>
    }
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      return <a key={`${keyPrefix}-${index}`} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
    }
    return part
  })
}

// แปลงข้อความเป็น React node เหมือนที่ฝั่งผู้รับแสดง (ตาราง Tab-separated + ตัวหนา + ลิงก์)
export function renderAnnouncementPreview(message) {
  if (!String(message || '').trim()) return null
  return splitMessageBlocks(message).map((block, blockIndex) => {
    if (block.type === 'table') {
      return (
        <table key={`table-${blockIndex}`} style={{ borderCollapse: 'collapse', margin: '8px 0', width: '100%' }}>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} style={{ border: '1px solid color-mix(in srgb, var(--gt-text-muted, #64748b) 55%, transparent)', padding: '6px 10px' }}>
                    {renderPreviewInline(cell, `${blockIndex}-${rowIndex}-${cellIndex}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    return (
      <div key={`text-${blockIndex}`} style={{ whiteSpace: 'pre-line' }}>
        {renderPreviewInline(block.content, `text-${blockIndex}`)}
      </div>
    )
  })
}

// เตือนเมื่อแถวในตารางมีจำนวนคอลัมน์ไม่เท่ากัน (มักเกิดจากก็อปไม่ครบคอลัมน์)
export function getTablePreviewWarnings(message) {
  const warnings = []
  splitMessageBlocks(message).forEach((block, index) => {
    if (block.type !== 'table') return
    const counts = block.rows.map((row) => row.length)
    const maxColumns = Math.max(...counts)
    if (counts.some((count) => count !== maxColumns)) {
      warnings.push(`ตารางที่ ${index + 1}: บางแถวมีจำนวนช่องไม่เท่ากัน (${counts.join(', ')} ช่อง) — ตรวจสอบว่าก็อปครบทุกคอลัมน์`)
    }
  })
  return warnings
}
