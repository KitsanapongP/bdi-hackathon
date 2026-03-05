import React from 'react';
import HomeShell from './HomeShell';
import './InfoPages.css';

const faqItems = [
    {
        question: 'ใครบ้างที่สามารถสมัครเข้าร่วมได้?',
        answer: 'นิสิต นักศึกษา และบุคลากรที่สนใจด้านนวัตกรรม สุขภาพ หรือการวิเคราะห์ข้อมูล สามารถสมัครได้ตามเงื่อนไขที่ประกาศในหน้าโครงการ',
    },
    {
        question: 'ต้องสมัครเป็นทีมหรือสมัครเดี่ยวได้?',
        answer: 'สามารถสมัครเดี่ยวได้ ระบบจะช่วยให้รวมทีมภายหลัง หรือสมัครมาเป็นทีมที่มีสมาชิกครบตามจำนวนที่กำหนดก็ได้',
    },
    {
        question: 'หากมีคำถามเพิ่มเติมต้องติดต่อช่องทางไหน?',
        answer: 'สามารถติดต่อผ่านหน้า "ติดต่อสอบถาม" หรือช่องทางอีเมลและโทรศัพท์ที่ระบุในส่วนท้ายเว็บไซต์',
    },
    {
        question: 'ประกาศผลรอบคัดเลือกเมื่อไหร่?',
        answer: 'สามารถติดตามกำหนดการประกาศผลได้ในหัวข้อ "ตารางกิจกรรม" บนหน้าแรก โดยทีมงานจะอัปเดตข้อมูลล่าสุดอย่างต่อเนื่อง',
    },
];

function FAQPage() {
    return (
        <HomeShell>
            <main className="gt-info-main gt-container">
                <section className="gt-info-panel">
                    <h1>FAQs</h1>
                    <div className="gt-faq-list">
                        {faqItems.map((item) => (
                            <article key={item.question} className="gt-faq-item">
                                <h2>{item.question}</h2>
                                <p>{item.answer}</p>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
        </HomeShell>
    );
}

export default FAQPage;
