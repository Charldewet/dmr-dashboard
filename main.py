#!/usr/bin/env python3
import os
import datetime
import email
from imapclient import IMAPClient, SEEN # Import SEEN here
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import json
from sqlalchemy import create_engine, Column, Integer, String, Date, Float, func, UniqueConstraint # Added UniqueConstraint
from sqlalchemy.orm import sessionmaker, declarative_base, Session # Added Session
from email.utils import parsedate_to_datetime
import sys
from typing import Optional, List, Dict # Added typing
from sqlalchemy.exc import IntegrityError # Added IntegrityError

# Explicitly load .env from project root
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
dotenv_path = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path)

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', f"sqlite:///{os.path.join(BASE_DIR, 'reports.db')}")
engine = create_engine(DATABASE_URL, echo=False, future=True) # Keep future=True if using SQLAlchemy 1.4+
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class ReportEntry(Base):
    __tablename__ = 'report_entries'
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True, nullable=False)
    category = Column(String, index=True, nullable=False)
    description = Column(String, nullable=False)
    today_value = Column(Float, nullable=True) # Allow nulls

    # Add unique constraint if it wasn't there before
    __table_args__ = (UniqueConstraint('date', 'category', 'description', name='_date_category_desc_uc'),)

# --- NEW: MonthlyClosingStock model ---
class MonthlyClosingStock(Base):
    __tablename__ = 'monthly_closing_stock'
    id = Column(Integer, primary_key=True)
    month = Column(String, unique=True, index=True)  # Format: 'YYYY-MM'
    closing_stock = Column(Float, nullable=False)
    source_date = Column(Date, nullable=False)  # The date this value was taken from
    __table_args__ = (UniqueConstraint('month', name='_month_uc'),)

# Create tables
Base.metadata.create_all(bind=engine)

def parse_value(val_str: Optional[str]) -> Optional[float]:
    """Convert string with currency, commas, and percent signs to float."""
    if val_str is None: return None
    s = val_str.replace('R', '').replace(',', '').replace('%', '').strip()
    # Handle potential negative sign placement
    if s.startswith('-') and s.count('-') > 1: s = '-' + s.replace('-', '', 1)
    elif s.count('-') > 0 and not s.startswith('-'): s = s.replace('-', '')
    try:
        return float(s) if s else 0.0
    except ValueError:
        print(f"Warning: Could not parse value '{val_str}'")
        return None

def clean_int_value(value_str: Optional[str]) -> Optional[int]:
    """Removes commas, spaces and converts to int. Returns None if conversion fails."""
    if not value_str: return 0
    cleaned = value_str.replace(',', '').replace(' ', '')
    try:
        return int(cleaned) if cleaned else 0
    except ValueError:
        print(f"Warning: Could not convert '{value_str}' to int.")
        return None

def save_entries(entries: List[Dict], report_date: datetime.date, session=None): # Added optional session
    """Saves a list of extracted report entries for a specific date to the database.
    Optionally uses a provided session.
    Returns True if new entries were committed, False otherwise.
    """
    close_session_locally = False
    if session is None:
        session = SessionLocal()
        close_session_locally = True

    added_count = 0
    skipped_count = 0
    committed = False # Flag to track if commit happened
    try:
        # Optional: Delete existing entries for this date if you want to overwrite
        # session.query(ReportEntry).filter(ReportEntry.date == report_date).delete()
        # session.commit() # Commit deletion before adding new ones

        for entry_data in entries:
            # --- Robust Value Parsing --- 
            value_input = entry_data.get('today_value')
            value = None
            if isinstance(value_input, (float, int)):
                value = float(value_input) # Use pre-parsed float/int
            elif isinstance(value_input, str):
                value = parse_value(value_input) # Parse if it's a string
            # If value_input is None or other type, value remains None (handled by DB nullability)
            # --- End Robust Value Parsing ---

            entry = ReportEntry(
                date=report_date,
                category=entry_data.get('category'),
                description=entry_data.get('description'),
                today_value=value
            )

            # Simplified check: Use DB constraints to handle uniqueness
            # Attempt to add; let the DB handle potential duplicates if constraint exists
            # This assumes the UniqueConstraint _date_category_desc_uc is working
            session.add(entry)
            try:
                 session.flush() # Try to flush to catch potential constraint violations early
                 added_count += 1
            except IntegrityError:
                 session.rollback() # Rollback the failed add
                 skipped_count += 1
                 # print(f"Skipped duplicate entry: {report_date} - {entry.category} - {entry.description}") # Optional: more verbose logging
                 # Re-query to ensure no partial state? Or just continue.
            except Exception as e:
                 print(f"Error during flush for {entry.description}: {e}")
                 session.rollback()
                 # Decide how to handle other flush errors

        if added_count > 0:
            session.commit()
            committed = True # Mark as committed
            print(f"Committed {added_count} new entries for {report_date}.")
        if skipped_count > 0:
             print(f"Skipped {skipped_count} duplicate entries for {report_date}.")

    except Exception as e:
        print(f"Error saving entries for {report_date}: {e}")
        session.rollback()
    finally:
        if close_session_locally:
            session.close()
    return committed # Return commit status


