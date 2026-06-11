import type { MockSourceMessage } from "./source-message-types.js";
import { validateSourceMessage } from "./source-message-validation.js";

export type RoutedSourceMessage =
  | {
      readonly routed: true;
      readonly message: MockSourceMessage;
    }
  | {
      readonly routed: false;
    };

export function routeSourceMessage(message: unknown): RoutedSourceMessage {
  const validation = validateSourceMessage(message);

  if (!validation.valid) {
    console.warn("Dropping invalid source message.", { reason: validation.reason });
    return { routed: false };
  }

  return {
    routed: true,
    message: validation.message
  };
}
