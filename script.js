// --- DADOS PADRÃO INICIAIS (COM IDS FIXOS PARA INTEGRAÇÃO) ---
const ESTOQUE_PADRAO = [
  { id: 101, item: "Chapa 24 (0.50mm) - Metros", qtd: 150, unidade: "Metros" },
  { id: 102, item: "Chapa 26 (0.45mm) - Metros", qtd: 200, unidade: "Metros" },
  { id: 103, item: "Parafusos Ponta Fina (Saco/Unidade)", qtd: 1000, unidade: "Unidades" },
  { id: 104, item: "Parafusos de Aço", qtd: 500, unidade: "Unidades" },
  { id: 105, item: "Parafusos de Bucha (com bucha)", qtd: 300, unidade: "Kits" },
  { id: 106, item: "Parafusos de Telha (3/8 x 110mm)", qtd: 400, unidade: "Unidades" },
  { id: 107, item: "Parafusos de Telha (1/4 x 80mm)", qtd: 250, unidade: "Unidades" },
  { id: 108, item: "Tubos de PU Calha (Selante)", qtd: 45, unidade: "Tubos" }
];

const DOBRAS_PADRAO = [
  { id: 1, nome: "Calha U Simples", preco: 25.00, estoqueId: 101 },
  { id: 2, nome: "Rufos Pingadeira", preco: 35.00, estoqueId: 102 },
  { id: 3, nome: "Moldura Especial", preco: 50.00, estoqueId: 101 }
];

// Carrega dados salvos ou usa os padrões
let estoque = JSON.parse(localStorage.getItem('jesfer_estoque_v2')) || ESTOQUE_PADRAO;
let dobras = JSON.parse(localStorage.getItem('jesfer_dobras_v2')) || DOBRAS_PADRAO;
let requisicoes = JSON.parse(localStorage.getItem('jesfer_requisicoes_v2')) || [];

let itensObra = [];
let itensFormRequisicao = [];

// --- NAVEGAÇÃO ENTRE ABAS ---
function mudarAba(idAba, elemento) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(idAba).classList.add('active');
  elemento.classList.add('active');
}

// =========================================================================
// 1. TABELA DE PREÇOS / CATÁLOGO (COM VÍNCULO DE MATERIAL DO ESTOQUE)
// =========================================================================
function renderizarCamposDobras() {
  const container = document.getElementById('dobrasContainer');
  container.innerHTML = '';

  dobras.forEach((dobra, index) => {
    const item = document.createElement('div');
    item.className = 'catalogo-item';

    // Nome da Dobra
    const divNome = document.createElement('div');
    const labelNome = document.createElement('label');
    labelNome.textContent = `Modelo ${index + 1}:`;
    const inputNome = document.createElement('input');
    inputNome.type = 'text';
    inputNome.value = dobra.nome;
    inputNome.oninput = (e) => {
      dobras[index].nome = e.target.value;
      salvarTabela(false);
      renderizarItensObra();
    };
    divNome.append(labelNome, inputNome);

    // Preço por Metro
    const divPreco = document.createElement('div');
    const labelPreco = document.createElement('label');
    labelPreco.textContent = 'Preço/Metro (R$):';
    const inputPreco = document.createElement('input');
    inputPreco.type = 'number';
    inputPreco.step = '0.01';
    inputPreco.value = dobra.preco;
    inputPreco.oninput = (e) => {
      dobras[index].preco = parseFloat(e.target.value) || 0;
      salvarTabela(false);
      renderizarItensObra();
    };
    divPreco.append(labelPreco, inputPreco);

    // Vínculo com Material do Estoque
    const divVinculo = document.createElement('div');
    const labelVinculo = document.createElement('label');
    labelVinculo.textContent = 'Chapa/Material Consumido:';
    const selectVinculo = document.createElement('select');

    const optNenhum = document.createElement('option');
    optNenhum.value = '';
    optNenhum.textContent = '-- Nenhum / Apenas Mão de Obra --';
    selectVinculo.appendChild(optNenhum);

    estoque.forEach(est => {
      const opt = document.createElement('option');
      opt.value = est.id;
      opt.textContent = `${est.item} (${est.unidade})`;
      if (Number(dobra.estoqueId) === Number(est.id)) {
        opt.selected = true;
      }
      selectVinculo.appendChild(opt);
    });

    selectVinculo.onchange = (e) => {
      dobras[index].estoqueId = e.target.value ? Number(e.target.value) : null;
      salvarTabela(false);
    };
    divVinculo.append(labelVinculo, selectVinculo);

    // Botão Remover
    const divBtn = document.createElement('div');
    divBtn.className = 'btn-remove-container';
    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn-remove';
    btnRemove.textContent = 'Remover';
    btnRemove.onclick = () => removerCampoDobra(index);
    divBtn.appendChild(btnRemove);

    item.append(divNome, divPreco, divVinculo, divBtn);
    container.appendChild(item);
  });
}

