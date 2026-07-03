const ChatApp = {
    chats: [],
    currentChatId: null,
    
    init: () => {
        if(!Auth.currentUser) return;
        document.getElementById('username-display').textContent = Auth.currentUser.username;
        document.getElementById('user-avatar').src = Auth.currentUser.avatar;
        
        ChatApp.loadChats();
        
        document.getElementById('send-btn').addEventListener('click', ChatApp.handleSend);
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ChatApp.handleSend(); }
        });
        document.getElementById('new-chat-btn').addEventListener('click', ChatApp.createNewChat);
        document.getElementById('logout-btn').addEventListener('click', Auth.logout);
        document.getElementById('clear-current-chat').addEventListener('click', ChatApp.deleteCurrentChat);
        
        // Auto resize textarea
        const tx = document.getElementById('chat-input');
        tx.addEventListener('input', function() {
            this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px';
        });
    },

    loadChats: () => {
        ChatApp.chats = DB.get(`chats_${Auth.currentUser.id}`) || [];
        ChatApp.renderChatList();
        if(ChatApp.chats.length > 0) ChatApp.openChat(ChatApp.chats[0].id);
        else ChatApp.createNewChat();
    },

    saveChats: () => { DB.set(`chats_${Auth.currentUser.id}`, ChatApp.chats); },

    createNewChat: () => {
        const id = 'c' + Date.now();
        ChatApp.chats.unshift({ id, title: 'Cuộc trò chuyện mới', messages: [] });
        ChatApp.saveChats();
        ChatApp.renderChatList();
        ChatApp.openChat(id);
    },

    renderChatList: () => {
        const list = document.getElementById('chat-list');
        list.innerHTML = ChatApp.chats.map(c => `
            <li class="chat-item ${c.id === ChatApp.currentChatId ? 'active' : ''}" onclick="ChatApp.openChat('${c.id}')">
                <span>💬 ${c.title}</span>
            </li>
        `).join('');
    },

    openChat: (id) => {
        ChatApp.currentChatId = id;
        ChatApp.renderChatList();
        const chat = ChatApp.chats.find(c => c.id === id);
        document.getElementById('current-chat-title').textContent = chat.title;
        
        const box = document.getElementById('chat-box');
        if(chat.messages.length === 0) {
            box.innerHTML = `<div class="welcome-screen"><h1 class="neon-text">How can I help you today?</h1></div>`;
        } else {
            box.innerHTML = chat.messages.map(m => `
                <div class="message ${m.role === 'user' ? 'msg-user' : 'msg-ai'}">
                    ${ChatApp.parseMarkdown(m.content)}
                </div>
            `).join('');
            ChatApp.scrollToBottom();
        }
    },

    deleteCurrentChat: () => {
        if(!confirm('Xóa cuộc trò chuyện này?')) return;
        ChatApp.chats = ChatApp.chats.filter(c => c.id !== ChatApp.currentChatId);
        ChatApp.saveChats();
        ChatApp.loadChats();
    },

    handleSend: async () => {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if(!text) return;
        
        input.value = ''; input.style.height = 'auto';
        
        const chat = ChatApp.chats.find(c => c.id === ChatApp.currentChatId);
        if(chat.messages.length === 0) {
            chat.title = text.substring(0, 30) + '...'; // Auto rename
            ChatApp.renderChatList();
        }
        
        // Add User Message
        chat.messages.push({ role: 'user', content: text });
        ChatApp.saveChats();
        ChatApp.openChat(chat.id); // Re-render

        // Add Loading
        const box = document.getElementById('chat-box');
        const loadingId = 'load-' + Date.now();
        box.innerHTML += `<div id="${loadingId}" class="message msg-ai neon-text">... Typing ...</div>`;
        ChatApp.scrollToBottom();

        // Call API
        const apiConfig = DB.get('api_config');
        if(!apiConfig || !apiConfig.key) {
            document.getElementById(loadingId).innerHTML = "⚠️ Lỗi: API Key chưa được cấu hình. Vui lòng liên hệ Admin.";
            return;
        }

        try {
            // Build history format for Groq
            const history = chat.messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
            
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
                body: JSON.stringify({ model: apiConfig.model, messages: history, temperature: parseFloat(apiConfig.temp) })
            });
            const data = await res.json();
            
            document.getElementById(loadingId).remove();
            
            if(data.error) throw new Error(data.error.message);
            
            const reply = data.choices[0].message.content;
            chat.messages.push({ role: 'ai', content: reply });
            ChatApp.saveChats();
            
            // Streaming effect simulate
            box.innerHTML += `<div class="message msg-ai" id="stream-msg"></div>`;
            ChatApp.streamText('stream-msg', ChatApp.parseMarkdown(reply));
            
        } catch(e) {
            document.getElementById(loadingId).remove();
            box.innerHTML += `<div class="message msg-ai" style="color:var(--danger)">Lỗi: ${e.message}</div>`;
        }
    },

    streamText: (elementId, htmlContent) => {
        const el = document.getElementById(elementId);
        el.innerHTML = htmlContent;
        el.removeAttribute('id');
        ChatApp.scrollToBottom();
        ChatApp.attachCopyEvents();
    },

    scrollToBottom: () => {
        const box = document.getElementById('chat-box');
        box.scrollTop = box.scrollHeight;
    },

    // Custom Regex-based Markdown Parser
    parseMarkdown: (text) => {
        let html = text.replace(/</g, "&lt;").replace(/>/g, "&gt;"); // XSS protect
        // Code block
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><button class="copy-code-btn" onclick="ChatApp.copyText(this)">Copy</button><code class="language-$1">$2</code></pre>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
        html = html.replace(/\n/g, '<br>'); // New line
        return html;
    },

    copyText: (btn) => {
        const code = btn.nextElementSibling.innerText;
        navigator.clipboard.writeText(code);
        btn.innerText = "Copied!";
        setTimeout(() => btn.innerText = "Copy", 2000);
    },
    
    attachCopyEvents: () => {} 
};

// Check if on index.html
if(document.getElementById('chat-box')) {
    window.onload = ChatApp.init;
}
