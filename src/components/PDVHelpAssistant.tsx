import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  HelpCircle, 
  Search, 
  Sparkles, 
  Send, 
  RotateCcw, 
  X, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  CheckCircle2, 
  ShieldAlert, 
  Barcode, 
  ShoppingCart, 
  PackagePlus, 
  DollarSign, 
  KeyRound, 
  Bot,
  User,
  Loader2,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ai } from "../App";

export interface PDVHelpItem {
  id: string;
  category: "comecar" | "agenda" | "precificacao" | "caixa" | "oficina" | "papelaria" | "produtos" | "vendas" | "seguranca" | "reset";
  title: string;
  shortDesc: string;
  detailedSteps: string[];
  tips?: string;
  keywords: string[];
}

export const PDV_KNOWLEDGE_BASE: PDVHelpItem[] = [
  {
    id: "notificacao-vencimento-vermelho",
    category: "agenda",
    title: "Como funciona a notificação em vermelho de vencimento de pagamentos?",
    shortDesc: "Alertas visuais em vermelho para boletos, faturas de fornecedores e contas vencidas ou vencendo hoje.",
    detailedSteps: [
      "1. Sempre que houver um pagamento vencido ou vencendo na data de hoje, o sistema exibe automaticamente um banner vermelho pulsante com o ícone de sino 🚨 'ATENÇÃO: PAGAMENTOS VENCIDOS OU VENCENDO HOJE!'.",
      "2. O banner mostra em destaque o nome da conta, o fornecedor e o valor em Reais (R$), permitindo ver imediatamente o que está pendente sem ter que procurar.",
      "3. Cada conta urgente possui o botão 'Enviar Lembrete 📲' (abre o WhatsApp já com a mensagem pronta de cobrança ou aviso de quitação) e o botão 'Copiar Lembrete 📋' para colar onde quiser.",
      "4. No Gaveteiro de Pastas, a aba 'Contas & Fornec.' e as pastas correspondentes exibem uma bolinha vermelha pulsante e a quantidade de pendências urgentes.",
      "5. Ao pagar a conta, basta clicar no botão 'Pago ✓' e o alerta vermelho desaparece na mesma hora!"
    ],
    tips: "Você pode clicar diretamente em 'Ver Todas as Contas Urgentes' para filtrar a lista e pagar primeiro o que tem juros ou multa.",
    keywords: ["vencimento", "vermelho", "alerta", "notificacao", "boleto", "fornecedor", "pagar conta", "hoje", "atrasado", "urgente", "lembrete"]
  },
  {
    id: "anotar-compromissos-agenda",
    category: "agenda",
    title: "Como anotar faturas de fornecedores e contas na Agenda?",
    shortDesc: "Cadastre contas a pagar, boletos de fornecedores ou valores a receber com data, valor e código de barras/PIX.",
    detailedSteps: [
      "1. Acesse a aba 'Agenda & Vencimentos 📅' (ou clique no botão verde '+ Conta / Fatura' no Gaveteiro de Pastas).",
      "2. Clique no botão '+ Anotar Pagamento / Conta 📝'.",
      "3. Use os atalhos rápidos com 1 toque (ex: 'Fatura Fornecedor', 'Boleto Distribuidora', 'Luz Comercial', 'Aluguel do Ponto') ou digite o título da conta.",
      "4. Informe o Fornecedor / Empresa (ex: Ambev, CEASA, Dono do Imóvel, Enel).",
      "5. Digite o Valor em R$ e a Data de Vencimento.",
      "6. Escolha a Pasta Organizadora (ex: 'Fornecedores', 'Boletos', 'Contas Fixas', 'Pagamentos' ou crie uma pasta nova com seu próprio nome).",
      "7. Opcional: Cole o Código de Barras do boleto ou a Chave PIX para não ter que procurar na hora de pagar.",
      "8. Clique em 'Salvar na Agenda 💾'. Pronto! O sistema monitora a data e avisa quando chegar o dia."
    ],
    tips: "Você pode filtrar suas contas por: Todas, A Pagar, Vencidas, Pagas ou A Receber.",
    keywords: ["anotar", "agenda", "fornecedor", "fatura", "conta", "boleto", "cadastrar conta", "salvar", "pix", "codigo de barras"]
  },
  {
    id: "gaveteiro-pastas-pagamentos",
    category: "agenda",
    title: "Como organizar contas e boletos no Gaveteiro de Pastas?",
    shortDesc: "Separe faturas por pastas personalizadas, busque por fornecedor e controle comprovantes.",
    detailedSteps: [
      "1. Vá na aba 'Pastas & Arquivos 🗂️' (Gaveteiro Digital).",
      "2. Clique na aba 'Contas & Fornec. 💳' para ver suas pastas financeiras.",
      "3. As pastas padrão já vêm configuradas: 'Fornecedores', 'Boletos', 'Contas Fixas', 'Pagamentos' e 'Geral'.",
      "4. Para criar uma nova pasta: Clique no botão '+ Nova Pasta' no topo, digite o nome (ex: 'Reforma', 'Mercadorias Bebidas') e salve.",
      "5. Cada pasta mostra a quantidade de contas guardadas e o valor total somado em tempo real.",
      "6. Use o campo de busca para encontrar qualquer fornecedor pelo nome em segundos."
    ],
    tips: "Ao clicar em qualquer pasta, o sistema filtra apenas os boletos e notas correspondentes àquele assunto.",
    keywords: ["gaveteiro", "pastas", "organizar", "pasta fornecedor", "pasta boletos", "contas fixas", "arquivos", "separar"]
  },
  {
    id: "calculadora-precificacao-markup",
    category: "precificacao",
    title: "Como funciona a Calculadora de Precificação Comercial (Markup Inteligente)?",
    shortDesc: "Entenda por que a soma simples quebra o comércio e como usar a fórmula correta do markup.",
    detailedSteps: [
      "• O ERRO MAIS COMUM (Soma Simples): Se você compra um produto por R$ 10,00 e quer 30% de lucro, você acha que vender a R$ 13,00 dá 30%. Isso é FALSO! Pois se houver 15% de taxas de cartão e impostos sobre os R$ 13,00 (R$ 1,95), sobram apenas R$ 1,05 de lucro (menos de 8% real!).",
      "• A FÓRMULA CORRETA (Margem de Contribuição): O preço correto é calculado pelo divisor: Custo ÷ (1 - (Taxas% + Lucro%)).",
      "• Exemplo Prático: Custo R$ 10,00 + 15% de taxas + 35% de lucro = Preço de Venda Ideal R$ 20,00! Assim você paga todas as taxas e ainda coloca exatamente 35% limpos no bolso!",
      "• Custos Invisíveis que a Calculadora calcula: Frete rateado, sacola plástica, bobina da impressora, taxa da maquininha e perdas de validade.",
      "• Onde encontrar: Acesse a Calculadora de Precificação pelo Menu Lateral (Aba 7 > Calculadora de Precificação) ou pelo atalho rápido no topo."
    ],
    tips: "Use os presets prontos de produtos comuns (Arroz, Feijão, Óleo, Leite) para ver os custos invisíveis calculados na prática.",
    keywords: ["precificacao", "precipitacao", "markup", "margem", "lucro", "calcular preco", "custo", "taxa cartao", "preco de venda", "formula"]
  },
  {
    id: "contagem-cedulas-moedas-caixa",
    category: "caixa",
    title: "Como funciona a Contagem de Cédulas e Moedas na Abertura e Fechamento do Caixa?",
    shortDesc: "Preencha as caixinhas com a quantidade de notas de R$ 2, 5, 10, 20, 50, 100, 200 e moedas.",
    detailedSteps: [
      "1. Ao abrir o caixa ou no Controle de Caixa, clique na opção '2. Conferência de Cédulas (Blindagem) 🛡️' ou no botão 'Contador de Cédulas & Moedas 💵🪙'.",
      "2. Você verá caixinhas individuais para cada cédula em circulação:",
      "   - Cédulas: R$ 2,00 | R$ 5,00 | R$ 10,00 | R$ 20,00 | R$ 50,00 | R$ 100,00 | R$ 200,00.",
      "   - Moedas: R$ 0,05 | R$ 0,10 | R$ 0,25 | R$ 0,50 | R$ 1,00.",
      "3. Basta tocar na caixinha e digitar quantas notas você tem (ex: tem 5 notas de 20? Digite 5 e o sistema calcula R$ 100,00 automaticamente).",
      "4. Você também pode usar os botões (+) e (-) para aumentar ou diminuir sem precisar do teclado.",
      "5. O Total Físico da Gaveta é calculado em tempo real em tamanho grande verde.",
      "6. Clique em 'Confirmar e Abrir Caixa' para registrar a contagem oficial. Isso gera um comprovante para imprimir ou enviar no WhatsApp do dono, protegendo o funcionário contra quebras indevidas!"
    ],
    tips: "Ao tocar no campo, o número anterior é selecionado automaticamente para você digitar o novo valor sem ter que apagar o zero!",
    keywords: ["cedulas", "notas", "moedas", "contagem", "abertura de caixa", "nota de 2", "nota de 5", "nota de 10", "nota de 20", "nota de 50", "nota de 100", "contar dinheiro", "gaveta"]
  },
  {
    id: "tempo-servico-oficina-mecanica",
    category: "oficina",
    title: "Como calcular o Tempo de Serviço de Oficina Mecânica e Obras (Tempo é Dinheiro)?",
    shortDesc: "Descubra o valor mínimo de mão de obra para cobrir ajudantes, marmita, dias parados e custo fixo.",
    detailedSteps: [
      "1. Acesse pelo botão 'Oficina & Bar: Tempo é R$ ⏱️🍻' (ou no Menu Lateral em 'Oficina & Mão de Obra').",
      "2. Digite o Serviço Realizado (ex: 'Retífica de Motor', 'Troca de Embreagem', 'Pintura de Fachada').",
      "3. Informe o Valor Cobrado do Cliente (R$).",
      "4. Preencha os campos da obra / conserto:",
      "   - Quantos Dias Levou o serviço;",
      "   - Quantos Ajudantes trabalharam;",
      "   - Valor da Diária de cada ajudante;",
      "   - Custo com Marmita / Almoço por dia;",
      "   - Custo Fixo da Oficina por dia (aluguel do galpão, luz, ferramentas, compressor rateado);",
      "   - Lucro Limpo que o mestre/dono merece tirar por dia.",
      "5. O sistema faz o diagnóstico na hora: avisa se você teve LUCRO REAL ou se tomou PREJUÍZO DISFARÇADO (quando o valor cobrado não paga nem os ajudantes e o tempo da oficina ocupada)!",
      "6. A tela indica exatamente qual seria o 'Valor Mínimo Justo a Cobrar' para ter lucro garantido."
    ],
    tips: "Nunca cobre apenas pelo valor da peça: o tempo que o carro ou equipamento fica ocupando o elevador da oficina tem custo diário de aluguel e energia!",
    keywords: ["oficina", "mecanico", "tempo de servico", "tempo e dinheiro", "obra", "ajudante", "marmita", "diaria", "mao de obra", "conserto", "custo dia"]
  },
  {
    id: "taloes-papelaria-recibos",
    category: "papelaria",
    title: "Como usar os Talões e Modelos Oficiais de Papelaria (Promissória, Recibos e Orçamentos)?",
    shortDesc: "Emita notas promissórias jurídicas, recibos comerciais, recibos de aluguel e orçamentos timbrados.",
    detailedSteps: [
      "1. Acesse o módulo 'Talões & Papelaria 🧾' (ou no Menu Lateral em 'Talões de Papelaria & Recibos').",
      "2. Escolha o modelo comercial no Bazar de Papelaria:",
      "   - 📘 Nota Promissória Jurídica (com enquadramento no Código Civil ou Lei Uniforme de Genebra, valor por extenso automático e cláusula executiva);",
      "   - 📗 Recibo de Aluguel Oficial (com referência do mês, quitação de caução e endereço do imóvel);",
      "   - 📕 Recibo Comercial Geral (quitação de pagamentos, serviços ou compras);",
      "   - 📙 Orçamento Comercial (descrição detalhada de peças e mão de obra).",
      "3. Preencha os dados do Credor, Devedor, Valor e Vencimento.",
      "4. Assinatura: O cliente pode assinar direto na tela com o dedo ou caneta touch!",
      "5. Use a barra de pontuação rápida [. , - R$] para facilitar a escrita no celular.",
      "6. Clique em 'Imprimir Comprovante' para impressora térmica ou 'Gerar PDF / WhatsApp' para enviar ao cliente na hora."
    ],
    tips: "O valor por extenso é preenchido de forma 100% automática conforme você digita o valor em reais.",
    keywords: ["taloes", "papelaria", "recibo", "promissoria", "nota promissoria", "aluguel", "orcamento", "assinatura", "imprimir", "modelo"]
  },
  {
    id: "bar-doses-cachaca-chorinho",
    category: "precificacao",
    title: "Como precificar Doses de Cachaça 51 com 'Chorinho' e Baldes de Cerveja no Bar?",
    shortDesc: "Calcule a rentabilidade de garrafas de 960ml/1L com perda de chorinho e combos.",
    detailedSteps: [
      "1. Acesse a aba 'Bar, Doses de 51 & Baldes' dentro do módulo de Contabilidade & Bar.",
      "2. Informe o Custo da Garrafa (ex: R$ 15,00 a garrafa de 960ml de Cachaça 51 ou Velho Barreiro).",
      "3. Escolha o tamanho do copinho da dose (padrão 50 ml) e o 'Chorinho' que o garçom costuma servir a mais (ex: 5 ml).",
      "4. O sistema calcula quantas doses reais a garrafa rende (descontando o chorinho do cliente!).",
      "5. Digite o preço cobrado por dose (ex: R$ 3,00) e veja o Faturamento Total por Garrafa e o Lucro Bruto Percentual (frequentemente acima de 200%).",
      "6. Simulador de Balde de Cerveja: Calcule se vale a pena vender 'Compre 5 leve 6' ou combos promocionais com gelo."
    ],
    tips: "O 'chorinho' parece pouco, mas em 10 garrafas equivale a quase uma garrafa inteira de lucro jogada fora se não for precificada!",
    keywords: ["bar", "dose", "cachaca", "51", "chorinho", "balde", "cerveja", "copo", "garrafa", "rendimento"]
  },
  {
    id: "acougue-rendimento-carnes",
    category: "precificacao",
    title: "Como funciona a Calculadora de Desossa de Açougue e Rendimento de Carnes?",
    shortDesc: "Rateio de custos em carnes com osso, aparas de gordura, carne moída e quebra de peso.",
    detailedSteps: [
      "1. Ao comprar uma peça inteira com osso (ex: Traseiro ou Dianteiro bovino), o quilo custa um valor mais baixo, mas nem todo o peso é vendido como carne de primeira.",
      "2. Pese a peça bruta que chegou do frigorífico (ex: 50 kg).",
      "3. Pese o que virou cortes nobres (Picanha, Alcatra, Contrafilé), o que virou carne moída/segunda, e o que sobrou de osso e sebo (aparas).",
      "4. O módulo de Açougue divide os custos proporcionalmente: ele eleva o custo dos cortes nobres para que o osso descartado não gere prejuízo na ponta final!",
      "5. Assim você sabe exatamente qual o preço mínimo de cada corte na vitrine para fechar o lote no positivo."
    ],
    tips: "Descontar a perda hídrica (sangue e umidade) é fundamental para não errar a margem do açougue.",
    keywords: ["acougue", "carne", "desossa", "rendimento", "aparas", "osso", "frigorifico", "corte nobre", "quebra"]
  },
  {
    id: "zerar-dados-teste",
    category: "reset",
    title: "Como zerar o PDV e apagar dados de teste?",
    shortDesc: "Limpe todas as vendas e fundo de caixa de teste para começar do zero com o sistema limpo.",
    detailedSteps: [
      "1. Na barra superior do PDV, clique no botão roxo 'Proprietário & Permissões 👑' (ou na aba Gestão em 'Permissões & Equipe 🔑👑').",
      "2. Se solicitado, digite seu PIN de Proprietário para desbloquear o painel.",
      "3. Role a tela até a 'ZONA DE PERIGO: ZERAR TODO O SISTEMA ⚠️🧼' no final da página.",
      "4. Clique em 'Zerar Tudo (PIN do Proprietário)'.",
      "5. Confirme o aviso na tela. O sistema apagará vendas de teste e zerará o caixa, tanto no celular/PC quanto na nuvem!",
      "🔒 Seus outros dados (Bloco de Notas, Recibos, etc.) NÃO são apagados, ficam 100% preservados!"
    ],
    tips: "Use sempre que terminar de treinar funcionários ou fazer simulações de vendas antes de inaugurar a loja.",
    keywords: ["zerar", "limpar", "apagar", "reset", "reiniciar", "teste", "dados", "memoria", "comecar do zero", "fundo"]
  },
  {
    id: "zona-de-perigo",
    category: "seguranca",
    title: "O que é a Zona de Perigo e por que ela existe?",
    shortDesc: "Entenda o que faz a Zona de Perigo e por que ela é protegida por senha.",
    detailedSteps: [
      "A 'Zona de Perigo' é uma área exclusiva do dono do comércio para ações que não têm volta (irreversíveis).",
      "Ela foi colocada em destaque vermelho e com cadeado para que nenhum funcionário ou caixa aperte sem querer durante o trabalho.",
      "A principal função dela é o botão 'Zerar Tudo', que limpa todo o histórico de teste do caixa.",
      "Apenas quem souber o PIN mestre do Proprietário consegue acionar os botões dessa área."
    ],
    tips: "Não precisa ter medo: ela só é ativada se você digitar seu PIN e confirmar a mensagem de segurança.",
    keywords: ["zona de perigo", "perigo", "danger", "vermelho", "medo", "seguranca", "irreversivel", "senha dono"]
  },
  {
    id: "abrir-caixa",
    category: "caixa",
    title: "Como abrir o caixa no início do dia (Fundo de Troco)?",
    shortDesc: "Defina o valor inicial em moedas e notas para troco antes de começar a vender.",
    detailedSteps: [
      "1. Ao entrar no PDV com o caixa fechado, você verá a tela 'Abertura de Caixa Diária'.",
      "2. Digite o valor que você colocou na gaveta (exemplo: R$ 50,00 ou R$ 100,00 para troco).",
      "3. Clique no botão verde 'Abrir Novo Caixa 🌅'.",
      "4. Pronto! O caixa fica com o status '🟢 Caixa Aberto' e libera o registro de vendas."
    ],
    tips: "Mesmo que você comece com R$ 0,00, abra o caixa informando 0 para que os relatórios do dia fiquem organizados.",
    keywords: ["abrir caixa", "fundo de caixa", "troco", "abertura", "comecar dia", "iniciar", "turno", "gaveta"]
  },
  {
    id: "cadastrar-produto",
    category: "produtos",
    title: "Como cadastrar novos produtos no catálogo?",
    shortDesc: "Adicione itens com nome, preço de venda, custo, código de barras e foto.",
    detailedSteps: [
      "1. No PDV, vá na aba 'Catálogo & Carrinho' ou 'Estoque Inteligente'.",
      "2. Clique no botão '+ Novo Produto' ou 'Cadastrar Item'.",
      "3. Preencha o Nome do produto, Preço de Venda e Custo (para o sistema calcular seu lucro real).",
      "4. Opcional: Digite o Código de Barras (EAN) ou use a câmera para bipar a embalagem.",
      "5. Escolha a categoria/segmento e informe a quantidade inicial em estoque.",
      "6. Clique em 'Salvar Produto'. Ele aparecerá imediatamente na vitrine para vender!"
    ],
    tips: "Colocar o Preço de Custo ajuda o sistema a te mostrar o seu Lucro Líquido exato no final do dia.",
    keywords: ["cadastrar", "novo produto", "adicionar produto", "criar produto", "preco", "custo", "estoque", "item"]
  },
  {
    id: "excluir-retirar-produto",
    category: "produtos",
    title: "Como excluir ou desativar um produto do catálogo?",
    shortDesc: "Remova produtos que saíram de linha ou que foram cadastrados por engano.",
    detailedSteps: [
      "1. Vá na aba 'Estoque Inteligente' ou procure o produto na vitrine.",
      "2. Passe o mouse ou clique no produto para ver os detalhes.",
      "3. Clique no ícone da lixeira vermelha 🗑️ ('Excluir' ou 'Remover').",
      "4. Se a segurança de cargos estiver ativa, o sistema pedirá o PIN do Gerente ou Proprietário.",
      "5. Confirme a remoção. O item sairá da vitrine imediatamente."
    ],
    tips: "Se o produto apenas acabou momentaneamente, em vez de excluir, você pode zerar o estoque dele para manter o histórico.",
    keywords: ["excluir produto", "remover produto", "apagar produto", "tirar produto", "deletar", "desativar"]
  },
  {
    id: "leitor-codigo-barras",
    category: "vendas",
    title: "Como usar o leitor de código de barras (Bipador e Câmera)?",
    shortDesc: "Passe produtos rapidamente pelo código de barras usando pistola USB/Bluetooth ou câmera do celular.",
    detailedSteps: [
      "• Com Pistola / Leitor USB: Basta plugar no computador ou celular (com adaptador OTG). Ao bipar qualquer código de barras com a tela do PDV aberta, o item entra no carrinho na mesma hora!",
      "• Com a Câmera do Celular: Clique no botão com ícone de Câmera/Scanner (ou aperte a tecla F8 no teclado). Aponte para o código de barras da embalagem para bipar.",
      "• Pelo Teclado: No campo de busca, você também pode digitar os números do código de barras e apertar Enter."
    ],
    tips: "No computador ou notebook, use o atalho F8 para abrir o leitor instantaneamente sem usar o mouse.",
    keywords: ["codigo de barras", "leitor", "bipador", "scanner", "camera", "bipar", "pistola", "ean"]
  },
  {
    id: "fazer-venda-e-descontos",
    category: "vendas",
    title: "Como fazer uma venda, aplicar descontos e finalizar?",
    shortDesc: "Selecione os produtos, escolha o meio de pagamento e emita o comprovante.",
    detailedSteps: [
      "1. Clique nos produtos para colocar no carrinho (ou busque por nome/código).",
      "2. Ajuste a quantidade com os botões (+) e (-) se o cliente levar mais de um.",
      "3. Desconto: Você pode clicar no campo de desconto e digitar em Reais (R$) ou em Porcentagem (%) com total liberdade.",
      "4. Escolha a Forma de Pagamento: Dinheiro, Pix, Cartão de Débito, Cartão de Crédito ou Fiado.",
      "5. Se for Dinheiro, digite quanto o cliente entregou para a tela calcular o troco exato.",
      "6. Clique em 'Concluir Venda ✔️'. O estoque dará baixa automática e você poderá imprimir ou enviar o recibo pelo WhatsApp."
    ],
    tips: "No computador, você pode apertar F10 para concluir a venda direto pelo teclado.",
    keywords: ["vender", "concluir venda", "desconto", "porcentagem", "pagamento", "pix", "cartao", "dinheiro", "troco", "recibo"]
  },
  {
    id: "sangria-e-suprimento",
    category: "caixa",
    title: "O que é Sangria e Suprimento e como registrar?",
    shortDesc: "Lance retiradas de dinheiro ou adições de troco sem bagunçar o caixa.",
    detailedSteps: [
      "• Sangria (Retirada de Dinheiro): É quando você tira dinheiro da gaveta por segurança (para guardar no cofre) ou para pagar uma conta rápida (ex: pão, frete, entregador).",
      "• Suprimento (Entrada de Troco): É quando falta troco e você coloca mais notas ou moedas na gaveta durante o dia.",
      "Como fazer:",
      "1. Vá na aba 'Fluxo do Caixa' ou 'Lançamento Direto'.",
      "2. Escolha 'Sangria (Saída)' ou 'Suprimento (Entrada)'.",
      "3. Digite o valor e o motivo (ex: 'Pagamento entrega' ou 'Troco').",
      "4. Clique em Confirmar. O saldo da gaveta é atualizado na mesma hora."
    ],
    tips: "Nunca tire dinheiro do caixa sem lançar a Sangria, senão no final do dia o caixa vai dar 'Quebra de Caixa' (falta de dinheiro).",
    keywords: ["sangria", "suprimento", "retirada", "saida", "entrada", "dinheiro gaveta", "pagar conta", "troco extra"]
  },
  {
    id: "fechar-caixa-relatorio",
    category: "caixa",
    title: "Como fechar o turno e tirar o relatório do dia?",
    shortDesc: "Faça o balanço cego da gaveta, confira quebras ou sobras e envie o fechamento por WhatsApp.",
    detailedSteps: [
      "1. Ao final do expediente, vá na aba 'Fluxo do Caixa' e clique em 'Fechar Turno & Expediente 🌅'.",
      "2. O sistema abrirá a conferência física: conte o dinheiro que está na gaveta e digite o valor contado.",
      "3. O sistema compara o valor físico com o saldo do sistema e avisa se o caixa bateu 100%, ou se houve Quebra (falta) ou Sobra (excesso).",
      "4. Digite quanto vai deixar de troco para o dia seguinte.",
      "5. Clique em 'Confirmar Fechamento'.",
      "6. Clique em 'Compartilhar Fechamento WhatsApp 📲' para enviar o relatório detalhado para o dono."
    ],
    tips: "O balanço de caixa evita furtos, desvios e erros de troco que passam despercebidos durante a correria.",
    keywords: ["fechar caixa", "fechamento", "fim do dia", "expediente", "relatorio", "whatsapp", "conferencia", "quebra de caixa", "sobra"]
  },
  {
    id: "gerenciar-pin-e-equipe",
    category: "seguranca",
    title: "Como cadastrar, alterar e zerar PIN de funcionários e gerente?",
    shortDesc: "Controle quem pode dar descontos, estornar vendas ou mexer no dinheiro da loja.",
    detailedSteps: [
      "1. Abra a aba 'Proprietário & Permissões 👑'.",
      "2. Digite o seu PIN de Proprietário para ter acesso total.",
      "3. Em 'Cadastrar Novo Membro da Equipe', digite o Nome, escolha o Cargo (Caixa, Vendedor, Gerente) e defina um PIN de 4 a 6 dígitos para a pessoa.",
      "4. Nas chaves de permissão, marque o que cada cargo pode fazer (ex: permitir desconto até 10%, permitir sangria, etc.).",
      "• Se um funcionário esquecer o PIN: Basta clicar no botão de editar ao lado do nome dele e digitar uma nova senha.",
      "• Para alterar o PIN do Proprietário: Na barra de segurança no topo, clique em 'Alterar PIN' e informe a nova senha mestra."
    ],
    tips: "Nunca compartilhe o seu PIN de Proprietário com funcionários comuns. Cada pessoa deve ter o seu próprio PIN.",
    keywords: ["pin", "senha", "gerente", "caixa", "funcionario", "equipe", "permissoes", "alterar pin", "esqueci senha", "zerar pin"]
  },
  {
    id: "apagar-ex-funcionario-e-pin",
    category: "seguranca",
    title: "Como apagar nome e PIN de ex-funcionários que não trabalham mais?",
    shortDesc: "Remova funcionários antigos para não acumular nomes e senhas no sistema da sua empresa.",
    detailedSteps: [
      "1. Clique na aba 'Proprietário & Permissões 👑' no topo do PDV.",
      "2. Digite o seu PIN de Proprietário para ter acesso seguro.",
      "3. Role a tela até a seção 'Equipe & Usuários Cadastrados'.",
      "4. Localize o nome do ex-funcionário na listagem.",
      "5. Clique no botão vermelho de Lixeira 🗑️ ao lado do nome e PIN dele.",
      "6. Confirme a exclusão no alerta de segurança. O cadastro e o PIN do ex-colaborador são excluídos definitivamente, liberando o sistema para novos funcionários e garantindo que o ex-funcionário não acesse mais o caixa!"
    ],
    tips: "Sempre remova o cadastro de um funcionário no mesmo dia da sua saída para manter a listagem limpa e o caixa seguro contra acessos indevidos.",
    keywords: ["apagar funcionario", "excluir funcionario", "apagar pin", "excluir senha", "ex-funcionario", "demitir", "tirar funcionario", "limpar equipe", "apagar nome"]
  },
  {
    id: "troco-e-gaveta-dinheiro",
    category: "caixa",
    title: "Como funciona o Troco e a Abertura de Gaveta Automática (Gaveta Elétrica)?",
    shortDesc: "Cálculo exato de troco, botões de cédulas rápidas e compatibilidade com gavetas elétricas sem mensalidades.",
    detailedSteps: [
      "1. Ao fechar uma venda em Dinheiro, o sistema exibe os botões rápidos de cédulas (R$ 10, R$ 20, R$ 50, R$ 100) ou você pode digitar o valor pago.",
      "2. O troco exato a devolver aparece em destaque verde grande, evitando qualquer erro de cálculo.",
      "3. Gaveta Elétrica Automática (sem custos extras): O sistema envia o comando padrão ESC/POS pela impressora térmica (cabo RJ11/RJ12), abrindo a gaveta automaticamente no momento exato em que a venda em dinheiro é concluída.",
      "4. Para comércios que usam gaveta manual com chave ou caixa simples: O sistema exibe um aviso visual e sonoro de destravamento com o troco na tela, funcionando com 100% de precisão para qualquer porte de comércio sem precisar pagar nada a mais!"
    ],
    tips: "O valor recebido e o troco também saem impressos no comprovante/cupom do cliente e no histórico do caixa.",
    keywords: ["troco", "gaveta", "gaveta automatica", "gaveta eletrica", "abrir gaveta", "cedulas", "dinheiro troco", "calcular troco", "guanabara"]
  }
];