function adicionarCampoDobra() {
  const defaultEstId = estoque[0] ? estoque[0].id : null;
  dobras.push({ id: Date.now(), nome: `Dobra ${dobras.length + 1}`, preco: 0.00, estoqueId: defaultEstId });
  renderizarCamposDobras();
  salvarTabela(false);
  renderizarItensObra();
}

function removerCampoDobra(index) {
  if (dobras.length <= 1) {
    alert('O catálogo precisa de pelo menos uma dobra registrada.');
    return;
  }
  const idRemovido = dobras[index].id;
  dobras.splice(index, 1);

  itensObra.forEach(item => {
    if (item.dobraId === idRemovido) {
      item.dobraId = dobras[0].id;
    }
  });

  renderizarCamposDobras();
  salvarTabela(false);
  renderizarItensObra();
}

function salvarTabela(mostrarAlerta = false) {
  localStorage.setItem('jesfer_dobras_v2', JSON.stringify(dobras));
  const badge = document.getElementById('statusTabela');
  badge.textContent = 'Salvo agora ✓';
  setTimeout(() => { badge.textContent = 'Salvo automaticamente'; }, 2000);

  if (mostrarAlerta) alert('Tabela de preços salva com sucesso!');
}

// =========================================================================
// 2. GERADOR DE ORÇAMENTOS E FINANCEIRO
// =========================================================================
function adicionarItemObra() {
  const primeiraDobraId = dobras[0] ? dobras[0].id : null;
  itensObra.push({ dobraId: primeiraDobraId, metragem: 0 });
  renderizarItensObra();
}

function removerItemObra(index) {
  itensObra.splice(index, 1);
  renderizarItensObra();
}

