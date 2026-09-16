// Profil pemilik aplikasi — SUMBER TUNGGAL untuk halaman /tentang & pengetahuan AI.
// Cara melengkapi: isi field kosong / tambah item array. Halaman & AI otomatis mengikuti.
// JANGAN taruh data sensitif di sini (alamat, NIK, nomor pribadi): file ini dibaca AI
// dan tampil di halaman publik.

export const owner = {
  name: 'Daniel Andrijanto Purnomo',
  title: '', // mis. 'Content Creator' — isi nanti
  location: '', // mis. 'Jakarta' — isi nanti (kota saja)
  birthPlace: 'Palu',
  birthDay: 6,
  birthMonth: 'April',
  birthYear: null, // SENGAJA dirahasiakan — jangan diisi
  bio: 'Daniel Andrijanto Purnomo, lahir di Palu pada tanggal 6 April. Pemilik dan pengguna utama aplikasi Personal Assistant ini.',
  photo: '', // mis. '/foto-saya.jpg' — simpan file di folder public/
  skills: [], // mis. [{ name: 'CapCut', level: 'Mahir' }] atau ['Public Speaking']
  experience: [], // mis. [{ role: 'Video Editor', place: 'Freelance', period: '2023–sekarang' }]
  projects: [], // mis. [{ name: '...', desc: '...', link: 'https://...' }]
  contacts: [], // mis. [{ label: 'Instagram', value: '@...', link: 'https://instagram.com/...' }]
};

// Ubah profil menjadi teks ringkas untuk system instruction AI.
// Melewati field yang masih kosong agar AI tidak mengarang.
export function ownerToPrompt(o = owner) {
  const lines = [`Nama: ${o.name}`];

  const birthBits = [];
  if (o.birthPlace) birthBits.push(o.birthPlace);
  if (o.birthDay && o.birthMonth) birthBits.push(`tanggal ${o.birthDay} ${o.birthMonth}`);
  if (birthBits.length > 0) {
    lines.push(`Tempat, tanggal lahir: ${birthBits.join(', ')} (tahun kelahiran dirahasiakan)`);
  }
  if (o.title) lines.push(`Peran: ${o.title}`);
  if (o.location) lines.push(`Lokasi: ${o.location}`);
  if (o.bio) lines.push(`Bio: ${o.bio}`);
  if (o.skills?.length) {
    lines.push(
      `Skills: ${o.skills
        .map((s) => (typeof s === 'string' ? s : `${s.name}${s.level ? ` (${s.level})` : ''}`))
        .join('; ')}`
    );
  }
  if (o.experience?.length) {
    lines.push(
      `Pengalaman: ${o.experience
        .map((e) =>
          typeof e === 'string' ? e : `${e.role}${e.place ? ` — ${e.place}` : ''}${e.period ? ` (${e.period})` : ''}`
        )
        .join('; ')}`
    );
  }
  if (o.projects?.length) {
    lines.push(
      `Proyek: ${o.projects
        .map((p) => (typeof p === 'string' ? p : `${p.name}${p.desc ? ` — ${p.desc}` : ''}`))
        .join('; ')}`
    );
  }
  if (o.contacts?.length) {
    lines.push(
      `Kontak publik: ${o.contacts
        .map((c) => (typeof c === 'string' ? c : `${c.label}: ${c.value}`))
        .join('; ')}`
    );
  }
  return lines.join('\n');
}

export function ownerInitials(o = owner) {
  return o.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}
