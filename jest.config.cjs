/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  reporters: ['default'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'cobertura'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/analyzer.ts': {
      lines: 85
    },
    './src/baseline.ts': {
      lines: 80
    },
    './src/collector.ts': {
      lines: 75,
      branches: 75
    },
    './src/http-security.ts': {
      branches: 80
    },
    './src/ssh.ts': {
      branches: 80
    },
    './src/shutdown.ts': {
      branches: 70
    }
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.test.json'
      }
    ]
  }
};
