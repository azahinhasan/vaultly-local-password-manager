import { Colors } from "@/constants/colors";
import { useColorScheme } from "react-native";

export function useThemeColors() {
  const scheme = useColorScheme();
  return Colors[scheme === "dark" ? "dark" : "light"];
}