function renderizarItensObra() {
  const container = document.getElementById('itensObraContainer');
  container.innerHTML = '';

  itensObra.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'dobra-item';

    const divSelect = document.createElement('div');
    const labelSelect = document.createElement('label');
    labelSelect.textContent = 'Selecione a Dobra/Modelo:';
    const select = document.createElement('select');

    dobras.forEach(d => {
      const option = document.createElement('option');
      option.value = d.id;
      option.textContent = `${d.nome} - R$ ${d.preco.toFixed(2)}/m`;
      if (d.id === item.dobraId) option.selected = true;
      select.appendChild(option);
    });

    select.onchange = (e) => {
      itensObra[index].dobraId = Number(e.target.value);
    };
    divSelect.append(labelSelect, select);

    const divMetragem = document.createElement('div');
    const labelMetragem = document.createElement('label');
    labelMetragem.textContent = 'Metragem (m):';
    const inputMetragem = document.createElement('input');
    inputMetragem.type = 'number';
    inputMetragem.step = '0.1';
    inputMetragem.placeholder = 'Ex: 10';
    inputMetragem.value = item.metragem || '';
    inputMetragem.oninput = (e) => {
      itensObra[index].metragem = parseFloat(e.target.value) || 0;
    };
    divMetragem.append(labelMetragem, inputMetragem);

    const divBtn = document.createElement('div');
    divBtn.className = 'btn-remove-container';
    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn-remove';
    btnRemove.textContent = 'Remover Item';
    btnRemove.onclick = () => removerItemObra(index);
    divBtn.appendChild(btnRemove);

    row.append(divSelect, divMetragem, divBtn);
    container.appendChild(row);
  });
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function gerarOrcamento() {
  if (itensObra.length === 0) {
    alert('Adicione pelo menos uma dobra na obra para calcular!');
    return;
  }

  let totalVenda = 0;
  itensObra.forEach(item => {
    const dobraEncontrada = dobras.find(d => d.id === item.dobraId);
    const precoMetro = dobraEncontrada ? dobraEncontrada.preco : 0;
    totalVenda += (precoMetro * item.metragem);
  });

  const custo = parseFloat(document.getElementById('custoTotal').value) || 0;
  const lucroLiquido = totalVenda - custo;

  const resLucroEl = document.getElementById('resLucro');
  const alertaPrejuizo = document.getElementById('alertaPrejuizo');

  document.getElementById('resVenda').innerText = formatarMoeda(totalVenda);
  document.getElementById('resCusto').innerText = formatarMoeda(custo);
  resLucroEl.innerText = formatarMoeda(lucroLiquido);

  if (lucroLiquido < 0) {
    resLucroEl.style.color = '#dc2626';
    alertaPrejuizo.style.display = 'block';
  } else {
    resLucroEl.style.color = '#16a34a';
    alertaPrejuizo.style.display = 'none';
  }

  if (lucroLiquido > 0) {
    document.getElementById('divDizimo').innerText = formatarMoeda(lucroLiquido * 0.10);
    document.getElementById('divEmpresa').innerText = formatarMoeda(lucroLiquido * 0.50);
    document.getElementById('divVoce').innerText = formatarMoeda(lucroLiquido * 0.25);
    document.getElementById('divInvest').innerText = formatarMoeda(lucroLiquido * 0.15);
  } else {
    document.getElementById('divDizimo').innerText = "R$ 0,00";
    document.getElementById('divEmpresa').innerText = "R$ 0,00";
    document.getElementById('divVoce').innerText = "R$ 0,00";
    document.getElementById('divInvest').innerText = "R$ 0,00";
  }

  document.getElementById('painelResultado').style.display = 'block';
  document.getElementById('secaoFinanceira').style.display = 'block';
  document.getElementById('btnImprimirOrc').style.display = 'inline-block';
  document.getElementById('btnEnviarReq').style.display = 'inline-block';
}

function imprimirOrcamento() {
  document.body.classList.remove('imprimindo-requisicao');
  const hoje = new Date().toLocaleDateString('pt-BR');
  document.getElementById('dataOrcamento').textContent = `Data de emissão: ${hoje}`;
  window.print();
}

