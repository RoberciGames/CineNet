// ==========================================
// CONFIGURAÇÕES PRINCIPAIS E CHAVES
// ==========================================
const TMDB_KEY = '17c56e3825d7fbae6581866083d0d778'; 
let debounceTimer; 
let currentUserUID = null;
let biblioteca = { watchlist: {} };
let isLoginMode = true;
let itemModalAtual = null;
let heroAtual = null;

// Variáveis do Perfil Padrão
let perfilUsuario = {
    username: "CineNet User",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
};

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
        irParaHome();
    } else {
        currentUserUID = null;
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }
});

document.getElementById('logout-btn-pc').addEventListener('click', () => firebase.auth().signOut());

// ==========================================
// SISTEMA DE PERFIL E EDIÇÃO
// ==========================================
const profileModal = document.getElementById('profile-modal');

document.getElementById('profile-trigger-pc').addEventListener('click', () => {
    document.getElementById('edit-username').value = perfilUsuario.username;
    document.getElementById('edit-avatar-url').value = perfilUsuario.avatar;
    document.getElementById('edit-avatar-preview').src = perfilUsuario.avatar;
    profileModal.style.display = 'flex';
});

document.getElementById('close-profile-btn').addEventListener('click', () => profileModal.style.display = 'none');

document.getElementById('edit-avatar-url').addEventListener('input', (e) => {
    document.getElementById('edit-avatar-preview').src = e.target.value || "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png";
});

document.getElementById('save-profile-btn').addEventListener('click', () => {
    perfilUsuario.username = document.getElementById('edit-username').value.trim() || "CineNet User";
    perfilUsuario.avatar = document.getElementById('edit-avatar-url').value.trim() || "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png";
    
    if (currentUserUID) firebase.database().ref('users/' + currentUserUID + '/perfil').set(perfilUsuario);
    
    atualizarInterfacePerfil();
    profileModal.style.display = 'none';
});

function atualizarInterfacePerfil() {
    document.getElementById('user-name-pc').innerText = perfilUsuario.username;
    document.getElementById('user-avatar-pc').src = perfilUsuario.avatar;
}

// ==========================================
// CARREGAR DADOS GERAIS DO UTILIZADOR
// ==========================================
function carregarDadosUsuario() {
    if (!currentUserUID) return;
    firebase.database().ref('users/' + currentUserUID).once('value').then(snapshot => {
        const data = snapshot.val();
        if (data) {
            if (data.biblioteca && data.biblioteca.watchlist) biblioteca.watchlist = data.biblioteca.watchlist;
            if (data.perfil) perfilUsuario = data.perfil;
        }
        atualizarInterfacePerfil();
    });
}

// ==========================================
// WATCHLIST
// ==========================================
function salvarDadosWatchlist() {
    if (currentUserUID) firebase.database().ref('users/' + currentUserUID + '/biblioteca/watchlist').set(biblioteca.watchlist);
    if (document.getElementById('watchlist-section').style.display === 'block') renderizarWatchlistCompleta();
}

function toggleWatchlist(item) {
    if(biblioteca.watchlist[item.id]) {
        delete biblioteca.watchlist[item.id];
        document.getElementById('modal-add-list-btn').innerText = "⭐ Adicionar à Lista";
        document.getElementById('modal-add-list-btn').classList.replace('neon-btn-red', 'neon-btn-red-dark');
    } else {
        biblioteca.watchlist[item.id] = { id: item.id, title: item.title || item.name, poster_path: item.poster_path, media_type: item.media_type || 'movie' };
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
    document.getElementById('main-search-input').focus();
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
// TMDB API & CARROSSEL
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
        heroAtual = data.results[0];
        const bannerUrl = heroAtual.backdrop_path ? `https://image.tmdb.org/t/p/original${heroAtual.backdrop_path}` : '';
        document.getElementById('hero-banner').style.backgroundImage = `url(${bannerUrl})`;
        document.getElementById('hero-title').innerText = heroAtual.title || heroAtual.name;
        document.getElementById('hero-desc').innerText = heroAtual.overview ? heroAtual.overview.substring(0, 150) + '...' : "";
        
        // Passa o item completo (heroAtual) para manter a lógica do modal intacta
        document.getElementById('hero-info-btn').onclick = () => abrirDetalhes(heroAtual);
        document.getElementById('hero-play-btn').onclick = () => assistirConteudo(heroAtual);
    }
    renderCards(data.results, 'row-trending');
}

