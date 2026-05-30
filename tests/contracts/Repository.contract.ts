// Contract tests para Repository. Spec ejecutable de la interfaz.
//
// Uso desde tests/repository.test.ts:
//   import { repositoryContract } from './contracts/Repository.contract';
//   repositoryContract(() => new InMemoryRepo(false));   // sin seed

import { describe, expect, it } from 'vitest';
import type { Repository } from '../../src/domain/ports';

export function repositoryContract(make: () => Repository) {
  describe('Repository — contract', () => {
    it('appointments: save + get round-trip', () => {
      const repo = make();
      const appt = {
        id: 'a-1',
        clientId: 'c-1',
        serviceId: 's-1',
        start: '2099-01-01T10:00:00.000Z',
        end: '2099-01-01T11:00:00.000Z',
        status: 'booked' as const,
      };
      repo.saveAppointment(appt);
      expect(repo.getAppointment('a-1')).toEqual(appt);
      expect(repo.listAppointments()).toContainEqual(appt);
    });

    it('waitlist: save + list', () => {
      const repo = make();
      const entry = {
        id: 'w-1',
        clientId: 'c-1',
        serviceId: 's-1',
        windowStart: '2099-01-01T08:00:00.000Z',
        windowEnd: '2099-01-01T18:00:00.000Z',
        createdAt: '2026-05-30T10:00:00.000Z',
      };
      repo.saveWaitlistEntry(entry);
      expect(repo.listWaitlist()).toContainEqual(entry);
    });

    it('notifications: save + list', () => {
      const repo = make();
      const n = {
        id: 'n-1',
        clientId: 'c-1',
        kind: 'confirmation' as const,
        body: 'Hola',
        createdAt: '2026-05-30T10:00:00.000Z',
      };
      repo.saveNotification(n);
      expect(repo.listNotifications()).toContainEqual(n);
    });

    it('reminders: save + list', () => {
      const repo = make();
      const r = { id: 'r-1', appointmentId: 'a-1', dueAt: '2099-01-01T09:00:00.000Z', sent: false };
      repo.saveReminder(r);
      expect(repo.listReminders()).toContainEqual(r);
    });

    it('servicios y clientes: list devuelve un array (vacío si no hay seed)', () => {
      const repo = make();
      expect(Array.isArray(repo.listServices())).toBe(true);
      expect(Array.isArray(repo.listClients())).toBe(true);
    });
  });
}
