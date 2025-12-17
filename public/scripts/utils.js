// Общие утилиты
export function showError(container, message, duration = 5000) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    container.prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), duration);
}

export async function updatePetsList() {
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

// Обработчик для поля с датой
export function initDateInput(selector) {
    const dateInput = document.querySelector(selector);
    if(dateInput) {
        dateInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            if(value.length > 2) value = `${value.slice(0,2)}.${value.slice(2)}`;
            if(value.length > 5) value = `${value.slice(0,5)}.${value.slice(5,9)}`;
            e.target.value = value.slice(0, 10);
        });
    }
}

// Общая логика для файлов
export function initFileUpload(inputSelector, listSelector) {
    const fileInput = document.querySelector(inputSelector);
    const fileList = document.querySelector(listSelector);

    if(fileInput && fileList) {
        // Массив для хранения всех файлов
        let allFiles = [];

        fileInput.addEventListener('change', function(e) {
            const newFiles = Array.from(e.target.files);
            
            // Добавляем новые файлы к существующим
            allFiles = [...allFiles, ...newFiles];

            // Обновляем список файлов
            updateFileList();

            // Обновляем fileInput.files с учетом всех файлов
            const dt = new DataTransfer();
            allFiles.forEach(file => dt.items.add(file));
            fileInput.files = dt.files;
        });

        // Функция для обновления списка файлов
        function updateFileList() {
            // Очищаем только динамически добавленные элементы, оставляем существующие
            const dynamicItems = fileList.querySelectorAll('.file-item[data-type="dynamic"]');
            dynamicItems.forEach(item => item.remove());

            // Добавляем все файлы из allFiles
            allFiles.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.setAttribute('data-type', 'dynamic');
                fileItem.innerHTML = `
                    <span class="file-name">
                        <img src="../imgs/file.png" style="width:32px;">
                        ${file.name}
                        <a class="remove-btn" data-file-name="${file.name}"></a>
                    </span>
                `;
                fileList.appendChild(fileItem);
            });
        }

        // Делегирование событий для удаления
        fileList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) {
                e.preventDefault();
                const fileName = e.target.dataset.fileName;
                
                // Удаляем файл из массива
                allFiles = allFiles.filter(file => file.name !== fileName);
                
                // Обновляем fileInput.files
                const dt = new DataTransfer();
                allFiles.forEach(file => dt.items.add(file));
                fileInput.files = dt.files;
                
                // Удаляем элемент из DOM
                e.target.closest('.file-item').remove();
            }
        });
    }
}