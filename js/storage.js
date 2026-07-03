const DB = {
    get: (key) => JSON.parse(localStorage.getItem(key) || 'null'),
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    init: () => {
        if (!DB.get('users')) {
            // Tạo tài khoản admin mặc định: admin / admin
            DB.set('users', [{ id: 'u1', username: 'admin', password: btoa('admin'), role: 'admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' }]);
        }
        if (!DB.get('api_config')) {
            DB.set('api_config', { key: '', model: 'llama-3.3-70b-versatile', temp: 0.7, maxTokens: 4096 });
        }
        if (!DB.get('app_settings')) {
            DB.set('app_settings', { theme: 'dark' });
        }
        if (!DB.get('logs')) DB.set('logs', []);
    },
    log: (action, details) => {
        const logs = DB.get('logs');
        logs.unshift({ time: new Date().toISOString(), action, details });
        DB.set('logs', logs.slice(0, 100)); // Giữ 100 log gần nhất
    },
    showToast: (msg, type = 'success') => {
        const toast = document.getElementById('toast');
        if(!toast) return;
        toast.textContent = msg;
        toast.style.borderColor = type === 'error' ? 'var(--danger)' : 'var(--accent-color)';
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }
};
DB.init();
