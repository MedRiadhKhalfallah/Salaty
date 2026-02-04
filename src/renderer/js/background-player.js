const { ipcRenderer } = require('electron');

// ─────────────────────────────────────────────
// DOM refs (resolved once DOM is ready)
// ─────────────────────────────────────────────
let titleEl, artistEl, playBtn, prevBtn, nextBtn, playlistBtn, closeBtn;

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let tracks = [];          // full track list (refreshed via IPC)
let currentIndex = -1;
let isPlaying = false;
let sound = null;         // current Howl instance

// ─────────────────────────────────────────────
// THEME — the fix lives here
// ─────────────────────────────────────────────
/**
 * Fetches the saved theme from main-process settings and applies it to <body>.
 * Falls back to 'navy' if anything goes wrong.
 * Every step is logged so you can trace issues in the DevTools of THIS window
 * (player-manager opens it as a BrowserWindow — attach DevTools there).
 */
async function initTheme() {
    console.log('[MiniPlayer Theme] initTheme() started');

    try {
        // This is a SEPARATE renderer process from the main window.
        // It must make its OWN call to get-settings via IPC.
        const settings = await ipcRenderer.invoke('get-settings');

        console.log('[MiniPlayer Theme] settings received from main process:', settings);

        if (!settings) {
            console.warn('[MiniPlayer Theme] settings is null/undefined → falling back to navy');
            applyTheme('navy');
            return;
        }

        const theme = settings.theme;
        console.log('[MiniPlayer Theme] theme value from settings:', theme);

        if (!theme || typeof theme !== 'string' || theme.trim() === '') {
            console.warn('[MiniPlayer Theme] theme is empty/invalid → falling back to navy');
            applyTheme('navy');
            return;
        }

        applyTheme(theme);

    } catch (err) {
        console.error('[MiniPlayer Theme] ERROR while fetching settings:', err);
        console.warn('[MiniPlayer Theme] Falling back to navy due to error');
        applyTheme('navy');
    }
}

/**
 * Strips any existing theme-* class from <body> and adds the new one.
 */
function applyTheme(themeName) {
    const body = document.body;

    // Remove every class that starts with "theme-"
    const before = body.className;
    body.className = body.className
        .split(' ')
        .filter(c => !c.startsWith('theme-'))
        .join(' ');

    // Add the target theme
    const targetClass = `theme-${themeName}`;
    body.classList.add(targetClass);

    console.log(`[MiniPlayer Theme] applyTheme("${themeName}")  |  before: "${before}"  →  after: "${body.className}"`);
}

// ─────────────────────────────────────────────
// PLAYER LOGIC
// ─────────────────────────────────────────────
function playTrackAt(index) {
    if (index < 0 || index >= tracks.length) {
        console.warn('[MiniPlayer] playTrackAt: index out of range', index, 'tracks.length:', tracks.length);
        return;
    }

    // Stop current sound cleanly
    if (sound) {
        sound.stop();
        sound.unload();
        sound = null;
    }

    currentIndex = index;
    const track = tracks[currentIndex];
    console.log('[MiniPlayer] Playing track', currentIndex, ':', track.title);

    sound = new Howl({
        src: [track.url],
        html5: true,
        onplay() {
            isPlaying = true;
            updateUI();
            broadcastState();
        },
        onpause() {
            isPlaying = false;
            updateUI();
            broadcastState();
        },
        onstop() {
            isPlaying = false;
            updateUI();
            broadcastState();
        },
        onerror(id, error) {
            console.error('[MiniPlayer] Howler error on track', currentIndex, ':', error);
        },
        onend() {
            console.log('[MiniPlayer] Track ended, going to next');
            playTrackAt(currentIndex + 1 < tracks.length ? currentIndex + 1 : 0);
        },
        onload() {
            console.log('[MiniPlayer] Track loaded, duration:', sound.duration());
        }
    });

    sound.play();
}

function updateUI() {
    if (!titleEl || !artistEl || !playBtn) return;

    if (currentIndex >= 0 && currentIndex < tracks.length) {
        const track = tracks[currentIndex];
        titleEl.innerText  = track.title;
        artistEl.innerText = track.artist;
    }

    // Swap play / pause icon
    playBtn.innerHTML = isPlaying
        ? '<i class="fas fa-pause"></i>'
        : '<i class="fas fa-play"></i>';
}

/**
 * Sends the current player state back to the main window
 * so playlist.js / mini-player.js can react.
 */
function broadcastState() {
    const state = {
        isPlaying,
        currentTrack: currentIndex >= 0 && currentIndex < tracks.length
            ? tracks[currentIndex]
            : null,
        volume: Howler.volume()
    };

    ipcRenderer.send('player-update', { type: 'state', state });
    console.log('[MiniPlayer] broadcastState →', JSON.stringify(state));
}