function renderCards(items, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    items.filter(i => i.poster_path).forEach(item => {
        const card = document.createElement('div');
        card.className = 'movie-card glass-panel';
        card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="Capa">`;
        card.onclick = () => abrirDetalhes(item);
        container.appendChild(card);
    });
}

// Setas de Scroll do Carrossel (Em Destaque)
document.getElementById('scroll-left-btn').addEventListener('click', () => {
    document.getElementById('row-trending').scrollBy({ left: -400, behavior: 'smooth' });
});
document.getElementById('scroll-right-btn').addEventListener('click', () => {
    document.getElementById('row-trending').scrollBy({ left: 400, behavior: 'smooth' });
});


// ==========================================
// BUSCA SEPARADA
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
    const container = document.getElementById('search-grid');
    container.innerHTML = '<p style="color:#777;">Pesquisando...</p>';
    
    const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(termo)}`);
    if(!data) { container.innerHTML = '<p>Erro ao buscar dados.</p>'; return; }
    
    let resultados = data.results.filter(i => i.poster_path && (i.media_type === 'movie' || i.media_type === 'tv'));
    if(filtroBusca !== 'all') resultados = resultados.filter(i => i.media_type === filtroBusca);

    if (resultados.length === 0) container.innerHTML = `<p style="color:#777;">Nenhum resultado para "${termo}".</p>`;
    else renderCards(resultados, 'search-grid');
}

// ==========================================
// RENDERIZAÇÃO DA WATCHLIST
// ==========================================
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
// MODAL DE DETALHES (Corrigido Undefined)
// ==========================================
const modal = document.getElementById('movie-modal');

async function abrirDetalhes(itemBase) {
    if(!itemBase) return;
    
    const id = itemBase.id;
    const tipo = itemBase.media_type || (itemBase.name ? 'tv' : 'movie');
    itemModalAtual = { id: id, media_type: tipo };

    // Faz fetch para puxar TODOS os dados e evitar o "undefined"
    const data = await fetchTMDB(`/${tipo}/${id}`);
    if(!data) {
        alert("Erro ao carregar os detalhes.");
        return;
    }

    // Deteta se é filme (title) ou série/anime (name)
    const tituloCorreto = data.title || data.name || "Título Indisponível";
    
    // Deteta as datas e puxa só o ano
    let anoStr = "N/A";
    if (data.release_date) anoStr = data.release_date.split('-')[0];
    else if (data.first_air_date) anoStr = data.first_air_date.split('-')[0];
    
    // Arredonda as estrelas (nota)
    let nota = data.vote_average ? data.vote_average.toFixed(1) : "N/A";

    document.getElementById('modal-img').src = `https://image.tmdb.org/t/p/w500${data.poster_path || itemBase.poster_path}`;
    document.getElementById('modal-title').innerText = tituloCorreto;
    document.getElementById('modal-meta').innerText = `${anoStr} • ${tipo === 'movie' ? 'Filme' : 'Série/Anime'} • ⭐ ${nota}`;
    document.getElementById('modal-desc').innerText = data.overview || "Descrição indisponível.";
    
    const btnAdd = document.getElementById('modal-add-list-btn');
    if(biblioteca.watchlist[id]) {
        btnAdd.innerText = "✔️ Na Sua Lista";
        btnAdd.className = "btn-info neon-btn-red";
    } else {
        btnAdd.innerText = "⭐ Adicionar à Lista";
        btnAdd.className = "btn-info neon-btn-red-dark";
    }
    
    const itemGuardar = { id: id, title: tituloCorreto, poster_path: data.poster_path || itemBase.poster_path, media_type: tipo };
    btnAdd.onclick = () => toggleWatchlist(itemGuardar);
    
    document.getElementById('modal-play-btn').onclick = () => assistirConteudo(itemModalAtual);
    
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
// PLAYER DE VÍDEO (MGEB.TOP integrado)
// ==========================================
const playerScreen = document.getElementById('streaming-player-screen');
const videoIframe = document.getElementById('videoPlayer');
const epSelectorsBox = document.getElementById('episodes-selectors-box');
const seasonSelect = document.getElementById('player-season-select');
const episodeSelect = document.getElementById('player-episode-select');

let playerAtualData = { id: null, type: null, season: 1, episode: 1 };

async function assistirConteudo(item) {
    fecharModal(); 
    
    playerAtualData.id = item.id;
    playerAtualData.type = item.media_type || (item.name ? 'tv' : 'movie');
    
    playerScreen.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    if (playerAtualData.type === 'movie') {
        epSelectorsBox.style.display = 'none';
        videoIframe.src = `https://mgeb.top/embed/movie/${item.id}`; 
    } else {
        epSelectorsBox.style.display = 'flex';
        playerAtualData.season = 1;
        playerAtualData.episode = 1;
        
        videoIframe.src = `https://mgeb.top/embed/tv/${item.id}/1/1`;
        await carregarTemporadasSerie(item.id);
    }
}

function atualizarIframeSerie() {
    videoIframe.src = `https://mgeb.top/embed/tv/${playerAtualData.id}/${playerAtualData.season}/${playerAtualData.episode}`;
}

seasonSelect.addEventListener('change', async (e) => {
    playerAtualData.season = e.target.value;
    playerAtualData.episode = 1; 
    const data = await fetchTMDB(`/tv/${playerAtualData.id}/season/${playerAtualData.season}`);
    preencherEpisodios(data && data.episodes ? data.episodes.length : 10);
    atualizarIframeSerie();
});

episodeSelect.addEventListener('change', (e) => {
    playerAtualData.episode = e.target.value;
    atualizarIframeSerie();
});

document.getElementById('btn-next-ep').onclick = () => {
    const totalEps = episodeSelect.options.length;
    if(playerAtualData.episode < totalEps) {
        playerAtualData.episode++;
        episodeSelect.value = playerAtualData.episode;
        atualizarIframeSerie();
    } else {
        alert("Fim da Temporada!");
    }
};

document.getElementById('close-player-btn').onclick = () => {
    playerScreen.style.display = 'none';
    videoIframe.src = ''; 
    document.body.style.overflow = 'auto';
};

async function carregarTemporadasSerie(tvId) {
    seasonSelect.innerHTML = '<option>A Carregar...</option>';
    episodeSelect.innerHTML = '';
    
    const data = await fetchTMDB(`/tv/${tvId}`);
    seasonSelect.innerHTML = '';
    
    if(data && data.seasons) {
        const temporadasReais = data.seasons.filter(s => s.season_number > 0); 
        temporadasReais.forEach(s => {
            seasonSelect.innerHTML += `<option value="${s.season_number}">Temporada ${s.season_number}</option>`;
        });
        if(temporadasReais.length > 0) preencherEpisodios(temporadasReais[0].episode_count);
        else preencherEpisodios(12);
    } else {
        seasonSelect.innerHTML = `<option value="1">Temporada 1</option>`;
        preencherEpisodios(12);
    }
}

function preencherEpisodios(total) {
    episodeSelect.innerHTML = '';
    for(let i = 1; i <= total; i++) {
        episodeSelect.innerHTML += `<option value="${i}">Episódio ${i}</option>`;
    }
}

// ==========================================
// CINEBOT FLUTUANTE
// ==========================================
const chatFab = document.getElementById('chat-fab');
const chatWidget = document.getElementById('floating-chat-widget');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatInput = document.getElementById('chatbot-input');
const chatMsgs = document.getElementById('chatbot-messages');

chatFab.onclick = () => {
    chatWidget.style.display = chatWidget.style.display === 'none' ? 'flex' : 'none';
    if(chatWidget.style.display === 'flex') chatInput.focus();
};
closeChatBtn.onclick = () => chatWidget.style.display = 'none';

document.getElementById('nav-chat').onclick = () => {
    chatWidget.style.display = 'flex';
    chatInput.focus();
};

function addChatMessage(text, tipo) {
    const div = document.createElement('div');
    div.className = tipo === 'user' ? 'user-msg glass-msg' : 'bot-msg glass-msg';
    div.innerHTML = text; 
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

async function getRandomRecommendation(genreType) {
    let endpoint = '';
    const randomPage = Math.floor(Math.random() * 5) + 1; 
    
    if (genreType === 'acao') endpoint = `/discover/movie?with_genres=28&page=${randomPage}`;
    else if (genreType === 'comedia') endpoint = `/discover/movie?with_genres=35&page=${randomPage}`;
    else if (genreType === 'anime') endpoint = `/discover/tv?with_genres=16&with_original_language=ja&page=${randomPage}`;
    else if (genreType === 'desenho') endpoint = `/discover/tv?with_genres=16&page=${randomPage}`;
    else if (genreType === 'serie') endpoint = `/discover/tv?page=${randomPage}`;
    else endpoint = `/trending/all/day`;

    const data = await fetchTMDB(endpoint);
    if (data && data.results && data.results.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.results.length);
        const randomItem = data.results[randomIndex];
        const titulo = randomItem.title || randomItem.name;
        const avaliacao = randomItem.vote_average ? randomItem.vote_average.toFixed(1) : 'N/A';
        return `Recomendo: <b>${titulo}</b> (⭐ ${avaliacao})!<br><span style="font-size:0.85em; color:#ccc;">Pesquisa o nome na aba Busca.</span>`;
    }
    return "Tive um pequeno bug a procurar... Tenta perguntar outra vez!";
}

async function processarMensagemBot(msg) {
    const text = msg.toLowerCase();
    if(text.includes('ação') || text.includes('acao')) return await getRandomRecommendation('acao');
    if(text.includes('comédia') || text.includes('comedia')) return await getRandomRecommendation('comedia');
    if(text.includes('anime')) return await getRandomRecommendation('anime');
    if(text.includes('desenho') || text.includes('animação')) return await getRandomRecommendation('desenho');
    if(text.includes('série') || text.includes('serie')) return await getRandomRecommendation('serie');
    if(text.includes('olá') || text.includes('ola') || text.includes('oi')) return "Olá cibernauta! Sou o CineBot 🤖. Pede-me uma recomendação de Filme de Ação, Anime, Série ou Desenho.";
    return "Pede-me recomendações por género: <b>Ação</b>, <b>Comédia</b>, <b>Série</b>, <b>Anime</b> ou <b>Desenho</b>.";
}

async function enviarChat() {
    const txt = chatInput.value.trim();
    if(!txt) return;
    
    addChatMessage(txt, 'user');
    chatInput.value = '';
    
    const loadingId = 'loading-' + Date.now();
    const divLoading = document.createElement('div');
    divLoading.id = loadingId;
    divLoading.className = 'bot-msg glass-msg';
    divLoading.innerText = 'A procurar... 🤖';
    chatMsgs.appendChild(divLoading);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    const resposta = await processarMensagemBot(txt);
    
    document.getElementById(loadingId).remove();
    addChatMessage(resposta, 'bot');
}

document.getElementById('chatbot-send-btn').onclick = enviarChat;
chatInput.onkeypress = (e) => { if(e.key === 'Enter') enviarChat(); };