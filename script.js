
"use strict";

/* =====================================================
   JESFER CALHAS E RUFOS
   SISTEMA DE GESTÃO - DESKTOP

   Supabase:
   - Financeiro
   - Pagamentos
   - Agenda

   Armazenamento local temporário:
   - Estoque
   - Requisições
   - Serviços / Dobras
   - Histórico de orçamentos
===================================================== */

/* ================== UTILITÁRIOS ================== */

const $ = id => document.getElementById(id);

const numero = valor => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const arredondar = valor =>
  Math.round((numero(valor) + Number.EPSILON) * 100) / 100;

const moeda = valor =>
  numero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const hoje = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
};

const formatarData = valor => {
  if (!valor) return "-";
  const partes = String(valor).slice(0, 10).split("-");
  return partes.length === 3
    ? partes.reverse().join("/")
    : String(valor);
};

const idNovo = () => crypto.randomUUID();

function texto(id, valor) {
  if ($(id)) $(id).textContent = valor;
}

function campo(id) {
  return $(id)?.value ?? "";
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function lerLocal(chave, padrao) {
  try {
    const salvo = localStorage.getItem(chave);
    return salvo === null ? structuredClone(padrao) : JSON.parse(salvo);
  } catch (erro) {
    console.error("Erro ao ler armazenamento:", erro);
    return structuredClone(padrao);
  }
}

function salvarLocal(chave, dados) {
  try {
    localStorage.setItem(chave, JSON.stringify(dados));
    return true;
  } catch (erro) {
    alert("Erro ao salvar no navegador: " + erro.message);
    return false;
  }
}

function botao(rotulo, acao, classe = "") {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = rotulo;
  b.className = classe;
  b.addEventListener("click", acao);
  return b;
}

function baixarArquivo(nome, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvSeguro(valor) {
  const s = String(valor ?? "");
  const protegido = /^[\s]*[=+\-@]/.test(s) ? "'" + s : s;
  return '"' + protegido.replaceAll('"', '""') + '"';
}

function exportarCSV(nome, cabecalho, linhas) {
  const csv = [cabecalho, ...linhas]
    .map(linha => linha.map(csvSeguro).join(";"))
    .join("\r\n");

  baixarArquivo(
    nome,
    "\uFEFF" + csv,
    "text/csv;charset=utf-8"
  );
}

function criarCampo(rotulo, valor, aoMudar, tipo = "text") {
  const grupo = document.createElement("div");
  const label = document.createElement("label");
  const input = document.createElement("input");

  label.textContent = rotulo;
  input.type = tipo;
  input.value = valor ?? "";

  if (tipo === "number") {
    input.min = "0";
    input.step = "0.01";
  }

  input.addEventListener("change", () => {
    aoMudar(input.value);
  });

  grupo.append(label, input);
  return grupo;
}

function criarSelecao(rotulo, valor, opcoes, aoMudar) {
  const grupo = document.createElement("div");
  const label = document.createElement("label");
  const select = document.createElement("select");

  label.textContent = rotulo;

  opcoes.forEach(opcao => {
    select.add(new Option(opcao.texto, String(opcao.valor)));
  });

  select.value = String(valor ?? "");
  select.addEventListener("change", () => aoMudar(select.value));

  grupo.append(label, select);
  return grupo;
}

function tabelaSimples(cabecalhos, linhas, acoes = null) {
  const tabela = document.createElement("table");
  tabela.className = "req-tabela-itens";

  const thead = document.createElement("thead");
  const trCab = document.createElement("tr");

  [...cabecalhos, ...(acoes ? ["Ações"] : [])].forEach(t => {
    const th = document.createElement("th");
    th.textContent = t;
    trCab.appendChild(th);
  });

  thead.appendChild(trCab);
  tabela.appendChild(thead);

  const tbody = document.createElement("tbody");

  linhas.forEach((valores, indice) => {
    const tr = document.createElement("tr");

    valores.forEach(valor => {
      const td = document.createElement("td");
      td.textContent = String(valor ?? "");
      tr.appendChild(td);
    });

    if (acoes) {
      const td = document.createElement("td");
      acoes(td, indice);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });

  tabela.appendChild(tbody);
  return tabela;
}

/* ================== ESTADO ================== */

const CHAVES = {
  estoque: "jesfer_estoque_v2",
  dobras: "jesfer_dobras_v2",
  requisicoes: "jesfer_requisicoes_v2",
  caixa: "jesfer_caixa_v2",
  movimentos: "jesfer_movimentacoes_v3"
};

const ESTOQUE_PADRAO = [
  {
    id: 101,
    item: "Chapa 24 (0.50mm) - Metros",
    qtd: 150,
    unidade: "Metros",
    minimo: 20,
    custo: 0,
    ativo: true
  },
  {
    id: 102,
    item: "Chapa 26 (0.45mm) - Metros",
    qtd: 200,
    unidade: "Metros",
    minimo: 20,
    custo: 0,
    ativo: true
  },
  {
    id: 103,
    item: "Parafusos Ponta Fina",
    qtd: 1000,
    unidade: "Unidades",
    minimo: 100,
    custo: 0,
    ativo: true
  },
  {
    id: 104,
    item: "Parafusos de Aço",
    qtd: 500,
    unidade: "Unidades",
    minimo: 50,
    custo: 0,
    ativo: true
  },
  {
    id: 105,
    item: "Parafusos de Bucha",
    qtd: 300,
    unidade: "Kits",
    minimo: 30,
    custo: 0,
    ativo: true
  },
  {
    id: 106,
    item: "Parafusos de Telha 3/8 x 110mm",
    qtd: 400,
    unidade: "Unidades",
    minimo: 40,
    custo: 0,
    ativo: true
  },
  {
    id: 107,
    item: "Parafusos de Telha 1/4 x 80mm",
    qtd: 250,
    unidade: "Unidades",
    minimo: 25,
    custo: 0,
    ativo: true
  },
  {
    id: 108,
    item: "Tubos de PU Calha",
    qtd: 45,
    unidade: "Tubos",
    minimo: 10,
    custo: 0,
    ativo: true
  }
];

const DOBRAS_PADRAO = [
  { id: 1, nome: "Calha U Simples", preco: 25, estoqueId: 101 },
  { id: 2, nome: "Rufos Pingadeira", preco: 35, estoqueId: 102 },
  { id: 3, nome: "Moldura Especial", preco: 50, estoqueId: 101 }
];

let estoque = lerLocal(CHAVES.estoque, ESTOQUE_PADRAO);
let dobras = lerLocal(CHAVES.dobras, DOBRAS_PADRAO);
let requisicoes = lerLocal(CHAVES.requisicoes, []);
let caixaLancamentos = lerLocal(CHAVES.caixa, []);
let jesferMovimentos = lerLocal(CHAVES.movimentos, []);

let itensObra = [];
let itensFormRequisicao = [];
let ultimoOrcamentoCalculado = null;

let financeiros = [];
let pagamentos = [];
let agendamentos = [];

let financeiroCarregado = false;
let agendaCarregada = false;

function clienteSupabase() {
  return window.supabaseClient;
}

/* ================== NAVEGAÇÃO ================== */

function mudarAba(idAba, botaoClicado = null) {
  const abas = {
    abaOrcamentos: "navOrcamentos",
    abaRequisicoes: "navRequisicoes",
    abaEstoque: "navEstoque",
    abaFazerOrcamento: "navFazerOrcamento",
    abaAgenda: "navAgenda"
  };

  if (!Object.hasOwn(abas, idAba)) return;

  Object.keys(abas).forEach(id => {
    const secao = $(id);
    if (!secao) return;

    const ativa = id === idAba;
    secao.hidden = !ativa;
    secao.classList.toggle("active", ativa);
  });

  document.querySelectorAll(".main-nav .nav-btn")
    .forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });

  const b = botaoClicado || $(abas[idAba]);
  if (b) {
    b.classList.add("active");
    b.setAttribute("aria-selected", "true");
  }

  if (idAba === "abaOrcamentos") {
    renderizarCaixaAcumulado();
    carregarFinanceiro();
  }

  if (idAba === "abaRequisicoes") {
    renderizarListaRequisicoes();
  }

  if (idAba === "abaEstoque") {
    renderizarEstoque();
  }

  if (idAba === "abaFazerOrcamento") {
    renderizarCamposDobras();
    renderizarItensObra();
  }

  if (idAba === "abaAgenda") {
    carregarAgenda();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ================== FINANCEIRO ================== */

function mensagemFinanceiro(msg, erro = false) {
  texto("finMensagem", msg);
  if ($("finMensagem")) {
    $("finMensagem").style.color =
      erro ? "#b91c1c" : "#166534";
  }
}

function totalPagoFinanceiro(id) {
  return arredondar(
    pagamentos
      .filter(p => p.financeiro_id === id)
      .reduce((s, p) => s + numero(p.valor), 0)
  );
}

function restanteFinanceiro(l) {
  return Math.max(
    0,
    arredondar(numero(l.valor) - totalPagoFinanceiro(l.id))
  );
}

function situacaoFinanceiro(l) {
  if (l.status === "cancelado") return "Cancelado";

  const pago = totalPagoFinanceiro(l.id);

  if (pago >= numero(l.valor)) return "Quitado";
  if (pago > 0) return "Parcial";

  if (l.vencimento && l.vencimento < hoje()) {
    return "Atrasado";
  }

  return "Pendente";
}

async function carregarFinanceiro() {
  const db = clienteSupabase();

  if (!db) {
    mensagemFinanceiro("Supabase não conectado.", true);
    return;
  }

  mensagemFinanceiro("Carregando financeiro...");

  try {
    const [f, p] = await Promise.all([
      db.from("financeiro")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),

      db.from("pagamentos")
        .select("*")
        .order("data_pagamento", { ascending: false })
        .limit(2000)
    ]);

    if (f.error) throw f.error;
    if (p.error) throw p.error;

    financeiros = f.data || [];
    pagamentos = p.data || [];
    financeiroCarregado = true;

    renderizarFinanceiro();
    mensagemFinanceiro("Financeiro atualizado.");
  } catch (erro) {
    financeiroCarregado = false;
    mensagemFinanceiro(
      "Erro ao carregar financeiro: " + erro.message,
      true
    );
  }
}

function renderizarFinanceiro() {
  if (!financeiroCarregado) return;

  const ativos = financeiros.filter(
    l => l.status !== "cancelado"
  );

  const recebidos = ativos
    .filter(l => l.tipo === "receber")
    .reduce((s, l) => s + totalPagoFinanceiro(l.id), 0);

  const pagos = ativos
    .filter(l => l.tipo === "pagar")
    .reduce((s, l) => s + totalPagoFinanceiro(l.id), 0);

  const receber = ativos
    .filter(l => l.tipo === "receber")
    .reduce((s, l) => s + restanteFinanceiro(l), 0);

  const pagar = ativos
    .filter(l => l.tipo === "pagar")
    .reduce((s, l) => s + restanteFinanceiro(l), 0);

  texto("finRecebido", moeda(recebidos));
  texto("finPago", moeda(pagos));
  texto("finSaldo", moeda(recebidos - pagos));
  texto("finAReceber", moeda(receber));
  texto("finAPagar", moeda(pagar));

  const tipo = campo("finFiltro") || "todos";
  const busca = campo("finBusca").trim().toLowerCase();

  const lista = financeiros.filter(l => {
    const correspondeTipo =
      tipo === "todos" || l.tipo === tipo;

    const pesquisa = [
      l.descricao,
      l.categoria
    ].join(" ").toLowerCase();

    return correspondeTipo && pesquisa.includes(busca);
  });

  const corpo = $("finTabela");
  if (!corpo) return;

  corpo.replaceChildren();

  lista.forEach(l => {
    const tr = document.createElement("tr");

    [
      l.descricao,
      l.categoria || "Outros",
      l.tipo === "receber" ? "Receber" : "Pagar",
      moeda(l.valor),
      moeda(totalPagoFinanceiro(l.id)),
      moeda(restanteFinanceiro(l)),
      formatarData(l.vencimento),
      situacaoFinanceiro(l)
    ].forEach(valor => {
      const td = document.createElement("td");
      td.textContent = valor;
      tr.appendChild(td);
    });

    const tdAcao = document.createElement("td");

    if (
      restanteFinanceiro(l) > 0 &&
      l.status !== "cancelado"
    ) {
      tdAcao.appendChild(
        botao(
          l.tipo === "receber" ? "Receber" : "Pagar",
          () => registrarPagamentoFinanceiro(l.id)
        )
      );
    }

    tr.appendChild(tdAcao);
    corpo.appendChild(tr);
  });

  if (!lista.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 9;
    td.textContent = "Nenhum lançamento encontrado.";
    tr.appendChild(td);
    corpo.appendChild(tr);
  }
}

async function salvarLancamentoFinanceiro(evento) {
  evento.preventDefault();

  const db = clienteSupabase();
  if (!db) return;

  const tipo = campo("finTipo");
  const categoria = campo("finCategoria");
  const descricao = campo("finDescricao").trim();
  const valor = arredondar(campo("finValor"));
  const vencimento = campo("finVencimento") || null;

  if (
    !descricao ||
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    mensagemFinanceiro("Informe descrição e valor válido.", true);
    return;
  }

  const salvar = $("finSalvar");
  salvar.disabled = true;

  try {
    const { error } = await db.from("financeiro").insert({
      tipo,
      categoria,
      descricao,
      valor,
      vencimento,
      status: "pendente"
    });

    if (error) throw error;

    $("finForm").reset();
    await carregarFinanceiro();
    mensagemFinanceiro("Lançamento salvo com sucesso.");
  } catch (erro) {
    mensagemFinanceiro("Erro ao salvar: " + erro.message, true);
  } finally {
    salvar.disabled = false;
  }
}

function converterValorDigitado(entrada) {
  const s = String(entrada).trim();

  if (!s) return NaN;

  const normalizado = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".")
    : s;

  return Number(normalizado);
}

async function registrarPagamentoFinanceiro(id) {
  const db = clienteSupabase();
  const l = financeiros.find(item => item.id === id);
  if (!db || !l) return;

  const restante = restanteFinanceiro(l);

  const entrada = prompt(
    `Valor a ${l.tipo === "receber" ? "receber" : "pagar"}:\n` +
    `Restante: ${moeda(restante)}`,
    restante.toFixed(2).replace(".", ",")
  );

  if (entrada === null) return;

  const valor = arredondar(converterValorDigitado(entrada));

  if (
    !entrada.trim() ||
    !Number.isFinite(valor) ||
    valor <= 0 ||
    valor > restante
  ) {
    alert("Valor inválido.");
    return;
  }

  const forma = prompt(
    "Forma de pagamento (Pix, dinheiro, cartão etc.):",
    "Pix"
  );

  if (forma === null) return;

  if (!confirm(`Confirmar ${moeda(valor)}?`)) return;

  try {
    const { error } = await db.from("pagamentos").insert({
      financeiro_id: id,
      valor,
      data_pagamento: hoje(),
      forma_pagamento: forma.trim() || null
    });

    if (error) throw error;

    await carregarFinanceiro();
    mensagemFinanceiro("Pagamento registrado com sucesso.");
  } catch (erro) {
    mensagemFinanceiro(
      "Não foi possível registrar: " + erro.message,
      true
    );
  }
}

function exportarFinanceiroCSV() {
  if (!financeiroCarregado) {
    alert("Carregue os dados financeiros primeiro.");
    return;
  }

  const linhas = financeiros.map(l => [
    l.descricao,
    l.categoria,
    l.tipo,
    l.valor,
    totalPagoFinanceiro(l.id),
    restanteFinanceiro(l),
    l.vencimento,
    situacaoFinanceiro(l)
  ]);

  exportarCSV(
    `jesfer-financeiro-${hoje()}.csv`,
    [
      "Descrição",
      "Categoria",
      "Tipo",
      "Valor",
      "Pago",
      "Restante",
      "Vencimento",
      "Situação"
    ],
    linhas
  );
}

/* ================== SERVIÇOS / DOBRAS ================== */

function salvarTabela(mostrarAlerta = false) {
  const ok = salvarLocal(CHAVES.dobras, dobras);

  if (ok) texto("statusTabela", "Tabela salva.");
  if (ok && mostrarAlerta) alert("Tabela salva!");

  return ok;
}

function renderizarCamposDobras() {
  const destino = $("dobrasContainer");
  if (!destino) return;

  destino.replaceChildren();

  const tabela = document.createElement("table");
  tabela.className = "req-tabela-itens";

  const thead = document.createElement("thead");
  const cab = document.createElement("tr");

  [
    "Serviço",
    "Preço por metro",
    "Material vinculado",
    "Ação"
  ].forEach(t => {
    const th = document.createElement("th");
    th.textContent = t;
    cab.appendChild(th);
  });

  thead.appendChild(cab);
  tabela.appendChild(thead);

  const tbody = document.createElement("tbody");

  dobras.forEach((d, indice) => {
    const tr = document.createElement("tr");

    const tdNome = document.createElement("td");
    const nome = document.createElement("input");
    nome.value = d.nome;

    nome.addEventListener("change", () => {
      d.nome = nome.value.trim();
      salvarTabela();
      renderizarItensObra();
    });

    tdNome.appendChild(nome);

    const tdPreco = document.createElement("td");
    const preco = document.createElement("input");
    preco.type = "number";
    preco.min = "0";
    preco.step = "0.01";
    preco.value = d.preco;

    preco.addEventListener("change", () => {
      d.preco = Math.max(0, numero(preco.value));
      salvarTabela();
      renderizarItensObra();
    });

    tdPreco.appendChild(preco);

    const tdMaterial = document.createElement("td");
    const select = document.createElement("select");

    select.add(new Option("Sem vínculo", ""));

    estoque.forEach(p => {
      select.add(new Option(p.item, String(p.id)));
    });

    select.value = String(d.estoqueId ?? "");

    select.addEventListener("change", () => {
      d.estoqueId = select.value || null;
      salvarTabela();
    });

    tdMaterial.appendChild(select);

    const tdAcao = document.createElement("td");
    tdAcao.appendChild(
      botao("Remover", () => removerCampoDobra(indice))
    );

    tr.append(tdNome, tdPreco, tdMaterial, tdAcao);
    tbody.appendChild(tr);
  });

  tabela.appendChild(tbody);

  const rolagem = document.createElement("div");
  rolagem.className = "table-responsive";
  rolagem.appendChild(tabela);

  destino.appendChild(rolagem);
}

function adicionarCampoDobra() {
  dobras.push({
    id: idNovo(),
    nome: "Novo serviço",
    preco: 0,
    estoqueId: null
  });

  salvarTabela();
  renderizarCamposDobras();
}

function removerCampoDobra(indice) {
  if (dobras.length <= 1) {
    alert("Mantenha pelo menos um serviço.");
    return;
  }

  if (!confirm("Remover este serviço?")) return;

  const removido = dobras[indice];
  dobras.splice(indice, 1);

  itensObra.forEach(item => {
    if (String(item.dobraId) === String(removido.id)) {
      item.dobraId = dobras[0].id;
    }
  });

  salvarTabela();
  renderizarCamposDobras();
  renderizarItensObra();
}

/* ================== ORÇAMENTOS ================== */

function adicionarItemObra() {
  itensObra.push({
    dobraId: dobras[0]?.id ?? null,
    metragem: 0
  });

  ultimoOrcamentoCalculado = null;
  if ($("btnRegistrarCaixa")) $("btnRegistrarCaixa").disabled = true;
  renderizarItensObra();
}

function removerItemObra(indice) {
  itensObra.splice(indice, 1);
  ultimoOrcamentoCalculado = null;
  if ($("btnRegistrarCaixa")) $("btnRegistrarCaixa").disabled = true;
  renderizarItensObra();
}

function renderizarItensObra() {
  const destino = $("itensObraContainer");
  if (!destino) return;

  destino.replaceChildren();

  itensObra.forEach((item, indice) => {
    const linha = document.createElement("div");
    linha.className = "dobra-item";

    linha.appendChild(
      criarSelecao(
        "Modelo / Serviço",
        item.dobraId,
        dobras.map(d => ({
          valor: d.id,
          texto: `${d.nome} - ${moeda(d.preco)}/m`
        })),
        valor => {
          item.dobraId = valor;
          ultimoOrcamentoCalculado = null;
          $("btnRegistrarCaixa").disabled = true;
        }
      )
    );

    linha.appendChild(
      criarCampo(
        "Metragem (m)",
        item.metragem || "",
        valor => {
          item.metragem = Math.max(0, numero(valor));
          ultimoOrcamentoCalculado = null;
          $("btnRegistrarCaixa").disabled = true;
        },
        "number"
      )
    );

    linha.appendChild(
      botao("Remover", () => removerItemObra(indice))
    );

    destino.appendChild(linha);
  });
}

function gerarOrcamento() {
  if (!itensObra.length) {
    alert("Adicione um serviço.");
    return;
  }

  const cliente = campo("nomeCliente").trim();

  if (!cliente) {
    alert("Informe o nome do cliente.");
    return;
  }

  let venda = 0;
  const itens = [];
  const materiais = [];

  for (const item of itensObra) {
    const dobra = dobras.find(
      d => String(d.id) === String(item.dobraId)
    );

    if (!dobra || numero(item.metragem) <= 0) {
      alert("Confira os serviços e metragens.");
      return;
    }

    const subtotal = arredondar(
      numero(dobra.preco) * numero(item.metragem)
    );

    venda += subtotal;

    itens.push({
      nome: dobra.nome,
      metragem: numero(item.metragem),
      preco: numero(dobra.preco),
      subtotal
    });

    if (dobra.estoqueId) {
      materiais.push({
        estoqueId: dobra.estoqueId,
        qtd: numero(item.metragem)
      });
    }
  }

  const custo = arredondar(campo("custoTotal"));
  venda = arredondar(venda);

  const lucro = arredondar(venda - custo);
  const base = Math.max(0, lucro);

  ultimoOrcamentoCalculado = {
    cliente,
    venda,
    custo,
    lucro,
    itens,
    materiaisPrevistos: materiais,
    data: hoje()
  };

  texto("resVenda", moeda(venda));
  texto("resCusto", moeda(custo));
  texto("resLucro", moeda(lucro));

  texto("divDizimo", moeda(base * 0.10));
  texto("divEmpresa", moeda(base * 0.50));
  texto("divVoce", moeda(base * 0.25));
  texto("divInvest", moeda(base * 0.15));

  texto(
    "alertaPrejuizo",
    lucro < 0 ? "Atenção: orçamento com prejuízo." : ""
  );

  $("btnRegistrarCaixa").disabled = false;

  alert("Orçamento calculado com sucesso!");
}

function registrarNoCaixa() {
  if (!ultimoOrcamentoCalculado) {
    alert("Calcule um orçamento primeiro.");
    return;
  }

  const o = structuredClone(ultimoOrcamentoCalculado);

  if (!confirm(
    `Salvar orçamento de ${o.cliente} por ${moeda(o.venda)}?`
  )) return;

  caixaLancamentos.unshift({
    ...o,
    id: idNovo(),
    status: "pendente"
  });

  if (!salvarLocal(CHAVES.caixa, caixaLancamentos)) {
    caixaLancamentos.shift();
    return;
  }

  ultimoOrcamentoCalculado = null;
  $("btnRegistrarCaixa").disabled = true;

  renderizarCaixaAcumulado();
  mudarAba("abaOrcamentos");

  alert(
    "Orçamento salvo no histórico local.\n" +
    "Ele NÃO foi contabilizado como dinheiro recebido."
  );
}

function renderizarCaixaAcumulado() {
  const destino = $("historicoCaixaContainer");
  if (!destino) return;

  destino.replaceChildren();

  if (!caixaLancamentos.length) {
    destino.textContent = "Nenhum orçamento salvo.";
    return;
  }

  const tabela = tabelaSimples(
    ["Data", "Cliente", "Venda", "Custo", "Lucro", "Situação"],
    caixaLancamentos.map(o => [
      formatarData(o.data),
      o.cliente,
      moeda(o.venda),
      moeda(o.custo),
      moeda(o.lucro),
      o.status || "Histórico local"
    ]),
    (td, indice) => {
      td.appendChild(
        botao("Excluir", () => {
          const o = caixaLancamentos[indice];

          if (!confirm(`Excluir orçamento de ${o.cliente}?`)) {
            return;
          }

          caixaLancamentos.splice(indice, 1);
          salvarLocal(CHAVES.caixa, caixaLancamentos);
          renderizarCaixaAcumulado();
        })
      );
    }
  );

  const rolagem = document.createElement("div");
  rolagem.className = "table-responsive";
  rolagem.appendChild(tabela);
  destino.appendChild(rolagem);
}

function limparCaixaCompleto() {
  if (!confirm("Apagar todo o histórico local de orçamentos?")) {
    return;
  }

  caixaLancamentos = [];
  salvarLocal(CHAVES.caixa, caixaLancamentos);
  renderizarCaixaAcumulado();
}

function enviarOrcamentoParaRequisicao() {
  if (!ultimoOrcamentoCalculado) {
    alert("Calcule o orçamento antes.");
    return;
  }

  $("reqObra").value = ultimoOrcamentoCalculado.cliente;
  $("reqData").value = hoje();

  itensFormRequisicao = [];
  adicionarItemFormRequisicao();

  mudarAba("abaRequisicoes");
}

function imprimirDocumento(conteudo) {
  const janela = window.open("", "_blank");

  if (!janela) {
    alert("Permita janelas pop-up para imprimir.");
    return;
  }

  janela.document.open();
  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>JESFER - Impressão</title>
      <style>
        body { font-family: Arial; padding: 30px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border: 1px solid #ccc; }
      </style>
    </head>
    <body>${conteudo}</body>
    </html>
  `);
  janela.document.close();
  janela.focus();
  janela.print();
}

function imprimirOrcamento() {
  const o = ultimoOrcamentoCalculado;

  if (!o) {
    alert("Calcule o orçamento primeiro.");
    return;
  }

  const linhas = o.itens.map(item => `
    <tr>
      <td>${escaparHTML(item.nome)}</td>
      <td>${item.metragem} m</td>
      <td>${moeda(item.preco)}</td>
      <td>${moeda(item.subtotal)}</td>
    </tr>
  `).join("");

  imprimirDocumento(`
    <h1>JESFER CALHAS E RUFOS</h1>
    <h2>Orçamento</h2>
    <p><strong>Cliente:</strong> ${escaparHTML(o.cliente)}</p>
    <p><strong>Data:</strong> ${formatarData(o.data)}</p>
    <table>
      <thead>
        <tr>
          <th>Serviço</th>
          <th>Metragem</th>
          <th>Preço / metro</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
    <h2>Total: ${moeda(o.venda)}</h2>
    <p>Orçamento sujeito à aprovação.</p>
  `);
}

/* ================== ESTOQUE ================== */

function salvarEstoque(mostrarAlerta = false) {
  const ok = salvarLocal(CHAVES.estoque, estoque);

  if (ok) texto("statusEstoque", "Estoque salvo.");
  if (ok && mostrarAlerta) alert("Estoque salvo!");

  return ok;
}

function salvarMovimentos() {
  return salvarLocal(CHAVES.movimentos, jesferMovimentos);
}

function encontrarMaterial(id) {
  return estoque.find(p => String(p.id) === String(id));
}

function movimentarMaterial(
  produtoId,
  tipo,
  quantidade,
  motivo,
  referencia = "",
  persistir = true
) {
  const p = encontrarMaterial(produtoId);
  if (!p) throw new Error("Material não encontrado.");

  const qtd = Number(quantidade);
  const anterior = numero(p.qtd);

  if (
    !Number.isFinite(qtd) ||
    qtd < 0 ||
    (tipo !== "ajuste" && qtd === 0)
  ) {
    throw new Error("Quantidade inválida.");
  }

  let posterior;

  if (tipo === "entrada") {
    posterior = anterior + qtd;
  } else if (tipo === "saida") {
    posterior = anterior - qtd;
  } else if (tipo === "ajuste") {
    posterior = qtd;
  } else {
    throw new Error("Tipo inválido.");
  }

  posterior = arredondar(posterior);

  if (posterior < 0) {
    throw new Error("Estoque insuficiente de " + p.item);
  }

  if (posterior === anterior) {
    throw new Error("A movimentação não altera o saldo.");
  }

  p.qtd = posterior;

  if (p.futuro && posterior > 0) p.futuro = false;

  jesferMovimentos.unshift({
    id: idNovo(),
    data: new Date().toISOString(),
    produtoId: p.id,
    produto: p.item,
    unidade: p.unidade,
    tipo,
    quantidade: tipo === "ajuste" ? posterior - anterior : qtd,
    anterior,
    posterior,
    motivo,
    referencia
  });

  if (persistir) {
    salvarEstoque();
    salvarMovimentos();
    renderizarEstoque();
    renderizarItensFormRequisicao();
  }
}

function renderizarEstoque() {
  const destino = $("estoqueContainer");
  if (!destino) return;

  destino.replaceChildren();

  estoque.forEach((p, indice) => {
    const card = document.createElement("div");

    card.className = "estoque-item" +
      (numero(p.qtd) <= numero(p.minimo) ? " estoque-baixo" : "");

    card.appendChild(
      criarCampo("Material", p.item, valor => {
        p.item = valor.trim();
        salvarEstoque();
        renderizarCamposDobras();
        renderizarItensFormRequisicao();
      })
    );

    card.appendChild(
      criarSelecao(
        "Unidade",
        p.unidade,
        ["Metros", "Unidades", "Kits", "Tubos", "Sacos", "Caixas"]
          .map(v => ({ valor: v, texto: v })),
        valor => {
          p.unidade = valor;
          salvarEstoque();
        }
      )
    );

    const saldo = criarCampo(
      "Saldo atual",
      p.qtd,
      () => {},
      "number"
    );

    saldo.querySelector("input").readOnly = true;
    card.appendChild(saldo);

    card.appendChild(
      criarCampo("Custo unitário", p.custo, valor => {
        p.custo = Math.max(0, numero(valor));
        salvarEstoque();
        jesferAtualizarPainel();
      }, "number")
    );

    card.appendChild(
      criarCampo("Estoque mínimo", p.minimo, valor => {
        p.minimo = Math.max(0, numero(valor));
        salvarEstoque();
        renderizarEstoque();
      }, "number")
    );

    card.appendChild(
      criarSelecao(
        "Situação",
        p.ativo === false
          ? "inativo"
          : p.futuro
            ? "futuro"
            : "ativo",
        [
          { valor: "ativo", texto: "Ativo" },
          { valor: "futuro", texto: "Aguardando compra" },
          { valor: "inativo", texto: "Inativo" }
        ],
        valor => {
          p.ativo = valor !== "inativo";
          p.futuro = valor === "futuro";
          salvarEstoque();
          renderizarEstoque();
          renderizarCamposDobras();
          renderizarItensFormRequisicao();
        }
      )
    );

    card.appendChild(
      botao("Desativar", () => removerItemEstoque(indice))
    );

    destino.appendChild(card);
  });

  jesferAtualizarPainel();
}

function adicionarItemEstoque() {
  const nome = prompt("Nome do material:");

  if (!nome?.trim()) return;

  estoque.push({
    id: idNovo(),
    item: nome.trim(),
    qtd: 0,
    unidade: "Unidades",
    minimo: 5,
    custo: 0,
    ativo: true,
    futuro: true
  });

  salvarEstoque();
  renderizarEstoque();
  renderizarCamposDobras();
  renderizarItensFormRequisicao();
}

function removerItemEstoque(indice) {
  const p = estoque[indice];
  if (!p) return;

  if (!confirm(`Desativar ${p.item}?`)) return;

  p.ativo = false;
  salvarEstoque();
  renderizarEstoque();
  renderizarCamposDobras();
  renderizarItensFormRequisicao();
}

function registrarMovimentacaoEstoque() {
  const produtoId = campo("movProduto");
  const tipo = campo("movTipo");
  const qtdTexto = campo("movQuantidade");
  const motivo = campo("movMotivo").trim();

  if (
    !produtoId ||
    qtdTexto.trim() === "" ||
    !motivo
  ) {
    alert("Preencha material, quantidade e motivo.");
    return;
  }

  try {
    movimentarMaterial(
      produtoId,
      tipo,
      Number(qtdTexto),
      motivo
    );

    $("movQuantidade").value = "";
    $("movMotivo").value = "";

    alert("Movimentação registrada!");
  } catch (erro) {
    alert(erro.message);
  }
}

function jesferAtualizarPainel() {
  const ativos = estoque.filter(p => p.ativo !== false);

  const baixos = ativos.filter(
    p => numero(p.qtd) > 0 &&
         numero(p.qtd) <= numero(p.minimo)
  );

  const zerados = ativos.filter(p => numero(p.qtd) === 0);

  const valor = ativos.reduce(
    (s, p) => s + numero(p.qtd) * numero(p.custo),
    0
  );

  const destino = $("resumoEstoque");

  if (destino) {
    destino.replaceChildren();

    [
      ["Materiais ativos", ativos.length],
      ["Estoque baixo", baixos.length],
      ["Sem estoque", zerados.length],
      ["Valor estimado", moeda(valor)]
    ].forEach(([rotulo, valor]) => {
      const article = document.createElement("article");
      article.append(document.createTextNode(rotulo));

      const strong = document.createElement("strong");
      strong.textContent = valor;
      article.appendChild(strong);

      destino.appendChild(article);
    });
  }

  texto(
    "alertasEstoque",
    baixos.length || zerados.length
      ? "Materiais que precisam de atenção: " +
        [...baixos, ...zerados].map(p => p.item).join(", ")
      : "Nenhum alerta de estoque."
  );

  atualizarSeletorMovimentacao();
  renderizarHistoricoEstoque();
}

function atualizarSeletorMovimentacao() {
  const select = $("movProduto");
  if (!select) return;

  const anterior = select.value;
  select.replaceChildren();
  select.add(new Option("Selecione um material", ""));

  estoque
    .filter(p => p.ativo !== false)
    .forEach(p => {
      select.add(
        new Option(
          `${p.item} - ${p.qtd} ${p.unidade}`,
          String(p.id)
        )
      );
    });

  if ([...select.options].some(o => o.value === anterior)) {
    select.value = anterior;
  }
}

function renderizarHistoricoEstoque() {
  const destino = $("historicoEstoque");
  if (!destino) return;

  destino.replaceChildren();

  const linhas = jesferMovimentos.slice(0, 100).map(m => [
    new Date(m.data).toLocaleString("pt-BR"),
    m.produto,
    m.tipo,
    m.quantidade,
    m.anterior,
    m.posterior,
    m.motivo
  ]);

  destino.appendChild(
    tabelaSimples(
      [
        "Data",
        "Material",
        "Operação",
        "Quantidade",
        "Anterior",
        "Final",
        "Motivo"
      ],
      linhas
    )
  );
}

function gerarRelatorioSemanal() {
  const inicio = campo("relInicio");
  const fim = campo("relFim");

  if (!inicio || !fim || inicio > fim) {
    alert("Informe um período válido.");
    return;
  }

  const movimentos = jesferMovimentos.filter(m => {
    const data = m.data.slice(0, 10);
    return data >= inicio && data <= fim;
  });

  const resumo = new Map();

  movimentos.forEach(m => {
    const chave = String(m.produtoId);

    if (!resumo.has(chave)) {
      resumo.set(chave, {
        nome: m.produto,
        unidade: m.unidade,
        entradas: 0,
        saidas: 0
      });
    }

    const r = resumo.get(chave);
    const diferenca = numero(m.posterior) - numero(m.anterior);

    if (diferenca > 0) r.entradas += diferenca;
    if (diferenca < 0) r.saidas += Math.abs(diferenca);
  });

  const destino = $("relatorioEstoque");
  destino.replaceChildren();

  const titulo = document.createElement("h3");
  titulo.textContent =
    `Relatório de ${formatarData(inicio)} a ${formatarData(fim)}`;

  const descricao = document.createElement("p");
  descricao.textContent =
    `${movimentos.length} movimentações encontradas.`;

  const linhas = [...resumo.values()].map(r => [
    r.nome,
    arredondar(r.entradas),
    arredondar(r.saidas),
    r.unidade
  ]);

  destino.append(
    titulo,
    descricao,
    tabelaSimples(
      ["Material", "Entradas", "Saídas", "Unidade"],
      linhas
    )
  );
}

function exportarHistoricoCSV() {
  exportarCSV(
    `jesfer-estoque-${hoje()}.csv`,
    [
      "Data", "Material", "Tipo", "Quantidade",
      "Unidade", "Anterior", "Final", "Motivo"
    ],
    jesferMovimentos.map(m => [
      m.data, m.produto, m.tipo, m.quantidade,
      m.unidade, m.anterior, m.posterior, m.motivo
    ])
  );
}

function imprimirRelatorioEstoque() {
  const destino = $("relatorioEstoque");

  if (!destino?.innerHTML.trim()) {
    gerarRelatorioSemanal();
  }

  if (destino?.innerHTML.trim()) {
    imprimirDocumento(`
      <h1>JESFER CALHAS E RUFOS</h1>
      <h2>Relatório de Estoque</h2>
      ${destino.innerHTML}
    `);
  }
}

function exportarBackupJesfer() {
  const dados = {
    versao: "jesfer-local-v5",
    data: new Date().toISOString(),
    estoque,
    dobras,
    requisicoes,
    caixaLancamentos,
    movimentacoes: jesferMovimentos
  };

  baixarArquivo(
    `jesfer-backup-${hoje()}.json`,
    JSON.stringify(dados, null, 2),
    "application/json"
  );
}

/* ================== REQUISIÇÕES ================== */

function obterInsumosSemChapa() {
  return estoque.filter(
    p => p.ativo !== false &&
         !p.item.toLowerCase().includes("chapa")
  );
}

function adicionarItemFormRequisicao() {
  const insumos = obterInsumosSemChapa();

  itensFormRequisicao.push({
    estoqueId: insumos[0]?.id ?? null,
    qtd: 1
  });

  renderizarItensFormRequisicao();
}

function removerItemFormRequisicao(indice) {
  itensFormRequisicao.splice(indice, 1);
  renderizarItensFormRequisicao();
}

function renderizarItensFormRequisicao() {
  const destino = $("reqItensContainer");
  if (!destino) return;

  destino.replaceChildren();

  const insumos = obterInsumosSemChapa();

  itensFormRequisicao.forEach((item, indice) => {
    const linha = document.createElement("div");
    linha.className = "dobra-item";

    linha.appendChild(
      criarSelecao(
        "Material",
        item.estoqueId,
        insumos.map(p => ({
          valor: p.id,
          texto: `${p.item} - Saldo: ${p.qtd}`
        })),
        valor => { item.estoqueId = valor; }
      )
    );

    linha.appendChild(
      criarCampo(
        "Quantidade",
        item.qtd,
        valor => { item.qtd = Math.max(0, numero(valor)); },
        "number"
      )
    );

    linha.appendChild(
      botao(
        "Remover",
        () => removerItemFormRequisicao(indice)
      )
    );

    destino.appendChild(linha);
  });
}

function salvarRequisicoesStorage() {
  return salvarLocal(CHAVES.requisicoes, requisicoes);
}

function proximoNumeroRequisicao() {
  return requisicoes.reduce(
    (maior, r) => Math.max(maior, numero(r.numero)),
    0
  ) + 1;
}

function salvarNovaRequisicao() {
  const obra = campo("reqObra").trim();
  const responsavel = campo("reqResponsavel").trim();
  const data = campo("reqData") || hoje();
  const obs = campo("reqObs").trim();

  if (!obra) {
    alert("Informe a obra ou cliente.");
    return;
  }

  if (!itensFormRequisicao.length) {
    alert("Adicione materiais.");
    return;
  }

  const agrupados = new Map();

  for (const item of itensFormRequisicao) {
    const p = encontrarMaterial(item.estoqueId);
    const qtd = numero(item.qtd);

    if (!p || qtd <= 0) {
      alert("Confira materiais e quantidades.");
      return;
    }

    const chave = String(p.id);

    agrupados.set(
      chave,
      arredondar((agrupados.get(chave) || 0) + qtd)
    );
  }

  const materiais = [];

  for (const [id, qtd] of agrupados) {
    const p = encontrarMaterial(id);

    if (numero(p.qtd) < qtd) {
      alert(`Estoque insuficiente: ${p.item}`);
      return;
    }

    materiais.push({
      estoqueId: p.id,
      nomeItem: p.item,
      qtd,
      unidade: p.unidade
    });
  }

  const numeroReq = proximoNumeroRequisicao();

  if (!confirm(
    `Confirmar requisição nº ${numeroReq}?\n` +
    "Os materiais serão descontados do estoque."
  )) return;

  const requisicao = {
    id: idNovo(),
    numero: numeroReq,
    obra,
    responsavel: responsavel || "Não informado",
    data,
    obs,
    status: "baixada",
    materiais
  };

  // Validação feita antes da baixa de todos os itens.
  materiais.forEach(m => {
    movimentarMaterial(
      m.estoqueId,
      "saida",
      m.qtd,
      `Requisição ${numeroReq} - ${obra}`,
      `requisicao:${requisicao.id}`,
      false
    );
  });

  requisicoes.unshift(requisicao);

  salvarRequisicoesStorage();
  salvarEstoque();
  salvarMovimentos();

  $("reqObra").value = "";
  $("reqResponsavel").value = "";
  $("reqObs").value = "";

  itensFormRequisicao = [];
  adicionarItemFormRequisicao();

  renderizarListaRequisicoes();
  renderizarEstoque();

  alert(`Requisição nº ${numeroReq} salva.`);
}

function renderizarListaRequisicoes() {
  const destino = $("listaRequisicoesSalvas");
  if (!destino) return;

  destino.replaceChildren();

  if (!requisicoes.length) {
    destino.textContent = "Nenhuma requisição registrada.";
    return;
  }

  requisicoes.forEach(r => {
    const card = document.createElement("article");
    card.className = "req-card";

    const titulo = document.createElement("h3");
    titulo.textContent = `Requisição #${r.numero} - ${r.obra}`;

    const detalhes = document.createElement("p");
    detalhes.textContent =
      `Data: ${formatarData(r.data)} | ` +
      `Responsável: ${r.responsavel} | Status: ${r.status}`;

    const tabela = tabelaSimples(
      ["Material", "Quantidade"],
      (r.materiais || []).map(m => [
        m.nomeItem,
        `${m.qtd} ${m.unidade}`
      ])
    );

    const acoes = document.createElement("div");
    acoes.className = "jesfer-actions";

    if (r.status === "baixada") {
      acoes.appendChild(
        botao("Estornar", () => estornarRequisicao(r.id))
      );
    }

    acoes.appendChild(
      botao("Imprimir", () => imprimirOrdemSeparacao(r.id))
    );

    acoes.appendChild(
      botao("Excluir", () => excluirRequisicao(r.id))
    );

    card.append(titulo, detalhes, tabela, acoes);

    if (r.obs) {
      const obs = document.createElement("p");
      obs.textContent = "Observações: " + r.obs;
      card.appendChild(obs);
    }

    destino.appendChild(card);
  });
}

