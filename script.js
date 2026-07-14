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

function logout() {
    firebase.auth().signOut();
}

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
}

function renderCards(items, containerId, forceType = null) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';

    items.forEach(item => {
        if (!item.poster_path) return;
        const tipoFinal = forceType || item.media_type || 'movie';
        const card = document.createElement('div');
        card.className = 'movie-card';
        
        const indicator = biblioteca.watchlist[item.id] ? '<div class="watched-indicator">✔</div>' : '';
        card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="Poster" loading="lazy">${indicator}`;
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
            card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" loading="lazy"><div class="watched-indicator">✔</div>`;
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
    const data = await fetchTMDB(`/${tipo}/${id}`);
    itemSelecionado = {
        id: id,
        tipo: tipo,
        poster_path: data.poster_path,
        title: data.title || data.name
    };

    document.getElementById('modal-banner').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${data.backdrop_path || data.poster_path})`;
    document.getElementById('modal-title').innerText = itemSelecionado.title;
    document.getElementById('modal-overview').innerText = data.overview || "Nenhuma sinopse disponível até o momento.";
    document.getElementById('modal-year').innerText = (data.release_date || data.first_air_date || "N/A").substring(0, 4);
    document.getElementById('modal-rating').innerText = (data.vote_average ? data.vote_average.toFixed(1) : "N/A") + " de Pontuação";

    document.getElementById('modal-play-btn').onclick = () => abrirPlayer(id, tipo);
    atualizarBotaoWatchlist();
    carregarReviewUI();

    document.getElementById('detailsModal').style.display = 'flex';
    alternarScrollBody(true);

    if (typeof gtag === 'function') {
        gtag('event', 'view_item', { 'item_id': id, 'item_name': itemSelecionado.title });
    }
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

function setRating(num) {
    estrelasAtivas = num;
    const spans = document.getElementById('star-container').children;
    for (let i = 0; i < spans.length; i++) {
        if (i < num) {
            spans[i].classList.add('active');
        } else {
            spans[i].classList.remove('active');
        }
    }
}

function carregarReviewUI() {
    document.getElementById('review-text').value = '';
    setRating(0);
    if (biblioteca.reviews[itemSelecionado.id]) {
        setRating(biblioteca.reviews[itemSelecionado.id].rating);
        document.getElementById('review-text').value = biblioteca.reviews[itemSelecionado.id].text || "";
    }
}

function salvarReview() {
    const nota = estrelasAtivas;
    const textoComentario = document.getElementById('review-text').value.trim();
    if (nota === 0) { alert("Selecione pelo menos 1 estrela."); return; }
    biblioteca.reviews[itemSelecionado.id] = { rating: nota, text: textoComentario };
    salvarDados(); 
    alert("Avaliação salva com sucesso!");
}

// ==========================================
// REPRODUTOR DE VÍDEO E SELETORES
// ==========================================
async function abrirPlayer(id, tipo) {
    const epBox = document.getElementById('episodes-selectors-box');
    if (tipo === 'tv') { 
        epBox.style.display = 'flex'; 
        modoPlayerAtual = 'series'; 
        await carregarTemporadasNoPlayer(id); 
    } else { 
        epBox.style.display = 'none'; 
        modoPlayerAtual = 'geral'; 
    }
    document.getElementById('playerModal').style.display = 'flex';
    alternarScrollBody(true); 
    atualizarIframePlayer();
}

function fecharPlayer() { 
    document.getElementById('playerModal').style.display = 'none'; 
    document.getElementById('videoPlayer').src = ""; 
    alternarScrollBody(false); 
}

function atualizarIframePlayer() {
    if (!itemSelecionado) return;
    const id = itemSelecionado.id;
    const player = document.getElementById('videoPlayer');
    if (modoPlayerAtual === 'geral') {
        player.src = `https://mgeb.top/embed/${id}?player=vidstack#color:${corDestaque}`;
    } else {
        const season = document.getElementById('player-season-select').value || 1;
        const episode = document.getElementById('player-episode-select').value || 1;
        player.src = `https://mgeb.top/embed/tv/${id}/${season}/${episode}?player=vidstack#color:${corDestaque}`;
    }
}

