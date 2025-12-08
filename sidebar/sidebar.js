// sidebar.js - Функції для роботи з кімнатами

// Функція для створення нової кімнати
async function createRoom() {
    if (!this.accessToken || !this.newRoomName) {
        this.error = "Please provide a room name";
        return;
    }
    
    try {
        const res = await fetch(
            'https://matrix.org/_matrix/client/r0/createRoom',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    name: this.newRoomName,
                    preset: 'private_chat',
                    visibility: 'private'
                })
            }
        );
        
        if (res.ok) {
            const data = await res.json();
            this.newRoomId = data.room_id;
            console.log('Room created:', this.newRoomId);
            this.newRoomName = ''; // Очистити поле
            
            // Оновити список кімнат
            await this.fetchRoomsWithNames();
        } else {
            const errorData = await res.json();
            this.error = `Failed to create room: ${errorData.error || 'Unknown error'}`;
        }
    } catch (e) {
        console.error('Error creating room:', e);
        this.error = 'Error creating room';
    }
}

// Функція для отримання списку кімнат з назвами
async function fetchRoomsWithNames() {
    if (!this.accessToken) return;
    
    try {
        // Отримати список кімнат
        const res = await fetch(
            'https://matrix.org/_matrix/client/r0/joined_rooms',
            {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            }
        );
        
        if (res.ok) {
            const data = await res.json();
            const roomIds = data.joined_rooms || [];
            
            // Для кожної кімнати отримати деталі (назву)
            const roomsWithNames = await Promise.all(
                roomIds.map(async (roomId) => {
                    try {
                        const roomRes = await fetch(
                            `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/state/m.room.name`,
                            {
                                headers: { 'Authorization': `Bearer ${this.accessToken}` }
                            }
                        );
                        
                        if (roomRes.ok) {
                            const roomData = await roomRes.json();
                            return {
                                roomId: roomId,
                                name: roomData.name || roomId
                            };
                        } else {
                            return {
                                roomId: roomId,
                                name: roomId
                            };
                        }
                    } catch (e) {
                        console.error(`Error fetching name for room ${roomId}:`, e);
                        return {
                            roomId: roomId,
                            name: roomId
                        };
                    }
                })
            );
            
            this.rooms = roomsWithNames;
            
            // Автоматично вибрати першу кімнату, якщо немає вибраної
            if (roomsWithNames.length > 0 && !this.roomId) {
                this.roomId = roomsWithNames[0].roomId;
                this.switchRoom(this.roomId);
            }
        }
    } catch (e) {
        console.error('Error fetching rooms:', e);
    }
}

// Функція для отримання назви кімнати
async function getRoomName(roomId) {
    if (!this.accessToken) return roomId;
    
    try {
        const res = await fetch(
            `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/state/m.room.name`,
            {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            }
        );
        
        if (res.ok) {
            const data = await res.json();
            return data.name || roomId;
        }
        return roomId;
    } catch (e) {
        console.error('Error getting room name:', e);
        return roomId;
    }
}