// PONTE: ENVIAR ORÇAMENTO PARA ABA DE REQUISIÇÃO
function enviarOrcamentoParaRequisicao() {
  const nomeCliente = document.getElementById('nomeCliente').value.trim();
  
  // Agrupa metragens pelo mesmo estoqueId
  const mapaMateriais = {};
  itensObra.forEach(item => {
    if (item.metragem <= 0) return;
    const dobra = dobras.find(d => d.id === item.dobraId);
    if (dobra && dobra.estoqueId) {
      if (!mapaMateriais[dobra.estoqueId]) {
        mapaMateriais[dobra.estoqueId] = 0;
      }
      mapaMateriais[dobra.estoqueId] += item.metragem;
    }
  });

  const idsAgrupados = Object.keys(mapaMateriais);
  if (idsAgrupados.length === 0) {
    alert('Nenhuma dobra deste orçamento possui chapa vinculada ou metragem maior que zero.');
    return;
  }

  // Preenche o formulário da aba Requisições
  document.getElementById('reqObra').value = nomeCliente || 'Obra Sem Nome';
  document.getElementById('reqData').valueAsDate = new Date();
  
  itensFormRequisicao = idsAgrupados.map(estId => ({
    estoqueId: Number(estId),
    qtd: mapaMateriais[estId]
  }));

  renderizarItensFormRequisicao();

  // Muda para a aba de Requisições
  const navBtnReq = document.getElementById('navRequisicoes');
  mudarAba('abaRequisicoes', navBtnReq);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =========================================================================
// 3. REQUISIÇÕES DE OBRAS (SEPARAÇÃO E BAIXA NO ESTOQUE)
// =========================================================================
function adicionarItemFormRequisicao() {
  const primeiroEstId = estoque[0] ? estoque[0].id : null;
  itensFormRequisicao.push({ estoqueId: primeiroEstId, qtd: 1 });
  renderizarItensFormRequisicao();
}

function removerItemFormRequisicao(index) {
  itensFormRequisicao.splice(index, 1);
  renderizarItensFormRequisicao();
}

function renderizarItensFormRequisicao() {
  const container = document.getElementById('reqItensContainer');
  container.innerHTML = '';

  itensFormRequisicao.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'dobra-item';

    // Select do Material do Estoque
    const divMat = document.createElement('div');
    const labelMat = document.createElement('label');
    labelMat.textContent = 'Material / Insumo do Estoque:';
    const select = document.createElement('select');

    estoque.forEach(est => {
      const opt = document.createElement('option');
      opt.value = est.id;
      opt.textContent = `${est.item} (Saldo: ${est.qtd} ${est.unidade})`;
      if (Number(est.id) === Number(item.estoqueId)) opt.selected = true;
      select.appendChild(opt);
    });

    select.onchange = (e) => {
      itensFormRequisicao[index].estoqueId = Number(e.target.value);
    };
    divMat.append(labelMat, select);

    // Quantidade Solicitada
    const divQtd = document.createElement('div');
    const labelQtd = document.createElement('label');
    labelQtd.textContent = 'Quantidade a Retirar:';
    const inputQtd = document.createElement('input');
    inputQtd.type = 'number';
    inputQtd.step = '0.1';
    inputQtd.value = item.qtd || '';
    inputQtd.oninput = (e) => {
      itensFormRequisicao[index].qtd = parseFloat(e.target.value) || 0;
    };
    divQtd.append(labelQtd, inputQtd);

    // Botão Remover
    const divBtn = document.createElement('div');
    divBtn.className = 'btn-remove-container';
    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn-remove';
    btnRemove.textContent = 'Remover';
    btnRemove.onclick = () => removerItemFormRequisicao(index);
    divBtn.appendChild(btnRemove);

    row.append(divMat, divQtd, divBtn);
    container.appendChild(row);
  });
}

function salvarNovaRequisicao() {
  const obra = document.getElementById('reqObra').value.trim();
  const responsavel = document.getElementById('reqResponsavel').value.trim() || 'Não informado';
  const data = document.getElementById('reqData').value || new Date().toISOString().split('T')[0];
  const obs = document.getElementById('reqObs').value.trim();

  if (!obra) {
    alert('Informe o Nome da Obra / Cliente para registrar a requisição.');
    return;
  }

  const materiaisValidos = itensFormRequisicao.filter(i => i.estoqueId && i.qtd > 0);
  if (materiaisValidos.length === 0) {
    alert('Adicione pelo menos um material com quantidade maior que zero.');
    return;
  }

  // Agrupa itens repetidos na mesma requisição
  const agrupados = [];
  materiaisValidos.forEach(item => {
    const estProd = estoque.find(e => Number(e.id) === Number(item.estoqueId));
    if (!estProd) return;

    const existente = agrupados.find(a => a.estoqueId === estProd.id);
    if (existente) {
      existente.qtd += item.qtd;
    } else {
      agrupados.push({
        estoqueId: estProd.id,
        nomeItem: estProd.item,
        qtd: item.qtd,
        unidade: estProd.unidade
      });
    }
  });

  const numeroSeq = requisicoes.length > 0 ? Math.max(...requisicoes.map(r => r.numero)) + 1 : 1;

  const novaReq = {
    id: Date.now(),
    numero: numeroSeq,
    obra,
    responsavel,
    data,
    obs,
    status: 'pendente', // 'pendente' ou 'baixada'
    materiais: agrupados
  };

  requisicoes.unshift(novaReq);
  salvarRequisicoesStorage();
  renderizarListaRequisicoes();

  // Limpa formulário
  document.getElementById('reqObra').value = '';
  document.getElementById('reqResponsavel').value = '';
  document.getElementById('reqObs').value = '';
  itensFormRequisicao = [];
  adicionarItemFormRequisicao();

  alert(`Requisição #${String(numeroSeq).padStart(3, '0')} salva como Pendente!`);
}

