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
let modoPlayerAtual = 'geral';
const corDestaque = 'e50914';

let perfilUsuario = {
    username: "CineNet User",
    avatar: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
};
let avatarTemp = "";
let biblioteca = { watchlist: {}, reviews: {} };
let isLoginMode = true;

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
// GERENCIAMENTO DE AUTENTICAÇÃO
// ==========================================
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? 'Entrar' : 'Cadastrar';
    document.getElementById('auth-submit-btn').innerText = isLoginMode ? 'Entrar' : 'Cadastrar';
    document.getElementById('auth-switch-text').innerText = isLoginMode ? 'Novo por aqui?' : 'Já possui uma conta?';
    document.getElementById('auth-switch-btn').innerText = isLoginMode ? 'Assine agora.' : 'Entrar agora.';
    document.getElementById('auth-error').style.display = 'none';
}

document.getElementById('auth-switch-btn').addEventListener('click', toggleAuthMode);
document.getElementById('auth-form').addEventListener('submit', handleAuth);
document.getElementById('btn-google-auth').addEventListener('click', loginComGoogle);

function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorBox = document.getElementById('auth-error');

    if (isLoginMode) {
        firebase.auth().signInWithEmailAndPassword(email, password)
            .catch(error => {
                errorBox.innerText = "Erro ao entrar: Verifique as credenciais digitadas.";
                errorBox.style.display = 'block';
            });
    } else {
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .catch(error => {
                errorBox.innerText = "Erro ao cadastrar: " + error.message;
                errorBox.style.display = 'block';
            });
    }
}

function loginComGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const errorBox = document.getElementById('auth-error');

    firebase.auth().signInWithPopup(provider)
        .catch((error) => {
            console.error("Erro no login do Google:", error);
            errorBox.innerText = "Erro ao entrar com Google: " + error.message;
            errorBox.style.display = 'block';
        });
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

function logout() { firebase.auth().signOut(); }
document.getElementById('logout-btn-pc').addEventListener('click', logout);
document.getElementById('logout-btn-mobile').addEventListener('click', logout);

// ==========================================
// BANCO DE DADOS
// ==========================================
function carregarDadosUsuario() {
    const user = firebase.auth().currentUser;
    firebase.database().ref('users/' + currentUserUID).once('value')
        .then(snapshot => {
            const data = snapshot.val();
            if (data) {
                if (data.perfil) perfilUsuario = data.perfil;
                if (data.biblioteca) biblioteca = data.biblioteca;
                if (!biblioteca.watchlist) biblioteca.watchlist = {};
                if (!biblioteca.reviews) biblioteca.reviews = {};
            } else if (user) {
                perfilUsuario.username = user.displayName || "Usuário CineNet";
                perfilUsuario.avatar = user.photoURL || "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png";
                salvarDados();
            }
            atualizarUIUsuario();
        })
        .catch(error => console.error("Erro ao sincronizar dados:", error));
}

function salvarDados() {
    if (currentUserUID) {
        firebase.database().ref('users/' + currentUserUID).set({
            perfil: perfilUsuario,
            biblioteca: biblioteca
        });
    }
}

function atualizarUIUsuario() {
    document.getElementById('user-avatar-pc').src = perfilUsuario.avatar;
    document.getElementById('user-avatar-mobile').src = perfilUsuario.avatar;
    document.getElementById('user-name-pc').innerText = perfilUsuario.username;
}

// ==========================================
// CONTROLADOR DE FLUXO (ABAS)
// ==========================================
function setNavActive(idDesktop, idMobile) {
    document.querySelectorAll('.nav-menu a, .mobile-bottom-nav a').forEach(el => {
        el.classList.remove('active', 'active-nav');
    });
    if(idDesktop) document.getElementById(idDesktop).classList.add('active');
    if(idMobile) document.getElementById(idMobile).classList.add('active-nav');
}

