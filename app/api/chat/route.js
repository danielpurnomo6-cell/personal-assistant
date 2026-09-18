import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { ownerToPrompt } from '../../lib/owner';
import {
  ALLOWED_OPENROUTER_MODELS,
  OPENROUTER_MODEL_MAP,
  resolveModelId,
} from '../../lib/models';
// SEMENTARA: cek login dinonaktifkan (auth akan dibangun ulang).

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
// Fallback otomatis kalau model utama 404 (mis. nama berubah di Google).
// WAJIB model yang teruji generateContent + thinkingLevel (Juli 2026):
// gemini-3.5-flash & gemini-3.5-flash-lite OK; 2.x/1.5 & 2.5-flash 404 untuk key baru.
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
const CANDIDATE_MODELS = [...new Set([MODEL, ...FALLBACK_MODELS])];

// Pilihan reasoning effort di UI -> thinkingLevel resmi Gemini 3.
const EFFORT_TO_THINKING = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
};

// System instruction dipakai BERSAMA jalur Gemini langsung & OpenRouter:
// LYNN — asisten pribadi untuk tugas harian, koding, dan ide kreatif.
function buildSystemInstruction(timeInfo) {
  let systemInstruction = `Namamu adalah LYNN — asisten pribadi yang responsif, cerdas, ramah namun profesional.
Kamu berfokus membantu tugas harian (jadwal, ringkasan, pengingat, penulisan), membantu koding (menjelaskan, debugging, menulis dan mereview kode), serta membantu ide kreatif (naskah video, konten, brainstorming).
Gayamu: responsif dan to-the-point, santai namun profesional. Jawab dalam bahasa yang dipakai user (default Bahasa Indonesia bila user memakai Bahasa Indonesia). Jangan pernah menyebut dirimu J.A.R.V.I.S. atau asisten lain — identitasmu selalu LYNN.`;

  // Konteks waktu lokal user (opsional): bikin AI bisa menyapa sesuai waktu.
  if (timeInfo && typeof timeInfo === 'object') {
    const parts = [];
    if (timeInfo.day) parts.push(timeInfo.day);
    if (timeInfo.date) parts.push(timeInfo.date);
    if (timeInfo.time) {
      parts.push(
        timeInfo.period ? `${timeInfo.time} (${timeInfo.period})` : timeInfo.time
      );
    } else if (timeInfo.period) {
      parts.push(timeInfo.period);
    }
    if (parts.length > 0) {
      systemInstruction += `\nCurrent user local time: ${parts.join(', ')}. Greet the user in English matching the time of day (for example "Good morning") ONLY in your first reply of a new conversation. Do not repeat the greeting in follow-up replies.`;
    }
  }

  // Profil pemilik: AI boleh menjawab HANYA jika user bertanya tentang pemilik.
  const profileText = ownerToPrompt();
  if (profileText) {
    systemInstruction += `\n\nInformasi pemilik aplikasi ini (jawab HANYA jika user bertanya tentang pemilik):\n${profileText}\nAturan: jawab pertanyaan tentang pemilik hanya jika user bertanya tentang pemilik. Jangan sisipkan info pemilik pada jawaban lain. Jika ditanya hal yang tidak ada di profil (misalnya tahun lahir atau keluarga), katakan terus terang bahwa info itu rahasia/tidak tersedia — jangan mengarang jawaban.`;
  }

  // Aturan kalender: jika user meminta melihat/membuka kalender,
  // awali jawaban dengan tag [CALENDAR:YYYY-MM] agar frontend merender widget.
  systemInstruction += `\n\nAturan kalender: jika user meminta melihat atau membuka kalender (misalnya "buka kalender", "tampilkan kalender", "kalender bulan depan"), awali jawabanmu dengan tag [CALENDAR:YYYY-MM] sesuai bulan yang diminta (bila tidak disebut, gunakan bulan dan tahun berjalan dari info waktu di atas), lalu lanjutkan dengan jawaban singkat. Jangan tampilkan tag ini bila user tidak meminta kalender.`;

  return systemInstruction;
}