def find_table_by_title(soup, title_keyword):
    """Finds table by checking if title_keyword is in the first td of the first tr."""
    for table in soup.find_all('table'):
        first_row = table.find('tr')
        if first_row:
             first_td = first_row.find('td')
             if first_td and title_keyword.lower() in first_td.get_text(strip=True).lower():
                 return table
    return None


def parse_table(table):
    """Parses a standard table structure (header on row 2, data from row 3)."""
    rows_data = []
    trs = table.find_all('tr')
    if len(trs) < 2: return rows_data # Need at least title and header row

    # Try to find the header row dynamically ('Description', 'Today', 'This Month')
    header_row_index = -1
    potential_header_row = -1
    for i, tr in enumerate(trs):
        tds = tr.find_all('td')
        if len(tds) == 3: # Standard tables have 3 columns
            # Check if this looks like the header
            texts = [td.get_text(strip=True) for td in tds]
            if 'Description' in texts[0] and 'Today' in texts[1] and 'This Month' in texts[2]:
                header_row_index = i
                break
            elif i > 0 and potential_header_row == -1: # Guess header is row index 1 if not found explicitly
                 potential_header_row = i # Usually the second row (index 1)

    if header_row_index == -1:
         header_row_index = potential_header_row # Use the guess if specific header not found
         if header_row_index == -1 or header_row_index >= len(trs)-1:
              print("Warning: Could not determine header row reliably for a table.")
              return rows_data # Cannot proceed without headers

    header_cells = [cell.get_text(strip=True) for cell in trs[header_row_index].find_all('td')]
    if len(header_cells) != 3: # Ensure it has 3 header columns
         print(f"Warning: Unexpected number of header cells ({len(header_cells)}) found.")
         return rows_data

    # Data rows start after the header row
    for tr in trs[header_row_index + 1:]:
        cells = tr.find_all('td')
        # Allow for slight variations, but expect 3 columns for data
        if len(cells) >= 3: # Check if at least 3 cells exist
            # Map based on found header cells
            row_dict = {}
            row_dict[header_cells[0]] = cells[0].get_text(strip=True) # Description
            row_dict[header_cells[1]] = cells[1].get_text(strip=True) # Today
            row_dict[header_cells[2]] = cells[2].get_text(strip=True) # This Month
            rows_data.append(row_dict)
        elif len(cells) > 0 and cells[0].get_text(strip=True): # Handle rows that might just have a description (like totals)
            # Append with empty values if needed, or skip based on use case
            # print(f"Info: Skipping row with insufficient cells: {[c.get_text(strip=True) for c in cells]}")
            pass

    return rows_data

