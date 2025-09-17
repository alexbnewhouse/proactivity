/**
 * Minimal ADHD-Friendly Test Setup
 * Keep it simple - avoid TypeScript gymnastics
 */

import { jest } from '@jest/globals';

// Simple global assignments - let TypeScript relax
(global as any).Notice = jest.fn();

// Basic plugin mock - just enough to not crash
(global as any).Plugin = jest.fn();
(global as any).Modal = jest.fn();
(global as any).Setting = jest.fn();
(global as any).PluginSettingTab = jest.fn();

// ADHD-friendly utilities - minimal and clear
export const createMockPlugin = () => ({
  app: {
    vault: {
      read: jest.fn(),
      create: jest.fn(),
      modify: jest.fn(),
    },
    workspace: {
      activeLeaf: null,
      openLinkText: jest.fn(),
    },
  },
  addCommand: jest.fn(),
  loadData: jest.fn().mockResolvedValue({}),
  saveData: jest.fn().mockResolvedValue(undefined),
});

// Quick assertion helpers for ADHD developers
export const expectNoErrors = (fn: () => any) => {
  expect(() => fn()).not.toThrow();
};

export const expectValidSettings = (settings: any) => {
  expect(settings).toBeDefined();
  expect(typeof settings).toBe('object');
  expect(settings).not.toBeNull();
};