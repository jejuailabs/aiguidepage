import {getRequestConfig} from 'next-intl/server';
import {hasLocale} from 'next-intl';
import {routing} from './routing';
export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const fallback = (await import('../../messages/ko.json')).default;
  const messages = locale === 'ko' ? fallback : (await import('../../messages/en.json')).default;
  return {locale, messages};
});
