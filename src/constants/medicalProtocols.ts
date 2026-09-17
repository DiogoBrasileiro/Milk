import { ConservationProtocol } from '../types';

export const CONSERVATION_PROTOCOLS: Record<string, ConservationProtocol> = {
  brasil_ms: {
    id: 'brasil_ms',
    name: 'Brasil — Ministério da Saúde / Rede BLH',
    version: 'Norma Técnica MS/Anvisa 2024',
    source: 'Ministério da Saúde do Brasil / Fiocruz rBLH-BR',
    description: 'Protocolo padrão brasileiro (Rede de Bancos de Leite): 12 horas em geladeira e 15 dias no freezer.',
    roomTempHours: 2, // 2 horas em temperatura ambiente (máx 26°C)
    fridgeHours: 12, // Geladeira a máx 4°C: 12 horas
    freezerDays: 15, // Congelador/Freezer doméstico: 15 dias (leite cru domiciliar)
    thawedFridgeHours: 12, // Descongelado em geladeira: 12 horas
    warmedHours: 1, // Aquecido/oferecido: 1 hora
    allowRefreeze: false,
    leftoverPolicy: 'Descartar sobra de mamadeira após 1h do início da oferta.',
    discardOfferedLeftover: true, // Protocolo BRASIL MS: sobra oferecida/aquecida ao bebê DEVE ser descartada
  },
  cdc_aap: {
    id: 'cdc_aap',
    name: 'CDC / AAP (Estados Unidos)',
    version: 'CDC Guidelines 2024 / AAP Clinical Policy',
    source: 'Centers for Disease Control and Prevention & American Academy of Pediatrics',
    description: 'Diretriz norte-americana CDC/AAP: 4 dias em geladeira e até 6 meses em freezer.',
    roomTempHours: 4, // 4 horas em temperatura ambiente (<25°C)
    fridgeHours: 96, // Geladeira (<4°C): até 4 dias
    freezerDays: 180, // Freezer (-18°C): até 6 meses (ideal) / 12 meses (aceitável)
    thawedFridgeHours: 24, // Descongelado em geladeira: até 24 horas
    warmedHours: 2, // Aquecido/iniciado: até 2 horas
    allowRefreeze: false,
    leftoverPolicy: 'Descartar sobra após 2 horas do término da alimentação.',
    discardOfferedLeftover: true,
  },
  personalizado: {
    id: 'personalizado',
    name: 'Protocolo Personalizado (Orientado pelo Pediatra)',
    version: 'Configuração Individual',
    source: 'Prescrição do Pediatra Assistente',
    description: 'Configuração adaptada conforme orientações individuais da equipe médica.',
    roomTempHours: 2,
    fridgeHours: 24,
    freezerDays: 30,
    thawedFridgeHours: 24,
    warmedHours: 1,
    allowRefreeze: false,
    leftoverPolicy: 'Conforme orientação do pediatra.',
    discardOfferedLeftover: true,
  },
};

export interface MedicalReference {
  id: string;
  organization: string;
  title: string;
  topic: string;
  summary: string;
  url?: string;
  lastReviewed: string;
}

export const MEDICAL_REFERENCES: MedicalReference[] = [
  {
    id: 'ref_ms_blh',
    organization: 'Ministério da Saúde (Brasil)',
    title: 'Guia Alimentar para Crianças Brasileiras Menores de 2 Anos',
    topic: 'Aleitamento Materno e Ordenha',
    summary: 'Recomenda aleitamento materno exclusivo até 6 meses e complementado até 2 anos ou mais. Protocolo de conservação domiciliar de 12h em geladeira e 15 dias em freezer.',
    url: 'https://bvsms.saude.gov.br',
    lastReviewed: '2025-01-10',
  },
  {
    id: 'ref_sbp_colicas',
    organization: 'Sociedade Brasileira de Pediatria (SBP)',
    title: 'Documento Científico: Cólicas do Lactente e Desconfortos Funcionais',
    topic: 'Desconforto, Gases e Cólica',
    summary: 'A cólica do lactente é um processo fisiológico autolimitado caracterizado por episódios de choro inconsolável sem causa aparente. Medidas não farmacológicas (pele a pele, arrotamento, posição ereta) são a primeira linha.',
    url: 'https://www.sbp.com.br',
    lastReviewed: '2024-11-15',
  },
  {
    id: 'ref_oms_growth',
    organization: 'Organização Mundial da Saúde (OMS)',
    title: 'WHO Child Growth Standards',
    topic: 'Curvas de Crescimento e Peso',
    summary: 'Padrão internacional de crescimento baseado em lactentes amamentados em condições ideais de saúde e nutrição.',
    url: 'https://www.who.int/tools/child-growth-standards',
    lastReviewed: '2024-08-01',
  },
  {
    id: 'ref_aap_storage',
    organization: 'American Academy of Pediatrics (AAP)',
    title: 'Proper Storage and Preparation of Breast Milk',
    topic: 'Armazenamento e Higiene',
    summary: 'Diretrizes internacionais para manipulação higiênica e temperatura controlada de leite materno extraído.',
    url: 'https://www.healthychildren.org',
    lastReviewed: '2025-02-01',
  },
];
