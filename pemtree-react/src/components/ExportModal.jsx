import { useState, useRef } from 'react';
import { Download, Upload, Image, Sun, Moon, RefreshCw } from 'lucide-react';
import { PALETAS } from '../theme/palettes';
import { Modal, Button } from './ui';

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

  const footer = (
    <div className="flex justify-end gap-3 w-full">
      <Button variant="secondary" onClick={onClose} className="px-5">
        Cancelar
      </Button>
      <Button variant="primary" onClick={onDownload} className="flex items-center gap-1.5 px-5">
        <Download size={16} />
        Descargar PNG
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Personalizar horario de descarga"
      footer={footer}
      size="lg"
      className="max-w-[600px]"
    >
      <div className="flex flex-col gap-5 text-[#172B4D] dark:text-slate-100">
        <div className="export-modal-section">
          <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-[#5E6C84] dark:text-slate-300 mb-2">Tema</h3>
          <div className="export-modal-theme flex gap-2">
            <button
              className={`export-theme-btn flex items-center gap-1.5 ${localSettings.theme === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <Sun size={14} />
              Claro
            </button>
            <button
              className={`export-theme-btn flex items-center gap-1.5 ${localSettings.theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <Moon size={14} />
              Oscuro
            </button>
          </div>
        </div>

        <div className="export-modal-section">
          <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-[#5E6C84] dark:text-slate-300 mb-2">Paleta de colores</h3>
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
                <span className="export-palette-label font-semibold">{name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="export-modal-section">
          <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-[#5E6C84] dark:text-slate-300 mb-2">Tipo de letra</h3>
          <div className="export-modal-fonts">
            {FUENTES.map((font) => (
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
          <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-[#5E6C84] dark:text-slate-300 mb-2">Imagen de fondo</h3>
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
                {BG_MODES.map((m) => (
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
                  {BG_APPLY.map((a) => (
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
          <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-[#5E6C84] dark:text-slate-300 mb-2">Vista previa</h3>
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
          <Button
            variant="secondary"
            onClick={handlePreview}
            disabled={previewLoading}
            className="flex items-center gap-1.5 w-full justify-center py-2.5"
          >
            {previewLoading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {previewLoading ? 'Generando...' : 'Generar vista previa'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
