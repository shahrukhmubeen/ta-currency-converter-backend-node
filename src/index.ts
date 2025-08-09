import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import mongoose from 'mongoose';

dotenv.config();

interface ConversionRecord {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  result: number;
  timestamp: Date;
}

const conversionRecordSchema = new mongoose.Schema<ConversionRecord>({
  fromCurrency: { type: String, required: true },
  toCurrency: { type: String, required: true },
  amount: { type: Number, required: true },
  result: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

const ConversionRecord = mongoose.model('ConversionRecord', conversionRecordSchema);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/currency-converter')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

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
    
    // Save the conversion record
    const conversionRecord = new ConversionRecord({
      fromCurrency: from,
      toCurrency: to,
      amount: parseFloat(amount),
      result: parseFloat(result.toFixed(2))
    });
    await conversionRecord.save();

    res.json({ result: parseFloat(result.toFixed(2)) });
  } catch (error) {
    console.error('Error converting currency:', error);
    console.error('Error details:', (error as Error).message);
    res.status(500).json({ 
      error: 'Failed to convert currency',
      details: (error as Error).message 
    });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const records = await ConversionRecord.find()
      .sort({ timestamp: -1 })
      .limit(10);
    res.json(records);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
