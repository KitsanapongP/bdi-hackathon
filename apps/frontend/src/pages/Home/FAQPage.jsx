import React, { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import HomeShell from './HomeShell';
import { HACKATHON_CRITERIA_PATH } from '../../lib/userManual';
import './InfoPages.css';

const faqItems = [
    {
        question: 'Concept Deck คืออะไร ?',
        answer: (
            <>
                Concept Deck คือเอกสารสรุปแนวคิดโครงการเบื้องต้น ตาม Topic ที่มีให้ในแบบฟอร์มหรือเทมเพลต ไม่ควรเกิน 2 หน้ากระดาษ โดยส่งได้สูงสุด 2{' '}
                <a className="gt-faq-link" href="/home/datasets">
                    Track
                </a>{' '}
                กรณีที่ส่งมากกว่าหนึ่งโครงร่าง ผู้เข้าร่วมจำเป็นต้องระบุว่าเรื่องใดเป็นเรื่องหลัก และเรื่องใดเป็นเรื่องรอง
            </>
        ),
    },
    {
        question: 'CV ต้องส่งอะไร ?',
        answer:
            'CV ของสมาชิกทุกคนในทีม โดยอธิบาย Background ของตนเอง เช่น สถาบันการศึกษา สาขาที่กำลังศึกษา ประสบการณ์ ความเชี่ยวชาญ หรือรางวัลที่เคยได้รับ ซึ่งมีส่วนสนับสนุนต่อการแข่งขันครั้งนี้ และภายใน CV ควรแนบหลักฐานระบุตัวตนที่เป็นทางการ เช่น บัตรประจำตัวนักศึกษา เพื่อแสดงคุณสมบัติการเข้าร่วมการแข่งขัน',
    },
    {
        question: 'เกณฑ์การคัดเลือกเข้าร่วมโครงการ และเกณฑ์การตัดสินเป็นอย่างไร ?',
        answer: (
            <>
                หลังจากการรับสมัคร ผู้สมัครจะต้องส่ง Concept Deck รวมถึงประวัติส่วนตัวของสมาชิกในทีมทุกคน ภายในระยะเวลาก่อนวันที่ 3 มิถุนายน 2569 แล้วคณะกรรมการจะทำการประเมินหรือให้คะแนนตามเกณฑ์ใน{' '}
                <a className="gt-faq-link" href={HACKATHON_CRITERIA_PATH} target="_blank" rel="noopener noreferrer">
                    ลิงก์นี้ <ExternalLink size={16} aria-hidden="true" />
                </a>
            </>
        ),
    },
    {
        question: 'ทีมจะกำหนด Track อย่างไร?',
        answer: (
            <>
                แต่ละทีมสามารถเขียน <strong>Concept Deck</strong> เสนอได้สูงสุด <strong>2 Track</strong> ถ้าส่ง <strong>2 Track</strong>{' '}
                ต้องระบุว่าจะเลือก Track ใดเป็น<strong>ลำดับที่ 1</strong> และ Track ใดเป็น<strong>ลำดับที่ 2</strong>
            </>
        ),
    },
    {
        question: 'ผู้ชนะในงาน Hackathon จะได้รับสิทธิ์ประโยชน์อะไรบ้าง ?',
        answer:
            'รางวัลถ้วยพระราชทานและเงินรางวัล\n(1) รางวัลชนะเลิศ ได้รับถ้วยพระราชทาน กรมสมเด็จพระเทพฯ จำนวน 1 ถ้วย พร้อมเงินรางวัลสูงสุด 50,000 บาท\n(2) รางวัลรองชนะเลิศ อันดับ 1 ได้รับถ้วยรางวัล จำนวน 1 ถ้วย และเงินรางวัล 30,000 บาท\n(3) รางวัลรองชนะเลิศ อันดับ 2 ได้รับถ้วยรางวัล จำนวน 1 ถ้วย และเงินรางวัล 20,000 บาท\n(4) ประกาศนียบัตรสำหรับผู้เข้าร่วมกิจกรรมทุกคน',
    },
    {
        question: 'ทางผู้จัดมีข้อมูลอะไรให้บ้าง ?',
        answer: (
            <>
                ข้อมูลแบ่งเป็น 3 ชุด ได้แก่ Health (สุขภาพ), Phenome (ฟีโนม), และ City (เมือง) โดยข้อมูลแต่ละชุดจะมีผู้รับผิดชอบข้อมูลจากแต่ละส่วนงานที่อนุเคราะห์ข้อมูลมาร่วมจัดการแข่งขัน
                <br />
                <br />
                คุณสามารถดูชุดข้อมูลได้ที่{' '}
                <a className="gt-faq-link" href="/home/datasets">
                    หน้าชุดข้อมูล
                </a>
            </>
        ),
    },
    {
        question: 'การลงทะเบียน ต้องลงทะเบียนในระบบทุกคน หรือลงทะเบียนเฉพาะหัวหน้าทีม?',
        answer:
            'ทุกคนต้องลงทะเบียนและยืนยันตัวตน หลังจากนั้นผู้จัดงานจะตรวจคุณสมบัติของแต่ละคน ถ้าคุณสมบัติตรงตามเกณฑ์ จะได้รับสิทธิ์ในการเข้าร่วม Orientation Day และมีสิทธิ์ในการสร้างทีมเพื่อส่ง Concept Deck',
    },
    {
        question: 'มีการแจกใบประกาศนียบัตรไหม ?',
        answer:
            'มี โดยผู้ลงทะเบียนที่เข้าร่วมฝึกอบรมวันที่ 24 พฤษภาคม ครบทุกหัวข้อ และมีการส่งโครงร่างโดยหัวหน้าทีม จะได้รับประกาศนียบัตร (โครงร่างนั้นต้องไม่ใช้ AI ในการสร้าง)',
    },
    {
        question: 'มีผู้เชี่ยวชาญทางข้อมูลให้คำปรึกษาหรือเปล่า ?',
        answer:
            'มี ระหว่างการแข่งขันจะมีวิทยากรทั้งทางด้านธุรกิจและทางด้านเทคโนโลยี จากภาคีเครือข่าย ทั้งที่เป็นสถาบันการศึกษาและผู้ประกอบการ เช่น กรุงศรี สถาบันฟีโนมแห่งชาติ และคณะแพทยศาสตร์',
    },
    {
        question: 'ถ้าตอนสมัครมี 5 คน แต่ตอนไปแข่งมีสมาชิกไม่ครบตามจำนวน เป็นอะไรไหมครับ ?',
        answer: 'จะไม่สามารถเข้าร่วมการแข่งขันได้',
    },
    {
        question: 'การเดินทางไปออนไซต์สามารถเบิกได้ไหม ?',
        answer: 'ทางผู้จัดสนับสนุนค่าเดินทางแบบเหมาจ่าย ทีมละไม่เกิน 5,000 บาท',
    },
    {
        question: 'มีที่พักให้ไหม?',
        answer: 'มี สำหรับผู้เข้าร่วมแข่งขันจะพักที่เฮือนต้นนุ่น ส่วนคณะกรรมการและผู้ทรงคุณวุฒิจะพักที่โรงแรม Avani',
    }
];

function FAQPage() {
    const [openIndexes, setOpenIndexes] = useState(() => new Set([0]));

    const toggleItem = (index) => {
        setOpenIndexes((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    return (
        <HomeShell>
            <main className="gt-info-main gt-container">
                <section className="gt-info-panel">
                    <h1>FAQs</h1>
                    <p className="gt-faq-subtitle">คำถามที่พบบ่อยเกี่ยวกับการสมัคร รูปแบบการแข่งขัน และสิทธิประโยชน์</p>
                    <div className="gt-faq-list">
                        {faqItems.map((item, index) => {
                            const isOpen = openIndexes.has(index);
                            const answerId = `faq-answer-${index}`;

                            return (
                                <article
                                    key={item.question}
                                    className={`gt-faq-item ${isOpen ? 'is-open' : ''}`}
                                >
                                    <button
                                        type="button"
                                        className="gt-faq-question"
                                        onClick={() => toggleItem(index)}
                                        aria-expanded={isOpen}
                                        aria-controls={answerId}
                                    >
                                        <span className="gt-faq-question-left">
                                            <h2>{item.question}</h2>
                                        </span>
                                        <ChevronDown className="gt-faq-chevron" size={18} />
                                    </button>

                                    <div
                                        id={answerId}
                                        className="gt-faq-answer-wrap"
                                        aria-hidden={!isOpen}
                                    >
                                        <p className="gt-faq-answer">{item.answer}</p>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            </main>
        </HomeShell>
    );
}

export default FAQPage;
