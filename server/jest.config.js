module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'models/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
  ],
  modulePathIgnorePatterns: ['node_modules'],
};
