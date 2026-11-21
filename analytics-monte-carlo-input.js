(function (global) {
  'use strict';

  const DEFAULT_SIMULATIONS = 200;

  function readFiniteNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  }

  function validate(input) {
    const source = input && typeof input === 'object' ? input : {};
    const invalidParameters = [];
    const values = {};
    const read = (name, predicate) => {
      const value = readFiniteNumber(source[name]);
      if (value === null || !predicate(value)) {
        invalidParameters.push(name);
        return null;
      }
      return value;
    };

    values.currentValue = read('currentValue', value => value >= 0);
    values.targetValue = read('targetValue', value => value > 0);
    values.monthlyContribution = source.monthlyContribution === undefined
      ? 0
      : read('monthlyContribution', value => value >= 0);
    values.expectedReturn = read('expectedReturn', value => value > -1 && value <= 1);
    values.volatility = read('volatility', value => value >= 0 && value <= 1);
    values.years = read('years', value => value >= 0 && value <= 100);

    const defaultsApplied = [];
    if (source.simulations === undefined) {
      values.simulations = DEFAULT_SIMULATIONS;
      defaultsApplied.push('simulations');
    } else {
      values.simulations = read('simulations', value => Number.isInteger(value) && value >= 1 && value <= 10000);
    }

    return invalidParameters.length
      ? { ok: false, error: 'INVALID_INPUT', invalidParameters }
      : { ok: true, values, defaultsApplied };
  }

  function resultOverflow() {
    return { valid: false, error: 'RESULT_OVERFLOW', invalidParameters: [] };
  }

  const api = { validate, resultOverflow };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.MonteCarloInputContract = api;
})(typeof window !== 'undefined' ? window : globalThis);
