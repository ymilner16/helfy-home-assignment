const express = require('express');
const mysql = require('mysql2/promise');
const log4js = require('log4js');
const crypto = require('crypto');
const path = require('path')
const app = express();
const port = 3000;

// initialize express app
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

//configure log4js
log4js.configure({
    appenders: {
        console: {
            type: 'stdout', 
            layout: {
                type: 'pattern',
                pattern: '%m' 
            }
        }
    },
    categories: {
        default: { appenders: ['console'], level: 'info' }
    }
});
const logger = log4js.getLogger();

//configure mysql connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'helfy_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

//login endpoint
app.post('/api/login', async (req, res) => {
  const { user, password } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress;
  if (!user || !password) {
    return res.status(400).json({ message: 'User and password are required' });
  }

  try {
    const [users] = await pool.execute('SELECT id, user FROM users WHERE user = ? AND password = ?', [user, password]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const match = users[0];
    const token = crypto.randomBytes(16).toString('hex');
    await pool.execute('INSERT INTO tokens (user_id, token, ip_address) VALUES (?, ?, ?)', [match.id, token, ipAddress]);
    const activityPayLoad = {
      timestamp: new Date().toISOString(),
      user: match.id,
      action: 'login',
      ipAddress: ipAddress
    };
    logger.info(JSON.stringify(activityPayLoad));
    return res.json({ token });
  }
  catch (error) {
    console.error('Error occurred while logging in:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

//start the server
  app.listen(3000, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });