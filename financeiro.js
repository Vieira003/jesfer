
/* JESFER - GESTÃO FINANCEIRA
   Integração com Supabase
*/

"use strict";

window.JesferFinanceiro = (() => {
  let lancamentos = [];
  let pagamentos = [];
  let carregando = false;

  const el = id => document.getElementById(id);
  const banco = () => window.supabaseClient;

  const moeda = valor =>
    Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  const arredondar = valor =>
    Math.round(Number(valor) * 100) / 100;

  const hoje = () => {
    const data = new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  };

  function mensagem(texto, erro = false) {
    const destino = el("finMensagem");
    if (!destino) return;

    destino.textContent = texto;
    destino.style.color = erro ? "#b91c1c" : "#166534";
  }

  function totalPago(id) {
    return pagamentos
      .filter(p => p.financeiro_id === id)
      .reduce((total, p) => total + Number(p.valor), 0);
  }

  async function carregar() {
    if (carregando) return;

    if (!banco()) {
      mensagem("Supabase não conectado.", true);
      return;
    }

    carregando = true;
    mensagem("Carregando dados financeiros...");

    try {
      const [resultadoFinanceiro, resultadoPagamentos] =
        await Promise.all([
          banco()
            .from("financeiro")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1000),

          banco()
            .from("pagamentos")
            .select("*")
            .order("data_pagamento", { ascending: false })
            .limit(2000)
        ]);

      if (resultadoFinanceiro.error) {
        throw resultadoFinanceiro.error;
      }

      if (resultadoPagamentos.error) {
        throw resultadoPagamentos.error;
      }

      lancamentos = resultadoFinanceiro.data || [];
      pagamentos = resultadoPagamentos.data || [];

      renderizar();
      mensagem("Dados atualizados com sucesso.");
    } catch (erro) {
      mensagem("Erro ao carregar: " + erro.message, true);
    } finally {
      carregando = false;
    }
  }

  function renderizar() {
    const recebido = pagamentos
      .filter(p =>
        lancamentos.some(l =>
          l.id === p.financeiro_id &&
          l.tipo === "receber"
        )
      )
      .reduce((total, p) => total + Number(p.valor), 0);

    const pago = pagamentos
      .filter(p =>
        lancamentos.some(l =>
          l.id === p.financeiro_id &&
          l.tipo === "pagar"
        )
      )
      .reduce((total, p) => total + Number(p.valor), 0);

    const aReceber = lancamentos
      .filter(l =>
        l.tipo === "receber" &&
        l.status !== "cancelado"
      )
      .reduce((total, l) =>
        total + Math.max(0, Number(l.valor) - totalPago(l.id)), 0);

    const aPagar = lancamentos
      .filter(l =>
        l.tipo === "pagar" &&
        l.status !== "cancelado"
      )
      .reduce((total, l) =>
        total + Math.max(0, Number(l.valor) - totalPago(l.id)), 0);

    const indicadores = {
      finRecebido: recebido,
      finPago: pago,
      finSaldo: recebido - pago,
      finAReceber: aReceber,
      finAPagar: aPagar
    };

    Object.entries(indicadores).forEach(([id, valor]) => {
      if (el(id)) el(id).textContent = moeda(valor);
    });

    const corpo = el("finTabela");
    if (!corpo) return;

    corpo.replaceChildren();

    const filtro = el("finFiltro")?.value || "todos";
    const busca = (el("finBusca")?.value || "").toLowerCase();

    const filtrados = lancamentos.filter(l =>
      (filtro === "todos" || l.tipo === filtro) &&
      l.descricao.toLowerCase().includes(busca)
    );

    filtrados.forEach(lancamento => {
      const pagoAtual = totalPago(lancamento.id);
      const restante = Math.max(
        0,
        Number(lancamento.valor) - pagoAtual
      );

      const linha = document.createElement("tr");

      const valores = [
        lancamento.descricao,
        lancamento.tipo === "receber" ? "Receber" : "Pagar",
        moeda(lancamento.valor),
        moeda(pagoAtual),
        moeda(restante),
        lancamento.vencimento || "-",
        lancamento.status
      ];

      valores.forEach(valor => {
        const coluna = document.createElement("td");
        coluna.textContent = valor;
        linha.appendChild(coluna);
      });

      const colunaAcao = document.createElement("td");

      if (restante > 0 && lancamento.status !== "cancelado") {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.textContent = "Registrar pagamento";

        botao.addEventListener("click", () => {
          registrarPagamento(lancamento.id);
        });

        colunaAcao.appendChild(botao);
      }

      linha.appendChild(colunaAcao);
      corpo.appendChild(linha);
    });

    if (filtrados.length === 0) {
      const linha = document.createElement("tr");
      const coluna = document.createElement("td");
      coluna.colSpan = 8;
      coluna.textContent = "Nenhum lançamento encontrado.";
      linha.appendChild(coluna);
      corpo.appendChild(linha);
    }
  }

  async function salvarLancamento(evento) {
    evento.preventDefault();

    const tipo = el("finTipo").value;
    const descricao = el("finDescricao").value.trim();
    const valor = arredondar(el("finValor").value);
    const vencimento = el("finVencimento").value || null;

    if (
      !descricao ||
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      mensagem("Preencha a descrição e um valor válido.", true);
      return;
    }

    const botao = el("finSalvar");
    botao.disabled = true;

    try {
      const { error } = await banco()
        .from("financeiro")
        .insert({
          tipo,
          descricao,
          valor,
          vencimento,
          status: "pendente"
        });

      if (error) throw error;

      el("finForm").reset();
      await carregar();
      mensagem("Lançamento salvo no Supabase.");
    } catch (erro) {
      mensagem("Erro ao salvar: " + erro.message, true);
    } finally {
      botao.disabled = false;
    }
  }

  async function registrarPagamento(id) {
    const lancamento = lancamentos.find(l => l.id === id);
    if (!lancamento) return;

    const restante = arredondar(
      Number(lancamento.valor) - totalPago(id)
    );

    const entrada = prompt(
      `Valor do pagamento (restante: ${moeda(restante)}):`,
      restante.toFixed(2).replace(".", ",")
    );

    if (entrada === null) return;

    const texto = entrada.trim();

    const valor = arredondar(
      texto.includes(",")
        ? texto.replace(/\./g, "").replace(",", ".")
        : texto
    );

    if (
      !texto ||
      !Number.isFinite(valor) ||
      valor <= 0 ||
      valor > restante
    ) {
      alert("Valor inválido ou maior que o restante.");
      return;
    }

    const forma = prompt(
      "Forma de pagamento:",
      "Pix"
    );

    if (forma === null) return;

    if (!confirm(`Confirmar ${moeda(valor)}?`)) return;

    try {
      const { error } = await banco()
        .from("pagamentos")
        .insert({
          financeiro_id: id,
          valor,
          data_pagamento: hoje(),
          forma_pagamento: forma.trim() || null
        });

      if (error) throw error;

      await carregar();
      mensagem("Pagamento registrado com sucesso.");
    } catch (erro) {
      mensagem("Erro no pagamento: " + erro.message, true);
    }
  }

  function iniciar() {
    const formulario = el("finForm");

    if (!formulario || formulario.dataset.ativo) return;

    formulario.dataset.ativo = "1";
    formulario.addEventListener("submit", salvarLancamento);

    el("finAtualizar")?.addEventListener("click", carregar);
    el("finFiltro")?.addEventListener("change", renderizar);
    el("finBusca")?.addEventListener("input", renderizar);

    carregar();
  }

  return { iniciar, carregar };
})();
