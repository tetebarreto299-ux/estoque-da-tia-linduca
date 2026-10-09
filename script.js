
const CHAVE_PRODUTOS = "estoqueMamaeV1";
const CHAVE_VENDAS = "estoqueMamaeVendasV1";

const dinheiro = valor =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const lerProdutos = () => {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_PRODUTOS) || "[]");
    return Array.isArray(dados) ? dados.map(p => ({
      ...p,
      custo: Number(p.custo ?? 0),
      preco: Number(p.preco ?? 0),
      quantidade: Math.max(0, Number(p.quantidade) || 0)
    })) : [];
  } catch {
    return [];
  }
};

const lerVendas = () => {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_VENDAS) || "[]");
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
};

let produtos = lerProdutos();
let vendas = lerVendas();
let carrinho = [];

const porId = id => produtos.find(p => String(p.id) === String(id));

function salvarProdutos() {
  localStorage.setItem(CHAVE_PRODUTOS, JSON.stringify(produtos));
}

function salvarVendas() {
  localStorage.setItem(CHAVE_VENDAS, JSON.stringify(vendas));
}

function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, caractere => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caractere]);
}

function dataLocal(data) {
  return new Date(data).toLocaleString("pt-BR");
}

function inicioDoDia(data = new Date()) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function vendasDoDia(data = new Date()) {
  const inicio = inicioDoDia(data);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  return vendas.filter(v => {
    const dataVenda = new Date(v.data);
    return dataVenda >= inicio && dataVenda < fim;
  });
}

function vendasDoPeriodo(periodo) {
  const agora = new Date();
  let inicio = inicioDoDia(agora);

  if (periodo === "semana") {
    const diaSemana = (inicio.getDay() + 6) % 7;
    inicio.setDate(inicio.getDate() - diaSemana);
  } else if (periodo === "mes") {
    inicio.setDate(1);
  } else if (periodo === "todos") {
    return [...vendas];
  }

  return vendas.filter(v => new Date(v.data) >= inicio);
}

// Navegação entre as telas
document.querySelectorAll(".aba").forEach(botao => {
  botao.addEventListener("click", () => {
    document.querySelectorAll(".aba").forEach(aba =>
      aba.classList.remove("ativa")
    );
    document.querySelectorAll(".tela").forEach(tela =>
      tela.classList.remove("ativa")
    );

    botao.classList.add("ativa");
    document.getElementById(botao.dataset.tela).classList.add("ativa");

    atualizarTudo();
  });
});

// Cadastro e edição de produtos
const formProduto = document.getElementById("formProduto");

formProduto.addEventListener("submit", evento => {
  evento.preventDefault();

  const id = document.getElementById("produtoId").value;
  const nome = document.getElementById("nomeProduto").value.trim();
  const sabor = document.getElementById("saborProduto").value.trim();
  const custo = Number(document.getElementById("custoProduto").value);
  const preco = Number(document.getElementById("precoProduto").value);
  const quantidade = Number(document.getElementById("quantidadeProduto").value);

  if (!nome || custo < 0 || preco <= 0 ||
      !Number.isFinite(custo) || !Number.isFinite(preco) ||
      !Number.isInteger(quantidade) || quantidade < 0) {
    alert("Confira os dados. O preço deve ser maior que zero e a quantidade deve ser um número inteiro não negativo.");
    return;
  }

  if (id) {
    const produto = porId(id);
    if (!produto) {
      alert("Produto não encontrado.");
      return;
    }

    produto.nome = nome;
    produto.sabor = sabor;
    produto.custo = custo;
    produto.preco = preco;
    produto.quantidade = quantidade;
  } else {
    produtos.push({
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      nome,
      sabor,
      custo,
      preco,
      quantidade
    });
  }

  salvarProdutos();
  formProduto.reset();
  document.getElementById("produtoId").value = "";
  document.getElementById("botaoSalvarProduto").textContent = "Cadastrar produto";
  document.getElementById("cancelarEdicao").hidden = true;

  atualizarTudo();
  alert(id ? "Produto atualizado!" : "Produto cadastrado!");
});

