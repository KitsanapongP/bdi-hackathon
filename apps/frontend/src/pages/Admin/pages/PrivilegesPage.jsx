import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Check, Pencil, QrCode, RefreshCw, RotateCcw, Save, ScanLine, Trash2 } from 'lucide-react'
import jsQR from 'jsqr'
import { apiUrl } from '../../../lib/api'
import AdminDataTable from '../shared/AdminDataTable'
import AdminConfirmModal from '../shared/AdminConfirmModal'
import FilterBar from '../shared/FilterBar'
import PageHeader from '../shared/PageHeader'
import { useAdminToast } from '../shared/adminContexts'
import './PrivilegesPage.css'

export default function PrivilegesPage() {
  const { pushToast } = useAdminToast()
  const [templates, setTemplates] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState(null)
  const [deleteTemplateCandidate, setDeleteTemplateCandidate] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [scanToken, setScanToken] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [search, setSearch] = useState('')
  const [scannerSupported, setScannerSupported] = useState(false)
  const [scannerMode, setScannerMode] = useState('none')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerBusy, setScannerBusy] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [cameraDevices, setCameraDevices] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const templateFormRef = useRef(null)
  const videoRef = useRef(null)
  const scanCanvasRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const scanLoopTimerRef = useRef(null)
  const [bulkForm, setBulkForm] = useState({ teamId: '', privilegeId: '', claimStatus: 'claimed', claimNote: '' })
  const [form, setForm] = useState({
    privilegeCode: '',
    privilegeNameTh: '',
    privilegeType: 'souvenir_qr',
    isActive: true,
    isPublished: false,
    sortOrder: 0,
  })

  const fetchData = useCallback(async (keyword = '') => {
    try {
      setLoading(true)
      const [templatesRes, claimsRes] = await Promise.all([
        fetch(apiUrl('/api/privileges/admin/templates'), { credentials: 'include' }),
        fetch(apiUrl(`/api/privileges/admin/claims?limit=120&q=${encodeURIComponent(keyword)}`), { credentials: 'include' }),
      ])
      const templatesPayload = await templatesRes.json().catch(() => ({}))
      const claimsPayload = await claimsRes.json().catch(() => ({}))
      if (!templatesRes.ok || !templatesPayload?.ok) throw new Error(templatesPayload?.message || 'โหลดเทมเพลตไม่สำเร็จ')
      if (!claimsRes.ok || !claimsPayload?.ok) throw new Error(claimsPayload?.message || 'โหลดข้อมูลการรับสิทธิ์ไม่สำเร็จ')
      setTemplates(templatesPayload.data || [])
      setClaims(claimsPayload.data || [])
    } catch (error) {
      console.error(error)
      pushToast({ type: 'error', title: 'โหลด Privileges ไม่สำเร็จ' })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const hasMediaDevice = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
    const hasBarcodeDetector = typeof window !== 'undefined' && typeof window.BarcodeDetector !== 'undefined'

    setScannerSupported(hasMediaDevice)
    if (!hasMediaDevice) {
      setScannerMode('none')
      return
    }

    setScannerMode(hasBarcodeDetector ? 'barcode_detector' : 'jsqr')
  }, [])

  const releaseCamera = useCallback(() => {
    if (scanLoopTimerRef.current) {
      window.clearTimeout(scanLoopTimerRef.current)
      scanLoopTimerRef.current = null
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause()
      } catch (error) {
        void error
      }
      videoRef.current.srcObject = null
    }

    setScannerBusy(false)
  }, [])

  const loadCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return []
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoInputs = devices.filter((device) => device.kind === 'videoinput')
    setCameraDevices(videoInputs)
    setSelectedCameraId((prev) => (prev && videoInputs.some((device) => device.deviceId === prev) ? prev : (videoInputs[0]?.deviceId || '')))
    return videoInputs
  }, [])

  useEffect(() => {
    if (!scannerSupported) return
    loadCameraDevices().catch((error) => {
      void error
    })
  }, [scannerSupported, loadCameraDevices])

  useEffect(() => () => releaseCamera(), [releaseCamera])

  const extractTokenFromScan = useCallback((rawValue) => {
    const raw = String(rawValue || '').trim()
    if (!raw) return ''
    try {
      const parsed = new URL(raw)
      const queryToken = parsed.searchParams.get('token')
      if (queryToken) return queryToken.trim()
      const hashToken = parsed.hash?.replace(/^#/, '').trim()
      if (hashToken) return decodeURIComponent(hashToken)
      const parts = parsed.pathname.split('/').filter(Boolean)
      const lastPart = parts[parts.length - 1]
      if (lastPart && lastPart.length >= 8) return decodeURIComponent(lastPart.trim())
    } catch (error) {
      void error
    }
    return raw
  }, [])

  const scanClaimByToken = useCallback(async (tokenInput, options = {}) => {
    const token = String(tokenInput || '').trim()
    if (!token) return
    const silent = options?.silent === true
    setScanToken(token)

    try {
      const response = await fetch(apiUrl('/api/privileges/admin/scan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'สแกนไม่สำเร็จ')
      setScanResult(payload.data)
      if (!silent) pushToast({ title: 'ตรวจสอบ token สำเร็จ' })
    } catch (error) {
      setScanResult(null)
      if (!silent) pushToast({ type: 'error', title: error?.message || 'ตรวจสอบ token ไม่สำเร็จ' })
      throw error
    }
  }, [pushToast])

  const decodeQrFromVideoFrame = useCallback(() => {
    const videoEl = videoRef.current
    if (!videoEl || videoEl.readyState < 2) return ''
    const width = Number(videoEl.videoWidth || 0)
    const height = Number(videoEl.videoHeight || 0)
    if (width < 2 || height < 2) return ''

    let canvas = scanCanvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      scanCanvasRef.current = canvas
    }
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return ''
    ctx.drawImage(videoEl, 0, 0, width, height)
    const imageData = ctx.getImageData(0, 0, width, height)
    const result = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' })
    return extractTokenFromScan(result?.data || '')
  }, [extractTokenFromScan])

  useEffect(() => {
    if (!scannerOpen || !scannerSupported) return undefined

    let disposed = false
    async function startScanner() {
      try {
        setScannerBusy(true)
        setScannerError('')
        await loadCameraDevices()
        const fallbackConstraints = { video: { facingMode: { ideal: 'environment' } }, audio: false }
        let stream
        if (selectedCameraId) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedCameraId } }, audio: false })
          } catch {
            stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
          }
        } else {
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
        }
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        cameraStreamRef.current = stream
        if (!videoRef.current) throw new Error('ไม่พบ video element')
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()

        let detector = null
        if (scannerMode === 'barcode_detector' && typeof window.BarcodeDetector !== 'undefined') {
          const supportedFormats = typeof window.BarcodeDetector.getSupportedFormats === 'function'
            ? await window.BarcodeDetector.getSupportedFormats().catch(() => [])
            : []
          const preferredFormats = ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
          const formats = preferredFormats.filter((format) => supportedFormats.includes(format))
          detector = formats.length ? new window.BarcodeDetector({ formats }) : new window.BarcodeDetector()
        }

        const scanLoop = async () => {
          if (disposed || !videoRef.current) return
          let detectedToken = ''
          try {
            if (detector) {
              const detected = await detector.detect(videoRef.current)
              if (detected?.length) detectedToken = extractTokenFromScan(detected[0]?.rawValue)
            }
          } catch (error) {
            void error
          }

          if (!detectedToken) detectedToken = decodeQrFromVideoFrame()
          if (detectedToken) {
            releaseCamera()
            setScannerOpen(false)
            setScanToken(detectedToken)
            pushToast({
              title: 'สแกนสำเร็จ',
              description: detector ? 'ระบบอ่าน token จากกล้องแล้ว' : 'อ่านผ่าน QR fallback แล้ว',
            })
            try {
              await scanClaimByToken(detectedToken, { silent: true })
            } catch {
              pushToast({ type: 'error', title: 'อ่าน token ได้ แต่ตรวจสอบสิทธิ์ไม่ผ่าน' })
            }
            return
          }
          scanLoopTimerRef.current = window.setTimeout(scanLoop, 220)
        }

        scanLoop()
      } catch (error) {
        releaseCamera()
        setScannerOpen(false)
        setScannerError(error?.message || 'ไม่สามารถเปิดกล้องเพื่อสแกนได้')
        pushToast({ type: 'error', title: 'เปิดกล้องไม่สำเร็จ' })
      }
    }

    startScanner()
    return () => {
      disposed = true
      releaseCamera()
    }
  }, [decodeQrFromVideoFrame, extractTokenFromScan, loadCameraDevices, pushToast, releaseCamera, scanClaimByToken, scannerMode, scannerOpen, scannerSupported, selectedCameraId])

  const resetForm = () => {
    setEditingId(null)
    setForm({ privilegeCode: '', privilegeNameTh: '', privilegeType: 'souvenir_qr', isActive: true, isPublished: false, sortOrder: 0 })
  }

  const submitTemplate = async () => {
    if (!form.privilegeCode.trim() || !form.privilegeNameTh.trim()) {
      pushToast({ type: 'error', title: 'กรุณากรอก code และชื่อสิทธิ์' })
      return
    }
    try {
      setSaving(true)
      const payloadBody = {
        privilegeCode: form.privilegeCode,
        privilegeNameTh: form.privilegeNameTh,
        privilegeType: form.privilegeType,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive === true,
        isPublished: form.isPublished === true,
      }
      const response = await fetch(apiUrl(editingId ? `/api/privileges/admin/templates/${editingId}` : '/api/privileges/admin/templates'), {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payloadBody),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'บันทึกข้อมูลไม่สำเร็จ')
      pushToast({ title: editingId ? 'อัปเดตสิทธิ์สำเร็จ' : 'สร้างสิทธิ์สำเร็จ' })
      resetForm()
      await fetchData(search)
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'บันทึกไม่สำเร็จ' })
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (template) => {
    try {
      const response = await fetch(apiUrl(`/api/privileges/admin/templates/${template.privilegeId}/publish`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublished: !template.isPublished }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'เผยแพร่ไม่สำเร็จ')
      pushToast({ title: template.isPublished ? 'ยกเลิกเผยแพร่แล้ว' : 'เผยแพร่แล้ว' })
      await fetchData(search)
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'อัปเดตไม่สำเร็จ' })
    }
  }

  const requestDeleteTemplate = (template) => {
    if (!template?.privilegeId) return
    setDeleteTemplateCandidate(template)
  }

  const confirmDeleteTemplate = async () => {
    if (!deleteTemplateCandidate?.privilegeId || deletingTemplateId) return
    const templateId = deleteTemplateCandidate.privilegeId
    try {
      setDeletingTemplateId(templateId)
      const response = await fetch(apiUrl(`/api/privileges/admin/templates/${templateId}`), { method: 'DELETE', credentials: 'include' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'ลบข้อมูลไม่สำเร็จ')
      if (editingId === templateId) resetForm()
      pushToast({ type: 'warning', title: 'ลบสิทธิ์แล้ว' })
      await fetchData(search)
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'ลบไม่สำเร็จ' })
    } finally {
      setDeletingTemplateId(null)
      setDeleteTemplateCandidate(null)
    }
  }

  const scanClaim = async () => {
    if (!scanToken.trim()) return
    try {
      await scanClaimByToken(scanToken)
    } catch (error) {
      void error
    }
  }

  const redeemClaim = async () => {
    if (!scanToken.trim()) return
    try {
      const response = await fetch(apiUrl('/api/privileges/admin/scan/redeem'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: scanToken.trim() }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'บันทึกรับสิทธิ์ไม่สำเร็จ')
      setScanResult(payload.data?.claim || null)
      pushToast({ title: payload.data?.alreadyClaimed ? 'สิทธิ์นี้ถูกรับแล้ว' : 'รับสิทธิ์สำเร็จ' })
      await fetchData(search)
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'รับสิทธิ์ไม่สำเร็จ' })
    }
  }

  const updateClaim = async (claimId, claimStatus) => {
    try {
      const response = await fetch(apiUrl(`/api/privileges/admin/claims/${claimId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ claimStatus }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'อัปเดตข้อมูลไม่สำเร็จ')
      pushToast({ title: 'อัปเดตสถานะสิทธิ์สำเร็จ' })
      await fetchData(search)
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'อัปเดตไม่สำเร็จ' })
    }
  }

  const applyTeamBulk = async () => {
    if (!bulkForm.teamId || !bulkForm.privilegeId) {
      pushToast({ type: 'error', title: 'กรุณากรอก teamId และ privilegeId' })
      return
    }
    try {
      const response = await fetch(apiUrl(`/api/privileges/admin/teams/${bulkForm.teamId}/privileges/${bulkForm.privilegeId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ claimStatus: bulkForm.claimStatus, claimNote: bulkForm.claimNote || null }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'ประมวลผลแบบกลุ่มไม่สำเร็จ')
      pushToast({ title: 'อัปเดตทั้งทีมสำเร็จ' })
      await fetchData(search)
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'อัปเดตทั้งทีมไม่สำเร็จ' })
    }
  }

  const publishedCount = templates.filter((item) => item.isPublished).length
  const activeCount = templates.filter((item) => item.isActive).length
  const pendingClaimsCount = claims.filter((item) => item.claimStatus === 'pending').length
  const claimedClaimsCount = claims.filter((item) => item.claimStatus === 'claimed').length

  return (
    <div className="admin-ui-stack priv-ui-page">
      <PageHeader
        title="สิทธิประโยชน์"
        actions={
          <div className="admin-ui-header-actions">
            <button type="button" className="admin-ui-btn" onClick={() => fetchData(search)}>
              <RefreshCw size={14} />
              รีเฟรช
            </button>
          </div>
        }
      />

      <div className="priv-ui-summary-row">
        <div className="priv-ui-summary-card"><span>เทมเพลต</span><strong>{templates.length}</strong><small>{publishedCount} เผยแพร่ / {activeCount} ใช้งาน</small></div>
        <div className="priv-ui-summary-card"><span>รายการรับสิทธิ์</span><strong>{claims.length}</strong><small>{pendingClaimsCount} รอดำเนินการ / {claimedClaimsCount} รับแล้ว</small></div>
      </div>

      <article className="admin-ui-panel admin-ui-stack">
        <h3>จัดการเทมเพลตสิทธิ์</h3>
        <div className="priv-ui-create-box">
          <div className="priv-ui-create-head">
            <strong>{editingId ? 'แก้ไขเทมเพลต' : 'สร้างเทมเพลตใหม่'}</strong>
            <small>{editingId ? 'กำลังแก้ไข template ที่เลือกจากตารางด้านล่าง' : 'กรอกฟอร์มนี้เพื่อเพิ่ม template ใหม่'}</small>
          </div>

          <div ref={templateFormRef} className="admin-ui-form priv-ui-template-form">
            <label>โค้ด<input value={form.privilegeCode} onChange={(event) => setForm((prev) => ({ ...prev, privilegeCode: event.target.value }))} /></label>
            <label>ชื่อสิทธิ์ (TH)<input value={form.privilegeNameTh} onChange={(event) => setForm((prev) => ({ ...prev, privilegeNameTh: event.target.value }))} /></label>
            <label>ประเภท<select value={form.privilegeType} onChange={(event) => setForm((prev) => ({ ...prev, privilegeType: event.target.value }))}><option value="souvenir_qr">souvenir_qr</option><option value="auto_admin">auto_admin</option></select></label>
            <label>ลำดับ<input type="number" value={form.sortOrder} onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))} /></label>
          </div>

          <div className="priv-ui-create-foot">
            <div className="priv-ui-inline-checks">
              <label className="admin-ui-check"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} /><span>ใช้งาน</span></label>
              <label className="admin-ui-check"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm((prev) => ({ ...prev, isPublished: event.target.checked }))} /><span>เผยแพร่</span></label>
            </div>
            <div className="admin-ui-form-actions priv-ui-template-actions">
              {editingId ? <button type="button" className="admin-ui-btn" onClick={resetForm}>ยกเลิกการแก้ไข</button> : null}
              <button type="button" className="admin-ui-btn" onClick={resetForm}>ล้างฟอร์ม</button>
              <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={saving} onClick={submitTemplate}><Save size={14} />{saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'สร้างเทมเพลต'}</button>
            </div>
          </div>
        </div>

        <div className="priv-ui-subhead">
          <strong>รายการเทมเพลต</strong>
          <span>จัดการ Publish, Edit, Delete จากรายการด้านล่าง</span>
        </div>

        <AdminDataTable
          rows={templates.map((item) => ({ ...item, id: item.privilegeId }))}
          loading={loading}
          searchKeys={['privilegeCode', 'privilegeNameTh', 'privilegeType']}
          searchPlaceholder="ค้นหา template"
          columns={[
            { key: 'privilegeCode', label: 'โค้ด' },
            { key: 'privilegeNameTh', label: 'ชื่อ' },
            { key: 'privilegeType', label: 'ประเภท', render: (row) => <span className="admin-ui-status admin-ui-status-info">{row.privilegeType}</span> },
            { key: 'published', label: 'สถานะเผยแพร่', render: (row) => <span className={`admin-ui-status ${row.isPublished ? 'admin-ui-status-success' : 'admin-ui-status-neutral'}`}>{row.isPublished ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</span> },
            {
              key: 'actions', label: 'การจัดการ', render: (row) => (
                <div className="admin-ui-row-actions">
                  <button type="button" onClick={() => {
                    setEditingId(row.privilegeId)
                    setForm({ privilegeCode: row.privilegeCode, privilegeNameTh: row.privilegeNameTh, privilegeType: row.privilegeType, isActive: row.isActive, isPublished: row.isPublished, sortOrder: row.sortOrder })
                  }}><Pencil size={14} /></button>
                  <button type="button" onClick={() => togglePublish(row)}>{row.isPublished ? <RotateCcw size={14} /> : <Check size={14} />}</button>
                  <button type="button" onClick={() => requestDeleteTemplate(row)} disabled={deletingTemplateId === row.privilegeId}><Trash2 size={14} /></button>
                </div>
              ),
            },
          ]}
        />
      </article>

      <div className="priv-ui-two-col">
        <article className="admin-ui-panel admin-ui-stack">
          <h3><ScanLine size={17} />สแกนและยืนยันรับสิทธิ์</h3>
          <div className="priv-ui-inline-actions">
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={!scannerSupported} onClick={() => {
              if (scannerOpen) { setScannerOpen(false); releaseCamera(); return }
              setScannerError(''); setScannerOpen(true)
            }}>{scannerOpen ? <CameraOff size={14} /> : <Camera size={14} />}{scannerOpen ? 'ปิดกล้อง' : 'เปิดกล้องสแกน'}</button>
            <button type="button" className="admin-ui-btn" onClick={() => loadCameraDevices().catch(() => pushToast({ type: 'error', title: 'โหลดรายการกล้องไม่สำเร็จ' }))}><RefreshCw size={14} />รีเฟรชกล้อง</button>
          </div>

          <div className="priv-ui-scanner-mode">ระบบสแกน: {scannerMode === 'barcode_detector' ? 'BarcodeDetector + jsQR สำรอง' : scannerMode === 'jsqr' ? 'jsQR สำรอง (QR เท่านั้น)' : 'ไม่พร้อมใช้งาน'}</div>
          {!scannerSupported ? <div className="priv-ui-note-box"><strong>Camera scan ไม่พร้อมใช้งาน</strong><p>เบราว์เซอร์นี้ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาต camera permission หรือใช้ช่องกรอก token ด้านล่าง</p></div> : null}
          {scannerSupported && scannerMode === 'jsqr' ? <div className="priv-ui-note-box"><strong>โหมดสำรอง Safari/Firefox</strong><p>โหมดนี้รองรับการอ่าน QR code ได้ดี แต่ไม่รองรับ 1D barcode (เช่น code128/ean)</p></div> : null}
          {cameraDevices.length > 1 ? <label className="priv-ui-camera-select">แหล่งกล้อง<select value={selectedCameraId} onChange={(event) => setSelectedCameraId(event.target.value)}>{cameraDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select></label> : null}

          {scannerOpen ? <div className="priv-ui-scanner-box"><video ref={videoRef} autoPlay muted playsInline className="priv-ui-scanner-video" /><div className="priv-ui-scanner-overlay" /><span className="priv-ui-scanner-hint">{scannerBusy ? (scannerMode === 'jsqr' ? 'กำลังสแกน QR...' : 'กำลังสแกน QR/Barcode...') : 'พร้อมสแกน'}</span></div> : null}
          {scannerError ? <div className="priv-ui-scanner-error">{scannerError}</div> : null}

          <div className="admin-ui-form priv-ui-scan-inline">
            <label>โทเคน<input value={scanToken} onChange={(event) => setScanToken(event.target.value)} placeholder="วางโทเคนจาก QR scanner" /></label>
            <div className="admin-ui-form-actions"><button type="button" className="admin-ui-btn" onClick={scanClaim}>ตรวจสอบ</button><button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={redeemClaim}>ยืนยันรับสิทธิ์</button></div>
          </div>

          {scanResult ? <div className="priv-ui-note-box"><strong>{scanResult.privilegeNameTh}</strong><p>{scanResult.displayName} ({scanResult.teamCode})</p><p>สถานะ: {scanResult.claimStatus}</p><p>โค้ด: {scanResult.privilegeCode}</p></div> : null}
        </article>

        <article className="admin-ui-panel admin-ui-stack">
          <h3>อัปเดตสิทธิ์แบบกลุ่ม</h3>
          <div className="admin-ui-form priv-ui-bulk-form">
            <label>รหัสทีม (teamId)<input value={bulkForm.teamId} onChange={(event) => setBulkForm((prev) => ({ ...prev, teamId: event.target.value }))} /></label>
            <label>รหัสสิทธิ์ (privilegeId)<input value={bulkForm.privilegeId} onChange={(event) => setBulkForm((prev) => ({ ...prev, privilegeId: event.target.value }))} /></label>
            <label>สถานะรับสิทธิ์ (claimStatus)<select value={bulkForm.claimStatus} onChange={(event) => setBulkForm((prev) => ({ ...prev, claimStatus: event.target.value }))}><option value="claimed">รับแล้ว</option><option value="pending">รอดำเนินการ</option></select></label>
            <label>หมายเหตุ (claimNote)<input value={bulkForm.claimNote} onChange={(event) => setBulkForm((prev) => ({ ...prev, claimNote: event.target.value }))} /></label>
            <div className="admin-ui-form-actions priv-ui-bulk-actions"><button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={applyTeamBulk}>อัปเดตทั้งทีม</button></div>
          </div>
        </article>
      </div>

      <article className="admin-ui-panel admin-ui-stack">
        <h3>ปรับแก้รายการรับสิทธิ์</h3>
        <div className="priv-ui-subhead">
          <strong>รายการรับสิทธิ์</strong>
          <span>{pendingClaimsCount} รอดำเนินการ / {claimedClaimsCount} รับแล้ว</span>
        </div>
        <FilterBar
          label="ตัวกรองรายการรับสิทธิ์"
          right={
            <button type="button" className="admin-ui-btn" onClick={() => fetchData(search)}>
              ค้นหา
            </button>
          }
        >
          <div className="admin-ui-form priv-ui-claims-tools">
            <label>
              ค้นหา
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="นามแฝง (Alias) / ทีม / สิทธิ์" />
            </label>
          </div>
        </FilterBar>
        <AdminDataTable
          rows={claims.map((item) => ({ ...item, id: item.claimId }))}
          loading={loading}
          searchKeys={['displayName', 'teamCode', 'privilegeCode', 'privilegeNameTh']}
          searchPlaceholder="ค้นหา claim"
          columns={[
            { key: 'displayName', label: 'ผู้รับสิทธิ์' },
            { key: 'teamCode', label: 'ทีม' },
            { key: 'privilegeNameTh', label: 'สิทธิ์' },
            { key: 'claimStatus', label: 'สถานะ', render: (row) => <span className={`admin-ui-status ${row.claimStatus === 'claimed' ? 'admin-ui-status-success' : 'admin-ui-status-warning'}`}>{row.claimStatus === 'claimed' ? 'รับแล้ว' : 'รอดำเนินการ'}</span> },
            { key: 'actions', label: 'การจัดการ', render: (row) => <div className="priv-ui-claim-actions"><button type="button" className="admin-ui-mini-btn" onClick={() => updateClaim(row.claimId, 'claimed')}>ตั้งเป็นรับแล้ว</button><button type="button" className="admin-ui-mini-btn" onClick={() => updateClaim(row.claimId, 'pending')}>รีเซ็ต</button></div> },
          ]}
        />
      </article>

      <AdminConfirmModal
        open={Boolean(deleteTemplateCandidate)}
        danger
        title={deleteTemplateCandidate ? `ลบเทมเพลต ${deleteTemplateCandidate.privilegeCode}?` : 'ลบเทมเพลตนี้?'}
        description="ระบบจะลบเทมเพลตนี้ออกจากรายการทันที"
        confirmLabel={deletingTemplateId ? 'กำลังลบ...' : 'ลบ'}
        cancelLabel="ยกเลิก"
        onCancel={() => {
          if (!deletingTemplateId) setDeleteTemplateCandidate(null)
        }}
        onConfirm={confirmDeleteTemplate}
      />
    </div>
  )
}
