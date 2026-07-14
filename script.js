// ==========================================
// INFRAESTRUTURA CORE & CHAVES
// ==========================================
const TMDB_KEY = '17c56e3825d7fbae6581866083d0d778'; 
let itemSelecionado = null;
let estrelasAtivas = 0;
let debounceTimer; 
let currentUserUID = null;
let filtroBuscaAtual = 'all';
let ultimoTermoBusca = '';

// VARIÁVEIS DO PLAYER
let modoPlayerAtual = 'geral';
const corDestaque = 'e50914';

let perfilUsuario = {
    username: "CineNet User",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
};
let avatarTemp = "";
let biblioteca = { watchlist: {}, reviews: {} };
let isLoginMode = true;

// CONTROLO DE ACESSO DO ADMINISTRADOR
const ADMIN_EMAIL = "roberci.azevedo@academico.ifpb.edu.br"; 

// ==========================================
// CONFIGURAÇÃO DO FIREBASE E GA4
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAfPWvnGdvPKZ_lrVwOuag14WHLY9AgML8",
    authDomain: "cinenet-ifpb.firebaseapp.com",
    databaseURL: "https://cinenet-ifpb-default-rtdb.firebaseio.com",
    projectId: "cinenet-ifpb",
    storageBucket: "cinenet-ifpb.firebasestorage.app",
    messagingSenderId: "1098247355110",
    appId: "1:1098247355110:web:c9f867826f26b0ef171927",
    measurementId: "G-73VPBQSWKM"
};
firebase.initializeApp(firebaseConfig);

function trackVirtualPage(pageTitle, pagePath) {
    if (typeof gtag === 'function') {
        gtag('event', 'page_view', { page_title: pageTitle, page_path: pagePath });
    }
}

// ==========================================
// AUTENTICAÇÃO E SESSÃO
// ==========================================
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? 'Entrar' : 'Registar';
    document.getElementById('auth-submit-btn').innerText = isLoginMode ? 'Entrar' : 'Registar';
    document.getElementById('auth-switch-text').innerText = isLoginMode ? 'Novo por aqui?' : 'Já possui uma conta?';
    document.getElementById('auth-switch-btn').innerText = isLoginMode ? 'Entrar agora.' : 'Registe-se agora.';
    document.getElementById('auth-error').style.display = 'none';
}
document.getElementById('auth-switch-btn').addEventListener('click', toggleAuthMode);

document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (isLoginMode) {
        firebase.auth().signInWithEmailAndPassword(email, password).catch(err => alert(err.message));
    } else {
        firebase.auth().createUserWithEmailAndPassword(email, password).catch(err => alert(err.message));
    }
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
        
        if (user.email === ADMIN_EMAIL) {
            document.getElementById('li-nav-admin').style.display = 'block';
            document.getElementById('mob-nav-admin').style.display = 'flex';
        } else {
            document.getElementById('li-nav-admin').style.display = 'none';
            document.getElementById('mob-nav-admin').style.display = 'none';
        }
        
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
document.getElementById('logout-btn-mobile').addEventListener('click', logout);

// ==========================================
// SINCRONIZAÇÃO E PERFIL DE USUÁRIO
// ==========================================
function carregarDadosUsuario() {
    firebase.database().ref('users/' + currentUserUID).once('value').then(snapshot => {
        const data = snapshot.val();
        if (data) {
            if (data.biblioteca) biblioteca = data.biblioteca;
            if (!biblioteca.watchlist) biblioteca.watchlist = {};
            if (!biblioteca.reviews) biblioteca.reviews = {};
            
            if (data.perfil) {
                perfilUsuario = data.perfil;
                atualizarInterfacePerfil();
            }
        }
    });
}

function salvarDados() {
    if (currentUserUID) {
        firebase.database().ref('users/' + currentUserUID + '/biblioteca').set(biblioteca);
    }
}

document.getElementById('profile-trigger-pc').addEventListener('click', abrirModalPerfil);
document.getElementById('user-avatar-mobile').addEventListener('click', abrirModalPerfil);

