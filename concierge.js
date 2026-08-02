/* =====================================================================
   SAKU Concierge — grounded chat widget
   ---------------------------------------------------------------------
   One of the 27 agents in the SAKU crew, deployed on the site as a demo.

   It does two jobs:
     1. Answers questions about Saku AI strictly from the knowledge base
        below, citing the source article behind every answer. When the KB
        is silent it escalates and logs the gap instead of inventing.
     2. Books a session: collects name / company / email / goal in-chat
        and posts them to the same form endpoint the page already uses.

   WHY THERE IS NO API KEY IN HERE
   This site is static and this repo is public. A model key shipped in
   client JS gets scraped. The agent therefore runs its retrieval locally.
   To upgrade it to a live model later, stand up a proxy that holds the
   key server-side (Cloudflare Worker / Vercel function) and set
   CONFIG.endpoint below. It should accept
       POST { question, history }
   and return
       { reply, source, confidence }
   If the endpoint errors or times out, the widget falls back to the
   local knowledge base, so the page never breaks.
   ===================================================================== */

(function () {
  'use strict';
  if (window.__sakuConcierge) return;
  window.__sakuConcierge = true;

  /* ---------------------------------------------------------------
     LEAD DELIVERY
     formEndpoint is the single place the lead backend is configured.
     It is used by the chat widget AND by the page's own booking forms,
     which this file hardens (see hardenForms) so a dead endpoint can
     never swallow a lead silently.

     Whatever goes here must answer a cross-origin JSON POST with CORS
     headers. Swapping providers is a one-line change:
       Formspree    https://formspree.io/f/<form-id>
       Web3Forms    https://api.web3forms.com/submit   (+ access_key field)
       Apps Script  https://script.google.com/macros/s/<id>/exec
     Set it to null to skip the network entirely and go straight to the
     email handoff.
     --------------------------------------------------------------- */
  var CONFIG = {
    endpoint: null,
    formEndpoint: 'https://formsubmit.co/ajax/andresbravocardozo@gmail.com',
    formTimeoutMs: 6000,
    email: 'andresbravocardozo@gmail.com',
    nudgeAfterMs: 7000
  };

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==================================================================
     1. KNOWLEDGE BASE
     Every fact below is on this site. Nothing else is answerable.
     ================================================================== */

  /* A chip is a promise: {to:'<kb id>'} always answers from that article and
     never round-trips through retrieval. {book:true} starts the booking flow. */
  var KB = [
    {
      id: 'what-saku-is',
      file: 'kb/what-saku-is.md',
      keys: ['what is saku', 'what do you do', 'who are you guys', 'what does saku do', 'about saku',
             'what is this', 'tell me about saku', 'agency', 'what do you sell', 'what do you offer',
             'services', 'que es saku', 'que haceis', 'que hacen', 'de que va esto', 'a que os dedicais',
             'servicios', 'agencia', 'que ofreceis', 'cuentame de saku'],
      en: 'Saku AI deploys a coordinated team of AI agents. Strategy, creative, distribution and lead intelligence, wired together as one growth engine instead of a pile of tools.\n\nIt is built for high-ticket industries, where a single closed deal moves real money. Fixed scopes, USD pricing, no retainer theater.',
      es: 'Saku AI despliega un equipo coordinado de agentes de IA. Estrategia, creatividad, distribución e inteligencia de leads, conectados como un solo motor de crecimiento en lugar de un montón de herramientas.\n\nEstá hecho para industrias de ticket alto, donde cerrar un solo trato mueve dinero de verdad. Alcance cerrado, precios en USD, sin teatro de retainer.',
      chips: [
        { to: 'engine', en: 'Show me the engine', es: 'Enséñame el motor' },
        { to: 'industries', en: 'Which industries?', es: '¿Qué industrias?' }
      ]
    },
    {
      id: 'engine',
      file: 'kb/engine.md',
      keys: ['engine', 'agents', 'how many agents', 'what agents', 'operating systems', 'os', 'crew',
             'the machine', 'stack', 'tools', 'what is included', 'list the agents', '27 agents',
             'motor', 'agentes', 'cuantos agentes', 'sistemas operativos', 'que incluye', 'la maquina'],
      en: 'Two layers. Seven operating systems shipped for clients: Demand OS, Creative Lab, Distribution, Lead Intel, Sales Desk, Brand OS, Exec Ops.\n\nInside them run 27 specialist agents. Strategist, Copywriter, Art Director, Video Cutter, Media Buyer, SEO Scout, Email Smith, Scheduler, Publisher, Inbox Triage, Lead Scorer, Qualifier, Enricher, Follow-up, Booker, CRM Sync, Ad Auditor, Budget Guard, A/B Runner, Page Builder, Analytics, Attribution, Reporter, Voice Agent, Concierge (that is me), Retention, Day Close.\n\nEvery part earns its place or gets removed.',
      es: 'Dos capas. Siete sistemas operativos entregados a clientes: Demand OS, Creative Lab, Distribution, Lead Intel, Sales Desk, Brand OS, Exec Ops.\n\nDentro corren 27 agentes especialistas. Strategist, Copywriter, Art Director, Video Cutter, Media Buyer, SEO Scout, Email Smith, Scheduler, Publisher, Inbox Triage, Lead Scorer, Qualifier, Enricher, Follow-up, Booker, CRM Sync, Ad Auditor, Budget Guard, A/B Runner, Page Builder, Analytics, Attribution, Reporter, Voice Agent, Concierge (ese soy yo), Retention, Day Close.\n\nCada pieza se gana su sitio o se quita.',
      chips: [
        { to: 'concierge', en: 'What are you, exactly?', es: '¿Qué eres exactamente?' },
        { to: 'method', en: 'How does it run?', es: '¿Cómo funciona?' }
      ]
    },
    {
      id: 'method',
      file: 'kb/method.md',
      keys: ['method', 'how does it work', 'how does this work', 'how it works', 'process',
             'how do you run it', 'how do you do it', 'steps',
             'how does it run', 'workflow', 'metodo', 'como funciona', 'proceso',
             'pasos', 'como lo haceis', 'como trabajais'],
      en: 'Four strokes, one cycle.\n\n1. Chart the market. The Strategy Agent maps buyers, competitors and price bands into a plan with numbers attached.\n2. Manufacture creative. On-brand ads, emails and landing pages at machine pace.\n3. Distribute with force. Campaigns launch and self-optimize across paid, social and email.\n4. Convert the ready. Every inbound lead scored, nurtured and booked in under a minute.',
      es: 'Cuatro trazos, un ciclo.\n\n1. Cartografiar el mercado. El agente de estrategia mapea compradores, competencia y rangos de precio en un plan con números.\n2. Fabricar creatividad. Anuncios, emails y landing pages en marca, a ritmo de máquina.\n3. Distribuir con fuerza. Las campañas se lanzan y se auto-optimizan en paid, social y email.\n4. Convertir al que está listo. Cada lead entrante puntuado, nutrido y agendado en menos de un minuto.',
      chips: [
        { to: 'proof', en: 'What results?', es: '¿Qué resultados?' },
        { book: true }
      ]
    },
    {
      id: 'industries',
      file: 'kb/industries.md',
      keys: ['industries', 'industry', 'who is this for', 'is this for me', 'real estate', 'construction',
             'industrial equipment', 'logistics', 'my business', 'do you work with', 'fit', 'b2b',
             'industrias', 'sector', 'para quien es', 'es para mi', 'inmobiliaria', 'construccion',
             'logistica', 'maquinaria', 'trabajais con'],
      en: 'Four named on the site: Real Estate (avg deal $480K), Construction (bid-driven), Industrial Equipment (long cycle) and Logistics (contract LTV).\n\nThe common thread is heavy decisions. Generic marketing tools are tuned for $40 t-shirts. This is purpose-built for six-figure deals with long cycles and serious buyers.\n\nIf your industry is not one of those four, I will not guess whether it fits. That is a 30-minute call question.',
      es: 'En la web se nombran cuatro: Real Estate (trato medio $480K), Construcción (por licitación), Maquinaria Industrial (ciclo largo) y Logística (LTV por contrato).\n\nEl hilo común son las decisiones pesadas. Las herramientas de marketing genéricas están afinadas para camisetas de $40. Esto está hecho para tratos de seis cifras con ciclos largos y compradores serios.\n\nSi tu industria no es una de esas cuatro, no voy a adivinar si encaja. Eso es una pregunta de llamada de 30 minutos.',
      chips: [
        { book: true },
        { to: 'proof', en: 'What results?', es: '¿Qué resultados?' }
      ]
    },
    {
      id: 'workshop',
      file: 'kb/workshop.md',
      keys: ['workshop', 'the workshop', 'ai enabling workshop', 'session', 'half day', 'on site',
             'what do i get', 'opportunity map', 'live demo', 'founding', 'seats', 'how long is it',
             'taller', 'que es el taller', 'que incluye el taller', 'el taller',
             'sesion', 'medio dia', 'presencial', 'que me llevo', 'mapa de oportunidades',
             'demo en vivo', 'plazas'],
      en: 'The AI Enabling Workshop. Private, on-site, half a day, roughly 3 to 4 hours, with your key decision-makers in the room together.\n\nThree moves: get fluent on what AI really does for a business like yours, map your opportunities in a guided working session, then build one of your real problems into a working demo on the spot.\n\nYou leave with two artifacts. A ranked opportunity map built on your numbers, not industry averages, and the live demo. Both yours to keep.',
      es: 'El AI Enabling Workshop. Privado, presencial, medio día, unas 3 o 4 horas, con tus decisores clave en la misma sala.\n\nTres movimientos: entender qué hace realmente la IA en un negocio como el tuyo, mapear tus oportunidades en una sesión de trabajo guiada, y convertir uno de tus problemas reales en una demo funcionando ahí mismo.\n\nTe llevas dos cosas. Un mapa de oportunidades priorizado con tus números, no promedios del sector, y la demo en vivo. Las dos son tuyas.',
      chips: [
        { to: 'pricing', en: 'What does it cost?', es: '¿Cuánto cuesta?' },
        { book: true }
      ]
    },
    {
      id: 'pricing',
      file: 'kb/pricing.md',
      keys: ['price', 'pricing', 'cost', 'how much', 'how much does it cost', 'fees', 'budget', 'rates',
             'expensive', 'free', 'is it free', 'retainer', 'workshop cost',
             'how much is the workshop', 'is the workshop free', 'precio', 'precios', 'coste',
             'cuanto cuesta', 'cuanto vale', 'tarifas', 'presupuesto', 'gratis', 'es gratis', 'caro',
             'precio del taller', 'cuanto cuesta el taller', 'el taller es gratis'],
      en: 'Two things are published, and I will stick to them.\n\nThe workshop is normally $500. Right now it is free for a small founding group of companies, no cost and no obligation. If you later start a project, that fee credits 100% toward it. The free seats are limited and intentional.\n\nThe pricing model is fixed scopes in USD, no retainer theater. Project prices themselves are not published, so I am not going to quote you one. Those get scoped on the 30-minute call.',
      es: 'Hay dos cosas publicadas, y me voy a ceñir a ellas.\n\nEl workshop cuesta normalmente $500. Ahora mismo es gratis para un grupo fundador pequeño de empresas, sin coste y sin compromiso. Si luego arrancas un proyecto, esa cuota se acredita al 100%. Las plazas gratuitas son limitadas a propósito.\n\nEl modelo es alcance cerrado en USD, sin teatro de retainer. Los precios de proyecto no están publicados, así que no te voy a inventar uno. Eso se dimensiona en la llamada de 30 minutos.',
      chips: [
        { book: true },
        { to: 'workshop', en: 'What is in the workshop?', es: '¿Qué incluye el taller?' }
      ]
    },
    {
      id: 'proof',
      file: 'kb/proof.md',
      keys: ['results', 'proof', 'roi', 'numbers', 'case study', 'case studies', 'testimonials',
             'does it work', 'does it really work', 'does this really work', 'prove it',
             'can you prove it', 'evidence', 'clients', 'guarantee', 'resultados', 'pruebas', 'numeros',
             'casos', 'testimonios', 'funciona', 'clientes', 'garantia'],
      en: 'The figures published on the site are client averages over 12 months, not a guarantee: pipeline +214%, cost per lead −38%, qualified meetings ×3.1, ad waste −52%, first follow-up under 60 seconds, show-up rate 87%.\n\nThree clients are quoted by name and role: Marcus C., owner of a design-build firm. Sarah O., VP Sales at an equipment distributor. David R., managing partner at a developer.\n\nI am flagging these as averages on purpose. Anyone quoting them to you as your outcome is guessing.',
      es: 'Las cifras publicadas en la web son medias de cliente a 12 meses, no una garantía: pipeline +214%, coste por lead −38%, reuniones cualificadas ×3,1, desperdicio en ads −52%, primer follow-up en menos de 60 segundos, tasa de asistencia 87%.\n\nHay tres clientes citados con nombre y cargo: Marcus C., dueño de una constructora design-build. Sarah O., VP de ventas en un distribuidor de maquinaria. David R., socio director en una promotora.\n\nLos marco como medias a propósito. Quien te los venda como tu resultado está adivinando.',
      chips: [
        { book: true },
        { to: 'industries', en: 'Which industries?', es: '¿Qué industrias?' }
      ]
    },
    {
      id: 'booking',
      file: 'kb/booking.md',
      keys: ['book', 'booking', 'demo', 'call', 'schedule', 'meeting', 'talk to someone', 'get started',
             'sign up', 'next step', 'how do i start', 'contact you', 'appointment',
             'reservar', 'agendar', 'llamada', 'reunion', 'cita', 'empezar', 'como empiezo',
             'quiero hablar', 'contactar', 'siguiente paso'],
      en: 'A 30-minute call, no commitment. You tell us about the business, we reply within one business day to set it up.\n\nI can take your details right here and send them across, or you can write to ' + CONFIG.email + ' directly.',
      es: 'Una llamada de 30 minutos, sin compromiso. Nos cuentas del negocio y respondemos en un día laborable para agendarla.\n\nPuedo tomar tus datos aquí mismo y enviarlos, o puedes escribir a ' + CONFIG.email + ' directamente.',
      chips: [{ book: true }]
    },
    {
      id: 'concierge',
      file: 'kb/concierge.md',
      keys: ['what are you', 'are you a bot', 'are you human', 'are you ai', 'how do you work',
             'who am i talking to', 'is this a chatbot', 'can i get one', 'this widget', 'this chat',
             'how were you built', 'eres un bot', 'eres humano', 'eres una ia', 'con quien hablo',
             'como funcionas', 'como te hicieron', 'quiero uno de estos'],
      en: 'I am SAKU Concierge, one of the 27 agents, and I am the demo.\n\nThe rule I run on: answer only from the knowledge base, cite the article under every answer, and when the KB is silent, escalate instead of inventing. That is why there is a source line under each reply.\n\nEvery question I cannot answer gets logged as a gap. The gap log is the roadmap for what to write next, which is how the knowledge base gets smarter every month. Same agent, pointed at your business instead of this one.',
      es: 'Soy SAKU Concierge, uno de los 27 agentes, y soy la demo.\n\nLa regla con la que funciono: responder solo desde la base de conocimiento, citar el artículo debajo de cada respuesta y, cuando la base no cubre algo, escalar en vez de inventar. Por eso hay una línea de fuente bajo cada respuesta.\n\nCada pregunta que no puedo responder se registra como hueco. Ese registro es la hoja de ruta de qué escribir después, y así la base se vuelve más lista cada mes. El mismo agente, apuntado a tu negocio en vez de a este.',
      chips: [
        { to: 'engine', en: 'Who else is in the crew?', es: '¿Quién más hay en el equipo?' },
        { book: true }
      ]
    },
    {
      id: 'contact',
      file: 'kb/contact.md',
      keys: ['email', 'contact', 'reach you', 'phone', 'address', 'get in touch', 'write to you',
             'correo', 'contacto', 'telefono', 'direccion', 'escribir'],
      en: 'Email: ' + CONFIG.email + '. Replies come within one business day.\n\nNo phone number or office address is published on this site, so I am not going to make one up.',
      es: 'Email: ' + CONFIG.email + '. Las respuestas llegan en un día laborable.\n\nEn esta web no hay teléfono ni dirección publicados, así que no me los voy a inventar.',
      chips: [{ book: true }]
    }
  ];

  var KB_BY_ID = {};
  KB.forEach(function (e) { KB_BY_ID[e.id] = e; });

  var STARTERS = [
    { to: 'what-saku-is', en: 'What do you actually do?', es: '¿Qué hacéis exactamente?' },
    { to: 'pricing', en: 'How much is it?', es: '¿Cuánto cuesta?' },
    { to: 'workshop', en: 'What is the workshop?', es: '¿Qué es el workshop?' },
    { book: true }
  ];

  /* Short label per article, used when a question straddles two of them. */
  var TOPIC = {
    'what-saku-is': { en: 'What Saku AI is', es: 'Qué es Saku AI' },
    'engine': { en: 'The engine', es: 'El motor' },
    'method': { en: 'The method', es: 'El método' },
    'industries': { en: 'Industries', es: 'Industrias' },
    'workshop': { en: 'The workshop', es: 'El workshop' },
    'pricing': { en: 'Pricing', es: 'Precios' },
    'proof': { en: 'Results', es: 'Resultados' },
    'booking': { en: 'Booking a call', es: 'Agendar una llamada' },
    'concierge': { en: 'What I am', es: 'Qué soy yo' },
    'contact': { en: 'Contact', es: 'Contacto' }
  };

  /* ==================================================================
     2. LANGUAGE + TEXT UTILITIES
     ================================================================== */

  var ES_MARKERS = ['que', 'como', 'cuanto', 'cuando', 'donde', 'quien', 'porque', 'para', 'con',
    'una', 'unos', 'las', 'los', 'del', 'por', 'mi', 'tu', 'su', 'es', 'son', 'esta', 'estan',
    'hola', 'buenas', 'gracias', 'quiero', 'necesito', 'puedo', 'puedes', 'tenéis', 'teneis',
    'hacéis', 'haceis', 'sois', 'vuestro', 'vuestra', 'precio', 'gratis', 'empresa', 'negocio'];

  /* Words too common to carry meaning. They still participate in phrase and
     in-order matching; they just cannot earn points on their own. The Spanish
     half matters as much as the English: without it, "que" alone drags every
     Spanish question toward whichever article happens to have the most keys. */
  var STOP = ['the', 'a', 'an', 'is', 'are', 'do', 'does', 'you', 'your', 'i', 'my', 'me', 'we',
    'to', 'of', 'for', 'and', 'in', 'on', 'it', 'this', 'that', 'can', 'could', 'would', 'what',
    'how', 'about', 'with', 'have', 'has', 'please', 'tell', 'give', 'any', 'some', 'so', 'really',
    'actually', 'exactly', 'just', 'there', 'here', 'be', 'am',
    'de', 'del', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'en', 'al',
    'se', 'su', 'sus', 'tu', 'mi', 'te', 'lo', 'por', 'para', 'con', 'que', 'es', 'son', 'esto',
    'esta', 'este', 'eso', 'esa', 'ese', 'muy', 'mas', 'hay', 'sobre', 'todo', 'toda'];

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokens(s) {
    return norm(s).split(' ').filter(function (t) { return t.length > 1; });
  }

  function detectLang(text) {
    var t = tokens(text);
    if (!t.length) return 'en';
    var hits = 0;
    for (var i = 0; i < t.length; i++) if (ES_MARKERS.indexOf(t[i]) !== -1) hits++;
    if (/[ñáéíóúü¿¡]/i.test(text)) hits += 2;
    return hits >= 2 || (hits >= 1 && t.length <= 3) ? 'es' : 'en';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function validEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());
  }

  /* ==================================================================
     3. RETRIEVAL — score the query against the KB
     ================================================================== */

  /* Are all of a key's words present in the query, in order, gaps allowed?
     This is what lets "what do you actually do" match the key "what do you do".
     It runs on the UNFILTERED tokens, because keys like that one are made
     entirely of stopwords and would otherwise score zero. */
  function inOrder(keyTokens, queryTokens) {
    var k = 0;
    for (var i = 0; i < queryTokens.length && k < keyTokens.length; i++) {
      if (queryTokens[i] === keyTokens[k]) k++;
    }
    return k === keyTokens.length;
  }

  function retrieve(query) {
    var q = norm(query);
    var qAll = tokens(query);
    if (!qAll.length) return null;
    var qContent = qAll.filter(function (w) { return STOP.indexOf(w) === -1; });

    var ranked = KB.map(function (entry) {
      var score = 0;
      for (var i = 0; i < entry.keys.length; i++) {
        var kw = norm(entry.keys[i]);
        var kt = kw.split(' ');

        if (kt.length > 1) {
          var ktContent = kt.filter(function (w) { return STOP.indexOf(w) === -1; });

          if (q.indexOf(kw) !== -1) {
            score += 4 * kt.length;                      // exact phrase
          } else if (inOrder(kt, qAll)) {
            score += 3 * kt.length;                      // every word, in order, filler between
          } else if (ktContent.length >= 2 && inOrder(ktContent, qContent)) {
            // Two meaning words minimum, scored on those words alone. A key
            // whose only real word is something as generic as "work" must not
            // claim a question: "how many people work here" is not about proof.
            score += 2.2 * ktContent.length;
          } else {
            var present = 0, contentPresent = 0, contentTotal = ktContent.length;
            for (var j = 0; j < kt.length; j++) {
              if (qAll.indexOf(kt[j]) !== -1) {
                present++;
                if (STOP.indexOf(kt[j]) === -1) contentPresent++;
              }
            }
            if (present === kt.length) score += 2.5 * kt.length;   // all words, any order
            else if (contentPresent > 0) score += 0.7 * contentPresent;
            // Stopword-only overlap earns nothing: "what"/"do"/"que" must not rank.
            else if (contentTotal === 0 && present > 0) score += 0.2 * present;
          }
        } else if (qAll.indexOf(kw) !== -1) {
          score += STOP.indexOf(kw) === -1 ? 3 : 0.5;
        }
      }
      return { entry: entry, score: score };
    }).sort(function (a, b) { return b.score - a.score; });

    var top = ranked[0];
    if (!top || top.score < 3) return null;

    var second = ranked[1] && ranked[1].score >= 3 && ranked[1].score >= top.score * 0.62
      ? ranked[1].entry : null;

    return {
      entry: top.entry,
      alt: second,
      confidence: top.score >= 8 ? 'high' : 'medium'
    };
  }

  /* Intents checked before retrieval. */
  var INTENT = {
    booking: ['book a', 'book the', 'book me', 'i want to book', 'schedule a', 'set up a call',
      'lets talk', 'let s talk', 'sign me up', 'book a session', 'book a demo', 'book a call',
      'quiero reservar', 'quiero agendar', 'agendame', 'reservar una', 'quiero una llamada',
      'apuntame', 'me interesa hablar'],
    greeting: ['hi', 'hello', 'hey', 'yo', 'hola', 'buenas', 'buenos dias', 'good morning', 'hey there'],
    thanks: ['thanks', 'thank you', 'cheers', 'gracias', 'muchas gracias', 'perfecto', 'great thanks'],
    human: ['talk to a human', 'speak to a human', 'real person', 'talk to andres', 'human please',
      'hablar con una persona', 'con un humano', 'persona real'],
    sensitive: ['refund', 'lawyer', 'legal action', 'sue', 'complaint', 'scam', 'fraud', 'gdpr',
      'data protection', 'my data', 'reembolso', 'demanda', 'abogado', 'queja', 'estafa',
      'proteccion de datos', 'mis datos'],
    cancel: ['cancel', 'nevermind', 'never mind', 'stop', 'forget it', 'cancelar', 'olvidalo', 'dejalo']
  };

  /* Word-boundary matching, not substring. Plain indexOf found "yo" inside
     "are you a bot" and greeted the visitor instead of answering. */
  function matchIntent(name, text) {
    var q = ' ' + norm(text) + ' ';
    var list = INTENT[name];
    for (var i = 0; i < list.length; i++) {
      if (q.indexOf(' ' + norm(list[i]) + ' ') !== -1) return true;
    }
    return false;
  }

  /* ==================================================================
     4. COPY
     ================================================================== */

  var T = {
    en: {
      title: 'CONCIERGE',
      sub: 'Answers from the knowledge base. Nothing invented.',
      live: 'Online',
      placeholder: 'Ask about Saku AI…',
      footnote: 'Grounded in ' + KB.length + ' KB articles',
      send: 'Send',
      close: 'Close chat',
      open: 'Chat with the Concierge',
      nudge: 'Ask me anything about Saku AI.',
      greetOpen: 'Hello. I am the SAKU Concierge, the agent demo on this site.\n\nI answer only from a fixed knowledge base and cite the article under every answer. Ask away, or I can book your call right here.',
      greeting: 'Hello. Ask me about Saku AI, or say "book a session" and I will take your details.',
      thanks: 'Any time. Want me to put you on the calendar while you are here?',
      escalate: 'That is not in my knowledge base, and I do not guess.\n\nI have logged it as a gap. Those go to Andrés and become the next article. Two ways forward: he answers you by email, or you put it to him on a 30-minute call.',
      sensitive: 'That one goes to a human, regardless of what my knowledge base says. It is the rule I run on.\n\nWrite to ' + CONFIG.email + ', or leave your details here and Andrés comes back to you within one business day.',
      human: 'Fair. Andrés handles these himself.\n\nLeave your details here and he replies within one business day, or write to ' + CONFIG.email + '.',
      chipEmail: 'Have him email me',
      chipBook: 'Book a session',
      askName: 'Let us get you on the calendar. What is your name?',
      askCompany: function (n) { return 'Thanks ' + n + '. What company are you with?'; },
      askEmail: 'Best email for the invite?',
      askEmailOnly: 'What is the best email to reach you at?',
      askGoal: 'Last one. What would you like to grow?',
      badEmail: 'That does not look like a working email. Try again?',
      recap: 'Here is what I will send:',
      confirmSend: 'Send it',
      confirmEdit: 'Start over',
      sending: 'Sending…',
      sent: 'Sent. Andrés replies within one business day.\n\nAnything else you want to know while you are here?',
      failed: 'I could not reach the form service, so I am not going to tell you it went through.\n\nYour details are safe. Send them straight to Andrés instead:',
      failedMail: 'Open a pre-filled email',
      failedCopy: 'Copy my details',
      copied: 'Copied',
      cancelled: 'Cancelled. Nothing sent. Ask me anything else.',
      skip: 'Skip',
      gapNote: 'Gap logged',
      sourceLabel: 'SOURCE',
      confHigh: 'HIGH',
      confMed: 'MED'
    },
    es: {
      title: 'CONCIERGE',
      sub: 'Respuestas desde la base de conocimiento. Nada inventado.',
      live: 'En línea',
      placeholder: 'Pregunta sobre Saku AI…',
      footnote: 'Basado en ' + KB.length + ' artículos',
      send: 'Enviar',
      close: 'Cerrar chat',
      open: 'Hablar con el Concierge',
      nudge: 'Pregúntame lo que quieras sobre Saku AI.',
      greetOpen: 'Hola. Soy el SAKU Concierge, la demo de agente de esta web.\n\nRespondo solo desde una base de conocimiento fija y cito el artículo bajo cada respuesta. Pregunta lo que quieras, o te agendo la llamada aquí mismo.',
      greeting: 'Hola. Pregúntame sobre Saku AI, o dime "reservar sesión" y tomo tus datos.',
      thanks: 'Cuando quieras. ¿Te pongo en el calendario ya que estás?',
      escalate: 'Eso no está en mi base de conocimiento, y no adivino.\n\nLo he registrado como hueco. Esos van a Andrés y se convierten en el próximo artículo. Dos caminos: te responde por email, o se lo planteas en una llamada de 30 minutos.',
      sensitive: 'Eso va a un humano, diga lo que diga mi base de conocimiento. Es la regla con la que funciono.\n\nEscribe a ' + CONFIG.email + ', o déjame tus datos y Andrés te contesta en un día laborable.',
      human: 'Justo. Andrés lleva esto en persona.\n\nDéjame tus datos y te responde en un día laborable, o escribe a ' + CONFIG.email + '.',
      chipEmail: 'Que me escriba',
      chipBook: 'Reservar sesión',
      askName: 'Vamos a ponerte en el calendario. ¿Cómo te llamas?',
      askCompany: function (n) { return 'Gracias ' + n + '. ¿De qué empresa eres?'; },
      askEmail: '¿Mejor email para la invitación?',
      askEmailOnly: '¿Cuál es el mejor email para contactarte?',
      askGoal: 'Última. ¿Qué te gustaría hacer crecer?',
      badEmail: 'Ese email no parece válido. ¿Lo intentas otra vez?',
      recap: 'Esto es lo que voy a enviar:',
      confirmSend: 'Enviar',
      confirmEdit: 'Empezar de nuevo',
      sending: 'Enviando…',
      sent: 'Enviado. Andrés responde en un día laborable.\n\n¿Algo más que quieras saber ya que estás?',
      failed: 'No he podido llegar al servicio de formularios, así que no te voy a decir que se envió.\n\nTus datos están a salvo. Mándaselos directamente a Andrés:',
      failedMail: 'Abrir un email ya escrito',
      failedCopy: 'Copiar mis datos',
      copied: 'Copiado',
      cancelled: 'Cancelado. No se ha enviado nada. Pregúntame otra cosa.',
      skip: 'Saltar',
      gapNote: 'Hueco registrado',
      sourceLabel: 'FUENTE',
      confHigh: 'ALTA',
      confMed: 'MEDIA'
    }
  };

  function t() { return T[state.lang]; }

  /* ==================================================================
     5. STATE
     ================================================================== */

  var state = {
    open: false,
    lang: (document.documentElement.lang || 'en').indexOf('es') === 0 ? 'es' : 'en',
    flow: null,          // null | 'booking' | 'emailOnly'
    step: null,
    draft: {},
    gaps: [],
    history: [],
    turns: [],           // the transcript, replayed after a page navigation
    busy: false,
    greeted: false
  };

  var MAX_TURNS = 30;

  try {
    var saved = sessionStorage.getItem('saku-concierge');
    if (saved) {
      var p = JSON.parse(saved);
      state.lang = p.lang || state.lang;
      state.gaps = p.gaps || [];
      state.greeted = !!p.greeted;
      state.turns = Array.isArray(p.turns) ? p.turns : [];
    }
  } catch (e) { /* sessionStorage unavailable, run stateless */ }

  function persist() {
    try {
      sessionStorage.setItem('saku-concierge', JSON.stringify({
        lang: state.lang,
        gaps: state.gaps,
        greeted: state.greeted,
        turns: state.turns.slice(-MAX_TURNS)
      }));
    } catch (e) { /* no-op */ }
  }

  /* Record a turn so the conversation survives a page navigation. Turns
     produced mid-booking are skipped: their prompts only make sense with the
     in-memory draft behind them, and that draft does not cross a page load. */
  function recordTurn(rec) {
    if (state.flow) return;
    state.turns.push(rec);
    if (state.turns.length > MAX_TURNS) state.turns = state.turns.slice(-MAX_TURNS);
    persist();
  }

  /* ==================================================================
     6. STYLES
     ================================================================== */

  var CSS = [
    '#sk-root{position:fixed;right:clamp(16px,3vw,26px);bottom:clamp(16px,3vw,26px);z-index:70;',
    'font-family:"Albert Sans",system-ui,sans-serif}',

    /* launcher */
    '#sk-root .sk-launch{position:relative;width:60px;height:60px;border-radius:9999px;border:none;',
    'background:#BF5B38;color:#FBF4EC;cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'box-shadow:0 2px 6px rgba(28,27,24,.14),0 14px 34px rgba(165,74,43,.34);',
    'transition:transform .24s cubic-bezier(.2,.9,.3,1.4),background .2s ease;margin-left:auto}',
    '#sk-root .sk-launch:hover{transform:translateY(-3px);background:#A54A2B}',
    '#sk-root .sk-launch:active{transform:translateY(-1px)}',
    '#sk-root .sk-launch:focus-visible{outline:2px solid #1C1B18;outline-offset:3px}',
    '#sk-root .sk-launch .sk-glyph{font-family:"Zen Kaku Gothic New",sans-serif;font-size:25px;font-weight:700;line-height:1}',
    '#sk-root .sk-launch .sk-x{font-size:20px;line-height:1;display:none}',
    '#sk-root.sk-on .sk-launch .sk-glyph{display:none}',
    '#sk-root.sk-on .sk-launch .sk-x{display:block}',
    '#sk-root .sk-halo{position:absolute;inset:-6px;border-radius:9999px;border:1.5px solid #BF5B38;',
    'animation:sk-halo 3.2s ease-out infinite;pointer-events:none}',
    '@keyframes sk-halo{0%{transform:scale(.86);opacity:.55}70%{transform:scale(1.28);opacity:0}100%{opacity:0}}',
    '#sk-root.sk-on .sk-halo{display:none}',

    /* unread nudge */
    '#sk-root .sk-nudge{position:absolute;right:74px;bottom:12px;width:max-content;max-width:224px;',
    'background:#FDFBF6;border:1px solid #E4DCCD;border-radius:10px 10px 2px 10px;padding:11px 14px;',
    'font-size:13.5px;line-height:1.5;color:#4C4840;box-shadow:0 2px 5px rgba(28,27,24,.05),0 14px 30px rgba(28,27,24,.09);',
    'opacity:0;transform:translateY(6px) scale(.97);pointer-events:none;transition:opacity .4s ease,transform .4s cubic-bezier(.22,1,.36,1)}',
    '#sk-root .sk-nudge.sk-in{opacity:1;transform:none;pointer-events:auto}',
    '#sk-root .sk-nudge button{position:absolute;top:-8px;right:-8px;width:21px;height:21px;border-radius:9999px;',
    'border:1px solid #E4DCCD;background:#FDFBF6;color:#8D8575;font-size:11px;line-height:1;cursor:pointer;padding:0}',
    '#sk-root .sk-nudge button:focus-visible{outline:2px solid #BF5B38;outline-offset:2px}',
    '@media (max-width:520px){#sk-root .sk-nudge{display:none}}',

    /* panel */
    '#sk-root .sk-panel{position:absolute;right:0;bottom:76px;width:min(384px,calc(100vw - 32px));',
    'height:min(624px,calc(100vh - 132px));background:#F7F2EA;border:1px solid #E4DCCD;border-radius:14px;',
    'display:flex;flex-direction:column;overflow:hidden;',
    'box-shadow:0 2px 8px rgba(28,27,24,.06),0 26px 64px rgba(28,27,24,.17);',
    'opacity:0;transform:translateY(14px) scale(.985);transform-origin:100% 100%;pointer-events:none;',
    'transition:opacity .26s ease,transform .3s cubic-bezier(.22,1,.36,1)}',
    '#sk-root.sk-on .sk-panel{opacity:1;transform:none;pointer-events:auto}',

    /* header */
    '#sk-root .sk-head{background:#24221E;padding:15px 17px 14px;position:relative;overflow:hidden;flex-shrink:0}',
    '#sk-root .sk-head .sk-ghost{position:absolute;right:-14px;top:-30px;font-family:"Zen Kaku Gothic New",sans-serif;',
    'font-size:108px;font-weight:700;line-height:1;color:rgba(247,242,234,.045);pointer-events:none}',
    '#sk-root .sk-headrow{display:flex;align-items:center;justify-content:space-between;gap:10px;position:relative}',
    '#sk-root .sk-eyebrow{font-family:"Zen Kaku Gothic New",sans-serif;font-size:11px;letter-spacing:.28em;',
    'color:#D98A66;font-weight:500;text-transform:uppercase}',
    '#sk-root .sk-sub{font-size:12.5px;line-height:1.55;color:#8D857A;margin:7px 0 0;position:relative;max-width:250px}',
    '#sk-root .sk-status{display:flex;align-items:center;gap:6px;font-family:"Zen Kaku Gothic New",sans-serif;',
    'font-size:10px;letter-spacing:.16em;color:#8D857A;font-weight:500;text-transform:uppercase}',
    '#sk-root .sk-status i{width:6px;height:6px;border-radius:9999px;background:#8FBFA4;display:block}',
    '#sk-root .sk-close{width:28px;height:28px;border-radius:7px;border:1px solid rgba(247,242,234,.16);',
    'background:transparent;color:#C9BFB0;font-size:14px;line-height:1;cursor:pointer;padding:0;flex-shrink:0}',
    '#sk-root .sk-close:hover{color:#F7F2EA;border-color:rgba(247,242,234,.34)}',
    '#sk-root .sk-close:focus-visible{outline:2px solid #BF5B38;outline-offset:2px}',

    /* transcript */
    '#sk-root .sk-log{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:18px 17px 6px;',
    'display:flex;flex-direction:column;gap:14px;scrollbar-width:thin;scrollbar-color:#D8CFBE transparent;',
    '-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 16px);',
    'mask-image:linear-gradient(to bottom,transparent 0,#000 16px)}',
    '#sk-root .sk-log::-webkit-scrollbar{width:7px}',
    '#sk-root .sk-log::-webkit-scrollbar-thumb{background:#D8CFBE;border-radius:9999px}',

    '#sk-root .sk-turn{display:flex;flex-direction:column;max-width:88%;animation:sk-rise .34s cubic-bezier(.22,1,.36,1) both}',
    '@keyframes sk-rise{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}',
    '#sk-root .sk-turn.sk-user{align-self:flex-end;align-items:flex-end}',
    '#sk-root .sk-bubble{font-size:14.5px;line-height:1.68;white-space:pre-wrap;word-break:break-word}',
    '#sk-root .sk-agent .sk-bubble{background:#FDFBF6;border:1px solid #E4DCCD;border-radius:10px 10px 10px 2px;',
    'padding:12px 14px;color:#4C4840}',
    '#sk-root .sk-user .sk-bubble{background:#1C1B18;border-radius:10px 10px 2px 10px;padding:11px 14px;color:#F1EAE0}',

    /* source citation — the signature */
    '#sk-root .sk-src{display:flex;align-items:center;gap:7px;margin:7px 0 0 2px;flex-wrap:nowrap;',
    'font-family:"Zen Kaku Gothic New",sans-serif;font-size:9.5px;letter-spacing:.15em;font-weight:500;',
    'color:#A29A8C;text-transform:uppercase}',
    '#sk-root .sk-src>span:first-child{flex-shrink:0}',
    '#sk-root .sk-src b{color:#A54A2B;font-weight:500;letter-spacing:.08em;text-transform:none;font-size:10.5px;',
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
    '#sk-root .sk-src .sk-rule{flex:1;height:1px;background:#E4DCCD;min-width:8px}',
    '#sk-root .sk-src .sk-dot{width:6px;height:6px;border-radius:9999px;border:1px solid #BF5B38;flex-shrink:0}',
    '#sk-root .sk-src .sk-dot.sk-full{background:#BF5B38}',
    '#sk-root .sk-src.sk-gap b{color:#8D8575}',
    '#sk-root .sk-src.sk-gap .sk-dot{border-color:#B4AA97;border-style:dashed}',

    /* chips */
    '#sk-root .sk-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}',
    '#sk-root .sk-chip{font-family:"Albert Sans",sans-serif;font-size:12.5px;line-height:1;color:#A54A2B;',
    'background:transparent;border:1px solid #D8CFBE;border-radius:9999px;padding:8px 13px;cursor:pointer;',
    'display:inline-flex;align-items:center;text-decoration:none;',
    'transition:border-color .2s ease,background .2s ease}',
    '#sk-root .sk-chip:hover{border-color:#BF5B38;background:#F5E7DA}',
    '#sk-root .sk-chip:focus-visible{outline:2px solid #BF5B38;outline-offset:2px}',
    '#sk-root .sk-chip[disabled]{opacity:.45;cursor:default}',

    /* recap card */
    '#sk-root .sk-recap{background:#FDFBF6;border:1px solid #E4DCCD;border-radius:10px;padding:13px 14px;margin-top:9px}',
    '#sk-root .sk-recap dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:7px 12px}',
    '#sk-root .sk-recap dt{font-family:"Zen Kaku Gothic New",sans-serif;font-size:9.5px;letter-spacing:.16em;',
    'color:#8D8575;text-transform:uppercase;font-weight:500;padding-top:3px}',
    '#sk-root .sk-recap dd{margin:0;font-size:14px;color:#1C1B18;line-height:1.5;word-break:break-word}',

    /* typing */
    '#sk-root .sk-typing{display:flex;gap:4px;padding:14px 15px;background:#FDFBF6;border:1px solid #E4DCCD;',
    'border-radius:10px 10px 10px 2px;width:max-content}',
    '#sk-root .sk-typing i{width:5px;height:5px;border-radius:9999px;background:#C9BFB0;display:block;',
    'animation:sk-blink 1.3s ease-in-out infinite}',
    '#sk-root .sk-typing i:nth-child(2){animation-delay:.18s}',
    '#sk-root .sk-typing i:nth-child(3){animation-delay:.36s}',
    '@keyframes sk-blink{0%,60%,100%{opacity:.3}30%{opacity:1}}',

    /* composer */
    '#sk-root .sk-foot{border-top:1px solid #E4DCCD;background:#F1EAE0;padding:11px 12px 9px;flex-shrink:0}',
    '#sk-root .sk-form{display:flex;align-items:flex-end;gap:8px}',
    '#sk-root .sk-input{flex:1;background:#FDFBF6;border:1px solid #D8CFBE;border-radius:9px;',
    'padding:11px 13px;font-family:"Albert Sans",sans-serif;font-size:14.5px;line-height:1.45;color:#1C1B18;',
    'resize:none;max-height:96px;min-height:42px;overflow-y:auto}',
    '#sk-root .sk-input::placeholder{color:#B4AA97}',
    '#sk-root .sk-input:focus{outline:2px solid #BF5B38;outline-offset:0;border-color:#BF5B38}',
    '#sk-root .sk-send{width:42px;height:42px;flex-shrink:0;border-radius:9px;border:none;background:#BF5B38;',
    'color:#FBF4EC;cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'transition:background .2s ease,opacity .2s ease}',
    '#sk-root .sk-send:hover{background:#A54A2B}',
    '#sk-root .sk-send:focus-visible{outline:2px solid #1C1B18;outline-offset:2px}',
    '#sk-root .sk-send[disabled]{opacity:.4;cursor:default;background:#BF5B38}',
    '#sk-root .sk-note{font-family:"Zen Kaku Gothic New",sans-serif;font-size:9.5px;letter-spacing:.16em;',
    'color:#A29A8C;text-transform:uppercase;font-weight:500;text-align:center;margin:8px 0 0}',
    '#sk-root .sk-note a{color:#A54A2B;text-decoration:none;border-bottom:1px solid #E4DCCD}',

    '#sk-root .sk-link{color:#A54A2B;text-decoration:none;border-bottom:1px solid #E4DCCD}',
    '#sk-root .sk-link:hover{border-color:#BF5B38}',
    '#sk-root .sk-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;',
    'clip:rect(0,0,0,0);white-space:nowrap;border:0}',

    /* mobile: bottom sheet. The launcher hides while open so it cannot sit on the send button. */
    '@media (max-width:520px){',
    '#sk-root{right:14px;bottom:14px}',
    '#sk-root .sk-panel{position:fixed;right:0;left:0;bottom:0;top:72px;width:auto;height:auto;',
    'border-radius:14px 14px 0 0;border-bottom:none;transform-origin:50% 100%}',
    '#sk-root.sk-on .sk-launch{display:none}',
    '}',

    '@media (prefers-reduced-motion: reduce){',
    '#sk-root *,#sk-root *::before,#sk-root *::after{animation:none!important;transition:none!important}',
    '#sk-root .sk-halo{display:none}',
    '}'
  ].join('');

  /* ==================================================================
     7. DOM
     ================================================================== */

  var ARROW = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 12h13M12 5l7 7-7 7"/></svg>';

  var root, panel, logEl, inputEl, sendEl, launchEl, nudgeEl, subEl, noteEl, statusEl;

  function build() {
    var style = document.createElement('style');
    style.id = 'sk-style';
    style.textContent = CSS;
    document.head.appendChild(style);

    root = document.createElement('div');
    root.id = 'sk-root';
    root.innerHTML =
      '<div class="sk-panel" role="dialog" aria-label="SAKU Concierge" aria-modal="false">' +
        '<div class="sk-head">' +
          '<span class="sk-ghost" aria-hidden="true">咲</span>' +
          '<div class="sk-headrow">' +
            '<span class="sk-eyebrow">案内 — <span class="sk-t-title">CONCIERGE</span></span>' +
            '<div class="sk-headrow" style="gap:9px">' +
              '<span class="sk-status"><i></i><span class="sk-t-live">Online</span></span>' +
              '<button class="sk-close" type="button" aria-label="Close chat">✕</button>' +
            '</div>' +
          '</div>' +
          '<p class="sk-sub"></p>' +
        '</div>' +
        '<div class="sk-log" role="log" aria-live="polite" aria-atomic="false"></div>' +
        '<div class="sk-foot">' +
          '<form class="sk-form">' +
            '<label class="sk-sr" for="sk-input">Message</label>' +
            '<textarea class="sk-input" id="sk-input" rows="1" autocomplete="off"></textarea>' +
            '<button class="sk-send" type="submit" aria-label="Send">' + ARROW + '</button>' +
          '</form>' +
          '<p class="sk-note"></p>' +
        '</div>' +
      '</div>' +
      '<div class="sk-nudge" role="status"><span class="sk-nudge-text"></span>' +
        '<button type="button" aria-label="Dismiss">✕</button></div>' +
      '<button class="sk-launch" type="button" aria-expanded="false">' +
        '<span class="sk-halo" aria-hidden="true"></span>' +
        '<span class="sk-glyph" aria-hidden="true">咲</span>' +
        '<span class="sk-x" aria-hidden="true">✕</span>' +
        '<span class="sk-sr">Chat with the Concierge</span>' +
      '</button>';
    document.body.appendChild(root);

    panel = root.querySelector('.sk-panel');
    logEl = root.querySelector('.sk-log');
    inputEl = root.querySelector('.sk-input');
    sendEl = root.querySelector('.sk-send');
    launchEl = root.querySelector('.sk-launch');
    nudgeEl = root.querySelector('.sk-nudge');
    subEl = root.querySelector('.sk-sub');
    noteEl = root.querySelector('.sk-note');
    statusEl = root.querySelector('.sk-t-live');

    applyLangChrome();

    launchEl.addEventListener('click', function () { toggle(!state.open); });
    root.querySelector('.sk-close').addEventListener('click', function () { toggle(false); });
    nudgeEl.querySelector('button').addEventListener('click', function (e) {
      e.stopPropagation();
      hideNudge();
    });
    nudgeEl.querySelector('.sk-nudge-text').addEventListener('click', function () { toggle(true); });

    root.querySelector('.sk-form').addEventListener('submit', function (e) {
      e.preventDefault();
      submitInput();
    });
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitInput(); }
    });
    inputEl.addEventListener('input', autoGrow);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.open) { toggle(false); launchEl.focus(); }
    });

    // Any "book" CTA on the page can open the agent instead of jumping.
    var hooks = document.querySelectorAll('[data-concierge]');
    for (var i = 0; i < hooks.length; i++) {
      hooks[i].addEventListener('click', function (e) {
        e.preventDefault();
        toggle(true);
        startBooking();
      });
    }
  }

  function applyLangChrome() {
    var c = t();
    root.querySelector('.sk-t-title').textContent = c.title;
    statusEl.textContent = c.live;
    subEl.textContent = c.sub;
    inputEl.placeholder = c.placeholder;
    noteEl.textContent = c.footnote;
    root.querySelector('.sk-nudge-text').textContent = c.nudge;
    root.querySelector('.sk-close').setAttribute('aria-label', c.close);
    root.querySelector('.sk-launch .sk-sr').textContent = c.open;
    sendEl.setAttribute('aria-label', c.send);
  }

  function autoGrow() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 96) + 'px';
  }

  /* ==================================================================
     8. RENDERING
     ================================================================== */

  function scrollDown() {
    logEl.scrollTop = logEl.scrollHeight;
  }

  /* Normalise every chip shape into {label, value}. Values starting with
     "kb:" or "__" are directives the router honours without retrieval. */
  function chipOf(ch) {
    if (typeof ch === 'string') return { label: ch, value: ch };
    if (ch.book) return { label: t().chipBook, value: '__book__' };
    if (ch.to) return { label: ch[state.lang] || ch.en, value: 'kb:' + ch.to };
    return { label: ch.label, value: ch.value || ch.label };
  }

  function addUser(text, replaying) {
    var el = document.createElement('div');
    el.className = 'sk-turn sk-user';
    el.innerHTML = '<div class="sk-bubble">' + esc(text) + '</div>';
    logEl.appendChild(el);
    scrollDown();
    if (!replaying) recordTurn({ r: 'u', t: text });
  }

  /* opts: { source, confidence, gap, chips, html, onChip, gapQuestion, replaying } */
  function addAgent(text, opts) {
    opts = opts || {};
    var el = document.createElement('div');
    el.className = 'sk-turn sk-agent';

    var body = '<div class="sk-bubble">' + (opts.html ? text : esc(text)) + '</div>';

    if (opts.source) {
      var c = t();
      var conf = opts.confidence === 'high' ? c.confHigh : c.confMed;
      body += '<div class="sk-src' + (opts.gap ? ' sk-gap' : '') + '">' +
        '<span>' + (opts.gap ? esc(c.gapNote) : esc(c.sourceLabel)) + '</span>' +
        '<b>' + esc(opts.source) + '</b>' +
        '<span class="sk-rule"></span>' +
        (opts.gap ? '' :
          '<span class="sk-dot' + (opts.confidence === 'high' ? ' sk-full' : '') + '"></span><span>' +
          esc(conf) + '</span>') +
        '</div>';
    }

    if (opts.extraHtml) body += opts.extraHtml;

    if (opts.chips && opts.chips.length) {
      body += '<div class="sk-chips">' + opts.chips.map(function (ch) {
        var c = chipOf(ch);
        return '<button class="sk-chip" type="button" data-v="' + esc(c.value) + '">' +
          esc(c.label) + '</button>';
      }).join('') + '</div>';
    }

    el.innerHTML = body;

    var chipEls = el.querySelectorAll('.sk-chip');
    for (var i = 0; i < chipEls.length; i++) {
      chipEls[i].addEventListener('click', function (e) {
        var group = e.target.parentNode.querySelectorAll('.sk-chip');
        for (var j = 0; j < group.length; j++) group[j].disabled = true;
        var v = e.target.getAttribute('data-v');
        if (opts.onChip) opts.onChip(v);
        else handle(v, e.target.textContent);
      });
    }

    logEl.appendChild(el);
    scrollDown();
    if (!opts.html) state.history.push({ role: 'agent', text: text });

    // extraHtml (the booking recap, the failover panel) is deliberately not
    // recorded: those only mean anything alongside live in-memory state.
    if (!opts.replaying && !opts.html && !opts.extraHtml) {
      recordTurn({
        r: 'a', t: text, f: opts.source || null, c: opts.confidence || null,
        g: !!opts.gap, ch: opts.chips || null, q: opts.gapQuestion || null
      });
    }
    return el;
  }

  /* Rebuild the transcript after a page navigation, through the same
     renderers, so a restored turn is indistinguishable from a live one. */
  function restoreTranscript() {
    if (!state.turns.length) return 0;
    var restored = 0;
    state.turns.forEach(function (rec) {
      if (rec.r === 'u') { addUser(rec.t, true); restored++; return; }
      addAgent(rec.t, {
        source: rec.f, confidence: rec.c, gap: rec.g, chips: rec.ch,
        replaying: true,
        onChip: rec.g ? function (v) {
          if (v === '__email__') startEmailOnly(rec.q || rec.t);
          else handle(v, t().chipBook);
        } : undefined
      });
      restored++;
    });
    state.flow = null;
    state.step = null;
    state.draft = {};
    return restored;
  }

  function typing() {
    var el = document.createElement('div');
    el.className = 'sk-turn sk-agent';
    el.innerHTML = '<div class="sk-typing"><i></i><i></i><i></i></div>';
    logEl.appendChild(el);
    scrollDown();
    return el;
  }

  /* Answer with a human-feeling beat, then render. */
  function reply(fn, ms) {
    state.busy = true;
    sendEl.disabled = true;
    var dots = typing();
    var wait = REDUCED ? 220 : (ms || 480 + Math.random() * 320);
    setTimeout(function () {
      dots.remove();
      state.busy = false;
      sendEl.disabled = false;
      fn();
    }, wait);
  }

  /* ==================================================================
     9. OPEN / CLOSE
     ================================================================== */

  function toggle(open) {
    state.open = open;
    root.classList.toggle('sk-on', open);
    launchEl.setAttribute('aria-expanded', String(open));
    if (open) {
      hideNudge();
      /* The invariant: an open panel is never empty. Greeting used to be
         gated on a "have we greeted before" flag that outlived the transcript,
         so a second page load opened to a blank window. Gate on the log. */
      if (!logEl.children.length) {
        state.greeted = true;
        persist();
        reply(function () {
          addAgent(t().greetOpen, {
            source: 'kb/concierge.md',
            confidence: 'high',
            chips: STARTERS
          });
        }, REDUCED ? 200 : 380);
      }
      setTimeout(function () { inputEl.focus(); }, 260);
    }
  }

  function showNudge() {
    if (state.open || state.greeted) return;
    nudgeEl.classList.add('sk-in');
    setTimeout(hideNudge, 9000);
  }
  function hideNudge() { nudgeEl.classList.remove('sk-in'); }

  /* ==================================================================
     10. CONVERSATION
     ================================================================== */

  function submitInput() {
    if (state.busy) return;
    var v = inputEl.value.trim();
    if (!v) return;
    inputEl.value = '';
    autoGrow();
    handle(v);
  }

  function handle(text, displayAs) {
    var label = displayAs || text;
    addUser(label);
    state.history.push({ role: 'user', text: label });

    /* Chip directives resolve straight to their article. A chip is a
       promise the visitor can see, so it must never miss. */
    if (text === '__book__') { startBooking(); return; }
    if (text.indexOf('kb:') === 0) {
      var target = KB_BY_ID[text.slice(3)];
      if (target) { reply(function () { renderEntry(target, 'high'); }); return; }
    }

    // Language mirrors the visitor, exactly like the Derby concierge rule.
    var detected = detectLang(text);
    if (detected !== state.lang && tokens(text).length >= 2) {
      state.lang = detected;
      persist();
      applyLangChrome();
    }

    if (state.flow) { advanceFlow(text); return; }

    if (matchIntent('cancel', text) && tokens(text).length <= 3) {
      reply(function () { addAgent(t().cancelled); });
      return;
    }
    if (matchIntent('sensitive', text)) {
      reply(function () {
        addAgent(t().sensitive, { chips: [{ book: true }] });
      });
      return;
    }
    if (matchIntent('human', text)) {
      reply(function () {
        addAgent(t().human, { chips: [{ book: true }] });
      });
      return;
    }
    if (matchIntent('booking', text) || norm(text) === norm(t().chipBook)) {
      startBooking();
      return;
    }
    if (matchIntent('greeting', text) && tokens(text).length <= 3) {
      reply(function () { addAgent(t().greeting, { chips: STARTERS }); });
      return;
    }
    if (matchIntent('thanks', text) && tokens(text).length <= 3) {
      reply(function () { addAgent(t().thanks, { chips: [{ book: true }] }); });
      return;
    }

    answer(text);
  }

  function answer(question) {
    // Live model path, if a proxy has been configured.
    if (CONFIG.endpoint) {
      state.busy = true;
      sendEl.disabled = true;
      var dots = typing();
      var ctrl = new AbortController();
      var killed = setTimeout(function () { ctrl.abort(); }, 9000);
      fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question, history: state.history.slice(-8), lang: state.lang }),
        signal: ctrl.signal
      })
        .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
        .then(function (d) {
          clearTimeout(killed);
          dots.remove();
          state.busy = false;
          sendEl.disabled = false;
          if (!d || !d.reply) throw new Error('empty');
          addAgent(d.reply, { source: d.source || null, confidence: d.confidence || 'medium' });
        })
        .catch(function () {
          clearTimeout(killed);
          dots.remove();
          state.busy = false;
          sendEl.disabled = false;
          localAnswer(question);
        });
      return;
    }
    reply(function () { localAnswer(question); });
  }

  function localAnswer(question) {
    var hit = retrieve(question);

    if (!hit) {
      state.gaps.push(question);
      persist();
      addAgent(t().escalate, {
        source: question.length > 46 ? question.slice(0, 46) + '…' : question,
        gap: true,
        gapQuestion: question,
        chips: [
          { label: t().chipEmail, value: '__email__' },
          { label: t().chipBook, value: '__book__' }
        ],
        onChip: function (v) {
          if (v === '__email__') startEmailOnly(question);
          else handle(t().chipBook, t().chipBook);
        }
      });
      return;
    }

    renderEntry(hit.entry, hit.confidence, hit.alt);
  }

  /* Single place an article becomes a message, used by both retrieval and
     chip directives, so a chip and a typed question render identically. */
  function renderEntry(entry, confidence, alt) {
    var chips = (entry.chips || []).slice();

    if (alt && TOPIC[alt.id]) {
      var already = chips.some(function (c) { return c && c.to === alt.id; });
      if (!already && alt.id !== entry.id) {
        chips.unshift({ to: alt.id, en: TOPIC[alt.id].en, es: TOPIC[alt.id].es });
      }
    }

    addAgent(entry[state.lang] || entry.en, {
      source: entry.file,
      confidence: confidence,
      chips: chips
    });
  }

  /* ---------------- booking flow ---------------- */

  function startBooking() {
    state.flow = 'booking';
    state.step = 'name';
    state.draft = {};
    reply(function () { addAgent(t().askName); });
  }

  function startEmailOnly(question) {
    state.flow = 'emailOnly';
    state.step = 'email';
    state.draft = { question: question };
    reply(function () { addAgent(t().askEmailOnly); });
  }

  function advanceFlow(text) {
    var c = t();

    if (matchIntent('cancel', text) && tokens(text).length <= 3) {
      state.flow = null; state.step = null; state.draft = {};
      reply(function () { addAgent(c.cancelled); });
      return;
    }

    if (state.flow === 'emailOnly') {
      if (!validEmail(text)) {
        reply(function () { addAgent(c.badEmail); });
        return;
      }
      state.draft.email = text.trim();
      send({
        name: 'Website visitor',
        company: '',
        email: state.draft.email,
        message: 'Asked the Concierge: "' + state.draft.question + '" (not covered by the KB).'
      });
      return;
    }

    switch (state.step) {
      case 'name':
        state.draft.name = text.trim().slice(0, 80);
        state.step = 'company';
        reply(function () { addAgent(c.askCompany(state.draft.name.split(' ')[0])); });
        break;

      case 'company':
        state.draft.company = /^(skip|saltar|-|na|n\/a)$/i.test(text.trim()) ? '' : text.trim().slice(0, 120);
        state.step = 'email';
        reply(function () { addAgent(c.askEmail); });
        break;

      case 'email':
        if (!validEmail(text)) {
          reply(function () { addAgent(c.badEmail); });
          return;
        }
        state.draft.email = text.trim();
        state.step = 'goal';
        reply(function () {
          addAgent(c.askGoal, {
            chips: [{ label: c.skip, value: '__skip__' }],
            onChip: function () { handle(c.skip, c.skip); }
          });
        });
        break;

      case 'goal':
        state.draft.message = /^(skip|saltar|-)$/i.test(text.trim()) ? '' : text.trim().slice(0, 900);
        state.step = 'confirm';
        reply(function () { showRecap(); });
        break;

      case 'confirm':
        // Free text at the confirm step means they are editing, so restart cleanly.
        state.step = 'name';
        state.draft = {};
        reply(function () { addAgent(c.askName); });
        break;
    }
  }

  function showRecap() {
    var c = t();
    var d = state.draft;
    var rows =
      '<div class="sk-recap"><dl>' +
        '<dt>' + (state.lang === 'es' ? 'Nombre' : 'Name') + '</dt><dd>' + esc(d.name) + '</dd>' +
        (d.company ? '<dt>' + (state.lang === 'es' ? 'Empresa' : 'Company') + '</dt><dd>' + esc(d.company) + '</dd>' : '') +
        '<dt>Email</dt><dd>' + esc(d.email) + '</dd>' +
        (d.message ? '<dt>' + (state.lang === 'es' ? 'Objetivo' : 'Goal') + '</dt><dd>' + esc(d.message) + '</dd>' : '') +
      '</dl></div>';

    addAgent(c.recap, {
      extraHtml: rows,
      chips: [
        { label: c.confirmSend, value: '__send__' },
        { label: c.confirmEdit, value: '__redo__' }
      ],
      onChip: function (v) {
        if (v === '__send__') {
          addUser(c.confirmSend);
          send(state.draft);
        } else {
          addUser(c.confirmEdit);
          state.step = 'name';
          state.draft = {};
          reply(function () { addAgent(c.askName); });
        }
      }
    });
  }

  /* ==================================================================
     DELIVERY
     One POST helper, shared by the widget and the page forms. It only
     resolves on a real 2xx. Anything else (timeout, DNS, CORS, 5xx,
     provider outage) rejects, and the caller shows the email handoff.
     ================================================================== */

  function postLead(payload, meta) {
    if (!CONFIG.formEndpoint) return Promise.reject(new Error('no endpoint'));

    var body = {
      name: payload.name || '',
      company: payload.company || '',
      email: payload.email || '',
      message: payload.message || '',
      _subject: (meta && meta.subject) || 'Lead — Saku AI',
      _template: 'table',
      _captcha: 'false',
      source: (meta && meta.source) || location.pathname,
      page: location.pathname
    };
    if (meta && meta.extra) {
      Object.keys(meta.extra).forEach(function (k) { body[k] = meta.extra[k]; });
    }

    var ctrl = new AbortController();
    var killed = setTimeout(function () { ctrl.abort(); }, CONFIG.formTimeoutMs);

    return fetch(CONFIG.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    })
      .then(function (r) {
        clearTimeout(killed);
        if (!r.ok) throw new Error('status ' + r.status);
        return r.json().catch(function () { return {}; });
      })
      .catch(function (e) {
        clearTimeout(killed);
        throw e;
      });
  }

  /* A mail draft carrying the whole lead. Works with no backend at all. */
  function mailtoFor(payload, extraLines) {
    var lines = [
      'Name: ' + (payload.name || ''),
      'Company: ' + (payload.company || ''),
      'Email: ' + (payload.email || '')
    ];
    if (payload.message) lines.push('', payload.message);
    if (extraLines && extraLines.length) lines.push('', extraLines.join('\n'));
    return {
      href: 'mailto:' + CONFIG.email +
        '?subject=' + encodeURIComponent('Saku AI — session request') +
        '&body=' + encodeURIComponent(lines.join('\n')),
      text: lines.join('\n')
    };
  }

  function copyText(text, btn, doneLabel) {
    var restore = btn.textContent;
    function ok() {
      btn.textContent = doneLabel;
      setTimeout(function () { btn.textContent = restore; }, 2200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { legacy(); });
    } else { legacy(); }
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { /* nothing else to try */ }
      ta.remove();
    }
  }

  function send(payload) {
    var c = t();
    state.flow = null;
    state.step = null;
    state.busy = true;
    sendEl.disabled = true;
    var dots = typing();

    postLead(payload, {
      subject: 'Concierge lead — Saku AI',
      source: 'concierge widget · ' + location.pathname,
      extra: state.gaps.length
        ? { language: state.lang, unanswered_questions: state.gaps.join(' | ') }
        : { language: state.lang }
    })
      .then(function () {
        dots.remove();
        state.busy = false;
        sendEl.disabled = false;
        state.gaps = [];
        persist();
        addAgent(c.sent, { chips: [STARTERS[0], STARTERS[2]] });
      })
      .catch(function () {
        dots.remove();
        state.busy = false;
        sendEl.disabled = false;
        failover(payload);
      });
  }

  /* Never drop a lead: hand over a pre-filled mail draft, or the raw text. */
  function failover(payload) {
    var c = t();
    var gapLines = state.gaps.length ? ['Asked but unanswered: ' + state.gaps.join(' | ')] : [];
    var mail = mailtoFor(payload, gapLines);

    var html =
      '<div class="sk-chips">' +
        '<a class="sk-chip" href="' + mail.href + '">' + esc(c.failedMail) + '</a>' +
        '<button class="sk-chip" type="button" data-v="__copy__">' + esc(c.failedCopy) + '</button>' +
      '</div>';

    var node = addAgent(c.failed, { extraHtml: html });
    var copyBtn = node.querySelector('[data-v="__copy__"]');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyText(CONFIG.email + '\n\n' + mail.text, copyBtn, c.copied);
      });
    }
  }

  /* ==================================================================
     PAGE FORMS
     The booking forms on this site POST straight to the lead provider.
     When that provider is unreachable the browser navigates to an error
     page and the lead is gone with no trace. Take the submit over: post
     it ourselves, only claim success on a real 2xx, and on failure show
     an inline recovery panel instead of leaving the page.
     ================================================================== */

  var FORM_COPY = {
    en: {
      sending: 'Sending…',
      failedTitle: 'That did not send.',
      failedBody: 'The form service is not responding, so we are not going to pretend it went through. Your details are safe. Send them straight to Andrés instead.',
      mail: 'Open a pre-filled email',
      copy: 'Copy my details',
      copied: 'Copied',
      retry: 'Try sending again'
    },
    es: {
      sending: 'Enviando…',
      failedTitle: 'No se ha enviado.',
      failedBody: 'El servicio de formularios no responde, así que no vamos a fingir que llegó. Tus datos están abajo, mándaselos directamente a Andrés.',
      mail: 'Abrir un email ya escrito',
      copy: 'Copiar mis datos',
      copied: 'Copiado',
      retry: 'Intentar de nuevo'
    }
  };

  var FORM_CSS = [
    '.sk-fallback{background:#FDFBF6;border:1px solid #D8B29A;border-radius:10px;padding:16px 17px;margin-top:16px;',
    'font-family:"Albert Sans",sans-serif}',
    '.sk-fallback h4{font-family:"Zen Kaku Gothic New",sans-serif;font-size:14.5px;font-weight:700;color:#A54A2B;margin:0 0 7px}',
    '.sk-fallback p{font-size:13.5px;line-height:1.65;color:#6E6A61;margin:0 0 13px}',
    '.sk-fallback .sk-fb-actions{display:flex;flex-wrap:wrap;gap:8px}',
    '.sk-fallback a,.sk-fallback button{font-family:"Albert Sans",sans-serif;font-size:13px;line-height:1;color:#A54A2B;',
    'background:transparent;border:1px solid #D8CFBE;border-radius:9999px;padding:9px 14px;cursor:pointer;',
    'display:inline-flex;align-items:center;text-decoration:none;transition:border-color .2s ease,background .2s ease}',
    '.sk-fallback a:hover,.sk-fallback button:hover{border-color:#BF5B38;background:#F5E7DA}',
    '.sk-fallback a:focus-visible,.sk-fallback button:focus-visible{outline:2px solid #BF5B38;outline-offset:2px}'
  ].join('');

  function hardenForms() {
    var forms = document.querySelectorAll('form[action*="formsubmit"],form[data-lead-form]');
    if (!forms.length) return;

    var s = document.createElement('style');
    s.textContent = FORM_CSS;
    document.head.appendChild(s);

    for (var i = 0; i < forms.length; i++) wire(forms[i]);

    function wire(form) {
      var btn = form.querySelector('[type="submit"]');
      var original = btn ? btn.textContent : '';

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var fc = FORM_COPY[state.lang] || FORM_COPY.en;

        var payload = {
          name: val(form, 'name'),
          company: val(form, 'company'),
          email: val(form, 'email'),
          message: val(form, 'message')
        };
        // Honour the honeypot exactly as the provider would.
        if (val(form, '_honey')) return;

        var old = form.querySelector('.sk-fallback');
        if (old) old.remove();
        if (btn) { btn.disabled = true; btn.textContent = fc.sending; }

        postLead(payload, {
          subject: val(form, '_subject') || 'New demo request — Saku AI',
          source: 'page form · ' + location.pathname
        })
          .then(function () {
            var next = val(form, '_next');
            window.location.href = next || 'thanks.html';
          })
          .catch(function () {
            if (btn) { btn.disabled = false; btn.textContent = original; }
            showFallback(form, payload, fc);
          });
      });
    }

    function val(form, name) {
      var el = form.querySelector('[name="' + name + '"]');
      return el ? String(el.value || '').trim() : '';
    }

    function showFallback(form, payload, fc) {
      var mail = mailtoFor(payload, []);
      var box = document.createElement('div');
      box.className = 'sk-fallback';
      box.setAttribute('role', 'alert');
      box.innerHTML =
        '<h4>' + esc(fc.failedTitle) + '</h4>' +
        '<p>' + esc(fc.failedBody) + '</p>' +
        '<div class="sk-fb-actions">' +
          '<a href="' + mail.href + '">' + esc(fc.mail) + '</a>' +
          '<button type="button" data-copy>' + esc(fc.copy) + '</button>' +
        '</div>';
      form.appendChild(box);
      var cb = box.querySelector('[data-copy]');
      cb.addEventListener('click', function () {
        copyText(CONFIG.email + '\n\n' + mail.text, cb, fc.copied);
      });
      box.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  /* ==================================================================
     11. BOOT
     ================================================================== */

  function boot() {
    build();
    restoreTranscript();
    hardenForms();
    if (!state.greeted && CONFIG.nudgeAfterMs) {
      setTimeout(showNudge, CONFIG.nudgeAfterMs);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
