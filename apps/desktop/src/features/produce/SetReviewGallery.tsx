import { Card, Checkbox, Group, ScrollArea, Stack, Text, Textarea } from "@mantine/core";

import type { RenderedSet } from "../../lib/render.js";

/**
 * Post-generate review: one card per rendered set with its page images and an
 * editable caption. Deselected sets are excluded from the zip export.
 */
export function SetReviewGallery({
  rendered,
  captions,
  selected,
  summaries,
  captionEnabled,
  onToggle,
  onCaptionChange,
}: {
  rendered: RenderedSet[];
  captions: Record<number, string>;
  selected: Set<number>;
  summaries: Record<number, string[]>;
  captionEnabled: boolean;
  onToggle: (setIndex: number) => void;
  onCaptionChange: (setIndex: number, caption: string) => void;
}) {
  return (
    <Stack gap="md">
      {rendered.map((s) => {
        const on = selected.has(s.setIndex);
        const names = summaries[s.setIndex] ?? [];
        return (
          <Card
            key={s.setIndex}
            withBorder
            radius="lg"
            padding="md"
            className={on ? undefined : "set-card-off"}
          >
            <Group justify="space-between" mb="sm" wrap="nowrap">
              <Checkbox
                size="md"
                checked={on}
                onChange={() => onToggle(s.setIndex)}
                label={
                  <Text fw={700} span>
                    Bộ {s.setIndex}
                  </Text>
                }
              />
              <Text size="sm" c="dimmed" truncate style={{ maxWidth: "60%" }}>
                {names.join(" · ")}
              </Text>
            </Group>

            <ScrollArea type="auto" scrollbars="x" offsetScrollbars>
              <Group gap="sm" wrap="nowrap" align="flex-start">
                {s.pages.map((p, i) => (
                  <img key={i} src={p.previewUrl} alt="" className="set-page-img" />
                ))}
              </Group>
            </ScrollArea>

            {(captionEnabled || Boolean(captions[s.setIndex])) && (
              <Textarea
                mt="sm"
                label="Caption (caption.txt)"
                autosize
                minRows={3}
                maxRows={8}
                placeholder="Caption trống — gõ tay hoặc cấu hình AI trong tab Cài đặt"
                value={captions[s.setIndex] ?? ""}
                onChange={(e) => onCaptionChange(s.setIndex, e.currentTarget.value)}
              />
            )}
          </Card>
        );
      })}
    </Stack>
  );
}
