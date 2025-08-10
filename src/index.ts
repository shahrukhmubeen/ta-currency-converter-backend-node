import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (Vercel-friendly)
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: '*'
}));


// Handle preflight requests
app.options('*', cors());
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
    apiKeyLength: process.env.CURRENCY_API_KEY ? process.env.CURRENCY_API_KEY.length : 0,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    cors: 'enabled for all origins'
  });
});

app.get('/api/currencies', async (req, res) => {
  try {
    const apiKey = process.env.CURRENCY_API_KEY || '4E0VK7BnkdeUuh1vegAt808v2IUjzUR6lxcvBMT2';
    console.log('Using API key length:', apiKey.length);
    console.log('API key exists:', !!apiKey);
    
    const response = await axios.get('https://api.freecurrencyapi.com/v1/currencies', {
      headers: {
        'apikey': apiKey
      }
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching currencies:', error.message);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch currencies',
      details: error.response?.data || error.message,
      apiKeyConfigured: !!process.env.CURRENCY_API_KEY
    });
  }
});

app.post('/api/convert', async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    const apiKey = process.env.CURRENCY_API_KEY || '4E0VK7BnkdeUuh1vegAt808v2IUjzUR6lxcvBMT2';
    
    console.log(`Converting ${amount} ${from} to ${to}`);
    console.log('Using API key length:', apiKey.length);
    
    const response = await axios.get('https://api.freecurrencyapi.com/v1/latest', {
      headers: {
        'apikey': apiKey
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
  } catch (error: any) {
    console.error('Error converting currency:', error.message);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to convert currency',
      details: error.response?.data || error.message,
      apiKeyConfigured: !!process.env.CURRENCY_API_KEY
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
