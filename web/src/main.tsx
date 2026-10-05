import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { firebaseConfigured } from "./auth/firebase_auth_service";
import { FirebaseSetupNeeded } from "./features/auth/FirebaseSetupNeeded";
import "./styles.css";

// StrictMode double-invokes effects in development to surface missing cleanup,
// so expect two requests in dev and one in a production build.
createRoot(document.getElementById("root")!).render(
  <StrictMode>{firebaseConfigured ? <App /> : <FirebaseSetupNeeded />}</StrictMode>,
);
