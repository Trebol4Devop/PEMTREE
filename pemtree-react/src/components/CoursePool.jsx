import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { TextUtils } from '../modules/utils/TextUtils';
import CourseChip from './CourseChip';

export default function CoursePool({ cursos, plannedIds }) {
    const [search, setSearch] = useState('');

    const available = useMemo(() => {
        return cursos.filter(c => !plannedIds.has(c.id));
    }, [cursos, plannedIds]);

    const filtered = useMemo(() => {
        if (!search.trim()) return available;
        const q = TextUtils.normalizarTexto(search);
        return available.filter(c =>
            TextUtils.normalizarTexto(c.codigo).includes(q) ||
            TextUtils.normalizarTexto(c.nombre).includes(q)
        );
    }, [available, search]);

    return (
        <div className="planner-pool">
            <div className="planner-pool-header">
                <h3 className="planner-pool-title">Cursos</h3>
                <span className="planner-pool-count">{filtered.length}</span>
            </div>
            <div className="planner-pool-search">
                <Search size={14} className="planner-pool-search-icon" />
                <input
                    type="text"
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="planner-pool-search-input"
                />
            </div>
            <div className="planner-pool-list">
                {filtered.map(curso => (
                    <CourseChip key={curso.id} curso={curso} />
                ))}
                {filtered.length === 0 && (
                    <div className="planner-pool-empty">
                        {available.length === 0 ? 'Todos planificados' : 'Sin resultados'}
                    </div>
                )}
            </div>
        </div>
    );
}
