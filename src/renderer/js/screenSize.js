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
    }
    
    getWindowSize() {
        const useBigScreen = state.settings?.bigScreen || false;
        return useBigScreen ? { width: 850, height: 600 } : { width: 320, height: 575 };
    }
    
    isBigScreen() {
        return state.settings?.bigScreen || false;
    }
}

// Export singleton instance
module.exports = new ScreenSizeManager();