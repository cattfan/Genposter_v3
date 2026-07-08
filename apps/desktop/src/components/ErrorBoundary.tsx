import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert, Button, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";

interface Props {
  children: ReactNode;
  /** Shown in the fallback message, e.g. "Thiết kế", "Tạo ảnh". */
  label: string;
}

interface State {
  error: Error | null;
}

/**
 * Isolates a crash to the tab it happened in instead of blanking the whole
 * app. App.tsx keeps every tab mounted at once (just hidden via display:none)
 * so each gets its own boundary — a bug in Produce, say, still leaves
 * Design/Data/Settings usable, and switching away and back retries it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.label}] crashed:`, error, info.componentStack);
  }

  private reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <Stack align="center" justify="center" gap="sm" style={{ flex: 1, padding: 24 }}>
        <Alert
          color="red"
          icon={<IconAlertTriangle size={18} />}
          title={`Tab "${this.props.label}" gặp lỗi`}
          style={{ maxWidth: 520 }}
        >
          <Stack gap="sm">
            <Text size="sm">{error.message || String(error)}</Text>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconRefresh size={14} />}
              onClick={this.reset}
            >
              Thử lại
            </Button>
          </Stack>
        </Alert>
      </Stack>
    );
  }
}
