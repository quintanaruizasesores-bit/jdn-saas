import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { firmarTokenBaja, verificarTokenBaja } from './baja';

const PREV = process.env.CROSSSELL_UNSUBSCRIBE_SECRET;

beforeEach(() => {
  process.env.CROSSSELL_UNSUBSCRIBE_SECRET = 'secreto-de-prueba-123';
});
afterEach(() => {
  process.env.CROSSSELL_UNSUBSCRIBE_SECRET = PREV;
});

describe('token de baja', () => {
  it('firma y verifica ida y vuelta', () => {
    const token = firmarTokenBaja({ w: 'ws-1', e: 'cli@example.com', c: 'c-1' });
    expect(token).toBeTruthy();
    const payload = verificarTokenBaja(token!);
    expect(payload).toEqual({ w: 'ws-1', e: 'cli@example.com', c: 'c-1' });
  });

  it('rechaza un token manipulado', () => {
    const token = firmarTokenBaja({ w: 'ws-1', e: 'cli@example.com' })!;
    const [data] = token.split('.');
    expect(verificarTokenBaja(`${data}.firmafalsa`)).toBeNull();
  });

  it('rechaza un token firmado con otro secreto', () => {
    const token = firmarTokenBaja({ w: 'ws-1', e: 'cli@example.com' })!;
    process.env.CROSSSELL_UNSUBSCRIBE_SECRET = 'otro-secreto';
    expect(verificarTokenBaja(token)).toBeNull();
  });

  it('sin secreto no firma ni verifica', () => {
    delete process.env.CROSSSELL_UNSUBSCRIBE_SECRET;
    expect(firmarTokenBaja({ w: 'ws', e: 'a@b.com' })).toBeNull();
    expect(verificarTokenBaja('x.y')).toBeNull();
  });
});
