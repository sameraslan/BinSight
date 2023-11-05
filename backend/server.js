const express = require('express');
const { PythonShell } = require('python-shell');
const multer = require('multer');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors()); // Use CORS middleware

// Set up file storage and multer for image upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to receive image and run Python script
app.post('/infer', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No image given.');
  }

  // Set up options for running Python script
  let options = {
    mode: 'text',
    pythonPath: '../binsightenv/bin/python3',
    pythonOptions: ['-u'], // get print results in real-time
    scriptPath: '../classifier',
    args: ['--arg1', 'value1'],
  };

  // Use PythonShell to run your Python script
  PythonShell.run('testeffnet.py', options, function (err, results) {
    if (err) throw err;
    // results is an array consisting of messages collected during script execution
    console.log('results: %j', results);
    res.send(results);
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
