// ======================= APPLICATION INITIALIZATION =======================
/**
 * Main application initialization
 */
function initializeApp() {
    document.addEventListener('DOMContentLoaded', async () => {
        
        // Initialize components
        await loadAllComponents() 
        
        // Initialize state
        currentLang = localStorage.getItem('lang') || 'fa';
        currentCalendar = localStorage.getItem('calendarType') || 'persian';
        
        // Load language and setup
        await loadLanguage(currentLang);
        document.body.setAttribute('data-calendar', currentCalendar);
        
        // Initialize manifest based on language
        updateManifest();
        
        // Restore calendar state
        if (currentCalendar === 'persian') {
            currentPersianDate = gregorianToPersian(currentDate);
        } else {
            currentDate = persianToGregorian(currentPersianDate);
        }
        
        // Restore theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        // Setup all functionality
        setupEventListeners();
        initializePWA();
        registerServiceWorker();
        initializeSettingsModal();
        setupSettingsHandlers();

        // Initialize calendar
        initCalendar();
        
        // Show today's events
        const todayKey = currentCalendar === 'persian' 
            ? getDateKey(currentPersianDate.year, currentPersianDate.month, currentPersianDate.day)
            : getDateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());

        dailyEventsCard(todayKey);
        
        // Hide PWA prompt if in standalone mode
        if (window.matchMedia('(display-mode: standalone').matches) {
            pwaInstallPrompt.style.display = 'none';
        }
        
        // Initialize mobile menu
        new MobileMenu();
    });
}

// ======================= BASE URL CONFIG =======================
const BASE_PATH = window.location.pathname.includes('/roozegaar-calendar') 
    ? '/roozegaar-calendar' 
    : '';

// ======================= STATE MANAGEMENT =======================
let events = JSON.parse(localStorage.getItem('calendarEvents')) || {};
let currentCalendar = localStorage.getItem('calendarType') || 'persian';
let currentDate = new Date();
let currentPersianDate = gregorianToPersian(currentDate);
let currentLang = localStorage.getItem('lang') || 'fa';
let showSecondaryCalendar = localStorage.getItem('showSecondaryCalendar') !== 'false';
let langData = {};
let deferredPrompt;
let clickTimer;
const longPressDuration = 500;
let selectedDayElement = null;

// ======================= DOM ELEMENTS =======================
const themeToggle = document.getElementById('themeToggle');
const langToggle = document.getElementById('langToggle');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navMenu = document.getElementById('navMenu');
const prevYearBtn = document.getElementById('prevYear');
const prevMonthBtn = document.getElementById('prevMonth');
const todayBtn = document.getElementById('todayBtn');
const nextMonthBtn = document.getElementById('nextMonth');
const nextYearBtn = document.getElementById('nextYear');
const currentMonthYear = document.getElementById('currentMonthYear');
const weekdays = document.getElementById('weekdays');
const daysGrid = document.getElementById('daysGrid');
const eventModal = document.getElementById('eventModal');
const closeModal = document.getElementById('closeModal');
const eventForm = document.getElementById('eventForm');
const eventTitleLabel = document.getElementById('eventTitleLabel');
const eventDateLabel = document.getElementById('eventDateLabel');
const eventDate = document.getElementById('eventDate');
const eventDescriptionLabel = document.getElementById('eventDescriptionLabel'); 
const eventDescription = document.getElementById('eventDescription');
const submitEvent = document.getElementById('submitEvent');
const cancelEvent = document.getElementById('cancelEvent');
const eventsList = document.getElementById('eventsList');
const modalTitle = document.getElementById('modalTitle');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsModal = document.getElementById('closeSettingsModal');
const calendarTypeSelect = document.getElementById('calendarTypeSelect');
const themeToggleSettings = document.getElementById('themeToggleSettings');
const langToggleSettings = document.getElementById('langToggleSettings');
const themeSelect = document.getElementById('themeSelect');
const langSelect = document.getElementById('langSelect');
const secondaryCalendarToggle = document.getElementById('secondaryCalendarToggle');
const pwaInstallPrompt = document.getElementById('pwaInstallPrompt');
const pwaPromptTitle = document.getElementById('pwaPromptTitle');
const pwaPromptSubtitle = document.getElementById('pwaPromptSubtitle');
const pwaDismissBtn = document.getElementById('pwaDismissBtn');
const pwaInstallBtn = document.getElementById('pwaInstallBtn');

// ======================= Components =======================
async function loadAllComponents() {
	const components = [];

	if (document.getElementById('header'))
		components.push({ id: 'header', url: `${BASE_PATH}/assets/components/header.html` });

	if (document.getElementById('footer')) 
		components.push({ id: 'footer', url: `${BASE_PATH}/assets/components/footer.html` });
	
	for (const c of components) {
		await loadComponent(c.id, c.url);
    }
}

function loadComponent(id, url) {
    return fetch(url)
        .then(res => res.text())
        .then(html => {
            document.getElementById(id).innerHTML = html;
        });
}

// ======================= EVENT LISTENERS SETUP =======================
/**
 * Sets up all event listeners
 */
function setupEventListeners() {
    setupMobileMenu();
    setupCalendarNavigation();
    setupEventModal();
    setupThemeAndLanguageToggles();
}

/**
 * Sets up mobile menu functionality
 */
function setupMobileMenu() {
    // Use event delegation instead of direct event listeners
    document.addEventListener('click', (e) => {
        if (e.target.closest('#mobileMenuBtn')) {
            toggleMobileMenu();
        }
    });
}

/**
 * Sets up calendar navigation controls
 */
function setupCalendarNavigation() {
    prevYearBtn.addEventListener('click', () => navigateCalendar('prevYear'));
    prevMonthBtn.addEventListener('click', () => navigateCalendar('prevMonth'));
    todayBtn.addEventListener('click', () => navigateCalendar('today'));
    nextMonthBtn.addEventListener('click', () => navigateCalendar('nextMonth'));
    nextYearBtn.addEventListener('click', () => navigateCalendar('nextYear'));
}

