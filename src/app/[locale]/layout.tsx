import type {Metadata, Viewport} from 'next';
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {setRequestLocale, getTranslations} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/i18n/routing';
import {themeScript} from '@/theme/preferences';
import 'pretendard/dist/web/static/pretendard-dynamic-subset.css';
import '../globals.css';

export const viewport: Viewport = {width: 'device-width', initialScale: 1, viewportFit: 'cover'};
export function generateStaticParams() {return routing.locales.map(locale => ({locale}));}
export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'meta'});
  return {title: t('title'), description: t('description')};
}
export default async function LocaleLayout({children, params}: Readonly<{children: React.ReactNode; params: Promise<{locale: string}>}>) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <html lang={locale} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html: themeScript}} /></head>
    <body><NextIntlClientProvider>{children}</NextIntlClientProvider></body></html>;
}
