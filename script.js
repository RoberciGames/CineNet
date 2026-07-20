// ==========================================
// INFRAESTRUTURA CORE & CHAVES
// ==========================================
const TMDB_KEY = '17c56e3825d7fbae6581866083d0d778'; 
let itemSelecionado = null;
let debounceTimer; 
let currentUserUID = null;
let isLoginMode = true;

// Estrutura completa do utilizador
let biblioteca = { 
    watchlist: {}, 
    reviews: {}, 
    perfil: { 
        nome: 'Utilizador', 
        avatar: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png' 
    } 
};

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
        if (!biblioteca.perfil) {
            biblioteca.perfil = { 
                nome: 'Utilizador', 
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png' 
            };
        }

        atualizarUIPerfil();
    });
}

function salvarDados() {
    if (currentUserUID) {
        firebase.database().ref('users/' + currentUserUID + '/biblioteca').set(biblioteca);
    }
}

function atualizarUIPerfil() {
    const userElem = document.getElementById('user-name-pc');
    const avatarElem = document.getElementById('user-avatar-pc');
    
    if (userElem) userElem.innerText = biblioteca.perfil.nome || 'Utilizador';
    if (avatarElem) avatarElem.src = biblioteca.perfil.avatar || 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png';
}

// ==========================================
// SISTEMA DE EDIÇÃO DE PERFIL E AVATARES
// ==========================================
const avataresDisponiveis = [
    "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png",
    "https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg",
    "https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-88wkdmjrorckekha.jpg",
    "https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-vnl1thqhwxcpvn7n.jpg",
    "https://pro2-bar-s3-cdn-cf.myportfolio.com/dddb0c1b4ab622854dd81280840458d3/877ad1ce3a479ef9498e1efc_rw_600.png",
    "https://i.pinimg.com/originals/b6/77/cd/b677cd1cde292f261166533d6fe75872.png",
    "https://i.pinimg.com/originals/c0/8e/6c/c08e6c9595e03202a46a95f66578799f.png",
    "https://i.pinimg.com/originals/30/db/47/30db479e1558c3ed46b4ed23b3cd98ae.png",
    "https://i.pinimg.com/originals/fb/8e/8a/fb8e8a96fca2f049334f31208ce3238c.png",
    "https://i.pinimg.com/originals/61/54/76/61547625e01d8daf941aeb3ff15201a4.png"
];

let avatarSelecionadoTemp = '';

document.getElementById('profile-trigger-pc').addEventListener('click', abrirPerfil);

function abrirPerfil() {
    document.getElementById('profile-name-input').value = biblioteca.perfil.nome || '';
    avatarSelecionadoTemp = biblioteca.perfil.avatar || avataresDisponiveis[0];
    renderizarAvatares();
    
    document.getElementById('profileModal').style.display = 'flex';
    document.body.classList.add('modal-open');
}

function fecharPerfil() {
    document.getElementById('profileModal').style.display = 'none';
    document.body.classList.remove('modal-open');
}

function renderizarAvatares() {
    const grid = document.getElementById('avatar-grid');
    grid.innerHTML = '';
    
    avataresDisponiveis.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'avatar-option';
        if (url === avatarSelecionadoTemp) img.classList.add('selected');
        
        img.onclick = () => {
            avatarSelecionadoTemp = url;
            renderizarAvatares();
        };
        
        grid.appendChild(img);
    });
}

function salvarPerfil() {
    const novoNome = document.getElementById('profile-name-input').value.trim() || 'Utilizador';
    
    biblioteca.perfil.nome = novoNome;
    biblioteca.perfil.avatar = avatarSelecionadoTemp;
    
    atualizarUIPerfil();
    salvarDados();
    fecharPerfil();
}

