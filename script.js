// ==========================================
// CONFIGURAÇÕES PRINCIPAIS E CHAVES
// ==========================================
const TMDB_KEY = '17c56e3825d7fbae6581866083d0d778'; 
let itemSelecionado = null;
let debounceTimer; 
let currentUserUID = null;
let biblioteca = { watchlist: {}, reviews: {} };
let isLoginMode = true;
let itemModalAtual = null;

// Variáveis do Perfil (Mantido)
let perfilUsuario = {
    username: "CineNet User",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
};
let avatarTemp = "";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAfPWvnGdvPKZ_lrVwOuag14WHLY9AgML8",
    authDomain: "cinenet-ifpb.firebaseapp.com",
    databaseURL: "https://cinenet-ifpb-default-rtdb.firebaseio.com",
    projectId: "cinenet-ifpb",
    storageBucket: "cinenet-ifpb.firebasestorage.app",
    messagingSenderId: "1098247355110",
    appId: "1:1098247355110:web:c9f867826f26b0ef171927"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// ==========================================
// AUTENTICAÇÃO
// ==========================================
document.getElementById('auth-switch-btn').addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? 'CineNet' : 'Criar Conta';
    document.getElementById('auth-submit-btn').innerText = isLoginMode ? 'Entrar' : 'Registar';
});

document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const auth = firebase.auth();
    
    if (isLoginMode) {
        auth.signInWithEmailAndPassword(email, password).catch(err => mostrarErroAuth(err.message));
    } else {
        auth.createUserWithEmailAndPassword(email, password).catch(err => mostrarErroAuth(err.message));
    }
});

document.getElementById('btn-google-auth').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(err => mostrarErroAuth(err.message));
});

function mostrarErroAuth(msg) {
    const errBox = document.getElementById('auth-error');
    errBox.innerText = msg;
    errBox.style.display = 'block';
}