function abrirModalPerfil() {
    document.getElementById('profile-modal-username').value = perfilUsuario.username;
    document.getElementById('profile-modal-avatar-preview').src = perfilUsuario.avatar;
    avatarTemp = perfilUsuario.avatar;
    document.getElementById('profileModal').style.display = 'flex';
    alternarScrollBody(true);
}

function fecharModalPerfil() {
    document.getElementById('profileModal').style.display = 'none';
    alternarScrollBody(false);
}

function selecionarAvatarTemporario(url) {
    avatarTemp = url;
    document.getElementById('profile-modal-avatar-preview').src = url;
}

function salvarPerfilUsuario() {
    const novoNome = document.getElementById('profile-modal-username').value.trim();
    if (!novoNome) return alert("O nome não pode estar vazio!");

    perfilUsuario.username = novoNome;
    perfilUsuario.avatar = avatarTemp;

    if (currentUserUID) {
        firebase.database().ref('users/' + currentUserUID + '/perfil').set(perfilUsuario)
            .then(() => {
                atualizarInterfacePerfil();
                fecharModalPerfil();
            });
    }
}

function atualizarInterfacePerfil() {
    document.getElementById('user-name-pc').innerText = perfilUsuario.username;
    document.getElementById('user-avatar-pc').src = perfilUsuario.avatar;
    document.getElementById('user-avatar-mobile').src = perfilUsuario.avatar;
}

// ==========================================
// GERENCIAMENTO DE TELAS / NAVEGAÇÃO
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
    trackVirtualPage("Início", "/home");
}

function irParaAdmin() {
    const user = firebase.auth().currentUser;
    if (!user || user.email !== ADMIN_EMAIL) {
        alert("Acesso Negado!");
        irParaHome();
        return;
    }
    setNavActive('nav-admin', 'mob-nav-admin');
    esconderTodasSessoes();
    document.getElementById('admin-section').style.display = 'block';
    trackVirtualPage("Administração", "/admin");
}

function irParaBusca() {
    setNavActive('nav-search', 'mob-nav-search');
    esconderTodasSessoes();
    document.getElementById('search-results-section').style.display = 'block';
    document.getElementById('main-search-input').focus();
    trackVirtualPage("Busca", "/search");
}

function irParaWatchlist() {
    setNavActive('nav-watchlist', 'mob-nav-watchlist');
    esconderTodasSessoes();
    document.getElementById('watchlist-section').style.display = 'block';
    renderizarWatchlist();
    trackVirtualPage("A Minha Lista", "/watchlist");
}

function irParaChat() {
    setNavActive('nav-chat', 'mob-nav-chat');
    esconderTodasSessoes();
    document.getElementById('chat-section').style.display = 'block';
    document.getElementById('chatbot-input').focus();
    trackVirtualPage("CineBot", "/chat");
}

document.getElementById('nav-home').addEventListener('click', irParaHome);
document.getElementById('mob-nav-home').addEventListener('click', irParaHome);
document.getElementById('nav-admin').addEventListener('click', irParaAdmin);
document.getElementById('mob-nav-admin').addEventListener('click', irParaAdmin);
document.getElementById('nav-search').addEventListener('click', irParaBusca);
document.getElementById('mob-nav-search').addEventListener('click', irParaBusca);
document.getElementById('nav-watchlist').addEventListener('click', irParaWatchlist);
document.getElementById('mob-nav-watchlist').addEventListener('click', irParaWatchlist);
document.getElementById('nav-chat').addEventListener('click', irParaChat);
document.getElementById('mob-nav-chat').addEventListener('click', irParaChat);

function alternarScrollBody(travar) {
    document.body.classList.toggle('modal-open', travar);
}

