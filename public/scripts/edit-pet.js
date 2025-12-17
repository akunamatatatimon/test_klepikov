import { showError, initDateInput, initFileUpload } from './utils.js';

let currentPetId = null;
const modal = document.getElementById('editPetModal');
// Глобальные обработчики
window.openEditModal = (petId) => {
  currentPetId = petId;
  const modal = document.getElementById('editPetModal');
  loadEditForm(petId).then(() => {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  });
};

document.querySelector('#editPetModal .close').onclick = () => {
  document.getElementById('editPetModal').style.display = 'none';
  document.body.style.overflow = 'auto';
};

async function loadEditForm(petId) {
  try {
    const response = await fetch(`/pets/${petId}/edit`);
    const formHtml = await response.text();
    const formContainer = document.getElementById('editPetForm');
    formContainer.innerHTML = formHtml;

    // Инициализация компонентов
    initDateInput('.date-input');
    initFileUpload('#editFileInput', '.file-list');
    initDocumentDeleteHandlers(petId);
    initPetDeletionHandler();

    // Привязка обработчика отправки
    formContainer.onsubmit = handleEditSubmit;
  } catch(err) {
    showError(formContainer, 'Ошибка загрузки формы');
  }
}

function initDocumentDeleteHandlers(petId) {
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const docPath = e.target.dataset.path;
      console.log(docPath);
      
      
      if (confirm('Удалить этот документ?')) {
        try {
          const response = await fetch(`/pets/${petId}/delete-doc/${encodeURIComponent(docPath)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            }
          });

          if (response.ok) {
            e.target.closest('.file-name').remove();
          } else {
            alert('Ошибка удаления документа');
          }
        } catch (err) {
          console.error('Ошибка:', err);
          alert('Не удалось удалить документ');
        }
      }
    });
  });
}

function initPetDeletionHandler() {
  const deleteBtn = document.querySelector('.btn-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm('Вы точно хотите удалить этого питомца?')) {
        try {
          const response = await fetch(`/pets/${currentPetId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            window.location.href = '/pets'; // Перенаправление после удаления
          } else {
            const error = await response.json();
            showError(document.body, error.message);
          }
        } catch (err) {
          console.error('Ошибка удаления:', err);
          showError(document.body, 'Ошибка соединения с сервером');
        }
      }
    });
  }
}

async function handleEditSubmit(e) {
  e.preventDefault();
  try {
    const response = await fetch(`/pets/${currentPetId}?_method=PUT`, {
      method: 'POST',
      body: new FormData(this)
    });

    if(response.ok) window.location.reload();
    else showError(this, await response.text());
  } catch(err) {
    showError(this, 'Ошибка сохранения');
  }
}