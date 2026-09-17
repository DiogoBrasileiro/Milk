export interface ContainerColorOption {
  id: string;
  name: string;
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  ringClass: string;
  badgeBg: string;
}

export const CONTAINER_COLORS: ContainerColorOption[] = [
  {
    id: 'blue',
    name: 'Azul Céu',
    hex: '#3b82f6',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-500 dark:text-blue-400',
    borderClass: 'border-blue-500',
    ringClass: 'ring-blue-500',
    badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  {
    id: 'pink',
    name: 'Rosa Bebê',
    hex: '#ec4899',
    bgClass: 'bg-pink-500',
    textClass: 'text-pink-500 dark:text-pink-400',
    borderClass: 'border-pink-500',
    ringClass: 'ring-pink-500',
    badgeBg: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
  },
  {
    id: 'green',
    name: 'Verde Menta',
    hex: '#10b981',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-500 dark:text-emerald-400',
    borderClass: 'border-emerald-500',
    ringClass: 'ring-emerald-500',
    badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'yellow',
    name: 'Amarelo Sol',
    hex: '#f59e0b',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-500 dark:text-amber-400',
    borderClass: 'border-amber-500',
    ringClass: 'ring-amber-500',
    badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  {
    id: 'purple',
    name: 'Roxo Lavanda',
    hex: '#8b5cf6',
    bgClass: 'bg-purple-500',
    textClass: 'text-purple-500 dark:text-purple-400',
    borderClass: 'border-purple-500',
    ringClass: 'ring-purple-500',
    badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
  {
    id: 'orange',
    name: 'Laranja Tangerina',
    hex: '#f97316',
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-500 dark:text-orange-400',
    borderClass: 'border-orange-500',
    ringClass: 'ring-orange-500',
    badgeBg: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  },
  {
    id: 'cyan',
    name: 'Ciano Água',
    hex: '#06b6d4',
    bgClass: 'bg-cyan-500',
    textClass: 'text-cyan-500 dark:text-cyan-400',
    borderClass: 'border-cyan-500',
    ringClass: 'ring-cyan-500',
    badgeBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  },
  {
    id: 'red',
    name: 'Coral / Vermelho',
    hex: '#e11d48',
    bgClass: 'bg-rose-500',
    textClass: 'text-rose-500 dark:text-rose-400',
    borderClass: 'border-rose-500',
    ringClass: 'ring-rose-500',
    badgeBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  },
  {
    id: 'slate',
    name: 'Branco / Neutro',
    hex: '#64748b',
    bgClass: 'bg-slate-500',
    textClass: 'text-slate-500 dark:text-slate-400',
    borderClass: 'border-slate-500',
    ringClass: 'ring-slate-500',
    badgeBg: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
  },
];

export interface ContainerTagDefinition {
  id: string;
  name: string;
  category: 'tipo_leite' | 'circadiano' | 'rotina' | 'especial' | 'custom';
  description?: string;
  icon?: string;
  colorHex?: string;
}

export const PREDEFINED_CONTAINER_TAGS: ContainerTagDefinition[] = [
  // Tipo de Leite
  {
    id: 'fresco',
    name: 'Fresco',
    category: 'tipo_leite',
    description: 'Leite recém-ordenhado para consumo preferencial',
    icon: '✨',
    colorHex: '#3b82f6',
  },
  {
    id: 'colostro',
    name: 'Colostro',
    category: 'tipo_leite',
    description: 'Ouro líquido: riquíssimo em imunoglobulinas e anticorpos',
    icon: '💛',
    colorHex: '#f59e0b',
  },
  {
    id: 'leite_transicao',
    name: 'Leite de Transição',
    category: 'tipo_leite',
    description: 'Fase entre colostro e leite maduro (dias 5 a 15)',
    icon: '🥛',
    colorHex: '#06b6d4',
  },
  {
    id: 'leite_maduro',
    name: 'Leite Maduro',
    category: 'tipo_leite',
    description: 'Composição balanceada de água, proteínas e gorduras',
    icon: '🍼',
    colorHex: '#8b5cf6',
  },
  {
    id: 'leite_anterior',
    name: 'Leite Anterior (Foremilk)',
    category: 'tipo_leite',
    description: 'Mais ralo, rico em água e lactose para hidratação rápida',
    icon: '💧',
    colorHex: '#06b6d4',
  },
  {
    id: 'leite_posterior',
    name: 'Leite Posterior (Hindmilk)',
    category: 'tipo_leite',
    description: 'Mais espesso, rico em gorduras e calorias para saciedade e peso',
    icon: '🧈',
    colorHex: '#f59e0b',
  },

  // Ritmo Circadiano / Horários
  {
    id: 'madrugada',
    name: 'Leite da Madrugada / Noite',
    category: 'circadiano',
    description: 'Rico em melatonina para favorecer o sono do bebê',
    icon: '🌙',
    colorHex: '#8b5cf6',
  },
  {
    id: 'manha',
    name: 'Leite da Manhã',
    category: 'circadiano',
    description: 'Rico em cortisol natural e nutrientes energéticos para despertar',
    icon: '🌅',
    colorHex: '#f97316',
  },
  {
    id: 'tarde',
    name: 'Leite da Tarde',
    category: 'circadiano',
    description: 'Excelente para rotina da tarde e passeios',
    icon: '☀️',
    colorHex: '#eab308',
  },

  // Rotina & Ocasião
  {
    id: 'creche',
    name: 'Para Creche / Passeio',
    category: 'rotina',
    description: 'Porção separada para cuidadores externos',
    icon: '🎒',
    colorHex: '#ec4899',
  },
  {
    id: 'primeira_ordenha',
    name: 'Primeira Ordenha do Dia',
    category: 'rotina',
    description: 'Geralmente maior volume acumulado da noite',
    icon: '🥇',
    colorHex: '#10b981',
  },
  {
    id: 'reserva_emergencia',
    name: 'Reserva de Emergência',
    category: 'rotina',
    description: 'Frasco guardado para imprevistos ou ausências prolongadas',
    icon: '🛡️',
    colorHex: '#e11d48',
  },

  // Especiais
  {
    id: 'pos_vacina',
    name: 'Pós-Vacina (Anticorpos)',
    category: 'especial',
    description: 'Leite produzido durante resposta imune da mãe',
    icon: '💉',
    colorHex: '#10b981',
  },
  {
    id: 'doacao',
    name: 'Para Doação / Banco de Leite',
    category: 'especial',
    description: 'Lote separado com higiene rigorosa para doação hospitalar',
    icon: '❤️',
    colorHex: '#e11d48',
  },
];

export const CONTAINER_TAGS = [
  'Fresco',
  'Colostro',
  'Leite da Manhã',
  'Leite da Tarde',
  'Leite da Noite / Madrugada',
  'Leite Anterior (Hidratação)',
  'Leite Posterior (Gordura)',
  'Para Creche / Passeio',
  'Pós-Vacina',
  'Primeira Ordenha',
  'Para Doação',
];

const CUSTOM_TAGS_STORAGE_KEY = 'milkflow_user_container_tags_v2';
const DELETED_DEFAULT_TAGS_KEY = 'milkflow_deleted_default_tags_v1';

export function getUserTags(): ContainerTagDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY);
    const deletedRaw = localStorage.getItem(DELETED_DEFAULT_TAGS_KEY);
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

    if (raw) {
      const storedTags: ContainerTagDefinition[] = JSON.parse(raw);
      return storedTags.filter((t) => !deletedIds.includes(t.id));
    }

    // Default initialization
    return PREDEFINED_CONTAINER_TAGS.filter((t) => !deletedIds.includes(t.id));
  } catch (err) {
    console.error('Error loading user container tags', err);
    return PREDEFINED_CONTAINER_TAGS;
  }
}