document.getElementById("cancelarEdicao").addEventListener("click", () => {
  formProduto.reset();
  document.getElementById("produtoId").value = "";
  document.getElementById("botaoSalvarProduto").textContent = "Cadastrar produto";
  document.getElementById("cancelarEdicao").hidden = true;
});

function editarProduto(id) {
  const p = porId(id);
  if (!p) return;

  document.getElementById("produtoId").value = p.id;
  document.getElementById("nomeProduto").value = p.nome || "";
  document.getElementById("saborProduto").value = p.sabor || "";
  document.getElementById("custoProduto").value = p.custo;
  document.getElementById("precoProduto").value = p.preco;
  document.getElementById("quantidadeProduto").value = p.quantidade;
  document.getElementById("botaoSalvarProduto").textContent = "Salvar alterações";
  document.getElementById("cancelarEdicao").hidden = false;

  mostrarTela("produtos");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function excluirProduto(id) {
  const produto = porId(id);
  if (!produto) return;

  const usadoNoCarrinho = carrinho.some(item => String(item.id) === String(id));
  if (usadoNoCarrinho) {
    alert("Remova esse produto do pedido atual antes de excluí-lo.");
    return;
  }

  const confirmado = confirm(`Deseja excluir "${produto.nome}"? Os pedidos antigos serão preservados.`);
  if (!confirmado) return;

  produtos = produtos.filter(p => String(p.id) !== String(id));
  salvarProdutos();
  atualizarTudo();
}

function mostrarTela(nome) {
  document.querySelectorAll(".aba").forEach(aba => {
    aba.classList.toggle("ativa", aba.dataset.tela === nome);
  });
  document.querySelectorAll(".tela").forEach(tela => {
    tela.classList.toggle("ativa", tela.id === nome);
  });
}

document.getElementById("buscarProduto").addEventListener("input", renderProdutos);

function renderProdutos() {
  const busca = document.getElementById("buscarProduto").value
    .trim().toLowerCase();

  const encontrados = produtos.filter(p =>
    `${p.nome} ${p.sabor || ""}`.toLowerCase().includes(busca)
  );

  const destino = document.getElementById("listaProdutos");

  if (!encontrados.length) {
    destino.innerHTML = '<p class="lista-vazia">Nenhum produto encontrado.</p>';
    return;
  }

  destino.innerHTML = `
    <div class="tabela-rolagem">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Custo</th>
            <th>Venda</th>
            <th>Lucro bruto/un.</th>
            <th>Estoque</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${encontrados.map(p => `
            <tr>
              <td>
                <strong>${escapar(p.nome)}</strong>
                <span class="subtexto">${escapar(p.sabor || "")}</span>
              </td>
              <td>${dinheiro(p.custo)}</td>
              <td>${dinheiro(p.preco)}</td>
              <td>${dinheiro(p.preco - p.custo)}</td>
              <td>
                <span class="status ${p.quantidade <= 3 ? "baixo" : ""}">
                  ${p.quantidade} un.
                </span>
              </td>
              <td>
                <div class="linha-acoes">
                  <button class="botao secundario pequeno" data-editar="${escapar(p.id)}">Editar</button>
                  <button class="botao perigo pequeno" data-excluir="${escapar(p.id)}">Excluir</button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  destino.querySelectorAll("[data-editar]").forEach(botao => {
    botao.addEventListener("click", () => editarProduto(botao.dataset.editar));
  });

  destino.querySelectorAll("[data-excluir]").forEach(botao => {
    botao.addEventListener("click", () => excluirProduto(botao.dataset.excluir));
  });
}

// Seleção de produtos para o pedido
function renderOpcoesProdutos() {
  const select = document.getElementById("produtoPedido");
  const valorAnterior = select.value;

  select.innerHTML = '<option value="">Selecione um produto</option>';

  produtos.filter(p => p.quantidade > 0).forEach(p => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = `${p.nome}${p.sabor ? " - " + p.sabor : ""} | ${dinheiro(p.preco)} | Estoque: ${p.quantidade}`;
    select.appendChild(option);
  });

  if (porId(valorAnterior)?.quantidade > 0) {
    select.value = valorAnterior;
  }
}

