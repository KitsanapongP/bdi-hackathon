/* 
 * Mock data for Game Theme System
 * Includes Users, Teams, and sample content for the lobby.
 */

export const MOCK_USERS = [
    { email: 'user@game.com', password: 'password', name: 'สมชาย นักล่ารางวัล', role: 'user', hasTeam: false, avatar: 'SC', color: '#6366f1' },
    { email: 'leader@game.com', password: 'password', name: 'หัวหน้าทีม A', role: 'leader', hasTeam: true, teamId: 'TM001', avatar: 'L', color: '#ef4444' },
    { email: 'member@game.com', password: 'password', name: 'สมาชิกทีม A', role: 'member', hasTeam: true, teamId: 'TM001', avatar: 'M', color: '#3b82f6' },
];

export const MOCK_TEAMS = {
    'TM001': {
        code: 'TM001',
        name: 'Team Alpha',
        status: 'pending', // pending, approved, rejected, qualified
        members: [
            { id: 1, name: 'หัวหน้าทีม A', role: 'Leader', verified: true, color: '#ef4444', leader: true },
            { id: 2, name: 'สมาชิกทีม A', role: 'Developer', verified: true, color: '#3b82f6', leader: false },
            { id: 3, name: 'กิตติ ดีไซน์', role: 'Designer', verified: false, color: '#14b8a6', leader: false },
        ],
        announcements: [
            { date: '19 ก.พ. 2025', title: 'ยินดีต้อนรับทุกท่าน!', body: 'ขอให้ทุกทีมเตรียมตัวให้พร้อม ตรวจสอบเอกสารให้ครบถ้วนก่อนส่ง' },
            { date: '18 ก.พ. 2025', title: 'อัปเดตกฎกติกา', body: 'สมาชิกทุกคนต้องยืนยันตัวตนด้วยบัตรนักศึกษาก่อนกำหนดส่ง 25 ก.พ.' },
        ],
        works: [], // Array of submission objects
        verification: {
            'user@game.com': null,
            'leader@game.com': { studentCard: 'approved', cert: 'pending' },
            'member@game.com': { studentCard: 'approved' },
        }
    }
};

export const TEAM_STATUS_CONFIG = {
    pending: { label: 'รอพิจารณา', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'ผ่านการพิจารณา', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'ไม่ผ่าน', color: 'bg-red-100 text-red-800' },
    qualified: { label: 'เข้ารอบ 10 ทีมสุดท้าย', color: 'bg-purple-100 text-purple-800 border-purple-200' },
};
