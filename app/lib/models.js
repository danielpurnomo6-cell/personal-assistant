// Metadata provider/model untuk ModelPicker (gaya AI Chat 9).
// Angka konteks & thinking level terverifikasi dari docs resmi Google AI (2026).
// Model aktual backend bisa dioverride via GEMINI_MODEL di .env.local
// (default: 'gemini-3.6-flash'). Kalau ganti di server, samakan juga di bawah.

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
  },
  {
    id: 'openai',
    name: 'ChatGPT',
    model: 'GPT terbaru',
    desc: 'Model OpenAI untuk perbandingan',
    context: '—',
    output: '—',
    costInput: '—',
    costOutput: '—',
    costNote: 'Butuh OPENAI_API_KEY di .env.local',
    available: false,
    supportsEffort: false,
  },
  {
    id: 'anthropic',
    name: 'Claude',
    model: 'Claude terbaru',
    desc: 'Model Anthropic untuk perbandingan',
    context: '—',
    output: '—',
    costInput: '—',
    costOutput: '—',
    costNote: 'Butuh ANTHROPIC_API_KEY di .env.local',
    available: false,
    supportsEffort: false,
  },
];

export function thinkingLevelFor(effortId) {
  const found = EFFORT_LEVELS.find((e) => e.id === effortId);
  return found ? found.thinkingLevel : 'MEDIUM';
}
