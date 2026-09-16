import { Geist_Mono, Google_Sans } from "next/font/google";
import Script from "next/script";
import BlobCursor from "./components/BlobCursor";
import "./globals.css";

// Font ala Gemini: Google Sans (brand typeface Google untuk Gemini & produk AI).
const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
      className={`${googleSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <BlobCursor />
        {children}
      </body>
    </html>
  );
}
