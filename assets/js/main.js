/*
 * Copyright (c) 2025 Mehdi Dimyadi (https://github.com/MEHDIMYADI)
 * Project: Roozegaar Calendar (https://dimyadi.ir/roozegaar-calendar/)
 *
 * If you use or get inspiration from this project,
 * please kindly mention my name or this project in your work.
 * It took a lot of effort to build, and I’d really appreciate your acknowledgment.
 *
 * Licensed under no specific open-source license — all rights reserved unless stated otherwise.
 */

// ======================= APPLICATION INITIALIZATION =======================
/**
 * Main application initialization
 */
function initializeApp() {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🚀 App initialization started...');
        
        try {
            // Initialize components
            console.log('📦 Loading components...');
            await loadAllComponents();
            
            // Wait a bit more for DOM to be fully ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Initialize state
            currentLang = localStorage.getItem('lang') || 'fa';
            currentCalendar = localStorage.getItem('calendarType') || 'persian';
            
            // Load language and setup
            console.log('🌐 Loading language...');
            await loadLanguage(currentLang);
            document.body.setAttribute('data-calendar', currentCalendar);
            
            // Initialize manifest based on language
            updateManifest();
            
            // Initialize theme (updated)
            console.log('🎨 Initializing theme...');
            initializeTheme();
            
            // Restore calendar state
            if (currentCalendar === 'persian') {
                currentPersianDate = gregorianToPersian(currentDate);
            } else {
                currentDate = persianToGregorian(currentPersianDate);
            }
            
            // Setup all functionality
            console.log('⚙️ Setting up functionality...');
            setupEventListeners();
            initializePWA();
            registerServiceWorker();
            initializeSettingsModal();
            setupSettingsHandlers();

            // Initialize calendar
            console.log('📅 Initializing calendar...');
            initCalendar();
            
            // Show today's events
            const todayKey = currentCalendar === 'persian' 
                ? getDateKey(currentPersianDate.year, currentPersianDate.month, currentPersianDate.day)
                : getDateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());

            dailyEventsCard(todayKey);
            
            // Hide PWA prompt if in standalone mode
            if (window.matchMedia('(display-mode: standalone').matches) {
                if (pwaInstallPrompt) pwaInstallPrompt.style.display = 'none';
            }
            
            // Initialize mobile menu
            new MobileMenu();
            
            console.log('✅ App initialized successfully!');
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
        }
    });
    
    // handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.page) {
            navigateTo(event.state.page);
        }
    });    
}

// ======================= BASE URL CONFIG =======================
const BASE_PATH = `${window.location.origin}/roozegaar-calendar`;

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
let currentPage = 'calendar'; 

// ======================= DOM ELEMENTS =======================
let persianDay, persianMonth, persianFullDate;
let gregorianDay, gregorianMonth, gregorianFullDate;
let dailyEventsContainer;

let themeToggle, langToggle, mobileMenuBtn, navMenu;
let prevYearBtn, prevMonthBtn, todayBtn, nextMonthBtn, nextYearBtn;
let currentMonthYear, weekdays, daysGrid;
let eventModal, closeModal, eventForm;
let eventTitleLabel, eventDateLabel, eventDate, eventDescriptionLabel, eventDescription;
let submitEvent, cancelEvent, eventsList, modalTitle;
let settingsModal, closeSettingsModal, calendarTypeSelect;
let themeToggleSettings, langToggleSettings, themeSelect, langSelect, secondaryCalendarToggle;
let pwaInstallPrompt, pwaPromptTitle, pwaPromptSubtitle, pwaDismissBtn, pwaInstallBtn;

// ======================= Components =======================
async function loadAllComponents() {
	const components = [];

	if (document.getElementById('header'))
		components.push({ id: 'header', url: `${BASE_PATH}/assets/components/header.html` });
		
	if (document.getElementById('main-content')) {
      if (currentPage === 'calendar') {
          components.push({ id: 'main-content', url: `${BASE_PATH}/assets/components/calendar.html` });
      } else if (currentPage === 'settings') {
          components.push({ id: 'main-content', url: `${BASE_PATH}/assets/components/settings.html` });
      } else if (currentPage === 'privacy-policy') {
          components.push({ id: 'main-content', url: `${BASE_PATH}/assets/components/privacy-policy.html` });
      }
  }
  
	if (document.getElementById('footer')) 
		components.push({ id: 'footer', url: `${BASE_PATH}/assets/components/footer.html` });
	
	for (const c of components) {
		await loadComponent(c.id, c.url);
    }
    
    // After all components are loaded, initialize DOM elements
    initializeDOMElements();
}

function loadComponent(id, url) {
    return fetch(url)
        .then(res => {
            if (!res.ok) {
                throw new Error(`Failed to load component: ${url}, status: ${res.status}`);
            }
            return res.text();
        })
        .then(html => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = html;
                console.log(`✅ Component ${id} loaded successfully`);
                return true;
            } else {
                console.error(`❌ Element with id ${id} not found`);
                return false;
            }
        })
        .catch(error => {
            console.error(`❌ Error loading component ${id}:`, error);
            return false;
        });
}

// ======================= THEME MANAGEMENT =======================
/**
 * Initializes theme based on system preference and saved settings
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'default';
        console.log('Theme select:', savedTheme);

    // If the value is invalid, set the default
    if (!['default', 'light', 'dark'].includes(savedTheme)) {
        localStorage.setItem('theme', 'default');
    }
    
    // Apply saved theme
    applyTheme(savedTheme);
    
    // Make sure the selectbox is updated too
    if (themeSelect) {
        themeSelect.value = savedTheme;
        updateThemeSelect(savedTheme);
    }
    
    // Listen for system theme changes
    if (window.matchMedia) {
        const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
        systemThemeMedia.addEventListener('change', handleSystemThemeChange);
        
        // Check once at the beginning
        handleSystemThemeChange(systemThemeMedia);        
    }
}

/**
 * Applies theme to the document
 * @param {string} theme - Theme name ('default', 'light', 'dark')
 */
