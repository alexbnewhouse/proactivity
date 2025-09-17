/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Changed from 'node' to support DOM testing
  
  // Simple test discovery
  testMatch: ['**/tests/**/*.test.ts'],
  
  // Setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // ADHD-friendly: Fast feedback with minimal noise
  verbose: false,
  testTimeout: 5000,
  
  // Skip complex type checking for speed
  globals: {
    'ts-jest': {
      isolatedModules: true,
      tsconfig: {
        skipLibCheck: true,
      },
    },
  },
};