// Monitor de Estado de Login
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        currentUserUID = user.uid;
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        carregarDadosUsuario();
        irParaHome();
    } else {
        currentUserUID = null;
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

document.getElementById('logout-btn-pc').addEventListener('click', () => {
    firebase.auth().signOut();
});

// ==========================================
// DADOS DO UTILIZADOR (Watchlist)
// ==========================================
function carregarDadosUsuario() {
    if (!currentUserUID) return;
    
    firebase.database().ref('users/' + currentUserUID + '/biblioteca/watchlist').once('value').then(snapshot => {
        const data = snapshot.val();
        if (data) biblioteca.watchlist = data;
        renderizarWatchlistWidgets();
    });
}

function salvarDadosWatchlist() {
    if (currentUserUID) {
        firebase.database().ref('users/' + currentUserUID + '/biblioteca/watchlist').set(biblioteca.watchlist);
    }
    renderizarWatchlistWidgets();
    if(document.getElementById('watchlist-section').style.display === 'block') {
        renderizarWatchlistCompleta();
    }
}

function toggleWatchlist(item) {
    if(biblioteca.watchlist[item.id]) {
        delete biblioteca.watchlist[item.id];
        document.getElementById('modal-add-list-btn').innerText = "⭐ Adicionar à Lista";
        document.getElementById('modal-add-list-btn').classList.replace('neon-btn-red', 'neon-btn-red-dark');
    } else {
        biblioteca.watchlist[item.id] = {
            id: item.id, 
            title: item.title || item.name, 
            poster_path: item.poster_path, 
            media_type: item.media_type || 'movie'
        };
        document.getElementById('modal-add-list-btn').innerText = "✔️ Na Sua Lista";
        document.getElementById('modal-add-list-btn').classList.replace('neon-btn-red-dark', 'neon-btn-red');
    }
    salvarDadosWatchlist();
}

// ==========================================
// NAVEGAÇÃO
// ==========================================
function setNavActive(idDesktop, idMobile) {
    document.querySelectorAll('.nav-menu a, .mobile-bottom-nav a').forEach(el => el.classList.remove('active', 'active-nav'));
    if(idDesktop) document.getElementById(idDesktop).classList.add('active');
    if(idMobile) document.getElementById(idMobile).classList.add('active-nav');
}

function esconderSessoes() {
    document.querySelectorAll('.content-area .app-section').forEach(sec => sec.style.display = 'none');
}

function irParaHome() {
    setNavActive('nav-home', 'mob-nav-home');
    esconderSessoes();
    document.getElementById('home-section').style.display = 'block';
    if(document.getElementById('row-trending').innerHTML === '') carregarHomeContent();
}

function irParaBusca() {
    setNavActive('nav-search', 'mob-nav-search');
    esconderSessoes();
    document.getElementById('search-full-section').style.display = 'block';
    if(window.innerWidth > 1024 && document.getElementById('search-grid').innerHTML === '') {
        document.getElementById('main-search-input').focus();
    }
}

function irParaWatchlist() {
    setNavActive('nav-watchlist', 'mob-nav-watchlist'); 
    esconderSessoes();
    document.getElementById('watchlist-section').style.display = 'block';
    renderizarWatchlistCompleta();
}

document.getElementById('nav-home').onclick = irParaHome;
document.getElementById('mob-nav-home').onclick = irParaHome;
document.getElementById('nav-search').onclick = irParaBusca;
document.getElementById('mob-nav-search').onclick = irParaBusca;
document.getElementById('nav-watchlist').onclick = irParaWatchlist;
document.getElementById('mob-nav-watchlist').onclick = irParaWatchlist;

// ==========================================
// TMDB API & RENDERIZAÇÃO
// ==========================================
async function fetchTMDB(endpoint) {
    try {
        const res = await fetch(`https://api.themoviedb.org/3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}&language=pt-PT`);
        return await res.json();
    } catch { return null; }
}

async function carregarHomeContent() {
    const data = await fetchTMDB('/trending/all/day');
    
    if (!data) return;

    if (data.results.length > 0) {
        const hero = data.results[0];
        const bannerUrl = hero.backdrop_path ? `https://image.tmdb.org/t/p/original${hero.backdrop_path}` : '';
        document.getElementById('hero-banner').style.backgroundImage = `url(${bannerUrl})`;
        document.getElementById('hero-title').innerText = hero.title || hero.name;
        document.getElementById('hero-desc').innerText = hero.overview ? hero.overview.substring(0, 150) + '...' : "";
        document.getElementById('hero-info-btn').onclick = () => abrirDetalhes(hero);
    }
    renderCards(data.results, 'row-trending');
}

function renderCards(items, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    items.filter(i => i.poster_path).forEach(item => {
        const card = document.createElement('div');
        card.className = 'movie-card glass-panel';
        card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title || item.name}">`;
        card.onclick = () => abrirDetalhes(item);
        container.appendChild(card);
    });
}

// ==========================================
// MODAL DE DETALHES
// ==========================================
const modal = document.getElementById('movie-modal');

function abrirDetalhes(item) {
    if(!item) return;
    itemModalAtual = item;
    const isMovie = item.media_type === 'movie' || item.title;
    
    document.getElementById('modal-img').src = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
    document.getElementById('modal-title').innerText = item.title || item.name;
    
    const date = item.release_date || item.first_air_date || 'N/A';
    document.getElementById('modal-meta').innerText = `${date.substring(0,4)} • ${isMovie ? 'Filme' : 'Série'} • ⭐ ${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}`;
    document.getElementById('modal-desc').innerText = item.overview || "Nenhuma descrição disponível em português.";
    
    const btnAdd = document.getElementById('modal-add-list-btn');
    if(biblioteca.watchlist[item.id]) {
        btnAdd.innerText = "✔️ Na Sua Lista";
        btnAdd.className = "btn-info neon-btn-red";
    } else {
        btnAdd.innerText = "⭐ Adicionar à Lista";
        btnAdd.className = "btn-info neon-btn-red-dark";
    }
    
    btnAdd.onclick = () => toggleWatchlist(item);
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

document.getElementById('close-modal').onclick = fecharModal;
modal.addEventListener('click', (e) => { if(e.target === modal) fecharModal(); });

function fecharModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ==========================================
// BUSCA AVANÇADA
// ==========================================
let filtroBusca = 'all';

function setSearchFilter(tipo, el) {
    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');
    filtroBusca = tipo;
    const termo = document.getElementById('main-search-input').value;
    if(termo.length > 1) executarBusca(termo);
}

document.getElementById('main-search-input').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const termo = e.target.value.trim();
    document.getElementById('search-clear').style.display = termo.length > 0 ? 'block' : 'none';
    if(termo.length === 0) { limparBusca(); return; }
    debounceTimer = setTimeout(() => { if (termo.length > 1) executarBusca(termo); }, 500);
});

