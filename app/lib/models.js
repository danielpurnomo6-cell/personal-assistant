// Metadata provider/model untuk ModelPicker (gaya AI Chat 9).
// Skema hibrida: 'gemini' lewat AI Studio langsung (gratis),
// sisanya lewat OpenRouter (1 key untuk semua).
// Tambah model baru = tambah 1 entry + 1 baris di OPENROUTER_MODEL_MAP.

export const EFFORT_LEVELS = [
  { id: 'low', label: 'Rendah', desc: 'Respons tercepat, hemat token', thinkingLevel: 'LOW' },
  { id: 'medium', label: 'Sedang', desc: 'Seimbang (default)', thinkingLevel: 'MEDIUM' },
  { id: 'high', label: 'Tinggi', desc: 'Penalaran maksimal, lebih lambat', thinkingLevel: 'HIGH' },
];

export const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Gemini',
    model: 'gemini-3.6-flash',
    desc: 'Cepat dan cerdas untuk tugas harian',
    context: '1M tokens',
    output: '64K tokens',
    costInput: 'Gratis*',
    costOutput: 'Gratis*',
    costNote: '*AI Studio free tier (ada limit harian)',
    available: true,
    supportsEffort: true,
    route: 'direct',
    free: true,
  },
  {
    id: 'gpt-mini',
    name: 'ChatGPT Mini',
    model: 'openai/gpt-5.4-mini',
    desc: 'OpenAI terbaru, murah untuk harian',
    context: '400K tokens',
    output: '32K tokens',
    costInput: 'Berbayar',
    costOutput: 'Berbayar',
    costNote: 'Via OpenRouter, butuh OPENROUTER_API_KEY + credit',
    available: true,
    supportsEffort: false,
    route: 'openrouter',
    free: false,
  },
  {
    id: 'claude',
    name: 'Claude Sonnet',
    model: 'anthropic/claude-sonnet-4.5',
    desc: 'Anthropic terbaik untuk koding & agent',
    context: '1M tokens',
    output: '64K tokens',
    costInput: 'Berbayar',
    costOutput: 'Berbayar',
    costNote: 'Via OpenRouter, butuh OPENROUTER_API_KEY + credit',
    available: true,
    supportsEffort: false,
    route: 'openrouter',
    free: false,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    model: 'deepseek/deepseek-chat',
    desc: 'Murah banget untuk tugas harian',
    context: '163K tokens',
    output: '8K tokens',
    costInput: 'Berbayar (murah)',
    costOutput: 'Berbayar (murah)',
    costNote: 'Via OpenRouter, butuh OPENROUTER_API_KEY + credit',
    available: true,
    supportsEffort: false,
    route: 'openrouter',
    free: false,
  },
  {
    id: 'qwen-coder',
    name: 'Qwen Coder',
    model: 'qwen/qwen3-coder',
    desc: 'Spesialis koding',
    context: '262K tokens',
    output: '32K tokens',
    costInput: 'Berbayar',
    costOutput: 'Berbayar',
    costNote: 'Via OpenRouter, butuh OPENROUTER_API_KEY + credit',
    available: true,
    supportsEffort: false,
    route: 'openrouter',
    free: false,
  },
  {
    id: 'gemma',
    name: 'Gemma (Gratis)',
    model: 'google/gemma-4-31b-it:free',
    desc: 'Model open Google, Rp0 via OpenRouter',
    context: '262K tokens',
    output: '8K tokens',
    costInput: 'Gratis',
    costOutput: 'Gratis',
    costNote: 'Model :free — limit ~50/hari, tanpa kartu',
    available: true,
    supportsEffort: false,
    route: 'openrouter',
    free: true,
  },
];

// ID model OpenRouter yang diizinkan (anti-bakar-kredit: request di luar
// daftar ini ditolak 400, tanpa fallback diam-diam).
export const OPENROUTER_MODEL_MAP = {
  'gpt-mini': 'openai/gpt-5.4-mini',
  claude: 'anthropic/claude-sonnet-4.5',
  deepseek: 'deepseek/deepseek-chat',
  'qwen-coder': 'qwen/qwen3-coder',
  gemma: 'google/gemma-4-31b-it:free',
};

export const ALLOWED_OPENROUTER_MODELS = new Set(Object.values(OPENROUTER_MODEL_MAP));

export function providerById(id) {
  return PROVIDERS.find((p) => p.id === id) || null;
}

export function resolveModelId(providerId, selectedModel) {
  if (selectedModel && ALLOWED_OPENROUTER_MODELS.has(selectedModel)) return selectedModel;
  return OPENROUTER_MODEL_MAP[providerId] || null;
}

export function thinkingLevelFor(effortId) {
  const found = EFFORT_LEVELS.find((e) => e.id === effortId);
  return found ? found.thinkingLevel : 'MEDIUM';
}
