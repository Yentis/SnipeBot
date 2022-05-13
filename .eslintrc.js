module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'standard'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json']
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    'comma-dangle': 'off',
    'import/extensions': 'off',
    'no-console': 'off',
    'linebreak-style': 'off',
    'arrow-body-style': 'off',
    'semi': ['error', 'always'],
    'space-before-function-paren': 'off',
    '@typescript-eslint/no-floating-promises': ['error']
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.ts']
      }
    }
  }
};