function devolverMateriaisRequisicao(r, motivo) {
  (r.materiais || []).forEach(m => {
    if (!encontrarMaterial(m.estoqueId)) return;

    movimentarMaterial(
      m.estoqueId,
      "entrada",
      m.qtd,
      motivo,
      `requisicao:${r.id}`,
      false
    );
  });

  salvarEstoque();
  salvarMovimentos();
}

function estornarRequisicao(id) {
  const r = requisicoes.find(x => String(x.id) === String(id));

  if (!r || r.status !== "baixada") return;

  if (!confirm("Estornar e devolver os materiais?")) return;

  devolverMateriaisRequisicao(
    r,
    `Estorno da requisição ${r.numero}`
  );

  r.status = "estornada";
  salvarRequisicoesStorage();
  renderizarListaRequisicoes();
  renderizarEstoque();
}

function excluirRequisicao(id) {
  const r = requisicoes.find(x => String(x.id) === String(id));
  if (!r) return;

  if (!confirm("Excluir esta requisição?")) return;

  if (r.status === "baixada") {
    devolverMateriaisRequisicao(
      r,
      `Exclusão da requisição ${r.numero}`
    );
  }

  requisicoes = requisicoes.filter(
    x => String(x.id) !== String(id)
  );

  salvarRequisicoesStorage();
  renderizarListaRequisicoes();
  renderizarEstoque();
}