function applyTheme(theme) {
    console.log('Applying theme:', theme);
    
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-mode');
    document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-default');
    
    if (theme === 'default') {
        const systemTheme = getSystemTheme();
        document.documentElement.setAttribute('data-theme', systemTheme);
        document.documentElement.setAttribute('data-theme-mode', 'auto');
        document.documentElement.classList.add('theme-default');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-theme-mode', 'manual');
        document.documentElement.classList.add(`theme-${theme}`);
    }
    
    if (themeSelect) {
        themeSelect.value = theme;
    }
    
    updateThemeSelect(theme); 
}

/**
 * Gets system theme preference
 * @returns {string} System theme ('light' or 'dark')
 */
function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

/**
 * Handles system theme changes
 * @param {MediaQueryListEvent} e - Media query event
 */
function handleSystemThemeChange(e) {
    const currentTheme = localStorage.getItem('theme') || 'default';
    
    // Only update if theme is set to 'default'
    if (currentTheme === 'default') {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
    }
}

/**
 * Updates theme select appearance
 * @param {string} theme - Current theme
 */
function updateThemeSelect(theme) {
    if (!themeSelect) {
        console.warn('Theme select element not found');
        themeSelect = document.getElementById('themeSelect');
        if (!themeSelect) return;
    }
    
    themeSelect.value = theme;
    
    const options = themeSelect.querySelectorAll('option');
    options.forEach(option => {
        const value = option.value;
        if (value === 'default') {
            option.textContent = langData.ui.themeDefault || 'پیش‌فرض سیستم';
        } else if (value === 'light') {
            option.textContent = langData.ui.light || 'روشن';
        } else if (value === 'dark') {
            option.textContent = langData.ui.dark || 'تیره';
        }
    });
}

/**
 * Toggles between themes
 */
function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'default';
    let newTheme;
    
    // Cycle through themes: default -> light -> dark -> default
    if (currentTheme === 'default') {
        newTheme = 'light';
    } else if (currentTheme === 'light') {
        newTheme = 'dark';
    } else {
        newTheme = 'default';
    }
    
    // Apply new theme and save
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Show feedback
    showThemeChangeToast(newTheme);
}

/**
 * Shows toast notification for theme change
 * @param {string} theme - New theme name
 */
function showThemeChangeToast(theme) {
    let message;
    
    if (theme === 'default') {
        message = langData.ui.themeSetToDefault || 'تم روی پیش‌فرض سیستم تنظیم شد';
    } else if (theme === 'light') {
        message = langData.ui.themeSetToLight || 'تم روشن فعال شد';
    } else {
        message = langData.ui.themeSetToDark || 'تم تاریک فعال شد';
    }
    
    showToast(message);
}

/**
 * Handles theme change from settings dropdown
 */
function handleThemeChange() {
    const theme = themeSelect.value;
    applyTheme(theme);
    localStorage.setItem('theme', theme);
    showThemeChangeToast(theme);
}

// ======================= PAGE NAVIGATION =======================
/**
 * Navigates between pages
 * @param {string} page - Page name ('calendar', 'settings')
 */
async function navigateTo(page) {
    console.log(`🔄 Navigating to: ${page}`);
    
    if (currentPage === page) {
        const mobileMenu = new MobileMenu();
        if (mobileMenu.isOpen) {
            mobileMenu.closeMenu();
        }
        return;
    }
    
    window.history.pushState({ page }, '', `#${page}`);

    currentPage = page;
    
    try {
        let componentUrl;
        if (page === 'calendar') {
            componentUrl = `${BASE_PATH}/assets/components/calendar.html`;
        } else if (page === 'settings') {
            componentUrl = `${BASE_PATH}/assets/components/settings.html`;
        } else if (page === 'privacy-policy') {
            componentUrl = `${BASE_PATH}/assets/components/privacy-policy.html`;
        } else if (page === 'terms') {
            componentUrl = `${BASE_PATH}/assets/components/terms.html`;
        } else if (page === 'faq') {
            componentUrl = `${BASE_PATH}/assets/components/faq.html`;
        } else if (page === 'about') {
            componentUrl = `${BASE_PATH}/assets/components/about.html`;
        }

        if (componentUrl) {
            await loadComponent('main-content', componentUrl);
            
            initializeDOMElements();
            
            if (page === 'calendar') {
                setupCalendarNavigation();
                initCalendar();
                
                // Show today's events
                const todayKey = currentCalendar === 'persian' 
                    ? getDateKey(currentPersianDate.year, currentPersianDate.month, currentPersianDate.day)
                    : getDateKey(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
                dailyEventsCard(todayKey);
                
            } else if (page === 'settings') {
                setupSettingsPage();
            } else if (page === 'privacy-policy') {
                setupPrivacyPolicyPage();
            } else if (page === 'terms') {
                setupTermsPage();
            } else if (page === 'faq') {
                setupFAQPage();
            } else if (page === 'about') {
                setupAboutPage();
            }
            
            updateActiveNav();
            
            console.log(`✅ Successfully navigated to ${page}`);
        }
    } catch (error) {
        console.error(`❌ Error navigating to ${page}:`, error);
    }
}

/**
 * Sets up settings page functionality
 */
function setupSettingsPage() {
    console.log('⚙️ Setting up settings page...');
    
    if (themeSelect) themeSelect.value = localStorage.getItem('theme') || 'default';
    if (langSelect) langSelect.value = currentLang;
    if (calendarTypeSelect) calendarTypeSelect.value = currentCalendar;
    if (secondaryCalendarToggle) secondaryCalendarToggle.checked = showSecondaryCalendar;
    
    if (themeSelect) {
        themeSelect.addEventListener('change', handleThemeChange);
    }
    if (langSelect) {
        langSelect.addEventListener('change', handleLanguageChange);
    }
    if (calendarTypeSelect) {
        calendarTypeSelect.addEventListener('change', handleCalendarTypeChange);
    }
    if (secondaryCalendarToggle) {
        secondaryCalendarToggle.addEventListener('change', handleSecondaryCalendarToggle);
    }
    
    const resetBtn = document.getElementById('resetSettings');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }
    
    updateSettingsText();
}