def extract_report_data(soup) -> List[Dict]: # Return list of dictionaries
    """Extracts data from standard tables AND the specific Sales Summary data."""
    selected_titles = ["STOCK TRADING ACCOUNT", "DISPENSARY SUMMARY", "TURNOVER SUMMARY", "SALES SUMMARY"]
    all_entries = []

    for title in selected_titles:
        table = find_table_by_title(soup, title)
        if not table:
            print(f"Warning: Table '{title}' not found in email.")
            continue

        print(f"Processing table: {title}")
        if title == "SALES SUMMARY":
            pos_transactions_today = 0
            rows = table.find_all('tr')
            found_pos_row = False
            found_avg_value_row = False # Flag for avg value
            found_avg_size_row = False  # Flag for avg size
            for row in rows:
                cells = row.find_all('td')
                # Check POS Transactions
                if len(cells) >= 2 and not found_pos_row:
                    first_cell_text = cells[0].get_text(strip=True)
                    if "TOTAL POS TURNOVER:" in first_cell_text:
                        try:
                            trans_text = cells[1].get_text(strip=True)
                            pos_transactions_today = clean_int_value(trans_text) or 0
                            print(f"  Extracted: POS Transactions = {pos_transactions_today}")
                            all_entries.append({
                                "category": title, 
                                "description": "POS Transactions",
                                "today_value": float(pos_transactions_today)
                            })
                            found_pos_row = True # Mark as found
                            # Don't break yet, continue checking for other rows
                        except Exception as e:
                            print(f"Error parsing POS Transactions row: {e}")
                            
                # NEW: Check Average Value Per Docket/Basket
                if len(cells) >= 2 and not found_avg_value_row:
                    first_cell_text = cells[0].get_text(strip=True)
                    if "Average Value Per Docket/Basket" in first_cell_text: # Use exact string from report
                        try:
                            avg_val_text = cells[1].get_text(strip=True) 
                            avg_value_today = parse_value(avg_val_text) # Use parse_value for currency/float
                            print(f"  Extracted: Average Value Per Docket/Basket = {avg_value_today}")
                            all_entries.append({
                                "category": title,
                                "description": "Average Value Per Docket/Basket", 
                                "today_value": avg_value_today
                            })
                            found_avg_value_row = True # Mark as found
                        except Exception as e:
                            print(f"Error parsing Average Value row: {e}")

                # NEW: Check Average Number Of Items per Basket
                if len(cells) >= 2 and not found_avg_size_row:
                     first_cell_text = cells[0].get_text(strip=True)
                     if "Average Number Of Items per Basket" in first_cell_text: # Use exact string
                         try:
                             avg_size_text = cells[1].get_text(strip=True)
                             avg_size_today = parse_value(avg_size_text) # Use parse_value as it might be float
                             print(f"  Extracted: Average Number Of Items per Basket = {avg_size_today}")
                             all_entries.append({
                                 "category": title,
                                 "description": "Average Number Of Items per Basket",
                                 "today_value": avg_size_today
                             })
                             found_avg_size_row = True # Mark as found
                         except Exception as e:
                             print(f"Error parsing Average Size row: {e}")
            
            # Check if all expected rows were found
            if not found_pos_row:
                 print(f"Warning: 'TOTAL POS TURNOVER:' row not found in SALES SUMMARY table.")
            if not found_avg_value_row:
                 print(f"Warning: 'Average Value Per Docket/Basket' row not found in SALES SUMMARY table.")
            if not found_avg_size_row:
                 print(f"Warning: 'Average Number Of Items per Basket' row not found in SALES SUMMARY table.")

        else: # Handle standard tables
            parsed_rows = parse_table(table)
            for row in parsed_rows:
                # Ensure keys exist before accessing
                desc = row.get('Description')
                today_val_str = row.get('Today')
                if desc: # Only add if description exists
                     all_entries.append({
                         "category": title,
                         "description": desc,
                         "today_value": today_val_str # Keep as string for save_entries to parse
                     })
    return all_entries


def load_pharmacy_env(pharmacy):
    env_map = {
        'reitz': '.env.reitz',
        'villiers': '.env.villiers',
        'roos': '.env.roos',
        'tugela': '.env.tugela',
        'winterton': '.env.winterton',
    }
    env_file = env_map.get(pharmacy, '.env.reitz')
    load_dotenv(env_file, override=True)


