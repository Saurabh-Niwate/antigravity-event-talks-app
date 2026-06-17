# BigQuery Release Notes Explorer

A premium, interactive web application built with **Python Flask** and **Vanilla HTML/CSS/JavaScript** that fetches, parses, and visualizes the official Google Cloud BigQuery Release Notes feed.

## Features

- **Real-Time Feed Fetching**: Retrieves release notes directly from Google's Atom feed: `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`.
- **Intelligent XML Parsing**: Parses the feed entries on the server, while the client parses the nested HTML using `DOMParser` to extract individual release notes (Features, Deprecations, Issues, Changes, and Notices).
- **Interactive Timeline**: Renders updates in a sleek vertical timeline. Each day is represented as a timeline group containing cards for each update.
- **Advanced Filtering & Search**:
  - **Keyword Search**: Performs client-side, live-text searching across release dates, categories, and plain text description contents.
  - **Category Filters**: Filter updates by Feature, Change, Deprecation, Issue, or Notice.
  - **Sorting**: Toggle sorting order between Newest First and Oldest First.
- **Dashboard Stats**: Displays live statistics (Total entries, Features, Deprecations, Issues) with interactive count animations.
- **Double Theme Support**: Toggle between Dark theme (default Slate/Navy look) and Light theme. Theme preference is persisted in the browser's `localStorage`.
- **Deep Linking**: Click the copy link button on any card to copy a unique URL pointing directly to that specific update on the timeline.
- **Toast Notifications**: Interactive, slide-in alerts for actions like feed refreshes or link copying.
- **Skeleton Shimmer Loaders**: Premium, animated loading states for clean UX during network requests.

## Project Structure

```text
bq-releases-notes/
├── app.py                 # Flask server backend
├── requirements.txt       # Project dependencies
├── README.md              # Documentation
├── static/
│   ├── css/
│   │   └── style.css      # Custom stylesheet (Design tokens, layout, themes)
│   └── js/
│       └── app.js         # Client-side parser, search engine, theme manager
└── templates/
    └── index.html         # Main dashboard HTML template
```

## Running the Application

1. **Navigate to the project directory**:
   ```bash
   cd bq-releases-notes
   ```

2. **Activate the Virtual Environment**:
   - **Windows**:
     ```powershell
     .\venv\Scripts\activate
     ```
   - **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the Flask Development Server**:
   ```bash
   python app.py
   ```

5. **Open in Browser**:
   Navigate to [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.