/**
 * Sets up privacy policy page functionality
 */
function setupPrivacyPolicyPage() {
    console.log('🔒 Setting up privacy policy page...');
    
    const privacyContent = document.querySelector('.privacy-content');
    if (!privacyContent) {
        console.error('❌ Privacy content container not found');
        return;
    }
    
    // Clear existing content
    privacyContent.innerHTML = '';
    
    // Get privacy data from language file
    const privacyData = langData.privacy;
    
    // Create main container
    const privacyContainer = document.createElement('div');
    privacyContainer.className = 'privacy-container';
    
    // Create title
    const title = document.createElement('h1');
    title.className = 'privacy-title';
    title.textContent = privacyData.title;
    privacyContainer.appendChild(title);
    
    // Create sections
    if (privacyData.sections && Array.isArray(privacyData.sections)) {
        privacyData.sections.forEach((section, index) => {
            const sectionElement = createPrivacySection(section, index);
            privacyContainer.appendChild(sectionElement);
        });
    }
        
    privacyContent.appendChild(privacyContainer);
    
}


/**
 * Creates a privacy policy section
 * @param {Object} section - Section data from language file
 * @param {number} index - Section index
 * @returns {HTMLElement} Section element
 */
function createPrivacySection(section, index) {
    const sectionElement = document.createElement('div');
    sectionElement.className = 'privacy-section';
    sectionElement.setAttribute('role', 'region');
    sectionElement.setAttribute('aria-labelledby', `section-title-${index}`);
    
    const title = document.createElement('h2');
    title.id = `section-title-${index}`;
    title.className = 'privacy-section-title';
    title.textContent = section.title;
    
    const content = document.createElement('p');
    content.className = 'privacy-section-content';
    content.textContent = section.content;
    
    sectionElement.appendChild(title);
    sectionElement.appendChild(content);
    
    return sectionElement;
}

/**
 * Sets up terms page functionality
 */
function setupTermsPage() {
    console.log('🔒 Setting up terms page...');
    
    const termsContent = document.querySelector('.terms-content');
    if (!termsContent) {
        console.error('❌ Terms content container not found');
        return;
    }
    
    // Clear existing content
    termsContent.innerHTML = '';
    
    // Get terms data from language file
    const termsData = langData.terms;
    
    // Create main container
    const termsContainer = document.createElement('div');
    termsContainer.className = 'terms-container';
    
    // Create title
    const title = document.createElement('h1');
    title.className = 'terms-title';
    title.textContent = termsData.title;
    termsContainer.appendChild(title);
    
    // Create sections
    if (termsData.sections && Array.isArray(termsData.sections)) {
        termsData.sections.forEach((section, index) => {
            const sectionElement = createTermsSection(section, index);
            termsContainer.appendChild(sectionElement);
        });
    }
        
    termsContent.appendChild(termsContainer);
    
}

/**
 * Creates a terms section
 * @param {Object} section - Section data from language file
 * @param {number} index - Section index
 * @returns {HTMLElement} Section element
 */
function createTermsSection(section, index) {
    const sectionElement = document.createElement('div');
    sectionElement.className = 'terms-section';
    sectionElement.setAttribute('role', 'region');
    sectionElement.setAttribute('aria-labelledby', `section-title-${index}`);
    
    const title = document.createElement('h2');
    title.id = `section-title-${index}`;
    title.className = 'terms-section-title';
    title.textContent = section.title;
    
    const content = document.createElement('p');
    content.className = 'terms-section-content';
    content.textContent = section.content;
    
    sectionElement.appendChild(title);
    sectionElement.appendChild(content);
    
    return sectionElement;
}

// ======================= FAQ FUNCTIONALITY =======================

/**
 * Sets up FAQ page functionality
 */
function setupFAQPage() {
    console.log('❓ Setting up FAQ page...');
    
    const faqContent = document.querySelector('.faq-page');
    if (!faqContent) {
        console.error('❌ FAQ content container not found');
        return;
    }
    
    // Load FAQ data and render
    loadFaqData();
    
    // Setup search functionality
    setupFaqSearch();
    
    // Setup category and question toggles
    setupFaqToggles();
}

/**
 * Loads FAQ data from language file and renders it
 */
function loadFaqData() {
    const faqData = langData.faq;
    if (!faqData) {
        console.error('❌ FAQ data not found in language file');
        return;
    }
    
    renderFaqCategories(faqData.categories);
}

/**
 * Renders FAQ categories and questions
 * @param {Object} categories - FAQ categories data
 */
function renderFaqCategories(categories) {
    const categoriesContainer = document.getElementById('faqCategories');
    if (!categoriesContainer) return;
    
    categoriesContainer.innerHTML = '';
    
    Object.keys(categories).forEach(categoryKey => {
        const category = categories[categoryKey];
        const categoryElement = createCategoryElement(categoryKey, category);
        categoriesContainer.appendChild(categoryElement);
    });
}

/**
 * Creates a FAQ category element
 * @param {string} categoryKey - Category key
 * @param {Object} category - Category data
 * @returns {HTMLElement} Category element
 */
