// Contract tests para NotificationPort. Spec ejecutable de la interfaz.
//
// Uso desde tests/notifier.test.ts:
//   import { notificationPortContract } from './contracts/NotificationPort.contract';
//   notificationPortContract(() => new InAppNotifier());

import { describe, expect, it } from 'vitest';
import type { NotificationPort } from '../../src/domain/ports';
import type { Notification } from '../../src/domain/types';

export function notificationPortContract(make: () => NotificationPort) {
  describe('NotificationPort — contract', () => {
    const sample = (overrides: Partial<Notification> = {}): Notification => ({
      id: 'n-1',
      clientId: 'cli-1',
      kind: 'confirmation',
      body: 'Hola',
      createdAt: '2026-05-30T10:00:00.000Z',
      ...overrides,
    });

    it('notify + list — emite y se lista', () => {
      const notifier = make();
      expect(notifier.list()).toEqual([]);
      const n = sample();
      notifier.notify(n);
      expect(notifier.list()).toHaveLength(1);
      expect(notifier.list()[0]).toEqual(n);
    });

    it('list devuelve en orden de emisión', () => {
      const notifier = make();
      notifier.notify(sample({ id: 'a' }));
      notifier.notify(sample({ id: 'b' }));
      notifier.notify(sample({ id: 'c' }));
      expect(notifier.list().map((n) => n.id)).toEqual(['a', 'b', 'c']);
    });

    it('acepta todos los kinds válidos', () => {
      const notifier = make();
      const kinds: Notification['kind'][] = ['confirmation', 'upsell', 'backfill_offer', 'reminder'];
      kinds.forEach((kind, i) => notifier.notify(sample({ id: `n-${i}`, kind })));
      expect(notifier.list()).toHaveLength(4);
    });
  });
}
