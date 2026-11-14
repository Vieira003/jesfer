
"use strict";

/* ==========================================
   JESFER CALHAS E RUFOS
   SISTEMA DE AUTENTICAÇÃO COM SUPABASE

   Responsabilidades:
   - Inicializar conexão com Supabase
   - Controlar tela de login
   - Autenticar usuários
   - Consultar perfil
   - Verificar permissões
   - Carregar sistema administrativo
   - Encerrar sessão
   - Integrar recuperação de senha
========================================== */


/* ==========================================
   1. CONFIGURAÇÕES DO SUPABASE
========================================== */

const JESFER_SUPABASE_URL =
  "https://sthzmyapurueptsbgtvo.supabase.co";

const JESFER_SUPABASE_KEY =
  "sb_publishable_ibrL60yyFd2xHPbU1fimaA_38QPAAXg";


/* ==========================================
   2. VERIFICAR BIBLIOTECA
========================================== */

if (!window.supabase) {

  throw new Error(
    "Biblioteca do Supabase não foi carregada."
  );

}


/* ==========================================
   3. INICIALIZAR CLIENTE
========================================== */

const jesferSupabase = window.supabase.createClient(

  JESFER_SUPABASE_URL,

  JESFER_SUPABASE_KEY,

  {
    auth: {

      persistSession: true,

      autoRefreshToken: true,

      // A recuperação acontece em uma página
      // separada, não no index.html.
      detectSessionInUrl: false

    }
  }

);


// Mantém compatibilidade com outros arquivos.
window.supabaseClient = jesferSupabase;


/* ==========================================
   4. VARIÁVEIS DE CONTROLE
========================================== */

let jesferScriptCarregado = false;

let jesferScriptPromise = null;

let jesferModoRecuperacao = false;

let jesferInicializado = false;

let jesferVerificandoAcesso = false;

let jesferAcessoAutorizado = false;

let jesferProcessandoLogin = false;

let jesferProcessandoSaida = false;


/* ==========================================
   5. UTILITÁRIOS
========================================== */

function jesferElemento(id) {

  return document.getElementById(id);

}


/* ==========================================
   6. MENSAGENS
========================================== */

function jesferMensagem(
  texto,
  tipo = "erro"
) {

  const elemento = jesferElemento(
    "mensagemLoginJesfer"
  );

  if (!elemento) {
    return;
  }

  elemento.textContent = texto;

  elemento.style.color =

    tipo === "sucesso"
      ? "#15803d"

      : tipo === "info"
      ? "#1c3d5a"

      : "#b42318";

}


/* ==========================================
   7. MOSTRAR LOGIN
========================================== */

function jesferMostrarLogin() {

  const login = jesferElemento(
    "telaLoginJesfer"
  );

  const painel = jesferElemento(
    "painelJesfer"
  );

  jesferAcessoAutorizado = false;

  if (painel) {

    painel.hidden = true;

    painel.style.display = "none";

  }

  if (login) {

    login.hidden = false;

    login.style.display = "flex";

  }

}


/* ==========================================
   8. MOSTRAR PAINEL
========================================== */

function jesferMostrarPainel() {

  if (!jesferAcessoAutorizado) {

    console.warn(
      "Tentativa de abrir painel sem autorização."
    );

    jesferMostrarLogin();

    return false;

  }

  const login = jesferElemento(
    "telaLoginJesfer"
  );

  const painel = jesferElemento(
    "painelJesfer"
  );

  if (!login || !painel) {

    console.error(
      "Elementos do login ou painel não encontrados."
    );

    return false;

  }

  login.hidden = true;

  login.style.display = "none";

  painel.hidden = false;

  painel.style.removeProperty("display");

  return true;

}


/* ==========================================
   9. RECUPERAÇÃO DE SENHA

   A recuperação não acontece mais
   dentro do index.html.

   Mantemos esta função para compatibilidade
   com chamadas antigas.
========================================== */

function jesferMostrarRecuperacao() {

  jesferModoRecuperacao = true;

  jesferMostrarLogin();

  window.location.replace(
    "recuperar-senha.html"
  );

}


/* ==========================================
   10. VOLTAR AO FORMULÁRIO DE LOGIN
========================================== */

function jesferMostrarFormularioLogin() {

  jesferModoRecuperacao = false;

  jesferMostrarLogin();

  jesferMensagem("");

}


/* ==========================================
   11. CARREGAMENTO DO SISTEMA ADMINISTRATIVO
========================================== */