function createCategoryElement(categoryKey, category) {
    const categoryElement = document.createElement('div');
    categoryElement.className = 'faq-category';
    categoryElement.setAttribute('data-category', categoryKey);
    
    // Category header
    const header = document.createElement('div');
    header.className = 'faq-category-header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');
    header.setAttribute('aria-controls', `category-${categoryKey}`);
    
    const title = document.createElement('h3');
    title.className = 'faq-category-title';
    title.textContent = category.title;
    
    const toggle = document.createElement('button');
    toggle.className = 'faq-category-toggle';
    toggle.setAttribute('aria-label', `${category.title} ${currentLang === 'fa' ? 'را باز کن' : 'expand'}`);
    toggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
    
    header.appendChild(title);
    header.appendChild(toggle);
    
    // Category content
    const content = document.createElement('div');
    content.className = 'faq-category-content';
    content.id = `category-${categoryKey}`;
    
    if (category.questions && Array.isArray(category.questions)) {
        category.questions.forEach((question, index) => {
            const questionElement = createQuestionElement(question, index);
            content.appendChild(questionElement);
        });
    }
    
    categoryElement.appendChild(header);
    categoryElement.appendChild(content);
    
    // Add event listener for accessibility
    header.addEventListener('click', function() {
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isExpanded);
    });
    
    return categoryElement;
}

/**
 * Creates a FAQ question element
 * @param {Object} question - Question data
 * @param {number} index - Question index
 * @returns {HTMLElement} Question element
 */
function createQuestionElement(question, index) {
    const questionElement = document.createElement('div');
    questionElement.className = 'faq-question';
    questionElement.setAttribute('role', 'article');
    
    const questionHeader = document.createElement('div');
    questionHeader.className = 'faq-question-header';
    questionHeader.setAttribute('role', 'button');
    questionHeader.setAttribute('tabindex', '0');
    questionHeader.setAttribute('aria-expanded', 'false');
    questionHeader.setAttribute('aria-controls', `answer-${index}`);
    
    const questionText = document.createElement('div');
    questionText.className = 'faq-question-text';
    questionText.textContent = question.question;
    
    const questionToggle = document.createElement('button');
    questionToggle.className = 'faq-question-toggle';
    questionToggle.setAttribute('aria-label', currentLang === 'fa' ? 'نمایش پاسخ' : 'Show answer');
    questionToggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
    
    questionHeader.appendChild(questionText);
    questionHeader.appendChild(questionToggle);
    
    const answer = document.createElement('div');
    answer.className = 'faq-answer';
    answer.id = `answer-${index}`;
    answer.setAttribute('role', 'region');
    answer.textContent = question.answer;
    
    questionElement.appendChild(questionHeader);
    questionElement.appendChild(answer);
    
    // Add event listener for accessibility
    questionHeader.addEventListener('click', function() {
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isExpanded);
    });
    
    return questionElement;
}

/**
 * Sets up FAQ search functionality
 */
function setupFaqSearch() {
    const searchInput = document.getElementById('faqSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', debounce(handleFaqSearch, 300));
}

/**
 * Handles FAQ search
 * @param {Event} e - Input event
 */
function handleFaqSearch(e) {
    const searchTerm = e.target.value.trim().toLowerCase();
    
    if (searchTerm.length === 0) {
        resetFaqSearch();
        return;
    }
    
    performFaqSearch(searchTerm);
}

/**
 * Performs FAQ search and highlights results
 * @param {string} searchTerm - Search term
 */
function performFaqSearch(searchTerm) {
    const questions = document.querySelectorAll('.faq-question');
    let foundResults = false;
    
    questions.forEach(question => {
        const questionText = question.querySelector('.faq-question-text').textContent.toLowerCase();
        const answerText = question.querySelector('.faq-answer').textContent.toLowerCase();
        
        const matchesQuestion = questionText.includes(searchTerm);
        const matchesAnswer = answerText.includes(searchTerm);
        
        if (matchesQuestion || matchesAnswer) {
            question.style.display = 'block';
            foundResults = true;
            
            // Highlight matching text
            highlightSearchTerm(question, searchTerm);
            
            // Expand parent category
            const category = question.closest('.faq-category');
            const categoryContent = category.querySelector('.faq-category-content');
            categoryContent.classList.add('expanded');
        } else {
            question.style.display = 'none';
        }
    });
    
    showNoResults(!foundResults);
}

/**
 * Highlights search term in FAQ content
 * @param {HTMLElement} question - Question element
 * @param {string} searchTerm - Search term
 */
function highlightSearchTerm(question, searchTerm) {
    const questionText = question.querySelector('.faq-question-text');
    const answerText = question.querySelector('.faq-answer');
    
    const highlightText = (element, term) => {
        const text = element.textContent;
        const regex = new RegExp(`(${term})`, 'gi');
        const highlighted = text.replace(regex, '<span class="search-highlight">$1</span>');
        element.innerHTML = highlighted;
    };
    
    highlightText(questionText, searchTerm);
    highlightText(answerText, searchTerm);
}

/**
 * Resets FAQ search state
 */
function resetFaqSearch() {
    const questions = document.querySelectorAll('.faq-question');
    questions.forEach(question => {
        question.style.display = 'block';
        
        // Remove highlighting
        const questionText = question.querySelector('.faq-question-text');
        const answerText = question.querySelector('.faq-answer');
        
        questionText.innerHTML = questionText.textContent;
        answerText.innerHTML = answerText.textContent;
    });
    
    showNoResults(false);
}

/**
 * Shows/hides no results message
 * @param {boolean} show - Whether to show the message
 */
function showNoResults(show) {
    let noResults = document.querySelector('.faq-no-results');
    
    if (!noResults) {
        noResults = document.createElement('div');
        noResults.className = 'faq-no-results';
        noResults.textContent = langData.faq?.noResults || 'نتیجه‌ای یافت نشد';
        
        const categoriesContainer = document.getElementById('faqCategories');
        if (categoriesContainer) {
            categoriesContainer.appendChild(noResults);
        }
    }
    
    noResults.classList.toggle('show', show);
}

