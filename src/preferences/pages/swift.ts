import SwiftMenu from "../../components/SwiftMenu";
import { createCustomPreferencePage } from "../helpers";

export const swiftPage = createCustomPreferencePage(
  "swift",
  "Swift",
  SwiftMenu,
  {
    description: "Manage your swift toolchains",
    category: "swift",
  }
);