function jesferCarregarSistema() {

  if (!jesferAcessoAutorizado) {

    return Promise.reject(
      new Error(
        "Acesso administrativo não autorizado."
      )
    );

  }

  if (jesferScriptPromise) {

    return jesferScriptPromise;

  }

  jesferScriptPromise = new Promise(

    (resolve, reject) => {

      const script = document.createElement(
        "script"
      );

      script.src = "script.js";

      script.async = false;

      script.onload = () => {

        jesferScriptCarregado = true;

        console.log(
          "Sistema JESFER carregado."
        );

        resolve();

      };

      script.onerror = () => {

        jesferScriptCarregado = false;

        jesferScriptPromise = null;

        reject(
          new Error(
            "Não foi possível carregar script.js."
          )
        );

      };

      document.body.appendChild(script);

    }

  );

  return jesferScriptPromise;

}


/* ==========================================
   12. CONSULTAR PERFIL
========================================== */

async function jesferBuscarPerfil(userId) {

  if (!userId) {

    throw new Error(
      "Identificação do usuário não informada."
    );

  }

  const { data, error } = await jesferSupabase

    .from("profiles")

    .select(
      "id, nome, role, ativo"
    )

    .eq(
      "id",
      userId
    )

    .single();

  if (error) {

    console.error(
      "Erro ao consultar perfil:",
      error
    );

    throw new Error(
      "Não foi possível consultar as permissões."
    );

  }

  return data;

}


/* ==========================================
   13. VALIDAR PERFIL ADMINISTRATIVO
========================================== */

function jesferPerfilAdministrador(perfil) {

  if (!perfil) {

    return false;

  }

  if (perfil.role !== "admin") {

    return false;

  }

  if (perfil.ativo !== true) {

    return false;

  }

  return true;

}


/* ==========================================
   14. VERIFICAR ACESSO
========================================== */

async function jesferVerificarAcesso() {

  if (jesferModoRecuperacao) {

    return false;

  }

  if (jesferVerificandoAcesso) {

    return false;

  }

  jesferVerificandoAcesso = true;

  jesferMostrarLogin();

  try {

    /* --------------------------------------
       CONSULTAR USUÁRIO AUTENTICADO
    -------------------------------------- */

    const { data, error } =
      await jesferSupabase.auth.getUser();

    if (error || !data?.user) {

      console.log(
        "Nenhum usuário autenticado."
      );

      jesferMostrarLogin();

      return false;

    }

    const usuario = data.user;


    /* --------------------------------------
       CONSULTAR PERFIL
    -------------------------------------- */

    let perfil;

    try {

      perfil = await jesferBuscarPerfil(
        usuario.id
      );

    } catch (erroPerfil) {

      jesferMostrarLogin();

      jesferMensagem(
        erroPerfil.message
      );

      return false;

    }


    /* --------------------------------------
       VERIFICAR PERMISSÕES
    -------------------------------------- */

    if (!jesferPerfilAdministrador(perfil)) {

      await jesferSupabase.auth.signOut();

      jesferMostrarLogin();

      jesferMensagem(
        "Sua conta não possui permissão de administrador."
      );

      return false;

    }


    /* --------------------------------------
       IDENTIFICAR USUÁRIO NO PAINEL
    -------------------------------------- */

    const emailElemento = jesferElemento(
      "usuarioLogadoJesfer"
    );

    if (emailElemento) {

      emailElemento.textContent = perfil.nome

        ? `${perfil.nome} (${usuario.email})`

        : usuario.email || "";

    }


    /* --------------------------------------
       AUTORIZAR CARREGAMENTO
    -------------------------------------- */

    jesferAcessoAutorizado = true;


    /* --------------------------------------
       CARREGAR SCRIPT PRINCIPAL
    -------------------------------------- */

    try {

      await jesferCarregarSistema();

    } catch (erroScript) {

      console.error(
        "Erro ao carregar sistema:",
        erroScript
      );

      jesferMostrarLogin();

      jesferMensagem(
        "Login realizado, mas o sistema não carregou."
      );

      return false;

    }


    /* --------------------------------------
       MOSTRAR PAINEL
    -------------------------------------- */

    return jesferMostrarPainel();

  } catch (erro) {

    console.error(
      "Erro ao verificar acesso:",
      erro
    );

    jesferMostrarLogin();

    jesferMensagem(
      "Não foi possível verificar seu acesso."
    );

    return false;

  } finally {

    jesferVerificandoAcesso = false;

  }

}


/* ==========================================
   15. REALIZAR LOGIN
========================================== */

