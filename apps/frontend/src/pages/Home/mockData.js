/*
 * Mock data for Game Theme System
 * Includes Users, Teams, and sample content for the lobby.
 */

export const MOCK_USERS = [
    { email: 'user@game.com', password: 'password', name: 'User Demo', role: 'user', hasTeam: false, avatar: 'U', color: '#6366f1' },
    { email: 'leader@game.com', password: 'password', name: 'Leader A', role: 'leader', hasTeam: true, teamId: 'TM001', avatar: 'L', color: '#ef4444' },
    { email: 'member@game.com', password: 'password', name: 'Member A', role: 'member', hasTeam: true, teamId: 'TM001', avatar: 'M', color: '#3b82f6' },
];

export const MOCK_TEAMS = {
    TM001: {
        code: 'TM001',
        name: 'Team Alpha',
        status: 'submitted',
        members: [
            { id: 1, name: 'Leader A', role: 'Leader', verified: true, color: '#ef4444', leader: true },
            { id: 2, name: 'Member A', role: 'Developer', verified: true, color: '#3b82f6', leader: false },
            { id: 3, name: 'Member B', role: 'Designer', verified: false, color: '#14b8a6', leader: false },
        ],
        announcements: [],
        works: [],
        verification: {},
    },
};

export const TEAM_STATUS_CONFIG = {
    forming: { label: 'กำลังก่อตั้งทีม', color: 'bg-cyan-100 text-cyan-800' },
    submitted: { label: 'ส่งตรวจแล้ว', color: 'bg-amber-100 text-amber-800' },
    passed: { label: 'ผ่านการคัดเลือก', color: 'bg-green-100 text-green-800' },
    failed: { label: 'ไม่ผ่านการคัดเลือก', color: 'bg-red-100 text-red-800' },
    disbanded: { label: 'ยุบทีม', color: 'bg-zinc-100 text-zinc-800' },
    qualified: { label: 'ผ่านเข้ารอบ', color: 'bg-purple-100 text-purple-800 border-purple-200' },
};
