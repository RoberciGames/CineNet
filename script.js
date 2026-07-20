// ==========================================
// INFRAESTRUTURA CORE & CHAVES
// ==========================================
const TMDB_KEY = '17c56e3825d7fbae6581866083d0d778'; 
let itemSelecionado = null;
let debounceTimer; 
let currentUserUID = null;
let biblioteca = { watchlist: {}, reviews: {} };
let isLoginMode = true;
const recomendadosVistos = new Set(); // Evita repetições no CineBot

const ADMIN_EMAIL = "roberci.azevedo@academico.ifpb.edu.br"; 

// CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAfPWvnGdvPKZ_lrVwOuag14WHLY9AgML8",
    authDomain: "cinenet-ifpb.firebaseapp.com",
    databaseURL: "https://cinenet-ifpb-default-rtdb.firebaseio.com",
    projectId: "cinenet-ifpb",
    storageBucket: "cinenet-ifpb.firebasestorage.app",
    messagingSenderId: "1098247355110",
    appId: "1:1098247355110:web:c9f867826f26b0ef171927"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

// ==========================================
// AUTENTICAÇÃO E SESSÃO
// ==========================================
document.getElementById('auth-switch-btn').addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? 'Entrar' : 'Registar';
    document.getElementById('auth-submit-btn').innerText = isLoginMode ? 'Entrar' : 'Registar';
});

document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (isLoginMode) firebase.auth().signInWithEmailAndPassword(email, password).catch(err => alert(err.message));
    else firebase.auth().createUserWithEmailAndPassword(email, password).catch(err => alert(err.message));
});

document.getElementById('btn-google-auth').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(err => alert(err.message));
});

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        currentUserUID = user.uid;
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        if (user.email === ADMIN_EMAIL) document.getElementById('li-nav-admin').style.display = 'block';
        carregarDadosUsuario();
        irParaHome();
    } else {
        currentUserUID = null;
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

function logout() { firebase.auth().signOut(); }
document.getElementById('logout-btn-pc').addEventListener('click', logout);

function carregarDadosUsuario() {
    firebase.database().ref('users/' + currentUserUID + '/biblioteca').once('value').then(snapshot => {
        const data = snapshot.val();
        if (data) biblioteca = data;
        if (!biblioteca.watchlist) biblioteca.watchlist = {};
        if (!biblioteca.reviews) biblioteca.reviews = {};
    });
}
function salvarDados() {
    if (currentUserUID) firebase.database().ref('users/' + currentUserUID + '/biblioteca').set(biblioteca);
}

// ==========================================
// NAVEGAÇÃO ENTRE ABAS
// ==========================================
function setNavActive(idDesktop, idMobile) {
    document.querySelectorAll('.nav-menu a, .mobile-bottom-nav a').forEach(el => el.classList.remove('active', 'active-nav'));
    if(idDesktop && document.getElementById(idDesktop)) document.getElementById(idDesktop).classList.add('active');
    if(idMobile && document.getElementById(idMobile)) document.getElementById(idMobile).classList.add('active-nav');
}

function esconderTodasSessoes() {
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('search-results-section').style.display = 'none';
    document.getElementById('watchlist-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none'; 
    document.getElementById('admin-section').style.display = 'none';
}

function irParaHome() {
    setNavActive('nav-home', 'mob-nav-home');
    esconderTodasSessoes();
    document.getElementById('main-content').style.display = 'block';
    carregarHome();
}

function irParaBusca() {
    setNavActive('nav-search', 'mob-nav-search');
    esconderTodasSessoes();
    document.getElementById('search-results-section').style.display = 'block';
}

function irParaWatchlist() {
    setNavActive('nav-watchlist', 'mob-nav-watchlist');
    esconderTodasSessoes();
    document.getElementById('watchlist-section').style.display = 'block';
    renderizarWatchlist();
}

function irParaChat() {
    setNavActive('nav-chat', 'mob-nav-chat');
    esconderTodasSessoes();
    document.getElementById('chat-section').style.display = 'block';
}

function irParaAdmin() {
    if (firebase.auth().currentUser.email !== ADMIN_EMAIL) return alert("Acesso Negado!");
    setNavActive('nav-admin', null);
    esconderTodasSessoes();
    document.getElementById('admin-section').style.display = 'block';
}

// Listeners de Clique
document.getElementById('nav-home').onclick = irParaHome;
document.getElementById('mob-nav-home').onclick = irParaHome;
document.getElementById('nav-search').onclick = irParaBusca;
document.getElementById('mob-nav-search').onclick = irParaBusca;
document.getElementById('nav-watchlist').onclick = irParaWatchlist;
document.getElementById('mob-nav-watchlist').onclick = irParaWatchlist;
document.getElementById('nav-chat').onclick = irParaChat;
document.getElementById('mob-nav-chat').onclick = irParaChat;
document.getElementById('nav-admin').onclick = irParaAdmin;

// ==========================================
// TMDB & CATALOGO
// ==========================================
async function fetchTMDB(endpoint) {
    try {
        const res = await fetch(`https://api.themoviedb.org/3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}&language=pt-PT`);
        return await res.json();
    } catch { return { results: [] }; }
}

async function carregarHome() {
    const [dataTrending, dataMovies, dataSeries] = await Promise.all([
        fetchTMDB('/trending/all/day'), fetchTMDB('/movie/popular'), fetchTMDB('/tv/popular')
    ]);

    if (dataTrending.results.length > 0) {
        const hero = dataTrending.results[0];
        const mediaType = hero.media_type || 'movie';
        document.getElementById('hero-banner').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${hero.backdrop_path})`;
        document.getElementById('hero-title').innerText = hero.title || hero.name;
        document.getElementById('hero-desc').innerText = hero.overview || "";
        document.getElementById('hero-play-btn').onclick = () => abrirPlayer(hero.id, mediaType);
        document.getElementById('hero-info-btn').onclick = () => abrirDetalhes(hero.id, mediaType);
    }
    renderCards(dataTrending.results, 'row-trending');
    renderCards(dataMovies.results, 'row-movies', 'movie');
    renderCards(dataSeries.results, 'row-series', 'tv');
}

function renderCards(items, containerId, forceType = null) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';
    items.forEach(item => {
        if (!item.poster_path) return;
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title || item.name}">`;
        card.onclick = () => abrirDetalhes(item.id, forceType || item.media_type || 'movie');
        container.appendChild(card);
    });
}

