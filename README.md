<div align="center">

<img src="https://github.com/user-attachments/assets/3be14f59-2663-42da-b370-93c8e796f0bb" alt="Salaty – Beautiful Islamic Prayer Times Desktop App" width="380"/>

A beautiful, lightweight, always-on-top **Electron.js** desktop app that shows accurate Islamic prayer times with a modern glassmorphism design and 11 stunning themes.

**Made with love for the Muslim Ummah**

<p align="center">
  <img src="https://img.shields.io/badge/Electron-22.x-47848F?logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/Platform-Windows%20·%20macOS%20·%20Linux-blue" />
</p>

---
</div>

## Features

- ⏰ Accurate prayer times powered by **Aladhan.com API**
- 🎨 11 hand-crafted themes  
  Navy • Green • Brown • Gold • Pink • Purple • Emerald • Ocean • Royal • Indigo • Classic
- 🕒 Live countdown to next prayer
- ✨ Current & next prayer highlight
- 📅 Hijri + Gregorian date
- 🖥️ Always on top & frameless window
- 💾 Remembers city, country, theme, and window position
- 🪟 Glassmorphism UI with smooth animations
- 🌐 Offline capable after first load
- 💻 Cross-platform: Windows • macOS • Linux

| Home (Navy Theme)                          | Settings                                   | Royal Theme                                |
|--------------------------------------------|--------------------------------------------|--------------------------------------------|
| <img src="https://github.com/user-attachments/assets/95c8f7d0-6fa5-4d66-a857-527f573550d1" width="300"/> | <img src="https://github.com/user-attachments/assets/677e38cc-5cee-4f8f-886b-9f089e64ae0d" width="300"/> | <img src="https://github.com/user-attachments/assets/b3fd74b9-3edf-4326-969b-7eeac5e6009d" width="300"/> |

---

## Quick Start

### Prerequisites

- Node.js ≥ 14
- npm or yarn

### Run locally

```bash
git clone https://github.com/yassindaboussi/Salaty.git
cd Salaty
npm install
npm start
```

### Build for your platform

```bash
npm run build    # Build for current platform
npm run dist     # Create distributables
```

---

## How To Use

- **First Launch** 🆕: App opens with default location (Tunis, Tunisia)
- **Change Location** 📍: Click the ⚙️ settings gear → Enter your city and country
- **Select Theme** 🎨: Choose from 11 color themes in settings
- **View Prayers** 🕌: All five daily prayers, current prayer highlighted
- **Countdown** ⏳: Real-time countdown to next prayer

---

## Technical Details

**Built With**  
- Electron – Cross-platform desktop framework  
- HTML/CSS/JavaScript – Frontend technologies  
- Aladhan API – Accurate prayer times calculation  
- Font Awesome – Beautiful icons  

**API Integration**  
Uses Aladhan API for precise prayer times based on:

- 🗺️ Geographic location (city/country)
- 📅 Current date
- 📿 Islamic calendar dates

**Key Features**

- Frameless Window 🪟 – Custom title bar with minimize/close controls
- Auto-refresh 🔄 – Updates prayer times hourly
- Error Handling 🛡️ – Graceful network error management
- Responsive Design 📱 – Adapts to different screen sizes

---

## Theme Preview

| Theme   | Color & Style         |
|:--------|:---------------------|
| 🟦 Navy | Deep Blue, Professional |
| 🟩 Green | Natural Green, Calming |
| 🟫 Brown | Earthy Brown, Traditional |
| 🟨 Gold | Rich Gold, Elegant |
| 🟥 Pink | Vibrant Pink, Modern |
| 🟪 Purple | Royal Purple, Regal |
| 🟦 Emerald | Sophisticated Teal, Refined |
| 🌊 Ocean | Fresh Blue, Clean |
| 👑 Royal | Classic Blue, Timeless |
| 🟦 Indigo | Deep Indigo, Night |
| ⚫ Classic | Minimal Dark, Simple |

---

## Contributing

Contributions are very welcome!  
Whether it's a new theme, better calculation method, adhan playback, widgets, or translations – everything helps the Ummah.

**Steps to contribute:**

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-idea`)
3. Commit your changes (`git commit -m 'Add amazing idea'`)
4. Push to the branch (`git push origin feature/amazing-idea`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- 🕋 Prayer times data by [Aladhan.com](https://aladhan.com/)
- ✨ Icons by [Font Awesome](https://fontawesome.com/) & Flaticon
- ⚡ Built with [Electron](https://www.electronjs.org/)