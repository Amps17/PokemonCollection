from flask import Flask, jsonify, request
import pyodbc
from datetime import datetime

app = Flask(__name__)

# Database connection configuration for Mac Docker SQL Server
DB_CONFIG = {
    'server': 'localhost',  # Docker SQL Server on Mac
    'database': 'pokemon_collection',
    'username': 'sa',
    'password': 'cBBdt73pnp?',  # UPDATE THIS with your actual password
    'driver': '{ODBC Driver 18 for SQL Server}'
}

def get_db_connection():
    """Create and return a database connection"""
    conn_str = (
        f"DRIVER={DB_CONFIG['driver']};"
        f"SERVER={DB_CONFIG['server']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        f"TrustServerCertificate=yes;"  # Important for Docker SQL Server
    )
    return pyodbc.connect(conn_str)

# API Routes

@app.route('/api/sets', methods=['GET'])
def get_sets():
    """Get all Pokemon card sets with completion progress"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT s.set_id, s.set_name, s.set_code, s.release_date, s.total_cards,
                   s.image_url, s.language, s.era,
                   COUNT(DISTINCT c.collection_id) as owned_cards
            FROM CardSets s
            LEFT JOIN Cards ca ON s.set_id = ca.set_id
            LEFT JOIN Collection c ON ca.card_id = c.card_id
            GROUP BY s.set_id, s.set_name, s.set_code, s.release_date, s.total_cards, 
                     s.image_url, s.language, s.era
            ORDER BY s.release_date DESC
        """
        cursor.execute(query)
        
        sets = []
        for row in cursor.fetchall():
            owned = row[8] or 0
            total = row[4] or 0
            sets.append({
                'set_id': row[0],
                'set_name': row[1],
                'set_code': row[2],
                'release_date': row[3].strftime('%Y-%m-%d') if row[3] else None,
                'total_cards': total,
                'image_url': row[5],
                'language': row[6],
                'era': row[7],
                'owned_cards': owned,
                'completion_percent': round((owned / total * 100), 1) if total > 0 else 0
            })
        
        conn.close()
        return jsonify(sets)
    
    except Exception as e:
        print(f"Error in get_sets: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sets/<int:set_id>/cards', methods=['GET'])
def get_set_cards(set_id):
    """Get all cards in a specific set"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT c.card_id, c.card_number, c.card_name, c.rarity, c.card_type,
                   c.image_url, col.quantity, col.collection_id
            FROM Cards c
            LEFT JOIN Collection col ON c.card_id = col.card_id
            WHERE c.set_id = ?
            ORDER BY c.card_number
        """
        cursor.execute(query, set_id)
        
        cards = []
        for row in cursor.fetchall():
            cards.append({
                'card_id': row[0],
                'card_number': row[1],
                'card_name': row[2],
                'rarity': row[3],
                'card_type': row[4],
                'image_url': row[5],
                'quantity': row[6] or 0,
                'owned': row[7] is not None
            })
        
        conn.close()
        return jsonify(cards)
    
    except Exception as e:
        print(f"Error in get_set_cards: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/collection', methods=['GET'])
def get_collection():
    """Get all cards in user's collection"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT c.card_id, c.card_name, c.card_number, c.rarity, c.card_type,
                   s.set_name, s.set_code, col.quantity, col.acquired_date, col.notes
            FROM Collection col
            JOIN Cards c ON col.card_id = c.card_id
            JOIN CardSets s ON c.set_id = s.set_id
            ORDER BY col.acquired_date DESC, s.set_name, c.card_number
        """
        cursor.execute(query)
        
        collection = []
        for row in cursor.fetchall():
            collection.append({
                'card_id': row[0],
                'card_name': row[1],
                'card_number': row[2],
                'rarity': row[3],
                'card_type': row[4],
                'set_name': row[5],
                'set_code': row[6],
                'quantity': row[7],
                'acquired_date': row[8].strftime('%Y-%m-%d') if row[8] else None,
                'notes': row[9]
            })
        
        conn.close()
        return jsonify(collection)
    
    except Exception as e:
        print(f"Error in get_collection: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/collection', methods=['POST'])
def add_to_collection():
    """Add a card to user's collection"""
    try:
        data = request.get_json()
        card_id = data.get('card_id')
        quantity = data.get('quantity', 1)
        acquired_date = data.get('acquired_date')
        notes = data.get('notes', '')
        
        if not card_id:
            return jsonify({'error': 'card_id is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if card already exists in collection
        cursor.execute("SELECT collection_id, quantity FROM Collection WHERE card_id = ?", card_id)
        existing = cursor.fetchone()
        
        if existing:
            # Update quantity if already in collection
            new_quantity = existing[1] + quantity
            cursor.execute("""
                UPDATE Collection 
                SET quantity = ?, updated_at = GETDATE()
                WHERE collection_id = ?
            """, new_quantity, existing[0])
        else:
            # Insert new card into collection
            cursor.execute("""
                INSERT INTO Collection (card_id, quantity, acquired_date, notes)
                VALUES (?, ?, ?, ?)
            """, card_id, quantity, acquired_date, notes)
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Card added to collection'})
    
    except Exception as e:
        print(f"Error in add_to_collection: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/collection/<int:card_id>', methods=['DELETE'])
def remove_from_collection(card_id):
    """Remove a card from user's collection"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM Collection WHERE card_id = ?", card_id)
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Card not found in collection'}), 404
        
        conn.close()
        return jsonify({'success': True, 'message': 'Card removed from collection'})
    
    except Exception as e:
        print(f"Error in remove_from_collection: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get collection statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Total cards owned (sum of quantities)
        cursor.execute("SELECT SUM(quantity) FROM Collection")
        total_owned = cursor.fetchone()[0] or 0
        
        # Unique cards owned
        cursor.execute("SELECT COUNT(*) FROM Collection")
        unique_owned = cursor.fetchone()[0] or 0
        
        # Total possible cards
        cursor.execute("SELECT SUM(total_cards) FROM CardSets")
        total_possible = cursor.fetchone()[0] or 0
        
        # Most common rarity in collection
        cursor.execute("""
            SELECT TOP 1 c.rarity, COUNT(*) as count
            FROM Collection col
            JOIN Cards c ON col.card_id = c.card_id
            GROUP BY c.rarity
            ORDER BY count DESC
        """)
        rarity_result = cursor.fetchone()
        most_common_rarity = rarity_result[0] if rarity_result else 'None'
        
        # Stats by era
        cursor.execute("""
            SELECT s.era, 
                   SUM(s.total_cards) as total_cards,
                   COUNT(DISTINCT col.card_id) as owned_cards
            FROM CardSets s
            LEFT JOIN Cards c ON s.set_id = c.set_id
            LEFT JOIN Collection col ON c.card_id = col.card_id
            GROUP BY s.era
            ORDER BY s.era
        """)
        by_era = []
        for row in cursor.fetchall():
            total = row[1] or 0
            owned = row[2] or 0
            by_era.append({
                'era': row[0] or 'Unknown',
                'total_cards': total,
                'owned_cards': owned,
                'completion_percent': round((owned / total * 100), 1) if total > 0 else 0
            })
        
        # Stats by language
        cursor.execute("""
            SELECT s.language, 
                   SUM(s.total_cards) as total_cards,
                   COUNT(DISTINCT col.card_id) as owned_cards
            FROM CardSets s
            LEFT JOIN Cards c ON s.set_id = c.set_id
            LEFT JOIN Collection col ON c.card_id = col.card_id
            GROUP BY s.language
            ORDER BY s.language
        """)
        by_language = []
        for row in cursor.fetchall():
            total = row[1] or 0
            owned = row[2] or 0
            by_language.append({
                'language': row[0] or 'Unknown',
                'total_cards': total,
                'owned_cards': owned,
                'completion_percent': round((owned / total * 100), 1) if total > 0 else 0
            })
        
        # Stats by rarity
        cursor.execute("""
            SELECT c.rarity,
                   COUNT(DISTINCT c.card_id) as total_cards,
                   COUNT(DISTINCT col.card_id) as owned_cards
            FROM Cards c
            LEFT JOIN Collection col ON c.card_id = col.card_id
            GROUP BY c.rarity
            ORDER BY c.rarity
        """)
        by_rarity = []
        for row in cursor.fetchall():
            total = row[1] or 0
            owned = row[2] or 0
            by_rarity.append({
                'rarity': row[0] or 'Unknown',
                'total_cards': total,
                'owned_cards': owned,
                'completion_percent': round((owned / total * 100), 1) if total > 0 else 0
            })
        
        # Top 5 most complete sets
        cursor.execute("""
            SELECT TOP 5 s.set_name, s.set_code, s.total_cards,
                   COUNT(DISTINCT col.card_id) as owned_cards
            FROM CardSets s
            LEFT JOIN Cards c ON s.set_id = c.set_id
            LEFT JOIN Collection col ON c.card_id = col.card_id
            GROUP BY s.set_id, s.set_name, s.set_code, s.total_cards
            HAVING COUNT(DISTINCT col.card_id) > 0
            ORDER BY (CAST(COUNT(DISTINCT col.card_id) AS FLOAT) / s.total_cards) DESC
        """)
        top_complete_sets = []
        for row in cursor.fetchall():
            total = row[2] or 0
            owned = row[3] or 0
            top_complete_sets.append({
                'set_name': row[0],
                'set_code': row[1],
                'total_cards': total,
                'owned_cards': owned,
                'completion_percent': round((owned / total * 100), 1) if total > 0 else 0
            })
        
        # Bottom 5 least complete sets (that have at least 1 card)
        cursor.execute("""
            SELECT TOP 5 s.set_name, s.set_code, s.total_cards,
                   COUNT(DISTINCT col.card_id) as owned_cards
            FROM CardSets s
            LEFT JOIN Cards c ON s.set_id = c.set_id
            LEFT JOIN Collection col ON c.card_id = col.card_id
            GROUP BY s.set_id, s.set_name, s.set_code, s.total_cards
            HAVING COUNT(DISTINCT col.card_id) > 0
            ORDER BY (CAST(COUNT(DISTINCT col.card_id) AS FLOAT) / s.total_cards) ASC
        """)
        least_complete_sets = []
        for row in cursor.fetchall():
            total = row[2] or 0
            owned = row[3] or 0
            least_complete_sets.append({
                'set_name': row[0],
                'set_code': row[1],
                'total_cards': total,
                'owned_cards': owned,
                'completion_percent': round((owned / total * 100), 1) if total > 0 else 0
            })
        
        conn.close()
        
        return jsonify({
            'total_cards_owned': total_owned,
            'unique_cards_owned': unique_owned,
            'total_possible_cards': total_possible,
            'completion_percent': round((unique_owned / total_possible * 100), 1) if total_possible > 0 else 0,
            'most_common_rarity': most_common_rarity,
            'by_era': by_era,
            'by_language': by_language,
            'by_rarity': by_rarity,
            'top_complete_sets': top_complete_sets,
            'least_complete_sets': least_complete_sets
        })
    
    except Exception as e:
        print(f"Error in get_stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/collection/export', methods=['GET'])
def export_collection():
    """Export collection as CSV"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT c.card_name, c.card_number, c.rarity, c.card_type,
                   s.set_name, s.set_code, col.quantity, col.acquired_date, col.notes
            FROM Collection col
            JOIN Cards c ON col.card_id = c.card_id
            JOIN CardSets s ON c.set_id = s.set_id
            ORDER BY s.set_name, c.card_number
        """
        cursor.execute(query)
        
        # Create CSV content
        csv_content = "Card Name,Card Number,Rarity,Type,Set Name,Set Code,Quantity,Acquired Date,Notes\n"
        
        for row in cursor.fetchall():
            acquired = row[7].strftime('%Y-%m-%d') if row[7] else ''
            notes = (row[8] or '').replace('"', '""')  # Escape quotes in notes
            csv_content += f'"{row[0]}","{row[1]}","{row[2]}","{row[3]}","{row[4]}","{row[5]}",{row[6]},"{acquired}","{notes}"\n'
        
        conn.close()
        
        from flask import Response
        return Response(
            csv_content,
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=pokemon_collection.csv'}
        )
    
    except Exception as e:
        print(f"Error in export_collection: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("Pokemon Card Collection API")
    print("=" * 60)
    print(f"Server: {DB_CONFIG['server']}")
    print(f"Database: {DB_CONFIG['database']}")
    print("Starting Flask server on http://0.0.0.0:5000")
    print("API will be accessible at http://YOUR_MAC_IP:5000/api")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)