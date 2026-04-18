import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink } from 'lucide-react';
import HomeShell from './HomeShell';
import './InfoPages.css';
import aboutPoster from '../../assets/images/about/bdi-young-innovation-hackathon-posterjpg.jpg';
import { HACKATHON_CRITERIA_PATH } from '../../lib/userManual';

function AboutPage() {
    const [isPosterPreviewOpen, setIsPosterPreviewOpen] = useState(false);

    useEffect(() => {
        if (!isPosterPreviewOpen) return undefined;

        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                setIsPosterPreviewOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeydown);
        return () => {
            window.removeEventListener('keydown', handleKeydown);
        };
    }, [isPosterPreviewOpen]);

    const posterLightbox = isPosterPreviewOpen ? (
        <div
            className="gt-hero-carousel-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Poster preview"
            onClick={() => setIsPosterPreviewOpen(false)}
        >
            <div className="gt-hero-carousel-lightbox-panel gt-about-lightbox-panel" onClick={(event) => event.stopPropagation()}>
                <div className="gt-hero-carousel-lightbox-topbar">
                    <p className="gt-hero-carousel-lightbox-title">โปสเตอร์กิจกรรม BDI Young Innovator Hackathon</p>
                    <div className="gt-hero-carousel-lightbox-topbar-actions">
                        <a
                            className="gt-hero-carousel-lightbox-btn"
                            href={aboutPoster}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ดาวน์โหลด
                        </a>
                        <button
                            type="button"
                            className="gt-hero-carousel-lightbox-close"
                            onClick={() => setIsPosterPreviewOpen(false)}
                            aria-label="Close image preview"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <img
                    className="gt-hero-carousel-lightbox-image gt-about-lightbox-image"
                    src={aboutPoster}
                    alt="โปสเตอร์กิจกรรม BDI Young Innovator Hackathon"
                    loading="eager"
                />
            </div>
        </div>
    ) : null;

    return (
        <HomeShell>
            <main className="gt-info-main gt-container">
                <section className="gt-info-panel">
                    <h1>เกี่ยวกับกิจกรรม</h1>

                    <div className="gt-info-content">
                        <figure className="gt-about-poster">
                            <button
                                type="button"
                                className="gt-about-poster-trigger"
                                onClick={() => setIsPosterPreviewOpen(true)}
                                aria-label="ดูโปสเตอร์ขนาดใหญ่"
                            >
                                <img
                                    src={aboutPoster}
                                    alt="โปสเตอร์กิจกรรม BDI Young Innovator Hackathon"
                                    loading="lazy"
                                />
                            </button>
                        </figure>

                        <h2><strong>การแข่งขัน BDI Young Innovator Hackathon</strong></h2>
                        <p>ชิงถ้วยพระราชทาน สมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดา ฯ สยามบรมราชกุมารี</p>
                        <p>ระหว่างวันที่ 3-5 กรกฎาคม 2569</p>

                        <p>
                            ด้วยความก้าวหน้าของเทคโนโลยีดิจิทัลในปัจจุบัน การประยุกต์ใช้ข้อมูลขนาดใหญ่ (Big Data) และปัญญาประดิษฐ์
                            (Artificial Intelligence: AI) ได้กลายเป็นกลไกสำคัญในการวิเคราะห์ วางแผน และสนับสนุนการตัดสินใจในหลายมิติของสังคม
                            โดยเฉพาะอย่างยิ่งในด้านการส่งเสริมสุขภาพและการยกระดับคุณภาพชีวิตของประชาชน
                        </p>

                        <p>
                            ข้อมูลที่เกี่ยวข้องกับ Intelligent Living เช่น ข้อมูลฟีโนม (Phenome) ข้อมูลสุขภาพและเวชระเบียนผู้ป่วย (EMR)
                            ตลอดจนข้อมูลพฤติกรรมการใช้ชีวิต และบริการเมืองอัจฉริยะ (Smart City)
                            ล้วนเป็นข้อมูลที่มีความหลากหลายและซับซ้อน การจะปลดล็อกศักยภาพของข้อมูลเหล่านี้เพื่อสร้างสรรค์นวัตกรรม
                            จึงจำเป็นต้องอาศัยองค์ความรู้ด้านการวิเคราะห์ข้อมูลขั้นสูง การออกแบบระบบ และการพัฒนาแบบจำลองปัญญาประดิษฐ์
                            เพื่อให้สามารถนำข้อมูลมาใช้ประโยชน์ได้อย่างมีประสิทธิภาพ ถูกต้อง และคำนึงถึงจริยธรรมและความเป็นส่วนตัวของข้อมูล
                        </p>

                        <h2>กรอบแนวคิดการแข่งขัน: "Intelligent Living" (การอยู่อาศัยอัจฉริยะ)</h2>
                        <p>
                            โครงการในรูปแบบกิจกรรม Hackathon ด้าน AI และ Big Data ภายใต้กรอบแนวคิด Intelligent Living นี้
                            มุ่งเน้นการบูรณาการเทคโนโลยี AI เข้ากับบริบทของการดำเนินชีวิต
                            เพื่อพัฒนาแนวคิดและผลงานต้นแบบที่สามารถนำไปประยุกต์ใช้ในการส่งเสริมสุขภาพและคุณภาพชีวิตใน 3 มิติหลัก ได้แก่:
                        </p>
                        <ul>
                            <li>
                                Phenome (ฟีโนม): เจาะลึกข้อมูลระดับพันธุกรรมและชีวโมเลกุล ซึ่งเป็นรากฐานสำคัญสู่การแพทย์แม่นยำ (Precision Medicine)
                            </li>
                            <li>
                                Health (สุขภาพ): ยกระดับการดูแลรักษาและส่งเสริมสุขภาพ ผ่านการวิเคราะห์ข้อมูลสุขภาพเวชระเบียนอิเล็กทรอนิกส์
                            </li>
                            <li>
                                City (เมือง): สร้างสรรค์บริการสาธารณะ สิ่งแวดล้อม ชุมชน และเมืองอัจฉริยะ (Smart City) 
                                ที่ตอบสนองต่อพฤติกรรมการดำรงชีวิต และการบริหารจัดการเชิงนโยบาย
                            </li>
                        </ul>

                        <h2>การบูรณาการความร่วมมือข้ามศาสตร์ครั้งสำคัญ</h2>
                        <p>
                            เวทีนี้เกิดจากการผนึกกำลังของ สถาบันข้อมูลขนาดใหญ่ (BDI) และ วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น 
                            ในฐานะหน่วยงานหลักด้านการผลิตและพัฒนากำลังคนทางเทคโนโลยีดิจิทัล ผ่านกระบวนการเรียนรู้เชิงปฏิบัติการร่วมกับ
                            การบูรณาการข้ามศาสตร์กับหน่วยงานต่างๆ ได้แก่:
                        </p>
                        <ul>
                            <li>
                                คณะแพทยศาสตร์ คณะพยาบาลศาสตร์ คณะสาธารณสุขศาสตร์ และวิทยาลัยการเมืองการปกครองท้องถิ่น
                                มหาวิทยาลัยขอนแก่น
                            </li>
                            <li>
                                ผู้สนับสนุน "ข้อมูลจริง" (Real-world Data Providers) ระดับแนวหน้า เช่น สถาบันฟีโนมแห่งชาติ คณะแพทยศาสตร์
                                มหาวิทยาลัยขอนแก่น และเทศบาลนครขอนแก่น
                            </li>
                            <li>มหาวิทยาลัยเครือข่ายในภาคตะวันออกเฉียงเหนือ และภาคเอกชน</li>
                        </ul>

                        <h2>กลุ่มเป้าหมายและวัตถุประสงค์</h2>
                        <p>
                            โครงการนี้เป็นเวทีสำคัญที่เปิดโอกาสให้ บุคคลทั่วไป นักเรียน นักศึกษา อาจารย์ และผู้เชี่ยวชาญ
                            ได้ร่วมกันระดมสมองและลงมือสร้างผลงานต้นแบบ (Prototype) จากข้อมูลจริง
                        </p>

                        <p>
                            ผลงานและแนวคิดที่ได้จากการแข่งขันครั้งนี้ ไม่เพียงแต่จะช่วยสร้างระบบนิเวศการอยู่อาศัยอัจฉริยะ
                            แต่จะนำไปสู่การพัฒนากำลังคนด้านเทคโนโลยีดิจิทัล การสร้างเครือข่ายความร่วมมือทางวิชาการ
                            และการยกระดับขีดความสามารถในการใช้ AI และ Big Data ของประเทศไทยให้เติบโตอย่างยั่งยืน
                        </p>

                        <h2>เกณฑ์การคัดเลือกและเกณฑ์การตัดสิน</h2>
                        <p>
                            หลังจากการรับสมัคร ผู้สมัครจะต้องส่ง Concept Deck รวมถึงประวัติส่วนตัวของสมาชิกในทีมทุกคน
                            ภายในระยะเวลาก่อนวันที่ 3 มิถุนายน 2569 แล้วคณะกรรมการจะทำการประเมินหรือให้คะแนนตามเกณฑ์ใน{' '}
                            <a
                                className="gt-about-criteria-link"
                                href={HACKATHON_CRITERIA_PATH}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ลิงก์นี้ <ExternalLink size={16} aria-hidden="true" />
                            </a>
                        </p>

                    </div>
                </section>
            </main>
            {typeof document !== 'undefined' && posterLightbox ? createPortal(posterLightbox, document.body) : null}
        </HomeShell>
    );
}

export default AboutPage;
