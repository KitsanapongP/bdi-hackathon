// แยกข้อความประกาศเป็น block ๆ: ข้อความปกติ กับตารางที่วางมาจาก Excel
// (แต่ละเซลล์คั่นด้วย Tab) เพื่อให้แต่ละหน้านำไป render เป็น React node เอง
// (ยังคงใช้ inline renderer ของแต่ละหน้า เพื่อคง behavior ของ **ตัวหนา**/ลิงก์เดิมไว้)
export function splitMessageBlocks(text) {
    const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
    const blocks = []
    let index = 0

    while (index < lines.length) {
        if (lines[index].includes('\t')) {
            const tableLines = []
            while (index < lines.length && lines[index].includes('\t')) {
                tableLines.push(lines[index])
                index += 1
            }
            blocks.push({ type: 'table', rows: tableLines.map((row) => row.split('\t').map((cell) => cell.trim())) })
        } else {
            const textLines = []
            while (index < lines.length && !lines[index].includes('\t')) {
                textLines.push(lines[index])
                index += 1
            }
            blocks.push({ type: 'text', content: textLines.join('\n') })
        }
    }

    return blocks
}
