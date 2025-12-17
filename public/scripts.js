document.addEventListener('DOMContentLoaded', () => {
    // Модальное окно
    const modal = document.getElementById('addPetModal') || document.getElementById('editPetModal');
    const openModalBtn = document.querySelector('.btn-add') || document.querySelector('.btn-edit');
    const closeModalBtn = document.querySelector('.close');
    
    // Элементы формы
    const petForm = document.getElementById('petForm');
    const fileInput = document.getElementById('fileInput') || document.getElementById('editfileInput');
    const fileList = document.querySelector('.file-list');
    const dateInput = document.querySelector('.date-input');

    // Открытие модалки
    window.openAddPetModal = () => {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    window.openEditModal = () => {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    };

    // Закрытие модалки
    const closeModal = () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        petForm.reset();
        fileList.innerHTML = '';
    }



    // Обработчики событий
    closeModalBtn.addEventListener('click', closeModal);
    
    window.onclick = (e) => {
        if(e.target === modal) closeModal();
    }

    // Валидация даты
    if(dateInput) {
        dateInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            if(value.length > 2) value = `${value.slice(0,2)}.${value.slice(2)}`;
            if(value.length > 5) value = `${value.slice(0,5)}.${value.slice(5,9)}`;
            
            e.target.value = value.slice(0, 10);
        });
    }

    // Обработка файлов
    if(fileInput) {
        document.getElementById('fileInput') || document.getElementById('editfileInput').addEventListener('change', function(e) {
            const files = e.target.files;
            const fileList = document.querySelector('.file-list');
            fileList.innerHTML = '';
            
            for(let file of files) {
              const fileName = document.createElement('div');
              fileName.innerHTML = 
              `<span class="file-name"><img src="../imgs/file.png">${file.name}<a class="remove-btn" data-file-name="${file.name}"></a></span>`;
                
              fileList.appendChild(fileName);
            }
          
            document.querySelectorAll('.remove-btn').forEach(btn => {
              btn.addEventListener('click', () => {
                const fileName = btn.dataset.fileName;
                removeFile(fileName);
                btn.closest('.file-item').remove();
              });
            });
          });
    }

    // Отправка формы
    if(petForm) {
        petForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const formData = new FormData(petForm);
                const response = await fetch('/pets', {
                    method: 'POST',
                    body: formData
                });

                if(response.ok) {
                    closeModal();
                    await updatePetsList();
                } else {
                    const error = await response.json();
                    showError(error.message);
                }
            } catch(err) {
                showError('Ошибка соединения с сервером');
            }
        });
    }

    // Обновление списка питомцев
    async function updatePetsList() {
        try {
            const response = await fetch('/pets');
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            document.querySelector('.pet-list').innerHTML = 
                doc.querySelector('.pet-list').innerHTML;
        } catch(err) {
            console.error('Ошибка обновления:', err);
        }
    }

    // Показать ошибку
    function showError(message, duration = 5000) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        modal.querySelector('.modal-content').prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), duration);
    }

    function openEditModal() {
        document.getElementById('editPetModal').style.display = 'block';
    }
  
    function closeEditModal() {
        document.getElementById('editPetModal').style.display = 'none';
    }
  
    function confirmDelete() {
        if (confirm('Вы уверены, что хотите удалить этого питомца?')) {
            fetch(`/pets/<%= pet.id %>`, {
                method: 'DELETE'
            }).then(() => window.location.href = '/pets');
        }
    }
});