// ==========================================
// FORMULÁRIO DO PAINEL ADMINISTRATIVO
// ==========================================
document.getElementById('admin-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const user = firebase.auth().currentUser;
    if (!user || user.email !== ADMIN_EMAIL) return alert("Ação não autorizada!");

    const titulo = document.getElementById('admin-titulo').value;
    const poster = document.getElementById('admin-poster').value;
    const backdrop = document.getElementById('admin-backdrop').value;
    const video = document.getElementById('admin-video').value;
    const sinopse = document.getElementById('admin-sinopse').value;
    const tipo = document.getElementById('admin-categoria').value; 

    const novoConteudo = {
        id: 'custom_' + Date.now(),
        title: titulo,
        poster_path: poster,
        backdrop_path: backdrop,
        video_url: video,
        overview: sinopse,
        media_type: tipo,
        is_custom: true,
        adicionadoEm: Date.now()
    };

    firebase.database().ref('conteudos_customizados/' + novoConteudo.id).set(novoConteudo)
        .then(() => {
            alert("Sucesso! Conteúdo salvo e integrado no mecanismo de busca.");
            document.getElementById('admin-form').reset();
        })
        .catch(error => alert("Erro ao salvar: " + error.message));
});

// ==========================================
// INTEGRAÇÃO TMDB & CARREGAMENTO DA HOME
// ==========================================
async function fetchTMDB(endpoint) {
    try {
        const response = await fetch(`https://api.themoviedb.org/3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}&language=pt-BR`);
        return await response.json();
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
        const indicator = biblioteca.watchlist[item.id] ? '<div class="watched-indicator">✔</div>' : '';
        card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" loading="lazy">${indicator}`;
        card.onclick = () => abrirDetalhes(item.id, forceType || item.media_type || 'movie');
        container.appendChild(card);
    });
}

// ==========================================
// MECANISMO DE BUSCA AVANÇADA MISTA
// ==========================================
function iniciarBusca(termo) {
    clearTimeout(debounceTimer);
    document.getElementById('search-clear').style.display = termo.length > 0 ? 'block' : 'none';
    ultimoTermoBusca = termo;

    debounceTimer = setTimeout(() => {
        if (termo.length < 2) {
            document.getElementById('search-grid').innerHTML = '';
            return;
        }
        executarBusca(termo);
    }, 600);
}

function limparBusca() {
    document.getElementById('main-search-input').value = '';
    document.getElementById('search-clear').style.display = 'none';
    document.getElementById('search-grid').innerHTML = '';
    ultimoTermoBusca = '';
}
document.getElementById('main-search-input').addEventListener('input', (e) => iniciarBusca(e.target.value));

async function ejecutarBusca(termo) {
    const container = document.getElementById('search-grid');
    const emptyState = document.getElementById('search-empty-state');
    container.innerHTML = '';

    let resultadosFinais = [];
    const termoLower = termo.toLowerCase();

    try {
        const snapshot = await firebase.database().ref('conteudos_customizados').once('value');
        const customData = snapshot.val();
        if (customData) {
            Object.values(customData).forEach(item => {
                if (item.title && item.title.toLowerCase().includes(termoLower)) {
                    resultadosFinais.push(item);
                }
            });
        }
    } catch(e) { console.error(e); }

    const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(termo)}`);
    let filtradosTMDB = data.results.filter(item => item.poster_path);
    resultadosFinais = [...resultadosFinais, ...filtradosTMDB];

    if (resultadosFinais.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        resultadosFinais.forEach(item => {
            if (!item.poster_path) return;
            const card = document.createElement('div');
            card.className = 'movie-card';
            const indicator = biblioteca.watchlist[item.id] ? '<div class="watched-indicator">✔</div>' : '';
            const finalPosterUrl = item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`;
            
            card.innerHTML = `<img src="${finalPosterUrl}" loading="lazy">${indicator}`;
            card.onclick = () => abrirDetalhes(item.id, item.media_type || 'movie');
            container.appendChild(card);
        });
    }
}

