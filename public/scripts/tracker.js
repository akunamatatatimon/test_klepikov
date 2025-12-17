// Открытие модального окна
function openModal(element) {
    const day = element.dataset.day;
    const month = element.dataset.month;
    const monthName = element.dataset.monthname;
    const monthNameRod = element.dataset.monthnamerod;
    const year = element.dataset.year;

    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    console.log('Выбранная дата:', dateKey);

    // Заполняем заголовок модального окна
    document.getElementById('selected-date').textContent = 
        `${day} ${monthNameRod} ${year}`;

    // Показываем модальное окно
    document.getElementById('modal').style.display = "block";
    document.body.style.overflow = "hidden";

    // Если есть сохраненные данные для этой даты, подставляем их в форму
    fetch(`/data/${dateKey}`)
        .then(response => response.json())
        .then(data => {
            console.log('Данные для даты:', data);
            document.getElementById('alcohol').value = data.alcohol || 0;
            document.getElementById('cigarettes').value = data.cigarettes || 0;
            document.getElementById('sugar').value = data.sugar || 0;
        })
        .catch(error => {
            console.error('Данные отсутствуют', error);
        });
}

// Закрытие модального окна
function closeModal() {
    document.getElementById('modal').style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('dataForm').reset();
}

// Обработчик отправки формы
document.getElementById('dataForm').onsubmit = async (e) => {
    e.preventDefault(); // Предотвращаем стандартное поведение формы

    try {
        const formData = new FormData(e.target); // Создаем объект FormData из формы
        const dateText = document.getElementById('selected-date').textContent.trim();
        const datePattern = /^(\d{1,2})\s+([а-я]+)\s+(\d{4})$/i;
        const match = dateText.match(datePattern);

        if (!match) {
            console.error('Ошибка: Некорректный формат даты');
            return;
        }

        const [, day, monthName, year] = match;
        const months = {
            'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04',
            'мая': '05', 'июня': '06', 'июля': '07', 'августа': '08',
            'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'
        };

        const month = months[monthName.toLowerCase()];
        const dateKey = `${year}-${month}-${String(day).padStart(2, '0')}`;
        console.log('Формат даты:', dateKey);

        // Добавляем дату в FormData
        formData.append('date', dateKey);

        // Отправляем данные на сервер
        const response = await fetch('/data', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            window.location.reload(); // Перезагружаем страницу при успешном сохранении
        } else {
            const errorText = await response.text();
            alert(`Ошибка: ${errorText}`);
        }
    } catch (err) {
        console.error('Ошибка соединения:', err);
        alert('Ошибка соединения');
    }
};