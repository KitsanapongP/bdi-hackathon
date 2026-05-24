import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import HomeShell from './HomeShell';
import { datasetsData, getDatasetBySlug } from './datasetsData';
import './InfoPages.css';

function formatRecordCount(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return '-';
    return numeric.toLocaleString('th-TH');
}

function DatasetMeta({ label, value }) {
    return (
        <div className="gt-dataset-meta">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function DatasetChips({ items }) {
    if (!items?.length) return null;

    return (
        <div className="gt-dataset-chips">
            {items.map((item) => (
                <span key={item} className="gt-dataset-chip">{item}</span>
            ))}
        </div>
    );
}

function DatasetRequirements() {
    return (
        <section className="gt-dataset-requirements" aria-label="ข้อกำหนดเกี่ยวกับสิทธิในทรัพย์สินทางปัญญา">
            <h2><strong>ข้อกำหนดเกี่ยวกับสิทธิในทรัพย์สินทางปัญญา</strong></h2>
            <p>
                สิทธิในทรัพย์สินทางปัญญา หรือสิทธิอื่นใดของผลงาน รวมทั้ง คู่มือ เอกสาร ข้อมูล โปรแกรมคอมพิวเตอร์
                หรือสิ่งอื่นใดที่เป็นของฝ่ายใดฝ่ายหนึ่ง และฝ่ายนั้นได้นำมาใช้ในการดำเนินการภายใต้สัญญาฉบับนี้
                ย่อมเป็นของฝ่ายนั้น
            </p>

            <div className="gt-dataset-requirement-block">
                <p className="gt-dataset-requirement-title">การเผยแพร่ผลงาน</p>
                <p>
                    (1) ในกรณีที่มีการเผยแพร่ข้อมูลข่าวสารอันเกี่ยวกับผลงานที่ได้รับการสนับสนุนในสิ่งพิมพ์หรือในสื่อใด ๆ
                    ให้ระบุข้อความว่า "สนับสนุนโดยสถาบันข้อมูลขนาดใหญ่ (องค์การมหาชน)" หรือติดตราสัญลักษณ์ของสถาบัน
                </p>
                <p>
                    (2) สถาบันมีสิทธิในการเผยแพร่ผลงานและตัวอย่างความสำเร็จที่ได้รับการสนับสนุนจากสถาบันแก่สาธารณชน
                    ตามที่เห็นสมควร โดยจะละเว้นข้อมูลสำคัญที่เป็นความรู้เฉพาะ ความลับทางการค้า
                    ข้อมูลที่ยังไม่ได้รับการคุ้มครองด้านทรัพย์สินทางปัญญา หรือข้อมูลที่มีผลกระทบต่อความมั่นคงของประเทศ
                </p>
            </div>
        </section>
    );
}

function DatasetOverviewTable() {
    return (
        <div className="gt-dataset-overview-table-wrap">
            <table className="gt-dataset-overview-table">
                <colgroup>
                    <col className="gt-dataset-overview-name-col" />
                    <col className="gt-dataset-overview-track-col" />
                    <col className="gt-dataset-overview-desc-col" />
                </colgroup>
                <thead>
                    <tr>
                        <th>ชื่อชุดข้อมูล</th>
                        <th>Track</th>
                        <th>คำอธิบาย</th>
                    </tr>
                </thead>
                <tbody>
                    {datasetsData.map((dataset) => (
                        <tr key={dataset.slug}>
                            <td data-label="ชื่อชุดข้อมูล">
                                <Link className="gt-dataset-md-link" to={`/home/datasets/${dataset.slug}`}>
                                    {dataset.title}
                                </Link>
                            </td>
                            <td data-label="Track" className="gt-dataset-overview-track">
                                {dataset.track}
                            </td>
                            <td data-label="คำอธิบาย" className="gt-dataset-overview-description">
                                <strong>{dataset.overviewLabel}</strong>
                                {' : '}
                                {dataset.overviewDescription}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function getGithubFileUrl(dataset, file) {
    if (file.url) return file.url;

    const normalizedName = String(file.name || '').trim();
    if (!normalizedName || normalizedName.endsWith('/')) {
        return dataset.githubUrl;
    }

    const fileBaseUrl = dataset.githubUrl.replace('/tree/main/', '/blob/main/');
    return `${fileBaseUrl}/${normalizedName.split('/').map(encodeURIComponent).join('/')}`;
}

function DatasetsOverview() {
    return (
        <HomeShell>
            <main className="gt-info-main gt-container">
                <section className="gt-info-panel gt-datasets-page gt-datasets-md-page">
                    <div className="gt-dataset-page-head">
                        <h1>Data Overview</h1>
                        <a
                            className="gt-dataset-repo-link"
                            href="https://github.com/anonymaew/bdi-hackathon-2026-sampled-dataset"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <ExternalLink size={16} aria-hidden="true" />
                            เปิดบน Github
                        </a>
                    </div>

                    <DatasetOverviewTable />
                    <DatasetRequirements />
                </section>
            </main>
        </HomeShell>
    );
}

function DatasetDetail() {
    const { slug } = useParams();
    const dataset = getDatasetBySlug(slug);

    if (!dataset) {
        return <Navigate to="/home/datasets" replace />;
    }

    return (
        <HomeShell>
            <main className="gt-info-main gt-container">
                <section className="gt-info-panel gt-dataset-detail-page gt-dataset-md-detail">
                    <div className="gt-dataset-detail-nav">
                        <Link className="gt-dataset-back-link" to="/home/datasets">
                            <ArrowLeft size={16} aria-hidden="true" />
                            กลับไปหน้า Data Overview
                        </Link>
                    </div>

                    <article className="gt-dataset-markdown">
                        <h1>{dataset.title}</h1>

                        <h2>Metadata</h2>
                        <table className="gt-dataset-md-meta-table">
                            <tbody>
                                <tr>
                                    <th>Track</th>
                                    <td>{dataset.track}</td>
                                </tr>
                                <tr>
                                    <th>Domain</th>
                                    <td>{dataset.domains.join(', ')}</td>
                                </tr>
                                <tr>
                                    <th>Source</th>
                                    <td>{dataset.sources.join(', ')}</td>
                                </tr>
                                <tr>
                                    <th>Total Records</th>
                                    <td>{formatRecordCount(dataset.totalRecords)}</td>
                                </tr>
                                <tr>
                                    <th>Sampled Records</th>
                                    <td>{formatRecordCount(dataset.sampledRecords)}</td>
                                </tr>
                                <tr>
                                    <th>File Type</th>
                                    <td>{dataset.fileTypes.join(', ')}</td>
                                </tr>
                            </tbody>
                        </table>

                        <h2>คำอธิบาย</h2>
                        <section>
                            {dataset.overview.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                        </section>

                        <h2>ฟิลด์ข้อมูล</h2>
                        <section>
                            <ul>
                                {dataset.fields.map((field) => (
                                    <li key={field}>{field}</li>
                                ))}
                            </ul>
                        </section>

                        <h2>โครงสร้างไฟล์</h2>
                        <section>
                            <table>
                                <thead>
                                    <tr>
                                        <th>ไฟล์</th>
                                        <th>รูปแบบ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dataset.fileStructure.map((file) => (
                                        <tr key={`${file.name}-${file.detail}`}>
                                            <td>
                                                <a href={getGithubFileUrl(dataset, file)} target="_blank" rel="noopener noreferrer">
                                                    {file.name}
                                                </a>
                                            </td>
                                            <td>{file.detail}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <h2>โจทย์ / แนวทางวิเคราะห์</h2>
                        <section>
                            <ul>
                                {dataset.analysisIdeas.map((idea) => (
                                    <li key={idea}>{idea}</li>
                                ))}
                            </ul>
                        </section>

                        {dataset.notes?.length ? (
                            <>
                                <h2>หมายเหตุ</h2>
                                <section>
                                    <ul>
                                        {dataset.notes.map((note) => (
                                            <li key={note}>{note}</li>
                                        ))}
                                    </ul>
                                </section>
                            </>
                        ) : null}

                    </article>
                </section>
            </main>
        </HomeShell>
    );
}

function DatasetsPage() {
    const { slug } = useParams();
    return slug ? <DatasetDetail /> : <DatasetsOverview />;
}

export default DatasetsPage;
