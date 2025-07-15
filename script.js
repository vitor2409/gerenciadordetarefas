const BACKEND_URL = 'http://localhost:3000/data';

let tasks = [];
let exams = [];

// --- CARREGAR DADOS DO SERVIDOR ---
async function loadData() {
  try {
    const response = await fetch(BACKEND_URL);
    if (!response.ok) throw new Error('Erro ao carregar dados do servidor');
    const data = await response.json();
    tasks = data.tasks || [];
    exams = data.exams || [];
    renderTasks();
    renderCalendar();
  } catch (error) {
    alert(error.message);
  }
}

// --- SALVAR DADOS NO SERVIDOR ---
async function saveToServer() {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, exams }),
    });
    if (!response.ok) throw new Error('Erro ao salvar dados no servidor');
  } catch (error) {
    alert(error.message);
  }
}

// --- ADICIONAR TAREFA ---
document.getElementById('task-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const deadline = document.getElementById('deadline').value;
  const priority = document.getElementById('priority').value;
  const attachments = document.getElementById('attachment').files;

  if (!title || !description || !deadline) {
    alert('Por favor, preencha todos os campos obrigatórios.');
    return;
  }

  const dateCreated = new Date().toISOString();
  const id = Date.now().toString();
  const status = 'A Fazer';

  const newTask = {
    id,
    title,
    description,
    deadline,
    priority,
    dateCreated,
    status,
    comments: [],
    files: []
  };

  const readerPromises = [];
  for (let file of attachments) {
    const reader = new FileReader();
    readerPromises.push(new Promise((resolve) => {
      reader.onload = () => resolve({ name: file.name, data: reader.result });
      reader.readAsDataURL(file);
    }));
  }

  Promise.all(readerPromises).then(results => {
    newTask.files = results;
    tasks.push(newTask);
    saveTasks();
    renderTasks();
    document.getElementById('task-form').reset();
    saveToServer(); // SALVA NO BACKEND
  });
});

document.getElementById('search').addEventListener('input', renderTasks);
document.getElementById('status-filter').addEventListener('change', renderTasks);

document.getElementById('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({tasks, exams})], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'backup_gerenciador.json';
  a.click();
});

document.getElementById('import-json').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      tasks = data.tasks || [];
      exams = data.exams || [];
      saveTasks();
      saveExams();
      renderTasks();
      renderCalendar();
      if(selectedDate) showDayEvents(selectedDate);
      saveToServer(); // SALVA NO BACKEND APÓS IMPORTAR
    } catch (err) {
      alert('Erro ao importar arquivo.');
    }
  };
  reader.readAsText(file);
});

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks)); // mantém localStorage para fallback
}

function saveExams() {
  localStorage.setItem('exams', JSON.stringify(exams));
}

function renderTasks() {
  const search = document.getElementById('search').value.toLowerCase();
  const filter = document.getElementById('status-filter').value;

  ['todo-list', 'doing-list', 'done-list'].forEach(id => document.getElementById(id).innerHTML = '');

  tasks.forEach(task => {
    if (
      (filter && task.status !== filter) ||
      (!task.title.toLowerCase().includes(search) && !task.description.toLowerCase().includes(search))
    ) return;

    const taskEl = document.createElement('div');
    taskEl.className = 'task';

    if (new Date(task.deadline) < new Date() && task.status !== 'Concluído') {
      taskEl.classList.add('overdue');
    }

    taskEl.innerHTML = `
      <h3>${task.title}</h3>
      <p>${task.description}</p>
      <small>Criada em: ${new Date(task.dateCreated).toLocaleString()}</small><br>
      <small>Prazo: ${task.deadline}</small><br>
      <small>Prioridade: ${task.priority}</small>
      <div>${task.files.map(file => file.data.startsWith('data:image') ? `<img src="${file.data}" alt="${file.name}">` : `<a href="${file.data}" download="${file.name}">${file.name}</a>`).join('')}</div>
      <div><label>Status:</label> <select onchange="updateStatus('${task.id}', this.value)">
        <option ${task.status === 'A Fazer' ? 'selected' : ''}>A Fazer</option>
        <option ${task.status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
        <option ${task.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
      </select></div>
      <div>
        <label>Comentário:</label>
        <input type="text" placeholder="Seu nome" id="author-${task.id}" />
        <input type="text" placeholder="Comentário" id="comment-${task.id}" />
        <button onclick="addComment('${task.id}')">Enviar</button>
      </div>
      <div>${task.comments.map(c => `<div class="comment"><b>${c.author}</b> (${c.date}): ${c.text}</div>`).join('')}</div>
      <button onclick="deleteTask('${task.id}')">Excluir</button>
    `;

    document.getElementById(getColumnId(task.status)).appendChild(taskEl);
  });
}

