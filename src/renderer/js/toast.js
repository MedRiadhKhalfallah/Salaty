// src/renderer/js/toast.js

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const app = document.getElementById('app');
    const styles = window.getComputedStyle(app);

    const bgColor = styles.getPropertyValue('--accent-color') || 'rgba(76, 175, 80, 0.9)';
    toast.style.background = bgColor;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') {
        icon = 'exclamation-circle';
        toast.style.background = 'rgba(244, 67, 54, 0.9)';
    }

    toast.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
  `;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

module.exports = {
    showToast
};