function imprimirOrdemSeparacao(id) {
  const r = requisicoes.find(x => String(x.id) === String(id));
  if (!r) return;

  const linhas = (r.materiais || []).map(m => `
    <tr>
      <td>[ ]</td>
      <td>${escaparHTML(m.nomeItem)}</td>
      <td>${m.qtd} ${escaparHTML(m.unidade)}</td>
    </tr>
  `).join("");

  imprimirDocumento(`
    <h1>JESFER CALHAS E RUFOS</h1>
    <h2>Ordem de Separação nº ${r.numero}</h2>
    <p><strong>Obra:</strong> ${escaparHTML(r.obra)}</p>
    <p><strong>Responsável:</strong>
       ${escaparHTML(r.responsavel)}</p>
    <table>
      <thead>
        <tr>
          <th>OK</th>
          <th>Material</th>
          <th>Quantidade</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
    <p>Assinatura: __________________________</p>
  `);
}

/* ================== AGENDA SUPABASE ================== */

function mensagemAgenda(msg, erro = false) {
  texto("agendaMensagem", msg);

  if ($("agendaMensagem")) {
    $("agendaMensagem").style.color =
      erro ? "#b91c1c" : "#166534";
  }
}

function dataHoraLocal(valor) {
  if (!valor) return "-";

  return new Date(valor).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function intervaloConflita(aInicio, aFim, bInicio, bFim) {
  return aInicio < bFim && aFim > bInicio;
}

function tipoVisita(tipo) {
  return tipo === "visita" || tipo === "orcamento";
}

function validarHorarioAgenda(tipo, inicio, fim) {
  if (
    !Number.isFinite(inicio.getTime()) ||
    !Number.isFinite(fim.getTime()) ||
    fim <= inicio
  ) {
    throw new Error("Informe início e término válidos.");
  }

  if (inicio < new Date()) {
    throw new Error("Não é possível agendar no passado.");
  }

  if (tipoVisita(tipo)) {
    const duracao = (fim - inicio) / 60000;

    if (duracao !== 60) {
      throw new Error("Cada visita deve durar exatamente 1 hora.");
    }

    if (inicio.toDateString() !== fim.toDateString()) {
      throw new Error("A visita deve começar e terminar no mesmo dia.");
    }

    const minutosInicio =
      inicio.getHours() * 60 + inicio.getMinutes();

    const minutosFim =
      fim.getHours() * 60 + fim.getMinutes();

    if (minutosInicio < 810 && minutosFim > 690) {
      throw new Error(
        "Visitas não podem ocupar o almoço (11h30 às 13h30)."
      );
    }
  }
}

async function carregarAgenda() {
  const db = clienteSupabase();

  if (!db) {
    mensagemAgenda("Supabase não conectado.", true);
    return;
  }

  mensagemAgenda("Carregando agenda...");

  try {
    const { data, error } = await db
      .from("agendamentos")
      .select("*")
      .order("inicio", { ascending: true })
      .limit(1000);

    if (error) throw error;

    agendamentos = data || [];
    agendaCarregada = true;

    renderizarAgenda();
    mensagemAgenda("Agenda atualizada.");
  } catch (erro) {
    agendaCarregada = false;
    mensagemAgenda(
      "Erro ao carregar agenda: " + erro.message,
      true
    );
  }
}

function renderizarAgenda() {
  const visitas = $("agendaVisitas");
  const obras = $("agendaObras");

  if (!visitas || !obras) return;

  visitas.replaceChildren();
  obras.replaceChildren();

  const ativos = agendamentos.filter(
    a => a.status !== "cancelado"
  );

  ativos.forEach(a => {
    const destino = tipoVisita(a.tipo_agenda)
      ? visitas
      : obras;

    const card = document.createElement("article");
    card.className = "agenda-item";

    const titulo = document.createElement("h4");
    titulo.textContent = a.titulo;

    const periodo = document.createElement("p");
    periodo.textContent =
      `${dataHoraLocal(a.inicio)} até ${dataHoraLocal(a.fim)}`;

    const status = document.createElement("p");
    status.textContent = "Status: " + a.status;

    const descricao = document.createElement("p");
    descricao.textContent = a.descricao || "";

    card.append(titulo, periodo, status, descricao);
    destino.appendChild(card);
  });

  if (!visitas.children.length) {
    visitas.textContent = "Nenhuma visita agendada.";
  }

  if (!obras.children.length) {
    obras.textContent = "Nenhuma obra agendada.";
  }
}

async function salvarAgendamento(evento) {
  evento.preventDefault();

  const db = clienteSupabase();
  if (!db) return;

  const tipo = campo("agendaTipo");
  const titulo = campo("agendaTitulo").trim();
  const descricao = campo("agendaDescricao").trim();

  const inicio = new Date(campo("agendaInicio"));
  const fim = new Date(campo("agendaFim"));

  if (!titulo) {
    mensagemAgenda("Informe o título.", true);
    return;
  }

  try {
    validarHorarioAgenda(tipo, inicio, fim);

    // Busca os agendamentos novamente antes de verificar.
    const { data, error } = await db
      .from("agendamentos")
      .select("id,inicio,fim,status")
      .lt("inicio", fim.toISOString())
      .gt("fim", inicio.toISOString())
      .neq("status", "cancelado");

    if (error) throw error;

    const conflito = (data || []).some(a =>
      intervaloConflita(
        inicio.getTime(),
        fim.getTime(),
        new Date(a.inicio).getTime(),
        new Date(a.fim).getTime()
      )
    );

    if (conflito) {
      throw new Error(
        "Já existe um agendamento nesse período."
      );
    }

    if (!confirm(
      `Confirmar ${titulo} de ${dataHoraLocal(inicio)} ` +
      `até ${dataHoraLocal(fim)}?`
    )) return;

    const salvar = $("agendaSalvar");
    salvar.disabled = true;

    try {
      const { error: erroInsert } = await db
        .from("agendamentos")
        .insert({
          tipo_agenda: tipo,
          titulo,
          descricao,
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          status: "confirmado"
        });

      if (erroInsert) throw erroInsert;

      $("agendaForm").reset();
      await carregarAgenda();
      mensagemAgenda("Agendamento registrado!");
    } finally {
      salvar.disabled = false;
    }
  } catch (erro) {
    mensagemAgenda(erro.message, true);
  }
}

/* ================== INICIALIZAÇÃO ================== */

function iniciarSistemaJesfer() {
  const obrigatorios = [
    "abaOrcamentos",
    "abaRequisicoes",
    "abaEstoque",
    "abaFazerOrcamento",
    "abaAgenda",
    "finForm",
    "agendaForm",
    "dobrasContainer",
    "estoqueContainer",
    "reqItensContainer"
  ];

  const ausentes = obrigatorios.filter(id => !$(id));

  if (ausentes.length) {
    console.error(
      "Elementos ausentes no HTML:",
      ausentes.join(", ")
    );
    return;
  }

  if (!$("reqData").value) {
    $("reqData").value = hoje();
  }

  const agora = new Date();
  const segunda = new Date(agora);

  segunda.setDate(
    agora.getDate() - ((agora.getDay() + 6) % 7)
  );

  $("relInicio").value = [
    segunda.getFullYear(),
    String(segunda.getMonth() + 1).padStart(2, "0"),
    String(segunda.getDate()).padStart(2, "0")
  ].join("-");

  $("relFim").value = hoje();

  if (!itensObra.length) adicionarItemObra();

  if (!itensFormRequisicao.length) {
    adicionarItemFormRequisicao();
  }

  $("finForm").addEventListener(
    "submit",
    salvarLancamentoFinanceiro
  );

  $("finFiltro").addEventListener(
    "change",
    renderizarFinanceiro
  );

  $("finBusca").addEventListener(
    "input",
    renderizarFinanceiro
  );

  $("finAtualizar").addEventListener(
    "click",
    carregarFinanceiro
  );

  $("finExportar").addEventListener(
    "click",
    exportarFinanceiroCSV
  );

  $("agendaForm").addEventListener(
    "submit",
    salvarAgendamento
  );

  $("agendaAtualizar").addEventListener(
    "click",
    carregarAgenda
  );

  $("agendaTipo").addEventListener("change", () => {
    const inicioTexto = campo("agendaInicio");

    if (
      tipoVisita(campo("agendaTipo")) &&
      inicioTexto
    ) {
      const inicio = new Date(inicioTexto);

      if (Number.isFinite(inicio.getTime())) {
        const fim = new Date(inicio.getTime() + 3600000);

        const local = new Date(
          fim.getTime() - fim.getTimezoneOffset() * 60000
        );

        $("agendaFim").value =
          local.toISOString().slice(0, 16);
      }
    }
  });

  $("agendaInicio").addEventListener("change", () => {
    if (!tipoVisita(campo("agendaTipo"))) return;

    const inicio = new Date(campo("agendaInicio"));
    if (!Number.isFinite(inicio.getTime())) return;

    const fim = new Date(inicio.getTime() + 3600000);
    const local = new Date(
      fim.getTime() - fim.getTimezoneOffset() * 60000
    );

    $("agendaFim").value = local.toISOString().slice(0, 16);
  });

  renderizarCamposDobras();
  renderizarItensObra();
  renderizarCaixaAcumulado();
  renderizarListaRequisicoes();
  renderizarEstoque();

  mudarAba("abaOrcamentos");

  console.log("JESFER: sistema inicializado.");
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    iniciarSistemaJesfer,
    { once: true }
  );
} else {
  iniciarSistemaJesfer();
}