function limparBusca() {
    document.getElementById('main-search-input').value = '';
    document.getElementById('search-clear').style.display = 'none';
    document.getElementById('search-grid').innerHTML = '';
}

async function executarBusca(termo) {
    irParaBusca(); 
    const container = document.getElementById('search-grid');
    container.innerHTML = '<p style="color:#777;">Pesquisando...</p>';
    
    const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(termo)}`);
    if(!data) { container.innerHTML = '<p>Erro: Falha ao buscar dados.</p>'; return; }
    
    let resultados = data.results.filter(i => i.poster_path && (i.media_type === 'movie' || i.media_type === 'tv'));
    if(filtroBusca !== 'all') resultados = resultados.filter(i => i.media_type === filtroBusca);

    if (resultados.length === 0) container.innerHTML = `<p style="color:#777;">Nenhum resultado para "${termo}".</p>`;
    else renderCards(resultados, 'search-grid');
}

// ==========================================
// RENDERIZAÇÃO DA WATCHLIST
// ==========================================
function renderizarWatchlistWidgets() {
    const grid = document.getElementById('watchlist-preview-grid');
    grid.innerHTML = '';
    const items = Object.values(biblioteca.watchlist).slice(0, 6);
    
    if(items.length === 0) {
        grid.innerHTML = '<p style="color:#555; grid-column:1/-1;">Sem filmes na lista.</p>';
    } else {
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'movie-card-mini neon-border-red';
            div.innerHTML = `<img src="https://image.tmdb.org/t/p/w185${item.poster_path}" alt="Poster">`;
            div.onclick = () => abrirDetalhes(item);
            grid.appendChild(div);
        });
    }
}

function renderizarWatchlistCompleta() {
    const grid = document.getElementById('watchlist-grid');
    const emptyState = document.getElementById('watchlist-empty-state');
    const items = Object.values(biblioteca.watchlist);
    
    grid.innerHTML = '';
    if(items.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        renderCards(items, 'watchlist-grid');
    }
}

// ==========================================
// CINEBOT
// ==========================================
const chatInput = document.getElementById('chatbot-input');
const chatMsgs = document.getElementById('chatbot-messages');

function addChatMessage(text, tipo) {
    const div = document.createElement('div');
    div.className = tipo === 'user' ? 'user-msg glass-msg' : 'bot-msg glass-msg';
    div.innerText = text; 
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

document.getElementById('chatbot-send-btn').onclick = () => {
    const txt = chatInput.value.trim();
    if(!txt) return;
    addChatMessage(txt, 'user');
    chatInput.value = '';
    setTimeout(() => {
        let resp = "Interessante! Tenta pesquisar palavras-chave na Busca Rápida acima. 🔍";
        if(txt.toLowerCase().includes('ação')) resp = "Se gostas de Ação, pesquisa por 'John Wick'!";
        else if(txt.toLowerCase().includes('comédia')) resp = "Para rir, recomendo 'Superbad'.";
        addChatMessage(resp, 'bot');
    }, 600);
};