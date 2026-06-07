import { useState, useRef } from 'react';
import { Download, X, Upload, Image, Sun, Moon, RefreshCw } from 'lucide-react';

const PALETAS = {
    Default: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777',
              '#0891b2', '#65a30d', '#ea580c', '#4f46e5', '#be123c', '#0d9488',
              '#b45309', '#9333ea', '#0284c7', '#16a34a', '#e11d48', '#ca8a04'],
    Pastel:  ['#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd', '#f9a8d4',
              '#67e8f9', '#bef264', '#fdba74', '#a5b4fc', '#fda4af', '#5eead4',
              '#d6b5e0', '#d8b4fe', '#7dd3fc', '#a3e635', '#fb7185', '#fbbf24'],
    Oscuro:  ['#1e3a5f', '#064e3b', '#78350f', '#7f1d1d', '#3b0764', '#701a75',
              '#164e63', '#365314', '#431407', '#1e1b4b', '#4a1d2a', '#134e4a',
              '#2d1a0a', '#4c1d95', '#0c4a6e', '#14532d', '#881337', '#713f12'],
    Neon:    ['#00ffcc', '#39ff14', '#ff6600', '#ff0033', '#b300ff', '#ff00ff',
              '#00ccff', '#ccff00', '#ff3300', '#6600ff', '#ff0066', '#00ff99',
              '#ff9900', '#9933ff', '#00aaff', '#33ff33', '#ff0044', '#ffaa00'],
    Calido:  ['#cc3300', '#8b4513', '#daa520', '#cd853f', '#b22222', '#ff6347',
              '#ff8c00', '#9acd32', '#556b2f', '#a0522d', '#d2691e', '#f4a460',
              '#8b0000', '#ff4500', '#b8860b', '#6b8e23', '#c71585', '#ff7f50']
};

const FUENTES = ['Segoe UI', 'Arial', 'Verdana', 'Georgia', 'Courier New', 'Tahoma', 'Times New Roman'];

const BG_MODES = [
    { value: 'stretch', label: 'Estirar' },
    { value: 'tile', label: 'Mosaico' },
    { value: 'center', label: 'Centrar' }
];

const BG_APPLY = [
    { value: 'grid', label: 'Fondo del horario' },
    { value: 'blocks', label: 'En los bloques' }
];

