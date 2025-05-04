# DMR Dashboard Email Extractor

This project extracts daily email reports from Gmail and parses them into structured data.

## Setup

1. Clone the repository.
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and fill in your credentials:

   ```
   GMAIL_USERNAME=your_email@gmail.com
   GMAIL_APP_PASSWORD=your_app_password
   REPORT_SENDER=sender@example.com
   REPORT_SUBJECT=TLC Reitz Pharmacy DMR
   ```
5. Run the script:
   ```bash
   python main.py
   ```

## Database

This project uses SQLAlchemy with SQLite by default. Running the script will create a `reports.db` file in the project root and automatically create the `report_entries` table.

You can override the database connection by setting the `DATABASE_URL` environment variable before running the script. For example:

```bash
export DATABASE_URL="sqlite:///path/to/other.db"
```

The `report_entries` table stores:
- `date`: report date (YYYY-MM-DD)
- `category`: report section (e.g. STOCK TRADING ACCOUNT)
- `description`: row description
- `today_value`: numeric value for the "Today" column 