// Jalur Gemini langsung (dipertahankan apa adanya, termasuk retry + fallback).
async function callGemini({ history, lastMessage, systemInstruction, effort }) {
  // Lazy-init SDK di dalam handler agar module tidak crash saat env kosong.
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Retry 503/429/500 (server Google sibuk) dengan backoff singkat.
  // Kalau 404 (model tidak ada), coba fallback model berikutnya.
  let response = null;
  let lastError = null;
  let usedModel = CANDIDATE_MODELS[0];
  for (const candidate of CANDIDATE_MODELS) {
    usedModel = candidate;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: candidate,
          contents: [
            ...history,
            { role: 'user', parts: [{ text: lastMessage }] }
          ],
          config: {
            systemInstruction,
            thinkingConfig: {
              thinkingLevel: EFFORT_TO_THINKING[effort] || 'MEDIUM',
            },
          }
        });
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        const s = err?.status ?? err?.code;
        if (s === 404) break; // ganti model, jangan retry model yang sama
        const retryable = s === 503 || s === 429 || s === 500;
        if (!retryable || attempt === 2) break;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
    if (response) break;
    const s = lastError?.status ?? lastError?.code;
    if (s !== 404) break; // error non-404: jangan coba model lain
  }
  if (!response) {
    if (lastError) lastError.usedModel = usedModel;
    throw lastError;
  }
  return { text: response.text, model: usedModel };
}

// Jalur OpenRouter: SATU percobaan, TANPA retry, TANPA fallback antar model.
// Gagal terus terang agar tidak bakar kredit diam-diam.
async function callOpenRouter({ model, messages, systemInstruction }) {
  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'LYNN',
    },
  });

  const openMessages = [
    { role: 'system', content: systemInstruction },
    ...messages
      .slice(-21, -1)
      .filter((msg) => msg && typeof msg.content === 'string' && msg.content.trim())
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: String(msg.content).slice(0, 8000),
      })),
    { role: 'user', content: messages[messages.length - 1].content.slice(0, 8000) },
  ];

  const completion = await client.chat.completions.create({
    model,
    messages: openMessages,
  });
  const text = completion?.choices?.[0]?.message?.content || '';
  return { text, model };
}

function openRouterStatus(err) {
  return err?.status ?? err?.code ?? err?.response?.status ?? null;
}

