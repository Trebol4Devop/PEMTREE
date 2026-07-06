import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Users, Lock, BarChart4, GitBranch, Mail, Link as LinkIcon,
    Compass, Calendar, Clock, Search, CheckCircle2, Layers,
    Copy, BookOpen, AlertTriangle, Download, Pin, Filter,
    EyeOff, Sparkles, GitMerge, Sun, Moon
} from 'lucide-react';
import Seo from '../components/seo/Seo';
import CareerCard from '../components/CareerCard';

export default function Home() {
    const navigate = useNavigate();
    const [careers, setCareers] = useState([]);

    useEffect(() => {
        let cancelled = false;
        const loadCareers = async () => {
            try {
                const res = await fetch('/json/index.json');
                if (!res.ok) return;
                const list = await res.json();
                if (!Array.isArray(list) || cancelled) return;

                const enriched = await Promise.all(list.map(async (entry) => {
                    const file = entry.file;
                    const name = entry.name;
                    const base = file.replace(/\.json$/i, '').replace(/_\d{2,4}$/, '');
                    const yearMatch = file.replace(/\.json$/i, '').match(/_(\d{2,4})$/);
                    const year = yearMatch ? `20${yearMatch[1]}` : '';
                    const shortName = name
                        .replace(/^Ingenier[ií]a\s+/i, '')
                        .replace(/\s*\(\d{4}\)\s*$/, '')
                        .trim();
                    const jsonFile = `/json/${file}`;

                    let colors = { color1: '#0052CC', color2: '#DEEBFF', color3: '#0052CC' };
                    try {
                        const cRes = await fetch(`/pensum_color/${base}_color.json`);
                        if (cRes.ok) {
                            const cJson = await cRes.json();
                            colors = {
                                color1: cJson.color1 || colors.color1,
                                color2: cJson.color2 || colors.color2,
                                color3: cJson.color3 || cJson.color1 || colors.color3,
                            };
                        }
                    } catch {
                        // keep defaults
                    }
                    return { name, shortName, base, jsonFile, colors, year };
                }));

                if (!cancelled) setCareers(enriched);
            } catch (err) {
                console.debug('Error cargando carreras:', err);
            }
        };
        loadCareers();
        return () => { cancelled = true; };
    }, []);

    const handleSelectCareer = (jsonFile) => {
        try {
            localStorage.setItem('pemtree_pensum_actual', jsonFile);
        } catch {
            // ignore
        }
        navigate('/visualizador');
    };

    const team = [
        {
            name: 'Jose Monzon',
            role: 'Frontend Developer & UI/UX Designer',
            avatar: 'https://github.com/0520Jose.png',
            github: 'https://github.com/0520Jose'
        },
        {
            name: 'Diego Vasquez',
            role: 'QA & Testing',
            avatar: 'https://github.com/DiegVas.png',
            github: 'https://github.com/DiegVas'
        },
        {
            name: 'Carlos del Cid',
            role: 'Backend Developer',
            avatar: 'https://github.com/Carlosdelcid05.png',
            github: 'https://github.com/Carlosdelcid05'
        },
        {
            name: 'Ottoniel Vasquez',
            role: 'Backend Developer',
            avatar: 'https://github.com/Farot3.png',
            github: 'https://github.com/Farot3'
        }
    ];

    const FEATURE_COLORS = {
        blue:   { bg: 'bg-[#DEEBFF] dark:bg-[#0C295E]', text: 'text-[#0052CC] dark:text-[#4C9AFF]' },
        green:  { bg: 'bg-[#E3FCEF] dark:bg-[#0A3622]', text: 'text-[#006644] dark:text-[#79F2B8]' },
        orange: { bg: 'bg-[#FFF0B3] dark:bg-[#5C4000]', text: 'text-[#A54800] dark:text-[#FFD666]' },
        red:    { bg: 'bg-[#FFEBE6] dark:bg-[#450A0A]', text: 'text-[#BF2600] dark:text-[#F87171]' },
        purple: { bg: 'bg-[#EADDFF] dark:bg-[#2E1065]', text: 'text-[#7030A0] dark:text-[#C4A8FF]' },
        cyan:   { bg: 'bg-[#E0F2FE] dark:bg-[#0C4A6E]', text: 'text-[#0369A1] dark:text-[#7DD3FC]' },
    };

    function FeatureCard({ icon: Icon, color, title, text }) {
        const c = FEATURE_COLORS[color] || FEATURE_COLORS.blue;
        return (
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-[#0E1624] transition-colors">
                <div className={`w-9 h-9 rounded-md ${c.bg} ${c.text} flex items-center justify-center shrink-0`}>
                    <Icon size={16} />
                </div>
                <div className="min-w-0">
                    <h4 className="font-bold text-sm text-[#172B4D] dark:text-slate-100">{title}</h4>
                    <p className="text-xs text-[#5E6C84] dark:text-slate-400 leading-relaxed mt-0.5">{text}</p>
                </div>
            </div>
        );
    }

    return (
        <>
        <Seo pathname="/" />
        <div className="flex-1 flex flex-col items-center overflow-y-auto w-full hide-scrollbar">
            
            <section
                className="w-full bg-center bg-no-repeat bg-cover relative"
                style={{ backgroundImage: "url('/images/fondo.png')" }}
            >
                <div className="absolute inset-0 bg-white/45 dark:bg-[#0E1624]/55"></div>
                <div className="pt-24 sm:pt-32 pb-12 sm:pb-16 px-4 text-center max-w-6xl mx-auto flex flex-col items-center relative z-10">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E] px-3.5 py-1 rounded-full mb-5 shadow-xs">
                        pensum interactivo
                    </p>

                    <h1 className="text-[44px] md:text-[62px] leading-[1.1] font-extrabold text-[#172B4D] dark:text-white tracking-tight max-w-3xl">
                        PEMTREE: <br />
                        Descubre la ruta de tu <span className="relative inline-block">
                            Pensum
                            <svg className="absolute left-0 bottom-[-10px] w-full h-3" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0,5 Q50,10 100,5" stroke="#FFAB00" strokeWidth="5" fill="none" strokeLinecap="round" />
                            </svg>
                        </span>
                    </h1>

                    <p className="text-[17px] md:text-[20px] text-[#5E6C84] dark:text-slate-400 mt-10 max-w-2xl leading-relaxed font-normal">
                        Estudia las rutas, prerrequisitos y dependencias de los <span className="font-semibold text-slate-800 dark:text-slate-100">Pensum CLAR 2022/2025</span> todas la carrreras de FIUSAC mediante un tablero interactivo.
                    </p>

                    <div className="mt-10 w-full mx-auto flex flex-wrap justify-center gap-10 sm:gap-12 lg:gap-16">
                        {careers.map(c => (
                            <CareerCard
                                key={c.jsonFile}
                                name={c.name}
                                shortName={c.shortName}
                                base={c.base}
                                jsonFile={c.jsonFile}
                                colors={c.colors}
                                year={c.year}
                                onSelect={handleSelectCareer}
                            />
                        ))}
                    </div>
                </div>
            </section>

            <section className="w-full bg-[#FAFBFC] dark:bg-[#0E1624] border-t border-[#DFE1E6] dark:border-[#3E4C5E] py-16 px-4 shrink-0 flex-grow">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E] inline-block px-3 py-1 rounded-full mb-4">
                            Herramientas
                        </p>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-[#172B4D] dark:text-white tracking-tight mb-3">
                            Tres herramientas, una sola plataforma
                        </h2>
                        <p className="text-sm text-[#5E6C84] dark:text-slate-400 max-w-2xl mx-auto">
                            Visualiza, planifica y arma tu horario desde un mismo lugar.
                        </p>
                    </div>

                    {/* Visualizador */}
                    <div className="mb-10 bg-white dark:bg-[#1C2636] rounded-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-sm overflow-hidden">
                        <div className="p-6 sm:p-8 border-b border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center shrink-0">
                                    <Compass size={22} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-[#172B4D] dark:text-white tracking-tight">Visualizador</h3>
                                    <p className="text-sm text-[#5E6C84] dark:text-slate-400 mt-1 max-w-xl">
                                        Tablero interactivo con todos los cursos de tu pensum, organizados por semestre y conectados por sus prerrequisitos.
                                    </p>
                                </div>
                            </div>
                            <Link to="/visualizador" className="shrink-0 bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] dark:text-[#0E1624] text-white font-bold text-sm px-4 py-2 rounded transition shadow-sm cursor-pointer no-underline text-center whitespace-nowrap">
                                Abrir Visualizador
                            </Link>
                        </div>
                        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { icon: GitBranch, color: 'blue', title: 'Grafo de prerrequisitos', text: 'Conexiones visuales entre cursos: haz clic en cualquier nodo para iluminar sus dependencias y cursos que lo requieren.' },
                                { icon: Lock, color: 'red', title: 'Lógica de bloqueo', text: 'Los cursos se bloquean automáticamente hasta que apruebes todos sus prerrequisitos.' },
                                { icon: CheckCircle2, color: 'green', title: 'Marca tu progreso', text: 'Marca cursos como Aprobado, Cursando o Disponible. Tu avance se guarda automáticamente.' },
                                { icon: Compass, color: 'orange', title: 'Ruta crítica', text: 'Tres rutas optimizadas: Más Rápida, Más Flexible y Balanceada, considerando créditos y electivos.' },
                                { icon: BarChart4, color: 'purple', title: 'Métricas en vivo', text: 'Contador de créditos aprobados, requisitos de graduación (300 cr) y área Social Humanística (8 cr).' },
                                { icon: Search, color: 'cyan', title: 'Búsqueda instantánea', text: 'Busca por código o nombre y selecciona el curso para centrarlo en el grafo.' },
                            ].map(f => (
                                <FeatureCard key={f.title} {...f} />
                            ))}
                        </div>
                    </div>

                    {/* Planificador */}
                    <div className="mb-10 bg-white dark:bg-[#1C2636] rounded-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-sm overflow-hidden">
                        <div className="p-6 sm:p-8 border-b border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#E3FCEF] dark:bg-[#0A3622] text-[#006644] dark:text-[#79F2B8] flex items-center justify-center shrink-0">
                                    <Calendar size={22} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-[#172B4D] dark:text-white tracking-tight">Planificador</h3>
                                    <p className="text-sm text-[#5E6C84] dark:text-slate-400 mt-1 max-w-xl">
                                        Arrastra y suelta cursos en los semestres y escuelas de vacaciones para diseñar tu línea académica.
                                    </p>
                                </div>
                            </div>
                            <Link to="/visualizador?view=planner" className="shrink-0 bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] dark:text-[#0E1624] text-white font-bold text-sm px-4 py-2 rounded transition shadow-sm cursor-pointer no-underline text-center whitespace-nowrap">
                                Abrir Planificador
                            </Link>
                        </div>
                        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { icon: GitMerge, color: 'blue', title: 'Drag & Drop', text: 'Arrastra cursos desde el pool hacia semestres o vacaciones. Mueve entre bloques con validación en tiempo real.' },
                                { icon: Sparkles, color: 'green', title: 'Múltiples líneas de planificación', text: 'Crea variantes como "Ruta rápida" o "Con vacaciones" y compara créditos totales entre ellas.' },
                                { icon: BarChart4, color: 'orange', title: 'Límite por créditos CLAR', text: 'Calcula tu máximo permitido según tu promedio (32/37/42 cr) y detecta excedentes automáticamente.' },
                                { icon: Lock, color: 'red', title: 'Validación de prerrequisitos', text: 'Impide planificar un curso si faltan prerrequisitos en semestres anteriores. Opción de desactivar disponible.' },
                                { icon: Copy, color: 'cyan', title: 'Carreras simultáneas', text: 'Carga un segundo pensum y planifica dos carreras en paralelo con el bono de +5 créditos.' },
                            ].map(f => (
                                <FeatureCard key={f.title} {...f} />
                            ))}
                        </div>
                    </div>

                    {/* Armador de horarios */}
                    <div className="mb-2 bg-white dark:bg-[#1C2636] rounded-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-sm overflow-hidden">
                        <div className="p-6 sm:p-8 border-b border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#FFF0B3] dark:bg-[#5C4000] text-[#A54800] dark:text-[#FFD666] flex items-center justify-center shrink-0">
                                    <Clock size={22} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-[#172B4D] dark:text-white tracking-tight">Armador de Horarios</h3>
                                    <p className="text-sm text-[#5E6C84] dark:text-slate-400 mt-1 max-w-xl">
                                        Visualiza, combina y exporta tus horarios por semestre o vacaciones con datos actualizados de FIUSAC.
                                    </p>
                                </div>
                            </div>
                            <Link to="/visualizador?view=schedule" className="shrink-0 bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] dark:text-[#0E1624] text-white font-bold text-sm px-4 py-2 rounded transition shadow-sm cursor-pointer no-underline text-center whitespace-nowrap">
                                Abrir Horarios
                            </Link>
                        </div>
                        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { icon: Clock, color: 'orange', title: 'Vista semanal interactiva', text: 'Cuadrícula de lunes a sábado con bloques de tiempo. Haz clic en una sección para agregarla o quitarla.' },
                                { icon: Search, color: 'blue', title: 'Búsqueda por docente', text: 'Encuentra cursos por catedrático o auxiliar, además de código, nombre, edificio o salón.' },
                                { icon: Filter, color: 'purple', title: 'Filtro por modalidad', text: 'Filtra entre Presencial, Semipresencial y Virtual. Combina con búsqueda para encontrar secciones específicas.' },
                                { icon: AlertTriangle, color: 'red', title: 'Detección de conflictos', text: 'Resalta traslapes entre secciones elegidas con advertencias en tiempo real.' },
                                { icon: Pin, color: 'cyan', title: 'Cursos fijados', text: 'Fija cursos que estás considerando llevar para no perderlos de vista, incluso si tienen traslapes u otros problemas con tu horario actual.' },
                                { icon: Download, color: 'green', title: 'Exportar como PNG', text: 'Descarga tu horario final como imagen PNG lista para compartir o imprimir.' },
                            ].map(f => (
                                <FeatureCard key={f.title} {...f} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="w-full bg-white dark:bg-[#0F1726] border-t border-[#DFE1E6] dark:border-[#3E4C5E] py-16 px-4 shrink-0">
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[#172B4D] dark:text-white tracking-tight">
                        Desarrollado por <span className="text-[#0052CC] dark:text-[#74C0FC]">Trebol4Devop</span>
                    </h2>
                    <p className="text-sm text-[#5E6C84] dark:text-slate-400 mt-2">
                        Estudiantes de la Universidad de San Carlos de Guatemala (USAC).
                    </p>

                    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {team.map(member => (
                            <div key={member.name} className="bg-[#F4F5F7] dark:bg-[#1C2636] rounded-2xl p-6 shadow-sm border border-transparent hover:border-[#DEEBFF] dark:hover:border-[#3E4C5E] transition-colors">
                                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#DEEBFF] to-[#DEEBFF] dark:from-[#1C2636] dark:to-[#0E1624] flex items-center justify-center overflow-hidden">
                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                </div>
                                <h3 className="mt-4 text-base font-extrabold text-[#172B4D] dark:text-slate-100">
                                    {member.name}
                                </h3>
                                <p className="text-[11px] font-extrabold text-[#172B4D] dark:text-slate-300 tracking-widest mt-2">
                                    {member.role.toUpperCase()}
                                </p>
                                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#7A869A] dark:text-slate-400">
                                    <a href={member.github} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-90 transition">
                                        <GitBranch size={14} />
                                        <span>GitHub</span>
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 text-xs text-[#5E6C84] dark:text-slate-400 border-t border-[#DFE1E6] dark:border-[#3E4C5E] pt-6">
                        Tecnologias: <span className="font-semibold text-[#172B4D] dark:text-slate-100">React&Vite</span> • <span className="font-semibold text-[#172B4D] dark:text-slate-100">Node.js</span> • <span className="font-semibold text-[#172B4D] dark:text-slate-100">TailwindCSS</span>
                    </div>
                </div>
            </section>

            <footer className="bg-[#172B4D] dark:bg-[#0E1624] text-white py-8 px-4 mt-auto select-none w-full shrink-0">
                <div className="max-w-6xl mx-auto flex flex-col items-center gap-3">
                    <img src="/images/logo_trebol.png" alt="Trebol4Devop" className="w-9 h-9 logo-trebol" />
                    <p className="text-sm font-semibold text-center"><strong>PEMTREE</strong> es un proyecto con fines educativos.</p>
                    <div className="flex items-center gap-6 text-sm font-semibold">
                        <a href="https://github.com/trebol4devop" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-90 transition">
                            <GitBranch size={16} /> GitHub
                        </a>
                        <a href="mailto:trebol4devop@proton.me" className="flex items-center gap-2 hover:opacity-90 transition">
                            <Mail size={16} /> Contacto
                        </a>
                        <a href="https://www.linkedin.com/company/trebol4devop/" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-90 transition">
                            <LinkIcon size={16} /> LinkedIn
                        </a>
                    </div>
                    <p className="text-xs text-white/70">© {new Date().getFullYear()} - Trebol4Devop</p>
                </div>
            </footer>
        </div>
        </>
    );
}