const express = require('express');
const axios = require('axios');
const ethers = require('ethers');
const admin = require('firebase-admin');
const cron = require('node-cron');

require('dotenv').config();  // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');

app.use(cors());

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.firestore();

// Use environment variables for sensitive data
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID;
const RPC_URL = 'https://subnets.avax.network/meld/mainnet/rpc';  // Meld Network RPC URL
const TOKEN_CONTRACT_ADDRESS = '0x333000333528b1e38884a5d1EF13615B0C17a301';  // Token contract address
const MIN_BALANCE = ethers.utils.parseUnits('5000000', 18);  // Required token balance

// ABI for ERC20 token balance checking
const minABI = [
    {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        type: 'function',
    },
];

// Check wallet eligibility
const checkWalletEligibility = async (walletAddress) => {
    try {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, minABI, provider);
        const balance = await contract.balanceOf(walletAddress);
        return balance.gte(MIN_BALANCE);
    } catch (error) {
        console.error('Error checking wallet balance:', error);
        return false;
    }
};

// Kick user from Telegram group
const kickUserFromGroup = async (telegramUserId) => {
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/kickChatMember`,
            {
                chat_id: TELEGRAM_GROUP_ID,
                user_id: telegramUserId,
            }
        );

        if (response.data.ok) {
            console.log(`User with ID ${telegramUserId} kicked from group.`);
        } else {
            console.error('Error kicking user from Telegram group:', response.data);
        }
    } catch (error) {
        console.error('Server error when kicking user from Telegram group:', error.message);
    }
};

// Daily job to check eligibility and kick ineligible users
cron.schedule('0 0 * * *', async () => {  // Runs every day at midnight
    console.log('Starting daily eligibility check...');

    try {
        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.forEach(async (doc) => {
            const userData = doc.data();
            const walletAddress = userData.walletAddress;
            const telegramUserId = userData.telegramUserId;

            const isEligible = await checkWalletEligibility(walletAddress);

            if (!isEligible) {
                console.log(`User ${telegramUserId} is no longer eligible. Kicking from group.`);
                await kickUserFromGroup(telegramUserId);
            } else {
                console.log(`User ${telegramUserId} is still eligible.`);
            }
        });
    } catch (error) {
        console.error('Error checking eligibility:', error);
    }

    console.log('Daily eligibility check completed.');
});

// API to generate one-time-use Telegram invite link
app.get('/generate-link', async (req, res) => {
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createChatInviteLink`,
            {
                chat_id: TELEGRAM_GROUP_ID,
                member_limit: 1  // Limit the invite link to one use
            }
        );

        if (response.data.ok) {
            console.log('One-time invite link generated:', response.data.result.invite_link);
            res.status(200).json({ inviteLink: response.data.result.invite_link });
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