async function carregarTemporadasNoPlayer(idSerie) {
    const seasonSelect = document.getElementById('player-season-select');
    seasonSelect.innerHTML = '<option value="1">Carregando...</option>';
    try {
        const dadosSerie = await fetchTMDB(`/tv/${idSerie}`);
        const numTemporadas = dadosSerie.number_of_seasons || 1;
        seasonSelect.innerHTML = '';
        for(let i = 1; i <= numTemporadas; i++) {
            seasonSelect.innerHTML += `<option value="${i}">Temp ${i}</option>`;
        }
        seasonSelect.value = "1";
        await carregarEpisodiosNoPlayer(idSerie, 1);
    } catch (e) { console.error("Erro ao carregar temporadas"); }
}

async function carregarEpisodiosNoPlayer(idSerie, numeroTemporada) {
    const epSelect = document.getElementById('player-episode-select');
    epSelect.innerHTML = '<option value="1">Carregando...</option>';
    try {
        const tempDados = await fetchTMDB(`/tv/${idSerie}/season/${numeroTemporada}`);
        const numEpisodios = tempDados.episodes ? tempDados.episodes.length : 20; 
        epSelect.innerHTML = '';
        for(let i = 1; i <= numEpisodios; i++) {
            const epNome = tempDados.episodes[i-1] ? ` - ${tempDados.episodes[i-1].name}` : '';
            const nomeCurto = epNome.length > 22 ? epNome.substring(0, 22) + '...' : epNome;
            epSelect.innerHTML += `<option value="${i}">Ep ${i}${nomeCurto}</option>`;
        }
        epSelect.value = "1";
        atualizarIframePlayer();
    } catch (e) { console.error("Erro ao carregar episodios"); }
}

function avancarProximoEpisodio() {
    if (modoPlayerAtual !== 'series') return;
    const epSelect = document.getElementById('player-episode-select');
    const seasonSelect = document.getElementById('player-season-select');
    let epAtual = parseInt(epSelect.value);
    let maxEps = epSelect.options.length;
    if (epAtual < maxEps) {
        epSelect.value = epAtual + 1;
        atualizarIframePlayer();
    } else {
        let tempAtual = parseInt(seasonSelect.value);
        let maxTemps = seasonSelect.options.length;
        if (tempAtual < maxTemps) {
            seasonSelect.value = tempAtual + 1;
            carregarEpisodiosNoPlayer(itemSelecionado.id, tempAtual + 1);
        } else {
            alert("Você chegou ao fim da série!");
        }
    }
}

// ==========================================
// CONFIGURAÇÃO DO PERFIL
// ==========================================
function abrirModalPerfil() {
    avatarTemp = perfilUsuario.avatar;
    document.getElementById('edit-username').value = perfilUsuario.username;
    document.getElementById('input-profile-avatar-url').value = ""; 
    document.querySelectorAll('.avatar-option').forEach(img => {
        if (img.src === avatarTemp) img.classList.add('active');
        else img.classList.remove('active');
    });
    document.getElementById('profileModal').style.display = 'flex';
    alternarScrollBody(true);
}
function fecharModalPerfil() {
    document.getElementById('profileModal').style.display = 'none';
    alternarScrollBody(false);
}
function selecionarAvatar(imgElement) {
    document.getElementById('input-profile-avatar-url').value = "";
    document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('active'));
    imgElement.classList.add('active');
    avatarTemp = imgElement.src;
}
function limparSelecaoAvatar() {
    document.querySelectorAll('.avatar-option').forEach(img => img.classList.remove('active'));
}
function salvarPerfil() {
    const novoNome = document.getElementById('edit-username').value.trim();
    const urlCustom = document.getElementById('input-profile-avatar-url').value.trim();
    if (novoNome) perfilUsuario.username = novoNome;
    perfilUsuario.avatar = urlCustom !== "" ? urlCustom : avatarTemp;
    salvarDados();
    atualizarUIUsuario();
    fecharModalPerfil();
}
function atualizarUIUsuario() {
    document.getElementById('user-avatar-pc').src = perfilUsuario.avatar;
    document.getElementById('user-avatar-mobile').src = perfilUsuario.avatar;
    document.getElementById('user-name-pc').innerText = perfilUsuario.username;
}

