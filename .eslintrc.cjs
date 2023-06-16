module.exports = {
  extends: 'eslint:recommended',

  rules: {
    'no-console': 0,
  },

  env: {
    node: true,
    es2020: true,
  },

  parserOptions: {
    sourceType: 'module',
  },

  // Overrides for test files
  overrides: [{
    files: ['src/**/*.spec.js'],
    env: { mocha: true },
    globals: {
      sinon: true,
      expect: true,
    },
  }],
};