function salvarRequisicoesStorage() {
  localStorage.setItem('jesfer_requisicoes_v2', JSON.stringify(requisicoes));
}

function renderizarListaRequisicoes() {
  const container = document.getElementById('listaRequisicoesSalvas');
  container.innerHTML = '';

  if (requisicoes.length === 0) {
    container.innerHTML = '<p style="color: #64748b; font-size: 14px;">Nenhuma requisição registrada ainda. Crie uma acima ou envie direto de um orçamento.</p>';
    return;
  }

  requisicoes.forEach(req => {
    const isBaixada = req.status === 'baixada';
    const card = document.createElement('div');
    card.className = `req-card ${isBaixada ? 'status-baixada' : 'status-pendente'}`;

    const dataFormatada = req.data.split('-').reverse().join('/');
    const numFormatado = String(req.numero).padStart(3, '0');

    let linhasTabela = '';
    req.materiais.forEach(m => {
      linhasTabela += `
        <tr>
          <td>${m.nomeItem}</td>
          <td><strong>${m.qtd} ${m.unidade}</strong></td>
        </tr>
      `;
    });

    card.innerHTML = `
      <div class="req-header">
        <div>
          <div class="req-title">Requisição #${numFormatado} — ${req.obra}</div>
          <div class="req-meta">
            <strong>Data:</strong> ${dataFormatada} | <strong>Responsável:</strong> ${req.responsavel}
            ${req.obs ? `<br><strong>Obs:</strong> ${req.obs}` : ''}
          </div>
        </div>
        <span class="badge-status ${isBaixada ? 'badge-baixada' : 'badge-pendente'}">
          ${isBaixada ? '🟢 Baixada do Estoque' : '🟡 Pendente / Separando'}
        </span>
      </div>

      <table class="req-tabela-itens">
        <thead>
          <tr>
            <th>Material / Insumo</th>
            <th style="width: 180px;">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          ${linhasTabela}
        </tbody>
      </table>

      <div class="req-actions no-print">
        ${!isBaixada ? `
          <button type="button" class="btn-add btn-sm" onclick="darBaixaRequisicao(${req.id})">✅ Confirmar Saída e Dar Baixa</button>
        ` : `
          <button type="button" class="btn-warning btn-sm" onclick="estornarRequisicao(${req.id})">↩️ Estornar (Devolver ao Estoque)</button>
        `}
        <button type="button" class="btn-print btn-sm" onclick="imprimirOrdemSeparacao(${req.id})">🖨️ Imprimir Ordem de Separação</button>
        <button type="button" class="btn-remove btn-sm" onclick="excluirRequisicao(${req.id})">Excluir</button>
      </div>
    `;

    container.appendChild(card);
  });
}

