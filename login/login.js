async function login() {
  try {
    // Виклик авторизації на Matrix сервері
    const res = await fetch('https://matrix.org/_matrix/client/r0/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'm.login.password',
        user: this.username,
        password: this.password
      })
    });

    const data = await res.json();

    if (data.access_token) {
      this.accessToken = data.access_token;
      this.userId = data.user_id;
      this.error = '';

      // Якщо є функції для оновлення кімнат і повідомлень
      if (this.fetchRoomsWithNames) await this.fetchRoomsWithNames();
      if (this.fetchMessages) this.fetchMessages();

      // Оновлення даних кожні 5 секунд
      setInterval(() => {
        if (this.fetchRoomsWithNames) this.fetchRoomsWithNames();
        if (this.fetchMessages) this.fetchMessages();
      }, 5000);
    } else {
      this.error = 'Login failed: ' + (data.error || 'Unknown error');
      console.error(data);
    }
  } catch (e) {
    this.error = 'Error during login: ' + e.message;
    console.error(e);
  }
}
