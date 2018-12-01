module.exports = {
  extends: 'eslint:recommended',

  rules: {
    'no-console': 0,
  },

  parserOptions: {
    ecmaVersion: 8,
    sourceType: 'module',
    ecmaFeatures: {
      experimentalObjectRestSpread: true
    }
  },

  env: {
    node: true,
    es6: true,
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

