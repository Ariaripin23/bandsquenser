const i18n = {
    id: {
        app_title: "Band Sequencer Pro",
        app_desc: "Platform live sequencer interaktif untuk band Anda. Sinkronisasi multitrack audio secara real-time tanpa ribet.",
        create_room: "Buat Room",
        create_room_desc: "Sebagai Host: Atur sesi dan bagikan audio multitrack ke anggota.",
        join_room: "Gabung Room",
        join_room_desc: "Sebagai Anggota: Masuk dengan Room ID untuk sinkronisasi otomatis.",
        your_name: "Nama Anda",
        your_role: "Peran di Band",
        role_vocal: "Vocal",
        role_lead_guitar: "Lead Guitar",
        role_rhythm_guitar: "Rhythm Guitar",
        role_bass: "Bass",
        role_drum: "Drum",
        role_keyboard: "Keyboard",
        role_other: "Lainnya",
        band_session_name: "Nama Band / Sesi Latihan",
        back: "Kembali",
        connect: "Connect",
        setlist: "Setlist Lagu",
        add_song: "+ Tambah Lagu Baru",
        preparing: "Mempersiapkan...",
        waiting_host: "Menunggu Host menyiapkan audio multitrack...",
        name_placeholder: "Misal: John",
        band_name_placeholder: "Misal: Latihan Studio Sabtu",
        room_id_placeholder: "Masukkan Room ID...",
        welcome_host: "Selamat datang {name}! Selamat memimpin latihan.",
        welcome_client: "Selamat datang {name}! Selamat latihan bersama band.",
        leave_confirm: "Yakin ingin keluar dari Room?",
        prompt_song: "Masukkan Judul Lagu:",
        bpm_label: "BPM:",
        tap: "Tap"
    },
    en: {
        app_title: "Band Sequencer Pro",
        app_desc: "Interactive live sequencer platform for your band. Real-time multitrack audio synchronization made easy.",
        create_room: "Create Room",
        create_room_desc: "As Host: Manage session and share multitrack audio to members.",
        join_room: "Join Room",
        join_room_desc: "As Member: Enter with a Room ID for automatic sync.",
        your_name: "Your Name",
        your_role: "Band Role",
        role_vocal: "Vocals",
        role_lead_guitar: "Lead Guitar",
        role_rhythm_guitar: "Rhythm Guitar",
        role_bass: "Bass",
        role_drum: "Drums",
        role_keyboard: "Keyboard",
        role_other: "Other",
        band_session_name: "Band / Session Name",
        back: "Back",
        connect: "Connect",
        setlist: "Song Setlist",
        add_song: "+ Add New Song",
        preparing: "Preparing...",
        waiting_host: "Waiting for Host to setup multitrack audio...",
        name_placeholder: "e.g. John",
        band_name_placeholder: "e.g. Saturday Studio Practice",
        room_id_placeholder: "Enter Room ID...",
        welcome_host: "Welcome {name}! Have a great session leading the practice.",
        welcome_client: "Welcome {name}! Have a great practice with the band.",
        leave_confirm: "Are you sure you want to leave the Room?",
        prompt_song: "Enter Song Title:",
        bpm_label: "BPM:",
        tap: "Tap"
    }
};

let currentLang = 'id';

