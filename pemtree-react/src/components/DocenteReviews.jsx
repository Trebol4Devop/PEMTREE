import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, LogIn } from 'lucide-react';
import { cargarReputacion, getReputacionSeccion, recomendarSeccion } from '../modules/data/catalogo';

function nivelSentimiento(pct) {
    if (pct >= 70) return { label: 'Muy recomendada', color: '#2E9E5B' };
    if (pct >= 50) return { label: 'Recomendaciones mixtas', color: '#B7791F' };
    return { label: 'Poco recomendada', color: '#C0392B' };
}

/**
 * Reseñas de una sección de curso estilo Steam (compacto): barra + % de recomendación
 * con icono de opiniones, y botones de recomendar/no recomendar.
 * Vinculado exclusivamente al curso y su sección (sin vincular nombres personales).
 */
export default function DocenteReviews({ cursoCodigo, seccion }) {
    const [, setVersion] = useState(0);
    const [busy, setBusy] = useState(false);
    const [needLogin, setNeedLogin] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const rep = (cursoCodigo && seccion) ? getReputacionSeccion(cursoCodigo, seccion) : null;

    useEffect(() => {
        if (!cursoCodigo || !seccion) return;
        let active = true;
        cargarReputacion()
            .catch(() => {})
            .finally(() => { if (active) setVersion(v => v + 1); });
        return () => { active = false; };
    }, [cursoCodigo, seccion]);

    if (!cursoCodigo || !seccion) return null;

    const pct = rep && rep.total > 0 ? rep.pct_recomienda : null;
    const sent = pct != null ? nivelSentimiento(pct) : null;

    async function votar(recomienda) {
        if (busy) return;
        setBusy(true);
        setFeedback(null);
        setNeedLogin(false);
        const { error } = await recomendarSeccion(cursoCodigo, seccion, recomienda);
        if (error) {
            setFeedback({ type: 'error', text: error.message });
            if (error.message && /iniciar sesi/i.test(error.message)) setNeedLogin(true);
        } else {
            try { await cargarReputacion(); } catch { /* la caché ya se invalidó */ }
            setVersion(v => v + 1);
        }
        setBusy(false);
    }

    function iniciarSesion() {
        window.dispatchEvent(new CustomEvent('pemtree-open-auth-modal'));
    }

    return (
        <div className="schedule-reco" onClick={e => e.stopPropagation()}>
            {pct != null ? (
                <span
                    className="schedule-reco-pct"
                    style={{ color: sent.color }}
                    title={`${sent.label} (${pct}% de ${rep.total} opiniones)`}
                >
                    {pct}%
                </span>
            ) : rep ? (
                <span
                    className="schedule-reco-pct"
                    style={{ color: 'var(--text-muted)' }}
                    title="Sin opiniones aún — sé el primero en recomendar esta sección"
                >
                    0%
                </span>
            ) : null}

            <button
                type="button"
                className={`schedule-reco-btn up ${rep?.miVoto === true ? 'active' : ''}`}
                onClick={() => votar(true)}
                disabled={busy}
                title={rep?.miVoto === true ? 'Quitar mi recomendación' : 'Recomendar esta sección'}
                aria-label={rep?.miVoto === true ? 'Quitar mi recomendación' : 'Recomendar esta sección'}
            >
                <ThumbsUp size={11} />
            </button>
            <button
                type="button"
                className={`schedule-reco-btn down ${rep?.miVoto === false ? 'active' : ''}`}
                onClick={() => votar(false)}
                disabled={busy}
                title={rep?.miVoto === false ? 'Quitar mi voto' : 'No recomendar esta sección'}
                aria-label={rep?.miVoto === false ? 'Quitar mi voto' : 'No recomendar esta sección'}
            >
                <ThumbsDown size={11} />
            </button>
            {needLogin && (
                <button
                    type="button"
                    className="schedule-reco-btn login"
                    onClick={iniciarSesion}
                    title="Inicia sesión para opinar"
                    aria-label="Inicia sesión para opinar"
                >
                    <LogIn size={11} />
                </button>
            )}
            {feedback && !needLogin && (
                <span className="schedule-reco-feedback error">{feedback.text}</span>
            )}
        </div>
    );
}

export { DocenteReviews as SeccionReviews };
