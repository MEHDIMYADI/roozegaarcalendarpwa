# Roozegaar Calendar | تقویم روزگار

<a href="https://dimyadi.ir/roozegaar-calendar" target="_blank">Roozegaar Calendar PWA Live</a>

---

![Calendar Preview](https://img.shields.io/badge/Roozegaar-Calendar-blue)
![License](https://img.shields.io/badge/License-GNU-green)
![PWA](https://img.shields.io/badge/PWA-Ready-orange)

---

<details>
<summary>🇮🇷 فارسی</summary>

# تقویم روزگار

یک تقویم دو زبانه مدرن و واکنش‌گرا با قابلیت نمایش همزمان تقویم‌های شمسی (جلالی) و میلادی، مدیریت رویدادها و پشتیبانی از PWA.

## 🌟 ویژگی‌ها

### 📅 قابلیت‌های تقویم
- **نمایش موازی**: نمایش همزمان تقویم شمسی و میلادی در کنار هم  
- **قالب روز**: نمایش نام روز، نام ماه و تاریخ عددی در هر سلول  
- **تبدیل خودکار**: تبدیل خودکار تاریخ بین سیستم‌های شمسی و میلادی  
- **رویدادها**: افزودن، مشاهده و حذف رویدادها  
- **ناوبری**: حرکت بین ماه‌ها و سال‌ها با دکمه‌های مخصوص  

### 🎨 ویژگی‌های رابط کاربری
- **طراحی واکنش‌گرا**: سازگار با دسکتاپ، تبلت و موبایل  
- **تم تیره/روشن**: قابلیت تغییر بین حالت‌های تیره و روشن  
- **دو زبانه**: پشتیبانی از فارسی و انگلیسی  
- **Long Press**: افزودن رویداد با نگه داشتن روی روزها  
- **PWA**: قابلیت نصب به عنوان اپلیکیشن  

### 🔧 فناوری‌ها
- HTML5, CSS3, JavaScript (ES6+)  
- Service Workers برای PWA  
- Local Storage برای ذخیره رویدادها  
- CSS Grid و Flexbox برای Layout  

## 🚀 نصب و راه‌اندازی

### روش ۱: استفاده مستقیم
```bash
git clone https://github.com/username/Roozegaar Calendar.git
cd Roozegaar Calendar
open index.html
```

### روش ۲: استفاده به عنوان PWA
1. مرورگر را باز کنید و به آدرس `https://username.github.io/Roozegaar Calendar` بروید  
2. روی آیکون "نصب" در نوار آدرس کلیک کنید  
3. اپلیکیشن روی دستگاه شما نصب خواهد شد  

## 📁 ساختار پروژه
```
Roozegaar Calendar/
├── index.html
├── manifest.json
├── service-worker.js
├── icons/
│   ├── icon-72x72.png
│   ├── icon-192x192.png
│   └── icon-512x512.png
├── README.md
└── LICENSE
```

## 🛠️ استفاده
- **تغییر ماه**: دکمه‌های ماه قبل/بعد  
- **تغییر سال**: دکمه‌های سال قبل/بعد  
- **بازگشت به امروز**: دکمه "امروز"  

### افزودن رویداد
1. روی یک روز کلیک کرده و نگه دارید  
2. اطلاعات را وارد کنید  
3. روی "ذخیره" کلیک کنید  

### مشاهده رویدادها
- رویدادهای هر روز با نقطه آبی نمایش داده می‌شوند  

### تنظیمات
- **تم**: دکمه تیره/روشن  
- **زبان**: دکمه EN/FA  

## 🌍 پشتیبانی مرورگر
Chrome 60+ · Firefox 55+ · Safari 12+ · Edge 79+  

## 📱 پشتیبانی از PWA
- نصب روی دستگاه  
- عملکرد آفلاین  
- Push Notifications  
- اجرای مستقل  

## 🔧 توسعه‌دهنده
```javascript
const events = {
  'persian-1403-1-15': [
    { id: '123456789', title: 'جشن نوروز', description: 'آغاز سال نو شمسی', calendarType: 'persian' }
  ]
};
```

## 🤝 مشارکت
1. Fork  
2. Branch بسازید  
3. Commit کنید  
4. Push کنید  
5. Pull Request ارسال کنید  

## 📄 مجوز
GNU General Public License v3.0  

© 2025 Roozegaar Calendar  
توسعه یافته با ❤️ برای جامعه فارسی‌زبان  
MEHDIMYADI

</details>

---

<details>
<summary>🇬🇧 English</summary>

# Roozegaar Calendar

A modern, responsive dual-language calendar with simultaneous display of Persian (Jalali) and Gregorian calendars, event management, and PWA support.

## 🌟 Features

### 📅 Calendar Capabilities
- **Parallel Display**: Persian & Gregorian side by side  
- **Day Format**: Day name, month name, date number  
- **Auto Conversion**: Between Persian and Gregorian  
- **Events**: Add, view, and delete events  
- **Navigation**: Between months & years  

### 🎨 UI Features
- **Responsive Design** (desktop, tablet, mobile)  
- **Dark/Light Theme** toggle  
- **Bilingual** support (FA/EN)  
- **Long Press** to add event  
- **PWA** installable  

### 🔧 Technologies
- HTML5, CSS3, JavaScript (ES6+)  
- Service Workers  
- Local Storage  
- CSS Grid & Flexbox  

## 🚀 Installation

### Method 1
```bash
git clone https://github.com/username/Roozegaar Calendar.git
cd Roozegaar Calendar
open index.html
```

### Method 2 (PWA)
1. Go to `https://username.github.io/Roozegaar Calendar`  
2. Click **Install** in the browser  
3. Done ✅  

## 📁 Structure
```
Roozegaar Calendar/
├── index.html
├── manifest.json
├── service-worker.js
├── icons/
│   ├── icon-72x72.png
│   ├── icon-192x192.png
│   └── icon-512x512.png
├── README.md
└── LICENSE
```

## 🛠️ Usage
- **Change Month**: Prev/Next  
- **Change Year**: Prev/Next  
- **Today**: Go to current day  

### Add Event
Long press a day → Fill info → Save  

### View Events
Blue dot below day cell → Click for details  

### Settings
- **Theme**: Dark/Light toggle  
- **Language**: EN/FA toggle  

## 🌍 Browser Support
Chrome 60+ · Firefox 55+ · Safari 12+ · Edge 79+  

## 📱 PWA Support
- Installable  
- Offline mode  
- Push Notifications  
- Standalone execution  

## 🔧 Development
```javascript
const events = {
  'persian-1403-1-15': [
    { id: '123456789', title: 'Nowruz Celebration', description: 'Start of Persian New Year', calendarType: 'persian' }
  ]
};
```

## 🤝 Contributing
1. Fork  
2. Create Branch  
3. Commit  
4. Push  
5. PR  

## 📄 License
GNU GPL v3.0  

© 2025 Roozegaar Calendar  
Developed with ❤️ for the Persian-speaking community  
MEHDIMYADI
</details>
