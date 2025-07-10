import { preferenceRegistry } from "../registry";
import { PreferenceCategory } from "../types";

import { generalPage } from "./general";
import { appearancePage } from "./appearance";
import { appleIdPage } from "./appleId";
import { certificatesPage } from "./certificates";
import { appIdsPage } from "./appIds";
import { developerPage } from "./developer";
import { swiftPage } from "./swift";

const generalCategory: PreferenceCategory = {
  id: "general",
  name: "General",
  pages: [generalPage, appearancePage],
};

const appleCategory: PreferenceCategory = {
  id: "apple",
  name: "Apple",
  pages: [appleIdPage, certificatesPage, appIdsPage],
};

const swiftCategory: PreferenceCategory = {
  id: "swift",
  name: "Swift",
  pages: [swiftPage],
};

const advancedCategory: PreferenceCategory = {
  id: "advanced",
  name: "Advanced",
  pages: [developerPage],
};

preferenceRegistry.registerCategory(generalCategory);
preferenceRegistry.registerCategory(appleCategory);
preferenceRegistry.registerCategory(swiftCategory);
preferenceRegistry.registerCategory(advancedCategory);

export { preferenceRegistry };
