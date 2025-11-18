// server.js - Backend API for Pokemon Collection
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// SQL Server configuration
const dbConfig = {
  server: 'localhost',
  port: 1433,
  database: 'pokemon_collection',
  user: 'sa',
  password: 'cBBdt73pnp?',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// Database connection pool
let pool;

// Initialize database connection
async function initDB() {
  try {
    pool = await sql.connect(dbConfig);
    console.log('✓ Connected to SQL Server');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Get all sets
app.get('/api/sets', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        id,
        name,
        series,
        printedTotal,
        total,
        releaseDate,
        updatedAt,
        images_symbol AS symbol,
        images_logo AS logo
      FROM sets
      ORDER BY releaseDate DESC
    `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching sets:', err);
    res.status(500).json({ error: 'Failed to fetch sets' });
  }
});

// Get set by ID
app.get('/api/sets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query(`
        SELECT 
          id,
          name,
          series,
          printedTotal,
          total,
          releaseDate,
          updatedAt,
          images_symbol AS symbol,
          images_logo AS logo
        FROM sets
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Set not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching set:', err);
    res.status(500).json({ error: 'Failed to fetch set' });
  }
});

// Get all cards (with pagination)
app.get('/api/cards', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;
    
    // Get total count
    const countResult = await pool.request()
      .query('SELECT COUNT(*) as total FROM cards');
    const totalCards = countResult.recordset[0].total;
    
    // Get paginated cards
    const result = await pool.request()
      .input('pageSize', sql.Int, pageSize)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT 
          id,
          name,
          supertype,
          subtypes,
          hp,
          types,
          rarity,
          artist,
          set_id,
          number,
          images_small,
          images_large
        FROM cards
        ORDER BY id
        OFFSET @offset ROWS
        FETCH NEXT @pageSize ROWS ONLY
      `);
    
    res.json({
      data: result.recordset,
      page,
      pageSize,
      totalCards,
      totalPages: Math.ceil(totalCards / pageSize)
    });
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Get cards by set
app.get('/api/sets/:setId/cards', async (req, res) => {
  try {
    const { setId } = req.params;
    
    const result = await pool.request()
      .input('setId', sql.NVarChar, setId)
      .query(`
        SELECT 
          id,
          name,
          supertype,
          subtypes,
          hp,
          types,
          rarity,
          artist,
          set_id,
          number,
          images_small,
          images_large
        FROM cards
        WHERE set_id = @setId
        ORDER BY CAST(number AS INT)
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching cards for set:', err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Get single card by ID
app.get('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query(`
        SELECT 
          c.*,
          s.name as set_name,
          s.series,
          s.releaseDate
        FROM cards c
        LEFT JOIN sets s ON c.set_id = s.id
        WHERE c.id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching card:', err);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

// Search cards
app.get('/api/cards/search', async (req, res) => {
  try {
    const { q, type, rarity, set } = req.query;
    
    let query = 'SELECT * FROM cards WHERE 1=1';
    const request = pool.request();
    
    if (q) {
      query += ' AND name LIKE @search';
      request.input('search', sql.NVarChar, `%${q}%`);
    }
    
    if (type) {
      query += ' AND types LIKE @type';
      request.input('type', sql.NVarChar, `%${type}%`);
    }
    
    if (rarity) {
      query += ' AND rarity = @rarity';
      request.input('rarity', sql.NVarChar, rarity);
    }
    
    if (set) {
      query += ' AND set_id = @set';
      request.input('set', sql.NVarChar, set);
    }
    
    query += ' ORDER BY name';
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error searching cards:', err);
    res.status(500).json({ error: 'Failed to search cards' });
  }
});

// Get collection stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM sets) as totalSets,
        (SELECT COUNT(*) FROM cards) as totalCards,
        (SELECT COUNT(DISTINCT set_id) FROM cards) as setsWithCards
    `);
    
    res.json(stats.recordset[0]);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  await initDB();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Pokemon Collection API Server Running');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 Local:    http://localhost:${PORT}`);
    console.log(`📍 Network:  http://YOUR_IP:${PORT}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nAvailable endpoints:');
    console.log('  GET /api/health');
    console.log('  GET /api/sets');
    console.log('  GET /api/sets/:id');
    console.log('  GET /api/sets/:setId/cards');
    console.log('  GET /api/cards');
    console.log('  GET /api/cards/:id');
    console.log('  GET /api/cards/search?q=pikachu');
    console.log('  GET /api/stats');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get local IP
    const os = require('os');
    const interfaces = os.networkInterfaces();
    Object.keys(interfaces).forEach(name => {
      interfaces[name].forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`💡 Use this IP in your app: http://${iface.address}:${PORT}`);
        }
      });
    });
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  if (pool) {
    await pool.close();
  }
  process.exit(0);
});

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});