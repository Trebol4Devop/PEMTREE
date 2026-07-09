import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Lock, BarChart4, GitBranch, Mail, Link as LinkIcon,
    Compass, Calendar, Clock, Search, CheckCircle2,
    Copy, AlertTriangle, Download, Pin, Filter,
    Sparkles, GitMerge, ChevronDown, Coffee
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

    const faqs = [
        {
            question: '¿Qué es PEMTREE y para quién está diseñado?',
            answer: 'PEMTREE es una plataforma académica interactiva desarrollada para estudiantes de Ingeniería de la Universidad de San Carlos de Guatemala (USAC). Te permite explorar tu pensum, verificar la lógica de prerrequisitos, simular semestres y diseñar tus horarios.'
        },
        {
            question: '¿Cómo se guarda mi progreso o planificación en la plataforma?',
            answer: 'Tu progreso (cursos aprobados, en curso o disponibles, así como la planificación académica y horarios fijados) se guarda de manera automática y totalmente privada en el almacenamiento local (localStorage) de tu navegador sin necesidad de crear cuentas ni contraseñas.'
        },
        {
            question: '¿Cómo funciona el cálculo del límite de créditos CLAR?',
            answer: 'El Planificador determina de manera automática cuántos créditos puedes asignarte según tu promedio (32, 37 o 42 créditos por semestre, con el bono de +5 créditos para carreras simultáneas o cierre de pensum) para que siempre planifiques dentro del marco reglamentario.'
        },
        {
            question: '¿Los datos de horarios están actualizados?',
            answer: 'Los datos de secciones, horarios, docentes y salones se renuevan periódicamente basándose en las publicaciones oficiales emitidas en cada semestre y escuela de vacaciones para facilitarte la detección en vivo de traslapes de horario.'
        },
        {
            question: '¿Al planificar puedo llevar dos carreras de forma simultánea?',
            answer: '¡Por supuesto! El Planificador de PEMTREE cuenta con una función específica para cargar dos carreras en paralelo, permitiéndote combinar líneas académicas y ver el total global de créditos acumulados en un solo tablero.'
        },
        {
            question: '¿Qué sucede si borro la memoria caché de mi navegador?',
            answer: 'Debido a que tus datos residen únicamente en tu navegador (almacenamiento local), al borrar los datos de navegación o historial del sitio web se reiniciará tu progreso. Te recomendamos mantener tu sesión y progreso en tu navegador personal habitual.'
        }
    ];

    function FaqItem({ question, answer }) {
        const [isOpen, setIsOpen] = useState(false);
        return (
            <div 
                className="bg-white dark:bg-[#1C2636] rounded-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] p-5 sm:p-6 hover:border-[#0052CC]/50 dark:hover:border-[#4C9AFF]/50 transition-all duration-200 cursor-pointer select-none shadow-xs group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center justify-between gap-4">
                    <h3 className="font-bold text-sm sm:text-base text-[#172B4D] dark:text-slate-100 group-hover:text-[#0052CC] dark:group-hover:text-[#4C9AFF] transition-colors leading-snug">
                        {question}
                    </h3>
                    <div className={`w-8 h-8 rounded-lg bg-[#F4F5F7] dark:bg-[#0E1624] text-[#5E6C84] dark:text-slate-400 flex items-center justify-center shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-[#DEEBFF] text-[#0052CC] dark:bg-[#0C295E] dark:text-[#4C9AFF]' : ''}`}>
                        <ChevronDown size={18} />
                    </div>
                </div>
                <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-3.5' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                    <div className="overflow-hidden">
                        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300 leading-relaxed border-t border-[#DFE1E6]/60 dark:border-[#3E4C5E]/60 pt-3.5">
                            {answer}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    function FeatureCard({ icon: Icon, title, text }) {
        const [isOpen, setIsOpen] = useState(false);
        return (
            <div 
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-[#0E1624]/60 transition-all duration-200 cursor-pointer select-none group border border-transparent hover:border-[#DFE1E6]/60 dark:hover:border-[#3E4C5E]/60"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="w-7 h-7 rounded-md bg-[#F4F5F7] dark:bg-[#0E1624] text-[#5E6C84] dark:text-[#94A3B8] flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200 group-hover:text-[#0052CC] dark:group-hover:text-[#4C9AFF] group-hover:bg-[#DEEBFF]/60 dark:group-hover:bg-[#0C295E]/60">
                    <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 min-h-[28px]">
                        <h4 className="font-semibold text-sm text-[#172B4D] dark:text-slate-200 group-hover:text-[#0052CC] dark:group-hover:text-[#4C9AFF] transition-colors leading-snug">
                            {title}
                        </h4>
                        <ChevronDown 
                            size={15} 
                            className={`shrink-0 text-[#7A869A] dark:text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#0052CC] dark:text-[#4C9AFF]' : ''}`} 
                        />
                    </div>
                    <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-1.5' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                        <div className="overflow-hidden">
                            <p className="text-xs text-[#5E6C84] dark:text-slate-400 leading-relaxed pr-1 pb-1">
                                {text}
                            </p>
                        </div>
                    </div>
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
                        Estudia las rutas, prerrequisitos y dependencias de los <span className="font-semibold text-slate-800 dark:text-slate-100">Pensum CLAR 2022/2025</span> de todas las carreras de Ingeniería mediante un tablero interactivo.
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
                <div className="max-w-7xl mx-auto">
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8 items-stretch">
                        {/* Visualizador */}
                        <div className="bg-white dark:bg-[#1C2636] rounded-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="p-6 border-b border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col justify-between gap-4 h-[230px] shrink-0">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-xl bg-[#0052CC]/10 dark:bg-[#4C9AFF]/15 text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center shrink-0">
                                        <Compass size={22} />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-[#172B4D] dark:text-white tracking-tight">Visualizador</h3>
                                </div>
                                <p className="text-sm text-[#5E6C84] dark:text-slate-400 leading-relaxed line-clamp-3">
                                    Tablero interactivo con todos los cursos de tu pensum, organizados por semestre y por sus prerrequisitos.
                                </p>
                                <Link to="/visualizador" className="w-full bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] dark:text-[#0E1624] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer no-underline text-center block">
                                    Abrir Visualizador
                                </Link>
                            </div>
                            <div className="p-5 flex-1 flex flex-col gap-2">
                                {[
                                    { icon: GitBranch, title: 'Grafo de prerrequisitos', text: 'Conexiones visuales entre cursos: haz clic en cualquier nodo para iluminar sus dependencias y cursos que lo requieren.' },
                                    { icon: Lock, title: 'Lógica de bloqueo', text: 'Los cursos se bloquean automáticamente hasta que apruebes todos sus prerrequisitos.' },
                                    { icon: CheckCircle2, title: 'Marca tu progreso', text: 'Marca cursos como Aprobado, Cursando o Disponible. Tu avance se guarda automáticamente.' },
                                    { icon: Compass, title: 'Ruta crítica', text: 'Tres rutas optimizadas: Más Rápida, Más Flexible y Balanceada, considerando créditos y electivos.' },
                                    { icon: BarChart4, title: 'Métricas en vivo', text: 'Contador de créditos aprobados, requisitos de graduación (300 cr) y área Social Humanística (8 cr).' },
                                    { icon: Search, title: 'Búsqueda instantánea', text: 'Busca por código o nombre y selecciona el curso para centrarlo en el grafo.' },
                                ].map(f => (
                                    <FeatureCard key={f.title} {...f} />
                                ))}
                            </div>
                        </div>

                        {/* Planificador */}
                        <div className="bg-white dark:bg-[#1C2636] rounded-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="p-6 border-b border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col justify-between gap-4 h-[230px] shrink-0">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-xl bg-[#0052CC]/10 dark:bg-[#4C9AFF]/15 text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center shrink-0">
                                        <Calendar size={22} />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-[#172B4D] dark:text-white tracking-tight">Planificador</h3>
                                </div>
                                <p className="text-sm text-[#5E6C84] dark:text-slate-400 leading-relaxed line-clamp-3">
                                    Arrastra y suelta cursos en los semestres y escuelas de vacaciones para diseñar tu línea académica.
                                </p>
                                <Link to="/visualizador?view=planner" className="w-full bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] dark:text-[#0E1624] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer no-underline text-center block">
                                    Abrir Planificador
                                </Link>
                            </div>
                            <div className="p-5 flex-1 flex flex-col gap-2">
                                {[
                                    { icon: GitMerge, title: 'Drag & Drop', text: 'Arrastra cursos desde el pool hacia semestres o vacaciones. Mueve entre bloques con validación en tiempo real.' },
                                    { icon: Sparkles, title: 'Múltiples líneas de planificación', text: 'Crea variantes como "Ruta rápida" o "Con vacaciones" y compara créditos totales entre ellas.' },
                                    { icon: BarChart4, title: 'Límite por créditos CLAR', text: 'Calcula tu máximo permitido según tu promedio (32/37/42 cr) y detecta excedentes automáticamente.' },
                                    { icon: Lock, title: 'Validación de prerrequisitos', text: 'Impide planificar un curso si faltan prerrequisitos en semestres anteriores. Opción de desactivar disponible.' },
                                    { icon: Copy, title: 'Carreras simultáneas', text: 'Carga un segundo pensum y planifica dos carreras en paralelo con el bono de +5 créditos.' },
                                ].map(f => (
                                    <FeatureCard key={f.title} {...f} />
                                ))}
                            </div>
                        </div>

                        {/* Armador de horarios */}
                        <div className="bg-white dark:bg-[#1C2636] rounded-2xl border border-[#DFE1E6] dark:border-[#3E4C5E] shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="p-6 border-b border-[#DFE1E6] dark:border-[#3E4C5E] flex flex-col justify-between gap-4 h-[230px] shrink-0">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-xl bg-[#0052CC]/10 dark:bg-[#4C9AFF]/15 text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center shrink-0">
                                        <Clock size={22} />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-[#172B4D] dark:text-white tracking-tight">Armador de Horarios</h3>
                                </div>
                                <p className="text-sm text-[#5E6C84] dark:text-slate-400 leading-relaxed line-clamp-3">
                                    Visualiza, combina y exporta tus horarios por semestre o vacaciones con datos actualizados de la facultad.
                                </p>
                                <Link to="/visualizador?view=schedule" className="w-full bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] dark:text-[#0E1624] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer no-underline text-center block">
                                    Abrir Horarios
                                </Link>
                            </div>
                            <div className="p-5 flex-1 flex flex-col gap-2">
                                {[
                                    { icon: Clock, title: 'Vista semanal interactiva', text: 'Cuadrícula de lunes a sábado con bloques de tiempo. Haz clic en una sección para agregarla o quitarla.' },
                                    { icon: Search, title: 'Búsqueda por docente', text: 'Encuentra cursos por catedrático o auxiliar, además de código, nombre, edificio o salón.' },
                                    { icon: Filter, title: 'Filtro por modalidad', text: 'Filtra entre Presencial, Semipresencial y Virtual. Combina con búsqueda para encontrar secciones específicas.' },
                                    { icon: AlertTriangle, title: 'Detección de conflictos', text: 'Resalta traslapes entre secciones elegidas con advertencias en tiempo real.' },
                                    { icon: Pin, title: 'Cursos fijados', text: 'Fija cursos que estás considerando llevar para no perderlos de vista, incluso si tienen traslapes u otros problemas con tu horario actual.' },
                                    { icon: Download, title: 'Exportar como PNG', text: 'Descarga tu horario final como imagen PNG lista para compartir o imprimir.' },
                                ].map(f => (
                                    <FeatureCard key={f.title} {...f} />
                                ))}
                            </div>
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

            <section className="w-full bg-[#FAFBFC] dark:bg-[#0E1624] border-t border-[#DFE1E6] dark:border-[#3E4C5E] py-16 px-4 shrink-0">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E] inline-block px-3 py-1 rounded-full mb-4">
                            Soporte & Ayuda
                        </p>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-[#172B4D] dark:text-white tracking-tight mb-3">
                            Preguntas Frecuentes (FAQ)
                        </h2>
                        <p className="text-sm text-[#5E6C84] dark:text-slate-400 max-w-xl mx-auto">
                            Resuelve tus dudas principales sobre el uso, privacidad y características de las herramientas de PEMTREE.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3.5">
                        {faqs.map(faq => (
                            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="w-full bg-white dark:bg-[#0F1726] border-t border-[#DFE1E6] dark:border-[#3E4C5E] py-14 px-4 shrink-0">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-[#172B4D] dark:text-white tracking-tight mb-3">
                        Apoya el desarrollo de PEMTREE
                    </h2>
                    <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-400 max-w-xl mx-auto leading-relaxed mb-8">
                        PEMTREE es un proyecto académico de código abierto y gratuito, creado para la comunidad estudiantil de Ingeniería sin publicidad. Si deseas colaborar con el mantenimiento de los servidores y el desarrollo continuo de nuevas herramientas, puedes realizar una aportación voluntaria.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
                        <a
                            href="https://buymeacoffee.com/trebol4devop"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 bg-[#F4F5F7] dark:bg-[#1C2636] hover:bg-[#EBECF0] dark:hover:bg-[#263346] text-[#172B4D] dark:text-slate-200 border border-[#DFE1E6] dark:border-[#3E4C5E] font-bold px-5 py-3 rounded-xl transition text-xs sm:text-sm no-underline cursor-pointer shadow-2xs"
                        >
                            <Coffee size={16} className="text-[#5E6C84] dark:text-slate-400 shrink-0" />
                            <span>Buy Me a Coffee</span>
                        </a>
                        <a
                            href="https://www.paypal.com/paypalme/TrebolDevop"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 bg-[#F4F5F7] dark:bg-[#1C2636] hover:bg-[#EBECF0] dark:hover:bg-[#263346] text-[#172B4D] dark:text-slate-200 border border-[#DFE1E6] dark:border-[#3E4C5E] font-bold px-5 py-3 rounded-xl transition text-xs sm:text-sm no-underline cursor-pointer shadow-2xs"
                        >
                            <svg className="w-4 h-4 fill-[#5E6C84] dark:fill-slate-400 shrink-0" viewBox="0 0 24 24">
                                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.641.641 0 0 1 .632-.54H11.2c2.478 0 4.414.53 5.753 1.577 1.343 1.049 1.954 2.651 1.819 4.763-.15 2.34-1.123 4.184-2.894 5.483-1.768 1.298-4.148 1.956-7.074 1.956H7.818l-.742 4.378z"/>
                            </svg>
                            <span>Donar con PayPal</span>
                        </a>
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