async function jesferFazerLogin(evento) {

  if (evento) {

    evento.preventDefault();

  }

  if (jesferProcessandoLogin) {

    return;

  }

  const emailElemento = jesferElemento(
    "emailJesfer"
  );

  const senhaElemento = jesferElemento(
    "senhaJesfer"
  );

  const botao = jesferElemento(
    "btnEntrarJesfer"
  );

  if (
    !emailElemento ||
    !senhaElemento ||
    !botao
  ) {

    console.error(
      "Campos de login não encontrados."
    );

    return;

  }

  const email = emailElemento.value.trim();

  const senha = senhaElemento.value;

  if (!email || !senha) {

    jesferMensagem(
      "Preencha o e-mail e a senha."
    );

    return;

  }

  jesferProcessandoLogin = true;

  botao.disabled = true;

  botao.textContent = "Entrando...";

  jesferMensagem("");

  try {

    /* --------------------------------------
       AUTENTICAR NO SUPABASE
    -------------------------------------- */

    const { data, error } =
      await jesferSupabase.auth.signInWithPassword({

        email: email,

        password: senha

      });

    if (error) {

      console.error(
        "Falha na autenticação:",
        error.message
      );

      jesferMensagem(
        "Não foi possível entrar. Confira o e-mail e a senha."
      );

      return;

    }

    if (!data?.user) {

      jesferMensagem(
        "O Supabase não retornou um usuário válido."
      );

      return;

    }


    /* --------------------------------------
       LIMPAR CAMPO DE SENHA
    -------------------------------------- */

    senhaElemento.value = "";


    /* --------------------------------------
       VERIFICAR PERFIL ADMINISTRATIVO
    -------------------------------------- */

    await jesferVerificarAcesso();

  } catch (erro) {

    console.error(
      "Erro durante login:",
      erro
    );

    jesferMensagem(
      "Ocorreu um erro ao conectar ao Supabase."
    );

  } finally {

    jesferProcessandoLogin = false;

    botao.disabled = false;

    botao.textContent = "Entrar";

  }

}


/* ==========================================
   16. SOLICITAR RECUPERAÇÃO DE SENHA

   Função mantida para compatibilidade.
   O formulário principal agora está em
   recuperar-senha.html.
========================================== */

async function jesferSolicitarRecuperacao() {

  const emailElemento = jesferElemento(
    "emailJesfer"
  );

  const email = emailElemento
    ? emailElemento.value.trim()
    : "";

  if (!email) {

    jesferMensagem(
      "Digite seu e-mail antes de solicitar a recuperação."
    );

    if (emailElemento) {

      emailElemento.focus();

    }

    return;

  }

  jesferMensagem(
    "Solicitando recuperação...",
    "info"
  );

  const urlRetorno = new URL(
    "recuperar-senha.html",
    window.location.href
  ).href;

  try {

    const { error } =
      await jesferSupabase.auth.resetPasswordForEmail(

        email,

        {
          redirectTo: urlRetorno
        }

      );

    if (error) {

      console.error(
        "Erro na recuperação:",
        error
      );

      jesferMensagem(
        "Não foi possível solicitar a recuperação."
      );

      return;

    }

    jesferMensagem(
      "Se a conta existir, você receberá um e-mail com as instruções.",
      "sucesso"
    );

  } catch (erro) {

    console.error(
      "Erro de conexão:",
      erro
    );

    jesferMensagem(
      "Erro de conexão ao solicitar recuperação."
    );

  }

}


/* ==========================================
   17. SALVAR NOVA SENHA

   Mantida para compatibilidade.

   A nova página possui seu próprio
   formulário e tratamento de recuperação.
========================================== */

async function jesferSalvarNovaSenha(evento) {

  if (evento) {

    evento.preventDefault();

  }

  // Evita atualizar senha a partir
  // do painel administrativo.

  if (
    !window.location.pathname.endsWith(
      "/recuperar-senha.html"
    )
  ) {

    jesferMostrarRecuperacao();

    return;

  }

  // A página recuperar-senha.html possui
  // a implementação própria de updateUser.

}


/* ==========================================
   18. ENCERRAR SESSÃO
========================================== */

async function jesferSair() {

  if (jesferProcessandoSaida) {

    return;

  }

  jesferProcessandoSaida = true;

  const botao = jesferElemento(
    "btnSairJesfer"
  );

  if (botao) {

    botao.disabled = true;

    botao.textContent = "Saindo...";

  }

  try {

    const { error } =
      await jesferSupabase.auth.signOut();

    if (error) {

      throw error;

    }

    jesferAcessoAutorizado = false;

    jesferMostrarLogin();

    jesferMensagem("");

    const senha = jesferElemento(
      "senhaJesfer"
    );

    if (senha) {

      senha.value = "";

    }

    // Recarrega a página para reiniciar
    // o script principal e seus controles.

    window.location.reload();

  } catch (erro) {

    console.error(
      "Erro ao encerrar sessão:",
      erro
    );

    alert(
      "Não foi possível encerrar a sessão."
    );

  } finally {

    jesferProcessandoSaida = false;

    if (botao) {

      botao.disabled = false;

      botao.textContent = "Sair do sistema";

    }

  }

}