// ==========================================
// NAVEGAÇÃO ENTRE ABAS
// ==========================================
function setNavActive(idDesktop, idMobile) {
    document.querySelectorAll('.nav-menu a, .mobile-bottom-nav a').forEach(el => el.classList.remove('active', 'active-nav'));
    if(idDesktop) document.getElementById(idDesktop).classList.add('active');
    if(idMobile) document.getElementById(idMobile).classList.add('active-nav');
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
    setNavActive('nav-watchlist', null);
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
document.getElementById('nav-chat').onclick = irParaChat;
document.getElementById('mob-nav-chat').onclick = irParaChat;
document.getElementById('nav-admin').onclick = irParaAdmin;

// ==========================================
// TMDB & CATÁLOGO
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
        document.getElementById('hero-banner').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${hero.backdrop_path})`;
        document.getElementById('hero-title').innerText = hero.title || hero.name;
        document.getElementById('hero-desc').innerText = hero.overview || "";
        document.getElementById('hero-play-btn').onclick = () => abrirDetalhes(hero.id, hero.media_type || 'movie', true);
        document.getElementById('hero-info-btn').onclick = () => abrirDetalhes(hero.id, hero.media_type || 'movie');
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
        card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}">`;
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
    
    let resultados = data.results.filter(i => i.poster_path && (i.media_type === 'movie' || i.media_type === 'tv'));
    if(filtroBuscaAtual !== 'all') resultados = resultados.filter(i => i.media_type === filtroBuscaAtual);

    if (resultados.length === 0) document.getElementById('search-empty-state').style.display = 'block';
    else {
        document.getElementById('search-empty-state').style.display = 'none';
        resultados.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}">`;
            card.onclick = () => abrirDetalhes(item.id, item.media_type || 'movie');
            container.appendChild(card);
        });
    }
}

// ==========================================
// MODAL DETALHES & REPRODUTOR
// ==========================================
async function abrirDetalhes(id, tipo, diretoplay = false) {
    const data = await fetchTMDB(`/${tipo}/${id}`);
    itemSelecionado = { id: id, tipo: tipo, poster_path: data.poster_path, title: data.title || data.name };
    
    document.getElementById('modal-banner').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${data.backdrop_path || data.poster_path})`;
    document.getElementById('modal-title').innerText = itemSelecionado.title;
    document.getElementById('modal-overview').innerText = data.overview || "Sem sinopse disponível.";
    document.getElementById('modal-play-btn').onclick = () => abrirPlayer(id, tipo);
    
    document.getElementById('btn-watchlist').innerText = biblioteca.watchlist[id] ? "✔ Na Minha Lista" : "+ A Minha Lista";
    
    if (diretoplay) abrirPlayer(id, tipo); 
    else { document.getElementById('detailsModal').style.display = 'flex'; document.body.classList.add('modal-open'); }
}

function fecharDetalhes() {
    document.getElementById('detailsModal').style.display = 'none';
    document.body.classList.remove('modal-open');
}

async function abrirPlayer(id, tipo) {
    fecharDetalhes();
    if (tipo === 'tv') {
        document.getElementById('episodes-selectors-box').style.display = 'flex';
        document.getElementById('videoPlayer').src = `https://mgeb.top/embed/tv/${id}/1/1`;
    } else {
        document.getElementById('episodes-selectors-box').style.display = 'none';
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
            card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}">`;
            card.onclick = () => abrirDetalhes(item.id, item.tipo);
            grid.appendChild(card);
        });
    }
}

// ==========================================
// CINEBOT (CHATBOT)
// ==========================================
const chatInput = document.getElementById('chatbot-input');
const sendBtn = document.getElementById('chatbot-send-btn');
const messagesContainer = document.getElementById('chatbot-messages');

function addMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.className = type === 'user' ? 'user-msg' : 'bot-msg';
    msgDiv.innerHTML = text; 
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; 
}

function processarMensagem(msg) {
    const text = msg.toLowerCase();
    if(text.includes('ação') || text.includes('acao')) return "Recomendo 'John Wick' ou 'Mad Max'! Pesquise por eles na aba de Busca.";
    if(text.includes('comédia') || text.includes('comedia')) return "Que tal 'Superbad' ou 'Se Beber, Não Case!'?";
    if(text.includes('terror') || text.includes('medo')) return "Prepara o coração: 'Invocação do Mal' ou 'Hereditário'!";
    if(text.includes('destaque') || text.includes('novo')) return "Dá uma olhadinha na nossa Home! Lá temos os destaques mundiais atualizados diariamente.";
    return "Interessante! Procura por essa palavra na aba de Busca (🔍) e vais encontrar grandes resultados!";
}

function enviarChat() {
    const text = chatInput.value.trim();
    if(!text) return;
    addMessage(text, 'user');
    chatInput.value = '';
    setTimeout(() => addMessage(processarMensagem(text), 'bot'), 600);
}

sendBtn.onclick = enviarChat;
chatInput.onkeypress = (e) => { if(e.key === 'Enter') enviarChat(); };
document.getElementById('chat-quick-actions').onclick = (e) => {
    if(e.target.classList.contains('chat-chip')) {
        chatInput.value = e.target.innerText;
        enviarChat();
    }
};