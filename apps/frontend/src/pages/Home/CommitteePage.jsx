import React from 'react';
import { ClipboardCheck, Users, Award } from 'lucide-react';
import HomeShell from './HomeShell';
import './InfoPages.css';

const committeeGroups = [
    {
        id: 'selection',
        title: 'คณะกรรมการคัดเลือก',
        icon: ClipboardCheck,
        members: [
            { name: 'ดร.ปริสุทธิ์ จิตต์ภักดี', affiliation: 'ผู้เชี่ยวชาญการศึกษาด้านนวัตกรรมข้อมูล (BDI)' },
            { name: 'ดร.ขวัญศิริ ศิริมังคลา', affiliation: 'นักการศึกษาด้านนวัตกรรมข้อมูลอาวุโส (BDI)' },
            { name: 'ดร.อังคณา พรหมราช', affiliation: 'นักการศึกษาด้านนวัตกรรมข้อมูลอาวุโส (BDI)' },
            { name: 'นาย ธารภณ นิธิจิรมน', affiliation: 'นักการศึกษาด้านนวัตกรรมข้อมูลอาวุโส (BDI)' },
            { name: 'รศ. นพ.อนุพล พาณิชย์โชติ', affiliation: 'คณะแพทยศาสตร์ มหาวิทยาลัยขอนแก่น' },
            { name: 'นพ. อนวัช รัชธร', affiliation: 'คณะแพทยศาสตร์ มหาวิทยาลัยขอนแก่น' },
            { name: 'ผศ.ดร. จุฑารพ เพชระบูรณิน', affiliation: 'สถาบันฟีโนมแห่งชาติ มหาวิทยาลัยขอนแก่น' },
            { name: 'ดร.กรวิชญ์ โอภาสเสถียร', affiliation: 'สถาบันฟีโนมแห่งชาติ มหาวิทยาลัยขอนแก่น' },
            { name: 'อ.ดร.ศุภโชค สอนศิลพงศ์', affiliation: 'คณะแพทยศาสตร์ มหาวิทยาลัยขอนแก่น' },
            { name: 'ดร.ภัคราช มุสิกะวัน', affiliation: 'วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น' },
            { name: 'ดร.พงษ์ศธร จันทร์ยอย', affiliation: 'วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น' },
            { name: 'ดร.วันเฉลิม นัดดา', affiliation: 'วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น' },
            { name: 'ผศ. ดร.กฤติเดช จันทวารา', affiliation: 'คณะวิทยาศาสตร์ มหาวิทยาลัยราชภัฏอุบลราชธานี' },
            { name: 'อ. ดร.สุไพลิน พิชัย', affiliation: 'คณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยราชภัฏเลย' },
            { name: 'ผศ.ดร.กฤษดา ประชุมราศี', affiliation: 'วิทยาลัยการปกครองท้องถิ่น มหาวิทยาลัยขอนแก่น' },
            { name: 'ผศ.ดร.สุรพล วรภัทราทร', affiliation: 'ศูนย์วิจัยปัญญาประดิษฐ์และเทคโนโลยีก่อกำเนิด สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ มหาวิทยาลัยแม่ฟ้าหลวง' },
            { name: 'คุณวรฉัตร เนื่องจำนงค์', affiliation: 'Innovation Manager สังกัด Stellar by Krungsri' },
            { name: 'คุณธนวัฒน์ อภิวัฒโนดม', affiliation: 'Innovation Manager สังกัด Stellar by Krungsri' },
            { name: 'คุณภูริพรรธน์ เลิศปัญญาโรจน์', affiliation: 'Innovation Manager สังกัด Stellar by Krungsri' },
            { name: 'คุณวรเมธ ตระกูลคูศรี', affiliation: 'Innovation Manager สังกัด Stellar by Krungsri' },
            { name: 'คุณสุปราณี เจริญเลิศจรรยา', affiliation: 'Innovation Culture Team Lead สังกัด Stellar by Krungsri' },
        ],
    },
    {
        id: 'mentor',
        title: 'พี่เลี้ยง (Mentor)',
        icon: Users,
        members: [
            { name: 'นพ. อนวัช รัชธร', affiliation: 'คณะแพทยศาสตร์ มหาวิทยาลัยขอนแก่น' },
            { name: 'ดร.กรวิชญ์ โอภาสเสถียร', affiliation: 'สถาบันฟีโนมแห่งชาติ มหาวิทยาลัยขอนแก่น' },
            { name: 'อ.ดร.ศุภโชค สอนศิลพงศ์', affiliation: 'คณะแพทยศาสตร์ มหาวิทยาลัยขอนแก่น' },
            { name: 'ดร.ภัคราช มุสิกะวัน', affiliation: 'วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น' },
            { name: 'ดร.พงษ์ศธร จันทร์ยอย', affiliation: 'วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น' },
            { name: 'ดร.วันเฉลิม นัดดา', affiliation: 'วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น' },
            { name: 'อ. ดร.สุไพลิน พิชัย', affiliation: 'คณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยราชภัฏเลย' },
            { name: 'ผศ.ดร.กฤษดา ประชุมราศี', affiliation: 'วิทยาลัยการปกครองท้องถิ่น มหาวิทยาลัยขอนแก่น' },
            { name: 'คุณวรฉัตร เนื่องจำนงค์', affiliation: 'Innovation Manager สังกัด Stellar by Krungsri' },
            { name: 'คุณธนวัฒน์ อภิวัฒโนดม', affiliation: 'Innovation Manager สังกัด Stellar by Krungsri' },
            { name: 'คุณภูริพรรธน์ เลิศปัญญาโรจน์', affiliation: 'Innovation Manager สังกัด Stellar by Krungsri' },
            { name: 'คุณวรเมธ ตระกูลคูศรี', affiliation: 'Innovation Manager สังกัด Stellar by Krungsri' },
            { name: 'คุณสุปราณี เจริญเลิศจรรยา', affiliation: 'Innovation Culture Team Lead สังกัด Stellar by Krungsri' },
            { name: 'อาจารย์นนทวรรษ ธงสิบสอง', affiliation: 'ศูนย์วิจัยปัญญาประดิษฐ์และเทคโนโลยีก่อกำเนิด สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ มหาวิทยาลัยแม่ฟ้าหลวง' },
        ],
    },
    {
        id: 'final',
        title: 'กรรมการรอบตัดสิน',
        icon: Award,
        members: [
            { name: 'ดร.ชาญวิทย์ บุญช่วย', affiliation: 'นายกสมาคมผู้ประกอบการปัญญาประดิษฐ์ประเทศไทย (AIEAT) และประธานเจ้าหน้าที่บริหารบริษัทไซแนปส์ (ประเทศไทย) จำกัด' },
            { name: 'ผศ.ดร.สุรพล วรภัทราทร', affiliation: 'หัวหน้าศูนย์วิจัยปัญญาประดิษฐ์และเทคโนโลยีก่อกำเนิด มหาวิทยาลัยแม่ฟ้าหลวง' },
            { name: 'ดร.สุนทรีย์ ส่งเสริม', affiliation: 'รองผู้อำนวยการสถาบันข้อมูลขนาดใหญ่' },
            { name: 'ผศ.ดร.ดวงใจ จิตคงชื่น', affiliation: 'ผู้อำนวยการฝ่ายพัฒนากำลังคน สถาบันข้อมูลขนาดใหญ่' },
            { name: 'ดร.ปริสุทธิ์ จิตต์ภักดี', affiliation: 'ผู้เชี่ยวชาญการศึกษาด้านนวัตกรรมข้อมูล สถาบันข้อมูลขนาดใหญ่' },
            { name: 'ดร.สุกัญญา สุขศักดิ์', affiliation: 'นักการศึกษาด้านนวัตกรรมข้อมูลอาวุโส สถาบันข้อมูลขนาดใหญ่' },
            { name: 'ผศ.ดร. ไพรสันต์ ผดุงเวียง', affiliation: 'ประธานหลักสูตรปัญญาประดิษฐ์ วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น' },
            { name: 'รศ.นพ. อนุพล พาณิชย์โชติ', affiliation: 'คณะแพทยศาสตร์ มหาวิทยาลัยขอนแก่น' },
            { name: 'ผศ.ดร. จุฑารพ เพชระบูรณิน', affiliation: 'ผู้อำนวยการ สถาบันฟีโนมแห่งชาติ มหาวิทยาลัยขอนแก่น' },
            { name: 'ดร. กังวาน เหล่าวิโรจนกุล', affiliation: 'ขอนแก่นพัฒนาเมือง' },
            { name: 'ดร. ธีรภัทร์ บุตรโคตร', affiliation: 'บริษัท วันจีโอเซอร์เวย์ จำกัด' },
            { name: 'รศ.ดร. สายันต์ แก่นนาคำ', affiliation: 'ศูนย์วิจัยบูรณาการนวัตกรรมเพื่อการเปลี่ยนผ่านดิจิทัลสู่การบริการสุขภาพอัจฉริยะและอุตสาหกรรมใหม่ (MIDTHaI) มทส.' },
            { name: 'คุณประมุข แจ่มจันทึก', affiliation: 'หัวหน้าฝ่ายนวัตกรรม ธนาคาร กรุงศรีอยุธยา จำกัด (มหาชน)' },
        ],
    },
];