// ==========================================
// WATCHLIST (A MINHA LISTA)
// ==========================================
function renderizarWatchlist() {
    const container = document.getElementById('watchlist-grid');
    const emptyState = document.getElementById('watchlist-empty-state');
    container.innerHTML = '';

    const listItems = Object.values(biblioteca.watchlist).sort((a, b) => b.adicionadoEm - a.adicionadoEm);
    const validItems = listItems.filter(i => i && i.poster_path);

    if (validItems.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        validItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            const finalPosterUrl = item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`;
            card.innerHTML = `<img src="${finalPosterUrl}" loading="lazy"><div class="watched-indicator">✔</div>`;
            card.onclick = () => abrirDetalhes(item.id, item.tipo);
            container.appendChild(card);
        });
    }
}

function alternarWatchlist() {
    if (!itemSelecionado) return;
    const id = itemSelecionado.id;
    if (biblioteca.watchlist[id]) {
        delete biblioteca.watchlist[id];
    } else {
        biblioteca.watchlist[id] = { id: id, tipo: itemSelecionado.tipo, poster_path: itemSelecionado.poster_path, adicionadoEm: Date.now() };
    }
    atualizarBotaoWatchlist();
    salvarDados();
    if(document.getElementById('watchlist-section').style.display === 'block') renderizarWatchlist();
}

function atualizarBotaoWatchlist() {
    const btn = document.getElementById('btn-watchlist');
    btn.innerText = biblioteca.watchlist[itemSelecionado.id] ? "✔ Na Minha Lista" : "+ A Minha Lista";
}

// ==========================================
// MODAL DE DETALHES & SISTEMA DE ESTRELAS
// ==========================================
async function abrirDetalhes(id, tipo, diretoplay = false) {
    resetarVisualEstrelas();
    
    if (String(id).startsWith('custom_')) {
        const snapshot = await firebase.database().ref('conteudos_customizados/' + id).once('value');
        const customItem = snapshot.val();
        if (customItem) {
            itemSelecionado = { id: customItem.id, tipo: customItem.media_type, poster_path: customItem.poster_path, title: customItem.title, video_url: customItem.video_url };
            
            document.getElementById('modal-banner').style.backgroundImage = `url(${customItem.backdrop_path || customItem.poster_path})`;
            document.getElementById('modal-title').innerText = customItem.title;
            document.getElementById('modal-overview').innerText = customItem.overview || "Sem sinopse disponível.";
            document.getElementById('modal-year').innerText = "Exclusivo CineNet";
            document.getElementById('modal-rating').innerText = "Premium";
            
            document.getElementById('modal-play-btn').onclick = () => {
                fecharDetalhes();
                document.getElementById('main-content').style.display = 'none';
                document.getElementById('episodes-selectors-box').style.display = 'none';
                document.getElementById('videoPlayer').src = customItem.video_url; 
                document.getElementById('streaming-player-screen').style.display = 'block';
                alternarScrollBody(true);
            };
            
            if (biblioteca.reviews && biblioteca.reviews[id]) pintarEstrelas(biblioteca.reviews[id]);
            atualizarBotaoWatchlist();
            document.getElementById('detailsModal').style.display = 'flex';
            alternarScrollBody(true);
            return;
        }
    }
    
    const data = await fetchTMDB(`/${tipo}/${id}`);
    itemSelecionado = { id: id, tipo: tipo, poster_path: data.poster_path, title: data.title || data.name };
    
    document.getElementById('modal-banner').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${data.backdrop_path})`;
    document.getElementById('modal-title').innerText = itemSelecionado.title;
    document.getElementById('modal-overview').innerText = data.overview || "Sem sinopse disponível.";
    document.getElementById('modal-year').innerText = (data.release_date || data.first_air_date || "N/A").substring(0, 4);
    document.getElementById('modal-rating').innerText = data.vote_average ? `Classificação: ${data.vote_average.toFixed(1)}` : "N/A";
    
    document.getElementById('modal-play-btn').onclick = () => abrirPlayer(id, tipo);
    if (biblioteca.reviews && biblioteca.reviews[id]) pintarEstrelas(biblioteca.reviews[id]);
    
    atualizarBotaoWatchlist();
    if (diretoplay) abrirPlayer(id, tipo); 
    else {
        document.getElementById('detailsModal').style.display = 'flex';
        alternarScrollBody(true);
    }
}

function fecharDetalhes() {
    document.getElementById('detailsModal').style.display = 'none';
    alternarScrollBody(false);
}

function votarEstrelas(nota) {
    if (!itemSelecionado) return;
    if (!biblioteca.reviews) biblioteca.reviews = {};
    if (biblioteca.reviews[itemSelecionado.id] === nota) {
        delete biblioteca.reviews[itemSelecionado.id];
        resetarVisualEstrelas();
    } else {
        biblioteca.reviews[itemSelecionado.id] = nota;
        pintarEstrelas(nota);
    }
    salvarDados();
}

function pintarEstrelas(nota) {
    resetarVisualEstrelas();
    const estrelas = document.querySelectorAll('.star-unit');
    for (let i = 0; i < nota; i++) {
        if (estrelas[i]) estrelas[i].classList.add('active');
    }
}

function resetarVisualEstrelas() {
    document.querySelectorAll('.star-unit').forEach(star => star.classList.remove('active'));
}

// ==========================================
// REPRODUTOR MULTISERVIDORES (mgeb.top)
// ==========================================
async function abrirPlayer(id, tipo) {
    fecharDetalhes();
    document.getElementById('main-content').style.display = 'none';
    
    if (tipo === 'tv') {
        document.getElementById('episodes-selectors-box').style.display = 'flex';
        await carregarTemporadasNoPlayer(id);
        
        const playerS = document.getElementById('player-season-select');
        const playerE = document.getElementById('player-episode-select');
        document.getElementById('videoPlayer').src = `https://mgeb.top/embed/tv/${id}/${playerS.value}/${playerE.value}`;
        
        playerS.onchange = async () => {
            await atualizarEpisodiosNoPlayer(id, playerS.value);
            document.getElementById('videoPlayer').src = `https://mgeb.top/embed/tv/${id}/${playerS.value}/${document.getElementById('player-episode-select').value}`;
        };
        playerE.onchange = () => {
            document.getElementById('videoPlayer').src = `https://mgeb.top/embed/tv/${id}/${playerS.value}/${playerE.value}`;
        };
        document.getElementById('btn-next-ep').onclick = () => avancarEpisodioNoPlayer(id);
    } else {
        document.getElementById('episodes-selectors-box').style.display = 'none';
        document.getElementById('videoPlayer').src = `https://mgeb.top/embed/movie/${id}`;
    }
    document.getElementById('streaming-player-screen').style.display = 'block';
    alternarScrollBody(true);
}

async function carregarTemporadasNoPlayer(id) {
    const data = await fetchTMDB(`/tv/${id}`);
    const select = document.getElementById('player-season-select');
    if(!select) return;
    select.innerHTML = '';
    const validSeasons = data.seasons ? data.seasons.filter(s => s.season_number > 0) : [];
    validSeasons.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.season_number;
        opt.innerText = `Temp ${s.season_number}`;
        select.appendChild(opt);
    });
    if (validSeasons.length > 0) await atualizarEpisodiosNoPlayer(id, validSeasons[0].season_number);
}