/**
 * Sets up FAQ toggle functionality
 */
function setupFaqToggles() {
    // Use event delegation for all FAQ interactions
    document.addEventListener('click', (e) => {
        // Category toggle
        if (e.target.closest('.faq-category-toggle')) {
            e.preventDefault();
            const toggle = e.target.closest('.faq-category-toggle');
            const category = toggle.closest('.faq-category');
            const content = category.querySelector('.faq-category-content');
            const icon = toggle.querySelector('i');
            
            // Toggle category
            toggle.classList.toggle('rotated');
            content.classList.toggle('expanded');
            
            // Update icon
            if (content.classList.contains('expanded')) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
        }
        
        // Question toggle
        if (e.target.closest('.faq-question-toggle')) {
            e.preventDefault();
            const toggle = e.target.closest('.faq-question-toggle');
            const question = toggle.closest('.faq-question');
            const answer = question.querySelector('.faq-answer');
            const icon = toggle.querySelector('i');
            
            // Toggle question
            toggle.classList.toggle('rotated');
            answer.classList.toggle('expanded');
            
            // Update icon
            if (answer.classList.contains('expanded')) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
        }
        
        // Question header click (alternative to toggle button)
        if (e.target.closest('.faq-question-header') && !e.target.closest('.faq-question-toggle')) {
            e.preventDefault();
            const header = e.target.closest('.faq-question-header');
            const question = header.closest('.faq-question');
            const answer = question.querySelector('.faq-answer');
            const toggle = question.querySelector('.faq-question-toggle');
            const icon = toggle.querySelector('i');
            
            // Toggle question
            toggle.classList.toggle('rotated');
            answer.classList.toggle('expanded');
            
            // Update icon
            if (answer.classList.contains('expanded')) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
        }
    });

    // Add keyboard support for accessibility
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            if (e.target.closest('.faq-question-header') || e.target.closest('.faq-category-header')) {
                e.preventDefault();
                e.target.click();
            }
        }
    });
}
        
/**
 * Debounce function for search
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ======================= ABOUT FUNCTIONALITY =======================
        
/**
 * Sets up about page functionality
 */
function setupAboutPage() {
    console.log('👤 Setting up about page...');
    
    const aboutContent = document.querySelector('.about-content');
    if (!aboutContent) {
        console.error('❌ About content container not found');
        return;
    }
    
    // Clear existing content
    aboutContent.innerHTML = '';
    
    // Get about data from language file
    const aboutData = langData.about;
    
    // Create main container
    const aboutContainer = document.createElement('div');
    aboutContainer.className = 'about-container';
    
    // Create hero section
    const heroSection = createAboutHero(aboutData);
    aboutContainer.appendChild(heroSection);
    
    // Create about me section
    const aboutMeSection = createAboutSection(
        aboutData.sections.aboutMe.title,
        aboutData.sections.aboutMe.content
    );
    aboutContainer.appendChild(aboutMeSection);
    
    // Create projects section
    const projectsSection = createProjectsSection(aboutData);
    aboutContainer.appendChild(projectsSection);
    
    // Create skills section
    const skillsSection = createSkillsSection(aboutData);
    aboutContainer.appendChild(skillsSection);
    
    // Create contact section
    const contactSection = createContactSection(aboutData);
    aboutContainer.appendChild(contactSection);
    
    aboutContent.appendChild(aboutContainer);
}

/**
 * Creates about hero section
 */
function createAboutHero(aboutData) {
    const hero = document.createElement('div');
    hero.className = 'about-hero';
    
        // Get about data from language file
    const uiData = langData.ui;
    
    const title = document.createElement('h1');
    title.className = 'about-hero-title';
    title.textContent = uiData.logo;
    
    const subtitle = document.createElement('p');
    subtitle.className = 'about-hero-subtitle';
    subtitle.textContent = uiData.slogan;
    
    const profile = document.createElement('div');
    profile.className = 'about-profile';
    
    // Avatar (you can add your image later)
    const avatar = document.createElement('div');
    avatar.className = 'about-avatar';
    avatar.style.backgroundColor = 'rgba(255,255,255,0.2)';
    avatar.style.display = 'flex';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';
    avatar.innerHTML = '<i class="fas fa-user" style="font-size: 3rem; color: white;"></i>';
    
    const profileInfo = document.createElement('div');
    profileInfo.className = 'about-profile-info';
    
    const profileName = document.createElement('div');
    profileName.className = 'about-profile-name';
    profileName.textContent = aboutData.hero.title;
    
    const profileRole = document.createElement('div');
    profileRole.className = 'about-profile-role';
    profileRole.textContent = aboutData.hero.subtitle;
    
    const socialLinks = document.createElement('div');
    socialLinks.className = 'about-social-links';
    
    // GitHub link
    const githubLink = document.createElement('a');
    githubLink.className = 'about-social-link';
    githubLink.href = 'https://github.com/MEHDIMYADI';
    githubLink.target = '_blank';
    githubLink.innerHTML = '<i class="fab fa-github"></i>';
    githubLink.title = aboutData.links.github;
    
    // Website link
    const websiteLink = document.createElement('a');
    websiteLink.className = 'about-social-link';
    websiteLink.href = 'https://dimyadi.ir/';
    websiteLink.target = '_blank';
    websiteLink.innerHTML = '<i class="fas fa-globe"></i>';
    websiteLink.title = aboutData.links.website;
    
    // Roozegaar link
    const roozegaarLink = document.createElement('a');
    roozegaarLink.className = 'about-social-link';
    roozegaarLink.href = 'https://roozegaar.ir/';
    roozegaarLink.target = '_blank';
    roozegaarLink.innerHTML = '<i class="fas fa-calendar"></i>';
    roozegaarLink.title = aboutData.links.roozegaar;
    
    socialLinks.appendChild(githubLink);
    socialLinks.appendChild(websiteLink);
    socialLinks.appendChild(roozegaarLink);
    
    profileInfo.appendChild(profileName);
    profileInfo.appendChild(profileRole);
    profileInfo.appendChild(socialLinks);
    
    profile.appendChild(avatar);
    profile.appendChild(profileInfo);
    
    hero.appendChild(title);
    hero.appendChild(subtitle);
    hero.appendChild(profile);
    
    return hero;
}

