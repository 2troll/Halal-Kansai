import { describe, expect, it } from 'vitest';
import { pickLang } from '../src/i18n/detect';

const SUPPORTED = ['en', 'ja', 'ar', 'es', 'zh', 'ko', 'fil', 'pt', 'id', 'vi'];

describe('idioma del teléfono', () => {
  it('toma el primero soportado de la lista', () => {
    expect(pickLang(['vi-VN', 'en-US'], SUPPORTED)).toBe('vi');
    expect(pickLang(['sw-KE', 'fil-PH'], SUPPORTED)).toBe('fil');
  });

  it('entiende los códigos antiguos de Android', () => {
    expect(pickLang(['tl-PH'], SUPPORTED)).toBe('fil');
    expect(pickLang(['in-ID'], SUPPORTED)).toBe('id');
  });

  it('variantes regionales y de escritura', () => {
    expect(pickLang(['zh-Hans-JP'], SUPPORTED)).toBe('zh');
    expect(pickLang(['pt-BR'], SUPPORTED)).toBe('pt');
    expect(pickLang(['ko_KR'], SUPPORTED)).toBe('ko');
  });

  it('nada soportado → inglés', () => {
    expect(pickLang(['sw-KE', 'am-ET'], SUPPORTED)).toBe('en');
    expect(pickLang([], SUPPORTED)).toBe('en');
  });
});
