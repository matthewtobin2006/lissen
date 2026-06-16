// ── CONFIG ──
// To enable real Spotify search:
// 1. Go to https://developer.spotify.com/dashboard
// 2. Create an app, add http://localhost:8080 (or your GitHub Pages URL) as a redirect URI
// 3. Replace CLIENT_ID below with your actual client ID
const SPOTIFY_CLIENT_ID = '80710d5293e84e45acb1a216080039fc';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = 'user-read-private user-read-email';

// ── STATE ──
let state = {
  songs: JSON.parse(localStorage.getItem('lissen_songs') || '[]'),
  currentSong: null,
  compareQueue: [],
  spotifyToken: null,
  searchTimeout: null,
};

// ── SAVE ──
function saveState() {
  localStorage.setItem('lissen_songs', JSON.stringify(state.songs));
}

// ── NAV ──
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const el = document.getElementById('page-' + page);
  el.classList.remove('hidden');
  el.classList.add('active');

  const link = document.querySelector(`.nav-link[onclick="showPage('${page}')"]`);
  if (link) link.classList.add('active');

  if (page === 'mylist') renderMyList();
  if (page === 'home') renderRecent();
}

// ── SPOTIFY AUTH ──
function loginWithSpotify() {
  if (SPOTIFY_CLIENT_ID === 'YOUR_SPOTIFY_CLIENT_ID') {
    alert('Add your Spotify Client ID to app.js to enable login. For now, demo mode is active with mock search results.');
    return;
  }
  const url = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
  window.location.href = url;
}

function handleSpotifyCallback() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  if (token) {
    state.spotifyToken = token;
    localStorage.setItem('lissen_token', token);
    window.history.replaceState({}, document.title, window.location.pathname);
    document.querySelectorAll('.btn-spotify').forEach(b => {
      b.textContent = '✓ Spotify Connected';
      b.style.background = '#158a3e';
    });
  }
}

// Check for saved token
function initAuth() {
  const saved = localStorage.getItem('lissen_token');
  if (saved) {
    state.spotifyToken = saved;
    document.querySelectorAll('.btn-spotify').forEach(b => {
      b.innerHTML = '✓ Spotify Connected';
      b.style.background = '#158a3e';
    });
  }
  handleSpotifyCallback();
}

// ── SEARCH ──
function handleSearch(query) {
  clearTimeout(state.searchTimeout);
  const results = document.getElementById('search-results');
  const spinner = document.getElementById('search-spinner');

  if (!query.trim()) {
    results.classList.add('hidden');
    spinner.classList.add('hidden');
    return;
  }

  spinner.classList.remove('hidden');

  state.searchTimeout = setTimeout(async () => {
    const tracks = await searchTracks(query);
    spinner.classList.add('hidden');
    renderSearchResults(tracks);
  }, 400);
}

async function searchTracks(query) {
  if (state.spotifyToken) {
    return await spotifySearch(query);
  }
  return mockSearch(query);
}