document.addEventListener('DOMContentLoaded', () => {
    // --- Translation Logic ---
    function updateTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18n[currentLang][key]) {
                if (el.tagName === 'INPUT') el.value = i18n[currentLang][key];
                else el.textContent = i18n[currentLang][key];
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (i18n[currentLang][key]) el.placeholder = i18n[currentLang][key];
        });
        
        if (myUser.name) {
            updateWelcomeMessage();
        }
    }

    document.getElementById('btn-lang-id').addEventListener('click', (e) => {
        currentLang = 'id';
        document.getElementById('btn-lang-en').classList.remove('active');
        e.target.classList.add('active');
        updateTranslations();
    });
    document.getElementById('btn-lang-en').addEventListener('click', (e) => {
        currentLang = 'en';
        document.getElementById('btn-lang-id').classList.remove('active');
        e.target.classList.add('active');
        updateTranslations();
    });

    // --- Views ---
    const viewIntro = document.getElementById('intro-view');
    const viewJoin = document.getElementById('join-view');
    const viewSetup = document.getElementById('setup-view');
    const viewPlayer = document.getElementById('player-view');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    // --- Flow Buttons ---
    const btnHostFlow = document.getElementById('btn-host-flow');
    const btnJoinFlow = document.getElementById('btn-join-flow');
    const btnBacks = document.querySelectorAll('.btn-back-intro');
    
    // Join
    const btnJoinRoom = document.getElementById('btn-join-room');
    const joinRoomId = document.getElementById('join-room-id');
    const joinUserName = document.getElementById('join-user-name');
    const joinUserRole = document.getElementById('join-user-role');
    const joinStatus = document.getElementById('join-status');

    // Setup (Host)
    const btnCreateRoom = document.getElementById('btn-create-room');
    const bandNameInput = document.getElementById('band-name');
    const hostUserName = document.getElementById('host-user-name');
    const hostUserRole = document.getElementById('host-user-role');

    // Player (Lobby)
    const displayBandName = document.getElementById('display-band-name');
    const welcomeMessage = document.getElementById('welcome-message');
    const roomIdText = document.getElementById('room-id-text');
    const btnCopyId = document.getElementById('btn-copy-id');
    const userCountEl = document.getElementById('user-count');
    const usersListContainer = document.getElementById('users-list-container');
    const roleBadge = document.getElementById('role-badge');
    const btnReset = document.getElementById('btn-reset');
    const setlistContainer = document.getElementById('setlist-container');
    const btnHostAddSong = document.getElementById('btn-host-add-song');
    const clientWaitingMsg = document.getElementById('client-waiting-msg');
    const hostAddSongContainer = document.getElementById('host-add-song-container');

    // --- State ---
    let peer = null;
    let myPeerId = null;
    let isHost = false;
    
    let connections = []; // For Host
    let hostConnection = null; // For Client
    
    let myUser = { id: '', name: '', role: '', isHost: false };
    
    let roomData = {
        bandName: '',
        members: [], 
        songs: [] // { id, title, bpm, tracks: [] }
    };

    let playingIntervals = {};
    let tapTimes = {}; // for BPM Tap Tempo
    let activeSongId = null; // Accordion state
    let currentlyPlayingId = null; // Track which song is currently playing

    // --- Database / Storage for Refresh Recovery ---
    const DB_NAME = 'BandSeqDB';
    let db;
    
    function initDB(onReady) {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            db = e.target.result;
            if(!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id' });
        };
        req.onsuccess = (e) => { db = e.target.result; if(onReady) onReady(); };
        req.onerror = () => { console.warn("IndexedDB failed"); if(onReady) onReady(); };
    }
    
    function saveAllSongsToDB() {
        if(!db || !isHost) return;
        const tx = db.transaction('songs', 'readwrite');
        const store = tx.objectStore('songs');
        store.clear();
        roomData.songs.forEach(s => {
            const dbSong = {
                id: s.id, title: s.title, bpm: s.bpm, originalBpm: s.originalBpm, offset: s.offset,
                tracks: s.tracks.map(t => ({ id: t.id, name: t.name, buffer: t.audioBuffer, volume: t.volume, isMuted: t.isMuted }))
            };
            store.put(dbSong);
        });
    }

    function clearDB() {
        if(!db) return;
        const tx = db.transaction('songs', 'readwrite');
        tx.objectStore('songs').clear();
    }

    function attemptRestoreSession() {
        const saved = sessionStorage.getItem('bandSeqSession');
        if(!saved) return;
        try {
            const s = JSON.parse(saved);
            if (s.isHost) {
                if(db) {
                    showLoading("Memulihkan Sesi...");
                    const req = db.transaction('songs', 'readonly').objectStore('songs').getAll();
                    req.onsuccess = () => {
                        roomData.bandName = s.bandName;
                        myUser = s.myUser;
                        roomData.members = [myUser];
                        roomData.songs = req.result.map(dbS => ({
                            ...dbS,
                            tracks: dbS.tracks.map(t => reviveTrack(t))
                        }));
                        isHost = true;
                        
                        initPeer((id) => {
                            myUser.id = id;
                            buildLobbyUI();
                            showView(viewPlayer);
                        }, s.roomId);
                    };
                }
            } else {
                joinRoomId.value = s.roomId;
                joinUserName.value = s.myUser.name;
                joinUserRole.value = s.myUser.role;
                btnJoinRoom.click();
            }
        } catch(e) { console.error("Restore failed", e); }
    }

    // --- Navigation ---
    function showView(view) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        view.classList.add('active');
        
        if (view === viewPlayer) {
            document.body.classList.add('lobby-active');
        } else {
            document.body.classList.remove('lobby-active');
        }
    }
    function showLoading(textKey) {
        loadingText.textContent = i18n[currentLang][textKey] || textKey;
        loadingOverlay.classList.remove('hidden');
    }
    function hideLoading() { loadingOverlay.classList.add('hidden'); }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0 || seconds === Infinity) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updateTotalSetlistDuration() {
        let grandTotal = 0;
        roomData.songs.forEach(song => {
            let songMaxDur = 0;
            song.tracks.forEach(t => {
                if (t.audioEl && t.audioEl.duration && !isNaN(t.audioEl.duration)) {
                    if (t.audioEl.duration > songMaxDur) songMaxDur = t.audioEl.duration;
                }
            });
            grandTotal += songMaxDur;
            
            const sDurEl = document.getElementById(`sdur-${song.id}`);
            if (sDurEl) {
                sDurEl.textContent = songMaxDur > 0 ? `⏱️ ${formatTime(songMaxDur)}` : '';
            }
        });
        
        const totalEl = document.getElementById('total-setlist-duration');
        if (totalEl) {
            const count = roomData.songs.length;
            totalEl.textContent = `⏱️ ${count} Lagu • Total: ${formatTime(grandTotal)}`;
        }
    }

    function showToast(msg, type = 'pause') {
        const container = document.getElementById('toast-container');
        if(!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        const icon = type === 'pause' ? '⏸' : '▶';
        toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${msg}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 350);
        }, 3500);
    }

    btnBacks.forEach(btn => btn.addEventListener('click', () => {
        if (peer) { peer.destroy(); peer = null; }
        showView(viewIntro);
    }));

    btnHostFlow.addEventListener('click', () => {
        isHost = true;
        showView(viewSetup);
    });

    btnJoinFlow.addEventListener('click', () => {
        isHost = false;
        joinStatus.textContent = '';
        showView(viewJoin);
    });

    btnReset.addEventListener('click', () => {
        if(confirm(i18n[currentLang].leave_confirm)) {
            stopAllAudio();
            if(peer) peer.destroy();
            peer = null; connections = []; hostConnection = null;
            myUser = { id: '', name: '', role: '', isHost: false };
            roomData = { bandName: '', members: [], songs: [] };
            sessionStorage.removeItem('bandSeqSession');
            clearDB();
            showView(viewIntro);
        }
    });

    // Form Validations
    function checkHostValidity() {
        btnCreateRoom.disabled = !(bandNameInput.value.trim() && hostUserName.value.trim());
    }
    bandNameInput.addEventListener('input', checkHostValidity);
    hostUserName.addEventListener('input', checkHostValidity);

    function checkJoinValidity() {
        btnJoinRoom.disabled = !(joinUserName.value.trim() && joinRoomId.value.trim());
    }
    joinUserName.addEventListener('input', checkJoinValidity);
    joinRoomId.addEventListener('input', checkJoinValidity);

    // --- PeerJS Network Logic ---
    function initPeer(onOpen, customId = null) {
        showLoading("preparing");
        
        const peerOptions = {
            debug: 2,
            config: {
                iceServers: [
                    // STUN Servers (Direct P2P NAT Traversal)
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    
                    // TURN Relay Servers (Relays traffic over 4G / 5G Mobile Data & CGNAT Firewalls)
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    }
                ]
            }
        };

        // If customId is provided, initialize Peer with it (for Host)
        peer = customId ? new Peer(customId, peerOptions) : new Peer(peerOptions);
        
        peer.on('open', (id) => {
            myPeerId = id;
            myUser.id = id;
            hideLoading();
            if(onOpen) onOpen(id);
        });

        peer.on('error', (err) => {
            hideLoading();
            console.error(err);
            if(isHost) alert("Connection error: " + err.type);
            else {
                joinStatus.textContent = "Error: " + err.type;
                alert("Gagal membuat koneksi peer: " + err.type + ". Mohon coba lagi.");
            }
        });

        if (isHost) {
            peer.on('connection', (conn) => {
                connections.push(conn);
                conn.on('data', (data) => {
                    if(data.type === 'CLIENT_HELLO') {
                        roomData.members.push(data.payload);
                        renderUsersList();
                        conn.send({ type: 'INIT_STATE', payload: getSyncableRoomData() });
                        broadcast({ type: 'MEMBERS_UPDATE', payload: roomData.members });
                        showToast(`${data.payload.name} (${data.payload.role}) joined the room!`, 'play');
                    }
                    else if(data.type === 'SYNC_BPM') {
                        // Any client can change BPM
                        const s = roomData.songs.find(x => x.id === data.payload.songId);
                        if(s) {
                            s.bpm = data.payload.bpm;
                            renderSetlist();
                            broadcast({ type: 'SYNC_BPM', payload: data.payload }); // broadcast to others
                        }
                    }
                    else if(data.type === 'SYNC_OFFSET') {
                        const sOffset = roomData.songs.find(s => s.id === data.payload.songId);
                        if(sOffset) {
                            sOffset.offset = data.payload.offset;
                            if(isHost) saveAllSongsToDB();
                        }
                        broadcast(data);
                    }
                    else if(data.type === 'SEEK') {
                        const sSeek = roomData.songs.find(s => s.id === data.payload.songId);
                        if(sSeek) {
                            sSeek.tracks.forEach(t => { if(t.audioEl) t.audioEl.currentTime = data.payload.time; });
                            updateSongProgressUI(sSeek.id);
                        }
                        broadcast(data);
                    }
                    else if(data.type === 'PLAY') {
                        playSong(data.payload.songId, data.payload.time);
                        if(data.payload.userName) {
                            showToast(`${data.payload.userName} (${data.payload.userRole || 'Member'}) started the session`, 'play');
                        }
                        broadcast(data);
                    }
                    else if(data.type === 'PAUSE') {
                        pauseSong(data.payload.songId);
                        if(data.payload.userName) {
                            showToast(`${data.payload.userName} (${data.payload.userRole || 'Member'}) paused the session`, 'pause');
                        }
                        broadcast(data);
                    }
                });

                conn.on('close', () => {
                    connections = connections.filter(c => c.peer !== conn.peer);
                    roomData.members = roomData.members.filter(m => m.id !== conn.peer);
                    renderUsersList();
                    broadcast({ type: 'MEMBERS_UPDATE', payload: roomData.members });
                });
            });
        }
    }

    // Host Flow Action
    btnCreateRoom.addEventListener('click', () => {
        myUser = { id: '', name: hostUserName.value.trim(), role: hostUserRole.value, isHost: true };
        roomData.bandName = bandNameInput.value.trim();
        roomData.members = [myUser];
        
        const hostRoomId = Math.floor(10000000 + Math.random() * 90000000).toString();
        sessionStorage.setItem('bandSeqSession', JSON.stringify({ isHost: true, roomId: hostRoomId, myUser, bandName: roomData.bandName }));
        
        initPeer((id) => {
            myUser.id = id; 
            buildLobbyUI();
            showView(viewPlayer);
        }, hostRoomId);
    });

    // Join Flow Action
    btnJoinRoom.addEventListener('click', () => {
        const targetId = joinRoomId.value.trim();
        if(!targetId) return;
        
        myUser = { id: '', name: joinUserName.value.trim(), role: joinUserRole.value, isHost: false };
        joinStatus.textContent = "Connecting...";
        
        sessionStorage.setItem('bandSeqSession', JSON.stringify({ isHost: false, roomId: targetId, myUser }));
        
        initPeer((id) => {
            myUser.id = id;
            showLoading("Connecting to Host...");
            
            hostConnection = peer.connect(targetId, { reliable: true });

            const connTimeout = setTimeout(() => {
                if(hostConnection && !hostConnection.open) {
                    hideLoading();
                    joinStatus.textContent = "Connection Timeout.";
                    alert("Gagal terhubung: Timeout saat menghubungi Host. Pastikan Room ID benar (" + targetId + ") dan Host masih aktif.");
                }
            }, 10000);
            
            hostConnection.on('open', () => {
                clearTimeout(connTimeout);
                hideLoading();
                isHost = false;
                hostConnection.send({ type: 'CLIENT_HELLO', payload: myUser });
            });

            hostConnection.on('data', handleClientReceiveData);

            hostConnection.on('error', (err) => {
                clearTimeout(connTimeout);
                hideLoading();
                alert("Terjadi kesalahan koneksi ke Host: " + err);
            });

            hostConnection.on('close', () => {
                alert("Host closed the room.");
                btnReset.click();
            });
        });
    });

    btnCopyId.addEventListener('click', () => {
        navigator.clipboard.writeText(isHost ? myPeerId : hostConnection.peer).then(() => {
            const orig = roomIdText.innerHTML;
            roomIdText.innerHTML = "Copied!";
            setTimeout(() => roomIdText.innerHTML = isHost ? myPeerId : hostConnection.peer, 2000);
        });
    });

    // --- Data Sync ---
    function getSyncableRoomData() {
        return {
            bandName: roomData.bandName,
            members: roomData.members,
            songs: roomData.songs.map(s => ({
                id: s.id, title: s.title, bpm: s.bpm, originalBpm: s.originalBpm, offset: s.offset,
                tracks: s.tracks.map(t => ({
                    id: t.id, name: t.name, buffer: t.audioBuffer, volume: t.volume, isMuted: t.isMuted
                }))
            }))
        };
    }

    function broadcast(data) {
        if(!isHost) {
            // if client, send to host, host will broadcast
            if(hostConnection && hostConnection.open) hostConnection.send(data);
            return;
        }
        connections.forEach(conn => { if(conn.open) conn.send(data); });
    }

    function updateSongProgressUI(songId) {
        const song = roomData.songs.find(s => s.id === songId);
        if(!song) return;
        song.tracks.forEach(t => {
            if(t.audioEl) {
                const prog = document.getElementById(`prog-${t.id}`);
                if(prog) {
                    const percent = (t.audioEl.currentTime / t.audioEl.duration) * 100;
                    prog.style.width = `${percent || 0}%`;
                }
            }
        });
    }

    function handleClientReceiveData(data) {
        switch(data.type) {
            case 'INIT_STATE':
                roomData.bandName = data.payload.bandName;
                roomData.members = data.payload.members;
                buildLobbyUI(); 
                showView(viewPlayer); // Transition client to Player Lobby view
                
                showLoading("Downloading Audio...");
                roomData.songs = data.payload.songs.map(s => ({
                    id: s.id, title: s.title, bpm: s.bpm, originalBpm: s.originalBpm, offset: s.offset, tracks: s.tracks.map(t => reviveTrack(t))
                }));
                hideLoading();
                renderSetlist();
                break;
            case 'MEMBERS_UPDATE':
                roomData.members = data.payload;
                renderUsersList();
                break;
            case 'ADD_SONG':
                roomData.songs.push({ id: data.payload.id, title: data.payload.title, bpm: data.payload.bpm, originalBpm: data.payload.bpm, tracks: [] });
                renderSetlist();
                break;
            case 'ADD_TRACK':
                const song = roomData.songs.find(s => s.id === data.payload.songId);
                if(song) {
                    song.tracks.push(reviveTrack(data.payload.track));
                    renderSetlist();
                }
                break;
            case 'REMOVE_TRACK':
                const sRem = roomData.songs.find(s => s.id === data.payload.songId);
                if(sRem) {
                    const tIdx = sRem.tracks.findIndex(t => t.id === data.payload.trackId);
                    if(tIdx > -1) {
                        if(sRem.tracks[tIdx].audioEl) sRem.tracks[tIdx].audioEl.pause();
                        sRem.tracks.splice(tIdx, 1);
                        renderSetlist();
                        if(isHost) saveAllSongsToDB();
                    }
                }
                break;
            case 'SYNC_BPM':
                const sBpm = roomData.songs.find(s => s.id === data.payload.songId);
                if(sBpm) {
                    sBpm.bpm = data.payload.bpm;
                    sBpm.tracks.forEach(t => {
                        if(t.audioEl) t.audioEl.playbackRate = sBpm.bpm / sBpm.originalBpm;
                    });
                    const inp = document.querySelector(`.bpm-input[data-sid="${sBpm.id}"]`);
                    if(inp) inp.value = sBpm.bpm;
                    if(isHost) saveAllSongsToDB();
                }
                break;
            case 'SYNC_OFFSET':
                const sOffset = roomData.songs.find(s => s.id === data.payload.songId);
                if(sOffset) {
                    sOffset.offset = data.payload.offset;
                    if(isHost) saveAllSongsToDB();
                }
                break;
            case 'SEEK':
                const sSeek = roomData.songs.find(s => s.id === data.payload.songId);
                if(sSeek) {
                    sSeek.tracks.forEach(t => { if(t.audioEl) t.audioEl.currentTime = data.payload.time; });
                    updateSongProgressUI(sSeek.id);
                }
                break;
            case 'PLAY': 
                activeSongId = data.payload.songId;
                renderSetlist();
                let startTime = data.payload.time || 0;
                if (data.payload.serverTimestamp) {
                    const latency = (Date.now() - data.payload.serverTimestamp) / 1000;
                    if (latency > 0 && latency < 2) startTime += latency;
                }
                playSong(data.payload.songId, startTime); 
                if(data.payload.userName) {
                    showToast(`${data.payload.userName} (${data.payload.userRole || 'Member'}) started the session`, 'play');
                }
                break;
            case 'PAUSE': 
                pauseSong(data.payload.songId);
                if(data.payload.userName) {
                    showToast(`${data.payload.userName} (${data.payload.userRole || 'Member'}) paused the session`, 'pause');
                }
                break;
            case 'CLOCK_SYNC':
                if (!isHost) {
                    const sSync = roomData.songs.find(x => x.id === data.payload.songId);
                    if (sSync) {
                        const latency = (Date.now() - data.payload.serverTimestamp) / 1000;
                        const targetTime = data.payload.time + (latency > 0 && latency < 2 ? latency : 0);
                        sSync.tracks.forEach(t => {
                            if (t.audioEl && !t.audioEl.paused) {
                                const drift = Math.abs(t.audioEl.currentTime - targetTime);
                                if (drift > 0.08) {
                                    t.audioEl.currentTime = targetTime;
                                }
                            }
                        });
                    }
                }
                break;
        }
    }

    function reviveTrack(trackData) {
        let url = null, audioEl = null;
        if (trackData.buffer) {
            const blob = new Blob([trackData.buffer], { type: 'audio/wav' });
            url = URL.createObjectURL(blob);
            audioEl = new Audio(url);
            audioEl.preload = 'auto'; // Preload audio buffer into memory for 0 lag
            audioEl.volume = trackData.volume;
            audioEl.muted = trackData.isMuted;
            audioEl.preservesPitch = true;
            audioEl.addEventListener('loadedmetadata', () => updateTotalSetlistDuration());
        }
        return {
            id: trackData.id, name: trackData.name, audioBuffer: trackData.buffer,
            audioUrl: url, audioEl: audioEl, volume: trackData.volume, isMuted: trackData.isMuted
        };
    }

    // --- UI Lobby & Player Builder ---
    function updateWelcomeMessage() {
        const key = isHost ? 'welcome_host' : 'welcome_client';
        welcomeMessage.textContent = i18n[currentLang][key].replace('{name}', myUser.name);
    }

    function buildLobbyUI() {
        displayBandName.textContent = roomData.bandName;
        updateWelcomeMessage();
        
        if (isHost) {
            roleBadge.textContent = "Host";
            roomIdText.textContent = myPeerId;
            hostAddSongContainer.classList.remove('hidden');
            clientWaitingMsg.classList.add('hidden');
        } else {
            roleBadge.textContent = "Member";
            roomIdText.textContent = hostConnection.peer;
            hostAddSongContainer.classList.add('hidden');
        }
        renderUsersList();
        renderSetlist();
    }

    function renderUsersList() {
        userCountEl.textContent = roomData.members.length;
        usersListContainer.innerHTML = '';
        roomData.members.forEach(m => {
            const el = document.createElement('div');
            el.className = 'user-tag';
            const rKey = 'role_' + m.role.toLowerCase().replace(' ', '_');
            const rText = i18n[currentLang][rKey] || m.role;
            el.innerHTML = `<span>${m.name} ${m.id===myUser.id ? '(You)' : ''}</span> <span class="role">${rText}</span>`;
            usersListContainer.appendChild(el);
        });
    }

    function renderSetlist() {
        if(!isHost && roomData.songs.length > 0) clientWaitingMsg.classList.add('hidden');
        else if(!isHost && roomData.songs.length === 0) clientWaitingMsg.classList.remove('hidden');

        setlistContainer.innerHTML = '';
        if(!activeSongId && roomData.songs.length > 0) activeSongId = roomData.songs[0].id;

        // Render "Now Playing" Banner if another song is currently playing and user is looking at a different song
        const playingSong = roomData.songs.find(s => s.id === currentlyPlayingId);
        if (playingSong && activeSongId !== currentlyPlayingId) {
            const banner = document.createElement('div');
            banner.className = 'now-playing-banner';
            banner.innerHTML = `
                <div class="np-info">
                    <span class="np-pulse">🔊</span>
                    <span>Sedang Diputar: <strong>${playingSong.title}</strong></span>
                </div>
                <div class="np-actions">
                    <button class="btn-np-jump" id="btn-jump-playing">🎯 Balik ke Lagu Diputar</button>
                    <button class="btn-np-stop" id="btn-stop-playing">⏹ Pause</button>
                </div>
            `;
            setlistContainer.appendChild(banner);

            banner.querySelector('#btn-jump-playing').addEventListener('click', () => {
                activeSongId = currentlyPlayingId;
                renderSetlist();
            });
            banner.querySelector('#btn-stop-playing').addEventListener('click', () => {
                pauseSong(currentlyPlayingId);
                if(isHost) broadcast({ type: 'PAUSE', payload: { songId: currentlyPlayingId } });
                renderSetlist();
            });
        }

        roomData.songs.forEach((song, index) => {
            if(!song.originalBpm) song.originalBpm = song.bpm || 120;
            const card = document.createElement('div');
            card.className = 'song-card';
            card.dataset.sid = song.id;
            if(song.id !== activeSongId) card.classList.add('collapsed');
            if(song.id === currentlyPlayingId) card.classList.add('is-playing');
            
            let tracksHTML = '';
            song.tracks.forEach(track => {
                const initDurStr = (track.audioEl && track.audioEl.duration) ? `00:00 / ${formatTime(track.audioEl.duration)}` : '00:00 / 00:00';
                tracksHTML += `
                    <div class="track-item" id="track-item-${track.id}">
                        <div class="track-info">
                            <div class="track-name">${track.name}</div>
                            <div class="progress-bar"><div class="progress-fill" id="prog-${track.id}"></div></div>
                            <div class="track-duration" id="dur-${track.id}">${initDurStr}</div>
                        </div>
                        <div class="track-controls">
                            <div class="volume-control">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                <input type="range" min="0" max="1" step="0.05" value="${track.volume}" class="vol-slider" data-tid="${track.id}" data-sid="${song.id}">
                            </div>
                            <button class="btn-mute ${track.isMuted ? 'muted' : ''}" data-tid="${track.id}" data-sid="${song.id}" title="Mute Track">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                            </button>
                            ${isHost ? `<button class="btn-remove-track" data-tid="${track.id}" data-sid="${song.id}">✕</button>` : ''}
                        </div>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="song-header">
                    <div class="song-header-main">
                        <div class="song-title">
                            <span class="song-index">${index + 1}.</span>
                            ${song.title}
                            <span class="song-duration-badge" id="sdur-${song.id}"></span>
                            ${song.id === currentlyPlayingId ? '<span class="badge-now-playing">🔊 PLAYING</span>' : ''}
                        </div>
                        ${song.tracks.length > 0 ? `
                            <div class="master-controls">
                                <button class="btn-master-play ${song.id === currentlyPlayingId ? 'playing' : ''}" id="play-${song.id}">
                                    ${song.id === currentlyPlayingId ? 'Pause' : 'Play All'}
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="song-header-sub">
                        <div class="bpm-container">
                            <span class="bpm-label" data-i18n="bpm_label">${i18n[currentLang].bpm_label}</span>
                            <button class="btn-bpm-adj" data-sid="${song.id}" data-dir="-1">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <input type="number" value="${song.bpm}" class="bpm-input" data-sid="${song.id}" min="30" max="300">
                            <button class="btn-bpm-adj" data-sid="${song.id}" data-dir="1">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="tracks-container">${tracksHTML}</div>
                ${isHost && song.tracks.length === 0 ? `
                <div class="add-track-zone dropzone" id="dz-${song.id}">
                    + Drop Audio (WAV/MP3)
                    <input type="file" class="file-input-hidden" accept="audio/*" id="file-${song.id}">
                </div>
                ` : ''}
                <div class="beat-visualizer" id="beats-${song.id}" title="Klik untuk Sinkronisasi Ketukan Awal (Downbeat)" style="cursor: pointer;">
                    <div class="beat-box"></div><div class="beat-box"></div>
                    <div class="beat-box"></div><div class="beat-box"></div>
                    <div class="beat-box"></div><div class="beat-box"></div>
                    <div class="beat-box"></div><div class="beat-box"></div>
                </div>
            `;
            
            setlistContainer.appendChild(card);
            // Click on card to focus this song (expand), unless clicking inside controls
            card.addEventListener('click', (e) => {
                // Ignore clicks on interactive elements inside the card
                if (e.target.closest('.track-controls') || e.target.closest('.master-controls') || e.target.closest('.add-track-zone') || e.target.closest('.beat-visualizer')) {
                    return;
                }
                activeSongId = song.id;
                renderSetlist();
            });            
            if(isHost) setupDropzone(song.id);

            // BPM Input Change
            card.querySelector('.bpm-input').addEventListener('change', (e) => {
                const sid = e.target.dataset.sid;
                let val = parseInt(e.target.value) || 120;
                if(val < 30) val = 30; if(val > 300) val = 300;
                e.target.value = val;
                
                const s = roomData.songs.find(x => x.id === sid);
                if(s) {
                    s.bpm = val;
                    s.tracks.forEach(t => {
                        if(t.audioEl) t.audioEl.playbackRate = s.bpm / s.originalBpm;
                    });
                    broadcast({ type: 'SYNC_BPM', payload: { songId: sid, bpm: val } });
                }
            });

            // Arrow BPM Adjust
            card.querySelectorAll('.btn-bpm-adj').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sid = e.currentTarget.dataset.sid;
                    const dir = parseInt(e.currentTarget.dataset.dir);
                    const s = roomData.songs.find(x => x.id === sid);
                    if(s) {
                        let newBpm = s.bpm + dir;
                        if(newBpm < 30) newBpm = 30; if(newBpm > 300) newBpm = 300;
                        s.bpm = newBpm;
                        s.tracks.forEach(t => {
                            if(t.audioEl) t.audioEl.playbackRate = s.bpm / s.originalBpm;
                        });
                        document.querySelector(`.bpm-input[data-sid="${sid}"]`).value = s.bpm;
                        broadcast({ type: 'SYNC_BPM', payload: { songId: sid, bpm: s.bpm } });
                    }
                });
            });

            // Click Visualizer to Sync Downbeat
            const visualizerEl = document.getElementById(`beats-${song.id}`);
            if(visualizerEl) {
                visualizerEl.addEventListener('click', () => {
                    const s = roomData.songs.find(x => x.id === song.id);
                    if(s && s.tracks.length > 0) {
                        let maxTime = 0;
                        s.tracks.forEach(t => {
                            if(t.audioEl && t.audioEl.currentTime > maxTime) maxTime = t.audioEl.currentTime;
                        });
                        s.offset = maxTime;
                        broadcast({ type: 'SYNC_OFFSET', payload: { songId: s.id, offset: s.offset } });
                        if(isHost) saveAllSongsToDB();
                        
                        // Briefly highlight to show feedback
                        visualizerEl.style.transform = 'scale(0.95)';
                        setTimeout(() => visualizerEl.style.transform = 'none', 100);
                    }
                });
            }

            if(song.tracks.length > 0) {
                const playBtn = document.getElementById(`play-${song.id}`);
                playBtn.addEventListener('click', () => {
                    const userPayload = { 
                        songId: song.id, 
                        userName: myUser.name, 
                        userRole: myUser.role,
                        serverTimestamp: Date.now()
                    };
                    if(playBtn.classList.contains('playing')) {
                        pauseSong(song.id);
                        showToast(`You (${myUser.role}) paused the session`, 'pause');
                        broadcast({ type: 'PAUSE', payload: userPayload });
                    } else {
                        userPayload.time = 0;
                        playSong(song.id, 0);
                        showToast(`You (${myUser.role}) started the session`, 'play');
                        broadcast({ type: 'PLAY', payload: userPayload });
                    }
                });
            }

            // Bind Sliders and Mute
            card.querySelectorAll('.vol-slider').forEach(slider => {
                slider.addEventListener('input', (e) => {
                    const sid = e.target.dataset.sid;
                    const tid = e.target.dataset.tid;
                    const t = roomData.songs.find(s => s.id === sid)?.tracks.find(x => x.id === tid);
                    if(t && t.audioEl) { t.volume = e.target.value; t.audioEl.volume = t.volume; }
                });
            });
            card.querySelectorAll('.btn-mute').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sid = e.currentTarget.dataset.sid;
                    const tid = e.currentTarget.dataset.tid;
                    const t = roomData.songs.find(s => s.id === sid)?.tracks.find(x => x.id === tid);
                    if(t && t.audioEl) {
                        t.isMuted = !t.isMuted;
                        t.audioEl.muted = t.isMuted;
                        e.currentTarget.classList.toggle('muted', t.isMuted);
                    }
                });
            });

            if(isHost) {
                card.querySelectorAll('.btn-remove-track').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const sid = e.currentTarget.dataset.sid;
                        const tid = e.currentTarget.dataset.tid;
                        const s = roomData.songs.find(s => s.id === sid);
                        if(s) {
                            const tIdx = s.tracks.findIndex(x => x.id === tid);
                            if(tIdx > -1) {
                                if(s.tracks[tIdx].audioEl) s.tracks[tIdx].audioEl.pause();
                                s.tracks.splice(tIdx, 1);
                                renderSetlist();
                                broadcast({ type: 'REMOVE_TRACK', payload: { songId: sid, trackId: tid } });
                                saveAllSongsToDB();
                            }
                        }
                    });
                });
            }

            // Seek Logic on Progress Bar
            card.querySelectorAll('.progress-bar').forEach(bar => {
                bar.addEventListener('click', (e) => {
                    const rect = bar.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    
                    const tid = bar.querySelector('.progress-fill').id.replace('prog-', '');
                    const s = roomData.songs.find(x => x.id === song.id);
                    if(!s) return;
                    
                    const track = s.tracks.find(x => x.id === tid);
                    if(track && track.audioEl) {
                        const targetTime = percent * track.audioEl.duration;
                        s.tracks.forEach(t => {
                            if(t.audioEl) t.audioEl.currentTime = targetTime;
                        });
                        updateSongProgressUI(s.id);
                        broadcast({ type: 'SEEK', payload: { songId: s.id, time: targetTime } });
                    }
                });
            });
        });

        updateTotalSetlistDuration();
    }

    // --- Audio Control ---
    function playSong(songId, time = 0) {
        const song = roomData.songs.find(s => s.id === songId);
        if(!song) return;

        currentlyPlayingId = songId;

        roomData.songs.forEach(s => { if(s.id !== songId) pauseSong(s.id); });

        const playBtn = document.getElementById(`play-${songId}`);
        if(playBtn) {
            playBtn.classList.add('playing');
            playBtn.textContent = 'Pause';
        }

        song.tracks.forEach(t => {
            if(t.audioEl) {
                t.audioEl.currentTime = time;
                t.audioEl.play().catch(e => console.error(e));
            }
        });
        
        // Background Audio support (Media Session API)
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title || "Song",
                artist: roomData.bandName || "Band Sequencer Pro",
                album: "Live Session"
            });
            navigator.mediaSession.setActionHandler('play', () => {
                playSong(songId, 0);
                if(isHost) broadcast({ type: 'PLAY', payload: { songId: songId, time: 0 } });
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                pauseSong(songId);
                if(isHost) broadcast({ type: 'PAUSE', payload: { songId: songId } });
            });
        }

        if(playingIntervals[songId]) clearInterval(playingIntervals[songId]);
        
        playingIntervals[songId] = setInterval(() => {
            let maxTime = 0;
            song.tracks.forEach(t => {
                if(t.audioEl && !t.audioEl.paused) {
                    if(t.audioEl.currentTime > maxTime) maxTime = t.audioEl.currentTime;
                }
            });
            updateSongProgressUI(songId);
            
            const origBpm = parseFloat(song.originalBpm) || 120;
            const offset = parseFloat(song.offset) || 0;
            let timeElapsed = maxTime - offset;
            if (timeElapsed < 0) timeElapsed = 0;
            
            // 1 minute = origBpm beats, so 1 second = origBpm/60 beats
            let totalBeats = Math.floor(timeElapsed * (origBpm / 60));
            let currentBeat = totalBeats % 8; // 8 beats visualizer
            
            const visualizer = document.getElementById(`beats-${songId}`);
            if(visualizer) {
                const boxes = visualizer.querySelectorAll('.beat-box');
                boxes.forEach((b, idx) => {
                    if(idx === currentBeat) b.classList.add('active');
                    else b.classList.remove('active');
                });
            }

            const allEnded = song.tracks.every(t => !t.audioEl || t.audioEl.ended);
            if(allEnded && song.tracks.length > 0) pauseSong(songId);
        }, 50); // fast interval for smooth beat visualization
    }

    function updateSongProgressUI(songId) {
        const song = roomData.songs.find(s => s.id === songId);
        if(!song) return;
        song.tracks.forEach(t => {
            if(t.audioEl) {
                const fill = document.getElementById(`prog-${t.id}`);
                const durEl = document.getElementById(`dur-${t.id}`);
                if(t.audioEl.duration && !isNaN(t.audioEl.duration)) {
                    if(fill) {
                        const pct = (t.audioEl.currentTime / t.audioEl.duration) * 100;
                        fill.style.width = pct + '%';
                    }
                    if(durEl) {
                        durEl.textContent = `${formatTime(t.audioEl.currentTime)} / ${formatTime(t.audioEl.duration)}`;
                    }
                }
            }
        });
        updateTotalSetlistDuration();
    }

    function pauseSong(songId) {
        const song = roomData.songs.find(s => s.id === songId);
        if(!song) return;

        if (currentlyPlayingId === songId) currentlyPlayingId = null;

        if(playingIntervals[songId]) { clearInterval(playingIntervals[songId]); delete playingIntervals[songId]; }
        song.tracks.forEach(t => { if(t.audioEl) t.audioEl.pause(); });

        const playBtn = document.getElementById(`play-${songId}`);
        if(playBtn) { playBtn.classList.remove('playing'); playBtn.textContent = 'Play All'; }
        
        // Turn off all beat boxes
        const visualizer = document.getElementById(`beats-${songId}`);
        if(visualizer) {
            visualizer.querySelectorAll('.beat-box').forEach(b => b.classList.remove('active'));
        }
    }

    function stopAllAudio() { roomData.songs.forEach(s => pauseSong(s.id)); }

    // --- Host Add File Logic ---
    function setupDropzone(songId) {
        const dropzone = document.getElementById(`dz-${songId}`);
        const fileInput = document.getElementById(`file-${songId}`);
        if(!dropzone) return;

        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault(); dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) handleHostFile(songId, e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleHostFile(songId, e.target.files[0]);
        });
    }

    async function detectBPM(arrayBuffer) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
            
            // Limit to 30 seconds for performance
            const sampleRate = decodedBuffer.sampleRate;
            const length = Math.min(decodedBuffer.length, sampleRate * 30);
            
            const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, length, sampleRate);
            const source = offlineCtx.createBufferSource();
            source.buffer = decodedBuffer;
            
            // Apply Lowpass Filter to isolate the kick drum / bass
            const filter = offlineCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 150;
            
            source.connect(filter);
            filter.connect(offlineCtx.destination);
            source.start(0);
            
            const renderedBuffer = await offlineCtx.startRendering();
            const data = renderedBuffer.getChannelData(0);
            
            // Find max amplitude to set a dynamic threshold
            let maxAmp = 0;
            for(let i=0; i<data.length; i++) {
                if(Math.abs(data[i]) > maxAmp) maxAmp = Math.abs(data[i]);
            }
            
            let threshold = maxAmp * 0.8;
            const peaks = [];
            for(let i=0; i<data.length; i++) {
                if(data[i] > threshold) {
                    peaks.push(i);
                    i += sampleRate / 5; // skip 1/5th of a second
                }
            }
            
            if(peaks.length >= 2) {
                let intervals = [];
                for(let i=1; i<peaks.length; i++) {
                    intervals.push(peaks[i] - peaks[i-1]);
                }
                
                // Histogram to find the most common BPM
                let bpmCounts = {};
                intervals.forEach(interval => {
                    let bpm = Math.round(60 / (interval / sampleRate));
                    // Clamp BPM to realistic ranges (60 - 200)
                    while(bpm < 60) bpm *= 2;
                    while(bpm > 200) bpm = Math.round(bpm / 2);
                    bpmCounts[bpm] = (bpmCounts[bpm] || 0) + 1;
                });
                
                let bestBPM = 120;
                let maxCount = 0;
                for(let bpm in bpmCounts) {
                    if(bpmCounts[bpm] > maxCount) {
                        maxCount = bpmCounts[bpm];
                        bestBPM = parseInt(bpm);
                    }
                }
                
                let beatDuration = 60 / bestBPM;
                let rawOffset = peaks[0] / sampleRate;
                let finalOffset = rawOffset % beatDuration;
                
                return { bpm: bestBPM, offset: finalOffset };
            }
        } catch(e) {
            console.error("BPM detection failed", e);
        }
        return { bpm: 120, offset: 0 }; // fallback
    }

    function handleHostFile(songId, file) {
        if (!file.type.startsWith('audio/')) return alert('Must be audio file.');
        showLoading("Syncing...");
        const reader = new FileReader();
        reader.onload = async function(e) {
            const buffer = e.target.result;
            const detected = await detectBPM(buffer);
            const detectedBpm = detected.bpm;
            const detectedOffset = detected.offset;

            const newTrack = { id: `track-${Date.now()}`, name: file.name, buffer: buffer, volume: 1.0, isMuted: false };
            const song = roomData.songs.find(s => s.id === songId);
            if(song) {
                if(song.tracks.length === 0 || song.bpm === 120) {
                    song.bpm = detectedBpm;
                    song.originalBpm = detectedBpm;
                    song.offset = detectedOffset;
                    broadcast({ type: 'SYNC_BPM', payload: { songId: song.id, bpm: detectedBpm } });
                }
                
                song.tracks.push(reviveTrack(newTrack));
                broadcast({ type: 'ADD_TRACK', payload: { songId: song.id, track: newTrack } });
                hideLoading(); renderSetlist();
                saveAllSongsToDB();
            }
        };
        reader.readAsArrayBuffer(file);
    }

    btnHostAddSong.addEventListener('click', () => {
        const title = prompt(i18n[currentLang].prompt_song);
        if(title) {
            const newSong = { id: `song-${Date.now()}`, title: title, bpm: 120, originalBpm: 120, tracks: [] };
            roomData.songs.push(newSong);
            activeSongId = newSong.id;
            renderSetlist();
            broadcast({ type: 'ADD_SONG', payload: newSong });
            saveAllSongsToDB();
        }
    });

    // Init translations & DB on load
    updateTranslations();
    initDB(() => {
        attemptRestoreSession();
    });
});