function CommitteePage() {
    return (
        <HomeShell>
            <main className="gt-info-main gt-container">
                <section className="gt-info-panel">
                    <h1>คณะกรรมการ</h1>
                    <p className="gt-committee-subtitle">
                        รายชื่อคณะกรรมการคัดเลือก พี่เลี้ยง และกรรมการรอบตัดสิน ของงาน BDI Young Innovator Hackathon: Intelligent Living
                    </p>

                    <div className="gt-committee-sections">
                        {committeeGroups.map((group) => {
                            const Icon = group.icon;
                            return (
                                <section key={group.id} className="gt-committee-section">
                                    <div className="gt-committee-section-head">
                                        <span className="gt-committee-section-icon">
                                            <Icon size={18} />
                                        </span>
                                        <h2>{group.title}</h2>
                                    </div>

                                    <div className="gt-committee-table-wrap">
                                        <table className="gt-committee-table">
                                            <thead>
                                                <tr>
                                                    <th className="gt-committee-col-name">ชื่อ-สกุล</th>
                                                    <th className="gt-committee-col-affiliation">สังกัด</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.members.map((member, index) => (
                                                    <tr key={`${group.id}-${index}`}>
                                                        <td data-label="ชื่อ-สกุล">{member.name}</td>
                                                        <td data-label="สังกัด">{member.affiliation}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </section>
            </main>
        </HomeShell>
    );
}

export default CommitteePage;
