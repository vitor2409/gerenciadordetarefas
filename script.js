let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

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
  });
});

document.getElementById('search').addEventListener('input', renderTasks);
document.getElementById('status-filter').addEventListener('change', renderTasks);
document.getElementById('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(tasks)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'backup_tarefas.json';
  a.click();
});
document.getElementById('import-json').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      tasks = JSON.parse(reader.result);
      saveTasks();
      renderTasks();
    } catch (err) {
      alert('Erro ao importar arquivo.');
    }
  };
  reader.readAsText(file);
});

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
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
  }
}

function deleteTask(id) {
  if (confirm('Deseja realmente excluir esta tarefa?')) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
  }
}

renderTasks();
