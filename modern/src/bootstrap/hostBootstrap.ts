import { bootstrapHost as bootstrapHostImpl } from '../host';
import type { HostBootstrapOptions } from '../host';

export type { HostBootstrapOptions } from '../host';

export async function bootstrapHost(options: HostBootstrapOptions = {}) {
  return bootstrapHostImpl(options);
}