def get_pharmacy_session(pharmacy):
    db_map = {
        'reitz': 'reports.db',
        'villiers': 'reports_villiers.db',
        'roos': 'reports_roos.db',
        'tugela': 'reports_tugela.db',
        'winterton': 'reports_winterton.db',
    }
    db_file = db_map.get(pharmacy, 'reports.db')
    db_path = os.path.join(BASE_DIR, db_file)
    db_url = f"sqlite:///{os.path.abspath(db_path)}"
    engine = create_engine(db_url, echo=False, future=True)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def fetch_latest_report(pharmacy='reitz'):
    load_pharmacy_env(pharmacy)
    user = os.getenv('GMAIL_USERNAME')
    password = os.getenv('GMAIL_APP_PASSWORD')
    sender = os.getenv('REPORT_SENDER')
    subject = os.getenv('REPORT_SUBJECT')
    if not all([user, password, sender, subject]):
        print("Please set GMAIL_USERNAME, GMAIL_APP_PASSWORD, REPORT_SENDER, and REPORT_SUBJECT in .env file.")
        return 0 # Return 0 days added

    # --- Calculate date range for the last 7 days --- 
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=6) # Today minus 6 days = 7 days total
    since_str = start_date.strftime('%d-%b-%Y')
    # Optional: Add a BEFORE clause for precision (day after end_date)
    # before_str = (end_date + datetime.timedelta(days=1)).strftime('%d-%b-%Y')
    print(f"Searching for emails since: {since_str}")
    # --- End date range calculation ---

    saved_dates = set() # Keep track of dates with successful saves

    with IMAPClient(host='imap.gmail.com', ssl=True) as client:
        print(f"Logging in as {user}...")
        client.login(user, password)
        client.select_folder('INBOX') # Or specify a different folder/label if needed

        # Search based on FROM, SUBJECT, and SINCE date
        criteria = [
            # 'UNSEEN', # REMOVED UNSEEN flag
            'FROM', sender,
            'SUBJECT', subject,
            'SINCE', since_str, # Add SINCE criterion
            # Optional: 'BEFORE', before_str 
        ]
        print(f"Searching for emails with criteria: {criteria}...")
        uids = client.search(criteria)
        if not uids:
            print(f"No emails found for subject '{subject}' from '{sender}' since {since_str}.")
            return 0 # Return 0 days added

        print(f"Found {len(uids)} emails in the date range. Processing...")
        session = get_pharmacy_session(pharmacy) # Create session outside the loop

        for uid in uids:
            report_date = None # Reset for each email
            try:
                print(f"Fetching email UID {uid}...")
                # Fetch BODY[] and ENVELOPE (which contains Date header)
                response = client.fetch([uid], ['BODY[]', 'ENVELOPE'])
                if uid not in response:
                    print(f"Could not fetch UID {uid}. Skipping.")
                    # No need to mark as read if not using UNSEEN
                    continue

                msg_data = response[uid][b'BODY[]']
                envelope = response[uid][b'ENVELOPE']

                # Try parsing date from Envelope's Date header
                if envelope and envelope.date:
                    report_date = envelope.date.date() # Already a datetime object
                    print(f"UID {uid}: Parsed date from header: {report_date}")
                else:
                    print(f"UID {uid}: Could not parse date from header. Skipping.")
                    continue # Cannot process without a date

                # --- Optional but recommended: Check if parsed date is within our target range ---
                # This handles cases where IMAP SINCE might be slightly inexact
                if report_date < start_date or report_date > end_date:
                    print(f"UID {uid}: Email date {report_date} outside target range ({start_date} to {end_date}). Skipping.")
                    continue
                # --- End optional date range check ---

                # --- Check if report for this date already exists ---
                existing_report = session.query(ReportEntry).filter(ReportEntry.date == report_date).first()
                if existing_report:
                    print(f"UID {uid}: Report for date {report_date} already exists in DB. Skipping.")
                    # No need to mark as read
                    continue # Skip processing

                # --- If report doesn't exist, proceed with parsing and saving ---
                message = email.message_from_bytes(msg_data)
                subject_line = envelope.subject.decode() if envelope and envelope.subject else ""
                html_content = None
                if message.is_multipart():
                    for part in message.walk():
                        if part.get_content_type() == 'text/html':
                            try:
                                html_content = part.get_payload(decode=True).decode(
                                    part.get_content_charset() or 'utf-8', errors='replace'
                                )
                                break
                            except Exception as e:
                                print(f"UID {uid}: Error decoding part: {e}")
                elif message.get_content_type() == 'text/html':
                    try:
                        html_content = message.get_payload(decode=True).decode(
                            message.get_content_charset() or 'utf-8', errors='replace'
                        )
                    except Exception as e:
                        print(f"UID {uid}: Error decoding body: {e}")

                if (
                    "Daily Management Report" not in subject_line
                    and (not html_content or "Daily Management Report" not in html_content)
                ):
                    print(f"UID {uid}: Skipping email, does not contain 'Daily Management Report'.")
                    continue

                if html_content:
                    soup = BeautifulSoup(html_content, 'lxml')
                    print(f"UID {uid}: Extracting data for {report_date}...")
                    extracted_entries = extract_report_data(soup)
                    if extracted_entries:
                        print(f"UID {uid}: Saving {len(extracted_entries)} entries for {report_date}...")
                        save_successful = save_entries(extracted_entries, report_date, session)
                        if save_successful:
                             print(f"UID {uid}: Successfully saved entries for {report_date}.")
                             saved_dates.add(report_date) # Add date to set if saved
                        else:
                             print(f"UID {uid}: Entries for {report_date} were duplicates or failed to save.")
                    else:
                         print(f"UID {uid}: No data extracted for {report_date}. Skipping.")
                else:
                    print(f"UID {uid}: No HTML content found. Skipping.")

            except Exception as e:
                print(f"UID {uid}: An unexpected error occurred: {e}. Skipping this email.")
                continue # Skip to the next email

        session.close() # Close session after processing all emails
        print(f"Fetch complete. Added data for {len(saved_dates)} new dates.")
        populate_monthly_closing_stock(pharmacy)
        return len(saved_dates) # Return the count of unique dates saved


