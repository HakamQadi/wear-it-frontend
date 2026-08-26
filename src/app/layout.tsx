import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { I18nProvider } from '@/context/I18nContext';
import { DEFAULT_LOCALE, LOCALE_DIRECTION } from '@/lib/i18n/config';

export const metadata: Metadata = {
  title: 'Wear It — خزانتك، رقميًا',
  description:
    'صوّر الملابس التي تملكها، واحفظها في خزانة افتراضية، واستخدم الذكاء الاصطناعي لترى نفسك مرتديًا أي تنسيق منها.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The document is served in the default language; I18nProvider updates lang and dir
  // if the visitor has chosen another one.
  return (
    <html lang={DEFAULT_LOCALE} dir={LOCALE_DIRECTION[DEFAULT_LOCALE]}>
      <body>
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
