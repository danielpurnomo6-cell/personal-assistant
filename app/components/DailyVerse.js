'use client';

// Ayat motivasi/penguat harian (Bahasa Indonesia, TB).
// Rotasi deterministik berdasarkan tanggal — ganti tiap hari tanpa API.
const VERSES = [
  { text: 'Segala perkara dapat kutanggung di dalam Dia yang memberi kekuatan kepadaku.', ref: 'Filipi 4:13' },
  { text: 'Sebab Aku ini mengetahui rancangan-rancangan apa yang ada pada-Ku mengenai kamu, demikianlah firman TUHAN, yaitu rancangan damai sejahtera dan bukan rancangan kecelakaan, untuk memberikan kepadamu hari depan yang penuh harapan.', ref: 'Yeremia 29:11' },
  { text: 'TUHAN adalah gembalaku, takkan kekurangan aku.', ref: 'Mazmur 23:1' },
  { text: 'Serahkanlah segala kekuatiranmu kepada-Nya, sebab Ia yang memelihara kamu.', ref: '1 Petrus 5:7' },
  { text: 'Janganlah takut, sebab Aku menyertai engkau, janganlah bimbang, sebab Aku ini Allahmu; Aku akan meneguhkan, bahkan akan menolong engkau.', ref: 'Yesaya 41:10' },
  { text: 'Percayalah kepada TUHAN dengan segenap hatimu, dan janganlah bersandar kepada pengertianmu sendiri.', ref: 'Amsal 3:5' },
  { text: 'Ia memberi kekuatan kepada yang lelah dan menambah semangat kepada yang tiada berdaya.', ref: 'Yesaya 40:29' },
  { text: 'Tetapi mereka yang menanti-nantikan TUHAN mendapat kekuatan baru: mereka seumpama rajawali yang naik terbang dengan kekuatan sayapnya.', ref: 'Yesaya 40:31' },
  { text: 'Damai sejahtera Kutinggalkan bagimu. Damai sejahtera-Ku Kuberikan kepadamu. Janganlah gelisah dan gentar hatimu.', ref: 'Yohanes 14:27' },
  { text: 'Marilah kepada-Ku, semua yang letih lesu dan berbeban berat, Aku akan memberi kelegaan kepadamu.', ref: 'Matius 11:28' },
  { text: 'Kuatkan dan teguhkanlah hatimu, janganlah takut dan jangan gemetar, sebab TUHAN, Allahmu, menyertai engkau, ke mana pun engkau pergi.', ref: 'Yosua 1:9' },
  { text: 'Allah itu bagi kita tempat perlindungan dan kekuatan, sebagai penolong dalam kesesakan sangat terbukti.', ref: 'Mazmur 46:2' },
  { text: 'Sebab Allah memberikan kepada kita bukan roh ketakutan, melainkan roh yang membangkitkan kekuatan, kasih dan ketertiban.', ref: '2 Timotius 1:7' },
  { text: 'Mintalah, maka akan diberikan kepadamu; carilah, maka kamu akan mendapat; ketoklah, maka pintu akan dibukakan bagimu.', ref: 'Matius 7:7' },
  { text: 'Dan Allah sanggup melimpahkan segala kasih karunia kepada kamu, supaya kamu senantiasa berkecukupan di dalam segala sesuatu.', ref: '2 Korintus 9:8' },
  { text: 'Hati yang gembira adalah obat yang manjur, tetapi semangat yang patah mengeringkan tulang.', ref: 'Amsal 17:22' },
  { text: 'Janganlah hendaknya kamu kuatir tentang apa pun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur.', ref: 'Filipi 4:6' },
  { text: 'TUHAN akan berperang untuk kamu, dan kamu akan berdiam saja.', ref: 'Keluaran 14:14' },
  { text: 'Orang yang duduk dalam lindungan Yang Mahatinggi dan bermalam dalam naungan Yang Mahakuasa akan berkata kepada TUHAN: Tempat perlindunganku dan kubu pertahananku, Allahku, yang kupercayai.', ref: 'Mazmur 91:1-2' },
  { text: 'Kasih itu sabar; kasih itu murah hati; ia tidak cemburu. Ia tidak memegahkan diri dan tidak sombong.', ref: '1 Korintus 13:4' },
  { text: 'Tetapi carilah dahulu Kerajaan Allah dan kebenarannya, maka semuanya itu akan ditambahkan kepadamu.', ref: 'Matius 6:33' },
  { text: 'Sebab karena kasih karunia kamu diselamatkan oleh iman; itu bukan hasil usahamu, tetapi pemberian Allah.', ref: 'Efesus 2:8' },
  { text: 'Kiranya Allah, sumber pengharapan, memenuhi kamu dengan segala sukacita dan damai sejahtera dalam iman kamu.', ref: 'Roma 15:13' },
  { text: 'Bersukacitalah dalam pengharapan, sabarlah dalam kesesakan, dan bertekunlah dalam doa!', ref: 'Roma 12:12' },
  { text: 'Langit dan bumi akan berlalu, tetapi perkataan-Ku tidak akan berlalu.', ref: 'Matius 24:35' },
  { text: 'TUHAN dekat pada setiap orang yang berseru kepada-Nya, pada setiap orang yang berseru kepada-Nya dalam kesetiaan.', ref: 'Mazmur 145:18' },
  { text: 'Dengan Allah akan kita lakukan perbuatan-perbuatan gagah perkasa, sebab Ia sendiri akan menginjak-injak para lawan kita.', ref: 'Mazmur 60:14' },
  { text: 'Jadilah kuat dan berani, jangan takut, sebab TUHAN menyertai langkahmu.', ref: 'Ulangan 31:6' },
  { text: 'Setiap pemberian yang baik dan setiap anugerah yang sempurna, datangnya dari atas.', ref: 'Yakobus 1:17' },
  { text: 'Cukuplah kasih karunia-Ku bagimu, sebab justru dalam kelemahanlah kuasa-Ku menjadi sempurna.', ref: '2 Korintus 12:9' },
];

export function verseForDate(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d - start) / 86400000);
  return VERSES[dayOfYear % VERSES.length];
}

export default function DailyVerse({ date } = {}) {
  const verse = verseForDate(date instanceof Date ? date : new Date());
  return (
    <div className="rounded-xl border border-red-500/20 bg-[#0a0304]/70 px-5 py-4 text-center shadow-[0_0_24px_rgba(255,30,66,0.08)] backdrop-blur-md">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-red-400">
        Ayat hari ini
      </p>
      <p className="text-sm italic leading-relaxed text-red-100/80">
        &ldquo;{verse.text}&rdquo;
      </p>
      <p className="mt-2 text-xs font-medium text-red-300/60">
        {verse.ref} (TB)
      </p>
    </div>
  );
}