document.getElementById("adicionarItem").addEventListener("click", () => {
  const id = document.getElementById("produtoPedido").value;
  const quantidade = Number(document.getElementById("quantidadePedido").value);
  const produto = porId(id);

  if (!produto) {
    alert("Selecione um produto.");
    return;
  }

  if (!Number.isInteger(quantidade) || quantidade < 1) {
    alert("Informe uma quantidade inteira maior que zero.");
    return;
  }

  const jaNoCarrinho = carrinho
    .filter(item => String(item.id) === String(id))
    .reduce((total, item) => total + item.quantidade, 0);

  if (jaNoCarrinho + quantidade > produto.quantidade) {
    alert(`Estoque insuficiente. Disponível: ${produto.quantidade - jaNoCarrinho} unidade(s).`);
    return;
  }

  carrinho.push({
    id: produto.id,
    nome: produto.nome,
    sabor: produto.sabor || "",
    quantidade,
    precoUnitario: produto.preco,
    custoUnitario: produto.custo
  });

  document.getElementById("quantidadePedido").value = 1;
  renderCarrinho();
});

function renderCarrinho() {
  const destino = document.getElementById("itensPedido");

  if (!carrinho.length) {
    destino.innerHTML = '<p class="lista-vazia">Nenhum item adicionado.</p>';
  } else {
    destino.innerHTML = carrinho.map((item, indice) => `
      <div class="item-pedido">
        <div>
          <strong>${escapar(item.nome)}</strong>
          <small>${item.quantidade} × ${dinheiro(item.precoUnitario)}</small>
        </div>
        <div>
          <strong>${dinheiro(item.quantidade * item.precoUnitario)}</strong>
          <button type="button" class="botao perigo pequeno" data-remover-item="${indice}">
            Remover
          </button>
        </div>
      </div>
    `).join("");

    destino.querySelectorAll("[data-remover-item]").forEach(botao => {
      botao.addEventListener("click", () => {
        carrinho.splice(Number(botao.dataset.removerItem), 1);
        renderCarrinho();
      });
    });
  }

  const total = carrinho.reduce(
    (soma, item) => soma + item.quantidade * item.precoUnitario, 0
  );

  document.getElementById("totalPedido").textContent = dinheiro(total);
}

document.getElementById("finalizarPedido").addEventListener("click", () => {
  if (!carrinho.length) {
    alert("Adicione pelo menos um produto ao pedido.");
    return;
  }

  // Conferir o estoque novamente antes de confirmar a venda.
  for (const item of carrinho) {
    const produto = porId(item.id);
    const quantidadeNoPedido = carrinho
      .filter(i => String(i.id) === String(item.id))
      .reduce((soma, i) => soma + i.quantidade, 0);

    if (!produto || produto.quantidade < quantidadeNoPedido) {
      alert(`Estoque insuficiente para "${item.nome}". Confira o pedido.`);
      return;
    }
  }

  const total = carrinho.reduce(
    (soma, item) => soma + item.quantidade * item.precoUnitario, 0
  );

  const confirmado = confirm(`Confirmar venda no valor de ${dinheiro(total)}?`);
  if (!confirmado) return;

  const pedido = {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    data: new Date().toISOString(),
    pagamento: document.getElementById("formaPagamento").value,
    observacao: document.getElementById("observacaoPedido").value.trim(),
    itens: carrinho.map(item => ({ ...item })),
    total
  };

  // Reduzir o estoque uma vez por produto.
  const quantidades = {};
  carrinho.forEach(item => {
    quantidades[item.id] = (quantidades[item.id] || 0) + item.quantidade;
  });

  Object.entries(quantidades).forEach(([id, quantidade]) => {
    porId(id).quantidade -= quantidade;
  });

  vendas.unshift(pedido);
  salvarProdutos();
  salvarVendas();

  carrinho = [];
  document.getElementById("observacaoPedido").value = "";
  renderCarrinho();
  atualizarTudo();

  alert("Venda registrada! O estoque foi atualizado.");
});