async function atualizarEpisodiosNoPlayer(id, sNum) {
    const data = await fetchTMDB(`/tv/${id}/season/${sNum}`);
    const select = document.getElementById('player-episode-select');
    if(!select) return;
    select.innerHTML = '';
    if (data.episodes) {
        data.episodes.forEach(ep => {
            const opt = document.createElement('option');
            opt.value = ep.episode_number;
            opt.innerText = `Ep ${ep.episode_number}`;
            select.appendChild(opt);
        });
    }
}

function avancarEpisodioNoPlayer(id) {
    const sSelect = document.getElementById('player-season-select');
    const eSelect = document.getElementById('player-episode-select');
    let nextIndex = eSelect.selectedIndex + 1;
    if (nextIndex < eSelect.options.length) {
        eSelect.selectedIndex = nextIndex;
        document.getElementById('videoPlayer').src = `https://mgeb.top/embed/tv/${id}/${sSelect.value}/${eSelect.value}`;
    } else alert("Fim da temporada alcançado!");
}

document.getElementById('close-player-btn').addEventListener('click', () => {
    document.getElementById('streaming-player-screen').style.display = 'none';
    document.getElementById('videoPlayer').src = '';
    document.getElementById('main-content').style.display = 'block';
    alternarScrollBody(false);
});

