module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.ts', '**/*.(test|spec).ts'],
    transform: {
        '^.+\\.(t|js)ts$': 'ts-jest',
    },
    collectCoverageFrom: [
        'src/**/*.(t|j)s',
        '!src/**/*.spec.ts',
        '!src/**/*.test.ts',
        '!src/**/*.interface.ts',
        '!src/**/*.dto.ts',
        '!src/**/*.entity.ts',
        '!src/**/*.enum.ts',
        '!src/main.ts',
        '!src/**/*.module.ts',
        '!generated/**/*',
    ],
    coverageDirectory: '../coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testTimeout: 10000,
    verbose: true,
    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,
    // Global setup for test environment
    globalSetup: '<rootDir>/test/jest.global-setup.ts',
    globalTeardown: '<rootDir>/test/jest.global-teardown.ts',
}; 