export function saveUserTag(tag: {
  id?: string;
  name: string;
  category?: 'tipo_leite' | 'circadiano' | 'rotina' | 'especial' | 'custom';
  description?: string;
  icon?: string;
  colorHex?: string;
}): ContainerTagDefinition {
  const currentTags = getUserTags();
  const tagId = tag.id || `tag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  
  const newTag: ContainerTagDefinition = {
    id: tagId,
    name: tag.name.trim(),
    category: tag.category || 'custom',
    description: tag.description?.trim(),
    icon: tag.icon || '🏷️',
    colorHex: tag.colorHex || '#3b82f6',
  };

  const existingIdx = currentTags.findIndex(
    (t) => t.id === newTag.id || t.name.toLowerCase() === newTag.name.toLowerCase()
  );

  let updated: ContainerTagDefinition[];
  if (existingIdx >= 0) {
    updated = [...currentTags];
    updated[existingIdx] = { ...updated[existingIdx], ...newTag };
  } else {
    updated = [newTag, ...currentTags];
  }

  try {
    localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving user tag', err);
  }

  return newTag;
}

export function deleteUserTag(tagIdOrName: string): void {
  const currentTags = getUserTags();
  const targetTag = currentTags.find(
    (t) => t.id === tagIdOrName || t.name.toLowerCase() === tagIdOrName.toLowerCase()
  );

  const updated = currentTags.filter(
    (t) => t.id !== tagIdOrName && t.name.toLowerCase() !== tagIdOrName.toLowerCase()
  );

  try {
    localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(updated));

    // Also track if it was a predefined tag id to keep it deleted across reloads
    if (targetTag) {
      const deletedRaw = localStorage.getItem(DELETED_DEFAULT_TAGS_KEY);
      const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      if (!deletedIds.includes(targetTag.id)) {
        deletedIds.push(targetTag.id);
        localStorage.setItem(DELETED_DEFAULT_TAGS_KEY, JSON.stringify(deletedIds));
      }
    }
  } catch (err) {
    console.error('Error deleting tag', err);
  }
}

export function resetAllTagsToDefault(): ContainerTagDefinition[] {
  try {
    localStorage.removeItem(CUSTOM_TAGS_STORAGE_KEY);
    localStorage.removeItem(DELETED_DEFAULT_TAGS_KEY);
  } catch (err) {
    console.error('Error resetting tags', err);
  }
  return PREDEFINED_CONTAINER_TAGS;
}

// Backward compatibility aliases
export const getCustomTags = getUserTags;
export const saveCustomTag = saveUserTag;
export const deleteCustomTag = deleteUserTag;
export const getAllAvailableTags = getUserTags;

export function getContainerColorStyle(hexOrId?: string): ContainerColorOption {
  if (!hexOrId) return CONTAINER_COLORS[0];
  const found = CONTAINER_COLORS.find(
    (c) => c.id === hexOrId || c.hex.toLowerCase() === hexOrId.toLowerCase()
  );
  if (found) return found;

  // Dynamically support any custom HEX color selected by the user
  const isHex = hexOrId.startsWith('#');
  const validHex = isHex ? hexOrId : `#${hexOrId}`;
  return {
    id: 'custom',
    name: 'Cor Personalizada',
    hex: validHex,
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-500',
    ringClass: 'ring-blue-500',
    badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  };
}
