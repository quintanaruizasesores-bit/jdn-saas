import { describe, it, expect } from 'vitest';
import { buildWhatsappLink } from './whatsapp';

describe('buildWhatsappLink', () => {
  it('arma la URL con el número y el texto encoded', () => {
    const link = buildWhatsappLink('5493515551234', 'Hola Juan');
    expect(link).toBe('https://wa.me/5493515551234?text=Hola%20Juan');
  });

  it('encodea saltos de línea, emojis, tildes y signos', () => {
    const link = buildWhatsappLink('5493515551234', '¡Hola! 🎉\nFeliz día');
    expect(link.startsWith('https://wa.me/5493515551234?text=')).toBe(true);
    const text = link.split('text=')[1];
    expect(text).toContain('%0A'); // salto de línea
    expect(text).toContain('%F0%9F%8E%89'); // emoji 🎉
    expect(text).not.toContain(' ');
    expect(text).not.toContain('\n');
    // Round-trip: decodificar devuelve el mensaje original.
    expect(decodeURIComponent(text)).toBe('¡Hola! 🎉\nFeliz día');
  });
});