function broadcastTimeUpdate() {
    if (!sound) return;
    ipcRenderer.send('player-update', {
        type: 'time-update',
        currentTime: sound.seek(),
        duration: sound.duration()
    });
}

// ─────────────────────────────────────────────
// IPC: commands coming IN from main / playlist
// ─────────────────────────────────────────────
ipcRenderer.on('player-command', (event, arg) => {
    console.log('[MiniPlayer] Received player-command:', JSON.stringify(arg));

    switch (arg.type) {
        case 'play':
            // arg.index = index into tracks[]
            if (typeof arg.index === 'number') {
                playTrackAt(arg.index);
            }
            break;

        case 'pause':
            if (sound && sound.playing()) {
                sound.pause();
            }
            break;

        case 'resume':
            if (sound) {
                sound.play();
            }
            break;

        case 'next':
            playTrackAt(currentIndex + 1 < tracks.length ? currentIndex + 1 : 0);
            break;

        case 'prev':
            playTrackAt(currentIndex - 1 >= 0 ? currentIndex - 1 : tracks.length - 1);
            break;

        case 'seek':
            if (sound) {
                sound.seek(arg.value);
                console.log('[MiniPlayer] Seeked to', arg.value);
            }
            break;

        case 'volume':
            if (typeof arg.value === 'number') {
                Howler.volume(arg.value);
                console.log('[MiniPlayer] Volume set to', arg.value);
                broadcastState();
            }
            break;

        case 'refresh-tracks':
            // playlist.js sends this after loading tracks from archive.org.
            // We receive the track list so we can play by index.
            if (Array.isArray(arg.tracks) && arg.tracks.length > 0) {
                tracks = arg.tracks;
                console.log('[MiniPlayer] Tracks refreshed, count:', tracks.length);
            } else {
                console.warn('[MiniPlayer] refresh-tracks arrived but arg.tracks is missing or empty:', arg.tracks);
            }
            break;

        case 'get-state':
            // Someone asked for the current state – broadcast it immediately
            broadcastState();
            break;

        default:
            console.warn('[MiniPlayer] Unknown player-command type:', arg.type);
    }
});

// ─────────────────────────────────────────────
// THEME LIVE UPDATE — listen for theme changes
// ─────────────────────────────────────────────
ipcRenderer.on('theme-changed', (event, newTheme) => {
    console.log('[MiniPlayer] theme-changed event received, new theme:', newTheme);
    applyTheme(newTheme);
});

// ─────────────────────────────────────────────
// TIME TICKER — sends time-update every 250 ms
// ─────────────────────────────────────────────
setInterval(() => {
    if (sound && isPlaying) {
        broadcastTimeUpdate();
    }
}, 250);

// ─────────────────────────────────────────────
// BUTTON WIRING
// ─────────────────────────────────────────────
function wireButtons() {
    titleEl      = document.getElementById('title');
    artistEl     = document.getElementById('artist');
    playBtn      = document.getElementById('playBtn');
    prevBtn      = document.getElementById('prevBtn');
    nextBtn      = document.getElementById('nextBtn');
    playlistBtn  = document.getElementById('miniPlaylistBtn');
    closeBtn     = document.getElementById('closeBtn');

    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            sound?.pause();
        } else {
            sound?.play();
        }
    });

    prevBtn.addEventListener('click', () => {
        playTrackAt(currentIndex - 1 >= 0 ? currentIndex - 1 : tracks.length - 1);
    });

    nextBtn.addEventListener('click', () => {
        playTrackAt(currentIndex + 1 < tracks.length ? currentIndex + 1 : 0);
    });

    playlistBtn.addEventListener('click', async () => {
        console.log('[MiniPlayer] Playlist button clicked → showing main window with playlist');
        // Hide mini player
        ipcRenderer.send('close-mini-player');
        // Tell main process to show and navigate main window to playlist
        await ipcRenderer.invoke('show-playlist-in-main');
    });

    closeBtn.addEventListener('click', () => {
        console.log('[MiniPlayer] Close button clicked → hiding mini player');
        ipcRenderer.send('close-mini-player');
    });

    console.log('[MiniPlayer] Buttons wired successfully');
}

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[MiniPlayer] DOMContentLoaded fired');

    // 1. Wire buttons first so UI is interactive immediately
    wireButtons();

    // 2. Apply the theme — THIS is the fix.
    //    Must run here because this is a separate BrowserWindow;
    //    the main window's theme logic does NOT affect us.
    await initTheme();

    console.log('[MiniPlayer] Fully initialised. Body classes:', document.body.className);
});