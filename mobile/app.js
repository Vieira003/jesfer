
"use strict";

/* =====================================================
   JESFER MOBILE 1.0
   Login, dashboard, financeiro, agenda e navegação
   Proteção de sessão e acesso administrativo
   ===================================================== */

// Conexão pública com Supabase.
// Nunca utilizar a chave service_role no navegador.
const SUPABASE_URL = "https://sthzmyapurueptsbgtvo.supabase.co";
const SUPABASE_KEY = "sb_publishable_ibrL60yyFd2xHPbU1fimaA_38QPAAXg";

const $ = (id) => document.getElementById(id);

let db = null;
let usuarioAtual = null;
let perfilAtual = null;
let graficoDespesas = null;
let carregando = false;
let verificacaoEmAndamento = false;

const moeda = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

function mensagemLogin(texto) {
  const elemento = $("mensagemLogin");
  if (elemento) elemento.textContent = texto || "";
}

function mostrarAplicativo(logado) {
  const autorizado =
    logado === true &&
    usuarioAtual !== null &&
    perfilAtual?.role === "admin" &&
    perfilAtual?.ativo === true;

  $("telaLogin").classList.toggle("oculto", autorizado);
  $("aplicativo").classList.toggle("oculto", !autorizado);
}

function bloquearAplicativo() {
  usuarioAtual = null;
  perfilAtual = null;
  mostrarAplicativo(false);
}

function mensagemVazia(texto) {
  const p = document.createElement("p");
  p.className = "estado-vazio";
  p.textContent = texto;
  return p;
}

function mostrarErroLista(id, texto) {
  const elemento = $(id);

  if (elemento) {
    elemento.replaceChildren(mensagemVazia(texto));
  }
}

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);

  if (classe) elemento.className = classe;

  if (texto !== undefined) {
    elemento.textContent = String(texto);
  }

  return elemento;
}

function formatarData(valor) {
  if (!valor) return "Sem data";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "Data inválida";
  }

  return data.toLocaleDateString("pt-BR");
}