// ==========================================
// BUSCA AVANÇADA
// ==========================================
let filtroBuscaAtual = 'all';
function setSearchFilter(tipo, el) {
    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');
    filtroBuscaAtual = tipo;
    executarBusca(document.getElementById('main-search-input').value);
}

document.getElementById('main-search-input').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const termo = e.target.value;
    document.getElementById('search-clear').style.display = termo.length > 0 ? 'block' : 'none';
    debounceTimer = setTimeout(() => { if (termo.length >= 2) executarBusca(termo); }, 600);
});

function limparBusca() {
    document.getElementById('main-search-input').value = '';
    document.getElementById('search-clear').style.display = 'none';
    document.getElementById('search-grid').innerHTML = '';
}

async function executarBusca(termo) {
    const container = document.getElementById('search-grid');
    container.innerHTML = '';
    const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(termo)}`);
    
    let resultados = (data.results || []).filter(i => i.poster_path && (i.media_type === 'movie' || i.media_type === 'tv'));
    if(filtroBuscaAtual !== 'all') resultados = resultados.filter(i => i.media_type === filtroBuscaAtual);

    if (resultados.length === 0) document.getElementById('search-empty-state').style.display = 'block';
    else {
        document.getElementById('search-empty-state').style.display = 'none';
        resultados.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title || item.name}">`;
            card.onclick = () => abrirDetalhes(item.id, item.media_type || 'movie');
            container.appendChild(card);
        });
    }
}

