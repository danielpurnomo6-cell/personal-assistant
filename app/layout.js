import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Font sans utama: Geist (variable font, direkomendasikan docs Next 16).
// Google Sans adalah brand typeface proprietary dan tidak tersedia di next/font/google.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Personal Assistant",
  description: "AI Personal Assistant untuk jadwal, tugas, dan ide harian",
};

const themeScript = `(function(){try{var t=localStorage.getItem('pa-theme')||'dark';if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