function esconderTodasSessoes() {
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('search-results-section').style.display = 'none';
    document.getElementById('watchlist-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none'; 
    document.getElementById('admin-section').style.display = 'none'; // ABA ADMIN INCLUÍDA
}

function irParaHome() {
    setNavActive('nav-home', 'mob-nav-home');
    esconderTodasSessoes();
    document.getElementById('main-content').style.display = 'block';
    carregarHome();
    trackVirtualPage("Início", "/home");
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
    trackVirtualPage("Minha Lista", "/watchlist");
}

function irParaChat() {
    setNavActive('nav-chat', 'mob-nav-chat');
    esconderTodasSessoes();
    document.getElementById('chat-section').style.display = 'block';
    document.getElementById('chatbot-input').focus();
    trackVirtualPage("CineBot", "/chat");
}

function irParaAdmin() {
    setNavActive('nav-admin', 'mob-nav-admin');
    esconderTodasSessoes();
    document.getElementById('admin-section').style.display = 'block';
    trackVirtualPage("Administração", "/admin");
}

// Event Listeners de Navegação
document.getElementById('nav-home').addEventListener('click', irParaHome);
document.getElementById('mob-nav-home').addEventListener('click', irParaHome);
document.getElementById('nav-search').addEventListener('click', irParaBusca);
document.getElementById('mob-nav-search').addEventListener('click', irParaBusca);
document.getElementById('nav-watchlist').addEventListener('click', irParaWatchlist);
document.getElementById('mob-nav-watchlist').addEventListener('click', irParaWatchlist);
document.getElementById('nav-chat').addEventListener('click', irParaChat);
document.getElementById('mob-nav-chat').addEventListener('click', irParaChat);

document.getElementById('nav-admin').addEventListener('click', irParaAdmin);
document.getElementById('mob-nav-admin').addEventListener('click', irParaAdmin);

function alternarScrollBody(travar) {
    document.body.classList.toggle('modal-open', travar);
    if(travar) {
        const larguraScroll = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = `${larguraScroll}px`;
    } else {
        document.body.style.paddingRight = '0px';
    }
}

// ==========================================
// ABA ADMIN: CADASTRO DE CONTEÚDO
// ==========================================
document.getElementById('admin-custom-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const novoConteudo = {
        id: "custom_" + Date.now(),
        title: document.getElementById('admin-title').value,
        tipo: document.getElementById('admin-category').value,
        overview: document.getElementById('admin-overview').value,
        release_date: document.getElementById('admin-year').value,
        video_url: document.getElementById('admin-embed').value,
        poster_path: document.getElementById('admin-poster').value,
        backdrop_path: document.getElementById('admin-backdrop').value,
        vote_average: 10.0, 
        adicionadoEm: Date.now()
    };

    firebase.database().ref('custom_content/' + novoConteudo.id).set(novoConteudo)
        .then(() => {
            alert("Sucesso! Conteúdo adicionado permanentemente à CineNet.");
            document.getElementById('admin-custom-form').reset();
            irParaHome();
        })
        .catch(error => {
            alert("Erro ao salvar dados no Firebase: " + error.message);
        });
});


// ==========================================
// CONSUMO TMDB & RENDERIZAÇÃO
// ==========================================
async function fetchTMDB(endpoint) {
    try {
        const url = `https://api.themoviedb.org/3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}&language=pt-BR`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Erro na resposta TMDB");
        return await response.json();
    } catch (error) {
        return { results: [] };
    }
}