export default function ExportModal({ settings, onSettingsChange, onDownload, onPreview, onClose }) {
    const [localSettings, setLocalSettings] = useState({ ...settings });
    const [previewImage, setPreviewImage] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const fileInputRef = useRef(null);

    function handlePaletteChange(name) {
        const updated = { ...localSettings, paletteName: name };
        setLocalSettings(updated);
        onSettingsChange(updated);
    }

    function handleFontChange(font) {
        const updated = { ...localSettings, fontFamily: font };
        setLocalSettings(updated);
        onSettingsChange(updated);
    }

    function handleBgModeChange(mode) {
        const updated = { ...localSettings, bgMode: mode };
        setLocalSettings(updated);
        onSettingsChange(updated);
    }

    function handleBgApplyChange(apply) {
        const updated = { ...localSettings, bgApply: apply };
        setLocalSettings(updated);
        onSettingsChange(updated);
    }

    function handleBgImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const updated = { ...localSettings, bgImage: reader.result };
            setLocalSettings(updated);
            onSettingsChange(updated);
        };
        reader.readAsDataURL(file);
    }

    function handleRemoveBg() {
        const updated = { ...localSettings, bgImage: null };
        setLocalSettings(updated);
        onSettingsChange(updated);
    }

    function handleThemeChange(theme) {
        const updated = { ...localSettings, theme };
        setLocalSettings(updated);
        onSettingsChange(updated);
    }

    async function handlePreview() {
        setPreviewLoading(true);
        const url = await onPreview(localSettings);
        setPreviewImage(url);
        setPreviewLoading(false);
    }

    return (
        <div className="export-modal-overlay" onClick={onClose}>
            <div className="export-modal" onClick={e => e.stopPropagation()}>
                <div className="export-modal-header">
                    <h2>Personalizar horario de descarga</h2>
                    <button className="export-modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="export-modal-body">
                    <div className="export-modal-section">
                        <h3>Tema</h3>
                        <div className="export-modal-theme">
                            <button
                                className={`export-theme-btn ${localSettings.theme === 'light' ? 'active' : ''}`}
                                onClick={() => handleThemeChange('light')}
                            >
                                <Sun size={14} />
                                Claro
                            </button>
                            <button
                                className={`export-theme-btn ${localSettings.theme === 'dark' ? 'active' : ''}`}
                                onClick={() => handleThemeChange('dark')}
                            >
                                <Moon size={14} />
                                Oscuro
                            </button>
                        </div>
                    </div>

                    <div className="export-modal-section">
                        <h3>Paleta de colores</h3>
                        <div className="export-modal-palettes">
                            {Object.entries(PALETAS).map(([name, colors]) => (
                                <button
                                    key={name}
                                    className={`export-palette-btn ${localSettings.paletteName === name ? 'active' : ''}`}
                                    onClick={() => handlePaletteChange(name)}
                                    title={name}
                                >
                                    <div className="export-palette-swatches">
                                        {colors.slice(0, 6).map((c, i) => (
                                            <span key={i} className="export-palette-swatch" style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                    <span className="export-palette-label">{name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="export-modal-section">
                        <h3>Tipo de letra</h3>
                        <div className="export-modal-fonts">
                            {FUENTES.map(font => (
                                <button
                                    key={font}
                                    className={`export-font-btn ${localSettings.fontFamily === font ? 'active' : ''}`}
                                    onClick={() => handleFontChange(font)}
                                    style={{ fontFamily: font }}
                                >
                                    {font}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="export-modal-section">
                        <h3>Imagen de fondo</h3>
                        <div className="export-modal-bg-area">
                            {localSettings.bgImage ? (
                                <div className="export-bg-preview" style={{ backgroundImage: `url(${localSettings.bgImage})` }}>
                                    <span className="export-bg-preview-text">Vista previa</span>
                                </div>
                            ) : (
                                <div className="export-bg-preview export-bg-preview-empty">
                                    <Image size={24} />
                                    <span>Sin imagen de fondo</span>
                                </div>
                            )}
                            <div className="export-bg-controls">
                                <div className="export-bg-modes">
                                    {BG_MODES.map(m => (
                                        <button
                                            key={m.value}
                                            className={`export-bg-mode-btn ${localSettings.bgMode === m.value ? 'active' : ''}`}
                                            onClick={() => handleBgModeChange(m.value)}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                                {localSettings.bgImage && (
                                    <div className="export-bg-modes" style={{ marginTop: '0.35rem' }}>
                                        {BG_APPLY.map(a => (
                                            <button
                                                key={a.value}
                                                className={`export-bg-mode-btn ${localSettings.bgApply === a.value ? 'active' : ''}`}
                                                onClick={() => handleBgApplyChange(a.value)}
                                            >
                                                {a.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="export-bg-buttons">
                                    <button
                                        className="export-bg-upload-btn"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload size={14} />
                                        Subir imagen
                                    </button>
                                    {localSettings.bgImage && (
                                        <button
                                            className="export-bg-remove-btn"
                                            onClick={handleRemoveBg}
                                        >
                                            Quitar
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleBgImageUpload}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="export-modal-section">
                        <h3>Vista previa</h3>
                        <div className="export-modal-preview-area">
                            {previewImage ? (
                                <img src={previewImage} alt="Vista previa del horario" className="export-preview-img" />
                            ) : (
                                <div className="export-preview-empty">
                                    <Image size={28} />
                                    <span>Sin vista previa generada</span>
                                </div>
                            )}
                        </div>
                        <button
                            className="export-preview-btn"
                            onClick={handlePreview}
                            disabled={previewLoading}
                        >
                            {previewLoading ? (
                                <RefreshCw size={14} className="spin" />
                            ) : (
                                <RefreshCw size={14} />
                            )}
                            {previewLoading ? 'Generando...' : 'Generar vista previa'}
                        </button>
                    </div>
                </div>

                <div className="export-modal-footer">
                    <button className="export-modal-cancel-btn" onClick={onClose}>
                        Cancelar
                    </button>
                    <button className="export-modal-download-btn" onClick={onDownload}>
                        <Download size={16} />
                        Descargar PNG
                    </button>
                </div>
            </div>
        </div>
    );
}