interface PDVHelpAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    action: () => void;
  };
}

export const PDVHelpAssistant: React.FC<PDVHelpAssistantProps> = ({
  isOpen,
  onClose,
  onNavigateToTab
}) => {
  const [activeView, setActiveView] = useState<"guias" | "chat">("guias");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>("zerar-dados-teste");
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "bot",
      text: "Olá! Sou seu Assistente Inteligente do PDV 🤖🏪. Posso te explicar passo a passo como cadastrar produtos, usar leitor de código de barras, zerar dados de teste, fazer sangria ou fechar o caixa. Como posso te ajudar hoje?",
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeView === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeView]);

  // Filtered guides based on query and category
  const filteredGuides = useMemo(() => {
    return PDV_KNOWLEDGE_BASE.filter(item => {
      const matchesCategory = selectedCategory === "todos" || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inTitle = item.title.toLowerCase().includes(q);
      const inDesc = item.shortDesc.toLowerCase().includes(q);
      const inKeywords = item.keywords.some(k => k.toLowerCase().includes(q));
      const inSteps = item.detailedSteps.some(s => s.toLowerCase().includes(q));

      return inTitle || inDesc || inKeywords || inSteps;
    });
  }, [searchQuery, selectedCategory]);

  // Intelligent local search first, fallback to Gemini AI for unique questions
  const handleSendMessage = async () => {
    if (!userInput.trim() || isAiLoading) return;

    const userText = userInput.trim();
    setUserInput("");

    const newMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages(prev => [...prev, newMsg]);

    // Check if there is an exact match in knowledge base (Instant & 100% Free)
    const lower = userText.toLowerCase();
    const matchedGuide = PDV_KNOWLEDGE_BASE.find(g => 
      g.keywords.some(k => lower.includes(k.toLowerCase())) ||
      g.title.toLowerCase().includes(lower)
    );

    if (matchedGuide) {
      setTimeout(() => {
        const botReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: `📌 **${matchedGuide.title}**\n\n${matchedGuide.shortDesc}\n\n**Passo a passo:**\n${matchedGuide.detailedSteps.join("\n")}${matchedGuide.tips ? `\n\n💡 *Dica:* ${matchedGuide.tips}` : ""}`,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        };
        setChatMessages(prev => [...prev, botReply]);
      }, 350);
      return;
    }

    // Otherwise, call server-side Gemini AI
    setIsAiLoading(true);
    try {
      const knowledgeContext = PDV_KNOWLEDGE_BASE.map(g => 
        `TÓPICO: ${g.title}\nRESUMO: ${g.shortDesc}\nPASSOS:\n${g.detailedSteps.join("\n")}`
      ).join("\n\n---\n\n");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: userText }]
          }
        ],
        config: {
          systemInstruction: `Você é o Assistente Virtual Oficial e Especialista em todo o ecossistema do aplicativo Cérebro Inteligente (PDV, Caixa, Agenda de Pagamentos, Precificação Comercial, Gaveteiro de Pastas, Oficina e Tributos).
Seu objetivo é ajudar comerciantes, donos de mercadinhos, oficinas mecânicas, bares, açougues, caixas e empreendedores a tirarem TODAS as dúvidas sobre o sistema.
Fale em português do Brasil com tom simples, claro, empático, acolhedor e direto ao ponto (sem termos técnicos difíceis).

CONHECIMENTO COMPLETO DO SISTEMA:
1. AGENDA & VENCIMENTOS: Alerta vermelho pulsante 🚨 avisa hoje/atrasado para faturas de fornecedores e contas. Botões 'Enviar Lembrete WhatsApp 📲' e 'Copiar Lembrete 📋'. Abas de filtro: Todas, A Pagar, Vencidas, Pagas, A Receber.
2. GAVETEIRO DE PASTAS: Pastas para Fornecedores, Boletos, Contas Fixas, Pagamentos e pastas personalizadas (+ Nova Pasta). Contagem e valores somados em tempo real.
3. PRECIFICAÇÃO COMERCIAL (MARKUP INTELIGENTE): Explique que a soma simples Custo + 30% causa prejuízo por causa das taxas de cartão (débito/crédito), imposto, frete, sacola e perdas de validade. A fórmula correta usa a Margem de Contribuição: Custo ÷ (1 - Deduções).
4. CONFERÊNCIA DE CÉDULAS & MOEDAS: Caixinhas dedicadas para cédulas de R$ 2, 5, 10, 20, 50, 100 e 200, além de moedas de R$ 0,05 a 1,00. Protege funcionários contra quebra de caixa indevida gerando termo de abertura com assinaturas.
5. OFICINA MECÂNICA & OBRAS (TEMPO É DINHEIRO): Cálculo de mão de obra justa considerando dias gastos, número de ajudantes, diária de ajudantes, marmita, custos fixos do galpão/dia (aluguel, compressor, luz) e margem do mestre.
6. TALÕES DE PAPELARIA: Nota Promissória jurídica, Recibo de Aluguel, Recibo Comercial e Orçamento. Assinatura na tela, pontuação rápida e impressão térmica.
7. BAR & DOSES DE CACHAÇA: Garrafa de 960ml/1L com cálculo da perda do 'chorinho' (5ml por dose) e baldes de cerveja.
8. AÇOUGUE: Rendimento de carnes, desossa, osso descartado e aparas de sebo.
9. SEGURANÇA & ZONA DE PERIGO: PIN mestre do proprietário (4 a 6 dígitos). Zerar dados de teste limpa o caixa sem apagar o Bloco de Notas ou outros dados.

BASE DE MANUAIS:
${knowledgeContext}

REGRAS:
- Sempre aponte onde clicar no sistema (ex: 'Agenda & Vencimentos', 'Contador de Cédulas', 'Oficina & Bar: Tempo é R$', 'Gaveteiro de Pastas', 'Proprietário & Permissões').
- Estruture a resposta com passos numerados ou tópicos claros para leitura rápida no balcão.`,
          temperature: 0.3
        }
      });

      const replyText = response.text || "Desculpe, não consegui obter essa resposta agora. Mas você pode consultar os guias rápidos acima!";
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: replyText,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: "bot",
        text: "Houve uma oscilação na conexão com a IA, mas não se preocupe: você pode ver as instruções completas clicando na aba 'Manuais & Dúvidas Rápidas' aqui em cima!",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-purple-500/30 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/25">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">
                  Central de Ajuda & Assistente IA do PDV
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Respostas Instantâneas
                </span>
              </div>
              <p className="text-xs text-purple-200/80 font-medium">
                Tudo explicado passo a passo: como cadastrar, zerar testes, sangrias, leitor de código e fechar caixa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all cursor-pointer shrink-0"
            title="Fechar ajuda"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODE SWITCHER: MANUAIS RÁPIDOS VS CHAT COM IA */}
        <div className="flex border-b border-white/10 bg-slate-950/80 px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveView("guias")}
            className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeView === "guias"
                ? "text-purple-400 border-purple-500"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Manuais & Dúvidas Rápidas ({filteredGuides.length})</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveView("chat")}
            className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeView === "chat"
                ? "text-purple-400 border-purple-500"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Pergunte à IA do PDV 🤖</span>
          </button>
        </div>

        {/* VIEW 1: MANUAIS E DÚVIDAS RÁPIDAS */}
        {activeView === "guias" ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Search Bar & Quick Categories */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: Como zerar teste, como cadastrar produto, leitor de código, sangria..."
                  className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-white/10 focus:border-purple-500 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-wider">
                {[
                  { id: "todos", label: "Todos os Tópicos" },
                  { id: "agenda", label: "Agenda & Vencimentos 📅🚨" },
                  { id: "precificacao", label: "Precificação & Markup 💰" },
                  { id: "caixa", label: "Cédulas & Caixa 💵" },
                  { id: "oficina", label: "Oficina & Obra ⏱️" },
                  { id: "papelaria", label: "Talões & Recibos 🧾" },
                  { id: "reset", label: "Zerar Testes ⚠️" },
                  { id: "produtos", label: "Produtos 📦" },
                  { id: "vendas", label: "Vendas & Leitor 🛒" },
                  { id: "seguranca", label: "PIN & Dono 🔑" }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-white/5 hover:border-white/10"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Guides Accordion List */}
            <div className="space-y-3">
              {filteredGuides.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-white/5 space-y-3">
                  <p className="text-sm text-slate-400">Nenhum manual direto encontrado com essa busca.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("chat");
                      setUserInput(searchQuery);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase rounded-xl transition-all inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Perguntar para a IA do PDV</span>
                  </button>
                </div>
              ) : (
                filteredGuides.map(item => {
                  const isExpanded = expandedGuideId === item.id;
                  const isReset = item.category === "reset";

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-2xl transition-all overflow-hidden ${
                        isReset 
                          ? "bg-rose-950/20 border-rose-500/30 shadow-lg shadow-rose-950/20" 
                          : isExpanded
                            ? "bg-slate-950/80 border-purple-500/30 shadow-lg"
                            : "bg-slate-950/40 border-white/5 hover:border-white/15"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedGuideId(isExpanded ? null : item.id)}
                        className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isReset ? "bg-rose-500/20 text-rose-400" : "bg-purple-500/10 text-purple-400"
                          }`}>
                            {isReset ? <RotateCcw className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wide ${
                              isReset ? "text-rose-300" : "text-white"
                            }`}>
                              {item.title}
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {item.shortDesc}
                            </p>
                          </div>
                        </div>

                        <div className="text-slate-400 shrink-0">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4 sm:px-6 sm:pb-6 border-t border-white/5 space-y-3.5 pt-3.5"
                          >
                            <p className="text-xs text-slate-300 font-medium leading-relaxed">
                              {item.shortDesc}
                            </p>

                            <div className="space-y-2 bg-slate-900/90 p-3.5 rounded-xl border border-white/5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block">
                                Passo a Passo Prático:
                              </span>
                              <div className="space-y-2">
                                {item.detailedSteps.map((step, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <span className="leading-relaxed">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {item.tips && (
                              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 flex items-start gap-2">
                                <span className="font-black text-amber-400 shrink-0">💡 Dica de Ouro:</span>
                                <span>{item.tips}</span>
                              </div>
                            )}

                            {isReset && (
                              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 bg-rose-950/40 p-3 rounded-xl border border-rose-500/20">
                                <span className="text-[11px] text-rose-300 font-semibold">
                                  Quer ir direto para a tela de zerar os dados de teste?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    if (onNavigateToTab) onNavigateToTab("proprietario");
                                  }}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow"
                                >
                                  <span>Ir para Proprietário & Zerar</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* VIEW 2: CHAT LIVRE COM A IA DO PDV */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow ${
                    msg.sender === "user" ? "bg-purple-600" : "bg-gradient-to-br from-indigo-500 to-purple-600"
                  }`}>
                    {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    msg.sender === "user"
                      ? "bg-purple-600 text-white rounded-tr-none font-medium shadow-md shadow-purple-600/10"
                      : "bg-slate-950 border border-white/10 text-slate-100 rounded-tl-none font-sans shadow"
                  }`}>
                    {msg.text}
                    <span className="block text-[9px] text-slate-400/80 mt-2 text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {isAiLoading && (
                <div className="flex gap-3 max-w-[85%] mr-auto items-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-950 border border-white/10 text-slate-300 p-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    <span>O Assistente está digitando a resposta...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick suggested chips */}
            <div className="px-4 py-2 border-t border-white/5 bg-slate-950/60 overflow-x-auto flex gap-2 no-scrollbar">
              {[
                "🚨 Como funciona o aviso vermelho de vencimento?",
                "📅 Como anotar contas e fornecedores na Agenda?",
                "💰 Como funciona o Markup na Precificação?",
                "💵 Como contar cédulas e moedas no Caixa?",
                "⏱️ Como calcular o tempo de serviço da oficina?",
                "🧾 Como usar os talões de papelaria e recibos?",
                "⚠️ Como zerar os testes e o caixa?",
                "🍻 Como calcular doses de cachaça com chorinho?",
                "🛒 Como funciona o leitor de código de barras?",
                "📦 Como cadastrar um produto novo?"
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setUserInput(chip);
                  }}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-purple-500/30 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 sm:p-4 bg-slate-950 border-t border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Tire qualquer dúvida sobre o PDV (ex: como dar desconto, como tirar produto)..."
                className="flex-1 bg-slate-900 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!userInput.trim() || isAiLoading}
                className="p-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed shadow-md shadow-purple-600/20"
                title="Enviar pergunta"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* FOOTER ADVICE */}
        <div className="p-3 bg-slate-950/90 border-t border-white/5 text-center text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 px-6">
          <span>💡 Dúvidas frequentes são respondidas instantaneamente sem gastar internet.</span>
          <button
            type="button"
            onClick={onClose}
            className="text-purple-400 hover:text-purple-300 font-black uppercase tracking-wider"
          >
            Entendido, Voltar ao PDV ✔️
          </button>
        </div>
      </div>
    </div>
  );
};