// ==========================================
// CINEBOT (INTELIGÊNCIA E INTERAÇÕES)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send-btn');
    const messagesContainer = document.getElementById('chatbot-messages');
    const quickActionsContainer = document.getElementById('chat-quick-actions');
    
    if(!chatInput || !sendBtn) return;

    function addMessage(text, type) {
        const msgDiv = document.createElement('div');
        msgDiv.className = type === 'user' ? 'user-msg' : 'bot-msg';
        msgDiv.innerHTML = text; 
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight; 
    }

    async function processarMensagemChatbot(mensagem) {
        const msgLower = mensagem.toLowerCase();
        
        if (msgLower.includes("oi") || msgLower.includes("olá") || msgLower.includes("ola") || msgLower.includes("ajuda")) {
            return "Olá! Sou o CineBot 🤖. Posso recomendar-te filmes ou séries incríveis. Tenta dizer: 'Recomenda-me um filme de ação' ou 'O que está em destaque?'.";
        }
        
        if (msgLower.includes("destaque") || msgLower.includes("popular") || msgLower.includes("bomba") || msgLower.includes("novo")) {
            try {
                const data = await fetchTMDB('/trending/movie/day');
                if(data.results && data.results.length > 0) {
                    const top = data.results[0];
                    return `O filme mais popular do dia na CineNet é o bombástico <strong>${top.title || top.name}</strong>! Procura por ele na aba 🔍 ou vê-lo já na Home.`;
                }
            } catch(e) { 
                return "Neste momento os meus servidores estão a processar o catálogo. Dá uma olhadinha nas linhas da página inicial!";
            }
        }

        if (msgLower.includes("ação") || msgLower.includes("acao")) {
            return "Adrenalina pura? Recomendo títulos épicos como 'John Wick', 'Mad Max: Estrada da Fúria' ou 'Missão Impossível'. Usa o nosso menu de procura para os ver!";
        }
        if (msgLower.includes("terror") || msgLower.includes("assustador") || msgLower.includes("medo")) {
            return "Prepara o coração! Recomendo vivamente 'Hereditário', 'Invocação do Mal' ou o aclamado 'Corra!' (Get Out). 👻";
        }
        if (msgLower.includes("comédia") || msgLower.includes("comedia") || msgLower.includes("rir")) {
            return "Para descontrair e rir à gargalhada, procura por 'Superbad', 'Se Beber, Não Case!' ou 'Deadpool'!";
        }
        if (msgLower.includes("ficção") || msgLower.includes("sci-fi") || msgLower.includes("espaço")) {
            return "Para explorares o universo: 'Interestelar', 'Blade Runner 2049' ou a obra-prima 'Duna'. 🚀";
        }
        
        return `Ainda estou a aprender novos comandos, mas se procurares por "<strong>${mensagem}</strong>" na nossa aba de Busca Avançada (🔍), vais encontrar o que procuras no catálogo da CineNet!`;
    }

    async function enviarParaOBot(textoOriginal) {
        const text = textoOriginal.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = '';

        const loadingId = 'loading-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'bot-msg';
        loadingDiv.id = loadingId;
        loadingDiv.innerHTML = '<small><i>Pesquisando na matriz...</i></small>';
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        const response = await processarMensagemChatbot(text);
        document.getElementById(loadingId).remove();
        addMessage(response, 'bot');
    }

    sendBtn.addEventListener('click', () => enviarParaOBot(chatInput.value));
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarParaOBot(chatInput.value);
    });

    if(quickActionsContainer) {
        quickActionsContainer.addEventListener('click', (e) => {
            if(e.target.classList.contains('chat-chip')) {
                enviarParaOBot(e.target.innerText);
            }
        });
    }
});