const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');

const app = express();
const upload = multer(); // for parsing multipart/form-data

const PORT = 3001; // Use a different port from your React app

// Configure CORS
app.use(cors({
  origin: 'http://localhost:3000' // URL of React app
}));

// Classify image
app.post('/classify', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    console.log('File received:', req.file);
    const response = await axios.post('http://10.99.134.83:1117/predict', {
      file: req.file
    }, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    console.log('Response:', response.data);

    res.send(response.data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Mock upload
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const mockClassification = {
    label: 'Gandu',
    score: 0.6   
  };

  res.send({
    message: 'File successfully classified',
    classification: mockClassification
  });
});

app.get('/test', (req, res) => {
  res.send({ message: 'Success' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
