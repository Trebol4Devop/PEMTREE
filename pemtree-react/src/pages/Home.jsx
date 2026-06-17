import { Link } from 'react-router-dom';
import {  Users, Lock, BarChart4, GitBranch, Mail, Link as LinkIcon } from 'lucide-react';
import Seo from '../components/seo/Seo';

export default function Home() {
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

    return (
        <>
        <Seo pathname="/" />
        <div className="flex-1 flex flex-col items-center overflow-y-auto w-full hide-scrollbar">
            
            <section
                className="w-full min-h-screen bg-center bg-no-repeat bg-cover relative"
                style={{ backgroundImage: "url('/images/fondo.png')" }}
            >
                <div className="absolute inset-0 bg-white/45 dark:bg-[#0E1624]/55"></div>
                <div className="pt-40 pb-12 px-4 text-center max-w-4xl mx-auto flex flex-col items-center relative z-10">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E] px-3.5 py-1 rounded-full mb-5 shadow-xs">
                        FIUSAC pensum interactivo
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
                        Estudia las rutas, prerrequisitos y dependencias de los <span className="font-semibold text-slate-800 dark:text-slate-100">Pensum CLAR 2022</span> todas la carrreras de FIUSAC mediante un tablero interactivo.
                    </p>

                    <div className="mt-10 flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">
                        <Link to="/visualizador" className="bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] dark:text-[#0E1624] text-white font-bold text-base px-8 py-3 rounded transition-all duration-300 shadow-md transform hover:-translate-y-0.5 cursor-pointer no-underline text-center">
                            Comenzar a Visualizar
                        </Link>
                    </div>
                </div>
            </section>

            <section className="w-full bg-[#FAFBFC] dark:bg-[#0E1624] border-t border-[#DFE1E6] dark:border-[#3E4C5E] py-16 px-4 shrink-0 flex-grow">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-[#172B4D] dark:text-white tracking-tight mb-3">Establece tu camino, un curso a la vez</h2>
                    <p className="text-sm text-[#5E6C84] dark:text-slate-400 max-w-xl mx-auto mb-10">
                        Controla visualmente las materias que has superado y obtén retroalimentación animada sobre prerrequisitos bloqueados y materias desbloqueadas.
                    </p>

                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
                        <div className="space-y-2">
                            <div className="w-10 h-10 rounded-md bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#8CB4FF] flex items-center justify-center font-bold">
                                <Lock size={18} />
                            </div>
                            <h3 className="font-bold text-base text-[#172B4D] dark:text-slate-100">Lógica de Bloqueo Inteligente</h3>
                            <p className="text-xs text-[#5E6C84] dark:text-slate-400 leading-relaxed">
                                El tablero interactivo comprueba los prerrequisitos del PENSUM CLAR 2022. Llena todos los prerequisitos automaticamente.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-10 h-10 rounded-md bg-[#E3FCEF] dark:bg-[#0A3622] text-[#006644] dark:text-[#79F2B8] flex items-center justify-center font-bold">
                                <BarChart4 size={18} />
                            </div>
                            <h3 className="font-bold text-base text-[#172B4D] dark:text-slate-100">Métricas e Indicadores Clave</h3>
                            <p className="text-xs text-[#5E6C84] dark:text-slate-400 leading-relaxed">
                                Lleva el control de tus créditos acumulados instantáneamente conforme interactúas con los nodos de progreso.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-10 h-10 rounded-md bg-[#FFF0B3] dark:bg-[#5C4000] text-[#A54800] dark:text-[#FFD666] flex items-center justify-center font-bold">
                                <Users size={18} />
                            </div>
                            <h3 className="font-bold text-base text-[#172B4D] dark:text-slate-100">Prerrequisitos Visuales</h3>
                            <p className="text-xs text-[#5E6C84] dark:text-slate-400 leading-relaxed">
                                Al dar clic de un curso de interés, la interfaz iluminará inmediatamente todos sus prerrequisitos y dependencias futuras.
                            </p>
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