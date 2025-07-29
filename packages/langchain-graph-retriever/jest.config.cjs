module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { useESM: true }],
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
    ],
    moduleNameMapper: {
        '^@langchain/(.*)$': '<rootDir>/node_modules/@langchain/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1'
    }
};