def fetch_and_save_history(start_date_str, end_date_str, pharmacy='reitz'):
    """Fetch all report emails between start and end (inclusive) and save to DB."""
    load_pharmacy_env(pharmacy)
    user = os.getenv('GMAIL_USERNAME')
    password = os.getenv('GMAIL_APP_PASSWORD')
    sender = os.getenv('REPORT_SENDER')
    subject = os.getenv('REPORT_SUBJECT')
    if not all([user, password, sender, subject]):
        print("Set required GMAIL env vars.")
        return

    start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
    end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
    since = start_date.strftime('%d-%b-%Y')
    before = (end_date + datetime.timedelta(days=1)).strftime('%d-%b-%Y')

    with IMAPClient(host='imap.gmail.com', ssl=True) as client:
        client.login(user, password)
        try: client.select_folder('[Gmail]/All Mail')
        except: client.select_folder('INBOX')

        criteria = ['SUBJECT', subject, 'FROM', sender, 'SINCE', since, 'BEFORE', before] # Added FROM and date range
        print(f"Searching emails with criteria: {criteria}...")
        uids = client.search(criteria)
        print(f"Found {len(uids)} messages matching criteria.")

        for uid in uids:
            resp = client.fetch([uid], ['BODY[]', 'INTERNALDATE', 'ENVELOPE']) # Fetch ENVELOPE for better date parsing
            if uid not in resp:
                print(f"Could not fetch UID {uid}. Skipping.")
                continue

            # Prefer INTERNALDATE for sorting/filtering, but parse 'Date' header for report_date
            msg_data = resp[uid][b'BODY[]']
            internal_date = resp[uid][b'INTERNALDATE']
            envelope = resp[uid][b'ENVELOPE'] # Envelope contains parsed headers like Date

            # Try parsing date from Envelope first
            report_date = None
            if envelope and envelope.date:
                 report_date = envelope.date.date() # Already a datetime object
            elif internal_date: # Fallback to internal date
                 report_date = internal_date.date()

            if not report_date:
                print(f"Could not determine date for UID {uid}. Skipping.")
                continue

            # Check if report_date is within the desired range (redundant with search but good practice)
            if report_date < start_date or report_date > end_date:
                continue

            print(f"Processing UID {uid} for date: {report_date}")
            msg = email.message_from_bytes(msg_data)

            subject_line = envelope.subject.decode() if envelope and envelope.subject else ""
            html = None
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == 'text/html':
                        try:
                             html = part.get_payload(decode=True).decode(
                                 part.get_content_charset() or 'utf-8', errors='replace')
                             break
                        except Exception as e:
                             print(f"Error decoding part for UID {uid}: {e}")
            elif msg.get_content_type() == 'text/html':
                 try:
                    html = msg.get_payload(decode=True).decode(
                        msg.get_content_charset() or 'utf-8', errors='replace')
                 except Exception as e:
                     print(f"Error decoding body for UID {uid}: {e}")

            if (
                "Daily Management Report" not in subject_line
                and (not html or "Daily Management Report" not in html)
            ):
                print(f"UID {uid}: Skipping email, does not contain 'Daily Management Report'.")
                continue

            if not html:
                print(f"No HTML content found for UID {uid}. Skipping.")
                continue

            soup = BeautifulSoup(html, 'lxml')
            extracted_entries = extract_report_data(soup)
            if not extracted_entries:
                print(f"No data extracted for UID {uid} ({report_date}). Skipping.")
                continue

            print(f"Saving {len(extracted_entries)} entries for {report_date} (UID: {uid})...")
            session = get_pharmacy_session(pharmacy)
            save_entries(extracted_entries, report_date, session) # Pass the list

    print("History import completed.")
    populate_monthly_closing_stock(pharmacy)