// ==========================================
// MODAL & REPRODUTOR (mgeb.top)
// ==========================================
async function abrirDetalhes(id, tipo) {
    const data = await fetchTMDB(`/${tipo}/${id}`);
    itemSelecionado = { id: id, tipo: tipo, poster_path: data.poster_path, title: data.title || data.name };
    
    document.getElementById('modal-banner').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${data.backdrop_path || data.poster_path})`;
    document.getElementById('modal-title').innerText = itemSelecionado.title;
    document.getElementById('modal-year').innerText = (data.release_date || data.first_air_date || 'N/A').substring(0, 4);
    document.getElementById('modal-rating').innerText = `⭐ ${data.vote_average ? data.vote_average.toFixed(1) : 'N/A'}`;
    document.getElementById('modal-overview').innerText = data.overview || "Sem sinopse disponível.";
    document.getElementById('modal-play-btn').onclick = () => abrirPlayer(id, tipo);
    
    document.getElementById('btn-watchlist').innerText = biblioteca.watchlist[id] ? "✔ Na Minha Lista" : "+ A Minha Lista";
    
    const userRating = biblioteca.reviews[id] || 0;
    atualizarEstrelasUI(userRating);

    document.getElementById('detailsModal').style.display = 'flex'; 
    document.body.classList.add('modal-open');
}

function fecharDetalhes() {
    document.getElementById('detailsModal').style.display = 'none';
    document.body.classList.remove('modal-open');
}

function votarEstrelas(num) {
    if (!itemSelecionado) return;
    biblioteca.reviews[itemSelecionado.id] = num;
    salvarDados();
    atualizarEstrelasUI(num);
}

function atualizarEstrelasUI(num) {
    const stars = document.querySelectorAll('.star-unit');
    stars.forEach((star, index) => {
        if (index < num) star.classList.add('active');
        else star.classList.remove('active');
    });
}

async function abrirPlayer(id, tipo, temporada = 1, episodio = 1) {
    fecharDetalhes();
    const selectorsBox = document.getElementById('episodes-selectors-box');
    const seasonSelect = document.getElementById('player-season-select');
    const epSelect = document.getElementById('player-episode-select');

    if (tipo === 'tv') {
        selectorsBox.style.display = 'flex';
        const tvData = await fetchTMDB(`/tv/${id}`);
        seasonSelect.innerHTML = '';
        const numSeasons = tvData.number_of_seasons || 1;
        
        for (let s = 1; s <= numSeasons; s++) {
            const opt = document.createElement('option');
            opt.value = s;
            opt.innerText = `Temporada ${s}`;
            if (s === temporada) opt.selected = true;
            seasonSelect.appendChild(opt);
        }

        const atualizarEpisodios = (sNum) => {
            epSelect.innerHTML = '';
            for (let e = 1; e <= 24; e++) {
                const opt = document.createElement('option');
                opt.value = e;
                opt.innerText = `Episódio ${e}`;
                if (e === episodio) opt.selected = true;
                epSelect.appendChild(opt);
            }
        };
        atualizarEpisodios(temporada);

        seasonSelect.onchange = () => {
            const s = parseInt(seasonSelect.value);
            atualizarEpisodios(s);
            document.getElementById('videoPlayer').src = `https://mgeb.top/embed/tv/${id}/${s}/1`;
        };
        epSelect.onchange = () => {
            const s = parseInt(seasonSelect.value);
            const e = parseInt(epSelect.value);
            document.getElementById('videoPlayer').src = `https://mgeb.top/embed/tv/${id}/${s}/${e}`;
        };

        document.getElementById('videoPlayer').src = `https://mgeb.top/embed/tv/${id}/${temporada}/${episodio}`;
    } else {
        selectorsBox.style.display = 'none';
        document.getElementById('videoPlayer').src = `https://mgeb.top/embed/movie/${id}`;
    }
    document.getElementById('streaming-player-screen').style.display = 'block';
}

document.getElementById('close-player-btn').addEventListener('click', () => {
    document.getElementById('streaming-player-screen').style.display = 'none';
    document.getElementById('videoPlayer').src = '';
});

// Watchlist
function alternarWatchlist() {
    const id = itemSelecionado.id;
    if (biblioteca.watchlist[id]) delete biblioteca.watchlist[id];
    else biblioteca.watchlist[id] = itemSelecionado;
    document.getElementById('btn-watchlist').innerText = biblioteca.watchlist[id] ? "✔ Na Minha Lista" : "+ A Minha Lista";
    salvarDados();
}