// ==========================================
// CINEBOT 2.0 (INTELIGÊNCIA MELHORADA - MUITA VARIEDADE)
// ==========================================
const generosBotTMDB = {
    "ação": 28, "acao": 28, "aventura": 12,
    "comédia": 35, "comedia": 35, "engraçado": 35,
    "terror": 27, "assustador": 27, "medo": 27,
    "romance": 10749, "amor": 10749,
    "animação": 16, "animacao": 16, "desenho": 16,
    "ficção": 878, "ficcao": 878, "sci-fi": 878, "espaço": 878,
    "drama": 18, "triste": 18,
    "fantasia": 14, "magia": 14,
    "documentário": 99, "documentario": 99
};

async function processarMensagemChatbot(mensagemUsuario) {
    const msg = mensagemUsuario.toLowerCase();
    let tipoMidia = 'movie'; 
    let idGenero = null;
    let queryBusca = null;
    let isNovo = false; // Flag para Lançamentos Novos

    // 1. O que o usuário quer?
    if (msg.includes('série') || msg.includes('serie')) tipoMidia = 'tv';
    else if (msg.includes('anime') || msg.includes('shounen')) { tipoMidia = 'tv'; idGenero = 16; }
    else if (msg.includes('desenho')) { tipoMidia = 'movie'; idGenero = 16; }

    // 2. Ele quer algo NOVO? (Lançamentos recentes)
    if (msg.includes('novo') || msg.includes('nova') || msg.includes('lançamento') || msg.includes('recente') || msg.includes('lançamentos')) {
        isNovo = true;
    }

    // 3. Ele falou algum gênero?
    for (const [chave, id] of Object.entries(generosBotTMDB)) {
        if (msg.includes(chave)) { idGenero = id; break; }
    }

    // 4. Ele pediu o nome específico?
    if(msg.includes("o filme ") || msg.includes("a série ")) {
        queryBusca = msg.split("filme ")[1] || msg.split("série ")[1];
    }

    // 5. Montar a URL Mágica
    let url = "";
    if (queryBusca) {
        url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&language=pt-BR&query=${encodeURIComponent(queryBusca)}`;
    } else {
        url = `https://api.themoviedb.org/3/discover/${tipoMidia}?api_key=${TMDB_KEY}&language=pt-BR&sort_by=popularity.desc`;
        if (idGenero) url += `&with_genres=${idGenero}`;
        
        // Se pediu novo, filtra pelo ano atual!
        if (isNovo) {
            const anoAtual = new Date().getFullYear();
            if (tipoMidia === 'movie') {
                url += `&primary_release_year=${anoAtual}`;
            } else {
                url += `&first_air_date_year=${anoAtual}`;
            }
        }
    }

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Limpar resultados sem imagem
        let validResults = data.results ? data.results.filter(i => i.poster_path) : [];
        
        if (validResults.length > 0) {
            // O SEGREDO DA VARIEDADE: Pegar até 20 opções e sortear! 
            // Se for pesquisa pelo nome (queryBusca), pega o 1º resultado direto (índice 0)
            const limiteSorteio = queryBusca ? 1 : Math.min(20, validResults.length); 
            const index = Math.floor(Math.random() * limiteSorteio);
            const rec = validResults[index]; 
            
            const titulo = rec.title || rec.name;
            const sinopse = rec.overview ? rec.overview.substring(0, 130) + "..." : "Sem sinopse.";
            const imagem = `https://image.tmdb.org/t/p/w200${rec.poster_path}`;
            const tipoCard = rec.media_type || tipoMidia;
            
            const textoResposta = isNovo ? `Aqui está um super lançamento recente para você:` : `Encontrei esta obra fantástica para você:`;

            return `
                ${textoResposta} <b>${titulo}</b>!
                <div class="bot-msg-movie-card" onclick="abrirDetalhes(${rec.id}, '${tipoCard}')" style="cursor:pointer;">
                    <img src="${imagem}" alt="Poster">
                    <div>
                        <h4>⭐ ${(rec.vote_average || 0).toFixed(1)}</h4>
                        <p>${sinopse}</p>
                    </div>
                </div>
                <small style="color:var(--primary-neon); font-weight:bold; cursor:pointer;" onclick="abrirDetalhes(${rec.id}, '${tipoCard}')">▶ Clique aqui para assistir</small>
            `;
        } else {
            return "Desculpe, a minha inteligência artificial não encontrou nada com essas palavras. Tente buscar por um gênero como 'Terror', 'Comédia' ou 'Série de Ação'!";
        }
    } catch (error) {
        return "Opa, as estrelas se alinharam errado e perdi a conexão. Tente novamente! 🔌";
    }
}