function darBaixaRequisicao(reqId) {
  const req = requisicoes.find(r => r.id === reqId);
  if (!req || req.status === 'baixada') return;

  // Verifica se há saldo suficiente para todos os itens
  const faltantes = [];
  req.materiais.forEach(mat => {
    const estProd = estoque.find(e => Number(e.id) === Number(mat.estoqueId));
    if (!estProd) {
      faltantes.push(`${mat.nomeItem} (item removido do cadastro de estoque)`);
    } else if (estProd.qtd < mat.qtd) {
      faltantes.push(`${estProd.item}: precisa de ${mat.qtd}, mas só há ${estProd.qtd} ${estProd.unidade}`);
    }
  });

  if (faltantes.length > 0) {
    const continuar = confirm(
      `⚠️ Atenção! Estoque insuficiente para os seguintes itens:\n\n- ${faltantes.join('\n- ')}\n\nDeseja dar baixa mesmo assim (o saldo ficará negativo)?`
    );
    if (!continuar) return;
  }

  // Desconta do estoque
  req.materiais.forEach(mat => {
    const estProd = estoque.find(e => Number(e.id) === Number(mat.estoqueId));
    if (estProd) {
      estProd.qtd = Number((estProd.qtd - mat.qtd).toFixed(2));
    }
  });

  req.status = 'baixada';

  salvarEstoque(false);
  renderizarEstoque();
  renderizarCamposDobras();
  renderizarItensFormRequisicao();
  salvarRequisicoesStorage();
  renderizarListaRequisicoes();

  alert('Baixa confirmada! Todos os materiais foram descontados do estoque.');
}

function estornarRequisicao(reqId) {
  const req = requisicoes.find(r => r.id === reqId);
  if (!req || req.status !== 'baixada') return;

  if (!confirm('Deseja estornar esta requisição e devolver os materiais para o saldo do estoque?')) return;

  req.materiais.forEach(mat => {
    const estProd = estoque.find(e => Number(e.id) === Number(mat.estoqueId));
    if (estProd) {
      estProd.qtd = Number((estProd.qtd + mat.qtd).toFixed(2));
    }
  });

  req.status = 'pendente';

  salvarEstoque(false);
  renderizarEstoque();
  renderizarCamposDobras();
  renderizarItensFormRequisicao();
  salvarRequisicoesStorage();
  renderizarListaRequisicoes();

  alert('Estorno realizado! Os materiais voltaram para o estoque.');
}

function excluirRequisicao(reqId) {
  const req = requisicoes.find(r => r.id === reqId);
  if (!req) return;

  if (req.status === 'baixada') {
    alert('Esta requisição já foi baixada no estoque. Clique em "Estornar" primeiro se quiser devolver os materiais antes de excluir.');
    return;
  }

  if (!confirm('Tem certeza que deseja excluir esta requisição pendente?')) return;

  requisicoes = requisicoes.filter(r => r.id !== reqId);
  salvarRequisicoesStorage();
  renderizarListaRequisicoes();
}

function imprimirOrdemSeparacao(reqId) {
  const req = requisicoes.find(r => r.id === reqId);
  if (!req) return;

  const numFormatado = String(req.numero).padStart(3, '0');
  const dataFormatada = req.data.split('-').reverse().join('/');

  let linhas = '';
  req.materiais.forEach(m => {
    linhas += `
      <tr>
        <td style="text-align: center; width: 50px;">[ &nbsp; ]</td>
        <td>${m.nomeItem}</td>
        <td style="width: 150px;"><strong>${m.qtd} ${m.unidade}</strong></td>
      </tr>
    `;
  });

  const sheet = document.getElementById('areaImpressaoRequisicao');
  sheet.innerHTML = `
    <div style="border: 2px solid #1c3d5a; padding: 20px; border-radius: 6px;">
      <h2 style="color: #1c3d5a; margin-bottom: 5px;">ORDEM DE SEPARAÇÃO DE MATERIAIS — #${numFormatado}</h2>
      <p style="font-size: 13px; color: #475569; margin-bottom: 15px;">JESFER Calhas e Rufos — Controle Interno de Galpão</p>
      
      <div style="background: #f8fafc; padding: 12px; border: 1px solid #cbd5e1; margin-bottom: 15px; font-size: 14px; line-height: 1.6;">
        <strong>Obra / Cliente:</strong> ${req.obra}<br>
        <strong>Data de Saída:</strong> ${dataFormatada} &nbsp;|&nbsp; <strong>Responsável:</strong> ${req.responsavel}<br>
        ${req.obs ? `<strong>Observações:</strong> ${req.obs}` : ''}
      </div>

      <table class="req-tabela-itens">
        <thead>
          <tr>
            <th style="text-align: center;">OK</th>
            <th>Descrição do Material / Insumo</th>
            <th>Quantidade</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>

      <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px;">
        <div style="border-top: 1px solid #000; width: 45%; padding-top: 5px; text-align: center;">Assinatura Conferente (Galpão)</div>
        <div style="border-top: 1px solid #000; width: 45%; padding-top: 5px; text-align: center;">Assinatura Instalador (${req.responsavel})</div>
      </div>
    </div>
  `;

  document.body.classList.add('imprimindo-requisicao');
  window.print();
  document.body.classList.remove('imprimindo-requisicao');
}

