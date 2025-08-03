module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: ['next/babel'],
      plugins: ['@babel/plugin-transform-private-methods', '@babel/plugin-transform-class-static-block'],
    }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!node-fetch)/',
  ],
};
