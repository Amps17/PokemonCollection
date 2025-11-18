# 🎴 Pokemon Card Collection Manager

A personal web application for tracking and managing your Pokemon card collection with support for both English and Japanese sets.

## Features

- ✨ Dark/Light mode toggle
- 📱 Mobile responsive design
- 🔍 Real-time search functionality
- 🗂️ Era-based set organization
- 📊 Collection statistics
- 🌍 Multi-language support (English/Japanese)
- 💾 SQL Server database backend

## Tech Stack

- **Backend:** Python, Flask
- **Frontend:** HTML, CSS, JavaScript
- **Database:** Microsoft SQL Server
- **Architecture:** Single-page application with REST API

## Setup Instructions

### Prerequisites
- Python 3.8+
- SQL Server (with ODBC Driver 17)
- pip (Python package manager)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/YOUR_USERNAME/pokemon-card-collection-manager.git
   cd pokemon-card-collection-manager
   ```

2. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

3. Configure database connection in `app.py`
   ```python
   DB_CONFIG = {
       'server': r'YOUR_SERVER_NAME',
       'database': 'pokemon_collection',
       'driver': '{ODBC Driver 17 for SQL Server}'
   }
   ```

4. Run the application
   ```bash
   python app.py
   ```

5. Open browser to `http://127.0.0.1:5000`

## Database Schema

See `database_schema.sql` for complete schema setup.

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## License

Personal use only. Pokemon and all related properties are trademarks of Nintendo/The Pokemon Company International Inc.

## Author

Amps - 2025