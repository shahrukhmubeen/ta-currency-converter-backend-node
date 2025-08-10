import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'http://localhost:4200',
    'https://ta-currency-converter-nine.vercel.app',
    'https://ta-currency-converter-backend-node-ci69wzeuq.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey']
}));
app.use(express.json());

// No database connection needed - using localStorage on frontend

// Root route for health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'TA Solutions Currency Converter API',
    status: 'Running',
    endpoints: {
      status: '/api/status',
      currencies: '/api/currencies',
      convert: '/api/convert (POST)',
      history: '/api/history'
    },
    timestamp: new Date().toISOString()
  });
});

// Status route for health check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'Running',
    storage: 'localStorage (frontend)',
    hasApiKey: !!process.env.CURRENCY_API_KEY,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/currencies', async (req, res) => {
  try {
    const response = await axios.get('https://api.freecurrencyapi.com/v1/currencies', {
      headers: {
        'apikey': process.env.CURRENCY_API_KEY || '4E0VK7BnkdeUuh1vegAt808v2IUjzUR6lxcvBMT2'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

app.post('/api/convert', async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    
    console.log(`Converting ${amount} ${from} to ${to}`);
    
    const response = await axios.get('https://api.freecurrencyapi.com/v1/latest', {
      headers: {
        'apikey': process.env.CURRENCY_API_KEY || '4E0VK7BnkdeUuh1vegAt808v2IUjzUR6lxcvBMT2'
      },
      params: {
        base_currency: from,
        currencies: to
      }
    });

    console.log('API Response:', response.data);

    // Check if the API response has the expected structure
    if (!response.data || !response.data.data || !response.data.data[to]) {
      throw new Error(`Invalid API response or currency ${to} not found`);
    }

    const exchangeRate = response.data.data[to];
    const result = exchangeRate * amount;
    
    console.log(`Exchange rate: ${exchangeRate}, Result: ${result}`);
    
    // Return result - history will be stored in localStorage on frontend
    res.json({ 
      result: parseFloat(result.toFixed(2)),
      exchangeRate: exchangeRate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    console.error('Error details:', (error as Error).message);
    res.status(500).json({ 
      error: 'Failed to convert currency',
      details: (error as Error).message 
    });
  }
});

app.get('/api/history', (req, res) => {
  // History is now stored in localStorage on frontend
  // This endpoint returns info about localStorage usage
  res.json({
    message: 'Conversion history is stored in browser localStorage',
    storage: 'frontend',
    instructions: 'Use localStorage.getItem("conversionHistory") to access history'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
