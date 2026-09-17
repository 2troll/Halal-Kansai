/**
 * Ajustes del cálculo de rezo: método y escuela del Asr.
 *
 * Se guardan en el propio teléfono y se leen en todos los sitios que calculan
 * horas (pantalla, avisos, widget, imagen para compartir, ayuno): si uno solo
 * se quedara con el método de antes, el aviso sonaría a una hora y la
 * pantalla diría otra.
 */
import { METHODS, methodFor, type AsrSchool, type CalcMethod, type MethodId } from './calculator';
import { t, type Dict } from '../../i18n';

const METHOD_KEY = 'hk-salat-method';
const SCHOOL_KEY = 'hk-salat-asr';

export const METHOD_IDS = Object.keys(METHODS) as MethodId[];
export const SCHOOLS: AsrSchool[] = ['shafii', 'hanafi'];

const METHOD_LABEL: Record<MethodId, keyof Dict> = {
  mwl: 'methodMwl',
  karachi: 'methodKarachi',
  isna: 'methodIsna',
  egypt: 'methodEgypt',
  makkah: 'methodMakkah',
  indonesia: 'methodIndonesia',
};

const SCHOOL_LABEL: Record<AsrSchool, keyof Dict> = {
  shafii: 'asrShafii',
  hanafi: 'asrHanafi',
};

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getMethodId(): MethodId {
  const saved = read(METHOD_KEY);
  return saved && saved in METHODS ? (saved as MethodId) : 'mwl';
}

export function getSchool(): AsrSchool {
  return read(SCHOOL_KEY) === 'hanafi' ? 'hanafi' : 'shafii';
}

export function setMethod(id: MethodId, school: AsrSchool): void {
  try {
    localStorage.setItem(METHOD_KEY, id);
    localStorage.setItem(SCHOOL_KEY, school);
  } catch {
    /* sin almacenamiento: vale para esta sesión, no se recuerda */
  }
}

export function currentMethod(): CalcMethod {
  return methodFor(getMethodId(), getSchool());
}

export const methodLabel = (id: MethodId): string => t(METHOD_LABEL[id]);
export const schoolLabel = (school: AsrSchool): string => t(SCHOOL_LABEL[school]);

/** «Liga del Mundo Islámico · Asr Hanafi», para el subtítulo y la imagen. */
export function methodSummary(): string {
  return `${methodLabel(getMethodId())} · ${schoolLabel(getSchool())}`;
}

/**
 * Diferencia con UTC, en horas, del reloj del teléfono en esa fecha.
 *
 * Antes era 9 fijo (Japón). Quien viaja, o quien se lleva la app al salir de
 * Japón, veía las horas desplazadas tantas horas como su huso. Se pide por
 * fecha porque el cambio de horario de verano cae en días concretos.
 */
export function timezoneHours(date: Date): number {
  return -date.getTimezoneOffset() / 60;
}
