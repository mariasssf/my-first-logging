// user.js - Функції для роботи з користувачами

// Функція для запрошення користувача до кімнати
async function inviteUserToRoom() {
    if (!this.accessToken || !this.roomId || !this.inviteUser) {
        this.error = "Please provide a user ID to invite";
        return;
    }
    
    try {
        const res = await fetch(
            `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/invite`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    user_id: this.inviteUser
                })
            }
        );
        
        if (res.ok) {
            console.log('User invited successfully');
            this.inviteUser = '';
        } else {
            const errorData = await res.json();
            this.error = `Failed to invite user: ${errorData.error || 'Unknown error'}`;
        }
    } catch (e) {
        console.error('Error inviting user:', e);
        this.error = 'Error inviting user';
    }
}

// Функція для приєднання до кімнати
async function joinRoom() {
    if (!this.accessToken || !this.joinRoomId) {
        this.error = "Please provide a room ID to join";
        return;
    }
    
    try {
        const res = await fetch(
            `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.joinRoomId)}/join`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({})
            }
        );
        
        if (res.ok) {
            const data = await res.json();
            console.log('Joined room successfully:', data.room_id);
            this.joinRoomId = '';
            await this.fetchRoomsWithNames();
        } else {
            const errorData = await res.json();
            this.error = `Failed to join room: ${errorData.error || 'Unknown error'}`;
        }
    } catch (e) {
        console.error('Error joining room:', e);
        this.error = 'Error joining room';
    }
}

// Функція для отримання учасників кімнати
async function fetchRoomMembers() {
    if (!this.accessToken || !this.roomId) return;
    
    try {
        const res = await fetch(
            `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/joined_members`,
            {
                headers: { 
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (res.ok) {
            const data = await res.json();
            this.roomMembers = Object.entries(data.joined || {}).map(([userId, info]) => ({
                userId,
                displayName: info.display_name || userId.split(':')[0].substring(1),
                avatarUrl: info.avatar_url
            }));
        } else {
            console.error('Failed to fetch room members');
            this.roomMembers = [];
        }
    } catch (e) {
        console.error('Error fetching room members:', e);
        this.roomMembers = [];
    }
}