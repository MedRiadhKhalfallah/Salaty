// screenSize.js
const { ipcRenderer } = require('electron');
const { state } = require('./globalStore');

class ScreenSizeManager {
    constructor() {
        this.currentScreenSize = 'small'; // 'small' or 'big'
    }
    
    async applyScreenSize() {
        const useBigScreen = state.settings?.bigScreen || false;
        const targetSize = useBigScreen ? 'big' : 'small';
        
        if (this.currentScreenSize !== targetSize) {
            this.currentScreenSize = targetSize;
            
            // Apply the size
            if (targetSize === 'big') {
                await ipcRenderer.invoke('resize-window', 850, 600);
            } else {
                await ipcRenderer.invoke('resize-window', 320, 575);
            }
        }
        return targetSize;
    }
    
    getWindowSize() {
        const useBigScreen = state.settings?.bigScreen || false;
        return useBigScreen ? { width: 850, height: 600 } : { width: 320, height: 575 };
    }
    
    isBigScreen() {
        return state.settings?.bigScreen || false;
    }
    
    getCurrentSize() {
        return this.currentScreenSize;
    }
    
    // Centralized toggle function
    async toggleScreenSize(containerClass = '') {
        const isCurrentlyBig = this.currentScreenSize === 'big';
        const newSize = isCurrentlyBig ? 'small' : 'big';
        
        console.log(`toggleScreenSize: Switching FROM ${isCurrentlyBig ? 'BIG to SMALL' : 'SMALL to BIG'}`);
        
        // Resize window
        if (isCurrentlyBig) {
            await ipcRenderer.invoke('resize-window', 320, 575);
        } else {
            await ipcRenderer.invoke('resize-window', 850, 600);
        }
        
        // Update body attributes and classes
        document.body.setAttribute('data-screen-size', newSize);
        
        document.body.classList.remove('big-screen', 'small-screen');
        document.body.classList.add(`${newSize}-screen`);
        
        // Update container class if provided
        if (containerClass) {
            const container = document.querySelector(`.${containerClass}`);
            if (container) {
                container.classList.remove('big-screen', 'small-screen');
                container.classList.add(`${newSize}-screen`);
            }
        }
        
        this.currentScreenSize = newSize;
        
        // Update button state
        this.updateScreenSizeButton();
        
        return newSize;
    }
    
    // Update any screen size button on the page
    updateScreenSizeButton() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (!fullscreenBtn) return;
        
        const isBigScreen = this.currentScreenSize === 'big';
        console.log('updateScreenSizeButton: Current screen size is', isBigScreen ? 'BIG' : 'SMALL');
        
        const icon = fullscreenBtn.querySelector('i');
        if (isBigScreen) {
            // Currently big → button should say "Small Screen"
            fullscreenBtn.setAttribute('aria-label', 'Switch to Small Screen');
            if (icon) {
                icon.className = 'fas fa-compress';
            }
        } else {
            // Currently small → button should say "Big Screen"
            fullscreenBtn.setAttribute('aria-label', 'Switch to Big Screen');
            if (icon) {
                icon.className = 'fas fa-expand';
            }
        }
    }
    
    // Initialize screen size on a page
    initPageScreenSize(containerClass = '') {
        const useBigScreen = this.isBigScreen();
        console.log('Initial screen size preference:', useBigScreen ? 'big' : 'small');
        
        this.currentScreenSize = useBigScreen ? 'big' : 'small';
        
        // Set body attributes and classes
        document.body.setAttribute('data-screen-size', this.currentScreenSize);
        document.body.classList.remove('big-screen', 'small-screen');
        document.body.classList.add(`${this.currentScreenSize}-screen`);
        
        // Set container class if provided
        if (containerClass) {
            const container = document.querySelector(`.${containerClass}`);
            if (container) {
                container.classList.remove('big-screen', 'small-screen');
                container.classList.add(`${this.currentScreenSize}-screen`);
            }
        }
        
        // Update button state
        this.updateScreenSizeButton();
    }
}

// Export singleton instance
module.exports = new ScreenSizeManager();