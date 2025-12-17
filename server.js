const express = require('express');
const fs = require('fs').promises;
const multer = require('multer');
const path = require('path');
const debug = require('debug')('server');

const app = express();
const port = 3020;

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// Конфигурация
app.set('view engine', 'ejs');
app.use(express.static('public'));

const { v4: uuidv4 } = require('uuid');

// Словарь месяцев в родительном падеже
const monthNames = {
    '01': ['января', 'Январь'],
    '02': ['февраля', 'Февраль'],
    '03': ['марта', 'Март'],
    '04': ['апреля', 'Апрель'],
    '05': ['мая', 'Май'],
    '06': ['июня', 'Июнь'],
    '07': ['июля', 'Июль'],
    '08': ['августа', 'Август'],
    '09': ['сентября', 'Сентябрь'],
    '10': ['октября', 'Октябрь'],
    '11': ['ноября', 'Ноябрь'],
    '12': ['декабря', 'Декабрь']
};

function getCalendarData(year, month) {
    const date = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getDate();
    
    const monthNumber = String(month + 1).padStart(2, '0');
    
    let firstDay = date.getUTCDay();
    firstDay = (firstDay === 0) ? 7 : firstDay;
    
    return {
        year: year,
        monthNumber: monthNumber,
        monthName: monthNames[monthNumber][1],
        monthNameRod: monthNames[monthNumber][0],
        days: [
            ...Array.from({ length: firstDay - 1 }, () => ''),
            ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
        ],
        currentDay: new Date().getDate(),
        currentMonth: new Date().getMonth() + 1, // 1-12
        currentYear: new Date().getFullYear()
    };
}

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    }
  });
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Недопустимый тип файла'), false);
    }
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

const petsRepository = {
    async readPets() {
        const data = await fs.readFile('./data/pets.json', 'utf8');
        return JSON.parse(data);
    },

    async writePets(pets) {
        await fs.writeFile('./data/pets.json', JSON.stringify(pets, null, 2));
    },

    async getNextId() {
        try {
            const counter = await fs.readFile('./data/petCounter.txt', 'utf8');
            const newId = parseInt(counter) + 1;
            await fs.writeFile('./data/petCounter.txt', newId.toString());
            return newId;
        } catch (err) {
            await fs.writeFile('./data/petCounter.txt', '1');
            return 1;
        }
    }
};

app.use((req, res, next) => {
    debug(`${req.method} ${req.url}`);
    next();
});

app.get('/pets', async (req, res) => {
    try {
        const pets = await petsRepository.readPets();
        res.render('pets', { pets });
    } catch (err) {
        res.status(500).send('Ошибка загрузки данных');
    }
});

