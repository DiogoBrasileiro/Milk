import React, { useState, useEffect } from 'react';
import {
  ContainerTagDefinition,
  getUserTags,
  saveUserTag,
  deleteUserTag,
  resetAllTagsToDefault,
  CONTAINER_COLORS,
  getContainerColorStyle,
} from '../constants/containers';
import {
  Tag,
  Plus,
  X,
  Trash2,
  Check,
  Sparkles,
  Edit2,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  SlidersHorizontal,
  PenLine,
} from 'lucide-react';

interface ContainerTagSelectorProps {
  selectedTag?: string;
  onSelectTag: (tagName: string, tagColor?: string) => void;
  isNightMode?: boolean;
}

export const ContainerTagSelector: React.FC<ContainerTagSelectorProps> = ({
  selectedTag = '',
  onSelectTag,
  isNightMode = false,
}) => {
  const [userTags, setUserTags] = useState<ContainerTagDefinition[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
  const [editingTag, setEditingTag] = useState<ContainerTagDefinition | null>(null);
  const [isManaging, setIsManaging] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Direct manual tag typing
  const [manualTagInput, setManualTagInput] = useState<string>('');

  // Tag Form (for Add or Edit)
  const [formTagName, setFormTagName] = useState<string>('');
  const [formTagDesc, setFormTagDesc] = useState<string>('');
  const [formTagIcon, setFormTagIcon] = useState<string>('🏷️');
  const [formTagColor, setFormTagColor] = useState<string>('#3b82f6');
  const [formTagCategory, setFormTagCategory] = useState<'tipo_leite' | 'circadiano' | 'rotina' | 'especial' | 'custom'>('custom');

  // Load tags on mount
  useEffect(() => {
    setUserTags(getUserTags());
  }, []);

  const refreshTags = () => {
    setUserTags(getUserTags());
  };

  const handleApplyManualTag = (saveAsPermanent = false) => {
    const trimmed = manualTagInput.trim();
    if (!trimmed) return;

    if (saveAsPermanent) {
      const saved = saveUserTag({
        name: trimmed,
        icon: '🏷️',
        colorHex: formTagColor || '#3b82f6',
        category: 'custom',
      });
      refreshTags();
      onSelectTag(saved.name, saved.colorHex);
    } else {
      onSelectTag(trimmed, formTagColor);
    }
    setManualTagInput('');
  };

  const handleStartEdit = (tag: ContainerTagDefinition, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTag(tag);
    setFormTagName(tag.name);
    setFormTagDesc(tag.description || '');
    setFormTagIcon(tag.icon || '🏷️');
    setFormTagColor(tag.colorHex || '#3b82f6');
    setFormTagCategory(tag.category || 'custom');
    setIsAddingCustom(true);
  };

  const handleStartAdd = () => {
    setEditingTag(null);
    setFormTagName('');
    setFormTagDesc('');
    setFormTagIcon('🏷️');
    setFormTagColor('#3b82f6');
    setFormTagCategory('custom');
    setIsAddingCustom(true);
  };

  const handleSaveTagForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTagName.trim()) return;

    const saved = saveUserTag({
      id: editingTag?.id,
      name: formTagName.trim(),
      description: formTagDesc.trim() || undefined,
      icon: formTagIcon || '🏷️',
      colorHex: formTagColor,
      category: formTagCategory,
    });

    refreshTags();
    onSelectTag(saved.name, saved.colorHex);
    setIsAddingCustom(false);
    setEditingTag(null);
  };

  const handleDeleteTag = (tagId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const tagToDelete = userTags.find((t) => t.id === tagId);
    if (confirm(`Deseja excluir a etiqueta "${tagToDelete?.name || 'esta tag'}"?`)) {
      deleteUserTag(tagId);
      refreshTags();
      if (selectedTag && tagToDelete?.name.toLowerCase() === selectedTag.toLowerCase()) {
        onSelectTag('');
      }
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Deseja restaurar a lista original de etiquetas padrão?')) {
      const reset = resetAllTagsToDefault();
      setUserTags(reset);
      setIsManaging(false);
    }
  };

  const filteredTags = userTags.filter((tag) => {
    if (selectedCategory === 'todos') return true;
    if (selectedCategory === 'custom') return tag.category === 'custom';
    return tag.category === selectedCategory;
  });

  const categories = [
    { id: 'todos', label: `Todas (${userTags.length})` },
    { id: 'tipo_leite', label: 'Tipo de Leite' },
    { id: 'circadiano', label: 'Horário / Noite' },
    { id: 'rotina', label: 'Rotina & Passeio' },
    { id: 'especial', label: 'Especiais' },
    { id: 'custom', label: 'Minhas Tags' },
  ];

  // Find info about active tag
  const activeTagObj = userTags.find((t) => t.name.toLowerCase() === selectedTag.toLowerCase());

  return (
    <div className="space-y-3">
      {/* Header with Title & Action Controls */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-blue-500" />
          <span>Etiqueta / Classificação do Leite</span>
        </label>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsManaging(!isManaging)}
            className={`text-[11px] font-black px-2.5 py-1 rounded-xl border flex items-center gap-1 transition-all ${
              isManaging
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50'
            }`}
            title="Editar ou excluir tags da lista"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{isManaging ? 'Concluir Edição' : 'Editar Tags'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            title="Recolher / Expandir"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Manual Free-Text Tag Input (User can type anything and not use predefined ones) */}
      <div
        className={`p-3 rounded-2xl border transition-all ${
          isNightMode ? 'bg-slate-900/90 border-slate-700/80' : 'bg-slate-50 border-slate-200/90'
        }`}
      >
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <PenLine className="w-3 h-3 text-blue-500" />
            <span>Digitar etiqueta personalizada para este frasco:</span>
          </span>
          <span className="text-[10px] text-slate-400">Sem obrigação de usar as prontas</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={manualTagInput}
            onChange={(e) => setManualTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyManualTag(false);
              }
            }}
            placeholder="Ex: Pote 4, Leite das 15h, Reserva Viagem, Colostro 3º dia..."
            className={`flex-1 p-2.5 rounded-xl text-xs font-bold border ${
              isNightMode
                ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
            } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          />
          <button
            type="button"
            onClick={() => handleApplyManualTag(false)}
            disabled={!manualTagInput.trim()}
            className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black shrink-0 transition-colors shadow-xs"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={() => handleApplyManualTag(true)}
            disabled={!manualTagInput.trim()}
            title="Aplicar e salvar na biblioteca de tags"
            className="py-2.5 px-2.5 rounded-xl border border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 disabled:opacity-40 text-xs font-bold shrink-0 transition-colors"
          >
            + Salvar Tag
          </button>
        </div>
      </div>

      {/* Selected Tag Active Pill */}
      {selectedTag ? (
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 shadow-xs ${
            isNightMode ? 'bg-blue-950/40 border-blue-800/80' : 'bg-blue-50/90 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="text-xl shrink-0">{activeTagObj?.icon || '🏷️'}</span>
            <div className="truncate">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-blue-700 dark:text-blue-300">
                  {selectedTag}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {activeTagObj?.category === 'circadiano'
                    ? 'Horário'
                    : activeTagObj?.category === 'tipo_leite'
                    ? 'Tipo de Leite'
                    : activeTagObj?.category === 'rotina'
                    ? 'Rotina'
                    : activeTagObj?.category === 'especial'
                    ? 'Especial'
                    : 'Personalizada'}
                </span>
              </div>
              {activeTagObj?.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {activeTagObj.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {activeTagObj && (
              <button
                type="button"
                onClick={(e) => handleStartEdit(activeTagObj, e)}
                title="Editar esta etiqueta"
                className="p-1.5 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectTag('')}
              title="Remover tag do frasco"
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-2.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 text-xs">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            Nenhuma etiqueta selecionada (você pode digitar acima ou escolher abaixo)
          </span>
        </div>
      )}

      {/* Expanded Tag Browser & Manager */}
      {isExpanded && (
        <div className="space-y-3 pt-1">
          {/* Category Tabs & Quick Management Actions */}
          <div className="flex items-center justify-between gap-1 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex flex-wrap gap-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`py-1 px-2.5 rounded-xl text-[11px] font-bold transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isNightMode
                      ? 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {isManaging && (
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-1 ml-auto"
                title="Restaurar lista original"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar Padrões</span>
              </button>
            )}
          </div>

          {/* Tag Cards Grid with Direct Selection / Edit / Delete */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
            {filteredTags.map((tag) => {
              const isSelected = selectedTag.toLowerCase() === tag.name.toLowerCase();
              const colorHex = tag.colorHex || '#3b82f6';

              return (
                <div
                  key={tag.id}
                  className={`group relative p-2.5 rounded-2xl border text-left flex items-start justify-between gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-500/15 border-blue-500 ring-2 ring-blue-500/50 text-blue-950 dark:text-blue-100 shadow-xs'
                      : isNightMode
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200 hover:bg-slate-800/60'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50'
                  }`}
                  onClick={() => onSelectTag(isSelected ? '' : tag.name, tag.colorHex)}
                >
                  <div className="flex items-start gap-2 overflow-hidden flex-1">
                    <span className="text-base shrink-0 mt-0.5">{tag.icon || '🏷️'}</span>
                    <div className="truncate flex-1">
                      <div className="text-xs font-black truncate flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: colorHex }}
                        />
                        <span className="truncate">{tag.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-500 stroke-[3] shrink-0" />}
                      </div>
                      {tag.description && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {tag.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for editing/deleting any tag */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isManaging ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(tag, e)}
                          title="Editar nome/cor da tag"
                          className="p-1 rounded-lg text-blue-500 hover:bg-blue-500/20"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTag(tag.id, e)}
                          title="Excluir tag da lista"
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(tag, e)}
                        title="Editar esta etiqueta"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-opacity"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredTags.length === 0 && (
              <div className="col-span-full p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400 text-xs">
                Nenhuma etiqueta nesta categoria. Crie uma nova abaixo!
              </div>
            )}
          </div>

          {/* Add / Edit Tag Form */}
          {!isAddingCustom ? (
            <button
              type="button"
              onClick={handleStartAdd}
              className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5 transition-colors bg-blue-50/40 dark:bg-blue-950/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Criar Nova Etiqueta Reutilizável</span>
            </button>
          ) : (
            <form
              onSubmit={handleSaveTagForm}
              className={`p-3.5 rounded-2xl border space-y-3 animate-in fade-in ${
                isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>{editingTag ? `Editar Etiqueta: "${editingTag.name}"` : 'Nova Etiqueta Reutilizável'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCustom(false);
                    setEditingTag(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Ícone / Emoji:</label>
                  <div className="flex gap-1 flex-wrap">
                    {['🍼', '✨', '💛', '🌙', '🌅', '🎒', '🛡️', '❤️', '🧈', '💉', '☀️', '💧'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormTagIcon(emoji)}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center border ${
                          formTagIcon === emoji
                            ? 'border-blue-500 bg-blue-500/20 ring-1 ring-blue-500'
                            : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-3 space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      Nome da Etiqueta (Obrigatório):
                    </label>
                    <input
                      type="text"
                      value={formTagName}
                      onChange={(e) => setFormTagName(e.target.value)}
                      placeholder="Ex: Pote 4, Leite do Almoço, Viagem..."
                      className={`w-full p-2 rounded-xl text-xs font-bold border ${
                        isNightMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      Descrição / Finalidade (Opcional):
                    </label>
                    <input
                      type="text"
                      value={formTagDesc}
                      onChange={(e) => setFormTagDesc(e.target.value)}
                      placeholder="Ex: Para dar antes de dormir..."
                      className={`w-full p-2 rounded-xl text-xs font-bold border ${
                        isNightMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Color selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Cor da Etiqueta:</label>
                <div className="flex flex-wrap gap-1.5">
                  {CONTAINER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormTagColor(c.hex)}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                        formTagColor === c.hex
                          ? 'border-blue-500 ring-2 ring-blue-500 font-black'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${c.bgClass}`} />
                      <span>{c.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCustom(false);
                    setEditingTag(null);
                  }}
                  className="py-1.5 px-3 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{editingTag ? 'Atualizar Etiqueta' : 'Salvar Etiqueta'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
