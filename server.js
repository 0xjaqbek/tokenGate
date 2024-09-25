const express = require('express');
const axios = require('axios');

require('dotenv').config();  // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 3000;

// Use environment variables for sensitive data
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID;

const cors = require('cors');

app.use(cors());  // Enable CORS for all requests

// API to generate one-time-use Telegram invite link
app.get('/generate-link', async (req, res) => {
    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/exportChatInviteLink`,
        {
          chat_id: TELEGRAM_GROUP_ID,
        }
      );
  
      if (response.data.ok) {
        console.log('Invite link generated:', response.data.result);
        res.status(200).json({ inviteLink: response.data.result });
      } else {
        console.log('Telegram API Error:', response.data);
        res.status(500).json({ error: 'Failed to generate link' });
      }
    } catch (error) {
      console.error('Server error:', error.message);
      res.status(500).json({ error: 'Server error' });
    }
  });
  

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
