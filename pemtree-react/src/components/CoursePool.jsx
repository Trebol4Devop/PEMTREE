import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { TextUtils } from '../modules/utils/TextUtils';
import CourseChip from './CourseChip';

export default function CoursePool({ cursos, plannedIds, mergedMap }) {
    const [search, setSearch] = useState('');

    const available = useMemo(() => {
        return cursos.filter(c => !plannedIds.has(c.id));
    }, [cursos, plannedIds]);

    const filtered = useMemo(() => {
        if (!search.trim()) return available;
        const query = TextUtils.normalizarTexto(search).trim();
        const terms = query.split(/\s+/).filter(Boolean);
        if (terms.length === 0) return available;

        const scored = available
            .map(curso => {
                const code = TextUtils.normalizarTexto(curso.codigo);
                const name = TextUtils.normalizarTexto(curso.nombre);
                const combined = `${code} ${name}`;

                let score = 0;
                for (const term of terms) {
                    const codeIdx = code.indexOf(term);
                    const nameIdx = name.indexOf(term);
                    if (codeIdx >= 0) {
                        score += 20;
                        if (codeIdx === 0) score += 10;
                    } else if (nameIdx >= 0) {
                        score += 10;
                        if (nameIdx === 0) score += 5;
                        else if (name[nameIdx - 1] === ' ') score += 3;
                    } else if (combined.indexOf(term) >= 0) {
                        score += 2;
                    } else {
                        return null;
                    }
                }
                return { curso, score };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score)
            .map(item => item.curso);

        return scored;
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
                    <CourseChip key={curso.id} curso={curso} mergedMap={mergedMap} />
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