function renderizarWatchlist() {
    const grid = document.getElementById('watchlist-grid');
    grid.innerHTML = '';
    const items = Object.values(biblioteca.watchlist);
    if(items.length === 0) document.getElementById('watchlist-empty-state').style.display = 'block';
    else {
        document.getElementById('watchlist-empty-state').style.display = 'none';
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title}">`;
            card.onclick = () => abrirDetalhes(item.id, item.tipo);
            grid.appendChild(card);
        });
    }
}

// ==========================================
// CINEBOT (CHATBOT CONECTADO AO mgeb.top)
// ==========================================
const chatInput = document.getElementById('chatbot-input');
const sendBtn = document.getElementById('chatbot-send-btn');
const messagesContainer = document.getElementById('chatbot-messages');

function addMessage(content, type) {
    const msgDiv = document.createElement('div');
    msgDiv.className = type === 'user' ? 'user-msg' : 'bot-msg';
    msgDiv.innerHTML = content; 
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; 
}

async function processarMensagemBot(msg) {
    const text = msg.toLowerCase();
    let endpoint = '';
    let tipoPadrao = 'movie';

    const generos = {
        'ação': 28, 'acao': 28,
        'comédia': 35, 'comedia': 35,
        'terror': 27, 'medo': 27,
        'ficção': 878, 'ficcao': 878,
        'romance': 10749,
        'animação': 16, 'animacao': 16,
        'drama': 18,
        'aventura': 12
    };

    let generoID = null;
    for (let key in generos) {
        if (text.includes(key)) { generoID = generos[key]; break; }
    }

    if (generoID) {
        endpoint = `/discover/movie?with_genres=${generoID}&sort_by=popularity.desc`;
    } else if (text.includes('série') || text.includes('serie')) {
        endpoint = `/tv/popular`;
        tipoPadrao = 'tv';
    } else if (text.includes('destaque') || text.includes('popula') || text.includes('top')) {
        endpoint = `/trending/all/week`;
    } else {
        endpoint = `/search/multi?query=${encodeURIComponent(msg)}`;
    }

    const data = await fetchTMDB(endpoint);
    let resultados = (data.results || []).filter(item => item.poster_path && !recomendadosVistos.has(item.id));

    // Se já tiver recomendado tudo da lista, reseta o histórico
    if (resultados.length === 0) {
        resultados = (data.results || []).filter(item => item.poster_path);
    }

    if (resultados.length === 0) {
        addMessage("Não encontrei nenhuma recomendação para esse pedido. Experimenta procurar por um género como *'Ação'*, *'Terror'* ou pelo nome de um filme!", 'bot');
        return;
    }

    const item = resultados[0];
    recomendadosVistos.add(item.id);

    const mediaType = item.media_type || tipoPadrao;
    const titulo = item.title || item.name;
    const sinopse = item.overview ? (item.overview.substring(0, 110) + "...") : "Sem sinopse disponível.";
    const poster = `https://image.tmdb.org/t/p/w200${item.poster_path}`;

    const cardHTML = `
        <div class="bot-card-recommendation">
            <img src="${poster}" alt="${titulo}">
            <div class="bot-card-info">
                <h4>${titulo}</h4>
                <p>${sinopse}</p>
                <div class="bot-card-actions">
                    <button class="btn-play-sm" onclick="abrirPlayer(${item.id}, '${mediaType}')">▶ Assistir Agora</button>
                    <button class="btn-info-sm" onclick="abrirDetalhes(${item.id}, '${mediaType}')">ℹ Detalhes</button>
                </div>
            </div>
        </div>
    `;

    addMessage(`Aqui tens uma excelente sugestão para ti:<br>${cardHTML}`, 'bot');
}

function enviarChat() {
    const text = chatInput.value.trim();
    if(!text) return;
    addMessage(text, 'user');
    chatInput.value = '';
    setTimeout(() => processarMensagemBot(text), 500);
}

sendBtn.onclick = enviarChat;
chatInput.onkeypress = (e) => { if(e.key === 'Enter') enviarChat(); };
document.getElementById('chat-quick-actions').onclick = (e) => {
    if(e.target.classList.contains('chat-chip')) {
        chatInput.value = e.target.innerText;
        enviarChat();
    }
};