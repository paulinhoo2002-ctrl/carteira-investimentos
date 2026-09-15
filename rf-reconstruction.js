'use strict';

/* Pure RF reconstruction boundary. It derives the current position from the
 * contribution/base snapshot plus explicit canonical principal events. */
(function (root, factory) {
  const api = Object.freeze(factory());
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof document !== 'undefined' && !root.ProtectedRfReconstruction) {
    Object.defineProperty(root, 'ProtectedRfReconstruction', {
      configurable: false,
      enumerable: false,
      value: api,
      writable: false,
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : undefined, function () {
  const roundMoney = value => Number((Number(value) || 0).toFixed(2));

  function eventOrder(left, right) {
    return String(left?.date || '').localeCompare(String(right?.date || ''))
      || String(left?.id || left?.autoKey || '').localeCompare(String(right?.id || right?.autoKey || ''));
  }

  function reconstructRfPosition({ baseApplied, baseCurrent, events = [] } = {}) {
    const applied = Number(baseApplied);
    const current = Number(baseCurrent);
    if (!Number.isFinite(applied) || applied < 0 || !Number.isFinite(current) || current < 0) {
      return { ok: false, reason: 'INVALID_BASE_POSITION' };
    }

    let principal = roundMoney(applied);
    let currentValue = roundMoney(current);
    const orderedEvents = (Array.isArray(events) ? events : []).slice().sort(eventOrder);

    for (const event of orderedEvents) {
      const delta = Number(event?.principalDelta);
      if (!Number.isFinite(delta) || delta === 0) continue;
      const nextPrincipal = roundMoney(principal + delta);
      if (nextPrincipal < -0.005) {
        return { ok: false, reason: 'NEGATIVE_PRINCIPAL', eventId: String(event?.id || event?.autoKey || '') };
      }
      principal = Math.max(0, nextPrincipal);
      currentValue = roundMoney(currentValue + delta);
      if (currentValue < -0.005) {
        return { ok: false, reason: 'NEGATIVE_CURRENT_VALUE', eventId: String(event?.id || event?.autoKey || '') };
      }
      currentValue = Math.max(0, currentValue);
    }

    return {
      ok: true,
      appliedValue: principal,
      currentValue,
      eventCount: orderedEvents.length,
    };
  }

  return { reconstructRfPosition };
});
