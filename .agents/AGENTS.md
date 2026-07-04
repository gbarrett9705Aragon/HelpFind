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
- **Community PIN**: `1948` (Required to recommend or add new contractors).
- **API URL Connection**: The Apps Script URL must be pasted into the `GOOGLE_SHEETS_API_URL` variable at the top of `app.js` once deployed. Current deployed URL: `https://script.google.com/macros/s/AKfycbxHHw5aIgnRdY8ZsBzIq5RxFyLjpjCqKWqN6HgFBSjyLsgNdwA0hhNk8gAIRQAkiE5s/exec`
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

---

## 🏁 Handover Notes & Next Steps
1. **Current Operating State**: 
   * The app is **100% live** at `https://help-find.vercel.app`.
   * Pushes to the GitHub repository `main` branch automatically rebuild and redeploy to Vercel.
   * New registrations, rating changes, and hire counts automatically update both the browser cache and append/increment rows in `ProviderList.gsheet` in real-time.
2. **Next Steps for Next Session**:
   * Introduce resident-facing search enhancements (e.g. searching review text comments or sorting by punctuality).
   * Incorporate contractor photo uploads via Apps Script base64 sync.
   * Add neighborhood announcement banners controlled directly from a tab in `ProviderList.gsheet`.


