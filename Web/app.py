from flask import Flask, jsonify, request, send_file
import pyodbc
from datetime import datetime
import os
import csv
from io import StringIO, BytesIO
import requests

app = Flask(__name__)

# Database connection configuration
DB_CONFIG = {
    'server': 'localhost,1433',  # or whatever port you mapped
    'database': 'pokemon_collection',
    'driver': '{ODBC Driver 18 for SQL Server}',
    'user': 'sa',  # or your SQL Server username
    'password': 'cBBdt73pnp?'  # your SQL Server password
}

def get_db_connection():
    """Create and return a database connection"""
    conn_str = (
        f"DRIVER={DB_CONFIG['driver']};"
        f"SERVER={DB_CONFIG['server']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['user']};"
        f"PWD={DB_CONFIG['password']};"
        f"TrustServerCertificate=yes;"
    )
    return pyodbc.connect(conn_str)

# Serve the HTML page
@app.route('/')
def index():
    """Serve the index.html file"""
    return send_file('index.html')

# API Routes

@app.route('/api/sets', methods=['GET'])
def get_sets():
    """Get all Pokemon card sets"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # UPDATED: Added 'era' to the SELECT query
        query = """
            SELECT s.set_id, s.set_name, s.set_code, s.release_date, s.total_cards,
                   COUNT(c.collection_id) as owned_cards, s.image_url, s.language, s.era
            FROM sets s
            LEFT JOIN cards ca ON s.set_id = ca.set_id
            LEFT JOIN collection c ON ca.card_id = c.card_id
            GROUP BY s.set_id, s.set_name, s.set_code, s.release_date, s.total_cards, s.image_url, s.language, s.era
            ORDER BY s.release_date
        """
        cursor.execute(query)
        
        sets = []
        for row in cursor.fetchall():
            sets.append({
                'set_id': row[0],
                'set_name': row[1],
                'set_code': row[2],
                'release_date': row[3].strftime('%Y-%m-%d') if row[3] else None,
                'total_cards': row[4],
                'owned_cards': row[5],
                'completion_percent': round((row[5] / row[4] * 100), 2) if row[4] > 0 else 0,
                'image_url': row[6],
                'language': row[7] if row[7] else 'English',
                'era': row[8] if row[8] else 'Unknown Era'  # ADDED: era field
            })
        
        conn.close()
        return jsonify(sets)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sets/<int:set_id>/cards', methods=['GET'])
def get_set_cards(set_id):
    """Get all cards in a specific set"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT c.card_id, c.card_number, c.card_name, c.rarity, c.card_type,
                   col.quantity, col.collection_id, c.image_url
            FROM cards c
            LEFT JOIN collection col ON c.card_id = col.card_id
            WHERE c.set_id = ?
            ORDER BY 
                CASE 
                    WHEN ISNUMERIC(c.card_number) = 1 THEN CAST(c.card_number AS INT)
                    ELSE 9999
                END,
                c.card_number
        """
        cursor.execute(query, set_id)
        
        cards = []
        for row in cursor.fetchall():
            try:
                cards.append({
                    'card_id': row[0],
                    'card_number': str(row[1]) if row[1] else '',
                    'card_name': str(row[2]) if row[2] else '',
                    'rarity': str(row[3]) if row[3] else '',
                    'card_type': str(row[4]) if row[4] else '',
                    'owned': row[5] is not None,
                    'quantity': row[5] if row[5] else 0,
                    'collection_id': row[6],
                    'image_url': str(row[7]) if row[7] else None
                })
            except Exception as card_error:
                print(f"Error processing card: {card_error}")
                continue
        
        conn.close()
        return jsonify(cards)
    
    except Exception as e:
        print(f"Error in get_set_cards: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/collection', methods=['GET'])
def get_collection():
    """Get all cards in your collection"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT c.card_id, c.card_name, c.card_number, c.rarity, c.card_type,
                   s.set_name, s.set_code,
                   col.quantity, col.acquired_date, col.notes, col.collection_id
            FROM collection col
            JOIN cards c ON col.card_id = c.card_id
            JOIN sets s ON c.set_id = s.set_id
            ORDER BY s.release_date, CAST(c.card_number AS INT)
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
                'notes': row[9],
                'collection_id': row[10]
            })
        
        conn.close()
        return jsonify(collection)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/collection', methods=['POST'])
