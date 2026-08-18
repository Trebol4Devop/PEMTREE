import { Link } from 'react-router-dom';
import { Wrench, ArrowLeft, Layers, Calendar } from 'lucide-react';
import Seo from '../components/seo/Seo';
import { Card, Button } from '../components/ui';

export default function Maintenance() {
    return (
        <>
            <Seo
                title="Módulo en Mantenimiento | PEMTREE"
                description="El Foro Estudiantil y el directorio de Grupos se encuentran temporalmente en mantenimiento."
            />
            <div className="flex-1 overflow-y-auto bg-[#F4F5F7] dark:bg-[#0E1624] p-4 sm:p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Card className="max-w-lg w-full text-center p-6 sm:p-8 flex flex-col items-center gap-5 shadow-xl border border-[#DFE1E6] dark:border-[#3E4C5E]">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                        <Wrench size={32} />
                    </div>

                    <div>
                        <span className="inline-block px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 rounded-full border border-amber-200 dark:border-amber-800/50 mb-2">
                            Temporalmente Inhabilitado
                        </span>
                        <h1 className="text-xl sm:text-2xl font-black text-[#172B4D] dark:text-white tracking-tight">
                            Módulo en Mantenimiento
                        </h1>
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 mt-2 leading-relaxed">
                            El Foro Estudiantil y el directorio de Grupos se encuentran temporalmente fuera de servicio por mantenimiento y mejoras en la plataforma.
                        </p>
                    </div>

                    <div className="w-full bg-slate-50 dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-xl p-3.5 text-left text-xs text-[#5E6C84] dark:text-slate-300 flex flex-col gap-2">
                        <p className="font-bold text-[#172B4D] dark:text-slate-100 flex items-center gap-1.5">
                            <span>🛠️</span>
                            <span>Servicios que continúan 100% operativos:</span>
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-[11px] sm:text-xs">
                            <li>Visualizador interactivo de Pensum y prerrequisitos</li>
                            <li>Planificador semestral y de vacaciones</li>
                            <li>Buscador y generador de horarios por sección</li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-2">
                        <Link to="/visualizador" className="w-full sm:flex-1 no-underline">
                            <Button variant="primary" className="w-full justify-center">
                                <Layers size={16} />
                                <span>Visualizador</span>
                            </Button>
                        </Link>
                        <Link to="/visualizador?view=schedule" className="w-full sm:flex-1 no-underline">
                            <Button variant="secondary" className="w-full justify-center">
                                <Calendar size={16} />
                                <span>Horarios</span>
                            </Button>
                        </Link>
                    </div>

                    <Link to="/" className="inline-flex items-center gap-1 text-xs font-semibold text-[#0052CC] dark:text-[#4C9AFF] hover:underline no-underline">
                        <ArrowLeft size={13} />
                        <span>Volver a la página principal</span>
                    </Link>
                </Card>
            </div>
        </>
    );
}
