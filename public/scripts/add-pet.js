import { showError, initDateInput, initFileUpload } from './utils.js';

const modal = document.getElementById('addPetModal');
const form = document.getElementById('addPetForm');

// Глобальная функция для открытия модалки
window.openAddPetModal = () => {
  form.reset();
  form.querySelector('.file-list').innerHTML = '';
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
  
  // Переинициализация после открытия
  initDateInput('.date-input');
  initFileUpload('#fileInput', '.file-list');
};

// Закрытие модалки
document.querySelector('#addPetModal .close').onclick = () => {
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
};

// Обработчик отправки формы
form.onsubmit = async (e) => {
  e.preventDefault();
  try {
    const response = await fetch('/pets', {
      method: 'POST',
      body: new FormData(form)
    });

    if(response.ok) window.location.reload();
    else showError(form, await response.text());
  } catch(err) {
    showError(form, 'Ошибка соединения');
  }
};