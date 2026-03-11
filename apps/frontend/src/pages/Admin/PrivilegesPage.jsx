import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Check, Pencil, QrCode, RefreshCw, RotateCcw, Save, ScanLine, Trash2 } from 'lucide-react'
import jsQR from 'jsqr'
import { apiUrl } from '../../lib/api'
import './PrivilegesPage.css'

export default function PrivilegesPage({ pushToast, SectionHeading, AdminDataTable }) {
  const [templates, setTemplates] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
      if (!templatesRes.ok || !templatesPayload?.ok) throw new Error(templatesPayload?.message || 'load templates failed')
      if (!claimsRes.ok || !claimsPayload?.ok) throw new Error(claimsPayload?.message || 'load claims failed')
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
      try { videoRef.current.pause() } catch {}
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
    loadCameraDevices().catch(() => {})
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
    } catch {}
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
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'scan failed')
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
          } catch {}

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
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'save failed')
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
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'publish failed')
      pushToast({ title: template.isPublished ? 'ยกเลิกเผยแพร่แล้ว' : 'เผยแพร่แล้ว' })
      await fetchData(search)
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'อัปเดตไม่สำเร็จ' })
    }
  }

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('ยืนยันลบสิทธิ์นี้?')) return
    try {
      const response = await fetch(apiUrl(`/api/privileges/admin/templates/${templateId}`), { method: 'DELETE', credentials: 'include' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'delete failed')
      pushToast({ type: 'warning', title: 'ลบสิทธิ์แล้ว' })
      await fetchData(search)
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'ลบไม่สำเร็จ' })
    }
  }

  const scanClaim = async () => {
    if (!scanToken.trim()) return
    try { await scanClaimByToken(scanToken) } catch {}
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
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'redeem failed')
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
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'update failed')
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
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'bulk failed')
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
      <SectionHeading title="Privileges" description="จัดการ template สิทธิประโยชน์, ตรวจ token และแก้ไขสถานะรายคน/รายทีม" />

      <div className="priv-ui-summary-row">
        <div className="priv-ui-summary-card"><span>Templates</span><strong>{templates.length}</strong><small>{publishedCount} published / {activeCount} active</small></div>
        <div className="priv-ui-summary-card"><span>Claims</span><strong>{claims.length}</strong><small>{pendingClaimsCount} pending / {claimedClaimsCount} claimed</small></div>
      </div>

      <article className="admin-ui-panel admin-ui-stack">
        <h3>Template Management</h3>
        <div className="priv-ui-create-box">
          <div className="priv-ui-create-head">
            <strong>{editingId ? 'Edit Template' : 'Create New Template'}</strong>
            <small>{editingId ? 'กำลังแก้ไข template ที่เลือกจากตารางด้านล่าง' : 'กรอกฟอร์มนี้เพื่อเพิ่ม template ใหม่'}</small>
          </div>

          <div ref={templateFormRef} className="admin-ui-form priv-ui-template-form">
            <label>Code<input value={form.privilegeCode} onChange={(event) => setForm((prev) => ({ ...prev, privilegeCode: event.target.value }))} /></label>
            <label>Display Name (TH)<input value={form.privilegeNameTh} onChange={(event) => setForm((prev) => ({ ...prev, privilegeNameTh: event.target.value }))} /></label>
            <label>Type<select value={form.privilegeType} onChange={(event) => setForm((prev) => ({ ...prev, privilegeType: event.target.value }))}><option value="souvenir_qr">souvenir_qr</option><option value="auto_admin">auto_admin</option></select></label>
            <label>Sort<input type="number" value={form.sortOrder} onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))} /></label>
          </div>

          <div className="priv-ui-create-foot">
            <div className="priv-ui-inline-checks">
              <label className="admin-ui-check"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} /><span>Active</span></label>
              <label className="admin-ui-check"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm((prev) => ({ ...prev, isPublished: event.target.checked }))} /><span>Published</span></label>
            </div>
            <div className="admin-ui-form-actions priv-ui-template-actions">
              {editingId ? <button type="button" className="admin-ui-btn" onClick={resetForm}>Cancel Edit</button> : null}
              <button type="button" className="admin-ui-btn" onClick={resetForm}>Reset</button>
              <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={saving} onClick={submitTemplate}><Save size={14} />{saving ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}</button>
            </div>
          </div>
        </div>

        <div className="priv-ui-subhead">
          <strong>Templates List</strong>
          <span>จัดการ Publish, Edit, Delete จากรายการด้านล่าง</span>
        </div>

        <AdminDataTable
          rows={templates.map((item) => ({ ...item, id: item.privilegeId }))}
          loading={loading}
          searchKeys={['privilegeCode', 'privilegeNameTh', 'privilegeType']}
          searchPlaceholder="ค้นหา template"
          columns={[
            { key: 'privilegeCode', label: 'Code' },
            { key: 'privilegeNameTh', label: 'Name' },
            { key: 'privilegeType', label: 'Type', render: (row) => <span className="admin-ui-status admin-ui-status-info">{row.privilegeType}</span> },
            { key: 'published', label: 'Published', render: (row) => <span className={`admin-ui-status ${row.isPublished ? 'admin-ui-status-success' : 'admin-ui-status-neutral'}`}>{row.isPublished ? 'Published' : 'Draft'}</span> },
            {
              key: 'actions', label: 'Actions', render: (row) => (
                <div className="admin-ui-row-actions">
                  <button type="button" onClick={() => {
                    setEditingId(row.privilegeId)
                    setForm({ privilegeCode: row.privilegeCode, privilegeNameTh: row.privilegeNameTh, privilegeType: row.privilegeType, isActive: row.isActive, isPublished: row.isPublished, sortOrder: row.sortOrder })
                  }}><Pencil size={14} /></button>
                  <button type="button" onClick={() => togglePublish(row)}>{row.isPublished ? <RotateCcw size={14} /> : <Check size={14} />}</button>
                  <button type="button" onClick={() => deleteTemplate(row.privilegeId)}><Trash2 size={14} /></button>
                </div>
              ),
            },
          ]}
        />
      </article>

      <div className="priv-ui-two-col">
        <article className="admin-ui-panel admin-ui-stack">
          <h3><ScanLine size={17} />Camera Scan / Redeem</h3>
          <div className="priv-ui-inline-actions">
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={!scannerSupported} onClick={() => {
              if (scannerOpen) { setScannerOpen(false); releaseCamera(); return }
              setScannerError(''); setScannerOpen(true)
            }}>{scannerOpen ? <CameraOff size={14} /> : <Camera size={14} />}{scannerOpen ? 'ปิดกล้อง' : 'เปิดกล้องสแกน'}</button>
            <button type="button" className="admin-ui-btn" onClick={() => loadCameraDevices().catch(() => pushToast({ type: 'error', title: 'โหลดรายการกล้องไม่สำเร็จ' }))}><RefreshCw size={14} />Refresh cameras</button>
          </div>

          <div className="priv-ui-scanner-mode">Engine: {scannerMode === 'barcode_detector' ? 'BarcodeDetector + jsQR fallback' : scannerMode === 'jsqr' ? 'jsQR fallback (QR only)' : 'not available'}</div>
          {!scannerSupported ? <div className="priv-ui-note-box"><strong>Camera scan ไม่พร้อมใช้งาน</strong><p>เบราว์เซอร์นี้ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาต camera permission หรือใช้ช่องกรอก token ด้านล่าง</p></div> : null}
          {scannerSupported && scannerMode === 'jsqr' ? <div className="priv-ui-note-box"><strong>Safari/Firefox fallback mode</strong><p>โหมดนี้รองรับการอ่าน QR code ได้ดี แต่ไม่รองรับ 1D barcode (เช่น code128/ean)</p></div> : null}
          {cameraDevices.length > 1 ? <label className="priv-ui-camera-select">Camera source<select value={selectedCameraId} onChange={(event) => setSelectedCameraId(event.target.value)}>{cameraDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select></label> : null}

          {scannerOpen ? <div className="priv-ui-scanner-box"><video ref={videoRef} autoPlay muted playsInline className="priv-ui-scanner-video" /><div className="priv-ui-scanner-overlay" /><span className="priv-ui-scanner-hint">{scannerBusy ? (scannerMode === 'jsqr' ? 'กำลังสแกน QR...' : 'กำลังสแกน QR/Barcode...') : 'พร้อมสแกน'}</span></div> : null}
          {scannerError ? <div className="priv-ui-scanner-error">{scannerError}</div> : null}

          <div className="admin-ui-form priv-ui-scan-inline">
            <label>Token<input value={scanToken} onChange={(event) => setScanToken(event.target.value)} placeholder="วาง token จาก QR scanner" /></label>
            <div className="admin-ui-form-actions"><button type="button" className="admin-ui-btn" onClick={scanClaim}>Check</button><button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={redeemClaim}>Redeem</button></div>
          </div>

          {scanResult ? <div className="priv-ui-note-box"><strong>{scanResult.privilegeNameTh}</strong><p>{scanResult.displayName} ({scanResult.teamCode})</p><p>Status: {scanResult.claimStatus}</p><p>Code: {scanResult.privilegeCode}</p></div> : null}
        </article>

        <article className="admin-ui-panel admin-ui-stack">
          <h3>Team Bulk Update</h3>
          <div className="admin-ui-form priv-ui-bulk-form">
            <label>teamId<input value={bulkForm.teamId} onChange={(event) => setBulkForm((prev) => ({ ...prev, teamId: event.target.value }))} /></label>
            <label>privilegeId<input value={bulkForm.privilegeId} onChange={(event) => setBulkForm((prev) => ({ ...prev, privilegeId: event.target.value }))} /></label>
            <label>claimStatus<select value={bulkForm.claimStatus} onChange={(event) => setBulkForm((prev) => ({ ...prev, claimStatus: event.target.value }))}><option value="claimed">claimed</option><option value="pending">pending</option></select></label>
            <label>claimNote<input value={bulkForm.claimNote} onChange={(event) => setBulkForm((prev) => ({ ...prev, claimNote: event.target.value }))} /></label>
            <div className="admin-ui-form-actions priv-ui-bulk-actions"><button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={applyTeamBulk}>Apply Team Update</button></div>
          </div>
        </article>
      </div>

      <article className="admin-ui-panel admin-ui-stack">
        <h3>Claims Correction</h3>
        <div className="priv-ui-subhead">
          <strong>Claims List</strong>
          <span>{pendingClaimsCount} pending / {claimedClaimsCount} claimed</span>
        </div>
        <div className="admin-ui-form priv-ui-claims-tools">
          <label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="username / team / privilege" /></label>
          <div className="admin-ui-form-actions"><button type="button" className="admin-ui-btn" onClick={() => fetchData(search)}>Search</button></div>
        </div>
        <AdminDataTable
          rows={claims.map((item) => ({ ...item, id: item.claimId }))}
          loading={loading}
          searchKeys={['displayName', 'teamCode', 'privilegeCode', 'privilegeNameTh']}
          searchPlaceholder="ค้นหา claim"
          columns={[
            { key: 'displayName', label: 'Member' },
            { key: 'teamCode', label: 'Team' },
            { key: 'privilegeNameTh', label: 'Privilege' },
            { key: 'claimStatus', label: 'Status', render: (row) => <span className={`admin-ui-status ${row.claimStatus === 'claimed' ? 'admin-ui-status-success' : 'admin-ui-status-warning'}`}>{row.claimStatus === 'claimed' ? 'claimed' : 'pending'}</span> },
            { key: 'actions', label: 'Actions', render: (row) => <div className="priv-ui-claim-actions"><button type="button" className="admin-ui-mini-btn" onClick={() => updateClaim(row.claimId, 'claimed')}>Mark Claimed</button><button type="button" className="admin-ui-mini-btn" onClick={() => updateClaim(row.claimId, 'pending')}>Reset</button></div> },
          ]}
        />
      </article>
    </div>
  )
}
