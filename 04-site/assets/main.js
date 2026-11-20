(function () {
  "use strict";
  var CFG = window.FUNIL_CONFIG || {};

  /* Animação de entrada (fade + slide-up), com atraso em cascata */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("js");
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        var irmaos = Array.prototype.slice.call(en.target.parentNode.querySelectorAll(":scope > .reveal"));
        var atraso = Math.max(0, irmaos.indexOf(en.target)) * 80;
        en.target.style.transitionDelay = Math.min(atraso, 320) + "ms";
        en.target.classList.add("visivel");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* Links de checkout: todo elemento com data-checkout recebe o link configurado */
  document.querySelectorAll("[data-checkout]").forEach(function (el) {
    if (CFG.checkoutUrl) {
      var url = CFG.checkoutUrl;
      // repassa UTMs da página para o checkout
      if (window.location.search) {
        url += (url.indexOf("?") === -1 ? "?" : "&") + window.location.search.slice(1);
      }
      el.setAttribute("href", url);
      el.addEventListener("click", function () {
        if (window.fbq) fbq("track", "InitiateCheckout", { value: 37, currency: "BRL" });
      });
    } else {
      el.setAttribute("href", "#checkout");
    }
  });

  /* Rodapé: CNPJ e e-mail */
  document.querySelectorAll("[data-cnpj]").forEach(function (el) { el.textContent = CFG.cnpj || ""; });
  document.querySelectorAll("[data-email]").forEach(function (el) {
    el.textContent = CFG.emailSuporte || "";
    el.setAttribute("href", "mailto:" + (CFG.emailSuporte || ""));
  });
  document.querySelectorAll("[data-ano]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* FAQ em acordeão */
  document.querySelectorAll(".faq__pergunta").forEach(function (botao) {
    botao.addEventListener("click", function () {
      var item = botao.closest(".faq__item");
      var resposta = item.querySelector(".faq__resposta");
      var aberto = botao.getAttribute("aria-expanded") === "true";

      document.querySelectorAll(".faq__item.aberto").forEach(function (outro) {
        if (outro !== item) {
          outro.classList.remove("aberto");
          outro.querySelector(".faq__pergunta").setAttribute("aria-expanded", "false");
          outro.querySelector(".faq__resposta").style.maxHeight = null;
        }
      });

      botao.setAttribute("aria-expanded", String(!aberto));
      item.classList.toggle("aberto", !aberto);
      resposta.style.maxHeight = aberto ? null : resposta.scrollHeight + 40 + "px";
    });
  });

  /* Vídeo da página de obrigado */
  var video = document.querySelector("[data-video]");
  var blocoVideo = document.getElementById("bloco-video");
  if (blocoVideo && !CFG.videoEmbedUrl) blocoVideo.style.display = "none";
  if (video && CFG.videoEmbedUrl) {
    var iframe = document.createElement("iframe");
    iframe.src = CFG.videoEmbedUrl;
    iframe.title = "Recado do Eng. Hélvio Rickhardson";
    iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    video.innerHTML = "";
    video.appendChild(iframe);
  }

  /* Modal do formulário */
  var modal = document.getElementById("modal-sessao");
  if (!modal) return;
  var ultimoFoco = null;

  function abrir() {
    ultimoFoco = document.activeElement;
    modal.classList.add("aberto");
    document.body.style.overflow = "hidden";
    var primeiro = modal.querySelector("input, select, button");
    if (primeiro) primeiro.focus();
  }
  function fechar() {
    modal.classList.remove("aberto");
    document.body.style.overflow = "";
    if (ultimoFoco) ultimoFoco.focus();
  }
  document.querySelectorAll("[data-abrir-form]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); abrir(); });
  });
  modal.querySelectorAll("[data-fechar-form]").forEach(function (b) { b.addEventListener("click", fechar); });
  modal.addEventListener("click", function (e) { if (e.target === modal) fechar(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("aberto")) fechar(); });
  if (window.location.hash === "#formulario") abrir();

  /* Envio do formulário */
  var form = document.getElementById("form-sessao");
  var erro = document.getElementById("form-erro");
  var sucesso = document.getElementById("form-sucesso");

  // máscara simples de WhatsApp
  var tel = form.querySelector("[name='whatsapp']");
  tel.addEventListener("input", function () {
    var d = tel.value.replace(/\D/g, "").slice(0, 11);
    var f = d;
    if (d.length > 2) f = "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length > 7) f = "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    tel.value = f;
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    erro.style.display = "none";

    if (!form.checkValidity()) {
      erro.textContent = "Responda todas as perguntas para continuar.";
      erro.style.display = "block";
      form.reportValidity();
      return;
    }

    var dados = {};
    new FormData(form).forEach(function (v, k) { dados[k] = v; });
    dados.origem = form.dataset.origem || "pagina-obrigado";
    dados.enviado_em = new Date().toISOString();
    var params = new URLSearchParams(window.location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
      if (params.get(k)) dados[k] = params.get(k);
    });

    var botao = form.querySelector("button[type='submit']");
    botao.disabled = true;
    botao.textContent = "ENVIANDO...";

    var envio = CFG.webhookUrl
      ? fetch(CFG.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados)
        }).catch(function () { /* segue para o WhatsApp mesmo se o webhook falhar */ })
      : Promise.resolve();

    envio.then(function () {
      if (window.fbq) fbq("track", "Lead", { content_name: form.dataset.lead || "Lead" });
      form.style.display = "none";
      sucesso.classList.add("visivel");

      if (CFG.whatsappNumero) {
        var msg = (form.dataset.intro || "Olá, Eng. Hélvio!") + "\n\nNome: " + dados.nome;
        form.querySelectorAll("[data-q]").forEach(function (el, i) {
          msg += "\n" + (i + 1) + ". " + el.getAttribute("data-q") + ": " + (dados[el.getAttribute("data-campo")] || "");
        });
        var link = "https://wa.me/" + CFG.whatsappNumero + "?text=" + encodeURIComponent(msg);
        var btnWpp = document.getElementById("btn-whatsapp");
        if (btnWpp) { btnWpp.href = link; btnWpp.style.display = "block"; }
        window.open(link, "_blank", "noopener");
      }
    });
  });
})();
