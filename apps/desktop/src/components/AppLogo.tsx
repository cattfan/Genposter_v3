const LOGO_URL = "/logo.png";

const PRESETS = {
  rail: { width: 72, height: 30 },
  banner: { width: 92, height: 38 },
  header: { width: 108, height: 44 },
} as const;

export type AppLogoVariant = keyof typeof PRESETS;

export function AppLogo({
  variant = "rail",
  width,
}: {
  variant?: AppLogoVariant;
  /** Override width; height scales to logo aspect (~2.4:1). */
  width?: number;
}) {
  const preset = PRESETS[variant];
  const w = width ?? preset.width;
  const h = Math.round(w / 2.4);

  return (
    <img
      src={LOGO_URL}
      alt="Riviu"
      width={w}
      height={h}
      className={`app-logo app-logo--${variant}`}
      draggable={false}
    />
  );
}
