/** A captured account snapshot, owned by the session store. */
export interface AccountContext {
  readonly accountId: string;
  readonly brokerAccount: string;
  readonly routingPrefix: string;
  readonly tradable: boolean;
  /** Already excludes reserved funds; integer USD cents. */
  readonly cashAvailableMinor: number;
}