// ==========================================
// INICIALIZAÇÃO DE EVENTOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('auth-form').addEventListener('submit', handleAuth);
    document.getElementById('auth-switch-btn').addEventListener('click', toggleAuthMode);
    document.getElementById('btn-google-auth').addEventListener('click', loginComGoogle);
    
    document.getElementById('logout-btn-pc').addEventListener('click', logout);
    document.getElementById('logout-btn-mobile').addEventListener('click', logout);
    
    document.getElementById('nav-home').addEventListener('click', irParaHome);
    document.getElementById('mob-nav-home').addEventListener('click', irParaHome);
    document.getElementById('brand-pc').addEventListener('click', irParaHome);
    document.getElementById('brand-mobile').addEventListener('click', irParaHome);
    
    document.getElementById('nav-search').addEventListener('click', irParaBusca);
    document.getElementById('mob-nav-search').addEventListener('click', irParaBusca);
    
    document.getElementById('nav-watchlist').addEventListener('click', irParaWatchlist);
    document.getElementById('mob-nav-watchlist').addEventListener('click', irParaWatchlist);
    document.getElementById('explore-catalog-btn').addEventListener('click', irParaHome);

    document.getElementById('nav-chat').addEventListener('click', irParaChat);
    document.getElementById('mob-nav-chat').addEventListener('click', irParaChat);

    document.getElementById('main-search-input').addEventListener('input', (e) => iniciarBusca(e.target.value));
    document.getElementById('search-clear').addEventListener('click', limparBusca);
    document.getElementById('filter-pills-container').addEventListener('click', (e) => {
        if(e.target.classList.contains('filter-pill')) {
            document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
            e.target.classList.add('active');
            filtroBuscaAtual = e.target.getAttribute('data-filter');
            if (ultimoTermoBusca.length >= 2) executarBuscaTMDB(ultimoTermoBusca);
        }
    });

    document.getElementById('close-details-btn').addEventListener('click', fecharDetalhes);
    document.getElementById('btn-watchlist').addEventListener('click', alternarWatchlist);
    document.getElementById('save-review-btn').addEventListener('click', salvarReview);
    document.getElementById('star-container').addEventListener('click', (e) => {
        if(e.target.hasAttribute('data-star')) setRating(parseInt(e.target.getAttribute('data-star')));
    });

    document.getElementById('profile-trigger-pc').addEventListener('click', abrirModalPerfil);
    document.getElementById('user-avatar-mobile').addEventListener('click', abrirModalPerfil);
    document.getElementById('close-profile-btn').addEventListener('click', fecharModalPerfil);
    document.getElementById('save-profile-btn').addEventListener('click', salvarPerfil);
    document.getElementById('avatar-grid').addEventListener('click', (e) => {
        if(e.target.classList.contains('avatar-option')) selecionarAvatar(e.target);
    });
    document.getElementById('input-profile-avatar-url').addEventListener('input', limparSelecaoAvatar);

    document.getElementById('close-player-btn').addEventListener('click', fecharPlayer);
    document.getElementById('player-season-select').addEventListener('change', (e) => {
        carregarEpisodiosNoPlayer(itemSelecionado.id, e.target.value);
    });
    document.getElementById('player-episode-select').addEventListener('change', atualizarIframePlayer);
    document.getElementById('btn-next-ep').addEventListener('click', avancarProximoEpisodio);

    // ====================================================
    // CINEBOT 2.0 (Eventos do Chat)
    // ====================================================
    const sendBtn = document.getElementById('chatbot-send-btn');
    const chatInput = document.getElementById('chatbot-input');
    const messagesContainer = document.getElementById('chatbot-messages');
    const quickActionsContainer = document.getElementById('chat-quick-actions');

    if(sendBtn && chatInput) {
        function addMessage(text, sender) {
            const msgDiv = document.createElement('div');
            msgDiv.className = sender === 'user' ? 'user-msg' : 'bot-msg';
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

        // Envio Normal
        sendBtn.addEventListener('click', () => enviarParaOBot(chatInput.value));
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') enviarParaOBot(chatInput.value);
        });

        // Envio via Botões Rápidos (Chips)
        quickActionsContainer.addEventListener('click', (e) => {
            if(e.target.classList.contains('chat-chip')) {
                enviarParaOBot(e.target.innerText);
            }
        });
    }
});