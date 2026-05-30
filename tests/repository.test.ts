// Verifica que InMemoryRepo cumple el contrato Repository.
// Si esto falla, InMemoryRepo está mal — la spec ejecutable (tests/contracts/) es la verdad.

import { InMemoryRepo } from '../src/infra/memoryRepo';
import { repositoryContract } from './contracts/Repository.contract';

repositoryContract(() => new InMemoryRepo(false));
