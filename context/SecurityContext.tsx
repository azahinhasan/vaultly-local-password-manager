import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenCapture from "expo-screen-capture";
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

interface SecurityContextType {
  autoLock: AutoLock;
  setAutoLock: (v: AutoLock) => void;
  hideInSwitcher: boolean;
  setHideInSwitcher: (v: boolean) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(
  undefined,
);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [autoLock, setAutoLockState] = useState<AutoLock>("1min");
  const [hideInSwitcher, setHideState] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet([AUTO_LOCK_KEY, HIDE_KEY]).then(([lock, hide]) => {
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

  return (
    <SecurityContext.Provider
      value={{ autoLock, setAutoLock, hideInSwitcher, setHideInSwitcher }}
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
