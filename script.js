// ==========================================
// INFRAESTRUTURA CORE & CHAVES (Mantido)
// ==========================================
const TMDB_KEY = '17c56e3825d7fbae6581866083d0d778'; 
let itemSelecionado = null;
let debounceTimer; 
let currentUserUID = null;
let biblioteca = { watchlist: {}, reviews: {} };
let isLoginMode = true;

// Variáveis do Perfil (Mantido)
let perfilUsuario = {
    username: "CineNet User",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
};
let avatarTemp = "";

// Configuração do Firebase (Substitua pelas suas chaves reais se necessário)
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
// AUTENTICAÇÃO E SESSÃO (Mantido com novos IDs)
// ==========================================
document.getElementById('auth-switch-btn').addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? 'CineNet' : 'Registar';
    document.getElementById('auth-submit-btn').innerText = isLoginMode ? 'Entrar' : 'Registar';
});

document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const auth = firebase.auth();
    if (isLoginMode) auth.signInWithEmailAndPassword(email, password).catch(err => mostrarErroAuth(err.message));
    else auth.createUserWithEmailAndPassword(email, password).catch(err => mostrarErroAuth(err.message));
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

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        currentUserUID = user.uid;
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        carregarDadosUsuario();
        irParaHome(); // Carrega a home por padrão
    } else {
        currentUserUID = null;
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

function logout() { firebase.auth().signOut(); }
document.getElementById('logout-btn-pc').addEventListener('click', logout);

// ==========================================
// PERFIL E DADOS DO UTILIZADOR (Mantido)
// ==========================================
function carregarDadosUsuario() {
    firebase.database().ref('users/' + currentUserUID).once('value').then(snapshot => {
        const data = snapshot.val();
        if (data) {
            if(data.biblioteca) biblioteca = data.biblioteca;
            if(data.perfil) perfilUsuario = data.perfil;
        }
        // Garante estrutura básica
        if (!biblioteca.watchlist) biblioteca.watchlist = {};
        atualizarInterfacePerfil();
        renderizarWatchlistWidgets(); // Atualiza os previews na sidebar/main
    });
}

function salvarDadosWatchlist() {
    if (currentUserUID) firebase.database().ref('users/' + currentUserUID + '/biblioteca/watchlist').set(biblioteca.watchlist);
}

function atualizarInterfacePerfil() {
    document.getElementById('user-name-pc').innerText = perfilUsuario.username;
    document.getElementById('user-avatar-pc').src = perfilUsuario.avatar;
    document.getElementById('user-avatar-mobile').src = perfilUsuario.avatar;
}

// ==========================================
// NAVEGAÇÃO ENTRE ABAS (Revisado e Simplificado - Sem TV)
// ==========================================
function setNavActive(idDesktop, idMobile) {
    // Remove active de todos os links (topo e mobile)
    document.querySelectorAll('.nav-menu a, .mobile-bottom-nav a').forEach(el => el.classList.remove('active', 'active-nav'));
    // Adiciona ao link correspondente se existir
    if(idDesktop) {
        const dkLink = document.getElementById(idDesktop);
        if(dkLink) dkLink.classList.add('active');
    }
    if(idMobile) {
        const mbLink = document.getElementById(idMobile);
        if(mbLink) mbLink.classList.add('active-nav');
    }
}

function esconderTodasSessoesPrincipais() {
    // Esconde apenas as seções da área 'Main'
    document.querySelectorAll('.content-area .app-section').forEach(sec => sec.style.display = 'none');
    // A sidebar permanece visível no layout desktop
}

function irParaHome() {
    setNavActive('nav-home', 'mob-nav-home');
    esconderTodasSessoesPrincipais();
    document.getElementById('home-section').style.display = 'block';
    carregarHomeContent();
}

function irParaBusca() {
    setNavActive('nav-search', 'mob-nav-search');
    esconderTodasSessoesPrincipais();
    // A busca agora é primariamente pelo widget na sidebar, 
    // mas podemos mostrar uma grade completa de resultados se necessário
    document.getElementById('search-full-section').style.display = 'block';
    document.getElementById('main-search-input').focus(); // Foca no input da sidebar
}

function irParaWatchlist() {
    setNavActive('nav-watchlist', null); 
    esconderTodasSessoesPrincipais();
    document.getElementById('watchlist-section').style.display = 'block';
    renderizarWatchlistCompleta();
}

function irParaChat() {
    setNavActive('nav-chat', null);
    // O chat é um widget fixo na sidebar em desktop. 
    // Em mobile, pode-se implementar uma lógica para focar ou rolar até ele.
    if(window.innerWidth > 1024) {
        document.getElementById('chatbot-input').focus();
    } else {
        // Lógica mobile para chat (ex: rolar até o widget)
        document.getElementById('chat-widget').scrollIntoView({ behavior: 'smooth' });
    }
}

// Listeners de Navegação (Sem TV)
document.getElementById('nav-home').onclick = irParaHome;
document.getElementById('mob-nav-home').onclick = irParaHome;
document.getElementById('nav-search').onclick = irParaBusca;
document.getElementById('mob-nav-search').onclick = irParaBusca;
document.getElementById('nav-watchlist').onclick = irParaWatchlist;
document.getElementById('nav-chat').onclick = irParaChat;
// document.getElementById('nav-admin').onclick = irParaAdmin; // Mantido se necessário

// ==========================================
// TMDB & CATALOGO (Mantido e Adaptado)
// ==========================================
async function fetchTMDB(endpoint) {
    try {
        const res = await fetch(`https://api.themoviedb.org/3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}&language=pt-PT`);
        return await res.json();
    } catch { return { results: [] }; }
}

async function carregarHomeContent() {
    const dataTrending = await fetchTMDB('/trending/all/day');

    if (dataTrending.results.length > 0) {
        const hero = dataTrending.results[0];
        const bannerUrl = hero.backdrop_path ? `https://image.tmdb.org/t/p/original${hero.backdrop_path}` : '';
        document.getElementById('hero-banner').style.backgroundImage = `url(${bannerUrl})`;
        document.getElementById('hero-title').innerText = hero.title || hero.name;
        document.getElementById('hero-desc').innerText = hero.overview ? hero.overview.substring(0, 160) + '...' : "";
        document.getElementById('hero-play-btn').onclick = () => abrirPlayer(hero.id, hero.media_type || 'movie');
        // document.getElementById('hero-info-btn').onclick = () => abrirDetalhes(hero.id, hero.media_type || 'movie');
    }
    renderCards(dataTrending.results, 'row-trending');
}

function renderCards(items, containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';
    items.forEach(item => {
        if (!item.poster_path) return;
        const card = document.createElement('div');
        card.className = 'movie-card glass-panel';
        card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title || item.name}">`;
        // card.onclick = () => abrirDetalhes(item.id, item.media_type || 'movie');
        container.appendChild(card);
    });
}

