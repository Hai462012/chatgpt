const Auth = {
    currentUser: DB.get('currentUser'),
    
    check: () => {
        if (!Auth.currentUser && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
        if (Auth.currentUser && window.location.pathname.includes('login.html')) {
            window.location.href = 'index.html';
        }
        // Hiển thị nút admin nếu là admin
        if(Auth.currentUser && Auth.currentUser.role === 'admin') {
            const adminLink = document.getElementById('admin-link');
            if(adminLink) adminLink.style.display = 'block';
        }
    },

    initLoginPage: () => {
        let isLogin = true;
        const form = document.getElementById('auth-form');
        const switchBtn = document.getElementById('auth-switch-btn');
        const title = document.getElementById('auth-title');
        const submitBtn = document.getElementById('auth-submit');
        const switchText = document.getElementById('auth-switch-text');

        switchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isLogin = !isLogin;
            title.textContent = isLogin ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ';
            submitBtn.textContent = isLogin ? 'Vào Hệ Thống' : 'Tạo Tài Khoản';
            switchText.textContent = isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?';
            switchBtn.textContent = isLogin ? 'Đăng ký ngay' : 'Đăng nhập';
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const u = document.getElementById('username').value.trim();
            const p = btoa(document.getElementById('password').value); // Encode base64 fake hash
            const users = DB.get('users');

            if (isLogin) {
                const user = users.find(x => x.username === u && x.password === p);
                if (user) {
                    DB.set('currentUser', user);
                    DB.log('Login', `User ${u} logged in`);
                    window.location.href = 'index.html';
                } else {
                    DB.showToast('Sai tài khoản hoặc mật khẩu!', 'error');
                }
            } else {
                if (users.find(x => x.username === u)) {
                    DB.showToast('Tên đăng nhập đã tồn tại!', 'error');
                    return;
                }
                const newUser = { id: 'u'+Date.now(), username: u, password: p, role: 'user', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u}` };
                users.push(newUser);
                DB.set('users', users);
                DB.log('Register', `User ${u} registered`);
                DB.showToast('Đăng ký thành công! Đang đăng nhập...');
                setTimeout(() => { DB.set('currentUser', newUser); window.location.href = 'index.html'; }, 1000);
            }
        });
    },

    logout: () => {
        DB.log('Logout', `User ${Auth.currentUser.username} logged out`);
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
};
if(!window.location.pathname.includes('admin.html')) Auth.check();
