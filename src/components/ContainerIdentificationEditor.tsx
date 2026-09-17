import React, { useState } from 'react';
import { CONTAINER_COLORS, ContainerColorOption } from '../constants/containers';
import { ContainerTagSelector } from './ContainerTagSelector';
import { Tag, Palette, Sparkles, Pipette, Hash, Milk, Check } from 'lucide-react';

interface ContainerIdentificationEditorProps {
  containerNumber: string;
  setContainerNumber: (num: string) => void;
  containerName: string;
  setContainerName: (name: string) => void;
  containerColor: string;
  setContainerColor: (color: string) => void;
  containerTag: string;
  setContainerTag: (tag: string) => void;
  isNightMode?: boolean;
  title?: string;
  showLivePreview?: boolean;
}

export const ContainerIdentificationEditor: React.FC<ContainerIdentificationEditorProps> = ({
  containerNumber,
  setContainerNumber,
  containerName,
  setContainerName,
  containerColor,
  setContainerColor,
  containerTag,
  setContainerTag,
  isNightMode = false,
  title = 'Identificação Visual do Frasco / Potinho',
  showLivePreview = true,
}) => {
  const [showCustomColorPicker, setShowCustomColorPicker] = useState<boolean>(false);
  const [customHexInput, setCustomHexInput] = useState<string>(containerColor || '#3b82f6');

  // Common quick bottle type suggestions
  const bottleSuggestions = [
    'Pote de Vidro',
    'Mamadeira Avent',
    'Frasco Medela',
    'Bolsa Freezer',
    'Pote Bico Largo',
    'Potinho Silicone',
  ];

  const handleCustomHexChange = (hex: string) => {
    setCustomHexInput(hex);
    if (/^#[0-9A-F]{6}$/i.test(hex) || /^#[0-9A-F]{3}$/i.test(hex)) {
      setContainerColor(hex);
    }
  };

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHexInput(val);
    setContainerColor(val);
  };

  // Find if current color matches a preset
  const isPresetColor = CONTAINER_COLORS.some(
    (c) => c.hex.toLowerCase() === containerColor.toLowerCase()
  );

  return (
    <div
      className={`p-4 rounded-2xl border space-y-4 transition-all ${
        isNightMode ? 'bg-slate-900/90 border-slate-700/80 shadow-md' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Header with Title & Quick Info */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400">
            <Palette className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              {title}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Personalize o número, nome, cor da tampa e etiqueta para achar fácil na geladeira
            </p>
          </div>
        </div>
      </div>

      {/* Real-Time Live Visual Preview Banner */}
      {showLivePreview && (
        <div
          className="p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 shadow-xs transition-all relative overflow-hidden"
          style={{
            backgroundColor: `${containerColor}12`,
            borderColor: `${containerColor}55`,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Visual Cap/Bottle graphic representation */}
            <div className="relative shrink-0 flex flex-col items-center">
              {/* Cap / Lid */}
              <div
                className="w-10 h-3 rounded-t-md border border-black/20 shadow-xs flex items-center justify-center transition-colors"
                style={{ backgroundColor: containerColor }}
              >
                <div className="w-4 h-0.5 bg-white/60 rounded-full" />
              </div>
              {/* Bottle Body */}
              <div className="w-8 h-8 rounded-b-lg bg-white/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-200 shadow-xs">
                <Milk className="w-4 h-4 text-blue-400 opacity-70" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {containerNumber ? `Frasco #${containerNumber}` : 'Frasco sem número'}
                </span>
                {containerName && (
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                    • {containerName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {containerTag ? (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-md border"
                    style={{
                      backgroundColor: `${containerColor}20`,
                      borderColor: `${containerColor}60`,
                      color: containerColor,
                    }}
                  >
                    <Tag className="w-3 h-3" />
                    <span>{containerTag}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Sem etiqueta</span>
                )}

                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: containerColor }} />
                  <span>Tampa {containerColor.toUpperCase()}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Pré-visualização
            </span>
            <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">
              Pronto para salvar
            </span>
          </div>
        </div>
      )}

      {/* Inputs: Container Number & Pot Name */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Número do Frasco */}
        <div className="sm:col-span-1">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
            Número do Frasco:
          </label>
          <div className="relative">
            <input
              type="text"
              value={containerNumber}
              onChange={(e) => {
                const val = e.target.value;
                setContainerNumber(val);
                if (!containerName || containerName.startsWith('Pote #') || containerName.startsWith('Potinho #')) {
                  setContainerName(val ? `Pote #${val}` : '');
                }
              }}
              placeholder="Ex: 01, 12, P-3"
              className={`w-full p-2.5 rounded-xl text-xs font-black border ${
                isNightMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Dica: numere os potes físicos com caneta ou fita.
          </span>
        </div>

        {/* Nome / Descrição do Pote */}
        <div className="sm:col-span-2">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
            Nome ou Tipo do Pote:
          </label>
          <input
            type="text"
            value={containerName}
            onChange={(e) => setContainerName(e.target.value)}
            placeholder="Ex: Pote Vidro Tampa Verde, Mamadeira Philips Avent..."
            className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
              isNightMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          />

          {/* Quick suggestions chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1.5 pb-0.5">
            <span className="text-[10px] font-bold text-slate-400 shrink-0">Sugestões:</span>
            {bottleSuggestions.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setContainerName(sug)}
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold shrink-0 transition-colors ${
                  containerName === sug
                    ? 'bg-blue-500 text-white border-blue-500 shadow-xs'
                    : isNightMode
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cor da Tampa / Rótulo Visual (Totalmente Editável com Seletor Livre) */}
      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-blue-500" />
            <span>Cor da Tampa / Rótulo (Totalmente Editável):</span>
          </label>

          <button
            type="button"
            onClick={() => setShowCustomColorPicker(!showCustomColorPicker)}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <Pipette className="w-3 h-3" />
            <span>{showCustomColorPicker ? 'Ocultar Seletor RGB' : 'Escolher Qualquer Cor...'}</span>
          </button>
        </div>

        {/* Preset Color Buttons */}
        <div className="flex flex-wrap gap-2">
          {CONTAINER_COLORS.map((c) => {
            const isSelected = containerColor.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setContainerColor(c.hex);
                  setCustomHexInput(c.hex);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  isSelected
                    ? 'ring-2 ring-blue-500 font-black border-blue-500 shadow-sm bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : isNightMode
                    ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-black/10 ring-1 ring-white/20"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="text-[11px]">{c.name.split(' ')[0]}</span>
                {isSelected && <Check className="w-3 h-3 text-blue-500 stroke-[3]" />}
              </button>
            );
          })}

          {/* Custom Color Button */}
          <button
            type="button"
            onClick={() => setShowCustomColorPicker(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              !isPresetColor
                ? 'ring-2 ring-purple-500 font-black border-purple-500 shadow-sm bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                : 'border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-500'
            }`}
          >
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-black/10"
              style={{ backgroundColor: containerColor }}
            />
            <span className="text-[11px]">{!isPresetColor ? 'Personalizada' : '+ Outra Cor'}</span>
          </button>
        </div>

        {/* Custom Color Picker Expanded Panel */}
        {showCustomColorPicker && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 flex-wrap animate-in fade-in ${
              isNightMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Clique para abrir a paleta completa:
                </span>
                <input
                  type="color"
                  value={containerColor.startsWith('#') ? containerColor : '#3b82f6'}
                  onChange={handleNativeColorChange}
                  className="w-8 h-8 rounded-lg border-2 border-slate-300 dark:border-slate-600 cursor-pointer p-0.5 bg-transparent"
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">Código HEX:</span>
              <input
                type="text"
                value={customHexInput}
                onChange={(e) => handleCustomHexChange(e.target.value)}
                placeholder="#3b82f6"
                className={`w-24 p-1.5 rounded-lg text-xs font-mono font-black uppercase border text-center ${
                  isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="button"
                onClick={() => setContainerColor(customHexInput)}
                className="py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold"
              >
                Definir Cor
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Milk Tag / Classification Selector & Manager */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <ContainerTagSelector
          selectedTag={containerTag}
          onSelectTag={(tagName, tagColor) => {
            setContainerTag(tagName);
            if (tagColor) {
              setContainerColor(tagColor);
              setCustomHexInput(tagColor);
            }
          }}
          isNightMode={isNightMode}
        />
      </div>
    </div>
  );
};
