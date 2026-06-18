import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CameraOff, CheckCircle2, Filter, Gift, QrCode, RefreshCw, ScanLine, Users } from 'lucide-react'
import jsQR from 'jsqr'
import { apiUrl } from '../../../lib/api'
import AdminDataTable from '../shared/AdminDataTable'
import AdminSelect from '../shared/AdminSelect'
import DetailDrawer from '../shared/DetailDrawer'
import PageHeader from '../shared/PageHeader'
import { useAdminToast } from '../shared/adminContexts'
import { claimMethodLabel, privilegeTypeLabel } from '../utils/privileges'
import { formatDateTime } from '../utils/adminFormatters'
import './PrivilegesPage.css'

export default function PrivilegeRedeemPage() {
  const { pushToast } = useAdminToast()
  const [templates, setTemplates] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanToken, setScanToken] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [scannerSupported, setScannerSupported] = useState(false)
  const [scannerMode, setScannerMode] = useState('none')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerBusy, setScannerBusy] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [cameraDevices, setCameraDevices] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const [autoRedeem, setAutoRedeem] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('')
  const [privilegeFilter, setPrivilegeFilter] = useState('')
  const videoRef = useRef(null)
  const scanCanvasRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const scanLoopTimerRef = useRef(null)
  const autoRedeemRef = useRef(true)
  const lastScanRef = useRef({ token: '', at: 0 })
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkForm, setBulkForm] = useState({ teamId: '', privilegeId: '', claimStatus: 'claimed', claimNote: '' })

  useEffect(() => {
    autoRedeemRef.current = autoRedeem
  }, [autoRedeem])

  const fetchData = useCallback(async (options = {}) => {
    const silent = options.silent === true
    try {
      if (!silent) setLoading(true)
      const [templatesRes, claimsRes] = await Promise.all([
        fetch(apiUrl('/api/privileges/admin/templates'), { credentials: 'include' }),
        fetch(apiUrl('/api/privileges/admin/claims?limit=500'), { credentials: 'include' }),
      ])
      const templatesPayload = await templatesRes.json().catch(() => ({}))
      const claimsPayload = await claimsRes.json().catch(() => ({}))
      if (!templatesRes.ok || !templatesPayload?.ok) throw new Error(templatesPayload?.message || 'โหลดเทมเพลตไม่สำเร็จ')
      if (!claimsRes.ok || !claimsPayload?.ok) throw new Error(claimsPayload?.message || 'โหลดข้อมูลการรับสิทธิ์ไม่สำเร็จ')
      setTemplates(templatesPayload.data || [])
      setClaims(claimsPayload.data || [])
    } catch (error) {
      console.error(error)
      if (!silent) pushToast({ type: 'error', title: 'โหลดข้อมูลรับสิทธิ์ไม่สำเร็จ' })
    } finally {
      if (!silent) setLoading(false)
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

  const redeemByToken = useCallback(async (tokenInput) => {
    const token = String(tokenInput || '').trim()
    if (!token) return
    setScanToken(token)
    try {
      const response = await fetch(apiUrl('/api/privileges/admin/scan/redeem'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'บันทึกรับสิทธิ์ไม่สำเร็จ')
      setScanResult(payload.data?.claim || null)
      const alreadyClaimed = payload.data?.alreadyClaimed
      pushToast({
        type: alreadyClaimed ? 'warning' : 'success',
        title: alreadyClaimed ? 'สิทธิ์นี้ถูกรับไปแล้ว' : 'รับสิทธิ์สำเร็จ',
        description: payload.data?.claim ? `${payload.data.claim.displayName} · ${payload.data.claim.privilegeNameTh}` : undefined,
      })
      await fetchData({ silent: true })
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'รับสิทธิ์ไม่สำเร็จ' })
      throw error
    }
  }, [pushToast, fetchData])

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
            const now = Date.now()
            const isDuplicate = detectedToken === lastScanRef.current.token && now - lastScanRef.current.at < 3000
            if (!isDuplicate) {
              lastScanRef.current = { token: detectedToken, at: now }
              setScanToken(detectedToken)

              if (autoRedeemRef.current) {
                // โหมดต่อเนื่อง: รับสิทธิ์ให้ทันที แล้วสแกนคนต่อไปได้เลย (ไม่ต้องกดปุ่ม)
                try {
                  await redeemByToken(detectedToken)
                } catch (error) {
                  void error
                }
              } else {
                // โหมดปลอดภัย: อ่านข้อมูลแล้วหยุดกล้องให้กดยืนยันเอง
                releaseCamera()
                setScannerOpen(false)
                pushToast({ title: 'สแกนสำเร็จ', description: 'ตรวจสอบข้อมูลแล้วกดยืนยันรับสิทธิ์' })
                try {
                  await scanClaimByToken(detectedToken, { silent: true })
                } catch {
                  pushToast({ type: 'error', title: 'อ่าน token ได้ แต่ตรวจสอบสิทธิ์ไม่ผ่าน' })
                }
                return
              }
            }
          }

          if (disposed) return
          scanLoopTimerRef.current = window.setTimeout(scanLoop, detectedToken ? 600 : 220)
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
  }, [decodeQrFromVideoFrame, extractTokenFromScan, loadCameraDevices, pushToast, redeemByToken, releaseCamera, scanClaimByToken, scannerMode, scannerOpen, scannerSupported, selectedCameraId])

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
      await redeemByToken(scanToken)
    } catch (error) {
      void error
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
      await fetchData()
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'อัปเดตไม่สำเร็จ' })
    }
  }

  const applyTeamBulk = async () => {
    if (!bulkForm.teamId || !bulkForm.privilegeId) {
      pushToast({ type: 'error', title: 'กรุณาเลือกทีมและสิทธิ์' })
      return
    }
    try {
      setBulkBusy(true)
      const response = await fetch(apiUrl(`/api/privileges/admin/teams/${bulkForm.teamId}/privileges/${bulkForm.privilegeId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ claimStatus: bulkForm.claimStatus, claimNote: bulkForm.claimNote || null }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'ประมวลผลแบบกลุ่มไม่สำเร็จ')
      pushToast({ title: 'อัปเดตทั้งทีมสำเร็จ' })
      setBulkOpen(false)
      setBulkForm({ teamId: '', privilegeId: '', claimStatus: 'claimed', claimNote: '' })
      await fetchData()
    } catch (error) {
      pushToast({ type: 'error', title: error?.message || 'อัปเดตทั้งทีมไม่สำเร็จ' })
    } finally {
      setBulkBusy(false)
    }
  }

  const teamOptions = useMemo(() => {
    const map = new Map()
    for (const claim of claims) {
      if (!map.has(claim.teamId)) {
        map.set(claim.teamId, { teamId: claim.teamId, teamCode: claim.teamCode, teamNameTh: claim.teamNameTh })
      }
    }
    return Array.from(map.values()).sort((a, b) => String(a.teamCode || '').localeCompare(String(b.teamCode || '')))
  }, [claims])

  const filteredClaims = useMemo(() => claims.filter((claim) => (
    (statusFilter === 'all' || claim.claimStatus === statusFilter)
    && (!teamFilter || String(claim.teamId) === teamFilter)
    && (!privilegeFilter || String(claim.privilegeId) === privilegeFilter)
  )), [claims, statusFilter, teamFilter, privilegeFilter])

  const pendingClaimsCount = claims.filter((item) => item.claimStatus === 'pending').length
  const claimedClaimsCount = claims.filter((item) => item.claimStatus === 'claimed').length

  return (
    <div className="admin-ui-stack priv-ui-page">
      <PageHeader
        title="รับสิทธิ์ & สแกน"
        subtitle="สแกน QR ของผู้เข้าร่วมเพื่อยืนยันการรับสิทธิ์หน้างาน"
        actions={
          <div className="admin-ui-header-actions">
            <button type="button" className="admin-ui-btn" onClick={() => fetchData()}>
              <RefreshCw size={14} />
              รีเฟรช
            </button>
            <button type="button" className="admin-ui-btn" onClick={() => setBulkOpen(true)}>
              <Users size={14} />
              อัปเดตแบบกลุ่ม
            </button>
          </div>
        }
      />

      <article className="admin-ui-panel admin-ui-stack">
        <h3><ScanLine size={17} />สแกน QR เพื่อยืนยันรับสิทธิ์</h3>
        <div className="priv-ui-scan-hero">
          <div className="priv-ui-scan-left">
            <div className="priv-ui-inline-actions">
              <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={!scannerSupported} onClick={() => {
                if (scannerOpen) { setScannerOpen(false); releaseCamera(); return }
                setScannerError(''); setScannerOpen(true)
              }}>{scannerOpen ? <CameraOff size={14} /> : <Camera size={14} />}{scannerOpen ? 'ปิดกล้อง' : 'เปิดกล้องสแกน'}</button>
              <button type="button" className="admin-ui-btn" onClick={() => loadCameraDevices().catch(() => pushToast({ type: 'error', title: 'โหลดรายการกล้องไม่สำเร็จ' }))}><RefreshCw size={14} />รีเฟรชกล้อง</button>
            </div>

            <label className={`priv-ui-auto-toggle ${autoRedeem ? 'is-on' : ''}`}>
              <input type="checkbox" checked={autoRedeem} onChange={(event) => setAutoRedeem(event.target.checked)} />
              <span>รับสิทธิ์อัตโนมัติเมื่อสแกน</span>
            </label>

            {!scannerSupported ? <div className="priv-ui-note-box"><p>เบราว์เซอร์นี้เข้าถึงกล้องไม่ได้ ใช้ช่องกรอกโทเคนด้านล่างแทน</p></div> : null}
            {cameraDevices.length > 1 ? (
              <div className="priv-ui-camera-select">
                <span>แหล่งกล้อง</span>
                <AdminSelect
                  fullWidth
                  ariaLabel="แหล่งกล้อง"
                  value={selectedCameraId}
                  onChange={setSelectedCameraId}
                  options={cameraDevices.map((device, index) => ({ value: device.deviceId, label: device.label || `Camera ${index + 1}` }))}
                />
              </div>
            ) : null}

            {scannerOpen ? <div className="priv-ui-scanner-box"><video ref={videoRef} autoPlay muted playsInline className="priv-ui-scanner-video" /><div className="priv-ui-scanner-overlay" /><span className="priv-ui-scanner-hint">{scannerBusy ? (scannerMode === 'jsqr' ? 'กำลังสแกน QR...' : 'กำลังสแกน QR/Barcode...') : 'พร้อมสแกน'}</span></div> : null}
            {scannerError ? <div className="priv-ui-scanner-error">{scannerError}</div> : null}

            <div className="admin-ui-form priv-ui-scan-inline">
              <label>กรอกโทเคนเอง<input value={scanToken} onChange={(event) => setScanToken(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); scanClaim() } }} placeholder="วางโทเคนจาก QR แล้วกด Enter" /></label>
              <div className="admin-ui-form-actions"><button type="button" className="admin-ui-btn" onClick={scanClaim}>ตรวจสอบ</button></div>
            </div>
          </div>

          <div className="priv-ui-scan-right">
            {scanResult ? (
              <div className={`priv-ui-scan-result ${scanResult.claimStatus === 'claimed' ? 'is-claimed' : 'is-pending'}`}>
                <div className="priv-ui-scan-result-head">
                  <strong>{scanResult.privilegeNameTh}</strong>
                  <span className={`admin-ui-status ${scanResult.claimStatus === 'claimed' ? 'admin-ui-status-success' : 'admin-ui-status-warning'}`}>{scanResult.claimStatus === 'claimed' ? 'รับแล้ว' : 'รอดำเนินการ'}</span>
                </div>
                <dl className="priv-ui-scan-result-grid">
                  <div><dt>ผู้รับสิทธิ์</dt><dd>{scanResult.displayName}</dd></div>
                  <div><dt>ทีม</dt><dd>{scanResult.teamCode}{scanResult.teamNameTh ? ` — ${scanResult.teamNameTh}` : ''}</dd></div>
                  <div><dt>โค้ดสิทธิ์</dt><dd>{scanResult.privilegeCode}</dd></div>
                  <div><dt>ประเภท</dt><dd>{privilegeTypeLabel(scanResult.privilegeType)}</dd></div>
                  {scanResult.claimStatus === 'claimed' ? <div><dt>รับเมื่อ</dt><dd>{formatDateTime(scanResult.claimedAt)} ({claimMethodLabel(scanResult.claimMethod)})</dd></div> : null}
                </dl>
                {scanResult.claimStatus === 'pending' ? (
                  <div className="priv-ui-result-action">
                    <button type="button" className="admin-ui-btn admin-ui-btn-primary" onClick={redeemClaim}>
                      <CheckCircle2 size={15} />
                      ยืนยันรับสิทธิ์
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="priv-ui-scan-placeholder">
                <QrCode size={40} />
                <p>สแกน QR หรือกรอกโทเคนแล้วกด “ตรวจสอบ” เพื่อดูข้อมูลผู้รับสิทธิ์ที่นี่</p>
              </div>
            )}
          </div>
        </div>
      </article>

      <article className="admin-ui-panel admin-ui-stack">
        <div className="priv-ui-subhead">
          <strong>รายการรับสิทธิ์</strong>
          <span><b>{pendingClaimsCount}</b> รอดำเนินการ · <b>{claimedClaimsCount}</b> รับแล้ว · {claims.length} ทั้งหมด</span>
        </div>
        <AdminDataTable
          rows={filteredClaims.map((item) => ({ ...item, id: item.claimId }))}
          loading={loading}
          searchKeys={['teamCode', 'teamNameTh', 'displayName', 'privilegeCode', 'privilegeNameTh']}
          searchPlaceholder="ค้นหา ทีม / ชื่อ / สิทธิ์"
          toolbarExtra={
            <div className="priv-ui-table-filters">
              <AdminSelect
                icon={Filter}
                ariaLabel="กรองตามสถานะ"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'ทุกสถานะ' },
                  { value: 'pending', label: 'รอดำเนินการ' },
                  { value: 'claimed', label: 'รับแล้ว' },
                ]}
              />
              <AdminSelect
                icon={Users}
                ariaLabel="กรองตามทีม"
                value={teamFilter}
                onChange={setTeamFilter}
                options={[
                  { value: '', label: 'ทุกทีม' },
                  ...teamOptions.map((team) => ({ value: String(team.teamId), label: `${team.teamCode}${team.teamNameTh ? ` — ${team.teamNameTh}` : ''}` })),
                ]}
              />
              <AdminSelect
                icon={Gift}
                ariaLabel="กรองตามสิทธิ์"
                value={privilegeFilter}
                onChange={setPrivilegeFilter}
                options={[
                  { value: '', label: 'ทุกสิทธิ์' },
                  ...templates.map((template) => ({ value: String(template.privilegeId), label: template.privilegeNameTh })),
                ]}
              />
            </div>
          }
          columns={[
            { key: 'teamCode', label: 'รหัสทีม', render: (row) => <span className="priv-ui-team-code">{row.teamCode}</span> },
            { key: 'teamNameTh', label: 'ชื่อทีม', render: (row) => row.teamNameTh || '—' },
            { key: 'displayName', label: 'ผู้รับสิทธิ์' },
            { key: 'privilegeNameTh', label: 'สิทธิ์' },
            { key: 'claimStatus', label: 'สถานะ', render: (row) => <span className={`admin-ui-status ${row.claimStatus === 'claimed' ? 'admin-ui-status-success' : 'admin-ui-status-warning'}`}>{row.claimStatus === 'claimed' ? 'รับแล้ว' : 'รอดำเนินการ'}</span> },
            { key: 'claimMethod', label: 'วิธีรับ', render: (row) => <span className="priv-ui-muted-cell">{claimMethodLabel(row.claimMethod)}</span> },
            { key: 'claimedAt', label: 'เวลารับ', render: (row) => <span className="priv-ui-muted-cell">{formatDateTime(row.claimedAt)}</span> },
            { key: 'actions', label: 'การจัดการ', render: (row) => <div className="priv-ui-claim-actions"><button type="button" className="admin-ui-mini-btn" disabled={row.claimStatus === 'claimed'} onClick={() => updateClaim(row.claimId, 'claimed')}>ตั้งเป็นรับแล้ว</button><button type="button" className="admin-ui-mini-btn" disabled={row.claimStatus === 'pending'} onClick={() => updateClaim(row.claimId, 'pending')}>รีเซ็ต</button></div> },
          ]}
        />
      </article>

      <DetailDrawer
        open={bulkOpen}
        title="อัปเดตสิทธิ์แบบกลุ่ม"
        subtitle="ปรับสถานะการรับสิทธิ์ของทั้งทีมพร้อมกัน"
        onClose={() => { if (!bulkBusy) setBulkOpen(false) }}
      >
        <div className="admin-ui-form priv-ui-drawer-form">
          <div className="priv-ui-field">
            <span className="priv-ui-field-label">ทีม</span>
            <AdminSelect
              fullWidth
              placeholder="— เลือกทีม —"
              ariaLabel="เลือกทีม"
              value={bulkForm.teamId}
              onChange={(value) => setBulkForm((prev) => ({ ...prev, teamId: value }))}
              options={teamOptions.map((team) => ({ value: String(team.teamId), label: `${team.teamCode}${team.teamNameTh ? ` — ${team.teamNameTh}` : ''}` }))}
            />
          </div>
          <div className="priv-ui-field">
            <span className="priv-ui-field-label">สิทธิ์</span>
            <AdminSelect
              fullWidth
              placeholder="— เลือกสิทธิ์ —"
              ariaLabel="เลือกสิทธิ์"
              value={bulkForm.privilegeId}
              onChange={(value) => setBulkForm((prev) => ({ ...prev, privilegeId: value }))}
              options={templates.map((template) => ({ value: String(template.privilegeId), label: `${template.privilegeCode} — ${template.privilegeNameTh}${template.isPublished ? '' : ' (ฉบับร่าง)'}` }))}
            />
          </div>
          <div className="priv-ui-field">
            <span className="priv-ui-field-label">สถานะรับสิทธิ์</span>
            <AdminSelect
              fullWidth
              ariaLabel="สถานะรับสิทธิ์"
              value={bulkForm.claimStatus}
              onChange={(value) => setBulkForm((prev) => ({ ...prev, claimStatus: value }))}
              options={[
                { value: 'claimed', label: 'รับแล้ว' },
                { value: 'pending', label: 'รอดำเนินการ' },
              ]}
            />
          </div>
          <label>หมายเหตุ
            <input value={bulkForm.claimNote} onChange={(event) => setBulkForm((prev) => ({ ...prev, claimNote: event.target.value }))} placeholder="ไม่บังคับ" />
          </label>

          {bulkForm.teamId ? <p className="priv-ui-hint">ระบบจะปรับสถานะให้สมาชิกทุกคนในทีมที่เลือกสำหรับสิทธิ์นี้</p> : null}

          <div className="priv-ui-drawer-foot">
            <button type="button" className="admin-ui-btn" onClick={() => setBulkOpen(false)} disabled={bulkBusy}>ยกเลิก</button>
            <button type="button" className="admin-ui-btn admin-ui-btn-primary" disabled={!bulkForm.teamId || !bulkForm.privilegeId || bulkBusy} onClick={applyTeamBulk}>
              {bulkBusy ? 'กำลังอัปเดต...' : 'อัปเดตทั้งทีม'}
            </button>
          </div>
        </div>
      </DetailDrawer>
    </div>
  )
}