// =========================================================================
// 4. CONTROLE DE ESTOQUE
// =========================================================================
function renderizarEstoque() {
  const container = document.getElementById('estoqueContainer');
  container.innerHTML = '';

  estoque.forEach((prod, index) => {
    const item = document.createElement('div');
    item.className = `estoque-item ${prod.qtd <= 5 ? 'estoque-baixo' : ''}`;

    const divItem = document.createElement('div');
    const labelItem = document.createElement('label');
    labelItem.textContent = 'Descrição do Material:';
    const inputItem = document.createElement('input');
    inputItem.type = 'text';
    inputItem.value = prod.item;
    inputItem.oninput = (e) => {
      estoque[index].item = e.target.value;
      salvarEstoque(false);
      renderizarCamposDobras();
      renderizarItensFormRequisicao();
    };
    divItem.append(labelItem, inputItem);

    const divQtd = document.createElement('div');
    const labelQtd = document.createElement('label');
    labelQtd.textContent = 'Saldo Atual:';
    const inputQtd = document.createElement('input');
    inputQtd.type = 'number';
    inputQtd.step = '0.1';
    inputQtd.value = prod.qtd;
    inputQtd.oninput = (e) => {
      estoque[index].qtd = parseFloat(e.target.value) || 0;
      salvarEstoque(false);
      renderizarItensFormRequisicao();
    };
    divQtd.append(labelQtd, inputQtd);

    const divUnidade = document.createElement('div');
    const labelUnidade = document.createElement('label');
    labelUnidade.textContent = 'Unidade:';
    const inputUnidade = document.createElement('input');
    inputUnidade.type = 'text';
    inputUnidade.value = prod.unidade;
    inputUnidade.oninput = (e) => {
      estoque[index].unidade = e.target.value;
      salvarEstoque(false);
      renderizarCamposDobras();
      renderizarItensFormRequisicao();
    };
    divUnidade.append(labelUnidade, inputUnidade);

    const divBtn = document.createElement('div');
    divBtn.className = 'btn-remove-container';
    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn-remove';
    btnRemove.textContent = 'Remover';
    btnRemove.onclick = () => removerItemEstoque(index);
    divBtn.appendChild(btnRemove);

    item.append(divItem, divQtd, divUnidade, divBtn);
    container.appendChild(item);
  });
}

function adicionarItemEstoque() {
  estoque.push({ id: Date.now(), item: "Novo Material", qtd: 0, unidade: "Unidades" });
  renderizarEstoque();
  salvarEstoque(false);
  renderizarCamposDobras();
  renderizarItensFormRequisicao();
}

function removerItemEstoque(index) {
  if (!confirm('Deseja remover este material do estoque?')) return;
  estoque.splice(index, 1);
  renderizarEstoque();
  salvarEstoque(false);
  renderizarCamposDobras();
  renderizarItensFormRequisicao();
}

function salvarEstoque(mostrarAlerta = false) {
  localStorage.setItem('jesfer_estoque_v2', JSON.stringify(estoque));
  const badge = document.getElementById('statusEstoque');
  badge.textContent = 'Salvo agora ✓';
  setTimeout(() => { badge.textContent = 'Salvo automaticamente'; }, 2000);

  if (mostrarAlerta) alert('Estoque atualizado com sucesso!');
}

// --- INICIALIZAÇÃO DO SISTEMA ---
document.getElementById('reqData').valueAsDate = new Date();
renderizarCamposDobras();
adicionarItemObra();
adicionarItemFormRequisicao();
renderizarListaRequisicoes();
renderizarEstoque();