import contract from './loTaskContract.json';
export { contract };
export type Gate = typeof contract.gates[number];
export type State = typeof contract.states[number];
export type Mode = 'values' | 'margins';
export const format = (value: number, signed = false) => `${value < 0 ? '−' : signed ? '+' : ''}${Math.abs(value).toFixed(4)}`;
export function measurement(state: State, gate: Gate) {
  const value = state.values[gate.key as keyof State['values']];
  if (value === null) return { value, margin:null, tone:'unknown', status:'Not evaluated' };
  const margin = Math.min(gate.min === undefined ? Infinity : value - gate.min, gate.max === undefined ? Infinity : gate.max - value);
  const pass = gate.strict ? margin > 0 : margin >= 0;
  const narrow = pass && gate.key === 'bbb' && margin < .005;
  return { value, margin, tone:pass ? narrow ? 'narrow' : 'pass' : 'fail', status:pass ? narrow ? 'Pass, narrow margin' : 'Pass' : 'Outside requirement' };
}
export function layout(state: State, gate: Gate, mode: Mode) {
  const m = measurement(state, gate);
  const span = gate.range[1] - gate.range[0];
  const range = mode === 'values' ? gate.range : [-span, span];
  const position = (n:number) => Math.max(0, Math.min(100, (n-range[0])/(range[1]-range[0])*100));
  const lower = mode === 'margins' ? 0 : gate.min ?? range[0];
  const upper = mode === 'margins' ? range[1] : gate.max ?? range[1];
  const v = mode === 'values' ? m.value : m.margin;
  return {
    ...m,
    point:v === null ? 50 : position(v),
    start:position(lower), end:position(upper),
    lowBoundary:mode === 'margins' || gate.min !== undefined,
    highBoundary:mode === 'values' && gate.max !== undefined,
    display:v === null ? 'Not evaluated' : format(v, mode === 'margins'),
    detail:`${gate.label}. ${m.value === null ? 'Not evaluated.' : `Value ${format(m.value)}. Required ${gate.rule}. Margin ${format(m.margin!,true)}. ${m.status}.`}`,
  };
}
