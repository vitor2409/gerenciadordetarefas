const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const DATA_FILE = './tasks.json';

// Ler dados
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
  } catch {
    return { tasks: [], exams: [] };
  }
}

// Salvar dados
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/data', (req, res) => {
  const data = readData();
  res.json(data);
});

app.post('/data', (req, res) => {
  const newData = req.body;
  if (!newData.tasks || !newData.exams) {
    return res.status(400).send('Formato inválido');
  }
  saveData(newData);
  res.send('Dados salvos com sucesso!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