def add_to_collection():
    """Add a card to your collection"""
    try:
        data = request.json
        card_id = data.get('card_id')
        quantity = data.get('quantity', 1)
        acquired_date = data.get('acquired_date')
        notes = data.get('notes', '')
        
        if not card_id:
            return jsonify({'error': 'card_id is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if card already exists in collection
        cursor.execute("SELECT collection_id, quantity FROM collection WHERE card_id = ?", card_id)
        existing = cursor.fetchone()
        
        if existing:
            # Update quantity
            new_quantity = existing[1] + quantity
            cursor.execute(
                "UPDATE collection SET quantity = ?, updated_at = GETDATE() WHERE collection_id = ?",
                new_quantity, existing[0]
            )
            message = f"Updated quantity to {new_quantity}"
        else:
            # Insert new
            cursor.execute(
                """INSERT INTO collection (card_id, quantity, acquired_date, notes)
                   VALUES (?, ?, ?, ?)""",
                card_id, quantity, acquired_date, notes
            )
            message = "Card added to collection"
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': message})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/collection/<int:card_id>', methods=['DELETE'])
def remove_from_collection(card_id):
    """Remove a card from your collection"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM collection WHERE card_id = ?", card_id)
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Card not found in collection'}), 404
        
        conn.close()
        return jsonify({'success': True, 'message': 'Card removed from collection'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get collection statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Total cards owned
        cursor.execute("SELECT SUM(quantity) FROM collection")
        total_owned = cursor.fetchone()[0] or 0
        
        # Unique cards owned
        cursor.execute("SELECT COUNT(*) FROM collection")
        unique_owned = cursor.fetchone()[0] or 0
        
        # Total possible unique cards
        cursor.execute("SELECT COUNT(*) FROM cards")
        total_possible = cursor.fetchone()[0] or 0
        
        # Most common rarity in collection
        cursor.execute("""
            SELECT TOP 1 c.rarity, COUNT(*) as count
            FROM collection col
            JOIN cards c ON col.card_id = c.card_id
            GROUP BY c.rarity
            ORDER BY count DESC
        """)
        rarity_result = cursor.fetchone()
        most_common_rarity = rarity_result[0] if rarity_result else None
        
        # Completion by Era
        cursor.execute("""
            SELECT s.era, 
                   COUNT(DISTINCT c.card_id) as total_cards,
                   COUNT(DISTINCT col.card_id) as owned_cards
            FROM sets s
            JOIN cards c ON s.set_id = c.set_id
            LEFT JOIN collection col ON c.card_id = col.card_id
            GROUP BY s.era
            ORDER BY s.era
        """)
        era_stats = []
        for row in cursor.fetchall():
            era = row[0] if row[0] else 'Unknown Era'
            total = row[1] or 0
            owned = row[2] or 0
            percentage = round((owned / total * 100), 2) if total > 0 else 0
            era_stats.append({
                'era': era,
                'total_cards': total,
                'owned_cards': owned,
                'completion_percent': percentage
            })
        
        # Completion by Language
        cursor.execute("""
            SELECT s.language, 
                   COUNT(DISTINCT c.card_id) as total_cards,
                   COUNT(DISTINCT col.card_id) as owned_cards
            FROM sets s
            JOIN cards c ON s.set_id = c.set_id
            LEFT JOIN collection col ON c.card_id = col.card_id
            GROUP BY s.language
            ORDER BY s.language
        """)
        language_stats = []
        for row in cursor.fetchall():
            language = row[0] if row[0] else 'English'
            total = row[1] or 0
            owned = row[2] or 0
            percentage = round((owned / total * 100), 2) if total > 0 else 0
            language_stats.append({
                'language': language,
                'total_cards': total,
                'owned_cards': owned,
                'completion_percent': percentage
            })
        
        # Completion by Rarity
        cursor.execute("""
            SELECT c.rarity,
                   COUNT(DISTINCT c.card_id) as total_cards,
                   COUNT(DISTINCT col.card_id) as owned_cards
            FROM cards c
            LEFT JOIN collection col ON c.card_id = col.card_id
            GROUP BY c.rarity
            ORDER BY c.rarity
        """)
        rarity_stats = []
        for row in cursor.fetchall():
            rarity = row[0] if row[0] else 'Common'
            total = row[1] or 0
            owned = row[2] or 0
            percentage = round((owned / total * 100), 2) if total > 0 else 0
            rarity_stats.append({
                'rarity': rarity,
                'total_cards': total,
                'owned_cards': owned,
                'completion_percent': percentage
            })
        
        # Top 5 Most Complete Sets
        cursor.execute("""
            SELECT TOP 5 s.set_name, s.set_code,
                   s.total_cards,
                   COUNT(col.collection_id) as owned_cards,
                   CASE 
                       WHEN s.total_cards > 0 
                       THEN ROUND((CAST(COUNT(col.collection_id) AS FLOAT) / s.total_cards * 100), 2)
                       ELSE 0 
                   END as completion_percent
            FROM sets s
            LEFT JOIN cards c ON s.set_id = c.set_id
            LEFT JOIN collection col ON c.card_id = col.card_id
            GROUP BY s.set_id, s.set_name, s.set_code, s.total_cards
            HAVING COUNT(col.collection_id) > 0
            ORDER BY completion_percent DESC, s.set_name
        """)
        top_complete_sets = []
        for row in cursor.fetchall():
            top_complete_sets.append({
                'set_name': row[0],
                'set_code': row[1],
                'total_cards': row[2],
                'owned_cards': row[3],
                'completion_percent': row[4]
            })
        
        # Top 5 Least Complete Sets (that have at least 1 card)
        cursor.execute("""
            SELECT TOP 5 s.set_name, s.set_code,
                   s.total_cards,
                   COUNT(col.collection_id) as owned_cards,
                   CASE 
                       WHEN s.total_cards > 0 
                       THEN ROUND((CAST(COUNT(col.collection_id) AS FLOAT) / s.total_cards * 100), 2)
                       ELSE 0 
                   END as completion_percent
            FROM sets s
            LEFT JOIN cards c ON s.set_id = c.set_id
            LEFT JOIN collection col ON c.card_id = col.card_id
            GROUP BY s.set_id, s.set_name, s.set_code, s.total_cards
            HAVING COUNT(col.collection_id) > 0
            ORDER BY completion_percent ASC, s.set_name
        """)
        least_complete_sets = []
        for row in cursor.fetchall():
            least_complete_sets.append({
                'set_name': row[0],
                'set_code': row[1],
                'total_cards': row[2],
                'owned_cards': row[3],
                'completion_percent': row[4]
            })
        
        conn.close()
        
        return jsonify({
            'total_cards_owned': total_owned,
            'unique_cards_owned': unique_owned,
            'total_possible_cards': total_possible,
            'completion_percent': round((unique_owned / total_possible * 100), 2) if total_possible > 0 else 0,
            'most_common_rarity': most_common_rarity,
            'by_era': era_stats,
            'by_language': language_stats,
            'by_rarity': rarity_stats,
            'top_complete_sets': top_complete_sets,
            'least_complete_sets': least_complete_sets
        })
    
    except Exception as e:
        print(f"Stats error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    

@app.route('/api/collection/export', methods=['GET'])
def export_collection():
    """Export collection to CSV"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT c.card_name, c.card_number, c.rarity, c.card_type,
                   s.set_name, s.set_code, s.release_date, s.language, s.era,
                   col.quantity, col.acquired_date, col.notes
            FROM collection col
            JOIN cards c ON col.card_id = c.card_id
            JOIN sets s ON c.set_id = s.set_id
            ORDER BY s.release_date, CAST(c.card_number AS INT)
        """
        cursor.execute(query)
        
        # Create CSV in memory
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Card Name', 'Card Number', 'Rarity', 'Type', 
            'Set Name', 'Set Code', 'Release Date', 'Language', 'Era',
            'Quantity', 'Acquired Date', 'Notes'
        ])
        
        # Write data
        for row in cursor.fetchall():
            writer.writerow([
                row[0],  # card_name
                row[1],  # card_number
                row[2],  # rarity
                row[3],  # card_type
                row[4],  # set_name
                row[5],  # set_code
                row[6].strftime('%Y-%m-%d') if row[6] else '',  # release_date
                row[7] if row[7] else 'English',  # language
                row[8] if row[8] else 'Unknown',  # era
                row[9],  # quantity
                row[10].strftime('%Y-%m-%d') if row[10] else '',  # acquired_date
                row[11] if row[11] else ''  # notes
            ])
        
        conn.close()
        
        # Get CSV content and prepare response
        csv_content = output.getvalue()
        output.close()
        
        # Create a new BytesIO object with the CSV content
        from io import BytesIO
        mem = BytesIO()
        mem.write(csv_content.encode('utf-8'))
        mem.seek(0)
        
        return send_file(
            mem,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'pokemon_collection_{datetime.now().strftime("%Y%m%d")}.csv'
        )
    
    except Exception as e:
        print(f"Export error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/wishlist', methods=['GET'])
def get_wishlist():
    """Get all cards in wishlist"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT w.wishlist_id, w.card_id, w.priority, w.notes, w.added_date,
                   c.card_name, c.card_number, c.rarity, c.card_type,
                   s.set_name, s.set_code, s.language, s.era,
                   c.image_url
            FROM wishlist w
            JOIN cards c ON w.card_id = c.card_id
            JOIN sets s ON c.set_id = s.set_id
            ORDER BY 
                CASE w.priority 
                    WHEN 'High' THEN 1 
                    WHEN 'Medium' THEN 2 
                    WHEN 'Low' THEN 3 
                END,
                w.added_date DESC
        """
        cursor.execute(query)
        
        wishlist = []
        for row in cursor.fetchall():
            wishlist.append({
                'wishlist_id': row[0],
                'card_id': row[1],
                'priority': row[2],
                'notes': row[3],
                'added_date': row[4].strftime('%Y-%m-%d') if row[4] else None,
                'card_name': row[5],
                'card_number': row[6],
                'rarity': row[7],
                'card_type': row[8],
                'set_name': row[9],
                'set_code': row[10],
                'language': row[11],
                'era': row[12],
                'image_url': row[13]
            })
        
        conn.close()
        return jsonify(wishlist)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/wishlist', methods=['POST'])
def add_to_wishlist():
    """Add a card to wishlist"""
    try:
        data = request.json
        card_id = data.get('card_id')
        priority = data.get('priority', 'Medium')
        notes = data.get('notes', '')
        
        if not card_id:
            return jsonify({'error': 'card_id is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if already in wishlist
        cursor.execute("SELECT wishlist_id FROM wishlist WHERE card_id = ?", card_id)
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Card already in wishlist'}), 400
        
        # Check if already owned
        cursor.execute("SELECT collection_id FROM collection WHERE card_id = ?", card_id)
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'You already own this card!'}), 400
        
        cursor.execute(
            "INSERT INTO wishlist (card_id, priority, notes) VALUES (?, ?, ?)",
            card_id, priority, notes
        )
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Card added to wishlist'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/wishlist/<int:wishlist_id>', methods=['DELETE'])
def remove_from_wishlist(wishlist_id):
    """Remove a card from wishlist"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM wishlist WHERE wishlist_id = ?", wishlist_id)
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Wishlist item not found'}), 404
        
        conn.close()
        return jsonify({'success': True, 'message': 'Removed from wishlist'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/wishlist/<int:wishlist_id>', methods=['PUT'])
def update_wishlist_item(wishlist_id):
    """Update wishlist item priority or notes"""
    try:
        data = request.json
        priority = data.get('priority')
        notes = data.get('notes')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if priority:
            cursor.execute("UPDATE wishlist SET priority = ? WHERE wishlist_id = ?", priority, wishlist_id)
        if notes is not None:
            cursor.execute("UPDATE wishlist SET notes = ? WHERE wishlist_id = ?", notes, wishlist_id)
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Wishlist updated'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Pokemon Card Collection Manager...")
    print("Visit http://127.0.0.1:5000 in your browser")
    
    # Increase request timeout
    import werkzeug.serving
    werkzeug.serving.WSGIRequestHandler.timeout = 300  # 5 minutes
    
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)