export default {
  output: "standalone",
  experimental: {
    outputFileTracingIncludes: {
      'app/api/scrape/route': ['node_modules/**/@sparticuz/chromium/**'],
      'src/app/api/scrape/route': ['node_modules/**/@sparticuz/chromium/**'],
    },
  },
};
