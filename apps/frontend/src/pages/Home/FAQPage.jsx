import React from 'react';
import HomeShell from './HomeShell';
import './InfoPages.css';

const faqItems = [
    {
        question: 'ต้องมีสมาชิกในทีมอย่างน้อยกี่คนและหนึ่งทีมมีสมาชิกได้กี่คน?',
        answer: 'ต้องมีสมาชิกภายในทีมอย่างน้อย 3 คน และมีสมาชิกได้สูงสุด 5 คนต่อทีม',
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
