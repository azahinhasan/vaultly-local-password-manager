import { PinPromptDialog } from "@/components/PinPromptDialog";
import { ReactNode, useCallback, useState } from "react";

interface AskOptions {
  title: string;
  message?: string;
  /** Resolves true when the PIN entered is correct. */
  verify: (pin: string) => Promise<boolean>;
}

// Shared by every gate: slows down guessing after repeated wrong PINs.
let failures = 0;
let lockedUntil = 0;
const FREE_ATTEMPTS = 5;

/**
 * A PIN prompt you can await:
 *   const [pinDialog, askPin] = usePinGate();
 *   if (!(await askPin({ title, verify }))) return;   // cancelled or wrong
 * Render \`{pinDialog}\` once in the screen.
 */
export function usePinGate(): [ReactNode, (opts: AskOptions) => Promise<boolean>] {
  const [request, setRequest] = useState<{
    opts: AskOptions;
    resolve: (ok: boolean) => void;
  } | null>(null);
  const [error, setError] = useState("");

  const ask = useCallback(
    (opts: AskOptions) =>
      new Promise<boolean>((resolve) => {
        setError("");
        setRequest({ opts, resolve });
      }),
    [],
  );

  const submit = async (pin: string) => {
    if (!request) return;
    const wait = Math.ceil((lockedUntil - Date.now()) / 1000);
    if (wait > 0) {
      setError(`Too many attempts. Try again in ${wait}s.`);
      return;
    }
    if (await request.opts.verify(pin)) {
      failures = 0;
      request.resolve(true);
      setRequest(null);
      return;
    }
    failures += 1;
    if (failures >= FREE_ATTEMPTS) {
      lockedUntil = Date.now() + Math.min(300, 30 * (failures - FREE_ATTEMPTS + 1)) * 1000;
    }
    setError("Incorrect PIN.");
  };

  const cancel = () => {
    request?.resolve(false);
    setRequest(null);
    setError("");
  };

  const dialog = (
    <PinPromptDialog
      visible={request !== null}
      title={request?.opts.title ?? ""}
      message={request?.opts.message}
      error={error}
      onSubmit={submit}
      onCancel={cancel}
    />
  );
  return [dialog, ask];
}
