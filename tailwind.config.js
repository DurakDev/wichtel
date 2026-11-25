module.exports = {
  content: ['./public/**/*.html', './public/**/*.js'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: { pine: '#10261d', pine2: '#17382a', gold: '#d8b46a', cream: '#f7f2e8' },
      boxShadow: { soft: '0 24px 70px rgba(16,38,29,.14)' }
    }
  },
  plugins: []
};
