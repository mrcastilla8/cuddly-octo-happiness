import { G7Session, secureBase } from "../adapters/g7Session";
import { createHttpPromotionServices } from "../adapters/httpPromotionServices";

// Configuration failure belongs to this integration. The commercial gate
// handles a null provider without preventing independent modules from mounting.
export function createOptionalPromotionSessionRuntime(
  gatewayOrigin: string,
  securityApiBase: string,
) {
  try {
    return createPromotionSessionRuntime(gatewayOrigin, securityApiBase);
  } catch {
    return null;
  }
}

export function createPromotionSessionRuntime(
  gatewayOrigin: string,
  securityApiBase: string,
) {
  const gateway = secureBase(gatewayOrigin, true);
  const session = new G7Session(securityApiBase);
  return {
    session,
    services: createHttpPromotionServices({
      gatewayOrigin: gateway,
      getAccessToken: session.getAccessToken,
      refreshAccessToken: session.refreshAccessToken,
      invalidateAccessToken: session.invalidateAccessToken,
    }),
  };
}
