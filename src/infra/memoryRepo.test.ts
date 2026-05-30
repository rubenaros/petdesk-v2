import { describe, expect, it } from 'vitest';
import { InMemoryRepo } from './memoryRepo';

describe('InMemoryRepo (seed)', () => {
  it('siembra 3 servicios', () => {
    const repo = new InMemoryRepo();
    expect(repo.listServices()).toHaveLength(3);
  });

  it('siembra 2 clientes, 1 cita y 2 en lista de espera', () => {
    const repo = new InMemoryRepo();
    expect(repo.listClients()).toHaveLength(2);
    expect(repo.listAppointments()).toHaveLength(1);
    expect(repo.listWaitlist()).toHaveLength(2);
  });

  it('permite arrancar vacío con seed=false', () => {
    const repo = new InMemoryRepo(false);
    expect(repo.listServices()).toHaveLength(0);
  });
});
