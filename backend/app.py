#!/usr/bin/env python3
import os
import sys
import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from sqlalchemy import func, create_engine
from sqlalchemy.orm import sessionmaker
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user

# allow imports from project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import fetch_latest_report, get_today_entries, get_month_to_date_entries, ReportEntry, DATABASE_URL, MonthlyClosingStock

print(f"--- BACKEND DEBUG: Using DATABASE_URL: {DATABASE_URL} ---")

# Calculate the path to the frontend build directory relative to this file
frontend_build_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend/build'))

# Initialize Flask app pointing to the correct static folder
app = Flask(__name__, static_folder=frontend_build_path, static_url_path='/')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'a_default_secret_key_for_development_only') # IMPORTANT: Set a strong SECRET_KEY env var for production
CORS(app, supports_credentials=True) # Enable CORS with credentials support

# --- Flask-Login Setup ---
login_manager = LoginManager()
login_manager.init_app(app)

# --- User Model (Simple In-Memory User) ---
# In a real app, load users from a database
class User(UserMixin):
    def __init__(self, id, username, password_hash):
        self.id = id
        self.username = username
        self.password_hash = password_hash

# For demonstration, hardcode one user. Replace with database lookup.
# Generate a hash for a password like 'password' (replace with a strong one!)
# To generate hash: from werkzeug.security import generate_password_hash; print(generate_password_hash('your_password'))
hashed_password_charl = generate_password_hash('gadpuh-3ginma-xikViw', method='pbkdf2:sha256')
hashed_password_anmarie = generate_password_hash('Detpuk-virxyj-0hevsy', method='pbkdf2:sha256')
hashed_password_mauritz = generate_password_hash('Vapcud-2jivam-ziqRop', method='pbkdf2:sha256')
hashed_password_elani = generate_password_hash('Qidvok-7xumla-pecWen', method='pbkdf2:sha256')
hashed_password_lize = generate_password_hash('Zovtyd-6kycja-gixBic', method='pbkdf2:sha256') # NEW
users = {
    1: User(id=1, username='Charl', password_hash=hashed_password_charl),
    2: User(id=2, username='Anmarie', password_hash=hashed_password_anmarie),
    3: User(id=3, username='Mauritz', password_hash=hashed_password_mauritz),
    4: User(id=4, username='Elani', password_hash=hashed_password_elani),
    5: User(id=5, username='Lize', password_hash=hashed_password_lize) # NEW
}

# --- NEW: Define allowed pharmacies per user ---
ALLOWED_PHARMACIES = {
    'Charl': ['reitz', 'villiers', 'roos', 'tugela', 'winterton'],
    'Anmarie': ['reitz', 'villiers', 'roos', 'tugela', 'winterton'],
    'Mauritz': ['villiers'],
    'Elani': ['villiers'],
    'Lize': ['tugela', 'winterton'] # NEW
}

@login_manager.user_loader
def load_user(user_id):
    # Load user from our 'database' (the dictionary)
    return users.get(int(user_id))

# --- Pharmacy DB mapping ---
PHARMACY_DB_MAP = {
    'reitz': '/data/reports.db',
    'villiers': '/data/reports_villiers.db',
    'roos': '/data/reports_roos.db',
    'tugela': '/data/reports_tugela.db',
    'winterton': '/data/reports_winterton.db',
}

def get_pharmacy_session():
    pharmacy = request.headers.get('X-Pharmacy', 'reitz').lower()
    db_file = PHARMACY_DB_MAP.get(pharmacy, '/data/reports.db')
    db_url = f"sqlite:///{db_file}"
    engine = create_engine(db_url, echo=False, future=True)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()

# --- Authentication API Endpoints ---

@app.route('/api/login', methods=['POST'])
def login():
    if current_user.is_authenticated:
        return jsonify({'message': 'Already logged in'}), 200
    data = request.json
    username = data.get('username')
    password = data.get('password')
    # Find user (replace with database lookup)
    user = None
    for u in users.values():
        if u.username == username:
            user = u
            break

    if user and check_password_hash(user.password_hash, password):
        login_user(user, remember=True) # Use remember=True for persistent session
        return jsonify({'message': 'Login successful', 'username': user.username}), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
@login_required # Must be logged in to log out
def logout():
    logout_user()
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/api/check_auth', methods=['GET'])
def check_auth():
    if current_user.is_authenticated:
        # --- FIX: Add logic to get and return allowed pharmacies --- 
        allowed = ALLOWED_PHARMACIES.get(current_user.username, []) # Get list or default to empty
        return jsonify({
            'isLoggedIn': True, 
            'username': current_user.username,
            'allowed_pharmacies': allowed # Include the list in the response
        }), 200
        # --- End FIX ---
    else:
        return jsonify({'isLoggedIn': False}), 200

@app.route('/api/today', methods=['GET'])
@login_required # <-- Protect this route
def api_today():
    # Fetch and save the latest report data
    fetch_latest_report()
    today = datetime.date.today()
    entries = get_today_entries(today)
    result = [
        {'category': e.category, 'description': e.description, 'today_value': e.today_value}
        for e in entries
    ]
    return jsonify(result)

@app.route('/api/mtd', methods=['GET'])
@login_required
def api_mtd():
    # Fetch and save the latest report data
    fetch_latest_report()
    today = datetime.date.today()
    results = get_month_to_date_entries(today)
    result = [
        {'category': r[0], 'description': r[1], 'sum_value': r[2]}
        for r in results
    ]
    return jsonify(result)

@app.route('/api/day/<date_str>', methods=['GET'])
@login_required
def api_day(date_str):
    """Return all report entries for a specific date."""
    try:
        d = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'invalid date format'}), 400
    entries = get_today_entries(d)
    result = [
        {'category': e.category, 'description': e.description, 'today_value': e.today_value}
        for e in entries
    ]
    return jsonify(result)

