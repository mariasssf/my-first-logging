// chat.js - Функції для роботи з чатом

async function sendMessage() {
  if (!this.newMessage.trim() || !this.roomId) {
    console.warn('No message or roomId');
    return;
  }
  const msg = this.newMessage.trim();
  this.newMessage = '';
  try {
    const res = await fetch(`https://matrix.org/_matrix/client/r0/rooms/${this.roomId}/send/m.room.message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({ msgtype: 'm.text', body: msg })
    });
    const data = await res.json();
    if (data.event_id) {
      this.messages.push({ id: data.event_id, body: msg, sender: this.userId });
    } else {
      console.error('Send failed:', data);
    }
  } catch (e) {
    console.error('Send message error:', e);
  }
}

async function fetchMessages() {
  if (!this.accessToken || !this.roomId) return;
  try {
    const url = this.lastSyncToken ?
      `https://matrix.org/_matrix/client/r0/sync?since=${this.lastSyncToken}&timeout=30000` :
      `https://matrix.org/_matrix/client/r0/sync?timeout=30000`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    const data = await res.json();
    if (data.next_batch) {
      this.lastSyncToken = data.next_batch;
      if (data.rooms?.join?.[this.roomId]) {
        const roomData = data.rooms.join[this.roomId];
        roomData.timeline?.events?.forEach(event => {
          if (event.type === 'm.room.message' && !this.messages.find(m => m.id === event.event_id)) {
            const newMsg = {
              id: event.event_id,
              body: event.content.body,
              sender: event.sender,
              edited: false
            };
            this.messages.push(newMsg);

            // Сповіщення + звук, ТІЛЬКИ якщо:
            // 1. Повідомлення НЕ від мене
            // 2. Вкладка НЕ активна або кімната НЕ відкрита
            if (
              event.sender !== this.userId &&
              (document.hidden || this.roomId !== this.roomId)
            ) {
              this.showDesktopNotification(event.sender, event.content.body);
              this.playNotificationSound();
            }
          }
        });
      }
      if (data.rooms?.invite) {
        for (const [room] of Object.entries(data.rooms.invite)) {
          await this.joinRoom(room);
        }
      }
      await this.fetchRoomsWithNames();
    } else {
      console.warn('No next_batch in sync response:', data);
    }
  } catch (e) {
    console.error('Fetch messages error:', e);
  }
}

// Функція початку зміни повідомлення
function startEdit(messageId, currentBody) {
  this.editMode = messageId;
  this.editText = currentBody;
  this.$nextTick(() => {
    const textarea = document.querySelector(`[x-show="editMode === '${messageId}'"] textarea`);
    if (textarea) textarea.focus();
  });
}

// Функція завершення зміни повідомлення
function cancelEdit() {
  this.editMode = null;
  this.editText = '';
}

// Збереження повідомлення
async function saveEdit(messageId) {
  if (!this.editText.trim()) return;

  try {
    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/rooms/${this.roomId}/send/m.room.message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          msgtype: 'm.text',
          body: this.editText.trim(),
          "m.new_content": true,
          "m.relates_to": {
            rel_type: "m.replace",
            event_id: messageId
          }
        })
      }
    );

    const data = await res.json();
    if (data.event_id) {
      // Оновлюємо локально
      const msg = this.messages.find(m => m.id === messageId);
      if (msg) {
        msg.body = this.editText.trim();
        msg.edited = true;
      }

      this.cancelEdit();
    } else {
      alert('Помилка редагування: ' + (data.error || ''));
    }
  } catch (e) {
    console.error('Edit error:', e);
    alert('Помилка: ' + e.message);
  }
}

// Функція видалення повідомлення
async function deleteMessage(messageId) {
  if (!confirm('Видалити повідомлення?')) return;

  try {
    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/rooms/${this.roomId}/redact/${messageId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (res.ok) {
      this.messages = this.messages.filter(m => m.id !== messageId);
    } else {
      const data = await res.json();
      alert('Не вдалося видалити: ' + (data.error || ''));
    }
  } catch (e) {
    console.error('Delete error:', e);
    alert('Помилка: ' + e.message);
  }
}

// Функція для програвання звукового сповіщення
function playNotificationSound() {
  try {
    const audio = new Audio('./chat/assets/ping.mp3');
    audio.volume = 0.5; // 50% гучності
    audio.play().catch(e => console.log('Sound blocked:', e));
  } catch (e) {
    console.error('Error playing notification sound:', e);
  }
}

// Функція для відображення десктоп сповіщення
function showDesktopNotification(sender, body) {
  if (Notification.permission !== 'granted') return;

  const title = sender === this.userId ? 'Ти' : sender.split(':')[0].substring(1);
  const options = {
    body: body.length > 100 ? body.substring(0, 97) + '...' : body,
    icon: './chat/assets/icon.png', // опціонально: додай іконку
    tag: 'matrix-chat', // уникає дублювання
    renotify: true
  };

  const notification = new Notification(title, options);

  // Закриваємо через 5 сек
  setTimeout(() => notification.close(), 5000);

  // Клік по сповіщенню → фокус на вкладку
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}