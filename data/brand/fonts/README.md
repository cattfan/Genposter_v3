# Brand fonts

Drop `.ttf` files here. The app auto-registers these families (missing files are
skipped) and waits for `document.fonts.ready` before rendering.

## Download catalog fonts

From the repo root, fetch all Vietnamese-subset fonts listed in
`apps/desktop/src/lib/font-catalog.ts`:

```bash
pnpm fetch:fonts
```

The script skips files that already exist, logs `ok` / `skip` / `error`, and
continues on individual failures. Re-run after clone or when adding families to
the catalog.

**Release note:** Tier **A** families should be present in `data/brand/fonts/`
before shipping (either committed or produced by running `pnpm fetch:fonts` in
CI/release prep).

## License

Fonts are sourced from [Google Fonts](https://fonts.google.com/) under the
[SIL Open Font License (OFL)](https://openfontlicense.org/). Keep license
files with any redistributed binaries where required by the OFL.

## Vietnamese test string

Use this to verify diacritics render correctly:

```
Tiếng Việt: ĂăÂâĐđÊêÔôƠơƯư — «Xin chào, đẹp và rõ ràng!»
```

## Recommended (Vietnamese-complete) for titles/body

- `BeVietnamPro-Regular.ttf` (400)
- `BeVietnamPro-Medium.ttf` (500)
- `BeVietnamPro-SemiBold.ttf` (600)
- `BeVietnamPro-Bold.ttf` (700)
- `BeVietnamPro-Italic.ttf` (italic 400)

## Already present (headings)

- `Montserrat-Bold.ttf` (700)
- `Montserrat-ExtraBold.ttf` (800)

> Note: Montserrat lacks some Vietnamese diacritics — prefer Be Vietnam Pro for
> Vietnamese text.