# --- Backend API Helper Functions ---
# (get_today_entries and get_month_to_date_entries remain the same as your provided code)
def get_today_entries(report_date):
    """Retrieve all entries for a specific date."""
    session = SessionLocal()
    entries = session.query(ReportEntry).filter(ReportEntry.date == report_date).all()
    session.close()
    return entries

def get_month_to_date_entries(report_date):
    """Retrieve sum of today_value grouped by category and description for the month to date."""
    first_day = report_date.replace(day=1)
    session = SessionLocal()
    results = session.query(
        ReportEntry.category,
        ReportEntry.description,
        func.sum(ReportEntry.today_value).label('sum_value')
    ).filter(
        ReportEntry.date >= first_day,
        ReportEntry.date <= report_date
    ).group_by(ReportEntry.category, ReportEntry.description).all()
    session.close()
    return results

# --- NEW: Populate MonthlyClosingStock from ReportEntry ---
def populate_monthly_closing_stock(pharmacy='reitz'):
    session = get_pharmacy_session(pharmacy)
    try:
        min_date = session.query(func.min(ReportEntry.date)).scalar()
        max_date = session.query(func.max(ReportEntry.date)).scalar()
        if not min_date or not max_date:
            print("No data in ReportEntry.")
            return

        current = datetime.date(min_date.year, min_date.month, 1)
        end = datetime.date(max_date.year, max_date.month, 1)
        while current <= end:
            # Find the last day in this month with a closing stock entry
            last_date = session.query(func.max(ReportEntry.date)).filter(
                ReportEntry.category == 'STOCK TRADING ACCOUNT',
                ReportEntry.description == 'Closing Stock Valued at Cost Now',
                func.strftime('%Y-%m', ReportEntry.date) == current.strftime('%Y-%m')
            ).scalar()
            if last_date:
                closing_stock = session.query(ReportEntry.today_value).filter(
                    ReportEntry.category == 'STOCK TRADING ACCOUNT',
                    ReportEntry.description == 'Closing Stock Valued at Cost Now',
                    ReportEntry.date == last_date
                ).scalar()
                # Upsert
                month_str = current.strftime('%Y-%m')
                existing = session.query(MonthlyClosingStock).filter_by(month=month_str).first()
                if existing:
                    existing.closing_stock = closing_stock
                    existing.source_date = last_date
                else:
                    session.add(MonthlyClosingStock(
                        month=month_str,
                        closing_stock=closing_stock,
                        source_date=last_date
                    ))
            current = (current.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
        session.commit()
        print(f"Monthly closing stock table populated for {pharmacy}.")
    except Exception as e:
        session.rollback()
        print("Error populating monthly closing stock:", e)
    finally:
        session.close()

# --- Main Execution ---
if __name__ == '__main__':
    # Handle optional history import
    if len(sys.argv) >= 4 and sys.argv[1] == 'history':
        _, _, start_d, end_d, *rest = sys.argv
        pharmacy = rest[0] if rest else 'reitz'
        fetch_and_save_history(start_d, end_d, pharmacy)
        sys.exit(0)
    # Handle populate_monthly_closing_stock from CLI
    if len(sys.argv) >= 2 and sys.argv[1] == 'populate_stock':
        pharmacy = sys.argv[2] if len(sys.argv) > 2 else 'reitz'
        populate_monthly_closing_stock(pharmacy)
        sys.exit(0)
    # Default: fetch and save today's report
    fetch_latest_report()

    # --- Optional: Keep the query/print part for immediate verification ---
    # print("\n--- Verification Queries ---")
    # today = datetime.date.today()
    # today_entries = get_today_entries(today)
    # print(f"\nEntries for {today}:")
    # if today_entries:
    #     for e in today_entries:
    #         print(f"{e.category} - {e.description}: {e.today_value}")
    # else:
    #     print("No entries found.")

    # mtd_entries = get_month_to_date_entries(today)
    # print("\nMonth-to-date aggregates:")
    # if mtd_entries:
    #     for cat, desc, sumv in mtd_entries:
    #         print(f"{cat} - {desc}: {sumv}")
    # else:
    #     print("No MTD aggregates found.")
    # --- End Optional Verification ---
 