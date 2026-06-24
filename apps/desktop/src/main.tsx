import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./theme.css";
import "./styles.css";
import { theme } from "./theme.js";
import { App } from "./App.js";

// Note: no StrictMode — Fabric canvases dislike double-mounted effects in dev.
createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={theme} defaultColorScheme="light">
    <Notifications position="top-right" />
    <App />
  </MantineProvider>,
);