/**
 * Creates a generic about section
 */
function createAboutSection(title, content) {
    const section = document.createElement('div');
    section.className = 'about-section';
    
    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'about-section-title';
    sectionTitle.textContent = title;
    
    const sectionContent = document.createElement('p');
    sectionContent.className = 'about-section-content';
    sectionContent.textContent = content;
    
    section.appendChild(sectionTitle);
    section.appendChild(sectionContent);
    
    return section;
}

/**
 * Creates projects section
 */
function createProjectsSection(aboutData) {
    const section = document.createElement('div');
    section.className = 'about-section';
    
    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'about-section-title';
    sectionTitle.textContent = aboutData.sections.projects.title;
    
    const sectionContent = document.createElement('p');
    sectionContent.className = 'about-section-content';
    sectionContent.textContent = aboutData.sections.projects.content;
    
    const projectsGrid = document.createElement('div');
    projectsGrid.className = 'about-projects';
    
    aboutData.projects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'about-project-card';
        
        const projectTitle = document.createElement('h3');
        projectTitle.className = 'about-project-title';
        projectTitle.textContent = project.title;
        
        const projectDesc = document.createElement('p');
        projectDesc.className = 'about-project-description';
        projectDesc.textContent = project.description;
        
        const projectLink = document.createElement('a');
        projectLink.className = 'about-project-link';
        projectLink.href = project.url;
        projectLink.target = '_blank';
        projectLink.innerHTML = '<i class="fas fa-external-link-alt"></i> ' + (currentLang === 'fa' ? 'مشاهده پروژه' : 'View Project');
        
        projectCard.appendChild(projectTitle);
        projectCard.appendChild(projectDesc);
        projectCard.appendChild(projectLink);
        projectsGrid.appendChild(projectCard);
    });
    
    section.appendChild(sectionTitle);
    section.appendChild(sectionContent);
    section.appendChild(projectsGrid);
    
    return section;
}

/**
 * Creates skills section
 */
function createSkillsSection(aboutData) {
    const section = document.createElement('div');
    section.className = 'about-section';
    
    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'about-section-title';
    sectionTitle.textContent = aboutData.sections.skills.title;
    
    const sectionContent = document.createElement('p');
    sectionContent.className = 'about-section-content';
    sectionContent.textContent = aboutData.sections.skills.content;
    
    const skillsContainer = document.createElement('div');
    skillsContainer.className = 'about-skills';
    
    aboutData.skills.forEach(skill => {
        const skillElement = document.createElement('span');
        skillElement.className = 'about-skill';
        skillElement.textContent = skill;
        skillsContainer.appendChild(skillElement);
    });
    
    section.appendChild(sectionTitle);
    section.appendChild(sectionContent);
    section.appendChild(skillsContainer);
    
    return section;
}

/**
 * Creates contact section
 */
function createContactSection(aboutData) {
    const section = document.createElement('div');
    section.className = 'about-section';
    
    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'about-section-title';
    sectionTitle.textContent = aboutData.sections.contact.title;
    
    const sectionContent = document.createElement('p');
    sectionContent.className = 'about-section-content';
    sectionContent.textContent = aboutData.sections.contact.content;
    
    const contactInfo = document.createElement('div');
    contactInfo.className = 'about-social-links';
    contactInfo.style.marginTop = '1rem';
    
    // Email contact
    const emailLink = document.createElement('a');
    emailLink.className = 'about-social-link';
    emailLink.href = 'mailto:mahdi2006d@gmail.com';
    emailLink.innerHTML = '<i class="fas fa-envelope"></i>';
    emailLink.title = 'Email';
    
    // GitHub contact
    const githubContact = document.createElement('a');
    githubContact.className = 'about-social-link';
    githubContact.href = 'https://github.com/MEHDIMYADI';
    githubContact.target = '_blank';
    githubContact.innerHTML = '<i class="fab fa-github"></i>';
    githubContact.title = 'GitHub';
    
    contactInfo.appendChild(emailLink);
    contactInfo.appendChild(githubContact);
    
    section.appendChild(sectionTitle);
    section.appendChild(sectionContent);
    section.appendChild(contactInfo);
    
    return section;
}
    
/**
 * Resets all settings to default
 */
function resetSettings() {
    if (confirm(langData.ui.resetConfirm || 'آیا از بازنشانی همه تنظیمات اطمینان دارید؟')) {
        localStorage.removeItem('theme');
        localStorage.removeItem('lang');
        localStorage.removeItem('calendarType');
        localStorage.removeItem('showSecondaryCalendar');
        localStorage.removeItem('calendarEvents');
        
        currentLang = 'fa';
        currentCalendar = 'persian';
        showSecondaryCalendar = true;
        events = {};
        if (themeSelect) themeSelect.value = 'default';
        
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.setAttribute('lang', 'fa');
        document.documentElement.setAttribute('dir', 'rtl');
        document.body.setAttribute('data-calendar', 'persian');
        
        location.reload();
    }
}

/**
 * Updates active navigation state
 */
