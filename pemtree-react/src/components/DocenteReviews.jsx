import { useEffect, useMemo, useState } from 'react';
import { ThumbsUp, ThumbsDown, LogIn } from 'lucide-react';
import { cargarReputacion, getDocente, getReputacionDocente, recomendarDocente } from '../modules/data/catalogo';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

function nivelSentimiento(pct) {
    if (pct >= 70) return { label: 'Muy recomendado', color: '#2E9E5B' };
    if (pct >= 50) return { label: 'Recomendaciones mixtas', color: '#B7791F' };
    return { label: 'Poco recomendado', color: '#C0392B' };
}

/**
 * Reseñas de un catedrático estilo Steam (compacto): barra + % de recomendación
 * con icono de opiniones, y botones de recomendar/no recomendar. Las descripciones
 * textuales se muestran en tooltips (title). `nombre` es el nombre del catedrático
 * tal como aparece en el horario. Requiere sesión (Supabase) para votar.
 */
export default function DocenteReviews({ nombre }) {
    const docente = useMemo(() => getDocente(nombre), [nombre]);
    const [, setVersion] = useState(0);
    const [busy, setBusy] = useState(false);
    const [needLogin, setNeedLogin] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const rep = docente ? getReputacionDocente(docente) : null;

    useEffect(() => {
        if (!docente) return;
        let active = true;
        cargarReputacion()
            .catch(() => {})
            .finally(() => { if (active) setVersion(v => v + 1); });
        return () => { active = false; };
    }, [docente]);

    if (!docente) return null;

    const pct = rep && rep.total > 0 ? rep.pct_recomienda : null;
    const sent = pct != null ? nivelSentimiento(pct) : null;

    async function votar(recomienda) {
        if (busy) return;
        setBusy(true);
        setFeedback(null);
        setNeedLogin(false);
        const { error } = await recomendarDocente(docente, recomienda);
        if (error) {
            setFeedback({ type: 'error', text: error.message });
            if (error.message && /iniciar sesi/i.test(error.message)) setNeedLogin(true);
        } else {
            try { await cargarReputacion(); } catch { /* la caché ya se invalidó; se reintenta sola */ }
            setVersion(v => v + 1);
        }
        setBusy(false);
    }

    async function iniciarSesion() {
        if (!isSupabaseConfigured || !supabase) return;
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/visualizador' },
        });
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
                    title="Sin opiniones aún — sé el primero en recomendar"
                >
                    0%
                </span>
            ) : null}

            <button
                type="button"
                className={`schedule-reco-btn up ${rep?.miVoto === true ? 'active' : ''}`}
                onClick={() => votar(true)}
                disabled={busy}
                title={rep?.miVoto === true ? 'Quitar mi recomendación' : 'Recomendar a este catedrático'}
                aria-label={rep?.miVoto === true ? 'Quitar mi recomendación' : 'Recomendar a este catedrático'}
            >
                <ThumbsUp size={11} />
            </button>
            <button
                type="button"
                className={`schedule-reco-btn down ${rep?.miVoto === false ? 'active' : ''}`}
                onClick={() => votar(false)}
                disabled={busy}
                title={rep?.miVoto === false ? 'Quitar mi voto' : 'No recomendar a este catedrático'}
                aria-label={rep?.miVoto === false ? 'Quitar mi voto' : 'No recomendar a este catedrático'}
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