// ==========================================
// BUSCA AVANÇADA NA SIDEBAR (Revisado)
// ==========================================
let filtroBuscaAtual = 'all';

function setSearchFilter(tipo, el) {
    document.querySelectorAll('#search-widget .filter-pill').forEach(btn => btn.classList.remove('active'));
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
    const gridArea = document.getElementById('search-grid');
    if(gridArea) gridArea.innerHTML = '';
    // Opcional: Voltar para a home se estiver na seção de busca completa
}

async function executarBusca(termo) {
    if(!termo) return;
    // Garante que a seção de busca completa esteja visível se houver resultados
    irParaBusca(); 

    const container = document.getElementById('search-grid');
    container.innerHTML = '<p style="color:#aaa; padding:20px;">Pesquisando...</p>';
    
    const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(termo)}`);
    
    // Filtra apenas filmes e séries com poster
    let resultados = data.results.filter(i => i.poster_path && (i.media_type === 'movie' || i.media_type === 'tv'));
    
    // Aplica filtro de tipo (filme/série)
    if(filtroBuscaAtual !== 'all') resultados = resultados.filter(i => i.media_type === filtroBuscaAtual);

    container.innerHTML = ''; // Limpa o carregando

    if (resultados.length === 0) {
        container.innerHTML = '<p style="color:#aaa; padding:20px;">Nenhum resultado encontrado.</p>';
    } else {
        resultados.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card glass-panel';
            card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title || item.name}">`;
            // card.onclick = () => abrirDetalhes(item.id, item.media_type || 'movie');
            container.appendChild(card);
        });
    }
}