async function spotifySearch(query) {
  try {
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=8`, {
      headers: { 'Authorization': 'Bearer ' + state.spotifyToken }
    });
    if (res.status === 401) {
      state.spotifyToken = null;
      localStorage.removeItem('lissen_token');
      return mockSearch(query);
    }
    const data = await res.json();
    return data.tracks.items.map(t => ({
      id: t.id,
      title: t.name,
      artist: t.artists.map(a => a.name).join(', '),
      album: t.album.name,
      art: t.album.images[1]?.url || t.album.images[0]?.url || '',
      duration: msToTime(t.duration_ms),
      spotifyUrl: t.external_urls.spotify,
      preview: t.preview_url,
    }));
  } catch(e) {
    return mockSearch(query);
  }
}

// Demo data for when Spotify isn't connected
const DEMO_TRACKS = [
  { id:'d1', title:'Blinding Lights', artist:'The Weeknd', album:'After Hours', art:'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36', duration:'3:20', spotifyUrl:'#', preview:null },
  { id:'d2', title:'As It Was', artist:'Harry Styles', album:"Harry's House", art:'https://i.scdn.co/image/ab67616d0000b273b46f74097655d7f353caab14', duration:'2:37', spotifyUrl:'#', preview:null },
  { id:'d3', title:'Stay', artist:'The Kid LAROI, Justin Bieber', album:'F*CK LOVE 3', art:'https://i.scdn.co/image/ab67616d0000b2737c24a94e7f6afeed7c33b3b0', duration:'2:21', spotifyUrl:'#', preview:null },
  { id:'d4', title:'Heat Waves', artist:'Glass Animals', album:'Dreamland', art:'https://i.scdn.co/image/ab67616d0000b2739e495fb707973f3390850eea', duration:'3:59', spotifyUrl:'#', preview:null },
  { id:'d5', title:'Levitating', artist:'Dua Lipa', album:'Future Nostalgia', art:'https://i.scdn.co/image/ab67616d0000b27374ea6b0cc10e5fc22d7ea9ab', duration:'3:24', spotifyUrl:'#', preview:null },
  { id:'d6', title:'good 4 u', artist:'Olivia Rodrigo', album:'SOUR', art:'https://i.scdn.co/image/ab67616d0000b273a91c10fe9472d9bd89802e5a', duration:'2:58', spotifyUrl:'#', preview:null },
  { id:'d7', title:'Peaches', artist:'Justin Bieber', album:'Justice', art:'https://i.scdn.co/image/ab67616d0000b2734b9f7eca32c5bde93e7ab01b', duration:'3:18', spotifyUrl:'#', preview:null },
  { id:'d8', title:'Montero', artist:'Lil Nas X', album:'Montero', art:'https://i.scdn.co/image/ab67616d0000b273be82673b5f79d9658ec0a9fd', duration:'2:18', spotifyUrl:'#', preview:null },
  { id:'d9', title:'Industry Baby', artist:'Lil Nas X, Jack Harlow', album:'Montero', art:'https://i.scdn.co/image/ab67616d0000b273be82673b5f79d9658ec0a9fd', duration:'3:32', spotifyUrl:'#', preview:null },
  { id:'d10', title:'Watermelon Sugar', artist:'Harry Styles', album:'Fine Line', art:'https://i.scdn.co/image/ab67616d0000b2732e8ed79e177ff6011076f5f0', duration:'2:54', spotifyUrl:'#', preview:null },
  { id:'d11', title:'drivers license', artist:'Olivia Rodrigo', album:'SOUR', art:'https://i.scdn.co/image/ab67616d0000b273a91c10fe9472d9bd89802e5a', duration:'4:02', spotifyUrl:'#', preview:null },
  { id:'d12', title:'Save Your Tears', artist:'The Weeknd', album:'After Hours', art:'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36', duration:'3:35', spotifyUrl:'#', preview:null },
];

function mockSearch(query) {
  const q = query.toLowerCase();
  return DEMO_TRACKS.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.artist.toLowerCase().includes(q) ||
    t.album.toLowerCase().includes(q)
  ).slice(0, 6);
}

function msToTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

function renderSearchResults(tracks) {
  const el = document.getElementById('search-results');

  if (!tracks.length) {
    el.innerHTML = '<div class="no-results">No songs found. Try a different search.</div>';
    el.classList.remove('hidden');
    return;
  }

  el.innerHTML = tracks.map(t => `
    <div class="search-result-item" onclick="selectSong(${JSON.stringify(t).replace(/"/g, '&quot;')})">
      <img class="result-art" src="${t.art}" alt="${t.title}" onerror="this.style.background='#1C3050'"/>
      <div class="result-info">
        <div class="result-title">${t.title}</div>
        <div class="result-artist">${t.artist} · ${t.album}</div>
      </div>
      <div class="result-duration">${t.duration}</div>
    </div>
  `).join('');

  el.classList.remove('hidden');
}

// ── RATING FLOW ──
function selectSong(song) {
  // Parse if stringified
  if (typeof song === 'string') song = JSON.parse(song);

  // Check if already rated
  const existing = state.songs.find(s => s.id === song.id);
  if (existing) {
    showToast(`"${song.title}" is already in your list as ${tierLabel(existing.tier)}`);
    closeSearch();
    return;
  }

  state.currentSong = song;
  document.getElementById('search-results').classList.add('hidden');
  document.getElementById('search-input').value = '';

  // Populate modal
  document.getElementById('modal-art').src = song.art;
  document.getElementById('modal-title').textContent = song.title;
  document.getElementById('modal-artist').textContent = song.artist;
  document.getElementById('modal-album').textContent = song.album;

  document.getElementById('rate-modal').classList.remove('hidden');
}

function rateSong(tier) {
  const song = { ...state.currentSong, tier, elo: 1000, ratedAt: Date.now() };
  state.songs.unshift(song);
  saveState();

  document.getElementById('rate-modal').classList.add('hidden');

  // Queue comparisons with existing songs in same tier
  const tierSongs = state.songs.filter(s => s.id !== song.id && s.tier === tier);
  if (tierSongs.length > 0) {
    // Pick random songs to compare (max 3)
    const shuffled = tierSongs.sort(() => Math.random() - 0.5).slice(0, 3);
    state.compareQueue = shuffled.map(s => ({ a: song, b: s }));
    nextCompare();
  } else {
    showToast(`Added "${song.title}" to ${tierLabel(tier)}!`);
    renderRecent();
  }
}

function tierLabel(tier) {
  return { liked: '🔥 Liked', ok: '👍 OK', disliked: '👎 Not for Me' }[tier] || tier;
}

// ── COMPARE FLOW ──
function nextCompare() {
  if (!state.compareQueue.length) {
    showToast('Rankings updated!');
    renderRecent();
    return;
  }

  const { a, b } = state.compareQueue.shift();

  document.getElementById('compare-art-a').src = a.art;
  document.getElementById('compare-title-a').textContent = a.title;
  document.getElementById('compare-artist-a').textContent = a.artist;

  document.getElementById('compare-art-b').src = b.art;
  document.getElementById('compare-title-b').textContent = b.title;
  document.getElementById('compare-artist-b').textContent = b.artist;

  document.getElementById('compare-modal').classList.remove('hidden');

  // Store current pair for pickSong
  state.currentPair = { a, b };
}

function pickSong(winner) {
  const { a, b } = state.currentPair;
  const winnerId = winner === 'a' ? a.id : b.id;
  const loserId  = winner === 'a' ? b.id : a.id;

  updateElo(winnerId, loserId);
  document.getElementById('compare-modal').classList.add('hidden');

  setTimeout(nextCompare, 200);
}

function skipCompare() {
  state.compareQueue = [];
  document.getElementById('compare-modal').classList.add('hidden');
  showToast('Song added — you can compare later.');
  renderRecent();
}

// ── ELO ──
function updateElo(winnerId, loserId) {
  const winner = state.songs.find(s => s.id === winnerId);
  const loser  = state.songs.find(s => s.id === loserId);
  if (!winner || !loser) return;

  const K = 32;
  const expW = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
  const expL = 1 - expW;

  winner.elo = Math.round(winner.elo + K * (1 - expW));
  loser.elo  = Math.round(loser.elo  + K * (0 - expL));

  saveState();
}

// ── RENDER RECENT ──
function renderRecent() {
  const el = document.getElementById('recent-list');
  const recent = [...state.songs].sort((a,b) => b.ratedAt - a.ratedAt).slice(0, 10);

  if (!recent.length) {
    el.innerHTML = '<div class="empty-state"><p>Search for a song above to start building your list.</p></div>';
    return;
  }

  const icons = { liked: '🔥', ok: '👍', disliked: '👎' };

  el.innerHTML = recent.map((s, i) => `
    <div class="recent-item">
      <span class="recent-rank">${i+1}</span>
      <img class="recent-art" src="${s.art}" alt="${s.title}" onerror="this.style.background='#1C3050'"/>
      <div class="recent-info">
        <div class="recent-title">${s.title}</div>
        <div class="recent-artist">${s.artist}</div>
      </div>
      <span class="recent-tier">${icons[s.tier]}</span>
    </div>
  `).join('');
}

// ── RENDER MY LIST ──
function renderMyList() {
  const tiers = ['liked', 'ok', 'disliked'];

  tiers.forEach(tier => {
    const songs = state.songs
      .filter(s => s.tier === tier)
      .sort((a, b) => b.elo - a.elo);

    document.getElementById('count-' + tier).textContent = songs.length;

    const el = document.getElementById('songs-' + tier);

    if (!songs.length) {
      el.innerHTML = `<div class="tier-empty">No songs yet — rate some songs to fill this tier.</div>`;
      return;
    }

    el.innerHTML = songs.map((s, i) => `
      <div class="tier-song-item">
        <span class="tier-song-rank">#${i+1}</span>
        <img class="tier-song-art" src="${s.art}" alt="${s.title}" onerror="this.style.background='#1C3050'"/>
        <div class="tier-song-info">
          <div class="tier-song-title">${s.title}</div>
          <div class="tier-song-artist">${s.artist}</div>
        </div>
      </div>
    `).join('');
  });
}

// ── CLOSE SEARCH ──
function closeSearch() {
  document.getElementById('search-results').classList.add('hidden');
  document.getElementById('search-input').value = '';
}

function closeModal() {
  document.getElementById('rate-modal').classList.add('hidden');
  state.currentSong = null;
}

// Close search on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container')) {
    document.getElementById('search-results').classList.add('hidden');
  }
});

// ── TOAST ──
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    background: #1C3050;
    color: #fff;
    padding: 12px 24px;
    border-radius: 24px;
    font-size: 14px;
    font-weight: 500;
    border: 1px solid rgba(255,255,255,0.1);
    z-index: 999;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: fadeInUp 0.3s ease;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInUp {
      from { opacity:0; transform: translateX(-50%) translateY(10px); }
      to   { opacity:1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── INIT ──
initAuth();
renderRecent();
