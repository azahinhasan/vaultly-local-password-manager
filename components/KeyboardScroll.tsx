import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  TextInput,
  View,
  ViewStyle,
} from "react-native";

const ScrollToFocused = createContext<(() => void) | null>(null);

/** Called by text fields when they gain focus so the form can scroll them into view. */
export const useScrollToFocused = () => useContext(ScrollToFocused);

// Space kept above a focused field when scrolling it into view.
const FIELD_MARGIN = 80;

/**
 * A form ScrollView that keeps the focused field visible above the keyboard.
 * The app draws edge-to-edge, so on Android the keyboard no longer resizes the
 * screen: it just covers the bottom, and fields there can't be seen. This adds
 * keyboard-height padding (so there is room to scroll) and scrolls the focused
 * field up. iOS already handles this with KeyboardAvoidingView.
 */
export function KeyboardScroll({
  children,
  contentContainerStyle,
  ...props
}: Omit<ScrollViewProps, "contentContainerStyle"> & {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollToFocused = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    if (!input || !contentRef.current) return;
    input.measureLayout(
      contentRef.current,
      (_x, y) =>
        scrollRef.current?.scrollTo({ y: Math.max(0, y - FIELD_MARGIN), animated: true }),
      () => {},
    );
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      // Wait a frame so the extra padding has been laid out before scrolling.
      setTimeout(scrollToFocused, 50);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollToFocused]);

  return (
    <ScrollToFocused.Provider value={() => void setTimeout(scrollToFocused, 150)}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        {...props}
        contentContainerStyle={
          Platform.OS === "android" && keyboardHeight
            ? { paddingBottom: keyboardHeight + 24 }
            : undefined
        }
      >
        <View ref={contentRef} collapsable={false} style={contentContainerStyle}>
          {children}
        </View>
      </ScrollView>
    </ScrollToFocused.Provider>
  );
}