@app.route('/api/month/<month_str>/turnover', methods=['GET'])
@login_required
def api_month_turnover(month_str):
    """Return DAILY turnover totals AND avg basket value for ALL days the given month (YYYY-MM), padding with 0 where no data exists."""
    print(f"--- DEBUG: ENTERING api_month_turnover for {month_str} ---")
    try:
        print(f"--- DEBUG: Trying to parse date for {month_str} ---")
        year, month = map(int, month_str.split('-'))
        start_date = datetime.date(year, month, 1)
        # Calculate the last day of the month
        if month == 12:
            end_date = datetime.date(year, 12, 31)
        else:
            end_date = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)
        num_days = end_date.day # Get number of days in the month
    except Exception as e:
        print(f"--- DEBUG: ERROR during date parsing for {month_str}: {e} ---")
        return jsonify({'error': 'invalid month format'}), 400
    
    print(f"--- DEBUG: Opening database session for {month_str} ---")
    session = get_pharmacy_session()
    processed_data = {}
    try:
        print(f"--- DEBUG: Executing database query for {month_str} ---")
        # Query for daily turnover (using LIKE) AND avg basket value (using exact match)
        rows = session.query(
            ReportEntry.date,
            ReportEntry.description,
            ReportEntry.today_value
        ).filter(
            ReportEntry.date >= start_date,
            ReportEntry.date <= end_date,
            # Query relevant categories
            ReportEntry.category.in_(['TURNOVER SUMMARY', 'SALES SUMMARY']),
            # Use LIKE for turnover, exact for avg value
            (ReportEntry.description.like('%TOTAL TURNOVER%') | (ReportEntry.description == 'Average Value Per Docket/Basket'))
        ).all()
        
        # Process rows into a dictionary keyed by day
        for r in rows:
            day = r.date.day
            if day not in processed_data:
                # Initialize with both keys
                processed_data[day] = {'turnover': 0.0, 'avgBasketValueReported': 0.0} 
            
            # Use contains check for turnover, exact for avg value
            if 'TOTAL TURNOVER' in r.description:
                # Sum turnover (just in case, though should be unique by date/category)
                processed_data[day]['turnover'] += (r.today_value or 0.0) 
            elif r.description == 'Average Value Per Docket/Basket':
                # Set avg basket value
                processed_data[day]['avgBasketValueReported'] = (r.today_value or 0.0)

    except Exception as e: 
        print(f"--- DEBUG: ERROR during database query for {month_str}: {e} ---")
        # Return empty data on error
    finally:
        print(f"--- DEBUG: Closing database session for {month_str} ---")
        session.close()

    # Create result array for all days in the month
    print(f"--- DEBUG: Formatting result for {month_str} ---")
    result = []
    for day_num in range(1, num_days + 1):
        # Ensure default values for both keys if day is missing
        day_summary = processed_data.get(day_num, {'turnover': 0.0, 'avgBasketValueReported': 0.0})
        result.append({
            'day': day_num,
            'turnover': day_summary.get('turnover', 0.0), # Use .get() for safety
            'avgBasketValueReported': day_summary.get('avgBasketValueReported', 0.0) # Add avg basket value
        })
        
    print(f"--- DEBUG: Returning result for {month_str} ---")
    return jsonify(result)

