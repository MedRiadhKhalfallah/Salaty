const {ipcRenderer} = require('electron');
const screenSizeManager = require('../js/screenSize');
const { getAudioAlbums } = require('../js/config-api/api');
let audioAlbums = require('../data/audio_albums.json');
const { setLanguage, t,getLanguage } = require('../js/translations');

// Helper to get translated string
function getLocalized(obj) {
    if (typeof obj === 'string') return obj;
    if (!obj) return '';
    const lang = getLanguage();
    return obj[lang] || obj['en'] || Object.values(obj)[0] || '';
}

class AlbumsManager {
    constructor() {
        this.initElements();
        this.initListeners();
    }

    async init() {
        await this.loadSettings();
        await this.initTheme();
        await this.initScreenSize();

        // Update data from API
        try {
            const data = await getAudioAlbums();
            if (data) audioAlbums = data;
        } catch (error) {
            console.error('Failed to update albums from API:', error);
        }

        this.updateTranslations();
        this.displayAlbums(audioAlbums);
        return this;
    }

    async loadSettings() {
        try {
            const settings = await ipcRenderer.invoke('get-settings');
            if (settings) {
                const {state} = require('../js/globalStore');
                state.settings = {...state.settings, ...settings};
                if (settings.language) {
                    setLanguage(settings.language);
                    // applyLanguageDirection(); // Disabled by request: keep LTR
                }
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    }

    updateTranslations() {
        const titleEl = document.querySelector('.albums-title');
        if (titleEl) titleEl.innerText = t('audioArchive');

        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.placeholder = t('searchAlbums');

        const backBtn = document.getElementById('backBtn');
        if (backBtn) backBtn.setAttribute('aria-label', t('back'));
    }

    async initTheme() {
        try {
            const settings = await ipcRenderer.invoke('get-settings');
            console.log('Albums: settings loaded for theme:', settings);
            if (settings?.theme) {
                const app = document.getElementById('app');
                const classes = app.className.split(' ').filter(c => !c.startsWith('theme-'));
                const newTheme = `theme-${settings.theme}`;
                app.className = classes.join(' ') + ` ${newTheme}`;
                console.log('Albums: Applied theme:', newTheme);
            }
        } catch (err) {
            console.error('Failed to load theme:', err);
            document.getElementById('app').classList.add('theme-navy');
        }
    }

    async initScreenSize() {
        const useBigScreen = await screenSizeManager.applyScreenSize();
        if (useBigScreen) {
            document.body.dataset.screenSize = 'big';
            document.body.classList.add('big-screen');
            document.querySelector('.albums-container')?.classList.add('big-screen');
        } else {
            document.body.dataset.screenSize = 'small';
            document.body.classList.add('small-screen');
            document.querySelector('.albums-container')?.classList.add('small-screen');
        }
    }

    initElements() {
        this.minimizeBtn = document.getElementById('minimizeBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.closeBtn = document.getElementById('closeBtn');
        this.backBtn = document.getElementById('backBtn');
        this.searchInput = document.getElementById('searchInput');
        this.albumsGrid = document.getElementById('albumsGrid');

        // Update fullscreen button initial state
        this.updateScreenSizeButton();

    }

    initListeners() {
        this.minimizeBtn?.addEventListener('click', async () => {
            await ipcRenderer.invoke('minimize-window');
        });

        this.closeBtn?.addEventListener('click', async () => {
            await ipcRenderer.invoke('close-window');
        });
        // Add fullscreen button listener
        if (this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => this.toggleScreenSize());
        }

        this.backBtn?.addEventListener('click', async () => {
            const currentSize = screenSizeManager.isBigScreen() ? {width: 850, height: 600} : {width: 320, height: 575};
            await ipcRenderer.invoke('resize-window', currentSize.width, currentSize.height);
            await ipcRenderer.invoke('navigate-to', 'features');
        });

        this.searchInput?.addEventListener('input', () => {
            this.filterAlbums(this.searchInput.value.trim());
        });
    }

    toggleScreenSize() {
        const isCurrentlyBig = document.body.dataset.screenSize === 'big';
        console.log('toggleScreenSize: Switching FROM', isCurrentlyBig ? 'BIG to SMALL' : 'SMALL to BIG');

        if (isCurrentlyBig) {
            // Switch FROM big TO small screen
            ipcRenderer.invoke('resize-window', 320, 575);
            document.body.dataset.screenSize = 'small';
            document.body.classList.remove('big-screen');
            document.body.classList.add('small-screen');
            document.querySelector('.playlist-container')?.classList.remove('big-screen');
            document.querySelector('.playlist-container')?.classList.add('small-screen');
        } else {
            // Switch FROM small TO big screen
            ipcRenderer.invoke('resize-window', 850, 600);
            document.body.dataset.screenSize = 'big';
            document.body.classList.remove('small-screen');
            document.body.classList.add('big-screen');
            document.querySelector('.playlist-container')?.classList.remove('small-screen');
            document.querySelector('.playlist-container')?.classList.add('big-screen');
        }

        this.updateScreenSizeButton();
    }

    updateScreenSizeButton() {
        if (!this.fullscreenBtn) return;

        const isBigScreen = document.body.dataset.screenSize === 'big';
        console.log('updateScreenSizeButton: Current screen size is', isBigScreen ? 'BIG' : 'SMALL');

        const icon = this.fullscreenBtn.querySelector('i');
        if (isBigScreen) {
            // Currently big → button should say "Small Screen"
            this.fullscreenBtn.setAttribute('aria-label', 'Switch to Small Screen');
            if (icon) {
                icon.className = 'fas fa-compress';
            }
        } else {
            // Currently small → button should say "Big Screen"
            this.fullscreenBtn.setAttribute('aria-label', 'Switch to Big Screen');
            if (icon) {
                icon.className = 'fas fa-expand';
            }
        }
    }

    filterAlbums(query) {
        if (!query) {
            this.displayAlbums(audioAlbums);
            return;
        }
        const lower = query.toLowerCase();
        const filtered = audioAlbums.filter(a =>
            getLocalized(a.title).toLowerCase().includes(lower) ||
            getLocalized(a.artist).toLowerCase().includes(lower)
        );
        this.displayAlbums(filtered);
    }

    displayAlbums(albums) {
        this.albumsGrid.innerHTML = '';
        if (albums.length === 0) {
            this.albumsGrid.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>${t('noTracksFound')}</p></div>`;
            return;
        }

        const categories = {};
        albums.forEach(album => {
            const cat = getLocalized(album.category) || 'Other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(album);
        });

        Object.keys(categories).forEach(catName => {
            const section = this.createSection(catName, categories[catName]);
            this.albumsGrid.appendChild(section);
        });
    }

    createSection(catName, albums) {
        const section = document.createElement('div');
        section.className = 'album-section';

        const header = document.createElement('div');
        header.className = 'category-header';

        const title = document.createElement('h3');
        title.innerText = catName;

        const icon = document.createElement('i');
        icon.className = 'fas fa-chevron-down';

        header.appendChild(title);
        header.appendChild(icon);
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'category-grid';

        albums.forEach(album => {
            const card = this.createAlbumCard(album);
            grid.appendChild(card);
        });

        let isExpanded = true;
        header.addEventListener('click', () => {
            isExpanded = !isExpanded;
            grid.style.display = isExpanded ? 'grid' : 'none';
            const isRtl = document.documentElement.dir === 'rtl';
            const rotateAngle = isRtl ? 'rotate(90deg)' : 'rotate(-90deg)';
            icon.style.transform = isExpanded ? 'rotate(0deg)' : rotateAngle;
        });

        section.appendChild(grid);
        return section;
    }

    createAlbumCard(album) {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `
            <div class="album-icon">
                <i class="${album.icon || 'fas fa-headphones'}"></i>
            </div>
            <div class="album-title">${getLocalized(album.title)}</div>
            <div class="album-artist">${getLocalized(album.artist)}</div>
        `;
        card.addEventListener('click', () => this.openAlbum(album));
        return card;
    }

    async openAlbum(album) {
        localStorage.setItem('selectedAlbum', JSON.stringify(album));
        await ipcRenderer.invoke('navigate-to', 'playlist');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const manager = new AlbumsManager();
    try {
        await manager.init();
    } catch (err) {
        console.error(err);
    }
});
