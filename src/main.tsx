import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./styles-board.css";
import "./styles-action-dock.css";
import "./styles-pending-choices.css";
import "./styles-pending-tactical.css";
import "./styles-card-surfaces.css";
import "./styles-player-area.css";
import "./styles-motion.css";
import "./styles-action-responsive.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
