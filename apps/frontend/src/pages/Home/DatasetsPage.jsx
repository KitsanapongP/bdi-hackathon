import React, { useEffect, useState } from 'react';
import HomeShell from './HomeShell';
import { apiUrl } from '../../lib/api';
import './InfoPages.css';

const DOMAIN_GROUPS = [
    { key: 'Phenome', title: 'Phenome (ฟีโนม)' },
    { key: 'Health', title: 'Health (สุขภาพ)' },
    { key: 'City', title: 'City (เมือง)' },
];

function formatRecordCount(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return '-';
    return numeric.toLocaleString('th-TH');
}

function DatasetsPage() {
    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchDatasets = async () => {
            try {
                setLoading(true);

                const response = await fetch(apiUrl('/api/content/datasets'), {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch datasets: ${response.status}`);
                }

                const payload = await response.json();
                if (!payload?.ok || !Array.isArray(payload.data)) {
                    throw new Error(payload?.message || 'Failed to fetch datasets');
                }

                if (isMounted) {
                    setDatasets(payload.data);
                    setLoading(false);
                }
            } catch {
                if (!isMounted) return;
                setDatasets([]);
                setLoading(false);
            }
        };

        fetchDatasets();

        return () => {
            isMounted = false;
        };
    }, []);

    const datasetGroups = DOMAIN_GROUPS.map((group) => ({
        ...group,
        rows: datasets.filter((item) => item.domain === group.key),
    }));

    return (
        <HomeShell>
            <main className="gt-info-main gt-container">
                <section className="gt-info-panel">
                    <h1>ตัวอย่างชุดข้อมูล</h1>
                    {loading ? <p className="gt-info-status">กำลังโหลดข้อมูล...</p> : null}
                    <ul className="gt-dataset-bullets">
                        {datasetGroups.map((group) => (
                            <li key={group.key} className="gt-dataset-item">
                                <h2>{group.title}</h2>
                                {!loading && (!group.rows || group.rows.length === 0) ? (
                                    <p className="gt-info-status">Coming Soon...</p>
                                ) : group.rows.length > 0 ? (
                                    <div className="gt-dataset-table-wrap">
                                        <table className="gt-dataset-table">
                                            <colgroup>
                                                <col className="gt-col-dataset-name" />
                                                <col className="gt-col-owner" />
                                                <col className="gt-col-attribute-number" />
                                                <col className="gt-col-link" />
                                                <col className="gt-col-domain" />
                                                <col className="gt-col-record-count" />
                                            </colgroup>
                                            <thead>
                                                <tr>
                                                    <th>dataset_name</th>
                                                    <th>owner</th>
                                                    <th>attribute_number</th>
                                                    <th>link</th>
                                                    <th>domain</th>
                                                    <th>record_count</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.rows.map((row) => (
                                                    <tr key={row.id}>
                                                        <td data-label="dataset_name">{row.datasetName}</td>
                                                        <td data-label="owner">{row.owner}</td>
                                                        <td data-label="attribute_number">{row.attributeNumber}</td>
                                                        <td data-label="link">
                                                            {row.link ? (
                                                                <a
                                                                    href={row.link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title={row.link}
                                                                >
                                                                    {row.link}
                                                                </a>
                                                            ) : '-'}
                                                        </td>
                                                        <td data-label="domain">{row.domain}</td>
                                                        <td data-label="record_count">{formatRecordCount(row.recordCount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}
                            </li>
                        ))}
                    </ul>

                    <section className="gt-dataset-requirements" aria-label="ข้อกำหนด">
                        <h2>ข้อกำหนด</h2>

                        <div className="gt-dataset-requirement-block">
                            <p className="gt-dataset-requirement-title">1. ข้อกำหนดเกี่ยวกับสิทธิในทรัพย์สินทางปัญญา</p>
                            <p>
                                (1) สิทธิในทรัพย์สินทางปัญญา หรือสิทธิอื่นใดของผลงาน รวมทั้ง คู่มือ เอกสาร ข้อมูล โปรแกรมคอมพิวเตอร์
                                หรือสิ่งอื่นใดที่เป็นของฝ่ายใดฝ่ายหนึ่ง และฝ่ายนั้นได้นำมาใช้ในการดำเนินการภายใต้หลักเกณฑ์
                                ตามข้อตกลงร่วมกันระหว่างสถาบันข้อมูลขนาดใหญ่และผู้จัดการแข่งขัน
                            </p>
                            <p>
                                (2) ผลงาน และ/หรือ ทรัพย์สินทางปัญญาที่เกิดขึ้นจากการดำเนินงานภายใต้โครงการ
                                ในขั้นตอนการพัฒนานวัตกรรมผ่านกิจกรรมพัฒนานวัตกรรม (Hackathon)
                                ให้สิทธิในทรัพย์สินทางปัญญาเป็นขององค์กรผู้เข้าร่วมกิจกรรมพัฒนานวัตกรรม (Hackathon)
                                เว้นแต่ องค์กรผู้เข้าร่วมกิจกรรมพัฒนานวัตกรรม (Hackathon) กับสถาบันได้มีการตกลงกันเป็นอย่างอื่น
                            </p>
                        </div>

                        <div className="gt-dataset-requirement-block">
                            <p className="gt-dataset-requirement-title">4. การคุ้มครองข้อมูลส่วนบุคคล</p>
                            <p>
                                การประมวลผลข้อมูลส่วนบุคคล หรือการดำเนินการใด ๆ ที่เกี่ยวข้องกับข้อมูลส่วนบุคคล
                                หน่วยงานเจ้าของโจทย์จะดำเนินการให้ถูกต้องตามกฎหมายว่าด้วยการคุ้มครองข้อมูลส่วนบุคคล
                                รวมถึงกฎ ระเบียบ และข้อบังคับที่เกี่ยวข้องอย่างเคร่งครัด
                            </p>
                        </div>
                    </section>
                </section>
            </main>
        </HomeShell>
    );
}

export default DatasetsPage;