// ==========================================
// WATCHLIST LOGIC (Revisado)
// ==========================================
function renderizarWatchlistWidgets() {
    // 1. Renderiza o Preview na Sidebar
    const previewGrid = document.getElementById('watchlist-preview-grid');
    if(previewGrid) {
        previewGrid.innerHTML = '';
        const items = Object.values(biblioteca.watchlist).slice(0, 6); // Apenas os primeiros 6
        if(items.length === 0) {
            previewGrid.innerHTML = '<p style="color:#777; font-size:0.8em; grid-column:1/-1;">Vazia.</p>';
        } else {
            items.forEach(item => {
                const miniCard = document.createElement('div');
                miniCard.className = 'movie-card-mini neon-border-magenta';
                miniCard.innerHTML = `<img src="https://image.tmdb.org/t/p/w185${item.poster_path}" alt="${item.title}">`;
                // miniCard.onclick = () => abrirDetalhes(item.id, item.tipo);
                previewGrid.appendChild(miniCard);
            });
        }
    }
}

function renderizarWatchlistCompleta() {
    const grid = document.getElementById('watchlist-grid');
    const emptyState = document.getElementById('watchlist-empty-state');
    if(!grid) return;

    grid.innerHTML = '';
    const items = Object.values(biblioteca.watchlist);
    
    if(items.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card glass-panel';
            card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title}">`;
            // card.onclick = () => abrirDetalhes(item.id, item.tipo);
            grid.appendChild(card);
        });
    }
}

// ==========================================
// CINEBOT (CHATBOT) na Sidebar (Mantido e Adaptado)
// ==========================================
const chatInput = document.getElementById('chatbot-input');
const sendBtn = document.getElementById('chatbot-send-btn');
const messagesContainer = document.getElementById('chatbot-messages');

function addChatMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.className = type === 'user' ? 'user-msg glass-msg' : 'bot-msg glass-msg';
    msgDiv.innerText = text; 
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll automático
}

function processarMensagemBot(msg) {
    const text = msg.toLowerCase();
    if(text.includes('ação') || text.includes('acao')) return "Recomendo 'John Wick'! Pesquisa no widget acima.";
    if(text.includes('comédia') || text.includes('comedia')) return "Que tal 'Superbad'?";
    if(text.includes('destaque')) return "Vê a seção 'Em Destaque' na Home!";
    if(text.includes('olá') || text.includes('ola')) return "Olá! Como posso ajudar na tua escolha?";
    return "Interessante. Tenta pesquisar palavras-chave no widget de Busca acima! 🔍";
}

function enviarChat() {
    const text = chatInput.value.trim();
    if(!text) return;
    addChatMessage(text, 'user');
    chatInput.value = '';
    // Simula resposta do bot após curto delay
    setTimeout(() => addChatMessage(processarMensagemBot(text), 'bot'), 800);
}

if(sendBtn) sendBtn.onclick = enviarChat;
if(chatInput) chatInput.onkeypress = (e) => { if(e.key === 'Enter') enviarChat(); };

// ==========================================
// PLAYER (Simulação Simples Mantida)
// ==========================================
function abrirPlayer(id, tipo) {
    alert(`A abrir o reprodutor para o conteúdo ID: ${id} (${tipo})... (Funcionalidade de embed mgeb.top mantida no código original)`);
    // Lógica original do embed mgeb.top pode ser reinserida aqui se necessário, 
    // apontando para a div do player fullscreen.
}