function getColumnId(status) {
  switch(status) {
    case 'A Fazer': return 'todo-list';
    case 'Em Andamento': return 'doing-list';
    case 'Concluído': return 'done-list';
  }
}

function updateStatus(id, newStatus) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.status = newStatus;
    saveTasks();
    renderTasks();
    if(selectedDate) showDayEvents(selectedDate);
    saveToServer(); // SALVA NO BACKEND
  }
}

function addComment(id) {
  const author = document.getElementById(`author-${id}`).value.trim();
  const text = document.getElementById(`comment-${id}`).value.trim();
  if (!author || !text) return alert('Preencha nome e comentário.');
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.comments.push({ author, text, date: new Date().toLocaleString() });
    saveTasks();
    renderTasks();
    if(selectedDate) showDayEvents(selectedDate);
    saveToServer(); // SALVA NO BACKEND
  }
}

function deleteTask(id) {
  if (confirm('Deseja realmente excluir esta tarefa?')) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    if(selectedDate) showDayEvents(selectedDate);
    saveToServer(); // SALVA NO BACKEND
  }
}

// --- CALENDÁRIO E PROVAS ---

function renderCalendar() {
  const calendarEl = document.getElementById('calendar');
  calendarEl.innerHTML = '';

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDay = firstDay.getDay();
  startDay = (startDay + 6) % 7; // Ajusta para segunda-feira

  for (let i = 0; i < startDay; i++) {
    const blank = document.createElement('div');
    calendarEl.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement('div');
    dayEl.classList.add('calendar-day');
    if (day === today.getDate()) dayEl.classList.add('today');
    dayEl.textContent = day;

    dayEl.addEventListener('click', () => {
      selectDay(year, month, day);
    });

    calendarEl.appendChild(dayEl);
  }
}

let selectedDate = null;

function selectDay(year, month, day) {
  selectedDate = new Date(year, month, day);
  document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
  const calendarEl = document.getElementById('calendar');
  for (let child of calendarEl.children) {
    if (child.textContent == day) {
      child.classList.add('selected');
      break;
    }
  }

  showDayEvents(selectedDate);
}

function showDayEvents(date) {
  const dayEventsEl = document.getElementById('day-events');
  dayEventsEl.innerHTML = '';

  if (!date) {
    dayEventsEl.textContent = 'Selecione um dia no calendário.';
    return;
  }

  const dateStr = date.toISOString().slice(0, 10);

  const tasksForDay = tasks.filter(t => t.deadline === dateStr);
  const examsForDay = exams.filter(e => e.date === dateStr);

  if (tasksForDay.length) {
    const tasksTitle = document.createElement('h4');
    tasksTitle.textContent = 'Tarefas:';
    dayEventsEl.appendChild(tasksTitle);

    tasksForDay.forEach(t => {
      const tDiv = document.createElement('div');
      tDiv.textContent = `${t.title} [${t.status}]`;
      dayEventsEl.appendChild(tDiv);
    });
  }

  if (examsForDay.length) {
    const examsTitle = document.createElement('h4');
    examsTitle.textContent = 'Provas:';
    dayEventsEl.appendChild(examsTitle);

    examsForDay.forEach(e => {
      const eDiv = document.createElement('div');
      eDiv.textContent = e.title;
      dayEventsEl.appendChild(eDiv);
    });
  }

  if (tasksForDay.length === 0 && examsForDay.length === 0) {
    dayEventsEl.textContent = 'Nenhuma tarefa ou prova para este dia.';
  }
}

document.getElementById('exam-form').addEventListener('submit', e => {
  e.preventDefault();
  const examDate = document.getElementById('exam-date').value;
  const examTitle = document.getElementById('exam-title').value.trim();

  if (!examDate || !examTitle) return alert('Preencha a data e o título da prova.');

  exams.push({ date: examDate, title: examTitle });
  saveExams();
  document.getElementById('exam-form').reset();

  if (selectedDate && selectedDate.toISOString().slice(0, 10) === examDate) {
    showDayEvents(selectedDate);
  }

  saveToServer(); // SALVA NO BACKEND
});

// --- INICIALIZAÇÃO ---
loadData();
