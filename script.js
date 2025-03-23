document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const daysContainer = document.getElementById('days-container');
    const currentWeekSpan = document.getElementById('current-week');
    const prevWeekButton = document.getElementById('btn-prev-week');
    const nextWeekButton = document.getElementById('btn-next-week');
    const addEventButton = document.getElementById('btn-add-event');
    const modal = document.getElementById('modal-add-event'); // Modal Agregar/Editar
    const closeButton = document.querySelector('.close-button');
    const addEventForm = document.getElementById('add-event-form');
    const eventDetailsContent = document.getElementById('event-details-content');
    const searchInput = document.getElementById('search-input');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const filterButton = document.getElementById('btn-filter');
    const resetFilterButton = document.getElementById('btn-reset-filter');
    const pendingTasksList = document.getElementById('pending-tasks-list'); //Reporte
    const modalTitle = document.getElementById('modal-title');
    const saveEventButton = document.getElementById('save-event-button');
    const eventIdInput = document.getElementById('event-id');
    const alertModal = document.getElementById('alert-modal'); // Modal Alerta
    const alertMessage = document.getElementById('alert-message');
    const alertSound = document.getElementById('alert-sound');
    const alertCloseButton = document.getElementById('alert-close-button');
    const generatePdfButton = document.getElementById('btn-generate-pdf'); //Boton PDF

    // --- Variables Globales ---
    let currentDate = new Date();
    let events = {};
    let editingEventId = null;
    let alertIntervalId = null; //Para las alertas

    // --- Base de Datos Simulada (Blog de Notas) ---
    const notesDatabase = {
        _notes: JSON.parse(localStorage.getItem('notes')) || {},

        addNote(date, eventData) {
            if (!this._notes[date]) {
                this._notes[date] = [];
            }
            this._notes[date].push(eventData);
            this.saveNotes();
        },

        getNotes(date) {
            return this._notes[date] || [];
        },

        updateNote(date, eventId, updatedEventData) {
            if (this._notes[date]) {
                const index = this._notes[date].findIndex(event => event.id === eventId);
                if (index !== -1) {
                    this._notes[date][index] = { ...this._notes[date][index], ...updatedEventData };
                    this.saveNotes();
                    return true;
                }
            }
            return false;
        },

        deleteNote(date, eventId) {
            if (this._notes[date]) {
                this._notes[date] = this._notes[date].filter(event => event.id !== eventId);
                if (this._notes[date].length === 0) {
                    delete this._notes[date];
                }
                this.saveNotes();
                return true;
            }
            return false;
        },

        saveNotes() {
            localStorage.setItem('notes', JSON.stringify(this._notes));
        },
        searchNotes(query) {
            query = query.toLowerCase();
            const results = [];

            for (const date in this._notes) {
                for (const event of this._notes[date]) {
                    if (
                        event.title.toLowerCase().includes(query) ||
                        (event.description && event.description.toLowerCase().includes(query)) ||
                        (event.note && event.note.toLowerCase().includes(query))
                    ) {
                        results.push(event);
                    }
                }
            }
            return results;
        },
         filterNotesByDateRange(startDate, endDate) {
            const results = [];
            for (const date in this._notes) {
                if (date >= startDate && date <= endDate) {
                    results.push(...this._notes[date]);
                }
            }
            return results;
        },
        getPendingTasks() {
            const today = formatDate(new Date());
            const pendingTasks = [];

            for (const date in this._notes) {
                // MODIFICADO: Incluir todas las tareas no completadas, tanto pasadas como futuras
                for (const event of this._notes[date]) {
                    if (event.type === 'task' && !event.completed) {
                        pendingTasks.push(event);
                    }
                }
            }

            pendingTasks.sort((a, b) => { //Ordena
                const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
                const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
                return dateA - dateB;
            });

            return pendingTasks;
        },
        toggleTaskCompletion(date, eventId) {
            if (this._notes[date]) {
                const event = this._notes[date].find(e => e.id === eventId);
                if (event) {
                    event.completed = !event.completed;
                    this.saveNotes();
                    return true;
                }
            }
            return false;
        }
    };

    events = notesDatabase._notes;

    // --- Funciones de Utilidad ---
    function getFirstDayOfWeek(date) {
        const firstDay = new Date(date);
        firstDay.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
        return firstDay;
    }

    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // --- Funciones Principales ---

      function renderCalendar() {
        const firstDayOfWeek = getFirstDayOfWeek(currentDate);
        currentWeekSpan.textContent = `Semana ${getWeekNumber(currentDate)}, ${currentDate.getFullYear()}`;
        daysContainer.innerHTML = '';

        for (let i = 0; i < 7; i++) {
            const day = new Date(firstDayOfWeek);
            day.setDate(firstDayOfWeek.getDate() + i);
            const formattedDate = formatDate(day);
            const dayElement = document.createElement('div');
            dayElement.classList.add('day');
            dayElement.dataset.date = formattedDate;

             const dayNumber = document.createElement('span');
            dayNumber.classList.add('day-number');
            dayNumber.textContent = day.getDate();
            dayElement.appendChild(dayNumber);

            if(day.getMonth() !== currentDate.getMonth()){
              dayElement.classList.add('other-month');
            }

            if (formattedDate === formatDate(new Date())) {
                dayElement.classList.add('today');
            }
            const dayEvents = notesDatabase.getNotes(formattedDate);
            dayEvents.forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.classList.add('event');
                if(event.completed){ //Si la tarea está completa
                    eventElement.classList.add('completed-task');
                }
                eventElement.textContent = event.title;
                eventElement.dataset.eventData = JSON.stringify(event);
                dayElement.appendChild(eventElement);

                eventElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showEventDetails(event);
                });
            });

            dayElement.addEventListener('click', () => showDayEvents(formattedDate));
            daysContainer.appendChild(dayElement);
        }
    }

    function getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    function showDayEvents(date) {
        const events = notesDatabase.getNotes(date);
        let eventsHTML = '';

        if (events.length > 0) {
            eventsHTML = events.map(event => {
                const completedCheckbox = `<input type="checkbox" id="complete-${event.id}" ${event.completed ? 'checked' : ''} onchange="toggleCompletion('${date}', ${event.id}, this)">`;
                const checkboxContainer = `<div class="checkbox-container">${completedCheckbox}</div>`;

                return `
                    <h3>${checkboxContainer} ${event.title} ${event.emoji || ''}</h3>
                    <p>Fecha: ${event.date}</p>
                    <p>Hora: ${event.time || 'N/A'}</p>
                    <p>Descripción: ${event.description || 'Sin descripción'}</p>
                    <p>Nota: ${event.note || 'Sin nota'}</p>
                    <p>Tipo: ${event.type}</p>
                    <button class="edit-button" onclick="editEvent('${date}', ${event.id})"><i class="fas fa-edit"></i> Editar</button>
                    <button onclick="deleteEvent('${date}', ${event.id})"><i class="fas fa-trash"></i> Eliminar</button>
                `;
            }).join('');
        } else {
            eventsHTML = '<p>No hay eventos para este día.</p>';
        }

        eventDetailsContent.innerHTML = eventsHTML;
    }
     function showEventDetails(event) {
        const completedCheckbox = `<input type="checkbox" id="complete-${event.id}" ${event.completed ? 'checked' : ''} onchange="toggleCompletion('${event.date}', ${event.id}, this)">`;
        const checkboxContainer = `<div class="checkbox-container">${completedCheckbox}</div>`;

        eventDetailsContent.innerHTML = `
            <h3>${checkboxContainer} ${event.title} ${event.emoji || ''}</h3>
            <p>Fecha: ${event.date}</p>
            <p>Hora: ${event.time || 'N/A'}</p>
            <p>Descripción: ${event.description || 'Sin descripción'}</p>
            <p>Nota: ${event.note || 'Sin nota'}</p>
            <p>Tipo: ${event.type}</p>
            <button class="edit-button" onclick="editEvent('${event.date}', ${event.id})"><i class="fas fa-edit"></i> Editar</button>
            <button onclick="deleteEvent('${event.date}', ${event.id})"><i class="fas fa-trash"></i> Eliminar</button>
        `;
    }

    // --- Funciones para Editar, Reporte y Alertas ---

    window.editEvent = (date, eventId) => {
        const event = notesDatabase.getNotes(date).find(e => e.id === eventId);
        if (event) {
            eventIdInput.value = event.id;
            document.getElementById('event-title').value = event.title;
            document.getElementById('event-date').value = event.date;
            document.getElementById('event-time').value = event.time || '';
            document.getElementById('event-description').value = event.description || '';
            document.getElementById('event-note').value = event.note || '';
            document.getElementById('event-type').value = event.type;

            modalTitle.textContent = 'Editar Evento';
            saveEventButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
            editingEventId = eventId;

            modal.style.display = 'flex'; // Mostrar modal
        }
    };

    window.toggleCompletion = (date, eventId, checkbox) => {
        notesDatabase.toggleTaskCompletion(date, eventId);
        renderPendingTasksReport(); // Actualizar reporte
        renderCalendar();
        showDayEvents(date); // Actualiza si estoy en ese dia
    };

    function renderPendingTasksReport() {
        const pendingTasks = notesDatabase.getPendingTasks();
        let tasksHTML = '<ul>';

        if (pendingTasks.length > 0) {
            pendingTasks.forEach(task => {
                const completedCheckbox = `<input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleCompletion('${task.date}', ${task.id}, this)">`;
                tasksHTML += `<li class="${task.completed ? 'completed-task' : ''}">${completedCheckbox} ${task.title} - ${task.date} ${task.time ? `(${task.time})` : ''}</li>`;
            });
        } else {
            tasksHTML += '<li>No hay tareas pendientes.</li>';
        }

        tasksHTML += '</ul>';
        pendingTasksList.innerHTML = tasksHTML;
    }

    function generatePendingTasksPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

      // Título del reporte
        doc.setFontSize(20);
        doc.text('Reporte de Tareas Pendientes', 15, 15);

      // Obtener las tareas pendientes
        const pendingTasks = notesDatabase.getPendingTasks();

      // Si hay tareas, generar la tabla; si no, mostrar un mensaje.
        if (pendingTasks.length > 0) {
          // Preparar los datos para la tabla
          const tableData = pendingTasks.map(task => [
            task.date,
            task.time || 'N/A',
            task.title,
            task.description || 'Sin descripción',
            task.completed ? 'Sí' : 'No'
          ]);

        // Definir las cabeceras de la tabla
        const headers = [['Fecha', 'Hora', 'Título', 'Descripción', 'Completado']];
         // Crear la tabla usando jspdf-autotable
          doc.autoTable({
            head: headers,
            body: tableData,
            startY: 25, //  Posición vertical
            theme: 'grid', //  Estilo
            styles: {
                fontSize: 10,
                cellPadding: 2,
                overflow: 'linebreak', //  Manejar texto largo
                halign: 'left', //  Alineación horizontal
            },
            columnStyles: { //  Estilos por columna
                0: { cellWidth: 20 }, // Fecha
                1: { cellWidth: 15 }, // Hora
                2: { cellWidth: 40 }, // Título
                // 3: {cellWidth: 'auto'},  // Descripción (ancho automático)
            }
          });
        } else {
          // Si no hay tareas pendientes, mostrar un mensaje
          doc.setFontSize(12);
          doc.text('No hay tareas pendientes.', 15, 25);
        }

        // Guardar el PDF
        doc.save('tareas-pendientes.pdf');
    }

    // --- Event Listeners (Navegación y Modal) ---

    prevWeekButton.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 7);
        renderCalendar();
    });

    nextWeekButton.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 7);
        renderCalendar();
    });

    // *SOLO* muestra el modal al hacer clic en "Agregar Evento"
    addEventButton.addEventListener('click', () => {
        addEventForm.reset();
        modalTitle.textContent = 'Agregar Evento';
        saveEventButton.innerHTML = '<i class="fas fa-save"></i> Guardar';
        editingEventId = null;
        eventIdInput.value = '';
        modal.style.display = 'flex'; // Mostrar el modal
    });

    closeButton.addEventListener('click', () => modal.style.display = 'none');

    // --- Event Listener (Formulario) ---
    addEventForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = parseInt(eventIdInput.value) || Date.now();
        const title = document.getElementById('event-title').value;
        const date = document.getElementById('event-date').value;
        const time = document.getElementById('event-time').value;
        const description = document.getElementById('event-description').value;
        const note = document.getElementById('event-note').value;
        const type = document.getElementById('event-type').value;

        const eventData = {
            id,
            title,
            date,
            time,
            description,
            note,
            type,
            completed: false,
            alertShown: false, // Inicialmente, no mostrada
            alertCount: 0 // Contador de alertas mostradas
        };

        if (editingEventId) {
            notesDatabase.updateNote(date, editingEventId, eventData);
              editingEventId = null;
              modalTitle.textContent = 'Agregar Evento';//Resetear
              saveEventButton.innerHTML = '<i class="fas fa-save"></i> Guardar';//Resetear
              eventIdInput.value = '';//Limpiar
        } else {
            notesDatabase.addNote(date, eventData);
        }

        renderCalendar();
        renderPendingTasksReport();
        modal.style.display = 'none'; // *SIEMPRE* ocultar después de guardar/actualizar
        addEventForm.reset();
        //Quitamos esto showDayEvents(date);

        eventDetailsContent.innerHTML += '<p style="color: green;">Evento guardado/actualizado con éxito!</p>';
    });

    // --- Event Listener (Búsqueda) ---
     searchInput.addEventListener('input', () => {
        const query = searchInput.value;
        const searchResults = notesDatabase.searchNotes(query);

        if(searchResults.length > 0 && query !== ''){
            let resultsHTML = searchResults.map(event => `
              <h3>${event.title}</h3>
                <p>Fecha: ${event.date}</p>
                <p>Hora: ${event.time || 'N/A'}</p>
                <p>Descripción: ${event.description || 'Sin descripción'}</p>
                <p>Nota: ${event.note || 'Sin nota'}</p>
                <p>Tipo: ${event.type}</p>
              <button onclick="deleteEvent('${event.date}', ${event.id})"><i class="fas fa-trash"></i> Eliminar</button>
          `).join('');
          eventDetailsContent.innerHTML = resultsHTML;

        } else if (query !== '') {
          eventDetailsContent.innerHTML = '<p>No se encontraron resultados.</p>';
        }
        else{
          eventDetailsContent.innerHTML = '';
          renderCalendar();
        }
    });
       // --- Event Listeners (Filtro por Rango) ---
    filterButton.addEventListener('click', () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (startDate && endDate) {
            const filteredEvents = notesDatabase.filterNotesByDateRange(startDate, endDate);
              if(filteredEvents.length > 0){
                let filteredHTML = filteredEvents.map(event => `
                    <h3>${event.title}</h3>
                    <p>Fecha: ${event.date}</p>
                    <p>Hora: ${event.time || 'N/A'}</p>
                    <p>Descripción: ${event.description || 'Sin descripción'}</p>
                    <p>Nota: ${event.note || 'Sin Nota'}</p>
                    <p>Tipo: ${event.type}</p>
                    <button onclick="deleteEvent('${event.date}', ${event.id})"><i class="fas fa-trash"></i> Eliminar</button>
              `).join('');
              eventDetailsContent.innerHTML = filteredHTML;

            } else {
                eventDetailsContent.innerHTML = '<p>No hay eventos en este rango de fechas.</p>';
            }
        } else {
            alert('Por favor, selecciona ambas fechas.');
        }
    });

    resetFilterButton.addEventListener('click', () => {
        startDateInput.value = '';
        endDateInput.value = '';
        eventDetailsContent.innerHTML = '';
        renderCalendar();
    });

    window.deleteEvent = (date, eventId) => {
      if(notesDatabase.deleteNote(date, eventId)){
        renderCalendar();
        renderPendingTasksReport();
        showDayEvents(date); //Para que se vean los cambios
        eventDetailsContent.innerHTML += '<p style="color: red;">Evento eliminado.</p>';
      }
    }

    // --- Funciones para las Alertas (MEJORADAS) ---
    function checkAlerts() {
        const now = new Date();

        for (const date in events) {
            for (const event of events[date]) {
                const eventDateTime = new Date(`${event.date}T${event.time || '00:00'}`);
                const timeDiff = eventDateTime.getTime() - now.getTime();

                // Inicializar propiedades de alertas si no existen
                if (event.alertCount === undefined) {
                    event.alertCount = 0;
                }

                // Reiniciar alertShown para eventos futuros que aún no han ocurrido
                if (event.alertShown && timeDiff > 0) {
                    event.alertShown = false;
                }

                // Mostrar alertas para eventos que ocurrirán dentro de 10 minutos
                if (!event.alertShown && timeDiff > 0 && timeDiff <= (10 * 60 * 1000)) {
                    showAlert(event, false); // false = no es evento vencido
                    event.alertCount++;

                    // Marcar como mostrada después de 3 alertas
                    if (event.alertCount >= 3) {
                        event.alertShown = true;
                    }
                    notesDatabase.saveNotes();
                }
                // Mostrar alertas para eventos pasados (no mostrados previamente)
                else if (!event.alertShown && timeDiff <= 0) {
                    showAlert(event, true); // true = es evento vencido
                    event.alertShown = true;
                    notesDatabase.saveNotes();
                }
            }
        }
    }

    function showAlert(event, isPastEvent) {
        // Personalizar el mensaje según si es pasado o futuro
        if (isPastEvent) {
            alertMessage.textContent = `EVENTO VENCIDO: ${event.title} - ${event.description || ''}`;
            alertMessage.style.color = 'red'; // Color para eventos vencidos
        } else {
            const eventDateTime = new Date(`${event.date}T${event.time || '00:00'}`);
            const now = new Date();
            const minutesRemaining = Math.floor((eventDateTime - now) / (60 * 1000));

            alertMessage.textContent = `PRÓXIMO EVENTO (en ${minutesRemaining} min): ${event.title} - ${event.description || ''}`;
            alertMessage.style.color = 'black'; // Color normal para eventos próximos
        }

        alertModal.style.display = 'flex'; // Mostrar modal
        playGentleAlert(); // Reproducir sonido suave

        // Programar cierre automático después de 30 segundos
        setTimeout(() => {
            if (alertModal.style.display === 'flex') {
                alertModal.style.display = 'none';
                stopAlert();
            }
        }, 30000);
    }

    function playGentleAlert() {
        // Configurar el sonido para que sea más suave
        alertSound.volume = 0.3; // Volumen reducido (30%)
        alertSound.play();

        // Reproducir solo por 2 segundos
        setTimeout(() => {
            alertSound.pause();
            alertSound.currentTime = 0;
        }, 2000);
    }

    function stopAlert() {
        alertSound.pause();
        alertSound.currentTime = 0;
    }

    // --- Inicialización ---
    // Asegurarse que los modales estén ocultos al inicio
    modal.style.display = 'none';
    alertModal.style.display = 'none';

    // Asegurar que existe el elemento de audio
    if (!document.getElementById('alert-sound')) {
        const audioElement = document.createElement('audio');
        audioElement.id = 'alert-sound';
        audioElement.src = 'audio2.mp3'; // Asegúrate de que la ruta sea correcta
        audioElement.preload = 'auto';
        document.body.appendChild(audioElement);
    }

    // Cerrar alerta al hacer clic en el botón
    alertCloseButton.addEventListener('click', () => {
        alertModal.style.display = 'none';
        stopAlert();
    });

    
    renderCalendar();
    renderPendingTasksReport();

    // ACTUALIZADO: Verificar alertas con mayor frecuencia
    checkAlerts(); // Verificación inmediata al cargar
    alertIntervalId = setInterval(checkAlerts, 20000); // Verificación cada 20 segundos

    // Listener para generar PDF
    generatePdfButton.addEventListener('click', generatePendingTasksPDF);
});
