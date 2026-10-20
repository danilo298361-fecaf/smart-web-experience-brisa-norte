/* ==========================================================
   BRISA NORTE — Assistente e Calculadora (Webflow Cloud)
   JavaScript puro, sem bibliotecas e sem etapa de build.
   1. Menu do celular e sombra do menu ao rolar
   2. Links internos (#calculadora, #assistente) sem recarregar a página
   3. Calculadora de BTUs
   4. Assistente de triagem com IA (Make + Google Gemini) com plano B local
   ========================================================== */
(function () {
  'use strict';

  /* ===================== CONFIGURAÇÃO ===================== */
  var CONFIG = {
    WEBHOOK_URL: 'https://hook.us2.make.com/j9h1c77c7ytvxthej7cl5kvo2e3lvpu6', /* ex.: https://hook.us2.make.com/abc123... */
    WHATSAPP: '5565999454140',                         /* número fictício da empresa */
    TIMEOUT_MS: 25000
  };
  /* ======================================================== */

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- 1) Menu ---------- */
  var menu = document.querySelector('[data-menu]');
  var botaoMenu = document.querySelector('.menu__botao');
  var links = $('menu-links');
  function fecharMenu() {
    if (!botaoMenu) return;
    botaoMenu.setAttribute('aria-expanded', 'false');
    botaoMenu.querySelector('.visualmente-oculto').textContent = 'Abrir menu';
    links.classList.remove('is-open');
  }
  if (botaoMenu && links) {
    botaoMenu.addEventListener('click', function () {
      var aberto = botaoMenu.getAttribute('aria-expanded') === 'true';
      botaoMenu.setAttribute('aria-expanded', String(!aberto));
      botaoMenu.querySelector('.visualmente-oculto').textContent = aberto ? 'Abrir menu' : 'Fechar menu';
      links.classList.toggle('is-open', !aberto);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharMenu(); });
  }
  if (menu) {
    var sombra = function () { menu.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', sombra, { passive: true });
    sombra();
  }

  /* ---------- 2) Links internos ----------
     O app fica montado em /assistente/. Para "#calculadora" não virar uma
     navegação para outra URL, o clique rola até a seção e move o foco para ela. */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var alvo = document.getElementById(a.getAttribute('href').slice(1));
      if (!alvo) return;
      e.preventDefault();
      fecharMenu();
      alvo.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');
      alvo.focus({ preventScroll: true });
      history.replaceState(null, '', '#' + alvo.id);
    });
  });

  document.querySelectorAll('[data-ano]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- 3) Calculadora de BTUs ----------
     Regra prática de mercado (estimativa, confirmada na visita técnica):
     600 BTU/m² (800 se bate sol da tarde) + 600 por pessoa além da primeira
     + 600 por eletrônico. Arredonda para o tamanho comercial acima. */
  var TAMANHOS = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];
  var fmt = new Intl.NumberFormat('pt-BR');
  var numero = function (id, min) { var v = parseFloat($(id).value); return isNaN(v) ? min : Math.max(min, v); };

  function calcular() {
    var area = numero('bn-area', 4), sol = $('bn-sol').value === '1';
    var pessoas = numero('bn-pessoas', 1), eletro = numero('bn-eletro', 0);
    var btu = area * (sol ? 800 : 600) + (pessoas - 1) * 600 + eletro * 600;
    var indicado = TAMANHOS.find(function (t) { return t >= btu; });
    $('bn-calc-bruto').textContent = fmt.format(Math.round(btu));
    $('bn-calc-res').textContent = indicado
      ? fmt.format(indicado) + ' BTUs'
      : 'Acima de 60.000 BTUs: fale com um técnico';
    return { btu: btu, indicado: indicado };
  }
  var formCalc = $('bn-calc-form');
  if (formCalc) {
    formCalc.addEventListener('input', calcular);
    formCalc.addEventListener('submit', function (e) { e.preventDefault(); });
    calcular();
  }

  /* ---------- 4) Assistente com IA ---------- */
  var CATEGORIAS = {
    instalacao:   { rotulo: 'Instalação',            servico: 'Instalação de ar-condicionado split' },
    manutencao:   { rotulo: 'Manutenção preventiva', servico: 'Manutenção preventiva e limpeza técnica' },
    higienizacao: { rotulo: 'Higienização',          servico: 'Higienização completa com bactericida' },
    conserto:     { rotulo: 'Conserto / reparo',     servico: 'Visita técnica para diagnóstico e reparo' },
    contrato:     { rotulo: 'Contrato empresarial',  servico: 'Contrato de manutenção (PMOC) para empresas' },
    outro:        { rotulo: 'Atendimento geral',     servico: 'Conversa com um atendente' }
  };
  var URGENCIAS = { baixa: 'Urgência baixa', media: 'Urgência média', alta: 'Urgência alta' };

  var form = $('bn-ai-form'), btn = $('bn-ai-enviar'), status = $('bn-ai-status'), box = $('bn-ai-result');
  if (!form) return;

  document.querySelectorAll('.bn-ai__chip').forEach(function (chip) {
    chip.addEventListener('click', function () { $('bn-msg').value = chip.textContent.trim(); $('bn-msg').focus(); });
  });

  function setErro(campo, idErro, texto) {
    $(idErro).textContent = texto;
    campo.setAttribute('aria-invalid', texto ? 'true' : 'false');
  }

  function validar() {
    var nome = $('bn-nome'), msg = $('bn-msg'), ok = true;
    setErro(nome, 'bn-nome-erro', '');
    setErro(msg, 'bn-msg-erro', '');
    if (nome.value.trim().length < 2) { setErro(nome, 'bn-nome-erro', 'Informe seu nome.'); ok = false; }
    if (msg.value.trim().length < 15) { setErro(msg, 'bn-msg-erro', 'Descreva com pelo menos 15 caracteres.'); ok = false; }
    if (!ok) (nome.getAttribute('aria-invalid') === 'true' ? nome : msg).focus();
    return ok;
  }

  function carregando(sim) {
    btn.disabled = sim;
    btn.setAttribute('aria-busy', sim ? 'true' : 'false');
    btn.querySelector('.bn-ai__btn-txt').textContent = sim ? 'Analisando…' : 'Analisar minha solicitação';
    status.textContent = sim ? 'Analisando sua solicitação, aguarde alguns segundos…' : '';
  }

  /* Extrai o JSON mesmo que a IA devolva com ```json ... ``` ou texto em volta */
  function extrairJSON(texto) {
    if (typeof texto !== 'string') return texto;
    var limpo = texto.replace(/```json|```/gi, '').trim();
    var ini = limpo.indexOf('{'), fim = limpo.lastIndexOf('}');
    if (ini === -1 || fim === -1) throw new Error('Resposta sem JSON');
    return JSON.parse(limpo.slice(ini, fim + 1));
  }

  /* Só valores conhecidos chegam à tela (a IA não controla a página) */
  function normalizar(r) {
    var cat = CATEGORIAS[r.categoria] ? r.categoria : 'outro';
    var urg = URGENCIAS[r.urgencia] ? r.urgencia : 'media';
    return {
      categoria: cat, urgencia: urg,
      servico: String(r.servico_recomendado || CATEGORIAS[cat].servico).slice(0, 120),
      resposta: String(r.resposta || '').slice(0, 700),
      perguntas: Array.isArray(r.perguntas) ? r.perguntas.slice(0, 3).map(String) : [],
      resumo: String(r.resumo_whatsapp || '').slice(0, 500)
    };
  }

  /* Plano B: classificador local por palavras-chave, se a IA não responder */
  function classificarLocal(dados) {
    var t = dados.mensagem.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    var regras = {
      contrato:     ['contrato', 'pmoc', 'empresa', 'loja', 'aparelhos', 'mensal', 'escritorio', 'galpao'],
      instalacao:   ['instalar', 'instalacao', 'novo', 'comprei', 'btus', 'colocar', 'mudar de lugar'],
      higienizacao: ['cheiro', 'mofo', 'higieniz', 'alergia', 'sujo', 'bacteria', 'fungo'],
      conserto:     ['pingando', 'vazando', 'barulho', 'nao gela', 'nao liga', 'quebrou', 'erro', 'gelando pouco', 'desliga sozinho', 'agua'],
      manutencao:   ['manutencao', 'limpeza', 'revisao', 'preventiva', 'limpar']
    };
    var melhor = 'outro', pontos = 0;
    Object.keys(regras).forEach(function (cat) {
      var p = regras[cat].filter(function (k) { return t.indexOf(k) !== -1; }).length;
      if (p > pontos) { pontos = p; melhor = cat; }
    });
    if (dados.tipo_cliente !== 'residencial' && (melhor === 'manutencao' || melhor === 'outro')) melhor = 'contrato';
    var urg = /nao liga|nao gela|vazando|pingando|queimou|cheiro de queimado|urgente|hoje/.test(t) ? 'alta'
            : (melhor === 'conserto' ? 'media' : 'baixa');
    return {
      categoria: melhor, urgencia: urg, servico_recomendado: CATEGORIAS[melhor].servico,
      resposta: 'Olá, ' + dados.nome + '! Pelo que você descreveu, o serviço mais indicado é: '
        + CATEGORIAS[melhor].servico.toLowerCase() + '. Envie o resumo pelo WhatsApp que nossa equipe confirma o horário.',
      perguntas: ['Qual a marca e a potência (BTUs) do aparelho?', 'Qual o melhor dia e horário para a visita?'],
      resumo_whatsapp: ''
    };
  }

  function chamarIA(dados) {
    if (!/^https:\/\/hook\.[a-z0-9.]*make\.com\//.test(CONFIG.WEBHOOK_URL)) {
      return Promise.reject(new Error('Webhook não configurado'));
    }
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, CONFIG.TIMEOUT_MS);
    /* URLSearchParams = requisição "simples" (sem preflight de CORS) */
    return fetch(CONFIG.WEBHOOK_URL, { method: 'POST', body: new URLSearchParams(dados), signal: ctrl.signal })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.text(); })
      .then(extrairJSON)
      .finally(function () { clearTimeout(timer); });
  }

  function mostrar(r, dados, viaIA) {
    $('bn-r-categoria').textContent = CATEGORIAS[r.categoria].rotulo;
    var u = $('bn-r-urgencia');
    u.textContent = URGENCIAS[r.urgencia];
    u.className = 'bn-ai__tag bn-ai__tag--' + r.urgencia;
    $('bn-r-servico').textContent = 'Serviço recomendado: ' + r.servico;
    $('bn-r-resposta').textContent = r.resposta;
    var ul = $('bn-r-perguntas'); ul.textContent = '';
    r.perguntas.forEach(function (p) { var li = document.createElement('li'); li.textContent = p; ul.appendChild(li); });
    ul.hidden = r.perguntas.length === 0;
    var resumo = r.resumo || ('Olá! Sou ' + dados.nome + ' (' + dados.tipo_cliente + '). ' + dados.mensagem);
    var texto = resumo + '\n\n[Triagem do site] Serviço: ' + r.servico + ' | ' + URGENCIAS[r.urgencia];
    $('bn-r-zap').href = 'https://wa.me/' + CONFIG.WHATSAPP + '?text=' + encodeURIComponent(texto);
    $('bn-r-fonte').textContent = viaIA
      ? 'Análise gerada por IA (Google Gemini via automação Make). Um atendente humano confirma tudo pelo WhatsApp.'
      : 'Análise automática local (a IA não respondeu agora). Um atendente humano confirma tudo pelo WhatsApp.';
    box.hidden = false;
    $('bn-ai-result-titulo').focus();
    status.textContent = 'Análise concluída.';
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if ($('bn-site').value) return;              /* campo-armadilha preenchido: é robô */
    if (!validar()) return;
    var dados = {
      nome: $('bn-nome').value.trim(),
      tipo_cliente: $('bn-tipo').value,
      mensagem: $('bn-msg').value.trim(),
      pagina: location.href
    };
    carregando(true);
    chamarIA(dados)
      .then(function (r) { carregando(false); mostrar(normalizar(r), dados, true); })
      .catch(function (err) {
        console.warn('[Assistente Brisa Norte] IA indisponível, usando classificador local:', err.message);
        carregando(false);
        mostrar(normalizar(classificarLocal(dados)), dados, false);
      });
  });

  $('bn-r-nova').addEventListener('click', function () {
    box.hidden = true; form.reset(); status.textContent = ''; $('bn-msg').focus();
  });
})();