function updateActiveNav() {
    const navItems = document.querySelectorAll('#navMenu li');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    let activeIndex = 0;
    if (currentPage === 'settings') {
        activeIndex = 1;
    }
    
    if (navItems[activeIndex]) {
        navItems[activeIndex].classList.add('active');
    }
}
/**
 * Initialize all DOM elements after components are loaded
 */
function initializeDOMElements() {
    // Calendar navigation elements
    themeToggle = document.getElementById('themeToggle');
    langToggle = document.getElementById('langToggle');
    mobileMenuBtn = document.getElementById('mobileMenuBtn');
    navMenu = document.getElementById('navMenu');
    prevYearBtn = document.getElementById('prevYear');
    prevMonthBtn = document.getElementById('prevMonth');
    todayBtn = document.getElementById('todayBtn');
    nextMonthBtn = document.getElementById('nextMonth');
    nextYearBtn = document.getElementById('nextYear');
    currentMonthYear = document.getElementById('currentMonthYear');
    weekdays = document.getElementById('weekdays');
    daysGrid = document.getElementById('daysGrid');
    
    // Modal elements
    eventModal = document.getElementById('eventModal');
    closeModal = document.getElementById('closeModal');
    eventForm = document.getElementById('eventForm');
    eventTitleLabel = document.getElementById('eventTitleLabel');
    eventDateLabel = document.getElementById('eventDateLabel');
    eventDate = document.getElementById('eventDate');
    eventDescriptionLabel = document.getElementById('eventDescriptionLabel'); 
    eventDescription = document.getElementById('eventDescription');
    submitEvent = document.getElementById('submitEvent');
    cancelEvent = document.getElementById('cancelEvent');
    eventsList = document.getElementById('eventsList');
    modalTitle = document.getElementById('modalTitle');
    
    // Settings modal elements
    settingsModal = document.getElementById('settingsModal');
    closeSettingsModal = document.getElementById('closeSettingsModal');
    calendarTypeSelect = document.getElementById('calendarTypeSelect');
    themeToggleSettings = document.getElementById('themeToggleSettings');
    langToggleSettings = document.getElementById('langToggleSettings');
    themeSelect = document.getElementById('themeSelect');
    langSelect = document.getElementById('langSelect');
    secondaryCalendarToggle = document.getElementById('secondaryCalendarToggle');
    
    // PWA elements
    pwaInstallPrompt = document.getElementById('pwaInstallPrompt');
    pwaPromptTitle = document.getElementById('pwaPromptTitle');
    pwaPromptSubtitle = document.getElementById('pwaPromptSubtitle');
    pwaDismissBtn = document.getElementById('pwaDismissBtn');
    pwaInstallBtn = document.getElementById('pwaInstallBtn');
    
    // Calendar card elements
    persianDay = document.getElementById('persianDay');
    persianMonth = document.getElementById('persianMonth');
    persianFullDate = document.getElementById('persianFullDate');
    gregorianDay = document.getElementById('gregorianDay');
    gregorianMonth = document.getElementById('gregorianMonth');
    gregorianFullDate = document.getElementById('gregorianFullDate');
    dailyEventsContainer = document.getElementById('dailyEventsContainer');
    
    // Log initialization status
    console.log('DOM elements initialized:', {
        currentMonthYear: !!currentMonthYear,
        daysGrid: !!daysGrid,
        weekdays: !!weekdays,
        eventModal: !!eventModal,
        settingsModal: !!settingsModal
    });
}

// ======================= EVENT LISTENERS SETUP =======================
/**
 * Sets up all event listeners
 */
function setupEventListeners() {
    setupMobileMenu();
    setupNavigation();
    setupCalendarNavigation();
    setupEventModal();
    setupThemeAndLanguageToggles();
}

/**
 * Sets up navigation between pages
 */
