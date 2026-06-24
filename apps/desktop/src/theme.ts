import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Riviu orange ramp; index 6 is the brand color #ff6600.
const riviu: MantineColorsTuple = [
  "#fff3eb",
  "#ffe3d2",
  "#ffc4a5",
  "#ffa472",
  "#ff8a4a",
  "#ff7a30",
  "#ff6600",
  "#e65c00",
  "#b34700",
  "#8a3700",
];

export const theme = createTheme({
  primaryColor: "riviu",
  primaryShade: 6,
  colors: { riviu },
  fontFamily:
    '"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily:
      '"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontWeight: "700",
  },
  defaultRadius: "md",
  components: {
    Button: { defaultProps: { radius: "md" } },
    ActionIcon: { defaultProps: { variant: "subtle" } },
    Paper: { defaultProps: { withBorder: true } },
  },
});