function totalVenda(venda) {
  if (Number.isFinite(Number(venda.total))) return Number(venda.total);

  return (venda.itens || []).reduce(
    (soma, item) => soma + Number(item.quantidade || 0) * Number(item.precoUnitario ?? item.preco ?? 0),
    0
  );
}

function custoVenda(venda) {
  return (venda.itens || []).reduce(
    (soma, item) => soma + Number(item.quantidade || 0) * Number(item.custoUnitario || 0),
    0
  );
}

function renderHistorico(lista, destinoId) {
  const destino = document.getElementById(destinoId);

  if (!lista.length) {
    destino.innerHTML = '<p class="lista-vazia">Nenhum pedido neste período.</p>';
    return;
  }

  destino.innerHTML = `
    <div class="tabela-rolagem">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Itens</th>
            <th>Pagamento</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(v => `
            <tr>
              <td>${dataLocal(v.data)}</td>
              <td>${(v.itens || []).map(item =>
                `${escapar(item.nome)} × ${Number(item.quantidade || 0)}`
              ).join("<br>")}</td>
              <td>${escapar(v.pagamento || "Não informado")}</td>
              <td><strong>${dinheiro(totalVenda(v))}</strong>
                ${v.observacao ? `<span class="subtexto">${escapar(v.observacao)}</span>` : ""}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function atualizarPainel() {
  document.getElementById("totalProdutos").textContent = produtos.length;

  document.getElementById("totalUnidades").textContent =
    produtos.reduce((soma, p) => soma + p.quantidade, 0);

  document.getElementById("valorEstoque").textContent = dinheiro(
    produtos.reduce((soma, p) => soma + p.custo * p.quantidade, 0)
  );

  document.getElementById("vendasHoje").textContent = dinheiro(
    vendasDoDia().reduce((soma, v) => soma + totalVenda(v), 0)
  );

  const baixos = produtos.filter(p => p.quantidade <= 3);
  document.getElementById("estoqueBaixo").innerHTML = baixos.length
    ? baixos.map(p => `
        <p><strong>${escapar(p.nome)}</strong> — ${p.quantidade} unidade(s)</p>
      `).join("")
    : "Nenhum produto com estoque baixo.";

  renderHistorico(vendas.slice(0, 5), "ultimosPedidos");
}

function atualizarRelatorios() {
  const periodo = document.getElementById("periodoRelatorio").value;
  const lista = vendasDoPeriodo(periodo);

  const faturamento = lista.reduce((soma, v) => soma + totalVenda(v), 0);
  const custo = lista.reduce((soma, v) => soma + custoVenda(v), 0);
  const lucro = faturamento - custo;

  document.getElementById("relatorioPedidos").textContent = lista.length;
  document.getElementById("relatorioFaturamento").textContent = dinheiro(faturamento);
  document.getElementById("relatorioCusto").textContent = dinheiro(custo);
  document.getElementById("relatorioLucro").textContent = dinheiro(lucro);

  const pagamentos = {};
  lista.forEach(v => {
    const forma = v.pagamento || "Não informado";
    pagamentos[forma] = (pagamentos[forma] || 0) + totalVenda(v);
  });

  const destinoPagamentos = document.getElementById("relatorioPagamentos");
  const formas = Object.entries(pagamentos);

  destinoPagamentos.innerHTML = formas.length
    ? formas.map(([forma, valor]) => `
        <div class="item-pedido">
          <span>${escapar(forma)}</span>
          <strong>${dinheiro(valor)}</strong>
        </div>
      `).join("")
    : '<p class="lista-vazia">Ainda não há vendas neste período.</p>';

  renderHistorico(lista, "relatorioLista");
}

document.getElementById("periodoRelatorio").addEventListener("change", atualizarRelatorios);

function atualizarTudo() {
  salvarProdutos();
  renderProdutos();
  renderOpcoesProdutos();
  atualizarPainel();
  atualizarRelatorios();
  renderCarrinho();
}

atualizarTudo();