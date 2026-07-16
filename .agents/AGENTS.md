# HelpFind Project Handover Notice

**HelpFind** is a hyper-local service provider directory MVP built for the **Sun City Peachtree** retirement community (3,000 members). It allows senior residents to quickly find trusted service providers (electricians, plumbers, tech help, lawn care, etc.) recommended by their neighbors. The app tracks rating aggregates, neighbor hire metrics ("I'll Use"), and full contact profiles. Form actions (submitting a review or registering a new contractor) are gated behind a community PIN to keep recommendations neighborhood-only and spam-free.

---

## 📱 Technical Architecture
The app is built as a lightweight, premium, mobile-first Single Page Application (SPA) using HTML, Vanilla CSS, and JavaScript. 
- **Database Layer**: Simulates data persistence using `localStorage`. Seeds default values and migrates outdated schemas using [mockData.js](file:///g:/My Drive/HelpFind/mockData.js).
- **Google Sheets Integration**: Connects to the community's `ProviderList` Google Sheet via a Google Apps Script Web App proxy to sync ratings, new providers, and hire clicks.

---

## 📂 Codebase Inventory
- **[index.html](file:///g:/My Drive/HelpFind/index.html)**: Main SPA shell wrapped in a mobile screen bezel container. Houses the category gated directory view, rating inputs, and slide-up modal bottom sheets. Includes a dynamic script loader for tests.
- **[style.css](file:///g:/My Drive/HelpFind/style.css)**: Mobile-first layout system using glassmorphism, Outfit/Inter typography, and responsive scroll viewports.
- **[app.js](file:///g:/My Drive/HelpFind/app.js)**: Controller script managing router state, search, interactive rating selection, and Google Sheets fetch triggers.
- **[mockData.js](file:///g:/My Drive/HelpFind/mockData.js)**: Holds initial vendor listings, reviews database, and initial localStorage seed/migration functions.
- **[google_sheets_code.js](file:///g:/My Drive/HelpFind/google_sheets_code.js)**: The Apps Script file to support GET/POST write requests.
- **[test.js](file:///g:/My Drive/HelpFind/test.js)**: Automated integration test suite running verification steps on the routing gate, form submissions, and data updates.

---

## 🔑 Crucial Project Settings
- **Community PIN**: `SCP2` (Required to recommend or add new contractors).
- **API URL Connection**: The Apps Script URL must be pasted into the `GOOGLE_SHEETS_API_URL` variable at the top of `app.js` once deployed. Current deployed URL: `https://script.google.com/macros/s/AKfycbzcknWnyO5imXP3rL-Mek72UzfM7ton3oq4r1LiAWaLDFOtmYQIphmtBbpQncAwqF_J/exec`
- **Local Dev Port**: Running on `http://localhost:3000` via a background browser-sync task.

---

## 🚀 Current Project Status
- [x] Removed B2B Contractor portal and auth locks to allow immediate directory search.
- [x] Configured header "Provider" actions select menu (`Leave Review` / `Add New`) gated by the 4-digit PIN modal.
- [x] Added tap-based star rating inputs (defaulted to 1 star to prompt interactive selection).
- [x] Added "I'll Use" click triggers on vendor cards to increment hire metrics.
- [x] Implemented local localStorage calculation and asynchronous background fetch syncs to Google Sheets.
- [x] Optimized layout as a premium mobile web application.
- [x] Fixed community PIN routing gate so first-time verification correctly redirects to the forms.
- [x] Resolved duplicate form submit listener bug that triggered false "Please select a contractor" errors.
- [x] Initialized new contractor registration to start with a hire count of `1` (assuming they have been used at least once by the recommending resident).
- [x] Added automated localStorage migration to append missing `timesUsed` fields to legacy mock vendor schemas.
- [x] Expanded service category lists to include essential fields (Electrician, Plumber, Heating & A/C, Pest Control, ZZZ Other Category) sorted alphabetically.
- [x] Streamlined home screen viewport by hiding detailed descriptions/tags from the list view (retaining them in the Details sheet) and removing category filters.
- [x] Gated the directory view to show provider list cards only after a specific category is chosen.
- [x] Removed premium badging and prioritization in favor of direct rating-based sorting.
- [x] Created an automated headless Edge integration test suite to prevent future regressions.
- [x] Ingested 37 actual local service providers from `ProviderList.csv` replacing all mock data.
- [x] Refactored category filtering into a two-tier dropdown system (Main Category and Service Type subcategory) for refined search and better discovery.
- [x] Implemented dynamic subcategory fields on new contractor registration form.
- [x] Added visible scrollbars globally for senior readability and discoverability.
- [x] Swapped UI styling to a high-contrast premium Light Mode (Royal Blue focus links, slate outlines, high-contrast dark text, amber rating indicators) tailored for senior users.
- [x] Created client-side offline sync queue to handle connection failures gracefully with a visual sync indicator dot in the header.
- [x] Connected local repository and pushed codebase to GitHub.
- [x] Deployed and published the SPA live on Vercel at `https://help-find.vercel.app`.
- [x] Fixed Apps Script Web App CORS errors (removed `.setHeaders()` TypeErrors) and implemented robust, case-insensitive, spacing-agnostic header matching.
- [x] Added `?reset-db=true` query trigger for easy client database resets.
- [x] Implemented a mandatory legal consent terms splash gate overlay upon initial launch.
- [x] Integrated client-side anonymous device UUID signature generation and localStorage tracking.
- [x] Built dynamic Terms of Service fetching directly from `"Terms of Service for HelpFind.gdoc"` on Google Drive.
- [x] Created secure backend consent audit trail logging to a newly generated `"AuditLedger"` sheet tab.
- [x] Added permanent reaffirmation notices in review forms.
- [x] Implemented robust, race-resilient bidirectional directory sync (`syncProvidersFromServer` & `mergeVendors`) to download spreadsheet additions to all user devices.
- [x] Standardized sub-sheet references to explicitly load `"ProviderList"` and `"AuditLedger"` by name, avoiding errors when users view logs.
- [x] Propagated spreadsheet deletions to client devices by tracking a client-side `synced` state flag on local vendor data.
- [x] Implemented shared reviews database syncing, dynamically generating and syncing a `"Reviews"` sheet tab for community-wide review comment discovery.
- [x] Built and deployed the ProviderPortal PWA under `/ProviderPortal` with local automated integration test suite (`test_provider_portal.js`), Email/Phone & Password authentication, a Change Password form, and Speech-to-Text with AI-polishing.
- [x] Configured a custom desktop shortcut (`Provider Portal.lnk`) with the brand icon logo for easy PWA launching.
- [x] Implemented unified Google Apps Script backend supporting Gmail onboarding emails to newly suggested providers.
- [x] Authorized Apps Script OAuth permissions via a manual `testEmailPermission` helper function.
- [x] Added real-time telephone formatting `(XXX) XXX-XXXX` on new contractor registration.
- [x] Changed telephone input fields to `type="tel"` to launch mobile numeric keypads automatically.
- [x] Activated GitHub Pages hosting on the public repository `gbarrett9705Aragon/HelpFind`.
- [x] Resolved Apps Script `TypeError: Cannot read properties of null` error in `HelpFind_ProviderPortal_Backend` by correcting the spreadsheet ID typo (`1peKUmlWMQcaeM3amktkLspFRoWb_pK-AcDSw4hV_M8k` with lowercase `l` instead of capital `I`).
- [x] Added null-safety checks in the portal backend script to prevent crashes and return descriptive JSON errors.
- [x] Changed the Provider Portal theme from dark mode to a premium high-contrast Light Mode matching the main app.
- [x] Styled all required input fields in the Provider Portal in red and added a bold red asterisk (`*`) to their labels.
- [x] Incremented the PWA Service Worker cache version to `v2` to force mobile styling updates.
- [x] Restructured category taxonomy from 4 to 6 categories and expanded the service listings (mapping all 42 services).
- [x] Implemented multi-service support on resident registration form (checkbox-group container) and directory cards (inline tag badges).
- [x] Added "Manage Services" checkbox dashboard card in the Provider Portal for contractors to edit their offerings.
- [x] Built and ran Google Sheets API Python OAuth script to convert all legacy spreadsheet rows to the new taxonomy format in-place.
- [x] Optimized Terms of Service overlay style by capping the scroll container height (`240px` / `40vh`) to guarantee visibility of the checkbox and button on mobile screens.
- [x] Resolved mobile cached-duplicate bugs by adding `?v=3` script cache-busters and marking local sync queue drafts as `synced: true` upon successful upload.
- [x] Brightened background contrast and scaled up font sizes across main directory and Provider Portal to improve readability for senior citizens.
- [x] Prevented mobile viewport auto-zooming by raising all select/input fields to a minimum of 1rem (16px).
- [x] Introduced category-specific visual color stripes and highlights on directory cards.
- [x] Aligned Provider Portal PWA typography (Inter font), header logo section, and simulated desktop device bezel wrapper to match the main HelpFind app.
- [x] Removed Developer Demo Credentials from the Provider Portal UI to finalize the production login experience.
- [x] Transitioned main directory to a static, admin-curated bulletin board model, removing all Yelp-style star ratings, numerical scores, and review comment histories.
- [x] Replaced public rating forms with private "Refer Provider" (suggest new contractor) and "Report Issue" (report listing correction) forms.
- [x] Removed the community PIN gate entirely, shifting verification and curation monitoring to the spreadsheet administrator.
- [x] Implemented secure backend logging of legal consent audit signatures to a new `"AuditLedger"` sheet tab.
- [x] Updated Google Apps Script Web App backend to Version 13 to support `refer_provider`, `report_issue`, and `consent` actions.
- [x] Expanded the integration test suite (`test.js`) to verify the consent overlay, private forms, background sync, and rating invisibility.
- [x] Changed category and service dropdown text color to high-contrast red.
- [x] Copied and integrated the Option 1 neighborhood community vector illustration (`assets/home-illustration.png`) into the default unselected directory state.
- [x] Removed the "Min Job Value" and "Senior Discount" display fields from the provider details modal.

---

## 🏁 Handover Notes & Next Steps
1. **Current Operating State**: 
   * The main app is **100% live** at `https://gbarrett9705aragon.github.io/HelpFind/`.
   * The **ProviderPortal PWA** is **100% live** at `https://gbarrett9705aragon.github.io/HelpFind/ProviderPortal/`.
   * Pushes to the GitHub repository `main` branch automatically rebuild and redeploy to GitHub Pages.
   * **UI Styling Updates (This Session)**: Category & Service filter dropdowns updated to red text. A custom neighborhood vector illustration card is displayed when no category is selected. Min Job Value and Senior Discount details have been completely removed from the provider details modal.
2. **Next Steps for Next Session**:
   * **[ToDo - Admin Vetting Workflow]**: Define the process for the Admin to vet referrals from the `"Referrals"` sheet and manually copy them to `"ProviderList"` once approved.
   * **[ToDo - Search Enhancements]**: Add resident-facing keyword search that scans provider description texts and service tags.
   * **[ToDo - Admin Notifications]**: Build email alerts inside the Apps Script backend to notify the Admin when new entries are added to `"Referrals"` or `"ReportedIssues"`.
   * **[Note - MCP Error Resolution]**: The `notebooklm` MCP server's credentials expired during this session. Advise the user to run `npx notebooklm-mcp-server auth` in their local terminal to re-authenticate if they see any IDE warnings.


