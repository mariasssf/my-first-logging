// Завантаження HTML шаблону сайдбару
async function loadSidebar() {
  const container = document.getElementById('sidebar-container');
  const html = await fetch('./sidebar/sidebar.html').then(r => r.text());
  container.innerHTML = html;
  Alpine.initTree(container);
}

// === Створення нової кімнати ===
async function createRoom() {
  if (!this.newRoomName.trim()) return;
  try {
    const res = await fetch('https://matrix.org/_matrix/client/r0/createRoom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({
        preset: 'private_chat',
        name: this.newRoomName.trim(),
        invite: this.inviteUser ? [this.inviteUser.trim()] : []
      })
    });

    const data = await res.json();
    if (data.room_id) {
      this.newRoomId = data.room_id;
      this.roomId = data.room_id;
      this.messages = [];
      this.lastSyncToken = '';
      await this.fetchRoomsWithNames();
      this.fetchMessages();
      this.inviteUser = '';
      alert(`Room "${this.newRoomName}" created with ID: ${this.newRoomId}`);
    } else {
      console.error('Create room failed:', data);
      alert('Create room failed: ' + (data.error || 'Unknown error'));
    }
  } catch (e) {
    console.error('Create room error:', e);
    alert('Create room error: ' + e.message);
  }
}

// === Завантаження списку кімнат ===
async function fetchRoomsWithNames() {
  if (!this.accessToken) return;
  try {
    const res = await fetch('https://matrix.org/_matrix/client/r0/joined_rooms', {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    const data = await res.json();
    if (data.joined_rooms) {
      const roomPromises = data.joined_rooms.map(async (roomId) => {
        const nameRes = await fetch(
          `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/state/m.room.name`,
          { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
        );
        const nameData = await nameRes.json();
        return { roomId, name: nameData?.name || this.getRoomName(roomId) || roomId };
      });
      this.rooms = (await Promise.all(roomPromises)).sort((a, b) => a.name.localeCompare(b.name));
      if (this.rooms.length > 0 && !this.roomId) {
        this.roomId = this.rooms[0].roomId;
        this.fetchMessages();
      }
    }
  } catch (e) {
    console.error('Fetch rooms error:', e);
  }
}

// === Додані функції для взаємодії chat та sidebar ===
function getRoomName(roomId) {
  return this.rooms.find(r => r.roomId === roomId)?.name || roomId;
}

function switchRoom(roomId) {
  if (roomId) this.roomId = roomId;
  this.messages = [];
  this.lastSyncToken = '';
  this.fetchMessages();
}

async function inviteUserToRoom() {
  if (!this.inviteUser.trim() || !this.roomId) {
    console.warn('No inviteUser or roomId');
    return;
  }
  try {
    const res = await fetch(`https://matrix.org/_matrix/client/r0/rooms/${this.roomId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({ user_id: this.inviteUser.trim() })
    });
    const data = await res.json();
    if (data.errcode) {
      console.error('Invite failed:', data);
      alert('Invite failed: ' + (data.error || 'Unknown error'));
    } else {
      alert(`${this.inviteUser} invited to ${this.roomId}`);
      this.inviteUser = '';
      await this.fetchRoomsWithNames();
    }
  } catch (e) {
    console.error('Invite error:', e);
    alert('Invite error: ' + e.message);
  }
}

async function joinRoom() {
  if (!this.joinRoomId.trim()) return;
  try {
    const res = await fetch(`https://matrix.org/_matrix/client/r0/join/${encodeURIComponent(this.joinRoomId.trim())}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    const data = await res.json();
    if (data.room_id) {
      this.roomId = this.joinRoomId.trim();
      this.joinRoomId = '';
      this.messages = [];
      this.lastSyncToken = '';
      await this.fetchRoomsWithNames();
      this.fetchMessages();
    } else {
      console.error('Join failed:', data);
      alert('Join failed: ' + (data.error || 'Unknown error'));
    }
  } catch (e) {
    console.error('Join room error:', e);
    alert('Join room error: ' + e.message);
  }
}