async function carregarHome() {
    const [dataTrending, dataMovies, dataSeries] = await Promise.all([
        fetchTMDB('/trending/all/day'),
        fetchTMDB('/movie/popular'),
        fetchTMDB('/tv/popular')
    ]);

    if (dataTrending.results.length > 0) {
        const heroItem = dataTrending.results[0];
        document.getElementById('hero-banner').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${heroItem.backdrop_path})`;
        document.getElementById('hero-title').innerText = heroItem.title || heroItem.name;
        document.getElementById('hero-desc').innerText = heroItem.overview || "Nenhuma descrição disponível para este conteúdo.";
        
        document.getElementById('hero-play-btn').onclick = () => abrirPlayer(heroItem.id, heroItem.media_type || 'movie');
        document.getElementById('hero-info-btn').onclick = () => abrirDetalhes(heroItem.id, heroItem.media_type || 'movie');
    }

    renderCards(dataTrending.results, 'row-trending');
    renderCards(dataMovies.results, 'row-movies', 'movie');
    renderCards(dataSeries.results, 'row-series', 'tv');

    // BUSCA OS CONTEÚDOS CRIADOS NO ADMIN
    firebase.database().ref('custom_content').orderByChild('adicionadoEm').limitToLast(20).once('value')
        .then(snapshot => {
            const dados = snapshot.val();
            if (dados) {
                const listaCustom = Object.values(dados).reverse();
                document.getElementById('custom-content-section').style.display = 'block';
                renderCards(listaCustom, 'row-custom');
            } else {
                document.getElementById('custom-content-section').style.display = 'none';
            }
        });
}

function renderCards(items, containerId, forceType = null) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';

    items.forEach(item => {
        if (!item.poster_path) return;
        const tipoFinal = forceType || item.media_type || item.tipo || 'movie';
        const card = document.createElement('div');
        card.className = 'movie-card';
        
        const indicator = biblioteca.watchlist[item.id] ? '<div class="watched-indicator">✔</div>' : '';
        const finalPosterUrl = item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`;
        
        card.innerHTML = `<img src="${finalPosterUrl}" alt="Poster" loading="lazy">${indicator}`;
        card.onclick = () => abrirDetalhes(item.id, tipoFinal);
        container.appendChild(card);
    });
}

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

// ==========================================
// ENGINE DE PESQUISA AVANÇADA
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
        executarBuscaTMDB(termo);
    }, 600);
}

function limparBusca() {
    document.getElementById('main-search-input').value = '';
    document.getElementById('search-clear').style.display = 'none';
    document.getElementById('search-grid').innerHTML = '';
    ultimoTermoBusca = '';
}
document.getElementById('main-search-input').addEventListener('input', (e) => iniciarBusca(e.target.value));

function setSearchFilter(tipo, el) {
    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');
    filtroBuscaAtual = tipo;
    if (ultimoTermoBusca.length >= 2) {
        executarBuscaTMDB(ultimoTermoBusca);
    }
}

async function executarBuscaTMDB(termo) {
    const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(termo)}`);
    const container = document.getElementById('search-grid');
    const emptyState = document.getElementById('search-empty-state');
    container.innerHTML = '';

    let filtrados = data.results.filter(item => item.poster_path);
    if (filtroBuscaAtual !== 'all') {
        filtrados = filtrados.filter(item => item.media_type === filtroBuscaAtual);
    }

    if (filtrados.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        renderCards(filtrados, 'search-grid');
    }
}

// ==========================================
// MODAL DE DETALHES & SISTEMA DE REVIEW
// ==========================================
async function abrirDetalhes(id, tipo) {
    let data;
    
    if (String(id).startsWith('custom_')) {
        const snapshot = await firebase.database().ref('custom_content/' + id).once('value');
        data = snapshot.val();
        if(!data) return;
    } else {
        data = await fetchTMDB(`/${tipo}/${id}`);
    }

    itemSelecionado = { id: id, tipo: tipo, poster_path: data.poster_path, title: data.title || data.name };
    
    const finalBackdropUrl = (data.backdrop_path && data.backdrop_path.startsWith('http')) ? data.backdrop_path : `https://image.tmdb.org/t/p/original${data.backdrop_path || data.poster_path}`;
    
    document.getElementById('modal-banner').style.backgroundImage = `url(${finalBackdropUrl})`;
    document.getElementById('modal-title').innerText = itemSelecionado.title;
    document.getElementById('modal-overview').innerText = data.overview || "Nenhuma sinopse disponível até o momento.";
    document.getElementById('modal-year').innerText = (data.release_date || data.first_air_date || "N/A").substring(0, 4);
    document.getElementById('modal-rating').innerText = (data.vote_average ? data.vote_average.toFixed(1) : "N/A") + " de Pontuação";
    
    document.getElementById('modal-play-btn').onclick = () => {
        if (String(id).startsWith('custom_')) {
            fecharDetalhes();
            document.getElementById('main-content').style.display = 'none';
            document.getElementById('videoPlayer').src = data.video_url;
            document.getElementById('streaming-player-screen').style.display = 'block';
            alternarScrollBody(true);
        } else {
            abrirPlayer(id, tipo);
        }
    };
    
    atualizarBotaoWatchlist();
    carregarReviewUI();
    document.getElementById('detailsModal').style.display = 'flex';
    alternarScrollBody(true);
}

