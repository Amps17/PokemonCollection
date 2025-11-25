import requests
from bs4 import BeautifulSoup
import pyodbc
import re

# Database connection
conn_str = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost,1433;"
    "DATABASE=PokemonCollection;"
    "UID=sa;"
    "PWD=cBBdt73pnp?;"
    "TrustServerCertificate=yes;"
)

def scrape_japanese_sets_pokellector():
    """Scrape Japanese sets from Pokellector"""
    
    url = "https://www.pokellector.com/sets?CardGame=Pokemon"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    
    print(f"Fetching from Pokellector...")
    response = requests.get(url, headers=headers)
    print(f"Status code: {response.status_code}")
    
    if response.status_code != 200:
        return []
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    sets = []
    
    # Find all set cards
    set_items = soup.find_all('div', class_='card')
    print(f"Found {len(set_items)} set items")
    
    for item in set_items:
        try:
            # Get set name
            name_elem = item.find('h3')
            if not name_elem:
                continue
            
            name = name_elem.get_text(strip=True)
            
            # Filter for Japanese sets (they usually have Japanese characters or specific keywords)
            if any(x in name.lower() for x in ['japanese', 'japan', 'jp']):
                
                # Get release date
                date_elem = item.find('span', class_='date')
                release_date = date_elem.get_text(strip=True) if date_elem else None
                
                # Get card count
                count_elem = item.find('span', class_='count')
                total_cards = 0
                if count_elem:
                    match = re.search(r'(\d+)', count_elem.get_text())
                    total_cards = int(match.group(1)) if match else 0
                
                sets.append({
                    'name': name,
                    'release_date': release_date,
                    'total_cards': total_cards
                })
                
                print(f"Found: {name}")
        
        except Exception as e:
            print(f"Error parsing item: {e}")
            continue
    
    return sets

def determine_era(name, release_date):
    """Determine era based on set name and release date"""
    
    name_lower = name.lower()
    
    if any(x in name_lower for x in ['scarlet', 'violet', 'sv']):
        return 'Scarlet & Violet'
    elif any(x in name_lower for x in ['sword', 'shield', 'vmax', 'vstar']):
        return 'Sword & Shield'
    elif any(x in name_lower for x in ['sun', 'moon', 'sm', 'gx']):
        return 'Sun & Moon'
    elif any(x in name_lower for x in ['xy', 'break', 'mega']):
        return 'XY'
    elif any(x in name_lower for x in ['bw', 'black', 'white']):
        return 'Black & White'
    
    return 'Japanese'

def insert_japanese_sets(sets):
    """Insert Japanese sets into the database"""
    
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    inserted = 0
    
    for set_data in sets:
        name = set_data['name']
        
        # Check if set already exists
        cursor.execute("SELECT COUNT(*) FROM sets WHERE name = ?", name)
        exists = cursor.fetchone()[0]
        
        if not exists:
            era = determine_era(name, set_data.get('release_date'))
            
            try:
                cursor.execute("""
                    INSERT INTO sets (name, total_cards, release_date, era)
                    VALUES (?, ?, ?, ?)
                """, name, set_data['total_cards'], set_data['release_date'], era)
                
                print(f"Inserted: {name} (Era: {era})")
                inserted += 1
            except Exception as e:
                print(f"Error inserting {name}: {e}")
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"\nTotal Japanese sets inserted: {inserted}")

if __name__ == "__main__":
    print("Scraping Japanese Pokemon card sets...\n")
    
    try:
        japanese_sets = scrape_japanese_sets_pokellector()
        
        print(f"\nFound {len(japanese_sets)} Japanese sets")
        
        if japanese_sets:
            print("\nInserting into database...")
            insert_japanese_sets(japanese_sets)
        else:
            print("No Japanese sets found. Try manually adding them or use a different source.")
    except Exception as e:
        print(f"Error: {e}")