export async function POST(req) {
  try {
    // SEMENTARA: tanpa wajib login.
    const { messages, timeInfo, effort, providerId, selectedModel } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Body request harus berisi array "messages" yang tidak kosong.' },
        { status: 400 }
      );
    }

    const rawLast = messages[messages.length - 1]?.content;
    if (typeof rawLast !== 'string' || !rawLast.trim()) {
      return NextResponse.json(
        { error: 'Pesan terakhir harus berupa teks yang tidak kosong.' },
        { status: 400 }
      );
    }
    const lastMessage = rawLast.slice(0, 8000);

    const provider = providerId || 'gemini';
    const systemInstruction = buildSystemInstruction(timeInfo);

    // --- Jalur Gemini langsung (default, dipertahankan) ---
    if (provider === 'gemini') {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
          { error: 'GEMINI_API_KEY belum diisi di .env.local.' },
          { status: 500 }
        );
      }

      // Format riwayat chat sesuai standar SDK Gemini (batasi 20 pesan terakhir).
      const history = messages
        .slice(-21, -1)
        .filter((msg) => msg && typeof msg.content === 'string' && msg.content.trim())
        .map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(msg.content).slice(0, 8000) }],
        }));

      try {
        const { text, model } = await callGemini({ history, lastMessage, systemInstruction, effort });
        return NextResponse.json({ text, model, provider: 'gemini' });
      } catch (error) {
        console.error('API Error (Gemini):', error);
        const status = error?.status ?? error?.code;
        if (status === 503 || status === 429) {
          return NextResponse.json(
            { error: 'Server AI Google sedang penuh. Tunggu sebentar, lalu kirim ulang pesanmu.' },
            { status: 503 }
          );
        }
        if (status === 400 || status === 401 || status === 403) {
          return NextResponse.json(
            { error: 'API key Gemini ditolak (401/403). Cek GEMINI_API_KEY di .env.local — ambil key baru dari AI Studio (aistudio.google.com).' },
            { status: 500 }
          );
        }
        if (status === 404) {
          return NextResponse.json(
            { error: `Model tidak ditemukan (sudah coba: ${CANDIDATE_MODELS.join(', ')}). Isi GEMINI_MODEL di .env.local dengan nama valid dari AI Studio.` },
            { status: 500 }
          );
        }
        return NextResponse.json({ error: 'Terjadi kesalahan pada AI Service.' }, { status: 500 });
      }
    }

    // --- Jalur OpenRouter (model bayar + Gemma gratis) ---
    if (!OPENROUTER_MODEL_MAP[provider]) {
      return NextResponse.json(
        { error: `Provider "${provider}" tidak dikenal. Pilih: gemini, ${Object.keys(OPENROUTER_MODEL_MAP).join(', ')}.` },
        { status: 400 }
      );
    }
    // Gagal terus terang: model di luar allowlist ditolak 400,
    // TIDAK fallback diam-diam agar tidak bakar kredit.
    if (selectedModel && !ALLOWED_OPENROUTER_MODELS.has(selectedModel)) {
      return NextResponse.json(
        { error: `Model "${selectedModel}" tidak diizinkan. Pilih salah satu: ${[...ALLOWED_OPENROUTER_MODELS].join(', ')}.` },
        { status: 400 }
      );
    }
    const model = resolveModelId(provider, selectedModel);
    if (!model || !ALLOWED_OPENROUTER_MODELS.has(model)) {
      return NextResponse.json(
        { error: `Model untuk provider "${provider}" tidak dikonfigurasi.` },
        { status: 400 }
      );
    }
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY belum diisi di .env.local. Daftar di https://openrouter.ai/keys lalu isi key-nya.' },
        { status: 500 }
      );
    }

    try {
      const { text } = await callOpenRouter({ model, messages, systemInstruction });
      if (!text) {
        return NextResponse.json(
          { error: `Model ${model} mengembalikan respons kosong. Coba kirim ulang.` },
          { status: 500 }
        );
      }
      return NextResponse.json({ text, model, provider });
    } catch (error) {
      console.error('API Error (OpenRouter):', error);
      const status = openRouterStatus(error);
      const msg = String(error?.message || '');
      if (status === 401 || status === 403 || /api key|unauthorized|invalid key/i.test(msg)) {
        return NextResponse.json(
          { error: 'OPENROUTER_API_KEY ditolak (401). Cek key di .env.local — buat baru di openrouter.ai/keys.' },
          { status: 500 }
        );
      }
      if (status === 402 || /credit|payment|top-up/i.test(msg)) {
        return NextResponse.json(
          { error: `Kredit OpenRouter habis untuk ${model}. Top-up di openrouter.ai, lalu coba lagi. Tidak dialihkan otomatis agar tidak bakar kredit.` },
          { status: 402 }
        );
      }
      if (status === 429) {
        return NextResponse.json(
          { error: `Rate-limit ${model} (429). Tunggu sebentar lalu kirim ulang. Tidak dialihkan otomatis.` },
          { status: 429 }
        );
      }
      if (status === 404 || /model.*not found|no such model/i.test(msg)) {
        return NextResponse.json(
          { error: `Model ${model} tidak tersedia (404). Cek ID valid di openrouter.ai/models.` },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: `OpenRouter error (${status || 'unknown'}). Coba lagi sebentar.` }, { status: 500 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada AI Service.' }, { status: 500 });
  }
}