function formatarHorario(valor) {
  if (!valor) return "";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return "";

  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* =====================================================
   NAVEGAÇÃO
   ===================================================== */

function navegar(paginaId) {
  if (!usuarioAtual || perfilAtual?.role !== "admin") {
    bloquearAplicativo();
    return;
  }

  const destino = $(paginaId);

  if (!destino || !destino.classList.contains("pagina")) {
    return;
  }

  document.querySelectorAll(".pagina").forEach((pagina) => {
    pagina.classList.toggle(
      "ativa",
      pagina.id === paginaId
    );
  });

  document.querySelectorAll(".nav-item").forEach((botao) => {
    botao.classList.toggle(
      "ativo",
      botao.dataset.pagina === paginaId
    );
  });

  window.scrollTo({
    top: 0,
    behavior: "instant"
  });
}

function configurarNavegacao() {
  document.querySelectorAll("[data-pagina]").forEach((botao) => {
    botao.addEventListener("click", () => {
      navegar(botao.dataset.pagina);
    });
  });

  $("btnMenu").addEventListener("click", () => {
    navegar("paginaMais");
  });

  $("btnPerfil").addEventListener("click", () => {
    navegar("paginaMais");
  });

  $("btnNotificacoes").addEventListener("click", () => {
    navegar("paginaAgenda");
  });

  $("mostrarSenha").addEventListener("click", () => {
    const campo = $("senhaLogin");
    const visivel = campo.type === "password";

    campo.type = visivel ? "text" : "password";

    $("mostrarSenha")
      .querySelector(".material-icon")
      .textContent = visivel
        ? "visibility_off"
        : "visibility";
  });

  $("dataAtual").textContent =
    new Date().toLocaleDateString("pt-BR");
}

/* =====================================================
   AUTENTICAÇÃO E SEGURANÇA
   ===================================================== */

async function verificarAcesso() {
  if (!db) {
    bloquearAplicativo();
    return false;
  }

  if (verificacaoEmAndamento) {
    return false;
  }

  verificacaoEmAndamento = true;

  try {
    // Confirma o usuário diretamente com Supabase Auth.
    const { data, error } = await db.auth.getUser();

    if (error || !data?.user) {
      bloquearAplicativo();
      return false;
    }

    const usuario = data.user;

    // Consulta o perfil e exige administrador ativo.
    const {
      data: perfil,
      error: erroPerfil
    } = await db
      .from("profiles")
      .select("id,nome,role,ativo")
      .eq("id", usuario.id)
      .single();

    if (erroPerfil) {
      console.error(
        "Erro ao consultar permissões:",
        erroPerfil
      );

      bloquearAplicativo();

      mensagemLogin(
        "Não foi possível verificar suas permissões."
      );

      return false;
    }

    if (
      !perfil ||
      perfil.id !== usuario.id ||
      perfil.role !== "admin" ||
      perfil.ativo !== true
    ) {
      bloquearAplicativo();

      mensagemLogin(
        "Acesso permitido somente para administradores ativos."
      );

      return false;
    }

    usuarioAtual = usuario;
    perfilAtual = perfil;

    const nome =
      perfil.nome?.trim().split(/\s+/)[0] ||
      "Administrador";

    const saudacao =
      document.querySelector(".boas-vindas h2");

    if (saudacao) {
      saudacao.replaceChildren(
        criarElemento(
          "span",
          "material-icon",
          "engineering"
        ),
        document.createTextNode(` Olá, ${nome}!`)
      );
    }

    mensagemLogin("");
    mostrarAplicativo(true);
    navegar("paginaInicio");

    await atualizarPainel();

    return true;

  } catch (erro) {
    console.error(
      "Falha ao verificar acesso:",
      erro
    );

    bloquearAplicativo();

    mensagemLogin(
      "Não foi possível validar seu acesso."
    );

    return false;

  } finally {
    verificacaoEmAndamento = false;
  }
}

async function entrar(evento) {
  evento.preventDefault();

  const email = $("emailLogin").value.trim();
  const senha = $("senhaLogin").value;
  const botao = $("btnLogin");

  if (!email || !senha) {
    mensagemLogin(
      "Preencha seu e-mail e sua senha."
    );
    return;
  }

  botao.disabled = true;
  mensagemLogin("");

  try {
    // Bloqueia o painel antes de autenticar.
    bloquearAplicativo();

    const { error } =
      await db.auth.signInWithPassword({
        email,
        password: senha
      });

    if (error) throw error;

    const autorizado = await verificarAcesso();

    if (!autorizado) {
      await db.auth.signOut();

      mensagemLogin(
        "Login não autorizado ou permissões inválidas."
      );

      return;
    }

    $("senhaLogin").value = "";

  } catch (erro) {
    console.error("Erro no login:", erro);

    bloquearAplicativo();

    mensagemLogin(
      "Não foi possível entrar. Confira seus dados."
    );

  } finally {
    botao.disabled = false;
  }
}

async function sair() {
  // Oculta imediatamente os dados da interface.
  bloquearAplicativo();

  $("senhaLogin").value = "";

  try {
    const { error } = await db.auth.signOut();

    if (error) throw error;

    mensagemLogin("");

  } catch (erro) {
    console.error("Erro ao sair:", erro);

    mensagemLogin(
      "Não foi possível confirmar o encerramento da sessão."
    );
  }
}

/* =====================================================
   CONSULTAS SUPABASE
   ===================================================== */

async function buscarTodos(tabela, colunas) {
  if (!usuarioAtual || perfilAtual?.role !== "admin") {
    throw new Error("Acesso não autorizado.");
  }

  const registros = [];
  const tamanhoPagina = 500;
  const limiteSeguranca = 10000;

  for (
    let inicio = 0;
    inicio < limiteSeguranca;
    inicio += tamanhoPagina
  ) {
    const { data, error } = await db
      .from(tabela)
      .select(colunas)
      .range(
        inicio,
        inicio + tamanhoPagina - 1
      );

    if (error) throw error;

    registros.push(...(data || []));

    if (!data || data.length < tamanhoPagina) {
      return registros;
    }
  }

  throw new Error(
    `A consulta à tabela ${tabela} atingiu o limite de segurança.`
  );
}

/* =====================================================
   FINANCEIRO
   ===================================================== */

function calcularFinanceiro(lancamentos, pagamentos) {
  const porId = new Map(
    lancamentos.map((l) => [
      String(l.id),
      l
    ])
  );

  const pagoPorLancamento = new Map();
  const despesasPorCategoria = new Map();

  let recebido = 0;
  let pago = 0;
  let aPagar = 0;

  for (const pagamento of pagamentos) {
    const id = String(pagamento.financeiro_id);
    const lancamento = porId.get(id);

    if (!lancamento) continue;

    const valor = Number(pagamento.valor) || 0;

    pagoPorLancamento.set(
      id,
      (pagoPorLancamento.get(id) || 0) + valor
    );

    if (lancamento.tipo === "entrada") {
      recebido += valor;

    } else if (lancamento.tipo === "saida") {
      pago += valor;

      const categoria =
        lancamento.categoria || "Outros";

      despesasPorCategoria.set(
        categoria,
        (despesasPorCategoria.get(categoria) || 0) + valor
      );
    }
  }

  for (const lancamento of lancamentos) {
    if (lancamento.tipo !== "saida") continue;

    const valorOriginal =
      Number(lancamento.valor) || 0;

    const valorPago =
      pagoPorLancamento.get(
        String(lancamento.id)
      ) || 0;

    aPagar += Math.max(
      0,
      valorOriginal - valorPago
    );
  }

  return {
    recebido,
    pago,
    aPagar,
    saldo: recebido - pago,
    despesasPorCategoria
  };
}

function renderizarIndicadores(resumo) {
  $("totalPago").textContent =
    moeda(resumo.pago);

  $("totalAPagar").textContent =
    moeda(resumo.aPagar);

  $("saldoCaixa").textContent =
    moeda(resumo.saldo);

  $("financeiroRecebido").textContent =
    moeda(resumo.recebido);

  $("financeiroPago").textContent =
    moeda(resumo.pago);
}

function renderizarLancamentos(
  lancamentos,
  pagamentos
) {
  const lista = $("listaFinanceiro");
  lista.replaceChildren();

  if (!lancamentos.length) {
    lista.append(
      mensagemVazia(
        "Nenhum lançamento encontrado."
      )
    );
    return;
  }

  const pagamentosPorId = new Map();

  for (const p of pagamentos) {
    const id = String(p.financeiro_id);

    pagamentosPorId.set(
      id,
      (pagamentosPorId.get(id) || 0) +
      (Number(p.valor) || 0)
    );
  }

  const ordenados = [...lancamentos].sort(
    (a, b) => {
      return String(
        b.vencimento || ""
      ).localeCompare(
        String(a.vencimento || "")
      );
    }
  );

  for (const lancamento of ordenados.slice(0, 15)) {
    const item = criarElemento(
      "div",
      "financeiro-item"
    );

    const detalhes = criarElemento("div");

    const titulo = criarElemento(
      "strong",
      "",
      lancamento.descricao ||
      lancamento.categoria ||
      "Lançamento"
    );

    const totalPago =
      pagamentosPorId.get(
        String(lancamento.id)
      ) || 0;

    const pendente = Math.max(
      0,
      (Number(lancamento.valor) || 0) -
      totalPago
    );

    const tipo =
      lancamento.tipo === "entrada"
        ? "Receita"
        : "Despesa";

    const subtitulo = criarElemento(
      "small",
      "",
      `${tipo} • ${formatarData(lancamento.vencimento)} • Pendente: ${moeda(pendente)}`
    );

    const valor = criarElemento(
      "span",
      lancamento.tipo === "entrada"
        ? "valor-positivo"
        : "valor-negativo",
      moeda(lancamento.valor)
    );

    detalhes.append(
      titulo,
      subtitulo
    );

    item.append(
      detalhes,
      valor
    );

    lista.append(item);
  }
}

/* =====================================================
   GRÁFICO DE DESPESAS
   ===================================================== */

function atualizarGrafico(despesasPorCategoria) {
  const canvas = $("graficoDespesas");
  const legenda = $("legendaDespesas");

  if (!canvas || typeof Chart === "undefined") {
    if (legenda) {
      legenda.textContent =
        "Biblioteca de gráficos indisponível.";
    }
    return;
  }

  const categorias = [
    ...despesasPorCategoria.keys()
  ];

  const valores = [
    ...despesasPorCategoria.values()
  ];

  const cores = [
    "#0866e9",
    "#12a96c",
    "#f4a52b",
    "#8c5be8",
    "#e4526b",
    "#14a7c6",
    "#64748b"
  ];

  if (graficoDespesas) {
    graficoDespesas.destroy();
    graficoDespesas = null;
  }

  graficoDespesas = new Chart(canvas, {
    type: "doughnut",

    data: {
      labels: categorias.length
        ? categorias
        : ["Sem despesas"],

      datasets: [{
        data: valores.length
          ? valores
          : [1],

        backgroundColor: categorias.length
          ? categorias.map(
              (_, i) => cores[i % cores.length]
            )
          : ["#e2e8f0"],

        borderWidth: 0,
        hoverOffset: 5
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          enabled: categorias.length > 0,

          callbacks: {
            label: (contexto) =>
              `${contexto.label}: ${moeda(contexto.parsed)}`
          }
        }
      }
    }
  });

  legenda.replaceChildren();

  if (!categorias.length) {
    legenda.append(
      mensagemVazia(
        "Nenhuma despesa paga."
      )
    );
    return;
  }

  categorias.forEach((categoria, indice) => {
    const linha = criarElemento(
      "p",
      "",
      `● ${categoria}: ${moeda(valores[indice])}`
    );

    linha.style.color =
      cores[indice % cores.length];

    legenda.append(linha);
  });
}

/* =====================================================
   AGENDA
   ===================================================== */

function renderizarAgenda(agendamentos) {
  const proximos = $("proximosAgendamentos");
  const listaCompleta = $("listaAgenda");

  proximos.replaceChildren();
  listaCompleta.replaceChildren();

  const agora = new Date();

  const futuros = agendamentos
    .filter((item) => {
      if (item.status === "cancelado") {
        return false;
      }

      const data = new Date(item.inicio);

      return (
        !Number.isNaN(data.getTime()) &&
        data >= agora
      );
    })
    .sort((a, b) =>
      new Date(a.inicio).getTime() -
      new Date(b.inicio).getTime()
    );

  if (!futuros.length) {
    proximos.append(
      mensagemVazia(
        "Nenhum agendamento futuro encontrado."
      )
    );

    listaCompleta.append(
      mensagemVazia(
        "Nenhum agendamento futuro encontrado."
      )
    );

    return;
  }

  function criarCard(agendamento) {
    const item = criarElemento(
      "div",
      "agendamento-item"
    );

    const data = new Date(agendamento.inicio);

    const caixaData = criarElemento(
      "div",
      "agendamento-data"
    );

    caixaData.append(
      criarElemento(
        "strong",
        "",
        String(data.getDate()).padStart(2, "0")
      ),

      criarElemento(
        "small",
        "",
        data.toLocaleDateString(
          "pt-BR",
          { month: "short" }
        )
      )
    );

    const detalhes = criarElemento(
      "div",
      "agendamento-detalhes"
    );

    detalhes.append(
      criarElemento(
        "strong",
        "",
        agendamento.titulo ||
        "Agendamento JESFER"
      ),

      criarElemento(
        "small",
        "",
        `${formatarHorario(agendamento.inicio)} • ${agendamento.tipo || "Serviço"}`
      )
    );

    item.append(
      caixaData,
      detalhes
    );

    return item;
  }

  futuros.slice(0, 3).forEach((item) => {
    proximos.append(
      criarCard(item)
    );
  });

  futuros.slice(0, 50).forEach((item) => {
    listaCompleta.append(
      criarCard(item)
    );
  });
}

/* =====================================================
   ATUALIZAÇÃO DO PAINEL
   ===================================================== */

async function atualizarPainel() {
  if (
    !usuarioAtual ||
    perfilAtual?.role !== "admin" ||
    carregando
  ) {
    return;
  }

  carregando = true;

  try {
    const [
      lancamentos,
      pagamentos
    ] = await Promise.all([
      buscarTodos(
        "financeiro",
        "id,tipo,categoria,descricao,valor,status,vencimento"
      ),

      buscarTodos(
        "pagamentos",
        "financeiro_id,valor,data_pagamento"
      )
    ]);

    if (!usuarioAtual) return;

    const resumo = calcularFinanceiro(
      lancamentos,
      pagamentos
    );

    renderizarIndicadores(resumo);

    renderizarLancamentos(
      lancamentos,
      pagamentos
    );

    atualizarGrafico(
      resumo.despesasPorCategoria
    );

  } catch (erro) {
    console.error(
      "Erro ao carregar financeiro:",
      erro
    );

    mostrarErroLista(
      "listaFinanceiro",
      "Não foi possível carregar os dados financeiros."
    );
  }

  try {
    const agendamentos = await buscarTodos(
      "agendamentos",
      "id,tipo,titulo,inicio,fim,status"
    );

    if (!usuarioAtual) return;

    renderizarAgenda(agendamentos);

  } catch (erro) {
    console.error(
      "Erro ao carregar agenda:",
      erro
    );

    mostrarErroLista(
      "proximosAgendamentos",
      "Não foi possível carregar os agendamentos."
    );

    mostrarErroLista(
      "listaAgenda",
      "Não foi possível carregar os agendamentos."
    );
  } finally {
    $("totalEstoque").textContent = "--";
    carregando = false;
  }
}

/* =====================================================
   INICIALIZAÇÃO SEGURA
   ===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    configurarNavegacao();

    // O painel começa sempre bloqueado.
    bloquearAplicativo();

    if (!window.supabase?.createClient) {
      mensagemLogin(
        "Não foi possível carregar o Supabase. Verifique sua conexão."
      );
      return;
    }

    db = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY,
      {
        auth: {
          // Não salva o login entre aberturas.
          persistSession: false,

          // Atualiza o token enquanto a sessão
          // estiver ativa em memória.
          autoRefreshToken: true,

          detectSessionInUrl: false
        }
      }
    );

    $("formLogin").addEventListener(
      "submit",
      entrar
    );

    $("btnSair").addEventListener(
      "click",
      sair
    );

    // Bloqueia o painel quando o Supabase
    // informar que a sessão foi encerrada.
    db.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") {
        bloquearAplicativo();

        $("senhaLogin").value = "";
      }
    });

    // Não recupera automaticamente sessões antigas.
    // O usuário deve entrar com e-mail e senha.
    mensagemLogin("");
    mostrarAplicativo(false);
  }
);
