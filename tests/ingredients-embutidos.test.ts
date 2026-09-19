/**
 * Salchichas y el aditivo umami.
 *
 * Auditando con una lista de lo que hay que evitar en una etiqueta japonesa,
 * 49 de 51 términos salían bien pero dos no se reconocían: ソーセージ y
 * うま味調味料. La salchicha es el caso con miga: en Japón suele ser de cerdo
 * —y hasta la de pollo se embute en tripa de cerdo— pero la 魚肉ソーセージ es
 * un básico del konbini y es lícita. Marcarla toda como prohibida habría sido
 * un error tan malo como no marcarla.
 */
import { describe, expect, it } from 'vitest';
import { analyze } from '../src/modules/ingredients/analyze';

const buscar = (label: string, id: string) =>
  analyze(label).findings.find((f) => f.id === id);

describe('salchichas', () => {
  it('la salchicha sin origen declarado es dudosa, no prohibida', () => {
    const a = analyze('原材料名：ソーセージ、食塩、香辛料');
    expect(buscar('原材料名：ソーセージ、食塩', 'sausage')?.status).toBe('mushbooh');
    expect(a.counts.haram).toBe(0);
    expect(a.verdict).toBe('mushbooh');
  });

  it('ウインナー y フランクフルト cuentan como salchicha', () => {
    for (const t of ['ウインナー', 'ウィンナー', 'フランクフルト']) {
      expect(buscar(`原材料名：${t}、食塩`, 'sausage')?.status).toBe('mushbooh');
    }
  });

  it('la salchicha de pescado es lícita y NO salta como dudosa', () => {
    const a = analyze('原材料名：魚肉ソーセージ（魚肉、でん粉、食塩）');
    expect(a.findings.map((f) => f.id)).toContain('sausage-fish');
    // Gana la coincidencia más larga: no debe aparecer también la genérica.
    expect(a.findings.map((f) => f.id)).not.toContain('sausage');
    expect(a.counts.haram).toBe(0);
    expect(a.counts.mushbooh).toBe(0);
  });

  it('おさかなソーセージ también', () => {
    const a = analyze('原材料名：おさかなソーセージ、でん粉');
    expect(a.findings.map((f) => f.id)).toContain('sausage-fish');
    expect(a.findings.map((f) => f.id)).not.toContain('sausage');
  });

  it('salchicha de pescado con mirin: lo lícito no tapa el alcohol', () => {
    const a = analyze('原材料名：魚肉ソーセージ、みりん、食塩');
    expect(a.findings.map((f) => f.id)).toContain('sausage-fish');
    expect(a.counts.haram + a.counts.mushbooh).toBeGreaterThan(0);
  });
});

describe('aditivo umami', () => {
  it('うま味調味料 se lee igual que 調味料（アミノ酸等）', () => {
    const porNombreLargo = analyze('原材料名：調味料（アミノ酸等）').findings[0];
    const porNombreCorto = analyze('原材料名：うま味調味料').findings[0];
    expect(porNombreCorto?.id).toBe(porNombreLargo?.id);
    expect(porNombreCorto?.status).toBe(porNombreLargo?.status);
  });

  it('うまみ調味料 en hiragana también', () => {
    expect(analyze('原材料名：うまみ調味料').findings.length).toBeGreaterThan(0);
  });
});