function setupNavigation() {
    document.addEventListener('click', (e) => {
        const navLink = e.target.closest('#navMenu a');
        if (navLink) {
            e.preventDefault();
            
            const linkText = navLink.textContent.toLowerCase();
            if (linkText.includes('calendar') || linkText.includes('تقویم')) {
                navigateTo('calendar');
            } else if (linkText.includes('settings') || linkText.includes('تنظیمات')) {
                navigateTo('settings');
            } else if (linkText.includes('about') || linkText.includes('درباره')) {
                navigateTo('about');
            }
            
            // Menu will be closed automatically by the MobileMenu class
        }
        
        const footerLink = e.target.closest('.footer-links a, .moreInfoLinks a');
        if (footerLink) {
            e.preventDefault();
            const linkHref = footerLink.getAttribute('href');
            const linkText = footerLink.textContent.toLowerCase();
            
            // Detect link type (internal or external)
            if (linkHref && (linkHref.startsWith('http') || linkHref.startsWith('//'))) {
                // External link - open in browser
                openExternalLink(linkHref);
            } else {
                // Internal link
                if (linkText.includes('privacy') || linkText.includes('حریم')) {
                    navigateTo('privacy-policy');
                } else if (linkText.includes('terms') || linkText.includes('conditions') || linkText.includes('قوانین') || linkText.includes('مقررات')) {
                    navigateTo('terms');
                } else if (linkText.includes('questions') || linkText.includes('faq') || linkText.includes('سوالات') || linkText.includes('متداول')) {
                    navigateTo('faq');
                } else if (linkText.includes('about') || linkText.includes('درباره')) {
                    navigateTo('about');
                }
                
                // Scroll to top
                scrollToTop();
            }
        }
    });
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
        
        // Close menu when clicking on nav links
        this.setupNavLinks();

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
    
    setupNavLinks() {
        const navLinks = this.navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMenuWithAnimation();
            });
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
    
    closeMenuWithAnimation() {
        // Add closing animation class
        this.navMenu.classList.add('closing');
        
        // Wait for animation to complete before fully closing
        setTimeout(() => {
            this.closeMenu();
            this.navMenu.classList.remove('closing');
        }, 300); // Match this with CSS transition duration
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
    if (!currentMonthYear) {
        console.warn('⚠️ currentMonthYear element not found, skipping update');
        return;
    }
    
    try {
        if (currentCalendar === 'persian') {
            currentMonthYear.textContent = `${langData.months.fa[currentPersianDate.month - 1]} ${currentPersianDate.year}`;
        } else {
            currentMonthYear.textContent = `${langData.months.en[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
        console.log('✅ Calendar header updated successfully');
    } catch (error) {
        console.error('❌ Error updating calendar header:', error);
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
        
		emptyDay.classList.add('day', 'empty-day');
        emptyDay.style.pointerEvents = 'none';
        emptyDay.style.cursor = 'default';
        emptyDay.style.opacity = '0.4';
        
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
    // Prevent these listeners from applying to empty days
    if (dayElement.classList.contains('empty-day')) {
        return;
    }

    let longPressTimer;
    const longPressDuration = 500;

    // Touch/click start function
    const startPress = (e) => {
      
        // Prevent default behavior on touch
        if (e.type === 'touchstart') {
            e.preventDefault();
        }
        
        longPressTimer = setTimeout(() => {
            openEventModal(year, month, day);
        }, longPressDuration);
    };

    // End touch/click function
    const endPress = (e) => {
        clearTimeout(longPressTimer);
        
        // If the touch was short, act as a click
        if (e.type === 'touchend' || e.type === 'click') {
            const touch = e.type === 'touchend' ? e.changedTouches[0] : null;
            handleDayClick(dayElement, year, month, day, touch);
        }
    };
    
    // Cancel touch/click
    const cancelPress = () => {
        clearTimeout(longPressTimer);
    };

    // Add event listeners for mobile and desktop
    dayElement.addEventListener('touchstart', startPress, { passive: false });
    dayElement.addEventListener('touchend', endPress);
    dayElement.addEventListener('touchcancel', cancelPress);
    
    dayElement.addEventListener('mousedown', startPress);
    dayElement.addEventListener('mouseup', endPress);
    dayElement.addEventListener('mouseleave', cancelPress);
    dayElement.addEventListener('click', endPress);
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
    if (!persianDay || !gregorianDay) {
        console.warn('⚠️ Calendar card elements not found');
        return;
    }
    
    updatePersianCard();
    updateGregorianCard();
}

/**
 * Updates Persian calendar card
 */
function updatePersianCard() {
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
    if (navItems[0]) navItems[0].textContent = langData.ui.calendar || 'Calendar';
    if (navItems[1]) navItems[1].textContent = langData.ui.settings || 'Settings';
    if (navItems[2]) navItems[2].textContent = langData.ui.about || 'About Us';
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
    if (usefulLinks.length >= 2) {
        usefulLinks[0].textContent = langData.ui.roozegaar || 'روزگار';
        usefulLinks[1].textContent = langData.ui.roozegaarCalendar || 'تقویم روزگار';
    }

    // Update contact info labels
    const contactEmail = footer.querySelector('.contact-info li:nth-child(1) a');
    if (contactEmail) {
        contactEmail.textContent = langData.ui.supportEmail || 'ایمیل پشتیبانی';
        contactEmail.href = `mailto:${langData.ui.supportEmailAddress || 'mahdi2006d@gmail.com'}`;
    }

    // Update more info links
    const moreInfoLinks = footer.querySelectorAll('.footer-column:nth-child(4) .footer-links li a');
    if (moreInfoLinks.length >= 3) {
        moreInfoLinks[0].textContent = langData.ui.privacyPolicy || 'حریم خصوصی';
        moreInfoLinks[1].textContent = langData.ui.termsConditions || 'قوانین و مقررات';
        moreInfoLinks[2].textContent = langData.ui.faq || 'سوالات متداول';
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
    const settingsTitle = document.getElementById('settings');
    if (settingsTitle) settingsTitle.textContent = langData.ui.settings || 'Settings';
    
    const themeLabel = document.querySelector('label[for="themeSelect"]');
    if (themeLabel) themeLabel.textContent = langData.ui.theme || 'Theme';
    
    const langLabel = document.querySelector('label[for="langSelect"]');
    if (langLabel) langLabel.textContent = langData.ui.langToggle || 'Language';
    
    const calendarLabel = document.querySelector('label[for="calendarTypeSelect"]');
    if (calendarLabel) calendarLabel.textContent = langData.ui.settingsCalendar || 'Main Calendar';
    
    const secondaryLabel = document.querySelector('label[for="secondaryCalendarToggle"]');
    if (secondaryLabel) secondaryLabel.textContent = langData.ui.showSecondaryCalendar || 'Show Secondary Calendar';

    const resetSettings = document.getElementById('resetSettings');
    if (resetSettings) resetSettings.textContent = langData.ui.resetSettings || 'Reset Settings';

    if (themeSelect) {
        if (themeSelect.options[0]) themeSelect.options[0].text = langData.ui.themeDefault || 'System Default';        
        if (themeSelect.options[1]) themeSelect.options[1].text = langData.ui.light || 'Light';
        if (themeSelect.options[2]) themeSelect.options[2].text = langData.ui.dark || 'Dark';
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

/**
 * Scrolls to the top of the page with smooth animation
 * Ensures compatibility with both desktop and mobile browsers
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // Additional scroll methods for mobile browser compatibility
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

/**
 * Opens external links in the appropriate browser based on PWA detection
 * @param {string} url - The URL to open
 */
function openExternalLink(url) {
    // Check if the app is running in PWA/standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
        // In PWA mode - open in system browser
        window.open(url, '_system');
    } else {
        // In normal browser mode - open in new tab
        window.open(url, '_blank');
    }
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
