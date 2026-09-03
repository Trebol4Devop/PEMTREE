import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { handleCommunityAuthCallback } from '../lib/communityAuth';

export default function AuthCallback() {
    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;

        async function processLogin() {
            try {
                const { returnTo } = await handleCommunityAuthCallback();
                if (!isMounted) return;
                setStatus('success');
                // Redirigir suavemente de vuelta a donde estaba el usuario
                setTimeout(() => {
                    navigate(returnTo || '/', { replace: true });
                }, 800);
            } catch (err) {
                console.error('Error procesando callback de autenticación:', err);
                if (!isMounted) return;
                setStatus('error');
                setErrorMessage(err.message || 'No se pudo completar la sincronización de sesión.');
            }
        }

        processLogin();

        return () => {
            isMounted = false;
        };
    }, [navigate]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full p-8 rounded-2xl bg-[#FAFBFC] dark:bg-[#151D2A] border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-sm flex flex-col items-center gap-4">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-10 h-10 text-[#0052CC] dark:text-[#4C9AFF] animate-spin" />
                        <h2 className="text-lg font-bold text-[#172B4D] dark:text-slate-100">
                            Conectando con la Comunidad...
                        </h2>
                        <p className="text-xs text-[#5E6C84] dark:text-slate-400">
                            Validando credenciales y sincronizando tu sesión de forma segura.
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle2 className="w-10 h-10 text-[#059669] dark:text-[#10B981]" />
                        <h2 className="text-lg font-bold text-[#172B4D] dark:text-slate-100">
                            ¡Sesión iniciada con éxito!
                        </h2>
                        <p className="text-xs text-[#5E6C84] dark:text-slate-400">
                            Redirigiéndote a PEMTREE...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <AlertCircle className="w-10 h-10 text-[#BF2600] dark:text-[#FF6369]" />
                        <h2 className="text-lg font-bold text-[#172B4D] dark:text-slate-100">
                            No se pudo iniciar sesión
                        </h2>
                        <p className="text-xs text-[#BF2600] dark:text-[#FF6369] bg-[#FFEBE6] dark:bg-[#450A0A]/50 p-3 rounded-lg border border-red-200 dark:border-[#FF6369]/30">
                            {errorMessage}
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate('/', { replace: true })}
                            className="mt-2 text-xs font-semibold px-4 py-2 rounded-lg bg-[#0052CC] hover:bg-[#0747A6] text-white transition-colors cursor-pointer"
                        >
                            Regresar a PEMTREE
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
