const express = require('express');
const axios = require('axios');

require('dotenv').config();  // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 3000;

// Use environment variables for sensitive data
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID;

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
      res.status(200).json({ inviteLink: response.data.result });
    } else {
      res.status(500).json({ error: 'Failed to generate link' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