# NEW Endpoint for Cumulative Comparison
@app.route('/api/month/<month_str>/turnover/comparison', methods=['GET'])
@login_required
def api_month_turnover_comparison(month_str):
    """Return CUMULATIVE daily turnover totals for the given month and the previous year's same month (YYYY-MM)."""
    try:
        year, month = map(int, month_str.split('-'))
        
        # Current year dates
        start_current = datetime.date(year, month, 1)
        next_month_current = month % 12 + 1
        next_year_current = year + (month // 12)
        end_current = datetime.date(next_year_current, next_month_current, 1) - datetime.timedelta(days=1)

        # Previous year dates
        prev_year = year - 1
        start_prev = datetime.date(prev_year, month, 1)
        next_month_prev = month % 12 + 1
        next_year_prev = prev_year + (month // 12)
        end_prev = datetime.date(next_year_prev, next_month_prev, 1) - datetime.timedelta(days=1)

    except Exception as e:
        print(f"Error parsing date or calculating date range: {e}") 
        return jsonify({'error': 'invalid month format or date calculation error'}), 400
    
    session = get_pharmacy_session()
    try: 
        # --- Query for current year (Daily) ---
        rows_current_daily = session.query(
            ReportEntry.date,
            func.sum(ReportEntry.today_value).label('daily_turnover') # Get daily turnover
        ).filter(
            ReportEntry.category == 'TURNOVER SUMMARY',
            ReportEntry.description.like('%TOTAL TURNOVER%'),
            ReportEntry.date >= start_current,
            ReportEntry.date <= end_current
        ).group_by(ReportEntry.date).order_by(ReportEntry.date).all()
        
        # --- Query for previous year (Daily) ---
        rows_prev_daily = session.query(
            ReportEntry.date,
            func.sum(ReportEntry.today_value).label('daily_turnover') # Get daily turnover
        ).filter(
            ReportEntry.category == 'TURNOVER SUMMARY',
            ReportEntry.description.like('%TOTAL TURNOVER%'),
            ReportEntry.date >= start_prev,
            ReportEntry.date <= end_prev
        ).group_by(ReportEntry.date).order_by(ReportEntry.date).all()

        # --- Calculate Cumulative Turnover for Current Year ---
        cumulative_current = []
        current_total = 0.0
        # Ensure we have entries for every day up to the last day with data, filling gaps
        days_in_current_data = {r.date.day: r.daily_turnover for r in rows_current_daily}
        last_day_current = max(days_in_current_data.keys()) if days_in_current_data else 0
        for day in range(1, last_day_current + 1):
            daily_val = days_in_current_data.get(day, 0.0)
            current_total += daily_val
            cumulative_current.append({
                'day': day, 
                'cumulative_turnover': current_total
            })
            
        # --- Calculate Cumulative Turnover for Previous Year ---
        cumulative_prev = []
        prev_total = 0.0
        # Ensure we have entries for every day up to the last day with data, filling gaps
        days_in_prev_data = {r.date.day: r.daily_turnover for r in rows_prev_daily}
        last_day_prev = max(days_in_prev_data.keys()) if days_in_prev_data else 0
        for day in range(1, last_day_prev + 1):
            daily_val = days_in_prev_data.get(day, 0.0)
            prev_total += daily_val
            cumulative_prev.append({
                'day': day, 
                'cumulative_turnover': prev_total
            })
            
        # Combine results
        result = {
            'current_year_cumulative': cumulative_current,
            'previous_year_cumulative': cumulative_prev
        }
        return jsonify(result)
        
    except Exception as e: 
        print(f"Error during database query or cumulative calculation: {e}")
        return jsonify({'error': 'database query or processing failed'}), 500
    finally:
        session.close()

@app.route('/api/month/<month_str>/cumulative_turnover', methods=['GET'])
@login_required
def api_month_cumulative_turnover(month_str):
    """Return cumulative daily turnover totals for the given month (YYYY-MM)."""
    try:
        year, month = map(int, month_str.split('-'))
        start = datetime.date(year, month, 1)
        # compute last day of month
        next_month = month % 12 + 1
        next_year = year + (month // 12)
        end = datetime.date(next_year, next_month, 1) - datetime.timedelta(days=1)
    except Exception:
        return jsonify({'error': 'invalid month format'}), 400
    
    session = get_pharmacy_session()
    rows = session.query(
        ReportEntry.date,
        func.sum(ReportEntry.today_value).label('daily_turnover')
    ).filter(
        ReportEntry.category == 'TURNOVER SUMMARY',
        ReportEntry.description.like('%TOTAL TURNOVER%'),
        ReportEntry.date >= start,
        ReportEntry.date <= end
    ).group_by(ReportEntry.date).order_by(ReportEntry.date).all()
    session.close()
    
    cumulative_data = []
    cumulative_total = 0.0
    for r in rows:
        cumulative_total += r.daily_turnover
        cumulative_data.append({
            'date': r.date.isoformat(),
            'cumulative_turnover': cumulative_total
        })
        
    return jsonify(cumulative_data)

@app.route('/api/month/<month_str>/cumulative_costs', methods=['GET'])
@login_required
def api_month_cumulative_costs(month_str):
    """Return cumulative daily Cost of Sales and Purchases for the given month (YYYY-MM)."""
    try:
        year, month = map(int, month_str.split('-'))
        start = datetime.date(year, month, 1)
        next_month = month % 12 + 1
        next_year = year + (month // 12)
        end = datetime.date(next_year, next_month, 1) - datetime.timedelta(days=1)
    except Exception:
        return jsonify({'error': 'invalid month format'}), 400
    
    session = get_pharmacy_session()
    rows = session.query(
        ReportEntry.date,
        func.sum(ReportEntry.today_value).label('value'),
        ReportEntry.description
    ).filter(
        ReportEntry.category == 'STOCK TRADING ACCOUNT',
        ReportEntry.description.in_(['Cost Of Sales', 'Purchases']),
        ReportEntry.date >= start,
        ReportEntry.date <= end
    ).group_by(ReportEntry.date, ReportEntry.description).order_by(ReportEntry.date).all()
    session.close()
    
    # Process data day by day
    daily_data = {}
    all_dates = sorted(list(set(r.date for r in rows)))
    
    for r in rows:
        date_str = r.date.isoformat()
        if date_str not in daily_data:
            daily_data[date_str] = {'Cost Of Sales': 0.0, 'Purchases': 0.0}
        daily_data[date_str][r.description] = r.value

    cumulative_data = []
    cumulative_cost = 0.0
    cumulative_purchase = 0.0
    
    # Ensure all dates within the range are present, even if no data exists
    current_date = start
    while current_date <= end:
        date_str = current_date.isoformat()
        cost_today = daily_data.get(date_str, {}).get('Cost Of Sales', 0.0)
        purchase_today = daily_data.get(date_str, {}).get('Purchases', 0.0)
        
        # Only add data points if there was activity up to this day
        if cost_today != 0.0 or purchase_today != 0.0 or cumulative_cost != 0.0 or cumulative_purchase != 0.0:
             cumulative_cost += cost_today
             cumulative_purchase += purchase_today
             cumulative_data.append({
                 'date': date_str,
                 'cumulative_cost_of_sales': cumulative_cost,
                 'cumulative_purchases': cumulative_purchase
             })
             
        # Only advance if we added data or if there was data for this day
        if not cumulative_data and cost_today == 0.0 and purchase_today == 0.0:
             # Skip days at the beginning with no data at all
             pass 
        elif not any(d['date'] == date_str for d in cumulative_data) and (cost_today != 0.0 or purchase_today != 0.0):
            # If there was data but we skipped adding it initially, add it now
             cumulative_cost += cost_today
             cumulative_purchase += purchase_today
             cumulative_data.append({
                 'date': date_str,
                 'cumulative_cost_of_sales': cumulative_cost,
                 'cumulative_purchases': cumulative_purchase
             })

        current_date += datetime.timedelta(days=1)
        
    return jsonify(cumulative_data)

@app.route('/api/month/<month_str>/aggregates', methods=['GET'])
@login_required
def api_month_aggregates(month_str):
    """Return monthly aggregates including POS Transactions from SALES SUMMARY."""
    try:
        year, month = map(int, month_str.split('-'))
        start = datetime.date(year, month, 1)
        # compute last day of month
        next_month = month % 12 + 1
        next_year = year + (month // 12)
        end = datetime.date(next_year, next_month, 1) - datetime.timedelta(days=1)
    except Exception:
        return jsonify({'error': 'invalid month format'}), 400
    session = get_pharmacy_session()
    # aggregate turnover
    total_turnover = session.query(func.sum(ReportEntry.today_value)).filter(
        ReportEntry.category == 'TURNOVER SUMMARY',
        ReportEntry.description.like('%TOTAL TURNOVER%'),
        ReportEntry.date >= start,
        ReportEntry.date <= end
    ).scalar() or 0.0
    # aggregate cost of sales
    total_cost = session.query(func.sum(ReportEntry.today_value)).filter(
        ReportEntry.category == 'STOCK TRADING ACCOUNT',
        ReportEntry.description == 'Cost Of Sales',
        ReportEntry.date >= start,
        ReportEntry.date <= end
    ).scalar() or 0.0
    # aggregate purchases
    total_purchases = session.query(func.sum(ReportEntry.today_value)).filter(
        ReportEntry.category == 'STOCK TRADING ACCOUNT',
        ReportEntry.description == 'Purchases',
        ReportEntry.date >= start,
        ReportEntry.date <= end
    ).scalar() or 0.0
    # aggregate transactions (Using POS Transactions from SALES SUMMARY)
    total_transactions = session.query(func.sum(ReportEntry.today_value)).filter(
        ReportEntry.category == 'SALES SUMMARY',
        ReportEntry.description == 'POS Transactions',
        ReportEntry.date >= start,
        ReportEntry.date <= end
    ).scalar() or 0
    # aggregate dispensary turnover
    dispensary_turnover = session.query(func.sum(ReportEntry.today_value)).filter(
        ReportEntry.category == 'DISPENSARY SUMMARY',
        ReportEntry.description == 'Dispensary Turnover/Revenue',
        ReportEntry.date >= start,
        ReportEntry.date <= end
    ).scalar() or 0.0

    # NEW: total scripts (sum where description contains 'Scripts', case-insensitive)
    total_scripts = session.query(func.sum(ReportEntry.today_value)).filter(
        ReportEntry.category == 'DISPENSARY SUMMARY',
        ReportEntry.description.ilike('%scripts%'),
        ReportEntry.date >= start,
        ReportEntry.date <= end
    ).scalar() or 0.0

    # NEW: average reported basket value (avg of daily reported values)
    avg_basket_value_reported = session.query(func.avg(ReportEntry.today_value)).filter(
        ReportEntry.category == 'SALES SUMMARY',
        ReportEntry.description == 'Average Value Per Docket/Basket',
        ReportEntry.date >= start,
        ReportEntry.date <= end
    ).scalar() or 0.0

    # NEW: average reported basket size (avg of daily reported values)
    avg_basket_size_reported = session.query(func.avg(ReportEntry.today_value)).filter(
        ReportEntry.category == 'SALES SUMMARY',
        ReportEntry.description == 'Average Number Of Items per Basket',
        ReportEntry.date >= start,
        ReportEntry.date <= end
    ).scalar() or 0.0

    session.close()
    return jsonify({
        'turnover': total_turnover,
        'costOfSales': total_cost,
        'purchases': total_purchases,
        'transactions': total_transactions,
        'dispensaryTurnover': dispensary_turnover,
        'avgBasketValueReported': avg_basket_value_reported,
        'avgBasketSizeReported': avg_basket_size_reported,
        'totalScripts': total_scripts
    })

# NEW Endpoint for Yearly Daily Turnover Data
@app.route('/api/year/<year_str>/daily_turnover', methods=['GET'])
@login_required
def api_year_daily_turnover(year_str):
    """Return all daily turnover totals for the given year (YYYY) AND the previous year."""
    try:
        year = int(year_str)
        prev_year = year - 1
        # Date ranges
        start_current = datetime.date(year, 1, 1)
        end_current = datetime.date(year, 12, 31)
        start_prev = datetime.date(prev_year, 1, 1)
        end_prev = datetime.date(prev_year, 12, 31)
    except ValueError:
        return jsonify({'error': 'invalid year format'}), 400
    except Exception as e:
        print(f"Error calculating year date range: {e}")
        return jsonify({'error': 'error processing year'}), 400

    session = get_pharmacy_session()
    current_year_turnovers = {}
    previous_year_turnovers = {}
    try:
        # Query current year
        rows_current = session.query(
            ReportEntry.date,
            func.sum(ReportEntry.today_value).label('turnover')
        ).filter(
            ReportEntry.category == 'TURNOVER SUMMARY',
            ReportEntry.description.like('%TOTAL TURNOVER%'),
            ReportEntry.date >= start_current,
            ReportEntry.date <= end_current
        ).group_by(ReportEntry.date).all()
        for r in rows_current:
            current_year_turnovers[r.date.isoformat()] = r.turnover

        # Query previous year
        rows_prev = session.query(
            ReportEntry.date,
            func.sum(ReportEntry.today_value).label('turnover')
        ).filter(
            ReportEntry.category == 'TURNOVER SUMMARY',
            ReportEntry.description.like('%TOTAL TURNOVER%'),
            ReportEntry.date >= start_prev,
            ReportEntry.date <= end_prev
        ).group_by(ReportEntry.date).all()
        for r in rows_prev:
            previous_year_turnovers[r.date.isoformat()] = r.turnover
            
    except Exception as e:
        print(f"Error during year turnover query: {e}")
        # Return potentially empty data on error
    finally:
        session.close()
        
    # Return combined results
    result = {
        'current_year': current_year_turnovers,
        'previous_year': previous_year_turnovers
    }
    return jsonify(result)

# NEW: Endpoint for Yearly Aggregates
@app.route('/api/year/<year_str>/aggregates', methods=['GET'])
@login_required
def api_year_aggregates(year_str):
    """Return key yearly aggregates for the specified year and previous year."""
    try:
        year = int(year_str)
        prev_year = year - 1
        start_current = datetime.date(year, 1, 1)
        end_current = datetime.date(year, 12, 31)
        start_prev = datetime.date(prev_year, 1, 1)
        end_prev = datetime.date(prev_year, 12, 31)
    except ValueError:
        return jsonify({'error': 'invalid year format'}), 400
    except Exception as e:
        return jsonify({'error': 'error processing year'}), 400

    session = get_pharmacy_session()
    aggregates = {
        'current_turnover': 0.0,
        'current_cost_of_sales': 0.0,
        'previous_turnover': 0.0,
        'current_dispensary_turnover': 0.0,
        'current_purchases': 0.0,
        'current_transactions': 0,
        'avg_basket_value_reported': 0.0,
        'avg_basket_size_reported': 0.0
    }
    try:
        # Current Year Turnover
        aggregates['current_turnover'] = session.query(func.sum(ReportEntry.today_value)).filter(
            ReportEntry.category == 'TURNOVER SUMMARY',
            ReportEntry.description.like('%TOTAL TURNOVER%'),
            ReportEntry.date >= start_current,
            ReportEntry.date <= end_current
        ).scalar() or 0.0

        # Current Year Cost of Sales
        aggregates['current_cost_of_sales'] = session.query(func.sum(ReportEntry.today_value)).filter(
            ReportEntry.category == 'STOCK TRADING ACCOUNT',
            ReportEntry.description == 'Cost Of Sales',
            ReportEntry.date >= start_current,
            ReportEntry.date <= end_current
        ).scalar() or 0.0

        # Previous Year Turnover
        aggregates['previous_turnover'] = session.query(func.sum(ReportEntry.today_value)).filter(
            ReportEntry.category == 'TURNOVER SUMMARY',
            ReportEntry.description.like('%TOTAL TURNOVER%'),
            ReportEntry.date >= start_prev,
            ReportEntry.date <= end_prev
        ).scalar() or 0.0
        
        # NEW: Current Year Dispensary Turnover
        aggregates['current_dispensary_turnover'] = session.query(func.sum(ReportEntry.today_value)).filter(
            ReportEntry.category == 'DISPENSARY SUMMARY',
            ReportEntry.description == 'Dispensary Turnover/Revenue',
            ReportEntry.date >= start_current,
            ReportEntry.date <= end_current
        ).scalar() or 0.0

        # NEW: Current Year Purchases
        aggregates['current_purchases'] = session.query(func.sum(ReportEntry.today_value)).filter(
            ReportEntry.category == 'STOCK TRADING ACCOUNT',
            ReportEntry.description == 'Purchases',
            ReportEntry.date >= start_current,
            ReportEntry.date <= end_current
        ).scalar() or 0.0
        
        # NEW: Current Year Transactions
        aggregates['current_transactions'] = session.query(func.sum(ReportEntry.today_value)).filter(
            ReportEntry.category == 'SALES SUMMARY',
            ReportEntry.description == 'POS Transactions', 
            ReportEntry.date >= start_current,
            ReportEntry.date <= end_current
        ).scalar() or 0

        # NEW: Average Reported Basket Value (Avg of daily reported values)
        aggregates['avg_basket_value_reported'] = session.query(func.avg(ReportEntry.today_value)).filter(
            ReportEntry.category == 'SALES SUMMARY',
            ReportEntry.description == 'Average Value Per Docket/Basket', 
            ReportEntry.date >= start_current,
            ReportEntry.date <= end_current
        ).scalar() or 0.0

        # NEW: Average Reported Basket Size (Avg of daily reported values)
        aggregates['avg_basket_size_reported'] = session.query(func.avg(ReportEntry.today_value)).filter(
            ReportEntry.category == 'SALES SUMMARY',
            ReportEntry.description == 'Average Number Of Items per Basket', 
            ReportEntry.date >= start_current,
            ReportEntry.date <= end_current
        ).scalar() or 0.0

    except Exception as e:
        print(f"Error during yearly aggregate query: {e}")
        # Return 0s on error, frontend can handle it
    finally:
        session.close()
        
    return jsonify(aggregates)

# NEW: Endpoint for Monthly Summaries for a Year
@app.route('/api/year/<year_str>/monthly_summaries', methods=['GET'])
@login_required
def api_year_monthly_summaries(year_str):
    """Return monthly summaries (Turnover, Prev Yr Turnover, Transactions, Avg Basket Value/Size Reported) for the given year."""
    try:
        year = int(year_str)
        prev_year = year - 1
    except ValueError:
        return jsonify({'error': 'invalid year format'}), 400

    session = get_pharmacy_session()
    summaries = []
    try:
        for month in range(1, 13):
            start_current = datetime.date(year, month, 1)
            next_month_date = start_current + datetime.timedelta(days=32) # Go to roughly next month
            end_current = next_month_date.replace(day=1) - datetime.timedelta(days=1)

            start_prev = datetime.date(prev_year, month, 1)
            next_month_prev_date = start_prev + datetime.timedelta(days=32)
            end_prev = next_month_prev_date.replace(day=1) - datetime.timedelta(days=1)

            # Current Month Turnover
            current_turnover = session.query(func.sum(ReportEntry.today_value)).filter(
                ReportEntry.category == 'TURNOVER SUMMARY',
                ReportEntry.description.like('%TOTAL TURNOVER%'),
                ReportEntry.date >= start_current,
                ReportEntry.date <= end_current
            ).scalar() or 0.0

            # Previous Year Month Turnover
            previous_turnover = session.query(func.sum(ReportEntry.today_value)).filter(
                ReportEntry.category == 'TURNOVER SUMMARY',
                ReportEntry.description.like('%TOTAL TURNOVER%'),
                ReportEntry.date >= start_prev,
                ReportEntry.date <= end_prev
            ).scalar() or 0.0

            # Current Month Transactions
            current_transactions = session.query(func.sum(ReportEntry.today_value)).filter(
                ReportEntry.category == 'SALES SUMMARY',
                ReportEntry.description == 'POS Transactions',
                ReportEntry.date >= start_current,
                ReportEntry.date <= end_current
            ).scalar() or 0 # Default to 0
            
            # NEW: Monthly Average of Reported Daily Average Basket Value
            avg_basket_value_reported = session.query(func.avg(ReportEntry.today_value)).filter(
                ReportEntry.category == 'SALES SUMMARY',
                ReportEntry.description == 'Average Value Per Docket/Basket',
                ReportEntry.date >= start_current,
                ReportEntry.date <= end_current
            ).scalar() or 0.0

            # NEW: Monthly Average of Reported Daily Average Basket Size
            avg_basket_size_reported = session.query(func.avg(ReportEntry.today_value)).filter(
                ReportEntry.category == 'SALES SUMMARY',
                ReportEntry.description == 'Average Number Of Items per Basket',
                ReportEntry.date >= start_current,
                ReportEntry.date <= end_current
            ).scalar() or 0.0
            
            # Calculate YoY Growth (copied from frontend logic for consistency)
            yoy_growth = 0.0
            if previous_turnover > 0: 
               yoy_growth = ((current_turnover - previous_turnover) / previous_turnover) * 100
            elif current_turnover > 0:
               yoy_growth = float('inf') # Represent infinite growth

            summaries.append({
                'month': month,
                'currentTotal': current_turnover,
                'previousTotal': previous_turnover,
                'transactions': current_transactions,
                # Replace calculated size with reported averages
                'avgBasketValueReported': avg_basket_value_reported, 
                'avgBasketSizeReported': avg_basket_size_reported, 
                'yoyGrowth': yoy_growth
            })
            
    except Exception as e:
        print(f"Error during monthly summary calculation for year {year}: {e}")
        session.rollback() # Rollback in case of error during loop
        return jsonify({'error': f'Failed to calculate summaries for year {year}'}), 500
    finally:
        session.close()
        
    return jsonify(summaries)

# NEW: Endpoint for Stock KPIs for a given month
@app.route('/api/month/<month_str>/stock_kpis', methods=['GET'])
@login_required
def api_month_stock_kpis(month_str):
    """Return key stock KPIs for the given month (YYYY-MM)."""
    try:
        year, month = map(int, month_str.split('-'))
        start_date = datetime.date(year, month, 1)
        # compute last day of month
        next_month = month % 12 + 1
        next_year = year + (month // 12)
        end_date = datetime.date(next_year, next_month, 1) - datetime.timedelta(days=1)
    except Exception:
        return jsonify({'error': 'invalid month format'}), 400

    session = get_pharmacy_session()
    kpis = {
        'opening_stock': 0.0,
        'closing_stock': 0.0,
        'cost_of_sales': 0.0,
        'purchases': 0.0,
        'adjustments': 0.0,  # Add adjustments
        'stock_turnover_ratio': None, # NEW
        'dsi': None # NEW
    }
    try:
        # --- Monthly Sums ---
        # Cost of Sales
        kpis['cost_of_sales'] = session.query(func.sum(ReportEntry.today_value)).filter(
            ReportEntry.category == 'STOCK TRADING ACCOUNT',
            ReportEntry.description == 'Cost Of Sales',
            ReportEntry.date >= start_date,
            ReportEntry.date <= end_date
        ).scalar() or 0.0
        
        # Purchases
        kpis['purchases'] = session.query(func.sum(ReportEntry.today_value)).filter(
            ReportEntry.category == 'STOCK TRADING ACCOUNT',
            ReportEntry.description == 'Purchases',
            ReportEntry.date >= start_date,
            ReportEntry.date <= end_date
        ).scalar() or 0.0
        
        # Adjustments (New)
        kpis['adjustments'] = session.query(func.sum(ReportEntry.today_value)).filter(
            ReportEntry.category == 'STOCK TRADING ACCOUNT',
            ReportEntry.description == 'Adjustments', # Changed from 'Stock Adjustment'
            ReportEntry.date >= start_date,
            ReportEntry.date <= end_date
        ).scalar() or 0.0
        
        # --- Point-in-Time Values ---
        # Opening Stock (Value from the first available day of the month)
        first_available_opening_stock_entry = session.query(
            ReportEntry.today_value
        ).filter(
            ReportEntry.category == 'STOCK TRADING ACCOUNT',
            ReportEntry.description == 'Opening Stock (@ Cost at the Beginning of the Month)',
            ReportEntry.date >= start_date,
            ReportEntry.date <= end_date
        ).order_by(
            ReportEntry.date.asc() # Order by date ascending
        ).first() # Get the first result (earliest date)
            
        # Extract the value if an entry was found, otherwise default to 0.0
        kpis['opening_stock'] = first_available_opening_stock_entry[0] if first_available_opening_stock_entry else 0.0

        # Closing Stock (Value from last day of month)
        # Find the actual last date with data in the month for closing stock
        last_data_date_in_month = session.query(func.max(ReportEntry.date)).filter(
             ReportEntry.category == 'STOCK TRADING ACCOUNT',
             ReportEntry.description == 'Closing Stock Valued at Cost Now',
             ReportEntry.date >= start_date,
             ReportEntry.date <= end_date
        ).scalar()

        if last_data_date_in_month:
            last_day_closing = session.query(ReportEntry.today_value).filter(
                ReportEntry.category == 'STOCK TRADING ACCOUNT',
                ReportEntry.description == 'Closing Stock Valued at Cost Now',
                ReportEntry.date == last_data_date_in_month
            ).scalar()
            kpis['closing_stock'] = last_day_closing or 0.0
        else:
             kpis['closing_stock'] = 0.0 # Use 0 if no closing stock found
             
        # --- NEW: Calculate derived KPIs --- 
        avg_stock = 0.0
        if (kpis['opening_stock'] + kpis['closing_stock']) > 0:
            avg_stock = (kpis['opening_stock'] + kpis['closing_stock']) / 2.0
        
        # Stock Turnover Ratio
        if avg_stock > 0 and kpis['cost_of_sales'] is not None:
            kpis['stock_turnover_ratio'] = kpis['cost_of_sales'] / avg_stock
        else:
            kpis['stock_turnover_ratio'] = 0.0 # Or None / Infinity?
            
        # Days Sales of Inventory (DSI)
        if kpis['cost_of_sales'] is not None and kpis['cost_of_sales'] != 0:
            days_in_month = end_date.day # We calculated end_date earlier
            kpis['dsi'] = (avg_stock / kpis['cost_of_sales']) * days_in_month
        else:
            kpis['dsi'] = None # Indicate infinite or undefined DSI
             
    except Exception as e:
        print(f"Error querying stock KPIs for {month_str}: {e}")
        # Return 0s on error
    finally:
        session.close()
        
    return jsonify(kpis)

# NEW: Endpoint for Daily Stock Movements for a given month
@app.route('/api/month/<month_str>/daily_stock_movements', methods=['GET'])
@login_required
def api_month_daily_stock_movements(month_str):
    """Return daily Purchases and Cost of Sales for the given month (YYYY-MM)."""
    try:
        year, month = map(int, month_str.split('-'))
        start_date = datetime.date(year, month, 1)
        # compute last day of month
        next_month = month % 12 + 1
        next_year = year + (month // 12)
        end_date = datetime.date(next_year, next_month, 1) - datetime.timedelta(days=1)
        num_days = end_date.day
    except Exception:
        return jsonify({'error': 'invalid month format'}), 400

    session = get_pharmacy_session()
    daily_data = {}
    try:
        rows = session.query(
            ReportEntry.date,
            ReportEntry.description,
            func.sum(ReportEntry.today_value).label('value')
        ).filter(
            ReportEntry.category == 'STOCK TRADING ACCOUNT',
            ReportEntry.description.in_(['Purchases', 'Cost Of Sales']),
            ReportEntry.date >= start_date,
            ReportEntry.date <= end_date
        ).group_by(ReportEntry.date, ReportEntry.description).all()

        # Process rows into a dictionary keyed by day
        for r in rows:
            day = r.date.day
            if day not in daily_data:
                daily_data[day] = {'purchases': 0.0, 'costOfSales': 0.0}
            
            if r.description == 'Purchases':
                daily_data[day]['purchases'] = r.value or 0.0
            elif r.description == 'Cost Of Sales':
                daily_data[day]['costOfSales'] = r.value or 0.0
                
    except Exception as e:
        print(f"Error querying daily stock movements for {month_str}: {e}")
        # Return empty data on error
    finally:
        session.close()
        
    # Create result array for all days in the month, padding missing days
    result = []
    for day_num in range(1, num_days + 1):
        day_summary = daily_data.get(day_num, {'purchases': 0.0, 'costOfSales': 0.0})
        result.append({
            'day': day_num,
            'purchases': day_summary.get('purchases', 0.0),
            'costOfSales': day_summary.get('costOfSales', 0.0)
        })
        
    return jsonify(result)

# NEW: Endpoint for Yearly Daily Stock Movements
@app.route('/api/year/<year_str>/daily_stock_movements', methods=['GET'])
@login_required
def api_year_daily_stock_movements(year_str):
    """Return daily Purchases and Cost of Sales for the entire given year (YYYY)."""
    try:
        year = int(year_str)
        start_date = datetime.date(year, 1, 1)
        end_date = datetime.date(year, 12, 31)
    except ValueError:
        return jsonify({'error': 'invalid year format'}), 400
    except Exception as e:
        print(f"Error calculating year date range: {e}")
        return jsonify({'error': 'error processing year'}), 400

    session = get_pharmacy_session()
    yearly_data = {}
    try:
        rows = session.query(
            ReportEntry.date,
            ReportEntry.description,
            func.sum(ReportEntry.today_value).label('value')
        ).filter(
            ReportEntry.category == 'STOCK TRADING ACCOUNT',
            ReportEntry.description.in_(['Purchases', 'Cost Of Sales']),
            ReportEntry.date >= start_date,
            ReportEntry.date <= end_date
        ).group_by(ReportEntry.date, ReportEntry.description).all()

        # Process rows into a dictionary keyed by ISO date string (YYYY-MM-DD)
        for r in rows:
            date_str = r.date.isoformat()
            if date_str not in yearly_data:
                yearly_data[date_str] = {'purchases': 0.0, 'costOfSales': 0.0}
            
            if r.description == 'Purchases':
                yearly_data[date_str]['purchases'] = r.value or 0.0
            elif r.description == 'Cost Of Sales':
                yearly_data[date_str]['costOfSales'] = r.value or 0.0
                
    except Exception as e:
        print(f"Error querying yearly daily stock movements for {year_str}: {e}")
        # Return empty data on error
    finally:
        session.close()
        
    # Return the dictionary keyed by date string
    return jsonify(yearly_data)

# NEW: Endpoint for Monthly Stock vs Sales for a Year
@app.route('/api/year/<year_str>/monthly_stock_sales', methods=['GET'])
@login_required
def api_year_monthly_stock_sales(year_str):
    """Return monthly Turnover and Closing Stock for the given year (YYYY)."""
    try:
        year = int(year_str)
    except ValueError:
        return jsonify({'error': 'invalid year format'}), 400

    session = get_pharmacy_session()
    results = [] 
    try:
        for month in range(1, 13):
            start_date = datetime.date(year, month, 1)
            # Compute last day of month
            next_month = month % 12 + 1
            next_year_for_end = year + (month // 12)
            end_date = datetime.date(next_year_for_end, next_month, 1) - datetime.timedelta(days=1)
            
            # --- Monthly Turnover --- 
            turnover = session.query(func.sum(ReportEntry.today_value)).filter(
                ReportEntry.category == 'TURNOVER SUMMARY',
                ReportEntry.description.like('%TOTAL TURNOVER%'),
                ReportEntry.date >= start_date,
                ReportEntry.date <= end_date
            ).scalar() or 0.0
            
            # --- Closing Stock (Value from last day of month with data) ---
            last_data_date_in_month = session.query(func.max(ReportEntry.date)).filter(
                 ReportEntry.category == 'STOCK TRADING ACCOUNT',
                 ReportEntry.description == 'Closing Stock Valued at Cost Now',
                 ReportEntry.date >= start_date,
                 ReportEntry.date <= end_date
            ).scalar()

            closing_stock = 0.0
            if last_data_date_in_month:
                closing_stock = session.query(ReportEntry.today_value).filter(
                    ReportEntry.category == 'STOCK TRADING ACCOUNT',
                    ReportEntry.description == 'Closing Stock Valued at Cost Now',
                    ReportEntry.date == last_data_date_in_month
                ).scalar() or 0.0
            
            results.append({
                'month': month,
                'sales': turnover,
                'stock': closing_stock
            })
            
    except Exception as e:
        print(f"Error querying monthly stock/sales for {year_str}: {e}")
        # Return potentially partial data on error
    finally:
        session.close()
        
    return jsonify(results)

# Endpoint to get the most recent date with data
@app.route('/api/latest_date', methods=['GET'])
@login_required
def api_latest_date():
    """Return the most recent date found in the ReportEntry table."""
    session = get_pharmacy_session()
    latest_date = None
    try:
        max_date_result = session.query(func.max(ReportEntry.date)).scalar()
        if max_date_result:
            latest_date = max_date_result.isoformat()
        else:
            # Fallback if no data exists (optional: return today?)
            latest_date = datetime.date.today().isoformat() 
            
    except Exception as e:
        print(f"Error querying latest date: {e}")
        # Return today's date on error
        latest_date = datetime.date.today().isoformat()
    finally:
        session.close()
        
    return jsonify({'latest_date': latest_date})

# --- NEW: API endpoint for closing stock history ---
@app.route('/api/stock/closing_history')
@login_required
def api_closing_history():
    """Return closing stock for the last N months ending with a given month."""
    months = int(request.args.get('months', 18))
    end_month = request.args.get('end')  # Format: 'YYYY-MM'
    session = get_pharmacy_session()
    try:
        q = session.query(MonthlyClosingStock).order_by(MonthlyClosingStock.month.desc())
        if end_month:
            q = q.filter(MonthlyClosingStock.month <= end_month)
        results = q.limit(months).all()
        # Return in chronological order
        results = sorted(results, key=lambda x: x.month)
        return jsonify([
            {'month': m.month, 'closing_stock': m.closing_stock, 'source_date': m.source_date.isoformat()}
            for m in results
        ])
    finally:
        session.close()

# --- Add this new endpoint at the end of the file or after other routes ---
@app.route('/api/fetch_reports', methods=['POST'])
@login_required
def api_fetch_reports():
    new_days_count = 0 # Default value
    try:
        print("--- Fetching latest report triggered via API ---")
        pharmacy = request.headers.get('X-Pharmacy', 'reitz').lower()
        new_days_count = fetch_latest_report(pharmacy) # Pass pharmacy to load correct .env
        print(f"--- Report fetch process completed, {new_days_count} new days added ---")

        # Query for the latest date AFTER fetching
        session = get_pharmacy_session()
        latest_date_obj = session.query(func.max(ReportEntry.date)).scalar()
        session.close()
        latest_date_str = latest_date_obj.isoformat() if latest_date_obj else "N/A"
        print(f"--- Latest date in DB after fetch: {latest_date_str} ---")

        return jsonify({
            'status': 'success',
            'latest_date': latest_date_str,
            'new_days_count': new_days_count # Add the count to the response
        }), 200
    except Exception as e:
        print(f"--- Error during API fetch_reports: {e} ---")
        return jsonify({'error': str(e)}), 500

# --- Add this code to serve the React App ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        # Serve specific files like CSS, JS, images if they exist
        return send_from_directory(app.static_folder, path)
    else:
        # Serve index.html for the root or any unknown path (React Router handles routing)
        return send_from_directory(app.static_folder, 'index.html')

# --- NEW: Endpoint for combined rolling window data ---
@app.route('/api/dashboard/rolling_window', methods=['GET'])
@login_required
def api_dashboard_rolling_window():
    """Return aggregated data needed for 12-month rolling charts in a single call."""
    try:
        end_year = int(request.args.get('year', datetime.date.today().year))
        end_month = int(request.args.get('month', datetime.date.today().month))
    except ValueError:
        return jsonify({'error': 'Invalid year or month parameter'}), 400

    results = {}
    session = get_pharmacy_session()
    try:
        # Calculate the 12 months needed (end_year/end_month inclusive)
        months_needed = []
        current_date = datetime.date(end_year, end_month, 1)
        for _ in range(12):
            months_needed.append(current_date.strftime('%Y-%m'))
            # Go to previous month
            first_day_current = current_date
            last_day_prev = first_day_current - datetime.timedelta(days=1)
            current_date = last_day_prev.replace(day=1)
        months_needed.reverse() # Chronological order

        # Query for all needed months in one go
        # Select month string, description, and sum(value)
        query_results = session.query(
            func.strftime('%Y-%m', ReportEntry.date).label('month_str'),
            ReportEntry.description,
            func.sum(ReportEntry.today_value).label('total_value')
        ).filter(
            ReportEntry.date >= current_date, # Start date is now the earliest month needed
            ReportEntry.date <= datetime.date(end_year, end_month, 1).replace(day=28)+datetime.timedelta(days=4), # Ensure we cover the end month
            func.strftime('%Y-%m', ReportEntry.date).in_(months_needed),
            ReportEntry.category.in_(['TURNOVER SUMMARY', 'STOCK TRADING ACCOUNT', 'SALES SUMMARY']) # Categories needed
            # Add filter for specific descriptions needed for the charts
            # (Turnover, CostOfSales, Purchases, AvgBasketValue)
            # This might need adjustment based on exact description names
            # ReportEntry.description.in_([
            #     'TOTAL TURNOVER', # Assuming this is correct
            #     'Cost Of Sales',
            #     'Purchases',
            #     'Average Value Per Docket/Basket' 
            # ])
        ).group_by(
            'month_str',
            ReportEntry.description
        ).all()

        # Initialize results dictionary for each month
        for month_key in months_needed:
            results[month_key] = {
                'month': month_key,
                'turnover': 0.0,
                'costOfSales': 0.0,
                'purchases': 0.0,
                'avgBasketValueReported': 0.0
            }

        # Process query results
        for row in query_results:
            month_key = row.month_str
            desc = row.description
            value = row.total_value or 0.0

            if month_key in results: # Should always be true based on filter
                if 'TOTAL TURNOVER' in desc: # Handle variations if needed
                    results[month_key]['turnover'] = value
                elif desc == 'Cost Of Sales':
                    results[month_key]['costOfSales'] = value
                elif desc == 'Purchases':
                    results[month_key]['purchases'] = value
                elif desc == 'Average Value Per Docket/Basket':
                     # We need the AVERAGE daily reported value for the month, not the SUM
                     # This part needs a separate query or different aggregation
                     pass # Placeholder - Will calculate average separately below

        # --- Calculate Average Basket Value Separately --- 
        # Query average daily basket value grouped by month
        avg_basket_results = session.query(
            func.strftime('%Y-%m', ReportEntry.date).label('month_str'),
            func.avg(ReportEntry.today_value).label('avg_value')
        ).filter(
            func.strftime('%Y-%m', ReportEntry.date).in_(months_needed),
            ReportEntry.category == 'SALES SUMMARY',
            ReportEntry.description == 'Average Value Per Docket/Basket'
        ).group_by('month_str').all()
        
        for row in avg_basket_results:
             if row.month_str in results:
                 results[row.month_str]['avgBasketValueReported'] = row.avg_value or 0.0
        # --- End Average Basket Value Calculation ---

    except Exception as e:
        print(f"Error querying rolling window data: {e}")
        session.rollback()
        # Return empty list or error structure?
        return jsonify({"error": "Failed to retrieve rolling window data"}), 500
    finally:
        session.close()

    # Convert results dict to list in chronological order
    results_list = [results[m] for m in months_needed if m in results]
    return jsonify(results_list)

# --- End NEW Endpoint ---

# Make sure your __main__ block is suitable for production
if __name__ == '__main__':
   # Use 0.0.0.0 to be accessible externally (like on Render)
   # Get port from environment variable PORT, default to 5001 if not set
   port = int(os.environ.get('PORT', 5001))
   app.run(host='0.0.0.0', port=port) 