import { cookies } from "next/headers";
import Navbar from "./components/Navbar";
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister";
import ThemeProvider from "@/app/components/ThemeProvider";
import QueryProvider from "@/app/components/QueryProvider";
import { getThemeFromCookie, type Theme } from "@/lib/theme";
import "./globals.css";

export const metadata = {
  title: "IMDb Clone",
  description: "IMDb Clone built with Next.js, Tailwind, and TypeScript",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("app-theme")?.value ?? "";
  const theme: Theme = getThemeFromCookie(themeCookie) ?? "dark";

  const nonce =
    process.env.NODE_ENV === "production"
      ? Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64")
      : "dev-nonce";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var cookie = document.cookie.match(/app-theme=([^;]+)/);
                  var stored = cookie ? cookie[1] : localStorage.getItem('app-theme');
                  var valid = ['dark','light','high-contrast','auto'];
                  var theme = valid.includes(stored) ? stored : 'dark';
                  if (theme === 'auto') {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                  document.documentElement.classList.add('theme-' + theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <QueryProvider>
          <ThemeProvider initialTheme={theme}>
            <Navbar />
            <ServiceWorkerRegister />
            <main className="pt-24">{children}</main>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}