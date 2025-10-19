/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // force-include Sparticuz chromium assets in the lambda bundle
    outputFileTracingIncludes: {
      'app/api/scrape/route': ['node_modules/@sparticuz/chromium/bin/**'],
      'src/app/api/scrape/route': ['node_modules/@sparticuz/chromium/bin/**'],
    },
  },
};

export default nextConfig;
