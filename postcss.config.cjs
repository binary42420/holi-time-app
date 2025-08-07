// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      // Suppress warnings that cause webpack cache serialization issues
      overrideBrowserslist: ['defaults'],
      ignoreUnknownVersions: true,
    },
  },
}