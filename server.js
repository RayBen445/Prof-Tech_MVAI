import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/chat', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided.' });

  const python = spawn('python3', ['model.py', prompt]);

  let output = '';
  python.stdout.on('data', (data) => {
    output += data.toString();
  });

  python.stderr.on('data', (data) => {
    console.error('Python error:', data.toString());
  });

  python.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: 'Model failed.' });
    }
    res.json({ response: output.trim() });
  });
});

app.listen(PORT, () => {
  console.log(`✅ ProfTech MVAI API is running at http://localhost:${PORT}`);
});
