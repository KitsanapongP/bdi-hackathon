import React, { useRef, useEffect, useCallback, useMemo } from 'react';

/* ─────────────────────── seeded PRNG (mulberry32) ─────────────────────── */
function mulberry32(seed) {
    let s = seed | 0;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ──────────────── Poisson-disk-like min-distance placement ────────────── */
function poissonPlace(count, w, h, minDist, rng, margin = 40) {
    const pts = [];
    const md2 = minDist * minDist;
    let attempts = 0;
    const maxAttempts = count * 80;
    while (pts.length < count && attempts < maxAttempts) {
        attempts++;
        const x = margin + rng() * (w - margin * 2);
        const y = margin + rng() * (h - margin * 2);
        let ok = true;
        for (const p of pts) {
            const dx = p.x - x, dy = p.y - y;
            if (dx * dx + dy * dy < md2) { ok = false; break; }
        }
        if (ok) pts.push({ x, y });
    }
    return pts;
}

/* ────────────────────── SVG shape path strings ───────────────────────── */
const shapePaths = {
    triangle: (s) => {
        // Use padded coordinates so stroke tips are not clipped
        const pad = s * 0.12;
        const h = (s - pad * 2) * 0.866;
        return `M ${s / 2} ${pad} L ${s - pad} ${pad + h} L ${pad} ${pad + h} Z`;
    },
    circle: (s) => null, // handled separately
    square: (s) => `M 2 2 L ${s - 2} 2 L ${s - 2} ${s - 2} L 2 ${s - 2} Z`,
    cross: (s) => {
        const a = s * 0.1, b = s * 0.4, c = s * 0.5, d = s * 0.8;
        return `M ${b} ${a} L ${c} ${a} L ${c} ${b} L ${d} ${b} L ${d} ${c} L ${c} ${c} L ${c} ${d} L ${b} ${d} L ${b} ${c} L ${a} ${c} L ${a} ${b} L ${b} ${b} Z`;
    }
};

const defaultColors = {
    triangle: '#2ecc71',
    circle: '#e74c3c',
    square: '#f1c40f',
    cross: '#5dade2',
};

const shapeTypes = ['triangle', 'circle', 'square', 'cross'];

/* ═══════════════════════════ Component ═══════════════════════════════ */
const GameShapes = ({
    shapeCount = 20,
    sizeRange = [24, 52],
    speedRange = [18, 40],
    rotationRange = [0, 360],
    depthLayers = 3,
    minDistance = 60,
    seed = 42,
    colors = defaultColors,
    className = '',
}) => {
    const containerRef = useRef(null);
    const shapesRef = useRef([]);     // DOM node refs
    const dataRef = useRef([]);       // shape metadata
    const rafRef = useRef(null);
    const pausedRef = useRef(false);
    const reducedMotionRef = useRef(false);

    /* ── generate shape data (deterministic) ── */
    const shapeData = useMemo(() => {
        const rng = mulberry32(seed);
        const w = 1920, h = 1080; // virtual canvas, remapped on mount
        const positions = poissonPlace(shapeCount, w, h, minDistance, rng);
        return positions.map((pos, i) => {
            const type = shapeTypes[i % shapeTypes.length];
            const depth = Math.floor(rng() * depthLayers);       // 0=far … depthLayers-1=near
            const depthT = depthLayers > 1 ? depth / (depthLayers - 1) : 1;
            const size = sizeRange[0] + rng() * (sizeRange[1] - sizeRange[0]);
            const speed = speedRange[0] + rng() * (speedRange[1] - speedRange[0]);
            const rot0 = rng() * (rotationRange[1] - rotationRange[0]) + rotationRange[0];
            const floatAmpX = 6 + rng() * 14;
            const floatAmpY = 8 + rng() * 18;
            const floatPhase = rng() * Math.PI * 2;
            return {
                id: i,
                type,
                xPct: pos.x / w,
                yPct: pos.y / h,
                size,
                speed,
                rot0,
                depth,
                depthT,         // 0=far, 1=near
                opacity: 0.2 + depthT * 0.6,
                blur: Math.max(0, (1 - depthT) * 1.2),
                scale: 0.6 + depthT * 0.4,
                color: colors[type] || defaultColors[type],
                floatAmpX,
                floatAmpY,
                floatPhase,
            };
        });
    }, [shapeCount, sizeRange, speedRange, rotationRange, depthLayers, minDistance, seed, colors]);

    /* ── animation loop (rAF, zero re-renders) ── */
    const animate = useCallback(() => {
        if (pausedRef.current) { rafRef.current = requestAnimationFrame(animate); return; }
        const now = performance.now() / 1000;
        const reduced = reducedMotionRef.current;

        for (let i = 0; i < dataRef.current.length; i++) {
            const d = dataRef.current[i];
            const el = shapesRef.current[i];
            if (!el) continue;

            /* float offset */
            let fx = 0, fy = 0, rot = d.rot0;
            if (!reduced) {
                const sp = d.speed * 0.03;
                fx = Math.sin(now * sp + d.floatPhase) * d.floatAmpX;
                fy = Math.cos(now * sp * 0.7 + d.floatPhase) * d.floatAmpY;
                rot = d.rot0 + Math.sin(now * sp * 0.3) * 15;
            }

            el.style.transform =
                `translate(${fx.toFixed(1)}px, ${fy.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${d.scale.toFixed(3)})`;
            el.style.filter = d.blur > 0.1 ? `blur(${d.blur}px)` : 'none';
        }

        rafRef.current = requestAnimationFrame(animate);
    }, []);

    /* ── mount: store data, start loop, listeners ── */
    useEffect(() => {
        dataRef.current = shapeData;

        /* reduced motion */
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        reducedMotionRef.current = mq.matches;
        const onMqChange = (e) => { reducedMotionRef.current = e.matches; };
        mq.addEventListener('change', onMqChange);

        /* visibility */
        const onVis = () => { pausedRef.current = document.hidden; };
        document.addEventListener('visibilitychange', onVis);

        /* start */
        rafRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(rafRef.current);
            mq.removeEventListener('change', onMqChange);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [shapeData, animate]);

    /* ── click pop effect ── */
    const handleClick = useCallback((e, idx) => {
        const el = shapesRef.current[idx];
        if (!el) return;
        const ripple = document.createElement('span');
        Object.assign(ripple.style, {
            position: 'absolute',
            inset: '-8px',
            borderRadius: '50%',
            border: `2px solid ${dataRef.current[idx]?.color || '#fff'}`,
            opacity: '0.8',
            pointerEvents: 'none',
            animation: 'game-shape-pop 0.5s ease-out forwards',
        });
        el.appendChild(ripple);
        setTimeout(() => ripple.remove(), 550);
    }, []);

    /* ── render SVG shapes ── */
    const renderShape = (d) => {
        const s = d.size;
        const stroke = d.color;
        const sw = Math.max(2.5, s * 0.08);
        if (d.type === 'circle') {
            return (
                <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
                    <circle cx={s / 2} cy={s / 2} r={s / 2 - sw} stroke={stroke} strokeWidth={sw} />
                </svg>
            );
        }
        if (d.type === 'cross') {
            const path = shapePaths.cross(s);
            return (
                <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
                    <path d={path} fill={stroke} strokeLinejoin="round" />
                </svg>
            );
        }
        const path = shapePaths[d.type]?.(s);
        if (!path) return null;
        return (
            <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
                <path d={path} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
        );
    };

    return (
        <>
            <style>{`
        @keyframes game-shape-pop {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
            <div
                ref={containerRef}
                className={`game-shapes-container ${className}`}
                style={{
                    position: 'fixed',
                    inset: 0,
                    overflow: 'hidden',
                    zIndex: 0,
                    pointerEvents: 'none',
                }}
            >
                {shapeData.map((d, i) => (
                    <div
                        key={d.id}
                        ref={(el) => { shapesRef.current[i] = el; }}
                        onClick={(e) => handleClick(e, i)}
                        style={{
                            position: 'absolute',
                            left: `${(d.xPct * 100).toFixed(2)}%`,
                            top: `${(d.yPct * 100).toFixed(2)}%`,
                            width: d.size,
                            height: d.size,
                            opacity: d.opacity,
                            willChange: 'transform, filter',
                            pointerEvents: 'auto',
                            cursor: 'pointer',
                            transition: 'filter 0.2s ease',
                        }}
                    >
                        {renderShape(d)}
                    </div>
                ))}
            </div>
        </>
    );
};

export default GameShapes;
