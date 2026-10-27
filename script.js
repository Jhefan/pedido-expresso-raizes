const cardapioLojas = {
  recife: {
    aviso: "Oferta Recife: Pontos em dobro no combo Cuscuz + Café!",
    pratos: [
      { id: 1, nome: "CUSCUZ + CAFÉ", preco: 18.00, padrao: true },
      { id: 2, nome: "TAPIOCA DE QUEIJO", preco: 12.00, padrao: false },
      { id: 3, nome: "BOLO DE MACAXEIRA", preco: 20.00, padrao: false }
    ]
  },
  olinda: {
    aviso: "Unidade Expressa Olinda: Cardápio rápido para viagem.",
    pratos: [
      { id: 4, nome: "CUSCUZ + CAFÉ", preco: 18.00, padrao: false },
      { id: 5, nome: "TAPIOCA DE QUEIJO COALHO", preco: 14.00, padrao: true },
      { id: 6, nome: "SUCO DE CAJU (300ml)", preco: 9.00, padrao: false }
    ]
  },
  caruaru: {
    aviso: "Especial São João Caruaru: Pratos típicos liberados!",
    pratos: [
      { id: 7, nome: "COMBO SÃO JOÃO (CANJICA + CAFÉ)", preco: 22.00, padrao: true },
      { id: 8, nome: "PAMONHA TRADICIONAL", preco: 15.00, padrao: false },
      { id: 9, nome: "BOLO DE MILHO CASEIRO", preco: 18.00, padrao: false }
    ]
  }
};

const selectLoja = document.getElementById("select-loja");
const boxCampanha = document.getElementById("box-campanha");
const containerItens = document.getElementById("container-itens");
const valorFinal = document.getElementById("valor-final");
const msgFidelidade = document.getElementById("msg-fidelidade");
const inputCpf = document.getElementById("input-cpf");
const chkLgpd = document.getElementById("chk-lgpd");
const selectStatusApi = document.getElementById("select-status-api");
const btnFinalizar = document.getElementById("btn-finalizar");
const retornoPagamento = document.getElementById("retorno-pagamento");
const stepRecebido = document.getElementById("step-recebido");
const stepPronto = document.getElementById("step-pronto");
const ticketRetirada = document.getElementById("ticket-retirada");
const barraPrivacidade = document.getElementById("barra-privacidade");
const btnFecharLgpd = document.getElementById("btn-fechar-lgpd");

let timerPreparo = null;

function formatarMoeda(valor) {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

function aplicarMascaraCpf(evento) {
  let digitos = evento.target.value.replace(/\D/g, "");
  if (digitos.length > 11) digitos = digitos.slice(0, 11);

  digitos = digitos.replace(/(\d{3})(\d)/, "$1.$2");
  digitos = digitos.replace(/(\d{3})(\d)/, "$1.$2");
  digitos = digitos.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  evento.target.value = digitos;
  atualizarResumo();
}

function carregarCardapioUnidade() {
  const lojaEscolhida = selectLoja.value;
  const dados = cardapioLojas[lojaEscolhida];

  boxCampanha.textContent = dados.aviso;
  containerItens.innerHTML = "";

  dados.pratos.forEach((prato) => {
    const itemLabel = document.createElement("label");
    itemLabel.className = "linha-produto";

    itemLabel.innerHTML = `
      <span>
        <input type="checkbox" class="item-check" data-preco="${prato.preco}" ${prato.padrao ? "checked" : ""}>
        ${prato.nome}
      </span>
      <strong>${formatarMoeda(prato.preco)}</strong>
    `;

    itemLabel.querySelector("input").addEventListener("change", atualizarResumo);
    containerItens.appendChild(itemLabel);
  });

  retornoPagamento.className = "box-mensagem";
  atualizarResumo();
}

function atualizarResumo() {
  const marcados = document.querySelectorAll(".item-check:checked");
  let soma = 0;

  marcados.forEach((item) => {
    soma += parseFloat(item.getAttribute("data-preco"));
  });

  const cpfLimpo = inputCpf.value.replace(/\D/g, "");
  const aceitouTermo = chkLgpd.checked;

  // Regra RF06 e RF10: 10% de desconto apenas com CPF valido + aceite LGPD
  if (cpfLimpo.length === 11 && aceitouTermo && soma > 0) {
    const valorDesconto = soma * 0.10;
    soma -= valorDesconto;
    msgFidelidade.textContent = `Desconto fidelidade aplicado: -${formatarMoeda(valorDesconto)}`;
  } else if (cpfLimpo.length > 0 && !aceitouTermo) {
    msgFidelidade.textContent = "Marque o aceite da LGPD no Passo 3 para ativar o desconto.";
  } else {
    msgFidelidade.textContent = "Preencha o CPF e aceite os termos para ganhar 10% de desconto.";
  }

  valorFinal.textContent = `Total a Pagar: ${formatarMoeda(soma)}`;
}

function enviarPedido() {
  const marcados = document.querySelectorAll(".item-check:checked");
  const cpfLimpo = inputCpf.value.replace(/\D/g, "");
  const aceitouTermo = chkLgpd.checked;

  if (timerPreparo) clearTimeout(timerPreparo);

  if (marcados.length === 0) {
    retornoPagamento.className = "box-mensagem msg-erro";
    retornoPagamento.textContent = "Selecione ao menos um item no cardápio para continuar.";
    return;
  }

  if (cpfLimpo.length > 0 && cpfLimpo.length < 11) {
    retornoPagamento.className = "box-mensagem msg-erro";
    retornoPagamento.textContent = "O CPF informado está incompleto. Confira os 11 dígitos.";
    return;
  }

  if (cpfLimpo.length === 11 && !aceitouTermo) {
    retornoPagamento.className = "box-mensagem msg-erro";
    retornoPagamento.textContent = "Bloqueio LGPD: É necessário aceitar os termos para usar o CPF no pedido.";
    return;
  }

  if (selectStatusApi.value === "recusado") {
    retornoPagamento.className = "box-mensagem msg-erro";
    retornoPagamento.textContent = "Transação recusada pela operadora. Tente novamente.";
    stepRecebido.textContent = "( ) RECEBIDO";
    stepPronto.textContent = "( ) PRONTO";
    ticketRetirada.textContent = "";
    return;
  }

  retornoPagamento.className = "box-mensagem msg-sucesso";
  retornoPagamento.textContent = "Pagamento confirmado! Seu pedido entrou em preparo.";
  stepRecebido.textContent = "(●) RECEBIDO";
  stepPronto.textContent = "( ) PRONTO";

  const senha = Math.floor(100 + Math.random() * 900);
  ticketRetirada.textContent = `Ficha de retirada: #RN-${senha} (Na cozinha...)`;

  timerPreparo = setTimeout(() => {
    stepRecebido.textContent = "( ) RECEBIDO";
    stepPronto.textContent = "(●) PRONTO";
    ticketRetirada.textContent = `Ficha de retirada: #RN-${senha} — PRONTO NO BALCÃO!`;
  }, 3000);
}

selectLoja.addEventListener("change", carregarCardapioUnidade);
inputCpf.addEventListener("input", aplicarMascaraCpf);
chkLgpd.addEventListener("change", atualizarResumo);
btnFinalizar.addEventListener("click", enviarPedido);

btnFecharLgpd.addEventListener("click", () => {
  barraPrivacidade.style.display = "none";
});

carregarCardapioUnidade();