/* ==========================================
   19. VERIFICAR LINK DE RECUPERAÇÃO

   Impede que um link antigo enviado
   para index.html abra o painel.
========================================== */

function jesferVerificarUrlRecuperacao() {

  const url = new URL(
    window.location.href
  );

  const parametrosHash = new URLSearchParams(
    window.location.hash.substring(1)
  );

  const recuperacaoNaUrl =

    url.searchParams.get("type") === "recovery" ||

    parametrosHash.get("type") === "recovery";

  const erroNaUrl =

    url.searchParams.has("error") ||

    parametrosHash.has("error");

  if (recuperacaoNaUrl || erroNaUrl) {

    jesferModoRecuperacao = true;

    const destino = new URL(
      "recuperar-senha.html",
      window.location.href
    );

    // Preserva os parâmetros de recuperação
    // para que a página de destino os processe.

    destino.search = url.search;

    destino.hash = url.hash;

    window.location.replace(
      destino.href
    );

    return true;

  }

  return false;

}


/* ==========================================
   20. REGISTRAR EVENTOS DO LOGIN
========================================== */

function jesferRegistrarEventos() {

  const formulario = jesferElemento(
    "formLoginJesfer"
  );

  const botaoSair = jesferElemento(
    "btnSairJesfer"
  );

  if (!formulario) {

    console.error(
      "Formulário formLoginJesfer não encontrado."
    );

    return false;

  }

  if (!botaoSair) {

    console.error(
      "Botão btnSairJesfer não encontrado."
    );

    return false;

  }

  formulario.addEventListener(
    "submit",
    jesferFazerLogin
  );

  botaoSair.addEventListener(
    "click",
    jesferSair
  );

  // O botão antigo btnRecuperarJesfer
  // não existe mais no index.html.
  //
  // O link Esqueci minha senha utiliza:
  // href="recuperar-senha.html"
  //
  // Por isso, não registramos mais
  // eventos para os formulários antigos.

  return true;

}


/* ==========================================
   21. VERIFICAR ELEMENTOS OBRIGATÓRIOS
========================================== */

function jesferVerificarEstrutura() {

  const idsObrigatorios = [

    "telaLoginJesfer",

    "painelJesfer",

    "formLoginJesfer",

    "emailJesfer",

    "senhaJesfer",

    "btnEntrarJesfer",

    "btnSairJesfer"

  ];

  const ausentes = idsObrigatorios.filter(
    id => !jesferElemento(id)
  );

  if (ausentes.length > 0) {

    console.error(
      "Elementos ausentes no index.html:",
      ausentes
    );

    return false;

  }

  return true;

}


/* ==========================================
   22. INICIALIZAÇÃO GERAL
========================================== */

async function jesferIniciar() {

  if (jesferInicializado) {

    return;

  }

  jesferInicializado = true;


  /* --------------------------------------
     OCULTAR PAINEL IMEDIATAMENTE
  -------------------------------------- */

  jesferMostrarLogin();


  /* --------------------------------------
     VERIFICAR ESTRUTURA HTML
  -------------------------------------- */

  if (!jesferVerificarEstrutura()) {

    jesferMensagem(
      "Erro na estrutura da página de login."
    );

    return;

  }


  /* --------------------------------------
     REGISTRAR EVENTOS
  -------------------------------------- */

  if (!jesferRegistrarEventos()) {

    jesferMensagem(
      "Não foi possível inicializar o login."
    );

    return;

  }


  /* --------------------------------------
     VERIFICAR LINK DE RECUPERAÇÃO
  -------------------------------------- */

  if (jesferVerificarUrlRecuperacao()) {

    return;

  }


  /* --------------------------------------
     VERIFICAR SESSÃO EXISTENTE
  -------------------------------------- */

  await jesferVerificarAcesso();


  /* --------------------------------------
     FINALIZAR INICIALIZAÇÃO
  -------------------------------------- */

  console.log(
    "Autenticação JESFER inicializada."
  );

}


/* ==========================================
   23. EXECUTAR QUANDO O HTML ESTIVER PRONTO
========================================== */

if (document.readyState === "loading") {

  document.addEventListener(

    "DOMContentLoaded",

    jesferIniciar,

    {
      once: true
    }

  );

} else {

  jesferIniciar();

}


/* ==========================================
   FIM DO ARQUIVO SUPABASE.JS
========================================== */
