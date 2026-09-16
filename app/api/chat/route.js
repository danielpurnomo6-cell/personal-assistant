import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { ownerToPrompt } from '../../lib/owner';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
// Fallback otomatis kalau model utama 404 (mis. nama berubah di Google).
const FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];
const CANDIDATE_MODELS = [...new Set([MODEL, ...FALLBACK_MODELS])];

// Pilihan reasoning effort di UI -> thinkingLevel resmi Gemini 3.
const EFFORT_TO_THINKING = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
};

export async function POST(req) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY belum diisi di .env.local.' },
        { status: 500 }
      );
    }

    const { messages, timeInfo, effort } = await req.json();
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

    // Format riwayat chat sesuai standar SDK Gemini (batasi 20 pesan terakhir).
    const history = messages
      .slice(-21, -1)
      .filter((msg) => msg && typeof msg.content === 'string' && msg.content.trim())
      .map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: String(msg.content).slice(0, 8000) }],
      }));

    // Lazy-init SDK di dalam handler agar module tidak crash saat env kosong.
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let systemInstruction = `Kamu adalah Personal Assistant cerdas, proaktif, dan intuitif.
Tugasmu adalah membantu mengorganisir jadwal harian, memberikan ringkasan tugas, membantu ide kreatif, serta menjawab pertanyaan teknis atau keseharian dengan santai namun profesional dan direct.`;

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

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('API Error:', error);
    const status = error?.status ?? error?.code;
    if (status === 503 || status === 429) {
      return NextResponse.json(
        { error: 'Server AI Google sedang penuh. Tunggu sebentar, lalu kirim ulang pesanmu.' },
        { status: 503 }
      );
    }
    if (status === 400 || status === 401 || status === 403) {
      return NextResponse.json(
        { error: 'API key Gemini tidak valid. Cek GEMINI_API_KEY di .env.local (harus dari AI Studio, format AIza...).' },
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
