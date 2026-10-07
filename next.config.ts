import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const config: NextConfig = {devIndicators: false};
export default withNextIntl(config);
