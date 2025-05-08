module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks'],
  rules: {
    // Prevent issues with boolean attributes in React
    'react/boolean-prop-naming': 'warn',
    'react/no-unknown-property': 'warn',
    
    // More relaxed rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_', 
      varsIgnorePattern: '^_' 
    }],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