function fecharDetalhes() {
    document.getElementById('detailsModal').style.display = 'none';
    itemSelecionado = null;
    alternarScrollBody(false);
}

function alternarWatchlist() {
    if (!itemSelecionado) return;
    const id = itemSelecionado.id;
    if (biblioteca.watchlist[id]) {
        delete biblioteca.watchlist[id];
    } else {
        biblioteca.watchlist[id] = {
            id: id,
            tipo: itemSelecionado.tipo,
            poster_path: itemSelecionado.poster_path,
            adicionadoEm: Date.now()
        };
    }
    atualizarBotaoWatchlist();
    salvarDados();
    if(document.getElementById('watchlist-section').style.display === 'block') {
        renderizarWatchlist();
    }
}

function atualizarBotaoWatchlist() {
    const btn = document.getElementById('btn-watchlist');
    if (biblioteca.watchlist[itemSelecionado.id]) {
        btn.innerText = "✔ Na Minha Lista";
        btn.style.background = "rgba(255,255,255,0.2)";
    } else {
        btn.innerText = "+ Minha Lista";
        btn.style.background = "rgba(255,255,255,0.1)";
    }
}

// SISTEMA DE REVIEWS
function setRating(num) {
    estrelasAtivas = num;
    document.querySelectorAll('.star-rating span').forEach((star, index) => {
        star.classList.toggle('active', index < num);
    });
}
document.querySelectorAll('.star-rating span').forEach(star => {
    star.addEventListener('click', function() { setRating(this.getAttribute('data-value')); });
});

function salvarReview() {
    if(!itemSelecionado) return;
    const txt = document.getElementById('review-text').value;
    biblioteca.reviews[itemSelecionado.id] = { nota: estrelasAtivas, texto: txt, timestamp: Date.now() };
    salvarDados();
    document.getElementById('review-feedback').style.display = 'block';
    setTimeout(() => document.getElementById('review-feedback').style.display = 'none', 3000);
}

function carregarReviewUI() {
    estrelasAtivas = 0;
    document.getElementById('review-text').value = '';
    setRating(0);
    const r = biblioteca.reviews[itemSelecionado.id];
    if (r) {
        setRating(r.nota);
        document.getElementById('review-text').value = r.texto;
    }
}

// ==========================================
// REPRODUTOR DE VÍDEO E CONTROLES
// ==========================================
async function abrirPlayer(id, tipo, isPlay = false) {
    fecharDetalhes();
    document.getElementById('main-content').style.display = 'none';
    
    if (tipo === 'tv') {
        document.getElementById('episodes-selectors-box').style.display = 'flex';
        await carregarTemporadasNoPlayer(id);
        const playerS = document.getElementById('player-season-select');
        const playerE = document.getElementById('player-episode-select');
        document.getElementById('videoPlayer').src = `https://embed.su/embed/tv/${id}/${playerS.value}/${playerE.value}`;
        
        playerS.onchange = async () => {
            await atualizarEpisodiosNoPlayer(id, playerS.value);
            document.getElementById('videoPlayer').src = `https://embed.su/embed/tv/${id}/${playerS.value}/${document.getElementById('player-episode-select').value}`;
        };
        playerE.onchange = () => {
            document.getElementById('videoPlayer').src = `https://embed.su/embed/tv/${id}/${playerS.value}/${playerE.value}`;
        };
        document.getElementById('btn-next-ep').onclick = () => avancarEpisodioNoPlayer(id);
    } else {
        document.getElementById('episodes-selectors-box').style.display = 'none';
        document.getElementById('videoPlayer').src = `https://embed.su/embed/movie/${id}`;
    }

    document.getElementById('streaming-player-screen').style.display = 'block';
    alternarScrollBody(true);
}

