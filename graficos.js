
/*
  JESFER CALHAS E RUFOS
  graficos.js
  Dashboard financeiro com Chart.js e Supabase
*/

(() => {
  "use strict";

  const CONFIG = {
    chartUrl:
      "https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js",
    maxRegistros: 10000
  };

  const graficos = {};
  let carregando = false;
  let iniciado = false;

  const $ = id => document.getElementById(id);

  function moeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function mensagem(texto, erro = false) {
    const elemento = $("jesferGraficosMensagem");

    if (!elemento) return;

    elemento.textContent = texto;
    elemento.style.color = erro
      ? "#b91c1c"
      : "#64748b";
  }

  function obterSupabase() {
    return window.supabaseClient || null;
  }

  function instalarEstilos() {
    if ($("jesferGraficosEstilos")) return;

    const estilo = document.createElement("style");
    estilo.id = "jesferGraficosEstilos";

    estilo.textContent = `
      #jesferDashboardGraficos {
        margin: 28px 0;
        padding: 22px;
        background: #f4f7fb;
        border: 1px solid #dce5ef;
        border-radius: 14px;
        font-family: Arial, sans-serif;
      }

      #jesferDashboardGraficos h2 {
        color: #1c3d5a;
        margin: 0 0 8px;
        font-size: 23px;
      }

      .jesfer-graficos-topo {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        flex-wrap: wrap;
        margin-bottom: 20px;
      }

      #jesferAtualizarGraficos {
        padding: 11px 18px;
        background: #1c3d5a;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
      }

      #jesferAtualizarGraficos:hover {
        background: #285779;
      }

      #jesferAtualizarGraficos:disabled {
        opacity: .6;
        cursor: wait;
      }

      .jesfer-graficos-grid {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
        gap: 18px;
      }

      .jesfer-grafico-card {
        min-width: 0;
        padding: 20px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 3px 12px
          rgba(0, 0, 0, .04);
      }

      .jesfer-grafico-card h3 {
        margin: 0 0 8px;
        color: #1c3d5a;
        font-size: 17px;
      }

      .jesfer-grafico-card p {
        color: #64748b;
        font-size: 13px;
        margin: 0 0 15px;
      }

      .jesfer-grafico-area {
        position: relative;
        width: 100%;
        height: 300px;
      }

      .jesfer-grafico-largo {
        grid-column: 1 / -1;
      }

      #jesferGraficosMensagem {
        font-size: 13px;
        margin-top: 15px;
      }

      @media (max-width: 768px) {
        .jesfer-graficos-grid {
          grid-template-columns: 1fr;
        }

        .jesfer-grafico-largo {
          grid-column: auto;
        }

        #jesferDashboardGraficos {
          padding: 14px;
        }

        .jesfer-grafico-area {
          height: 260px;
        }
      }
    `;

    document.head.appendChild(estilo);
  }

  function instalarDashboard() {
    if ($("jesferDashboardGraficos")) return true;

    const indicador = $("finRecebido");

    if (!indicador) {
      console.warn(
        "JESFER: indicador finRecebido não encontrado."
      );
      return false;
    }

    const painel = document.createElement("section");
    painel.id = "jesferDashboardGraficos";

    painel.innerHTML = `
      <div class="jesfer-graficos-topo">
        <div>
          <h2>Dashboard Financeiro</h2>
          <p>
            Gráficos dos pagamentos registrados
            no Supabase
          </p>
        </div>

        <button
          type="button"
          id="jesferAtualizarGraficos"
        >
          Atualizar gráficos
        </button>
      </div>

      <div class="jesfer-graficos-grid">

        <div class="jesfer-grafico-card">
          <h3>Entradas e saídas mensais</h3>
          <p>Valores efetivamente movimentados</p>

          <div class="jesfer-grafico-area">
            <canvas id="graficoEntradasSaidas">
            </canvas>
          </div>
        </div>

        <div class="jesfer-grafico-card">
          <h3>Despesas por categoria</h3>
          <p>Distribuição dos pagamentos realizados</p>

          <div class="jesfer-grafico-area">
            <canvas id="graficoDespesas">
            </canvas>
          </div>
        </div>

        <div class="
          jesfer-grafico-card jesfer-grafico-largo
        ">
          <h3>Evolução do saldo</h3>
          <p>
            Entradas menos saídas,
            acumuladas por mês
          </p>

          <div class="jesfer-grafico-area">
            <canvas id="graficoSaldo">
            </canvas>
          </div>
        </div>

      </div>

      <p
        id="jesferGraficosMensagem"
        role="status"
      ></p>
    `;

    // Insere os gráficos após os indicadores,
    // antes do restante da gestão financeira.

    const indicadores = [
      "finRecebido",
      "finPago",
      "finSaldo",
      "finAReceber",
      "finAPagar"
    ];

    const elementos = indicadores
      .map(id => $(id))
      .filter(Boolean);

    let container = indicador.parentElement;

    while (
      container &&
      container.parentElement &&
      !elementos.every(
        el => container.contains(el)
      )
    ) {
      container = container.parentElement;
    }

    const aba = indicador.closest(
      ".aba, section[id^='aba']"
    );

    if (
      container &&
      container !== aba &&
      container.parentElement
    ) {
      container.insertAdjacentElement(
        "afterend",
        painel
      );
    } else if (aba) {
      aba.prepend(painel);
    } else {
      indicador.parentElement.appendChild(painel);
    }

    $("jesferAtualizarGraficos")
      .addEventListener(
        "click",
        atualizarGraficos
      );

    return true;
  }

  function carregarChartJS() {
    return new Promise((resolve, reject) => {
      if (typeof window.Chart !== "undefined") {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = CONFIG.chartUrl;

      script.onload = () => {
        if (typeof window.Chart !== "undefined") {
          resolve();
        } else {
          reject(
            new Error("Chart.js não foi inicializado.")
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            "Não foi possível carregar Chart.js."
          )
        );
      };

      document.head.appendChild(script);
    });
  }

  async function buscarTodosPagamentos(supabase) {
    const resultado = [];
    const tamanhoPagina = 1000;

    for (
      let inicio = 0;
      inicio < CONFIG.maxRegistros;
      inicio += tamanhoPagina
    ) {
      const fim = inicio + tamanhoPagina - 1;

      const { data, error } = await supabase
        .from("pagamentos")
        .select(
          "id,financeiro_id,valor,data_pagamento"
        )
        .order("data_pagamento", {
          ascending: true
        })
        .order("id", {
          ascending: true
        })
        .range(inicio, fim);

      if (error) throw error;

      resultado.push(...(data || []));

      if (!data || data.length < tamanhoPagina) {
        return resultado;
      }
    }

    throw new Error(
      "Limite de registros atingido. " +
      "É necessário ampliar a paginação."
    );
  }

  async function buscarFinanceiroPorIds(
    supabase,
    ids
  ) {
    const mapa = new Map();
    const tamanhoLote = 100;

    for (
      let i = 0;
      i < ids.length;
      i += tamanhoLote
    ) {
      const lote = ids.slice(
        i,
        i + tamanhoLote
      );

      const { data, error } = await supabase
        .from("financeiro")
        .select("id,tipo,categoria,status")
        .in("id", lote);

      if (error) throw error;

      (data || []).forEach(item => {
        mapa.set(item.id, item);
      });
    }

    return mapa;
  }

  function processarDados(
    pagamentos,
    financeiroPorId
  ) {
    const meses = {};
    const categorias = {};

    let totalEntradas = 0;
    let totalSaidas = 0;

    for (const pagamento of pagamentos) {
      const financeiro = financeiroPorId.get(
        pagamento.financeiro_id
      );

      if (!financeiro) continue;

      const valor = Number(pagamento.valor);

      if (
        !Number.isFinite(valor) ||
        valor <= 0 ||
        !pagamento.data_pagamento
      ) {
        continue;
      }

      const mes = pagamento
        .data_pagamento
        .slice(0, 7);

      if (!meses[mes]) {
        meses[mes] = {
          entradas: 0,
          saidas: 0
        };
      }

      if (financeiro.tipo === "receber") {
        meses[mes].entradas += valor;
        totalEntradas += valor;
      }

      if (financeiro.tipo === "pagar") {
        meses[mes].saidas += valor;
        totalSaidas += valor;

        const categoria =
          financeiro.categoria || "Outros";

        categorias[categoria] =
          (categorias[categoria] || 0) + valor;
      }
    }

    const chaves = Object.keys(meses).sort();

    const entradas = [];
    const saidas = [];
    const saldos = [];

    let saldoAcumulado = 0;

    for (const mes of chaves) {
      const entrada = meses[mes].entradas;
      const saida = meses[mes].saidas;

      saldoAcumulado += entrada - saida;

      entradas.push(entrada);
      saidas.push(saida);
      saldos.push(saldoAcumulado);
    }

    const rotulos = chaves.map(mes => {
      const [ano, numeroMes] = mes.split("-");

      return `${numeroMes}/${ano}`;
    });

    return {
      rotulos,
      entradas,
      saidas,
      saldos,
      categorias,
      totalEntradas,
      totalSaidas
    };
  }

  function criarGrafico(id, configuracao) {
    const canvas = $(id);

    if (!canvas) return;

    if (graficos[id]) {
      graficos[id].destroy();
    }

    graficos[id] = new Chart(
      canvas,
      configuracao
    );
  }

  function opcoesPadrao() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom"
        },
        tooltip: {
          callbacks: {
            label(contexto) {
              const valor =
                contexto.parsed.y ??
                contexto.parsed ??
                0;

              return (
                contexto.dataset.label +
                ": " +
                moeda(valor)
              );
            }
          }
        }
      }
    };
  }

  function desenharGraficos(dados) {
    criarGrafico("graficoEntradasSaidas", {
      type: "bar",

      data: {
        labels: dados.rotulos,
        datasets: [
          {
            label: "Entradas",
            data: dados.entradas,
            backgroundColor: "#16a34a",
            borderRadius: 5
          },
          {
            label: "Saídas",
            data: dados.saidas,
            backgroundColor: "#dc2626",
            borderRadius: 5
          }
        ]
      },

      options: {
        ...opcoesPadrao(),
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    const nomesCategorias =
      Object.keys(dados.categorias);

    const valoresCategorias =
      Object.values(dados.categorias);

    criarGrafico("graficoDespesas", {
      type: "doughnut",

      data: {
        labels: nomesCategorias,
        datasets: [
          {
            label: "Despesas",
            data: valoresCategorias,
            backgroundColor: [
              "#1c3d5a",
              "#2563eb",
              "#0d9488",
              "#f59e0b",
              "#8b5cf6",
              "#dc2626",
              "#64748b",
              "#ec4899"
            ]
          }
        ]
      },

      options: {
        ...opcoesPadrao(),
        cutout: "60%",
        plugins: {
          ...opcoesPadrao().plugins,
          tooltip: {
            callbacks: {
              label(contexto) {
                return (
                  contexto.label +
                  ": " +
                  moeda(contexto.parsed)
                );
              }
            }
          }
        }
      }
    });

    criarGrafico("graficoSaldo", {
      type: "line",

      data: {
        labels: dados.rotulos,
        datasets: [
          {
            label: "Saldo acumulado",
            data: dados.saldos,
            borderColor: "#1c3d5a",
            backgroundColor:
              "rgba(28, 61, 90, 0.12)",
            borderWidth: 3,
            tension: 0.3,
            fill: true,
            pointRadius: 4
          }
        ]
      },

      options: {
        ...opcoesPadrao()
      }
    });
  }

  async function atualizarGraficos() {
    if (carregando) return;

    if (!instalarDashboard()) return;

    const botao = $("jesferAtualizarGraficos");
    const supabase = obterSupabase();

    if (!supabase) {
      mensagem(
        "Supabase ainda não conectado. " +
        "Verifique a autenticação.",
        true
      );
      return;
    }

    carregando = true;

    if (botao) botao.disabled = true;

    mensagem("Consultando pagamentos no Supabase...");

    try {
      await carregarChartJS();

      const pagamentos =
        await buscarTodosPagamentos(supabase);

      const ids = [
        ...new Set(
          pagamentos.map(p => p.financeiro_id)
        )
      ].filter(Boolean);

      const financeiroPorId =
        await buscarFinanceiroPorIds(
          supabase,
          ids
        );

      const dados = processarDados(
        pagamentos,
        financeiroPorId
      );

      desenharGraficos(dados);

      if (pagamentos.length === 0) {
        mensagem(
          "Nenhum pagamento registrado. " +
          "Os gráficos serão preenchidos " +
          "após registrar pagamentos."
        );
      } else {
        mensagem(
          "Gráficos atualizados. " +
          "Recebido: " +
          moeda(dados.totalEntradas) +
          " | Pago: " +
          moeda(dados.totalSaidas)
        );
      }

    } catch (erro) {
      console.error(
        "JESFER - erro nos gráficos:",
        erro
      );

      mensagem(
        "Erro ao carregar gráficos: " +
        erro.message,
        true
      );

    } finally {
      carregando = false;

      if (botao) botao.disabled = false;
    }
  }

  function iniciar() {
    if (iniciado) return;
    iniciado = true;

    instalarEstilos();
    instalarDashboard();

    // Atualiza quando o usuário abre
    // a aba financeira ou clica em atualizar.

    document.addEventListener("click", event => {
      const botao = event.target.closest(
        "button"
      );

      if (!botao) return;

      const texto = (
        botao.textContent || ""
      ).toLowerCase();

      const id = botao.id || "";

      if (
        id === "finAtualizar" ||
        id === "navOrcamentos" ||
        texto.includes("gestão financeira")
      ) {
        setTimeout(atualizarGraficos, 400);
      }
    });

    // Observa a mensagem de atualização
    // do financeiro, quando disponível.

    const mensagemFinanceiro = $("finMensagem");

    if (mensagemFinanceiro) {
      const observador = new MutationObserver(() => {
        const texto = (
          mensagemFinanceiro.textContent || ""
        ).toLowerCase();

        if (
          texto.includes("atualizado") ||
          texto.includes("lançamento salvo") ||
          texto.includes("pagamento registrado")
        ) {
          atualizarGraficos();
        }
      });

      observador.observe(mensagemFinanceiro, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    // Carrega inicialmente quando
    // o Supabase estiver disponível.

    atualizarGraficos();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      iniciar
    );
  } else {
    iniciar();
  }

  // Permite atualizar manualmente
  // pelo console ou por outros módulos.

  window.atualizarGraficosJesfer =
    atualizarGraficos;

})();