app.post('/pets', upload.array('documents'), async (req, res) => {
    try {
        const requiredFields = ['name', 'species', 'birthDate'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Заполните обязательные поля: ${missingFields.join(', ')}`);
        }

        const newPet = {
            id: await petsRepository.getNextId(),
            ...req.body,
            hasMark: req.body.hasMark === 'true',
            vaccinated: req.body.vaccinated === 'true',
            ectoparasiteTreatment: req.body.ectoparasiteTreatment === 'true',
            deworming: req.body.deworming === 'true',
            sterilized: req.body.sterilized === 'true',
            documents: req.files?.map(file => ({
                filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
                path: file.filename,
                date: new Date().toLocaleDateString('ru-RU')
            })) || []
        };

        const pets = await petsRepository.readPets();
        pets.push(newPet);
        await petsRepository.writePets(pets);

        res.redirect('/pets');
    } catch (err) {
        console.error('Ошибка добавления:', err);
        res.status(400).render('includes/add-pet-form', {
            error: err.message,
            formData: req.body
        });
    }
});

app.get('/pets/:id', async (req, res) => {
  const pets = await petsRepository.readPets();
  
  const pet = pets.find(p => p.id === parseInt(req.params.id));
  
  res.render('pet-details', { pet });
});

app.post('/pets/:id/delete-doc/:docPath', async (req, res) => {
  const pets = await petsRepository.readPets();
  const pet = pets.find(p => p.id === parseInt(req.params.id));
  
  const doc = pet.documents.find(d => d.path === req.params.docPath);
  
  
  await fs.unlink(path.join('uploads', doc.path));
  
  pet.documents = pet.documents.filter(d => d.path !== req.params.docPath);
  await petsRepository.writePets(pets);
  
  res.redirect(`/pets/${req.params.id}`);
});


// Форма редактирования
app.get('/pets/:id/edit', async (req, res) => {
    try {
      const pets = await petsRepository.readPets();
      const pet = pets.find(p => p.id === parseInt(req.params.id));
      if (!pet) throw new Error('Питомец не найден');
      res.render('includes/edit-pet-form', { pet });
    } catch (err) {
      res.status(404).send(err.message);
    }
  });
  
  // Обновление питомца
  app.put('/pets/:id', upload.array('new-documents'), async (req, res) => {
    try {
        const pets = await petsRepository.readPets();
        const index = pets.findIndex(p => p.id === parseInt(req.params.id));
        
        if (index === -1) throw new Error('Питомец не найден');

        let deletedDocs = [];
        if (req.body.deletedDocs) {
            deletedDocs = Array.isArray(req.body.deletedDocs) 
                ? req.body.deletedDocs 
                : [req.body.deletedDocs];
            
            await Promise.all(
                deletedDocs.map(path => 
                    fs.unlink(`uploads/${path}`).catch(console.error)
                )
            );
        }

        pets[index] = {
            ...pets[index],
            ...req.body,
            hasMark: req.body.hasMark === 'true',
            vaccinated: req.body.vaccinated === 'true',
            ectoparasiteTreatment: req.body.ectoparasiteTreatment === 'true',
            deworming: req.body.deworming === 'true',
            sterilized: req.body.sterilized === 'true',
            documents: [
                ...pets[index].documents.filter(doc => 
                    !deletedDocs.includes(doc.path)
                ),
                ...(req.files?.map(file => ({
                    filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
                    path: file.filename,
                    date: new Date().toLocaleDateString('ru-RU')
                })) || [])
            ]
        };

        await petsRepository.writePets(pets);
        res.redirect(`/pets/${req.params.id}`);
    } catch (err) {
        console.error('Ошибка обновления:', err);
        res.status(500).render('includes/edit-pet-form', {
            error: err.message,
            pet: req.body
        });
    }
});

app.delete('/pets/:petId', async (req, res) => {
    try {
        console.log(req.params);
        
        const petId = parseInt(req.params.petId);
        const petsPath = path.join(__dirname, 'data/pets.json');
        const uploadsDir = path.join(__dirname, 'uploads');

        const data = await fs.readFile(petsPath, 'utf8');
        let pets = JSON.parse(data);
        
        const petIndex = pets.findIndex(p => p.id === petId);
        console.log(petIndex);
        
        if (petIndex === -1) {
            return res.status(404).json({ message: 'Питомец не найден' });
        }

        const pet = pets[petIndex];

        console.log(pet.documents);
        
        if (pet.documents) {
            console.log('dsadasdasd');
            
            for (const doc of pet.documents) {
                const filePath = path.join(uploadsDir, doc.path);
                try {
                    await fs.access(filePath);
                    await fs.unlink(filePath);
                } catch (fileError) {
                    console.error(`Файл не найден: ${filePath}`);
                }
            }
        }

        pets = pets.filter(p => p.id !== petId);

        await fs.writeFile(petsPath, JSON.stringify(pets, null, 2));

        res.status(200).json({ message: 'Питомец успешно удален' });
    } catch (error) {
        console.error('Ошибка при удалении питомца:', error);
        res.status(500).json({
            message: 'Ошибка при удалении питомца',
            error: error.message
        });
    }
});

app.get('/tracker', async (req, res) => {
    try {
        const today = new Date();
        const year = parseInt(req.query.year) || today.getFullYear();
        const month = parseInt(req.query.month) || today.getMonth();
        
        const data = await fs.readFile(CALENDAR_FILE, 'utf8');
        const entries = JSON.parse(data);

        const calendarData = getCalendarData(year, month);
        calendarData.entries = entries;
        
        res.render('tracker', {
            calendar: calendarData,
            prevMonth: month === 0 ? 11 : month - 1,
            prevYear: month === 0 ? year - 1 : year,
            nextMonth: month === 11 ? 0 : month + 1,
            nextYear: month === 11 ? year + 1 : year
        });
        
    } catch (error) {
        res.status(500).send('Ошибка сервера');
    }
});
const CALENDAR_FILE = path.join(__dirname, 'data', 'calendar-data.json');

app.get('/data/:date', (req, res) => {
    const dateKey = req.params.date;
    console.log('Запрошенная дата:', dateKey);
    
    fs.readFile(CALENDAR_FILE, 'utf8')
        .then(data => {
            try {
                
                const entries = JSON.parse(data);
                
                const entry = entries[dateKey]
                
                console.log('Найденные данные:', entry);
                res.json(entry);
            } catch (error) {
                console.error('Ошибка парсинга JSON:', error);
                res.status(500).json({ error: 'Неверный формат данных' });
            }
        })
        .catch(error => {
            console.error('Ошибка чтения файла:', error);
            res.status(500).json({ error: 'Ошибка доступа к данным' });
        });
});

app.post('/data', upload.none(), async (req, res) => {
    console.log('--- Новый запрос ---');
    console.log('Body:', req.body);

    // Проверяем, что тело запроса не пустое
    if (!req.body || Object.keys(req.body).length === 0) {
        console.error('Ошибка: Пустой запрос');
        return res.status(400).json({ error: 'Пустой запрос' });
    }

    // Извлекаем данные из запроса
    const { alcohol, cigarettes, sugar, date } = req.body;

    // Проверяем, что все необходимые поля присутствуют
    if (alcohol === undefined || cigarettes === undefined || sugar === undefined || !date) {
        console.error('Ошибка: Некорректные данные');
        return res.status(400).json({ error: 'Некорректные данные' });
    }

    let data = {};

    try {
        try {
            const fileContent = await fs.readFile(CALENDAR_FILE, 'utf8');
            data = JSON.parse(fileContent);
        } catch (err) {
            console.log('Файл не найден, создаем новый');
        }
        console.log(data);
        
        data[date] = {
            alcohol: parseInt(alcohol) || 0,
            cigarettes: parseInt(cigarettes) || 0,
            sugar: parseInt(sugar) || 0
        };
        console.log(data);
        

        // Записываем обновлённые данные обратно в файл
        await fs.writeFile(CALENDAR_FILE, JSON.stringify(data, null, 2));
        res.json(data[date]);
    } catch (error) {
        console.error('Ошибка сервера:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer Error:', err);
      res.status(400).send("Ошибка загрузки файлов");
    } else {
      next(err);
    }
  });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static('uploads', {
    setHeaders: (res, path) => {
      res.attachment(path);
    }
  }));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));