CREATE TABLE report_entries (
	id INTEGER NOT NULL, 
	date DATE NOT NULL, 
	category VARCHAR NOT NULL, 
	description VARCHAR NOT NULL, 
	today_value FLOAT, 
	PRIMARY KEY (id), 
	CONSTRAINT _date_category_desc_uc UNIQUE (date, category, description)
);
CREATE INDEX ix_report_entries_date ON report_entries (date);
CREATE INDEX ix_report_entries_category ON report_entries (category);
CREATE INDEX ix_report_entries_id ON report_entries (id);
CREATE TABLE simple_monthly_totals (
	id INTEGER NOT NULL, 
	year INTEGER NOT NULL, 
	month INTEGER NOT NULL, 
	total_turnover FLOAT, 
	previous_year_turnover FLOAT, 
	yoy_growth FLOAT, 
	last_calculated DATETIME, 
	PRIMARY KEY (id), 
	CONSTRAINT _simple_monthly_totals_uc UNIQUE (year, month)
);
CREATE INDEX ix_simple_monthly_totals_month ON simple_monthly_totals (month);
CREATE INDEX ix_simple_monthly_totals_id ON simple_monthly_totals (id);
CREATE INDEX ix_simple_monthly_totals_year ON simple_monthly_totals (year);
CREATE TABLE monthly_closing_stock (
	id INTEGER NOT NULL, 
	month VARCHAR, 
	closing_stock FLOAT NOT NULL, 
	source_date DATE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT _month_uc UNIQUE (month)
);
CREATE UNIQUE INDEX ix_monthly_closing_stock_month ON monthly_closing_stock (month);
CREATE TABLE activity_log (
	id INTEGER NOT NULL, 
	username VARCHAR NOT NULL, 
	action VARCHAR NOT NULL, 
	timestamp DATE NOT NULL, 
	PRIMARY KEY (id)
);
