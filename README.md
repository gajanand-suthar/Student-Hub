# Student Hub

A fast Single Page Application (SPA) and Progressive Web App (PWA) built for students to check attendance, view CIE marks, access course materials, track academic calendars, and view branch leaderboards.

---

## Notice: 100% Vibe Coded & Disclaimer

### Important Disclaimer
This project is an **independent, unofficial, community-built tool**. It is **NOT** affiliated with, authorized by, endorsed by, sponsored by, or in any way officially connected with any educational institution, college, university, or any of their administrative bodies. 

All product names, logos, and trademarks are property of their respective owners. This application does not store user passwords or login credentials on any remote server; all authentication and session data are stored locally within the user's own browser storage. Use of this application is entirely at your own risk.

### Vibe Coded Status
This codebase was **100% vibe coded**. Because of this, it may contain quirks, edge-case bugs, unintended behaviors, or unoptimized routines. If something breaks or looks strange, please feel free to open an issue or submit a pull request.

---

## Backend Communication & Deployment Note

The backend of this application is hosted on Cloudflare Workers and is maintained privately.

To communicate with the backend, the frontend must be deployed on GitHub Pages. Running the application locally will not communicate with the backend.

---

## Contributing

Contributions are very welcome, especially for improving the app's **UI, UX, styling, responsiveness, and frontend performance**.

If you want to contribute:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/ui-improvement`).
3. Make your changes and test the UI layout.
4. Commit your changes and open a Pull Request.

Whether it is refining CSS styles, fixing layout issues on specific mobile devices, adding accessibility improvements, or cleaning up JavaScript routines, all frontend contributions are appreciated.

---

## Features

### 1. Academic Calendar
- Monthly academic calendar with highlighted exams, deadlines, and events.
- Holiday list with dates and descriptions.
- Semester-wise filter (Sem III, Sem V, Sem VII).
  
### 2. Attendance and CIE Tracker
- Real-time attendance percentage with visual indicator bars and threshold markers (<75%, 75-84%, >=85%).
- Subject-wise breakdown showing conducted versus attended classes and margin calculations.
- CIE marks breakdown with an accordion component for component-level score inspection.
- SGPA flip card displaying overall score and semester-by-semester SGPA grid.

### 3. Course and Document Portal
- Search and browse enrolled courses across semesters.
- Built-in PDF reader using PDF.js for in-app document viewing without downloading.
- Built-in audio and video media playback using Plyr.
- Categorized resource badges for documents, presentations, spreadsheets, quizzes, and links.

### 4. Branch Leaderboard and Results
- Branch-wide academic rankings and percentile statistics.
- Direct highlighting for individual rank and SGPA.

### 5. Progressive Web App (PWA)
- Installable on Android, and Desktop platforms (PWA is not supported on iOS).
- Offline navigation fallback and caching via Service Worker.
- Client-side History API router for instant tab transitions without full page reloads.
- Built-in Dark and Light mode theme toggle.

---

## Project Structure

```
student-hub/
├── index.html              # SPA shell with view containers and shared modals
├── _redirects              # SPA rewrite configuration
├── sw.js                   # Service worker for offline caching and navigation fallback
├── manifest.json           # Web App Manifest
├── css/
│   ├── shared.css          # Theme variables, resets, navigation, drawer, modals
│   ├── dashboard.css       # Calendar, onboarding, notices styling
│   ├── attendance.css      # Attendance cards, progress bars, CIE accordion
│   ├── moodle.css          # Course listings, content viewer, lightboxes
│   └── results.css         # Leaderboard cards, stats rows, state banners
└── js/
    ├── config.js           # Configuration and storage keys
    ├── api.js              # Centralized API client
    ├── router.js           # History API client-side router
    ├── app.js              # App bootstrap and view lifecycle controller
    ├── shared.js           # Shared utilities (theme, credentials, drawer, PWA)
    ├── dashboard.js        # Academic calendar and dashboard logic
    ├── attendance.js       # Attendance fetching, calculations, CIE logic
    ├── moodle.js           # Moodle course loader and media lightboxes
    └── results.js          # Results and leaderboard display logic
```

---

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3 Custom Properties
- **Backend**: Cloudflare Workers
- **Router**: Browser History API (pushState / popstate)
- **External Libraries (CDN)**:
  - PDF.js (v3.11) for document preview
  - Plyr (v3.7) for media playback
- **Offline / Storage**: Service Worker API, CacheStorage, localStorage, sessionStorage

---

## Local Development

### Prerequisites
- Node.js (v18+) or Python 3

### Running the Frontend Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/Gajanand-Suthar/Student-Hub.git
   cd student-hub/
   ```

2. Start a local server:

   **Using npx serve (Recommended for SPA routing):**
   ```bash
   npx serve -s .
   ```

   **Using Python:**
   ```bash
   python3 -m http.server 8080
   ```

3. Open `http://localhost:3000` (or `http://localhost:8080`) in your browser to inspect and preview UI components.

---

## License

This project is licensed under the [MIT License](./LICENSE).
