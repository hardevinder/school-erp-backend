const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

router.post('/generate', async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo', // 🔁 Changed from gpt-4
      messages: [{ role: 'user', content: prompt }],
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    res.json({ reply: response.data.choices[0].message.content });

  } catch (error) {
    const errMsg = error.response?.data || error.message;
    console.error('🔴 OpenAI API ERROR:', errMsg);

    res.status(500).json({
      error: 'OpenAI Request Failed',
      details: errMsg
    });
  }
});

module.exports = router;
