module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  collectCoverageFrom: [
    'model/data.js',
    'controller/**/*.js'
  ],
  coverageThreshold: {
    'model/data.js': {
      statements: 80
    }
  },
  // Longer timeout for async DB operations
  testTimeout: 10000
};
