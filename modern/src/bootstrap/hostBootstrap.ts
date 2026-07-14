import { bootstrapHost as bootstrapHostImpl } from '../host.tsx';
import type { HostBootstrapOptions } from '../host.tsx';

export type { HostBootstrapOptions } from '../host.tsx';

export async function bootstrapHost(options: HostBootstrapOptions = {}) {
  return bootstrapHostImpl(options);
}
