import requests
import pyodbc
import json
import time
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'server': 'localhost,1433',  # or whatever port you mapped
    'database': 'pokemon_collection;',
    'driver': '{ODBC Driver 18 for SQL Server}',
    'user': 'sa',  # or your SQL Server username
    'password': 'cBBdt73pnp?'  # your SQL Server password
}

# GitHub raw content base URL for Pokemon TCG data
GITHUB_BASE_URL = "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master"

def get_db_connection():
    conn_str = (
        'DRIVER={ODBC Driver 18 for SQL Server};'
        'SERVER=localhost,1433;'
        'DATABASE=pokemon_collection;'
        'UID=sa;'
        'PWD=cBBdt73pnp?;'
        'TrustServerCertificate=yes;'  # Add this line
    )
    return pyodbc.connect(conn_str)
def fetch_set_list():
    """Fetch the list of available sets from GitHub"""
    print("Fetching set list from GitHub...")
    
    # Get the sets index file
    url = f"{GITHUB_BASE_URL}/sets/en.json"
    
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            sets_data = response.json()
            print(f"Found {len(sets_data)} sets")
            return sets_data
        else:
            print(f"Error fetching sets: {response.status_code}")
            return []
    except Exception as e:
        print(f"Error: {e}")
        return []

def fetch_cards_for_set(set_id):
    """Fetch cards for a specific set from GitHub"""
    print(f"  Fetching cards for set: {set_id}")
    
    url = f"{GITHUB_BASE_URL}/cards/en/{set_id}.json"
    
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            cards_data = response.json()
            print(f"    Fetched {len(cards_data)} cards")
            return cards_data
        else:
            print(f"    Error: {response.status_code}")
            return []
    except Exception as e:
        print(f"    Error: {e}")
        return []

def import_sets(sets_data):
    """Import sets into the database"""
    print("\nImporting sets into database...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    imported_count = 0
    skipped_count = 0
    
    for set_data in sets_data:
        set_id_api = set_data.get('id')
        set_name = set_data.get('name')
        set_code = set_data.get('ptcgoCode', set_id_api)
        release_date = set_data.get('releaseDate')
        total_cards = set_data.get('total', 0)
        
        # Get logo image
        images = set_data.get('images', {})
        image_url = images.get('logo', None)
        
        try:
            # Check if set already exists
            cursor.execute("SELECT set_id FROM sets WHERE set_code = ?", set_code)
            existing = cursor.fetchone()
            
            if existing:
                print(f"  Skipping {set_name} (already exists)")
                skipped_count += 1
                continue
            
            # Parse release date
            release_date_obj = None
            if release_date:
                try:
                    release_date_obj = datetime.strptime(release_date, '%Y/%m/%d').date()
                except:
                    pass
            
            # Insert set
            cursor.execute("""
                INSERT INTO sets (set_name, set_code, release_date, total_cards, image_url)
                VALUES (?, ?, ?, ?, ?)
            """, set_name, set_code, release_date_obj, total_cards, image_url)
            
            conn.commit()
            print(f"  Imported: {set_name} ({set_code})")
            imported_count += 1
            
            # Store the API ID for later card import
            set_data['_db_set_code'] = set_code
            
        except Exception as e:
            print(f"  Error importing {set_name}: {e}")
            conn.rollback()
    
    conn.close()
    print(f"\nSets import complete: {imported_count} imported, {skipped_count} skipped")

def import_cards(sets_data):
    """Import all cards for all sets"""
    print("\nImporting cards for all sets...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    total_cards_imported = 0
    total_cards_skipped = 0
    
    for set_data in sets_data:
        set_id_api = set_data.get('id')
        set_code = set_data.get('ptcgoCode', set_id_api)
        set_name = set_data.get('name')
        
        # Get database set_id
        cursor.execute("SELECT set_id FROM sets WHERE set_code = ?", set_code)
        result = cursor.fetchone()
        
        if not result:
            print(f"  Set {set_name} not found in database, skipping cards")
            continue
        
        db_set_id = result[0]
        
        # Fetch cards for this set from GitHub
        cards = fetch_cards_for_set(set_id_api)
        
        if not cards:
            continue
        
        imported = 0
        skipped = 0
        
        for card_data in cards:
            card_number = card_data.get('number')
            card_name = card_data.get('name')
            rarity = card_data.get('rarity', 'Unknown')
            
            # Get card types
            types = card_data.get('types', [])
            card_type = types[0] if types else 'Unknown'
            
            # Get card image
            images = card_data.get('images', {})
            image_url = images.get('small', None)
            
            try:
                # Check if card already exists
                cursor.execute("""
                    SELECT card_id FROM cards 
                    WHERE set_id = ? AND card_number = ?
                """, db_set_id, card_number)
                
                existing = cursor.fetchone()
                
                if existing:
                    skipped += 1
                    continue
                
                # Insert card
                cursor.execute("""
                    INSERT INTO cards (set_id, card_number, card_name, rarity, card_type, image_url)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, db_set_id, card_number, card_name, rarity, card_type, image_url)
                
                imported += 1
                
            except Exception as e:
                print(f"    Error importing card {card_name}: {e}")
                conn.rollback()
        
        if imported > 0 or skipped > 0:
            conn.commit()
            print(f"  {set_name}: {imported} cards imported, {skipped} skipped")
        
        total_cards_imported += imported
        total_cards_skipped += skipped
        
        # Small delay between sets
        time.sleep(0.1)
    
    conn.close()
    print(f"\nCards import complete: {total_cards_imported} imported, {total_cards_skipped} skipped")

def main():
    """Main import process"""
    print("=" * 60)
    print("Pokemon TCG GitHub JSON Import Script")
    print("=" * 60)
    
    try:
        # Fetch all sets
        sets_data = fetch_set_list()
        
        if not sets_data:
            print("No sets fetched. Exiting.")
            return
        
        # Import sets
        import_sets(sets_data)
        
        # Import cards
        print("\nReady to import cards. This will take a while...")
        confirm = input("Continue? (yes/no): ")
        
        if confirm.lower() in ['yes', 'y']:
            import_cards(sets_data)
            print("\n" + "=" * 60)
            print("Import complete!")
            print("=" * 60)
        else:
            print("Card import cancelled.")
    
    except Exception as e:
        print(f"\nError during import: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n\nFATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        input("\nPress Enter to close...")