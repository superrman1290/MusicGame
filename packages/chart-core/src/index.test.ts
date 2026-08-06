import { describe, expect, it } from 'vitest';
import { CORE_VERSION } from './index';

describe('chart core scaffold', () => {
  it('exposes a version', () => expect(CORE_VERSION).toBe(1));
});