async function carregarTemporadasNoPlayer(id) {
    const data = await fetchTMDB(`/tv/${id}`);
    const select = document.getElementById('player-season-select');
    select.innerHTML = '';
    
    const validSeasons = data.seasons.filter(s => s.season_number > 0);
    validSeasons.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.season_number;
        opt.innerText = `Temp ${s.season_number}`;
        select.appendChild(opt);
    });
    
    if (validSeasons.length > 0) {
        await atualizarEpisodiosNoPlayer(id, validSeasons[0].season_number);
    }
}

async function atualizarEpisodiosNoPlayer(id, sNum) {
    const data = await fetchTMDB(`/tv/${id}/season/${sNum}`);
    const select = document.getElementById('player-episode-select');
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
        document.getElementById('videoPlayer').src = `https://embed.su/embed/tv/${id}/${sSelect.value}/${eSelect.value}`;
    } else {
        alert("Fim da temporada alcançado.");
    }
}

function fecharPlayer() {
    document.getElementById('streaming-player-screen').style.display = 'none';
    document.getElementById('videoPlayer').src = '';
    document.getElementById('main-content').style.display = 'block';
    alternarScrollBody(false);
}
document.getElementById('close-player-btn').addEventListener('click', fecharPlayer);

// ==========================================
// CINEBOT (IA)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send-btn');
    const messagesContainer = document.getElementById('chatbot-messages');
    const quickActionsContainer = document.getElementById('chat-quick-actions');

    function addMessage(text, type) {
        const msgDiv = document.createElement('div');
        msgDiv.className = type === 'user' ? 'user-msg' : 'bot-msg';
        msgDiv.innerHTML = text; 
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight; 
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

    quickActionsContainer.addEventListener('click', (e) => {
        if(e.target.classList.contains('chat-chip')) {
            enviarParaOBot(e.target.innerText);
        }
    });

    async function processarMensagemChatbot(mensagem) {
        const msgLower = mensagem.toLowerCase();
        
        if (msgLower.includes("oi") || msgLower.includes("olá") || msgLower.includes("ola")) {
            return "Olá! Sou o CineBot. Posso te recomendar filmes, séries, criar roteiros ou até resumir histórias. O que você gostaria?";
        }
        if (msgLower.includes("filme de terror")) {
            return "Recomendo fortemente 'Hereditário' ou 'Invocação do Mal' para bons sustos!";
        }
        if (msgLower.includes("resuma") && msgLower.includes("interestelar")) {
            return "Interestelar acompanha o ex-piloto da NASA, Cooper, que se junta a uma equipe de pesquisadores para viajar por um buraco de minhoca no espaço, na tentativa de garantir a sobrevivência da humanidade.";
        }
        if (msgLower.includes("séries sci-fi")) {
            return "Algumas das melhores são: 'Ruptura (Severance)', 'Dark', 'Fringe' e 'The Expanse'.";
        }
        if (msgLower.includes("animes de ação")) {
            return "Com certeza assista 'Jujutsu Kaisen', 'Demon Slayer', 'Chainsaw Man' e o clássico 'Hunter x Hunter'.";
        }
        
        return "Neste momento meus circuitos de IA estão em manutenção e estou trabalhando com respostas limitadas! Tente pedir para eu resumir 'Interestelar' ou recomendar animes de ação.";
    }
});