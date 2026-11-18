import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenCapture from "expo-screen-capture";
import { REVIEW_BEFORE_SAVING_KEY } from "../utils/autofill-settings";
import { PIN_EVERY_KEY } from "../utils/biometric";
import { DEFAULT_PIN_EVERY_HOURS, isPinEveryHours } from "../utils/pin-policy";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type AutoLock = "immediately" | "1min" | "5min";

export const AUTO_LOCK_OPTIONS: { value: AutoLock; label: string; ms: number }[] =
  [
    { value: "immediately", label: "Immediately", ms: 0 },
    { value: "1min", label: "1 min", ms: 60_000 },
    { value: "5min", label: "5 min", ms: 300_000 },
  ];

const AUTO_LOCK_KEY = "autoLock";
const HIDE_KEY = "hideInSwitcher";
const BREACH_KEY = "breachAlerts";

interface SecurityContextType {
  autoLock: AutoLock;
  /** Show the save form after Android's save popup (off = save right after unlocking). */
  reviewBeforeSaving: boolean;
  setReviewBeforeSaving: (v: boolean) => void;
  /** Hours after a manual PIN entry during which biometric unlock is allowed. */
  pinEveryHours: number;
  setPinEveryHours: (hours: number) => void;
  setAutoLock: (v: AutoLock) => void;
  hideInSwitcher: boolean;
  setHideInSwitcher: (v: boolean) => void;
  /** Opt-in: check passwords against known breaches (sends a 5-char hash prefix online). */
  breachAlerts: boolean;
  setBreachAlerts: (v: boolean) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(
  undefined,
);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [autoLock, setAutoLockState] = useState<AutoLock>("1min");
  const [reviewBeforeSaving, setReviewState] = useState(false);
  const [pinEveryHours, setPinEveryState] = useState(DEFAULT_PIN_EVERY_HOURS);
  const [hideInSwitcher, setHideState] = useState(true);
  const [breachAlerts, setBreachState] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([AUTO_LOCK_KEY, HIDE_KEY, BREACH_KEY, PIN_EVERY_KEY, REVIEW_BEFORE_SAVING_KEY]).then(([lock, hide, breach, pinEvery, review]) => {
      setReviewState(review[1] === "true");
      if (isPinEveryHours(Number(pinEvery[1]))) setPinEveryState(Number(pinEvery[1]));
      setBreachState(breach[1] === "true");
      if (AUTO_LOCK_OPTIONS.some((o) => o.value === lock[1])) {
        setAutoLockState(lock[1] as AutoLock);
      }
      if (hide[1] !== null) {
        setHideState(hide[1] === "true");
      }
    });
  }, []);

  // FLAG_SECURE on Android (also blocks screenshots); hides the preview on iOS.
  useEffect(() => {
    (hideInSwitcher
      ? ScreenCapture.preventScreenCaptureAsync()
      : ScreenCapture.allowScreenCaptureAsync()
    ).catch(() => {});
  }, [hideInSwitcher]);

  const setAutoLock = (v: AutoLock) => {
    setAutoLockState(v);
    AsyncStorage.setItem(AUTO_LOCK_KEY, v);
  };
  const setHideInSwitcher = (v: boolean) => {
    setHideState(v);
    AsyncStorage.setItem(HIDE_KEY, String(v));
  };

  const setReviewBeforeSaving = (v: boolean) => {
    setReviewState(v);
    AsyncStorage.setItem(REVIEW_BEFORE_SAVING_KEY, String(v));
  };
  const setPinEveryHours = (hours: number) => {
    setPinEveryState(hours);
    AsyncStorage.setItem(PIN_EVERY_KEY, String(hours));
  };
  const setBreachAlerts = (v: boolean) => {
    setBreachState(v);
    AsyncStorage.setItem(BREACH_KEY, String(v));
  };

  return (
    <SecurityContext.Provider
      value={{
        autoLock,
        setAutoLock,
        reviewBeforeSaving,
        setReviewBeforeSaving,
        pinEveryHours,
        setPinEveryHours,
        hideInSwitcher,
        setHideInSwitcher,
        breachAlerts,
        setBreachAlerts,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error("useSecurity must be used within SecurityProvider");
  }
  return context;
}