/**
 * Sets up event modal functionality
 */
function setupEventModal() {
    closeModal.addEventListener('click', closeEventModal);
    cancelEvent.addEventListener('click', closeEventModal);
    eventForm.addEventListener('submit', saveEvent);
    
    eventModal.addEventListener('click', function(e) {
        if (e.target === eventModal) {
            closeEventModal();
        }
    });
}

/**
 * Sets up theme and language toggle buttons
 */
function setupThemeAndLanguageToggles() {
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (langToggle) langToggle.addEventListener('click', toggleLanguage);
}

// ======================= MANIFEST MANAGEMENT =======================
/**
 * Updates PWA manifest based on current language
 */
function updateManifest() {
    // Remove existing manifest if any
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) {
        document.head.removeChild(existingManifest);
    }
    
    // Create new manifest with current language
    const lang = localStorage.getItem("lang") || (navigator.language.startsWith("fa") ? "fa" : "en");
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = `${BASE_PATH}/assets/data/manifest-${lang}.json`;
    document.head.appendChild(manifest);
    
    console.log(`Manifest updated to: manifest-${lang}.json`);
}

// ======================= MOBILE MENU =======================
/**
 * Mobile menu functionality
 */
class MobileMenu {
    constructor() {
        this.menuBtn = document.getElementById('mobileMenuBtn');
        this.navMenu = document.querySelector('nav');
        this.navOverlay = document.getElementById('navOverlay');
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        this.menuBtn.addEventListener('click', () => this.toggleMenu());
        if (this.navOverlay) {
            this.navOverlay.addEventListener('click', () => this.closeMenu());
        }
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });
        
        // Close menu on resize to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isOpen) {
                this.closeMenu();
            }
        });
    }
    
    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    openMenu() {
        this.navMenu.classList.add('active');
        if (this.navOverlay) this.navOverlay.classList.add('active');
        this.menuBtn.setAttribute('aria-expanded', 'true');
        this.menuBtn.innerHTML = '<i class="fas fa-times"></i>';
        this.isOpen = true;
        
        // Trap focus inside menu
        this.trapFocus();
    }
    
    closeMenu() {
        this.navMenu.classList.remove('active');
        if (this.navOverlay) this.navOverlay.classList.remove('active');
        this.menuBtn.setAttribute('aria-expanded', 'false');
        this.menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        this.isOpen = false;
    }
    
    trapFocus() {
        const focusableElements = this.navMenu.querySelectorAll(
            'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }
}

// ======================= CALENDAR CORE FUNCTIONS =======================
/**
 * Initializes calendar display
 */
function initCalendar() {
    restoreCalendarState();
    updateCalendarHeader();
    renderWeekdays();
    renderDays();
    calendarCards();
    highlightToday();
}

/**
 * Restores calendar state from localStorage
 */
function restoreCalendarState() {
    const savedCalendarType = localStorage.getItem('calendarType');
    if (savedCalendarType) {
        currentCalendar = savedCalendarType;
    }
    
    // Restore secondary calendar preference
    const savedSecondaryCalendar = localStorage.getItem('showSecondaryCalendar');
    if (savedSecondaryCalendar !== null) {
        showSecondaryCalendar = savedSecondaryCalendar === 'true';
    }
    
    if (currentCalendar === 'persian') {
        currentPersianDate = gregorianToPersian(currentDate);
    } else {
        currentDate = persianToGregorian(currentPersianDate);
    }
}

/**
 * Updates calendar header with current month and year
 */
function updateCalendarHeader() {
    if (currentCalendar === 'persian') {
        currentMonthYear.textContent = `${langData.months.fa[currentPersianDate.month - 1]} ${currentPersianDate.year}`;
    } else {
        currentMonthYear.textContent = `${langData.months.en[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
}

/**
 * Renders weekday headers
 */
function renderWeekdays() {
    weekdays.innerHTML = '';
    let days = currentCalendar === 'persian' ? langData.weekdays.fa : langData.weekdays.en;

    days.forEach(d => {
        const div = document.createElement('div');
        div.textContent = d;
        weekdays.appendChild(div);
    });
}

// ======================= CALENDAR RENDERING =======================
/**
 * Renders calendar days grid
 */
function renderDays() {
    daysGrid.innerHTML = '';
    
    let firstDay, daysInMonth, currentMonth, currentYear;
    
    if (currentCalendar === 'persian') {
        currentMonth = currentPersianDate.month;
        currentYear = currentPersianDate.year;
        firstDay = getFirstDayOfPersianMonth(currentYear, currentMonth);
        daysInMonth = getDaysInPersianMonth(currentYear, currentMonth);
    } else {
        currentMonth = currentDate.getMonth();
        currentYear = currentDate.getFullYear();
        firstDay = new Date(currentYear, currentMonth, 1).getDay();
        daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    }
    
    renderEmptyDays(firstDay);
    renderMonthDays(currentYear, currentMonth, daysInMonth);
}

/**
 * Renders empty days at the start of the month
 * @param {number} count - Number of empty days to render
 */
function renderEmptyDays(count) {
    for (let i = 0; i < count; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('day', 'other-month');
        daysGrid.appendChild(emptyDay);
    }
}

/**
 * Renders days of the current month
 * @param {number} year - Current year
 * @param {number} month - Current month
 * @param {number} daysInMonth - Number of days in the month
 */
function renderMonthDays(year, month, daysInMonth) {
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = createDayElement(year, month, day);
        setupDayEventListeners(dayElement, year, month, day);
        daysGrid.appendChild(dayElement);
    }
}

/**
 * Creates a day element for the calendar grid
 * @param {number} year - Year
 * @param {number} month - Month
 * @param {number} day - Day
 * @returns {HTMLElement} Day element
 */
function createDayElement(year, month, day) {
    const dayElement = document.createElement('div');
    dayElement.classList.add('day');
    
    const dateKey = getDateKey(year, month, day);
    
    // Add has-event class if there is an event
    if (events[dateKey] && events[dateKey].length > 0) {
        dayElement.classList.add('has-event');
    }

    const primaryDate = document.createElement('div');
    primaryDate.classList.add('primary-date');
    primaryDate.textContent = day;
    dayElement.appendChild(primaryDate);

    // Only show secondary date if enabled
    if (showSecondaryCalendar) {
        const secondaryDate = document.createElement('div');
        secondaryDate.classList.add('secondary-date');
        
        if (currentCalendar === 'persian') {
            const gregDate = persianToGregorian({year: year, month: month, day});
            secondaryDate.textContent = gregDate.getDate();
        } else {
            const persDate = gregorianToPersian(new Date(year, month, day));
            secondaryDate.textContent = persDate.day;
        }
        dayElement.appendChild(secondaryDate);
    }

    addEventIndicator(dayElement, dateKey);

    return dayElement;
}

/**
 * Adds event indicator to day element if events exist
 * @param {HTMLElement} dayElement - Day element
 * @param {string} dateKey - Date key for events lookup
 */
function addEventIndicator(dayElement, dateKey) {
    if (events[dateKey] && events[dateKey].length > 0) {
        const indicator = document.createElement('div');
        indicator.classList.add('event-indicator');
        
        // Set color based on calendar type and theme
        const isDarkTheme = document.documentElement.hasAttribute('data-theme');
        
        if (currentCalendar === 'persian') {
            indicator.style.backgroundColor = isDarkTheme ? '#ff6b6b' : '#e74c3c';
        } else {
            indicator.style.backgroundColor = isDarkTheme ? '#3498db' : '#2980b9';
        }
        
        indicator.style.width = '6px';
        indicator.style.height = '6px';
        indicator.style.borderRadius = '50%';
        indicator.style.marginTop = '5px';
        indicator.style.zIndex = '2';
        
        dayElement.appendChild(indicator);
    }
}

/**
 * Sets up event listeners for day element
 * @param {HTMLElement} dayElement - Day element
 * @param {number} year - Year
 * @param {number} month - Month
 * @param {number} day - Day
 */
function setupDayEventListeners(dayElement, year, month, day) {
    // Long press for event creation
    dayElement.addEventListener('mousedown', (e) => startLongPress(e, year, month, day));
    dayElement.addEventListener('touchstart', (e) => startLongPress(e, year, month, day));

    dayElement.addEventListener('mouseup', cancelLongPress);
    dayElement.addEventListener('mouseleave', cancelLongPress);
    dayElement.addEventListener('touchend', cancelLongPress);

    // Click for selection
    dayElement.addEventListener('click', () => handleDayClick(dayElement, year, month, day));
}

// ======================= CALENDAR NAVIGATION =======================
/**
 * Navigates calendar based on direction
 * @param {string} direction - Navigation direction
 */
function navigateCalendar(direction) {
    if (direction === 'today') {
        handleTodayButton();
        return;
    }
    
    if (currentCalendar === 'persian') {
        navigatePersianCalendar(direction);
    } else {
        navigateGregorianCalendar(direction);
    }
    
    updateCalendarHeader();
    renderDays();
    
    // Update calendar cards to keep them in sync
    calendarCards();
    
    // Highlight today if we're in the current month
    setTimeout(() => {
        highlightToday();
    }, 100);
}

/**
 * Navigates Persian calendar
 * @param {string} direction - Navigation direction
 */
function navigatePersianCalendar(direction) {
    switch(direction) {
        case 'prevYear':
            currentPersianDate.year--;
            break;
        case 'prevMonth':
            currentPersianDate.month--;
            if (currentPersianDate.month < 1) {
                currentPersianDate.month = 12;
                currentPersianDate.year--;
            }
            break;
        case 'nextMonth':
            currentPersianDate.month++;
            if (currentPersianDate.month > 12) {
                currentPersianDate.month = 1;
                currentPersianDate.year++;
            }
            break;
        case 'nextYear':
            currentPersianDate.year++;
            break;
    }
    currentDate = persianToGregorian(currentPersianDate);
}

/**
 * Navigates Gregorian calendar
 * @param {string} direction - Navigation direction
 */
function navigateGregorianCalendar(direction) {
    switch(direction) {
        case 'prevYear':
            currentDate.setFullYear(currentDate.getFullYear() - 1);
            break;
        case 'prevMonth':
            currentDate.setMonth(currentDate.getMonth() - 1);
            break;
        case 'nextMonth':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
        case 'nextYear':
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
    }
    currentPersianDate = gregorianToPersian(currentDate);
}

/**
 * Handles today button click
 */
function handleTodayButton() {
    const today = new Date();
    
    // Always update both calendar systems
    if (currentCalendar === 'persian') {
        currentPersianDate = gregorianToPersian(today);
        currentDate = today;
    } else {
        currentDate = today;
        currentPersianDate = gregorianToPersian(today);
    }
    
    // Update UI based on current calendar type
    updateCalendarHeader();
    renderDays();
    calendarCards();
    
    // Update events list for today based on current calendar
    const todayKey = currentCalendar === 'persian' 
        ? getDateKey(currentPersianDate.year, currentPersianDate.month, currentPersianDate.day)
        : getDateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
    
    dailyEventsCard(todayKey);
    
    // Highlight today with a small delay to ensure DOM is updated
    setTimeout(() => {
        highlightToday();
    }, 100);
}

/**
 * Highlights today's date in the calendar
 */
function highlightToday() {
    // Clear previous selection
    const previouslySelected = daysGrid.querySelector('.day.selected');
    if (previouslySelected) {
        previouslySelected.classList.remove('selected');
    }
    
    const now = new Date();
    let todayPersian, todayKey, targetDay, currentMonth, currentYear;
    
    // Determine target day and current view based on calendar type
    if (currentCalendar === 'persian') {
        todayPersian = gregorianToPersian(now);
        todayKey = getDateKey(todayPersian.year, todayPersian.month, todayPersian.day);
        targetDay = todayPersian.day;
        currentMonth = currentPersianDate.month;
        currentYear = currentPersianDate.year;
    } else {
        todayKey = getDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
        targetDay = now.getDate();
        currentMonth = currentDate.getMonth() + 1;
        currentYear = currentDate.getFullYear();
    }
    
    // Only highlight if we're in the current month
    const isCurrentMonth = (currentCalendar === 'persian') ? 
        (currentPersianDate.year === todayPersian.year && currentPersianDate.month === todayPersian.month) :
        (currentDate.getFullYear() === now.getFullYear() && (currentDate.getMonth() + 1) === (now.getMonth() + 1));
    
    if (isCurrentMonth) {
        // Find today's element in the current view
        const dayElements = daysGrid.querySelectorAll('.day');
        let todayElement = null;
        
        dayElements.forEach(dayElement => {
            const primaryDate = dayElement.querySelector('.primary-date');
            if (primaryDate && parseInt(primaryDate.textContent) === targetDay) {
                // Additional check to ensure it's the correct month and not from other month
                if (!dayElement.classList.contains('other-month')) {
                    todayElement = dayElement;
                }
            }
        });
        
        if (todayElement) {
            todayElement.classList.add('selected');
            selectedDayElement = todayElement;
            
            // Scroll to today element if needed
            todayElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    // Update events display
    dailyEventsCard(todayKey);
}

// ======================= EVENT MANAGEMENT =======================
/**
 * Starts long press timer for event creation
 * @param {Event} e - Event object
 * @param {number} year - Year
 * @param {number} month - Month
 * @param {number} day - Day
 */
function startLongPress(e, year, month, day) {
    e.preventDefault();
    clickTimer = setTimeout(() => {
        openEventModal(year, month, day);
    }, longPressDuration);
}

/**
 * Cancels long press timer
 */
function cancelLongPress() {
    clearTimeout(clickTimer);
}

/**
 * Handles day click for selection
 * @param {HTMLElement} dayElement - Clicked day element
 * @param {number} year - Year
 * @param {number} month - Month
 * @param {number} day - Day
 */
function handleDayClick(dayElement, year, month, day) {
    // Clear previous selection
    if (selectedDayElement) {
        selectedDayElement.classList.remove('selected');
    }
    
    // Set new selection
    dayElement.classList.add('selected');
    selectedDayElement = dayElement;

    const dateKey = getDateKey(year, month, day);
    
    // Update calendar cards with the selected date
    updateCalendarCards(dateKey);
    
    // Update events display
    dailyEventsCard(dateKey);
    
    // Also update the events list in modal if it's open
    if (eventModal.style.display === 'flex') {
        updateEventsList(dateKey);
    }
}

/**
 * Opens event modal for adding new event
 * @param {number} year - Year
 * @param {number} month - Month
 * @param {number} day - Day
 */
function openEventModal(year, month, day) {
    const dateKey = getDateKey(year, month, day);
    
    // Update date display
    if (currentCalendar === 'persian') {
        eventDate.value = `${year}/${month}/${day} (${langData.months.fa[month-1]})`;
    } else {
        eventDate.value = `${langData.months.en[month]} ${day}, ${year}`;
    }
    
    modalTitle.textContent = langData.ui.addEvent;
    eventTitle.value = '';
    eventDescription.value = '';
    
    eventForm.dataset.dateKey = dateKey;
    
    // Update events list for this date
    updateEventsList(dateKey);
    
    // Also update daily events card
    dailyEventsCard(dateKey);
    
    eventModal.style.display = 'flex';
}

/**
 * Closes event modal
 */
function closeEventModal() {
    eventModal.style.display = 'none';
}

/**
 * Saves new event to storage
 * @param {Event} e - Form submit event
 */
function saveEvent(e) {
    e.preventDefault();
    
    const dateKey = eventForm.dataset.dateKey;
    const title = eventTitle.value.trim();
    const description = eventDescription.value.trim();
    
    if (!title) {
        alert(langData.ui.enterEventTitle || 'لطفا عنوان رویداد را وارد کنید');
        return;
    }
    
    if (!events[dateKey]) {
        events[dateKey] = [];
    }
    
    events[dateKey].push({
        title: title,
        description: description,
        id: Date.now().toString()
    });
    
    localStorage.setItem('calendarEvents', JSON.stringify(events));
    
    // Update all displays
    dailyEventsCard(dateKey);
    updateEventsList(dateKey);
    renderDays(); // Update calendar dots
    
    // Reset form but keep modal open for adding more events
    eventTitle.value = '';
    eventDescription.value = '';
    eventTitle.focus();
}

/**
 * Updates events list for selected date in the modal
 * @param {string} dateKey - Date key for events lookup
 */
function updateEventsList(dateKey = null) {
    const eventsListContainer = document.getElementById('eventsList');
    if (!eventsListContainer) return;
    
    eventsListContainer.innerHTML = '';
    
    if (!dateKey) {
        showNoEventsMessage(eventsListContainer);
        return;
    }
    
    if (!events[dateKey] || events[dateKey].length === 0) {
        showNoEventsMessage(eventsListContainer);
        return;
    }
    
    // Render events in the modal
    renderEvents(eventsListContainer, dateKey);
}

/**
 * Shows no events message in container
 * @param {HTMLElement} container - Container element
 */
function showNoEventsMessage(container) {
    const noEvents = document.createElement('div');
    noEvents.textContent = langData.ui.noEvents;
    noEvents.style.textAlign = 'center';
    noEvents.style.padding = '10px';
    noEvents.style.opacity = '0.7';
    container.appendChild(noEvents);
}

/**
 * Renders events in container for specified date
 * @param {HTMLElement} container - Container element
 * @param {string} dateKey - Date key for events lookup
 */
function renderEvents(container, dateKey) {
    events[dateKey].forEach(event => {
        const eventItem = createEventItem(event, dateKey);
        container.appendChild(eventItem);
    });
}

/**
 * Creates event item element
 * @param {Object} event - Event object
 * @param {string} dateKey - Date key
 * @returns {HTMLElement} Event item element
 */
function createEventItem(event, dateKey) {
    const eventItem = document.createElement('div');
    eventItem.classList.add('event-item');
    eventItem.style.display = 'flex';
    eventItem.style.justifyContent = 'space-between';
    eventItem.style.alignItems = 'center';
    eventItem.style.padding = '8px';
    eventItem.style.borderBottom = '1px solid #eee';
    
    const eventInfo = document.createElement('div');
    eventInfo.innerHTML = `<strong>${event.title}</strong>`;
    if (event.description) {
        eventInfo.innerHTML += `<br><small style="color: #666;">${event.description}</small>`;
    }
    
    const eventActions = document.createElement('div');
    eventActions.classList.add('event-actions');
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = langData.ui.delete || 'حذف';
    deleteBtn.style.background = '#ff4444';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.padding = '4px 8px';
    deleteBtn.style.borderRadius = '4px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteEvent(dateKey, event.id);
    });
    
    eventActions.appendChild(deleteBtn);
    eventItem.appendChild(eventInfo);
    eventItem.appendChild(eventActions);
    
    return eventItem;
}

/**
 * Deletes event from storage
 * @param {string} dateKey - Date key
 * @param {string} eventId - Event ID
 */
function deleteEvent(dateKey, eventId) {
    if (events[dateKey]) {
        events[dateKey] = events[dateKey].filter(event => event.id !== eventId);
        
        if (events[dateKey].length === 0) {
            delete events[dateKey];
        }
        
        localStorage.setItem('calendarEvents', JSON.stringify(events));

        // Refresh all displays
        dailyEventsCard(dateKey);
        updateEventsList(dateKey);
        renderDays();
        
        // Show confirmation message
        showToast(langData.ui.eventDeleted || 'رویداد با موفقیت حذف شد');
    }
}

// ======================= CALENDAR CARDS & EVENTS DISPLAY =======================
/**
 * Updates calendar cards with current date
 * @param {string} dateKey - Date key for events lookup
 */
function updateCalendarCards(dateKey = null) {
    if (!dateKey) {
        // If no dateKey provided, use current date
        if (currentCalendar === 'persian') {
            dateKey = getDateKey(currentPersianDate.year, currentPersianDate.month, currentPersianDate.day);
        } else {
            dateKey = getDateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
        }
    }
    
    // Parse dateKey to get year, month, day
    const [year, month, day] = dateKey.split('-').map(Number);
    
    // Update both calendar systems
    if (currentCalendar === 'persian') {
        currentPersianDate = { year, month, day };
        currentDate = persianToGregorian(currentPersianDate);
    } else {
        currentDate = new Date(year, month - 1, day);
        currentPersianDate = gregorianToPersian(currentDate);
    }
    
    calendarCards();
}

/**
 * Renders calendar cards with current dates
 */
function calendarCards() {
    updatePersianCard();
    updateGregorianCard();
}

/**
 * Updates Persian calendar card
 */
function updatePersianCard() {
    const persianDay = document.getElementById('persianDay');
    const persianMonth = document.getElementById('persianMonth');
    const persianFullDate = document.getElementById('persianFullDate');
    
    if (persianDay && persianMonth && persianFullDate) {
        persianDay.textContent = currentPersianDate.day;
        persianMonth.textContent = langData.months.fa[currentPersianDate.month - 1];
        persianFullDate.textContent = `${currentPersianDate.year}/${String(currentPersianDate.month).padStart(2,'0')}/${String(currentPersianDate.day).padStart(2,'0')}`;
    }
}

/**
 * Updates Gregorian calendar card
 */
function updateGregorianCard() {
    const gregorianDay = document.getElementById('gregorianDay');
    const gregorianMonth = document.getElementById('gregorianMonth');
    const gregorianFullDate = document.getElementById('gregorianFullDate');
    
    if (gregorianDay && gregorianMonth && gregorianFullDate) {
        const gDate = persianToGregorian(currentPersianDate);
        gregorianDay.textContent = gDate.getDate();
        gregorianMonth.textContent = langData.months.en[gDate.getMonth()];
        gregorianFullDate.textContent = `${gDate.getFullYear()}/${String(gDate.getMonth()+1).padStart(2,'0')}/${String(gDate.getDate()).padStart(2,'0')}`;
    }
}

/**
 * Updates and displays daily events for selected date
 * @param {string} dateKey - Date key for events lookup
 */
function dailyEventsCard(dateKey) {
    const container = document.getElementById('dailyEventsContainer');
    const eventsList = document.getElementById('eventsList');
    
    // Update both containers
    updateEventsContainer(container, dateKey);
    updateEventsList(dateKey);
}

/**
 * Updates events container with events for specified date
 * @param {HTMLElement} container - Container element
 * @param {string} dateKey - Date key for events lookup
 */
function updateEventsContainer(container, dateKey) {
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!events[dateKey] || events[dateKey].length === 0) {
        showNoEventsMessage(container);
        return;
    }
    
    renderEvents(container, dateKey);
}

// ======================= LANGUAGE MANAGEMENT =======================
/**
 * Loads language data and applies it to the UI
 * @param {string} lang - Language code ('fa' or 'en')
 */
async function loadLanguage(lang) {
    try {
        const res = await fetch(`${BASE_PATH}/assets/lang/${lang}.json`);
        langData = await res.json();
        localStorage.setItem('lang', lang);
        currentLang = lang;

        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
        applyLanguage();
        
        currentDate = new Date();
        currentPersianDate = gregorianToPersian(currentDate);
        
        updateCalendarHeader();
        renderWeekdays();
        updateUITexts(currentLang);
        if (calendarTypeSelect) calendarTypeSelect.value = currentCalendar;
    } catch (err) {
        console.error(`Error loading language ${lang}:`, err);
    }
}

/**
 * Applies loaded language data to UI elements
 */
function applyLanguage() {
    if (!langData.ui) return;
    
    updateNavigationText();
    updateCalendarControlsText();
    updateModalText();
    updateFooterText();
    updatePwaText();
    updateSettingsText();
    calendarCards();
    
    // Get current date key based on selected calendar
    const currentDateKey = currentCalendar === 'persian' 
        ? getDateKey(currentPersianDate.year, currentPersianDate.month, currentPersianDate.day)
        : getDateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
    
    // Update daily events card with new language
    dailyEventsCard(currentDateKey);    
}

/**
 * Updates navigation menu text based on current language
 */
function updateNavigationText() {
    document.querySelector('.logo').textContent = langData.ui.logo;

    const navItems = document.querySelectorAll('#navMenu li span');
    if (navItems[0]) navItems[0].textContent = langData.ui.home || 'Home';
    if (navItems[1]) navItems[1].textContent = langData.ui.calendar || 'Calendar';
    if (navItems[2]) navItems[2].textContent = langData.ui.settings || 'Settings';
    if (navItems[3]) navItems[3].textContent = langData.ui.about || 'About Us';
}

/**
 * Updates calendar control buttons text
 */
function updateCalendarControlsText() {
    if (prevYearBtn) prevYearBtn.title = langData.ui.prevYear;
    if (prevMonthBtn) prevMonthBtn.title = langData.ui.prevMonth;
    if (todayBtn) todayBtn.title = langData.ui.today;
    if (nextMonthBtn) nextMonthBtn.title = langData.ui.nextMonth;
    if (nextYearBtn) nextYearBtn.title = langData.ui.nextYear;
}

/**
 * Updates modal and form text
 */
function updateModalText() {
    if (modalTitle) modalTitle.textContent = langData.ui.addEvent;
    if (eventTitle) eventTitle.placeholder = langData.ui.eventTitlePlaceholder;
    if (eventDescription) eventDescription.placeholder = langData.ui.eventDescriptionPlaceholder;
    if (cancelEvent) cancelEvent.textContent = langData.ui.cancel;
    if (eventTitleLabel) eventTitleLabel.textContent = langData.ui.eventTitleLabel;
    if (eventDateLabel) eventDateLabel.textContent = langData.ui.eventDateLabel; 
    if (eventDescriptionLabel) eventDescriptionLabel.textContent = langData.ui.eventDescriptionLabel;   
    if (submitEvent) submitEvent.textContent = langData.ui.submit;      
}

/**
 * Updates Footer text based on current language and date
 */
function updateFooterText() {
    const footer = document.querySelector('.footer');
    if (!footer) return;

    // Update about section
    const aboutSection = footer.querySelector('.footer-about p');
    if (aboutSection) {
        aboutSection.textContent = langData.ui.aboutDescription || 'تقویم روزگار - ابزاری کامل برای مدیریت زمان و رویدادها به دو زبان فارسی و انگلیسی';
    }

    // Update section titles
    const sectionTitles = footer.querySelectorAll('.footer-column h3');
    if (sectionTitles.length >= 4) {
        sectionTitles[0].textContent = langData.ui.about || 'درباره';
        sectionTitles[1].textContent = langData.ui.usefulLinks || 'لینک‌های مفید';
        sectionTitles[2].textContent = langData.ui.contactUs || 'تماس با ما';
        sectionTitles[3].textContent = langData.ui.moreInfo || 'اطلاعات بیشتر';
    }

    // Update useful links
    const usefulLinks = footer.querySelectorAll('.footer-column:nth-child(2) .footer-links li a');
    if (usefulLinks.length >= 4) {
        usefulLinks[0].textContent = langData.ui.homePage || 'صفحه اصلی';
        usefulLinks[1].textContent = langData.ui.roozegaar || 'روزگار';
        usefulLinks[2].textContent = langData.ui.roozegaarCalendar || 'تقویم روزگار';
        usefulLinks[3].textContent = langData.ui.help || 'راهنما';
    }

    // Update contact info labels
    const contactEmail = footer.querySelector('.contact-info li:nth-child(1) a');
    if (contactEmail) {
        contactEmail.textContent = langData.ui.supportEmail || 'ایمیل پشتیبانی';
        contactEmail.href = `mailto:${langData.ui.supportEmailAddress || 'mahdi2006d@gmail.com'}`;
    }

    // Update more info links
    const moreInfoLinks = footer.querySelectorAll('.footer-column:nth-child(4) .footer-links li a');
    if (moreInfoLinks.length >= 5) {
        moreInfoLinks[0].textContent = langData.ui.privacyPolicy || 'حریم خصوصی';
        moreInfoLinks[1].textContent = langData.ui.termsConditions || 'قوانین و مقررات';
        moreInfoLinks[2].textContent = langData.ui.faq || 'سوالات متداول';
        moreInfoLinks[3].textContent = langData.ui.appVersions || 'نسخه‌های برنامه';
        moreInfoLinks[4].textContent = langData.ui.reportIssue || 'گزارش مشکل';
    }

    // Update copyright with dynamic date based on language
    const copyright = footer.querySelector('.footer-bottom p');
    if (copyright) {
        const currentYear = new Date().getFullYear();
        
        if (currentLang === 'fa') {
            // Convert to Jalali year for Persian
            const persianDate = gregorianToPersian(new Date());
            const jalaliYear = persianDate.year;
            copyright.textContent = `${langData.ui.copyright || 'کلیه حقوق مادی و معنوی این سایت متعلق به تقویم روزگار می‌باشد'} © ${jalaliYear}`;
        } else {
            // Use Gregorian year for English
            copyright.textContent = `${langData.ui.copyright || 'All rights reserved for Roozegaar Calendar'} © ${currentYear}`;
        }
    }

    // Update social media aria-labels
    const socialIcons = footer.querySelectorAll('.social-icons a');
    const socialLabels = [
        langData.ui.facebook || 'فیس‌بوک',
        langData.ui.twitter || 'توییتر',
        langData.ui.instagram || 'اینستاگرام',
        langData.ui.linkedin || 'لینکدین'
    ];

    socialIcons.forEach((icon, index) => {
        if (socialLabels[index]) {
            icon.setAttribute('aria-label', socialLabels[index]);
        }
    });

    // Update address based on language
    const addressElement = footer.querySelector('.contact-info li:nth-child(2) span');
    if (addressElement) {
        if (currentLang === 'fa') {
            addressElement.textContent = 'ایران';
        } else {
            addressElement.textContent = 'Iran';
        }
    }
}

/**
 * Updates Pwa text
 */
function updatePwaText() {
    if (pwaPromptTitle) pwaPromptTitle.textContent = langData.ui.pwaTitle;
    if (pwaPromptSubtitle) pwaPromptSubtitle.textContent = langData.ui.pwaSubtitle;
    if (pwaDismissBtn) {
        pwaDismissBtn.textContent = langData.ui.pwaDismiss;
        pwaDismissBtn.setAttribute('aria-label', langData.ui.pwaDismiss);
    }
    if (pwaInstallBtn) {
        pwaInstallBtn.textContent = langData.ui.pwaInstall;
        pwaInstallBtn.setAttribute('aria-label', langData.ui.pwaInstall);
    }
}

/**
 * Updates settings modal text
 */
function updateSettingsText() {
    const settingsModalTitle = document.getElementById('settingsModalTitle');
    if (settingsModalTitle) settingsModalTitle.textContent = langData.ui.settings || 'Settings';
    
    const themeLabel = document.querySelector('label[for="themeSelect"]');
    if (themeLabel) themeLabel.textContent = langData.ui.theme || 'Theme';
    
    const langLabel = document.querySelector('label[for="langSelect"]');
    if (langLabel) langLabel.textContent = langData.ui.langToggle || 'Language';
    
    const calendarLabel = document.querySelector('label[for="calendarTypeSelect"]');
    if (calendarLabel) calendarLabel.textContent = langData.ui.settingsCalendar || 'Main Calendar';
    
    const secondaryLabel = document.querySelector('label[for="secondaryCalendarToggle"]');
    if (secondaryLabel) secondaryLabel.textContent = langData.ui.showSecondaryCalendar || 'Show Secondary Calendar';

    if (themeSelect) {
        if (themeSelect.options[0]) themeSelect.options[0].text = langData.ui.light || 'Light';
        if (themeSelect.options[1]) themeSelect.options[1].text = langData.ui.dark || 'Dark';
    }
    
    if (langSelect) {
        if (langSelect.options[0]) langSelect.options[0].text = langData.ui.persian || 'Persian';
        if (langSelect.options[1]) langSelect.options[1].text = langData.ui.english || 'English';
    }
    
    if (calendarTypeSelect) {
        if (calendarTypeSelect.options[0]) calendarTypeSelect.options[0].text = langData.ui.persian || 'Persian';
        if (calendarTypeSelect.options[1]) calendarTypeSelect.options[1].text = langData.ui.gregorian || 'Gregorian';
    }
}

// ======================= SETTINGS MANAGEMENT =======================
/**
 * Initializes settings modal functionality
 */
function initializeSettingsModal() {
    const settingsNavItem = document.querySelector('#navMenu li:nth-child(3) a');
    if (settingsNavItem) {
        settingsNavItem.addEventListener('click', (e) => {
            e.preventDefault();
            if (settingsModal) settingsModal.style.display = 'flex';
            if (calendarTypeSelect) calendarTypeSelect.value = currentCalendar;
            if (secondaryCalendarToggle) secondaryCalendarToggle.checked = showSecondaryCalendar;
        });
    }

    if (closeSettingsModal) {
        closeSettingsModal.addEventListener('click', () => {
            if (settingsModal) settingsModal.style.display = 'none';
        });
    }
    
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) settingsModal.style.display = 'none';
        });
    }

    if (themeSelect) themeSelect.value = localStorage.getItem('theme') || 'light';
    if (langSelect) langSelect.value = currentLang;
}

/**
 * Sets up settings change handlers
 */
function setupSettingsHandlers() {
    if (themeSelect) themeSelect.addEventListener('change', handleThemeChange);
    if (langSelect) langSelect.addEventListener('change', handleLanguageChange);
    if (calendarTypeSelect) calendarTypeSelect.addEventListener('change', handleCalendarTypeChange);
    if (secondaryCalendarToggle) secondaryCalendarToggle.addEventListener('change', handleSecondaryCalendarToggle);
}

/**
 * Handles theme change from settings
 */
function handleThemeChange() {
    const theme = themeSelect.value;
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
    showToast(langData.ui.settingsSaved || 'تنظیمات ذخیره شد');
}

/**
 * Handles language change from settings
 */
function handleLanguageChange() {
    const lang = langSelect.value;
    loadLanguage(lang);
    showToast(langData.ui.settingsSaved || 'تنظیمات ذخیره شد');
}

/**
 * Handles calendar type change from settings
 */
function handleCalendarTypeChange(e) {
    switchCalendar(e.target.value);
    showToast(langData.ui.settingsSaved || 'تنظیمات ذخیره شد');
}

/**
 * Handles secondary calendar toggle change
 */
function handleSecondaryCalendarToggle() {
    showSecondaryCalendar = secondaryCalendarToggle.checked;
    localStorage.setItem('showSecondaryCalendar', showSecondaryCalendar);
    
    // Re-render calendar to reflect changes
    renderDays();
    showToast(langData.ui.settingsSaved || 'تنظیمات ذخیره شد');
}

/**
 * Switches between Persian and Gregorian calendars
 * @param {string} type - Calendar type ('persian' or 'gregorian')
 */
function switchCalendar(type) {
    if (currentCalendar === type) return;
    
    currentCalendar = type;    
    localStorage.setItem('calendarType', type);
    
    document.body.setAttribute('data-calendar', type);

    if (type === 'persian') {
        currentPersianDate = gregorianToPersian(currentDate);
    } else {
        currentDate = persianToGregorian(currentPersianDate);
    }
    
    // Update UI
    updateCalendarHeader();
    renderWeekdays();
    renderDays();
    calendarCards();
    highlightToday();
}

// ======================= PWA FUNCTIONALITY =======================
/**
 * Handles PWA installation prompt
 */
function initializePWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (pwaInstallPrompt) pwaInstallPrompt.style.display = 'block';
    });

    if (pwaInstallBtn) {
        pwaInstallBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
                if (pwaInstallPrompt) pwaInstallPrompt.style.display = 'none';
            }
        });
    }

    if (pwaDismissBtn) {
        pwaDismissBtn.addEventListener('click', () => {
            if (pwaInstallPrompt) pwaInstallPrompt.style.display = 'none';
        });
    }

    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        if (pwaInstallPrompt) pwaInstallPrompt.style.display = 'none';
        deferredPrompt = null;
    });
}

/**
 * Registers service worker for PWA functionality
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register(`${BASE_PATH}/assets/js/service-worker.js`)
                .then((registration) => {
                    console.log('SW registered: ', registration);
                })
                .catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
}

// ======================= UI HELPER FUNCTIONS =======================
/**
 * Toggles between light and dark themes
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
}

/**
 * Toggles between Persian and English languages
 */
function toggleLanguage() {
    currentLang = currentLang === 'fa' ? 'en' : 'fa';
    loadLanguage(currentLang);
}

/**
 * Updates UI texts based on language
 * @param {string} lang - Language code
 */
function updateUITexts(lang) {
    document.querySelector('.logo').textContent = langData.ui.logo;
    if (todayBtn) todayBtn.title = langData.ui.today;
    if (prevMonthBtn) prevMonthBtn.title = langData.ui.prevMonth;
    if (nextMonthBtn) nextMonthBtn.title = langData.ui.nextMonth;
    if (prevYearBtn) prevYearBtn.title = langData.ui.prevYear;
    if (nextYearBtn) nextYearBtn.title = langData.ui.nextYear;

    if (modalTitle) modalTitle.textContent = langData.ui.addEvent;
    if (eventTitle) eventTitle.placeholder = langData.ui.eventTitlePlaceholder;
    if (eventDescription) eventDescription.placeholder = langData.ui.eventDescriptionPlaceholder;
    if (cancelEvent) cancelEvent.textContent = langData.ui.cancel;
}

/**
 * Toggles mobile menu visibility
 */
function toggleMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    
    if (navMenu && mobileMenuBtn) {
        navMenu.classList.toggle('active');
        
        // Update button icon
        const isActive = navMenu.classList.contains('active');
        mobileMenuBtn.innerHTML = isActive ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        mobileMenuBtn.setAttribute('aria-expanded', isActive.toString());
    }
}

/**
 * Shows toast notification
 * @param {string} message - Message to display
 */
function showToast(message) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'var(--primary-color)';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '1000';
    toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ======================= UTILITY FUNCTIONS =======================
/**
 * Converts Gregorian date to Persian date
 * @param {Date} gDate - Gregorian date
 * @returns {Object} Persian date object
 */
function gregorianToPersian(date) {
    const jalaaliDate = jalaali.toJalaali(date);
    return {
        year: jalaaliDate.jy,
        month: jalaaliDate.jm,
        day: jalaaliDate.jd
    };
}

/**
 * Converts Persian date to Gregorian date
 * @param {Object} p - Persian date object
 * @returns {Date} Gregorian date
 */
function persianToGregorian(persianDate) {
    const gregorianDate = jalaali.toGregorian(persianDate.year, persianDate.month, persianDate.day);
    return new Date(gregorianDate.gy, gregorianDate.gm - 1, gregorianDate.gd);
}

/**
 * Gets first day of Persian month
 * @param {number} year - Persian year
 * @param {number} month - Persian month
 * @returns {number} Day of week (0-6, 0=Saturday)
 */
function getFirstDayOfPersianMonth(year, month) {
    const firstDayGregorian = persianToGregorian({year: year, month: month, day: 1});
    let dayOfWeek = firstDayGregorian.getDay();
    
    // Convert to Persian week (0 = Saturday, 6 = Friday)
    return (dayOfWeek + 1) % 7;
}

/**
 * Gets number of days in Persian month
 * @param {number} year - Persian year
 * @param {number} month - Persian month
 * @returns {number} Number of days in month
 */
function getDaysInPersianMonth(year, month) {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    
    return jalaali.isLeapJalaaliYear(year) ? 30 : 29;
}

/**
 * Generates date key for storage
 * @param {number} year - Year
 * @param {number} month - Month
 * @param {number} day - Day
 * @returns {string} Date key
 */
function getDateKey(year, month, day) {
    return `${year}-${month}-${day}`;
}

// ======================= APPLICATION START =======================
// Initialize the application
initializeApp();
