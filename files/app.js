(function () {
    'use strict';

    // ── COMPATIBILIDADE E FALLBACKS PARA NAVEGADORES MÓVEIS ──
    if (!Object.assign) {
        Object.assign = function(target) {
            if (target == null) throw new TypeError('Cannot convert undefined or null to object');
            var to = Object(target);
            for (var i = 1; i < arguments.length; i++) {
                var source = arguments[i];
                if (source == null) continue;
                for (var key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        to[key] = source[key];
                    }
                }
            }
            return to;
        };
    }

    if (!Array.from) {
        Array.from = function(arrayLike) {
            var out = [];
            if (!arrayLike) return out;
            for (var i = 0; i < arrayLike.length; i++) out.push(arrayLike[i]);
            return out;
        };
    }

    if (!Array.prototype.includes) {
        Array.prototype.includes = function(searchElement) {
            if (this == null) throw new TypeError('"this" is null or not defined');
            var o = Object(this);
            var len = o.length >>> 0;
            if (len === 0) return false;
            var n = arguments.length > 1 ? Number(arguments[1]) : 0;
            var k = n >= 0 ? n : Math.max(len + n, 0);
            while (k < len) {
                if (o[k] === searchElement || (searchElement !== searchElement && o[k] !== o[k])) return true;
                k++;
            }
            return false;
        };
    }

    if (!String.prototype.padStart) {
        String.prototype.padStart = function(targetLength, padString) {
            targetLength = targetLength >> 0;
            padString = String(typeof padString !== 'undefined' ? padString : ' ');
            if (this.length >= targetLength) return String(this);
            targetLength = targetLength - this.length;
            if (targetLength > padString.length) {
                padString += new Array(Math.ceil(targetLength / padString.length) + 1).join(padString);
            }
            return padString.slice(0, targetLength) + String(this);
        };
    }

    if (!String.prototype.repeat) {
        String.prototype.repeat = function(count) {
            count = Number(count);
            if (count < 0 || count === Infinity) throw new RangeError('Invalid count value');
            count = Math.floor(count);
            if (this.length === 0 || count === 0) return '';
            var result = '';
            var str = String(this);
            while (count > 0) {
                if (count % 2 === 1) result += str;
                count = Math.floor(count / 2);
                if (count > 0) str += str;
            }
            return result;
        };
    }

    if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = function(callback, thisArg) {
            thisArg = thisArg || window;
            for (var i = 0; i < this.length; i++) callback.call(thisArg, this[i], i, this);
        };
    }

    if (window.Element && !Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector || function(selector) {
            var matches = (this.document || this.ownerDocument).querySelectorAll(selector);
            var i = 0;
            while (matches[i] && matches[i] !== this) i++;
            return !!matches[i];
        };
    }

    if (window.Element && !Element.prototype.closest) {
        Element.prototype.closest = function(selector) {
            var el = this;
            while (el && el.nodeType === 1) {
                if (el.matches(selector)) return el;
                el = el.parentElement || el.parentNode;
            }
            return null;
        };
    }

    if (window.Promise && !Promise.prototype.finally) {
        Promise.prototype.finally = function(onFinally) {
            var P = this.constructor;
            return this.then(
                function(value) { return P.resolve(onFinally && onFinally()).then(function() { return value; }); },
                function(reason) { return P.resolve(onFinally && onFinally()).then(function() { throw reason; }); }
            );
        };
    }

    if (!window.requestIdleCallback) {
        window.requestIdleCallback = function(cb, options) {
            var start = Date.now();
            return setTimeout(function() {
                cb({
                    didTimeout: false,
                    timeRemaining: function() {
                        return Math.max(0, 50 - (Date.now() - start));
                    }
                });
            }, (options && options.timeout) || 1);
        };
    }
    if (!window.cancelIdleCallback) {
        window.cancelIdleCallback = function(id) { clearTimeout(id); };
    }

    var memoryStorageFallback = {};
    function safeStorageGetItem(key) {
        try {
            if (window.localStorage) return window.localStorage.getItem(key);
        } catch (e) {}
        return Object.prototype.hasOwnProperty.call(memoryStorageFallback, key) ? memoryStorageFallback[key] : null;
    }
    function safeStorageSetItem(key, value) {
        var stringValue = String(value);
        try {
            if (window.localStorage) {
                window.localStorage.setItem(key, stringValue);
                return true;
            }
        } catch (e) {}
        memoryStorageFallback[key] = stringValue;
        return false;
    }
    function safeStorageRemoveItem(key) {
        try {
            if (window.localStorage) {
                window.localStorage.removeItem(key);
                return true;
            }
        } catch (e) {}
        if (Object.prototype.hasOwnProperty.call(memoryStorageFallback, key)) delete memoryStorageFallback[key];
        return false;
    }

    function safeScrollIntoView(el, options, fallbackAlignTop) {
        if (!el || typeof el.scrollIntoView !== 'function') return;
        try {
            el.scrollIntoView(options || { behavior: 'smooth', block: 'start' });
        } catch (e) {
            try { el.scrollIntoView(fallbackAlignTop !== false); } catch (ignored) {}
        }
    }

    function safeScrollToTop() {
        try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            window.scrollTo(0, 0);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // SEGURANÇA — SANITIZAÇÃO DE SAÍDA
    // ══════════════════════════════════════════════════════════════
    function escapeHtml(str) {
        var m = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' };
        return String(str).replace(/[&<>"']/g, function(c) { return m[c]; });
    }

    // ══════════════════════════════════════════════════════════════
    // Proteção contra clickjacking em runtime
    // ══════════════════════════════════════════════════════════════
    if (window.top !== window.self) {
        try {
            window.top.location = window.self.location;
        } catch (e) {
            document.body.innerHTML = '<div style="padding:2rem;font-family:sans-serif;text-align:center;"><h1>Acesso inválido</h1><p>Esta página não pode ser incorporada noutros sites.</p></div>';
        }
    }

    // ── Base de dados clínica ──
    var baseDados = [
        {
            nome: "Vaginose Bacteriana (VB)",
            patogeno: "Gardnerella vaginalis e anaeróbios",
            tipo: "flora",
            fisiopatologia: "Disbiose vaginal com depleção de Lactobacillus e proliferação polimicrobiana. pH vaginal sobe acima de 4.5, criando condições para anaeróbios produzirem aminas (putrescina, cadaverina) responsáveis pelo odor.",
            transmissao: "Desequilíbrio ecológico endógeno. Risco aumentado por duchas vaginais, novos parceiros e tabagismo.",
            sintomasLista: "Corrimento cinzento-esbranquiçado fino, odor a peixe (piora após relação sexual e menstruação). 50% assintomática.",
            tratamento: "Metronidazol 500 mg oral 2×/dia por 7 dias (1ª linha). Alternativa: gel vaginal 0.75% por 5 dias. Taxa de recorrência alta (~50% em 12 meses).",
            triggers: ["odor-peixe", "corrimento-cinza", "dor-coito"],
            cite: "Muzny & Schwebke, J Infect Dis 2016; CDC STI Guidelines 2021"
        },
        {
            nome: "Candidíase Vulvovaginal",
            patogeno: "Candida albicans (75%), C. glabrata",
            tipo: "flora",
            fisiopatologia: "Proliferação fúngica oportunista por desequilíbrio imunológico. O fungo transita de comensal a patogénico. Fatores precipitantes: antibioterapia, diabetes, gravidez, imunossupressão.",
            transmissao: "Infeção endógena (oportunista). Não é classicamente uma IST.",
            sintomasLista: "Prurido intenso (cardinal), corrimento branco grumoso (aspeto de coalho), eritema e edema vulvar, ardor na micção.",
            tratamento: "Fluconazol 150 mg oral dose única (1ª linha). Clotrimazol creme 1% ou óvulos por 7 dias (topicamente). Formas recorrentes: fluconazol semanal por 6 meses.",
            triggers: ["prurido", "branco-espesso", "vermelhidao"],
            cite: "Sobel JD, Lancet 2007 (rev. 2016); CDC STI Guidelines 2021"
        },
        {
            nome: "Gonorreia e Clamídia",
            patogeno: "Neisseria gonorrhoeae / Chlamydia trachomatis",
            tipo: "ist",
            fisiopatologia: "Infeção bacteriana do epitélio mucoso da uretra, colo do útero ou reto. A clamídia é intracelular obrigatória; a gonorreia tem resistência antimicrobiana crescente. Co-infeção frequente (~40% dos casos).",
            transmissao: "Contacto sexual (vaginal, oral, anal). A clamídia é a IST bacteriana mais notificada no mundo.",
            sintomasLista: "Corrimento purulento uretral ou cervical, disúria, sangramento intermenstrual. 70-80% das mulheres com clamídia são assintomáticas.",
            tratamento: "Ceftriaxona 500 mg IM + Azitromicina 1 g oral (dose única, cobertura combinada). Parceiro tratado obrigatoriamente.",
            triggers: ["purulento", "dor-urinar", "corrimento-transparente", "urinario-freq", "dor-garganta"],
            cite: "Workowski et al., MMWR 2021; WHO STI Guidelines 2021"
        },
        {
            nome: "Tricomoníase",
            patogeno: "Trichomonas vaginalis (protozoário flagelado)",
            tipo: "ist",
            fisiopatologia: "O protozoário adere ao epitélio vaginal, provocando inflamação severa (colpite). IST não viral mais comum no mundo, com ~156 milhões de casos anuais.",
            transmissao: "Contacto sexual. Incubação: 4-28 dias.",
            sintomasLista: "Corrimento espumoso verde-amarelado, odor fétido acentuado, prurido vulvar e ardor.",
            tratamento: "Metronidazol 2 g oral dose única (1ª linha). Tratar o parceiro obrigatoriamente. Evitar álcool durante tratamento.",
            triggers: ["espumoso", "odor-peixe", "prurido"],
            cite: "Kissinger PJ, Curr Infect Dis Rep 2015; WHO 2021"
        },
        {
            nome: "Sífilis",
            patogeno: "Treponema pallidum (espiroqueta)",
            tipo: "ist",
            fisiopatologia: "Infeção sistémica progressiva em 4 fases. Primária: cancro duro (úlcera indolor). Secundária: rash generalizado (palmas/plantas). Latente: sem sintomas. Terciária: comprometimento cardiovascular e neurológico.",
            transmissao: "Contacto sexual com lesões ativas. Transmissão vertical causa sífilis congénita.",
            sintomasLista: "Primária: úlcera genital única, indolor, de base endurecida. Secundária: erupção cutânea no corpo, incluindo palmas e plantas dos pés.",
            tratamento: "Penicilina Benzatina 2.4 MU IM (dose única para sífilis primária/secundária). Controlo com VDRL aos 3, 6 e 12 meses.",
            triggers: ["ferida-indolor", "erupcao-cutanea", "ganglios"],
            cite: "MISAU 2021; Workowski et al., MMWR 2021"
        },
        {
            nome: "Herpes Genital",
            patogeno: "Herpes Simplex Vírus tipo 2 (HSV-2)",
            tipo: "viral",
            fisiopatologia: "Após a primoinfecção, o vírus estabelece latência permanente nos gânglios sacrais. Reativações periódicas com excreção viral — mesmo sem lesões visíveis.",
            transmissao: "Contacto direto com lesões ativas ou excreção viral assintomática. Sem cura disponível.",
            sintomasLista: "Bolhas (vesículas) agrupadas, muito dolorosas. Primoinfecção: febre, linfadenopatia inguinal, disúria.",
            tratamento: "Aciclovir 400 mg 3×/dia por 7-10 dias (crise aguda). Supressão contínua (400 mg 2×/dia) para reduzir recorrências.",
            triggers: ["vesiculas", "ganglios", "febre"],
            cite: "Looker et al., PLOS ONE 2015; CDC 2021"
        },
        {
            nome: "HPV (Papilomavírus Humano)",
            patogeno: "Human Papillomavirus — serotipos 6, 11 (verrugas), 16, 18 (oncogénicos)",
            tipo: "viral",
            fisiopatologia: "O vírus infeta os queratinócitos basais. Serotipos de baixo risco causam condilomas. Serotipos de alto risco causam lesões displásicas que podem progredir para carcinoma cervical.",
            transmissao: "Contacto sexual e pele-com-pele. IST mais prevalente globalmente.",
            sintomasLista: "Verrugas genitais (condilomas acuminados): excrescências carnosas, não dolorosas, aspeto de 'crista de galo'.",
            tratamento: "Remoção de lesões: ácido tricloroacético, crioterapia ou laser. Vacinação HPV (Gardasil 9) previne 90% dos condilomas.",
            triggers: ["verrugas"],
            cite: "Bruni et al., Lancet Glob Health 2023; WHO 2022"
        },
        {
            nome: "Cervicite",
            patogeno: "N. gonorrhoeae, C. trachomatis (causa mais frequente)",
            tipo: "ist",
            fisiopatologia: "Inflamação do epitélio endocervical tornando o tecido friável. Pode ser assintomática. A cervicite não tratada é porta de entrada para DIP.",
            transmissao: "Contacto sexual sem preservativo.",
            sintomasLista: "Corrimento mucopurulento cervical, sangramento após relação sexual ou entre menstruações, por vezes dor pélvica leve.",
            tratamento: "Ceftriaxona + Azitromicina/Doxiciclina (cobertura dupla). Confirmação por exame especular e testes NAAT (PCR).",
            triggers: ["purulento", "sangramento", "dor-coito"],
            cite: "Workowski et al., MMWR 2021"
        },
        {
            nome: "Doença Inflamatória Pélvica (DIP)",
            patogeno: "Polimicrobiano (Gonorreia, Clamídia, anaeróbios)",
            tipo: "ist",
            fisiopatologia: "Infeção ascendente do trato genital superior, afetando útero, trompas e ovários. Pode complicar com abcesso tubo-ovárico.",
            transmissao: "Ascensão de patógenos sexualmente transmitidos. Maior risco em jovens com múltiplos parceiros.",
            sintomasLista: "Dor pélvica bilateral intensa, febre > 38°C, corrimento anormal, dor à mobilização do colo.",
            tratamento: "Ceftriaxona 500 mg IM + Doxiciclina 100 mg 2×/dia + Metronidazol 500 mg 2×/dia por 14 dias. Internamento se grave.",
            triggers: ["dor-pelvica", "febre", "purulento", "dor-coito"],
            cite: "Ross J, Sex Transm Infect 2014; MISAU 2021"
        },
        {
            nome: "Cancro Mole (Cancróide)",
            patogeno: "Haemophilus ducreyi",
            tipo: "ist",
            fisiopatologia: "Infeção bacteriana que causa necrose tecidual localizada. Facilitador da transmissão de HIV (aumenta risco 3-5×). Prevalente em África Subsaariana.",
            transmissao: "Contacto sexual direto com lesões ativas.",
            sintomasLista: "Múltiplas úlceras genitais dolorosas com fundo purulento. Adenopatia inguinal dolorosa (bubão) em 50% dos casos.",
            tratamento: "Azitromicina 1 g oral dose única (1ª linha). Alternativa: Ceftriaxona 250 mg IM.",
            triggers: ["ferida-dolorosa", "ganglios"],
            cite: "Workowski et al., MMWR 2021; OMS 2021"
        },
        {
            nome: "Hepatite B (VHB)",
            patogeno: "Vírus da Hepatite B (hepadnavirus)",
            tipo: "viral",
            fisiopatologia: "Infeção viral do fígado. 90% dos adultos eliminam o vírus espontaneamente. 10% desenvolvem infeção crónica com risco de cirrose e carcinoma hepatocelular.",
            transmissao: "Sexual, parenteral (sangue), vertical. Sobrevive fora do corpo até 7 dias.",
            sintomasLista: "Icterícia (pele/olhos amarelados), fadiga extrema, urina escura, náuseas, dor abdominal.",
            tratamento: "Fase aguda: suporte. Crónica: Tenofovir. Vacinação (3 doses, eficácia >95%) incluída no PNV de Moçambique.",
            triggers: ["ictericia", "fadiga", "febre"],
            cite: "WHO Hepatitis B Fact Sheet 2022"
        },
        {
            nome: "HIV / SIDA",
            patogeno: "Vírus da Imunodeficiência Humana (retrovírus)",
            tipo: "viral",
            fisiopatologia: "O vírus infeta e destrói células T-CD4+, comprometendo progressivamente a imunidade.",
            transmissao: "Sexual, parenteral, vertical. IST ativa aumenta o risco de transmissão 3-5×.",
            sintomasLista: "Síndrome retroviral aguda: febre, faringite, linfadenopatia generalizada, rash, fadiga. Depois período longo assintomático.",
            tratamento: "TARV (1ª linha: Tenofovir + Lamivudina + Dolutegravir). Indetectável = Intransmissível (I=I). PrEP para prevenção.",
            triggers: ["febre", "ganglios", "fadiga", "ganglios-generalizados", "perda-peso", "erupcao-cutanea", "dor-garganta"],
            cite: "UNAIDS 2023; MISAU Protocolo TARV 2022"
        },
        {
            nome: "Vaginite Aeróbica",
            patogeno: "Escherichia coli, Streptococcus agalactiae, Staphylococcus aureus",
            tipo: "flora",
            fisiopatologia: "Inflamação vaginal com atrofia epitelial por bactérias aeróbias intestinais. pH elevado, leucócitos presentes (inflamação real), sem odor a aminas.",
            transmissao: "Desequilíbrio da microbiota endógena. Não é classicamente uma IST.",
            sintomasLista: "Corrimento amarelado pegajoso, ardor e prurido intenso, dispareunia, eritema vaginal.",
            tratamento: "Canamicina 250 mg vaginal (1ª linha). Clindamicina creme. Estrogénio tópico se atrofia epitelial presente.",
            triggers: ["purulento", "prurido", "dor-urinar", "vermelhidao"],
            cite: "Donders GG, et al., Am J Obstet Gynecol 2002"
        }
    ];

    // ── CONTAGEM DE SINTOMAS ──
    function updateCount() {
        var checked = document.querySelectorAll('#symptoms-form input[type="checkbox"]:checked').length;
        var el = document.getElementById('sel-count-num');
        if (el) el.textContent = checked;
    }

    // ── VISUAL FEEDBACK NOS CHECKBOXES ──
    document.querySelectorAll('.symptom-item input[type="checkbox"]').forEach(function(cb) {
        cb.addEventListener('change', function() {
            this.closest('.symptom-item').classList.toggle('selected', this.checked);
            updateCount();
            gaEvent('symptom_toggle', 'triagem', this.value + (this.checked ? '_checked' : '_unchecked'));
        });
    });

    // ── BADGE HELPERS ──
    function getBadge(tipo) {
        var b = {
            ist:   '<span class="badge badge-ist">IST Bacteriana</span>',
            viral: '<span class="badge badge-viral">Viral / Sistémica</span>',
            flora: '<span class="badge badge-flora">Flora Vaginal</span>'
        };
        return b[tipo] || '';
    }

    // ── DEBOUNCE PARA GERAÇÃO ──
    var isGenerating = false;

    function gerarDiagnostico() {
        if (isGenerating) return;

        var selecionados = Array.from(
            document.querySelectorAll('#symptoms-form input[type="checkbox"]:checked')
        ).map(function(i) { return i.value; });

        var container = document.getElementById('diagnosticos-container');
        var area = document.getElementById('results-area');

        if (selecionados.length === 0) {
            alert('Para gerar o relatório, assinale pelo menos um sintoma.');
            return;
        }

        isGenerating = true;
        var btnGerar = document.getElementById('btn-gerar');
        btnGerar.disabled = true;
        btnGerar.textContent = '⏳ A analisar...';

        gaEvent('triagem_gerada', 'triagem', 'sintomas_count_' + selecionados.length, selecionados.length);
        gaEvent('generate_report', 'engagement', 'symptom_selection', selecionados.length);

        setTimeout(function() {
            container.innerHTML = '';

            var meta = document.getElementById('results-meta');
            if (meta) {
                meta.textContent = selecionados.length + ' sintoma(s) analisado(s) · ' + new Date().toLocaleDateString('pt-PT');
            }

            var matches = baseDados
                .map(function(d) {
                    return Object.assign({}, d, { matchCount: d.triggers.filter(function(t) { return selecionados.includes(t); }).length });
                })
                .filter(function(d) { return d.matchCount > 0; })
                .sort(function(a, b) { return b.matchCount - a.matchCount; });

            if (matches.length === 0) {
                var noMatch = document.createElement('div');
                noMatch.className = 'diagnosis-card';
                noMatch.innerHTML = '<div class="diagnosis-top-bar"><div class="diag-name-wrap"><p class="diagnosis-name">Nenhum padrão identificado</p></div></div><div class="diagnosis-body"><div class="info-block" style="grid-column:1/-1"><p class="info-text">Os sintomas assinalados não correspondem a um padrão específico na nossa base de dados. Isto não exclui patologia — recomendamos a realização de exames laboratoriais no centro de saúde mais próximo.</p></div></div>';
                container.appendChild(noMatch);
            } else {
                matches.forEach(function(d, idx) {
                    var isTop = idx === 0 && d.matchCount > 1;
                    var topClass = isTop ? ' top-match' : '';
                    var topBadge = isTop ? '<span class="badge badge-top">✦ Maior correlação</span>' : '';
                    var matchBadge = '<span class="badge badge-match">' + d.matchCount + ' sintoma(s) em comum</span>';
                    var card = document.createElement('div');
                    card.className = 'diagnosis-card' + topClass;
                    card.style.animationDelay = (idx * 0.08) + 's';

                    card.innerHTML =
                        '<div class="diagnosis-top-bar' + topClass + '">' +
                            '<div class="diag-name-wrap">' +
                                '<p class="diagnosis-name">' + escapeHtml(d.nome) + '</p>' +
                                '<p class="diag-patogen">' + escapeHtml(d.patogeno) + '</p>' +
                            '</div>' +
                            '<div class="badge-row">' + getBadge(d.tipo) + matchBadge + topBadge + '</div>' +
                        '</div>' +
                        '<div class="diagnosis-body">' +
                            '<div class="info-block"><span class="info-label">Fisiopatologia</span><p class="info-text">' + escapeHtml(d.fisiopatologia) + '</p></div>' +
                            '<div class="info-block"><span class="info-label">Transmissão e Epidemiologia</span><p class="info-text">' + escapeHtml(d.transmissao) + '</p></div>' +
                            '<div class="info-block"><span class="info-label">Apresentação Clínica</span><p class="info-text">' + escapeHtml(d.sintomasLista) + '</p></div>' +
                            '<div class="treatment-block"><div class="treatment-icon" aria-hidden="true">✚</div><div class="treatment-text"><strong>Protocolo de Tratamento</strong>' + escapeHtml(d.tratamento) + '</div></div>' +
                            '<div class="diag-cite">📚 Referências: ' + escapeHtml(d.cite) + '</div>' +
                        '</div>';
                    container.appendChild(card);
                });

                if (matches[0]) {
                    gaEvent('diagnosis_result', 'triagem', matches[0].nome, matches[0].matchCount);
                }
            }

            area.style.display = 'block';
            setTimeout(function() {
                safeScrollIntoView(area, { behavior: 'smooth', block: 'start' }, true);
            }, 100);

            btnGerar.disabled = false;
            btnGerar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Gerar Relatório Preliminar';
            isGenerating = false;

        }, 200);
    }

    function limparDados() {
        document.querySelectorAll('#symptoms-form input[type="checkbox"]').forEach(function(cb) {
            cb.checked = false;
            cb.closest('.symptom-item').classList.remove('selected');
        });
        updateCount();
        document.getElementById('results-area').style.display = 'none';
        gaEvent('form_reset', 'triagem', 'clear_button');
        safeScrollToTop();
    }

    document.getElementById('btn-gerar').addEventListener('click', gerarDiagnostico);
    document.getElementById('btn-limpar').addEventListener('click', limparDados);

    // ── TABS E NAVEGAÇÃO ──
    var tabBtns = document.querySelectorAll('.tab-btn');
    var tabPanels = document.querySelectorAll('.tab-panel');
    window.portalState = window.portalState || {};
    var modulesReady = { cycle: false, vault: false };
    var tabAliases = {
        triagem: 'triagem',
        guia: 'guia',
        prevencao: 'guia',
        'prevenção': 'guia',
        calendario: 'calendario',
        calendario_ciclo: 'calendario',
        ciclo: 'calendario',
        contracetivos: 'contracetivos',
        contraceptivos: 'contracetivos',
        cofre: 'cofre',
        faq: 'guia',
        perguntas: 'guia',
        'perguntas-frequentes': 'guia',
        duvidas: 'guia',
        glossario: 'glossario',
        glossario_medico: 'glossario'
    };

    function normalizeTabId(tabId) {
        var raw = String(tabId || '').replace(/^#/, '').trim();
        if (!raw) return 'triagem';
        var normalized = tabAliases[raw] || raw;
        return document.getElementById('tab-' + normalized) ? normalized : 'triagem';
    }

    function mergeFaqIntoGuide() {
        var guidePanel = document.getElementById('tab-guia');
        var faqPanel = document.getElementById('tab-faq');
        if (!guidePanel || !faqPanel || faqPanel.hasAttribute('data-guide-section')) return;

        faqPanel.id = 'faq';
        faqPanel.classList.remove('tab-panel');
        faqPanel.classList.add('guide-faq-section');
        faqPanel.removeAttribute('role');
        faqPanel.setAttribute('data-guide-section', '1');
        guidePanel.appendChild(faqPanel);
    }

    mergeFaqIntoGuide();

    function ensureFeatureModules(tabId) {
        tabId = normalizeTabId(tabId);
        if (tabId === 'calendario' && !modulesReady.cycle) {
            try {
                initCycleTracker();
                modulesReady.cycle = true;
            } catch (e) {
                console.error('Falha ao inicializar Diário do Ciclo:', e);
            }
        }
        if (tabId === 'cofre' && !modulesReady.vault) {
            try {
                initHealthVault();
                modulesReady.vault = true;
            } catch (e) {
                console.error('Falha ao inicializar Cofre de Saúde:', e);
            }
        }
    }

    function activateTab(tabId, options) {
        options = options || {};
        tabId = normalizeTabId(tabId);
        ensureFeatureModules(tabId);
        tabBtns.forEach(function(b) {
            var active = b.dataset.tab === tabId;
            b.classList.toggle('active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        tabPanels.forEach(function(p) {
            p.classList.toggle('active', p.id === 'tab-' + tabId);
        });
        if (!options.skipHash && window.history && window.history.replaceState) {
            var nextHash = '#' + (options.targetId || tabId);
            if (window.location.hash !== nextHash) {
                window.history.replaceState(null, '', nextHash);
            }
        }
        gaEvent('tab_click', 'navigation', tabId);
        return tabId;
    }

    function scrollToTabs() {
        var tabs = document.getElementById('tabs-container');
        if (tabs) safeScrollIntoView(tabs, { behavior: 'smooth', block: 'start' }, true);
    }

    function openTabFromDashboard(tabId) {
        if (!tabId) return;
        activateTab(tabId);
        scrollToTabs();
    }

    function updateMainDashboard() {
        var state = window.portalState || {};
        var cycle = state.cycle || {};
        var vault = state.vault || {};
        var storage = state.storage || {};
        var storagePersistence = state.storagePersistence || '';

        var actions = [];
        var alerts = [];

        if (!cycle.hasCycleData) {
            actions.push('Registar a última menstruação para ativar previsões personalizadas.');
        } else {
            actions.push('Atualizar sintomas e humor do dia no Diário do Ciclo.');
            if (cycle.phaseLabel) actions.push('Fase atual: ' + cycle.phaseLabel + '. Ajuste nutrição e rotina de descanso.');
            if (cycle.currentDay && cycle.delayThreshold && cycle.currentDay > cycle.delayThreshold) {
                alerts.push('Atraso menstrual superior ao padrão esperado.');
            }
            if (cycle.irregular) {
                alerts.push('Ciclo com padrão irregular detetado automaticamente.');
            }
            if (cycle.todayPain !== undefined && Number(cycle.todayPain) >= 8) {
                alerts.push('Dor intensa registada hoje (>=8/10).');
            }
            if (cycle.todayUnusualCount && cycle.todayUnusualCount > 0) {
                alerts.push('Sintomas incomuns registados hoje no diário.');
            }
            if (cycle.isFertileWindow) {
                alerts.push('Janela fértil ativa: atenção aos objetivos reprodutivos e método de prevenção.');
            }
        }

        if ((vault.recordsCount || 0) === 0) {
            actions.push('Adicionar o primeiro registo clínico no Cofre de Saúde.');
        } else {
            actions.push('Rever e atualizar registos clínicos recentes no cofre.');
        }
        if ((vault.activeMeds || 0) > 0) {
            if ((vault.notTakenToday || 0) > 0) {
                alerts.push(vault.notTakenToday + ' medicamento(s) ativo(s) sem confirmação de toma hoje.');
            } else {
                actions.push('Todos os medicamentos ativos marcados como tomados hoje.');
            }
        }
        if ((vault.docsCount || 0) === 0) {
            actions.push('Anexar exames (foto/PDF) para organizar o histórico médico.');
        }
        if (storagePersistence === 'best-effort') {
            actions.push('Mantenha o portal em uso regular para reduzir risco de limpeza automática do armazenamento pelo navegador.');
        }
        actions.push('Revisar métodos contracetivos conforme o seu perfil e necessidades atuais.');

        var priority = 'Baixa';
        if (alerts.length >= 3) priority = 'Alta';
        else if (alerts.length >= 1) priority = 'Média';

        var dataStatus = 'OK';
        if (storage.ok === false) dataStatus = 'ERRO';
        else if (storage.ok === true && storage.lastSaved) dataStatus = 'OK';

        var actionsCountEl = document.getElementById('dash-actions-count');
        var priorityEl = document.getElementById('dash-priority-level');
        var alertCountEl = document.getElementById('dash-alert-count');
        var dataStatusEl = document.getElementById('dash-data-status');
        var actionsListEl = document.getElementById('dash-actions-list');
        var alertsListEl = document.getElementById('dash-alerts-list');
        var priorityBar = document.getElementById('dash-priority-alert');

        if (actionsCountEl) actionsCountEl.textContent = String(actions.length);
        if (priorityEl) priorityEl.textContent = priority;
        if (alertCountEl) alertCountEl.textContent = String(alerts.length);
        if (dataStatusEl) dataStatusEl.textContent = dataStatus + (storagePersistence === 'best-effort' ? '*' : '');

        if (actionsListEl) {
            actionsListEl.innerHTML = actions.map(function(a) {
                return '<div style="margin-bottom:5px;"><span style="color:var(--teal);font-weight:700;">•</span> ' + escapeHtml(a) + '</div>';
            }).join('');
        }
        if (alertsListEl) {
            if (alerts.length === 0) {
                alertsListEl.innerHTML = '<div style="color:var(--teal-dark);font-weight:600;">Sem alertas críticos no momento.</div>';
            } else {
                alertsListEl.innerHTML = alerts.map(function(a) {
                    return '<div style="margin-bottom:5px;"><span style="color:var(--rose);font-weight:700;">•</span> ' + escapeHtml(a) + '</div>';
                }).join('');
            }
        }

        if (priorityBar) {
            if (alerts.length === 0) {
                priorityBar.style.display = 'none';
                priorityBar.innerHTML = '';
            } else {
                priorityBar.style.display = 'block';
                priorityBar.innerHTML = '<strong>Prioridade ' + priority + ':</strong> ' + escapeHtml(alerts[0]);
            }
        }
    }

    window.updateMainDashboard = updateMainDashboard;

    function initDashboardActions() {
        document.querySelectorAll('[data-dashboard-tab]').forEach(function(btn) {
            if (btn.hasAttribute('data-bound')) return;
            btn.addEventListener('click', function() {
                var tab = this.getAttribute('data-dashboard-tab');
                openTabFromDashboard(tab);
                gaEvent('dashboard_action_click', 'dashboard', tab || 'unknown');
            });
            btn.setAttribute('data-bound', '1');
        });
    }

    function initContraceptiveTracking() {
        var cards = document.querySelectorAll('#tab-contracetivos .guide-card');
        cards.forEach(function(card) {
            if (card.hasAttribute('data-track-bound')) return;
            card.style.cursor = 'pointer';
            card.addEventListener('click', function() {
                var titleEl = this.querySelector('.guide-card-name');
                var label = titleEl ? titleEl.textContent.trim() : 'card';
                gaEvent('contraceptive_card_click', 'contraceptivos', label);
            });
            card.setAttribute('data-track-bound', '1');
        });
    }

    function initPWAInstall() {
        var installBtn = document.getElementById('install-app-btn');
        var deferredPrompt = null;
        var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;

        function showInstallHelp() {
            var isiOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
            var message = isiOS
                ? 'Para instalar no iPhone: toque no botão Partilhar do Safari e escolha "Adicionar ao Ecrã principal".'
                : 'Para instalar no Android: abra o menu do navegador e escolha "Instalar app" ou "Adicionar ao ecrã inicial".';
            window.alert(message);
            gaEvent('pwa_install_help', 'pwa', isiOS ? 'ios_manual' : 'manual');
        }

        if (standalone && installBtn) {
            installBtn.style.display = 'none';
            return;
        }

        if ('serviceWorker' in navigator && window.isSecureContext) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.getRegistration('./').then(function(existingReg) {
                    if (existingReg) return existingReg;
                    return navigator.serviceWorker.register('./sw.js', { scope: './' });
                })
                    .then(function() { gaEvent('pwa_sw_registered', 'pwa', 'success'); })
                    .catch(function() { gaEvent('pwa_sw_registered', 'pwa', 'error'); });
            });
        }

        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            if (installBtn) installBtn.classList.add('show');
            gaEvent('pwa_install_prompt_ready', 'pwa', 'available');
        });

        if (installBtn && !installBtn.hasAttribute('data-bound')) {
            installBtn.addEventListener('click', function() {
                if (!deferredPrompt) {
                    showInstallHelp();
                    return;
                }
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function(choiceResult) {
                    gaEvent('pwa_install_choice', 'pwa', choiceResult.outcome || 'unknown');
                    deferredPrompt = null;
                    installBtn.classList.remove('show');
                });
            });
            installBtn.setAttribute('data-bound', '1');
        }

        window.addEventListener('appinstalled', function() {
            gaEvent('pwa_installed', 'pwa', 'installed');
            if (installBtn) installBtn.classList.remove('show');
        });
    }

    function isNotificationSupported() {
        return 'Notification' in window;
    }

    var PUSH_PUBLIC_KEY = '<COLOQUE_SUA_CHAVE_VAPID_PÚBLICA_AQUI>';

    function getPushSubscriptionFromStorage() {
        try {
            return JSON.parse(safeStorageGetItem('intimateHealthPushSubscription'));
        } catch (e) {
            return null;
        }
    }

    function setPushSubscriptionToStorage(subscription) {
        if (!subscription) {
            safeStorageRemoveItem('intimateHealthPushSubscription');
            return;
        }
        safeStorageSetItem('intimateHealthPushSubscription', JSON.stringify(subscription));
    }

    function getPushPublicKey() {
        if (!PUSH_PUBLIC_KEY || PUSH_PUBLIC_KEY.indexOf('<') !== -1) return null;
        return PUSH_PUBLIC_KEY;
    }

    function urlBase64ToUint8Array(base64String) {
        var padding = '='.repeat((4 - base64String.length % 4) % 4);
        var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        var rawData = window.atob(base64);
        var outputArray = new Uint8Array(rawData.length);
        for (var i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    function subscribeToPushNotifications() {
        return new Promise(function(resolve, reject) {
            var vapidKey = getPushPublicKey();
            if (!vapidKey) {
                reject(new Error('Chave VAPID pública não está configurada.'));
                return;
            }
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                reject(new Error('Push API não suportado neste navegador.'));
                return;
            }

            navigator.serviceWorker.ready.then(function(registration) {
                return registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey)
                });
            }).then(function(subscription) {
                setPushSubscriptionToStorage(subscription.toJSON());
                resolve(subscription);
            }).catch(function(err) {
                reject(err);
            });
        });
    }

    function updatePushSubscriptionButton() {
        var pushBtn = document.getElementById('cycle-subscribe-push');
        if (!pushBtn) return;
        var subscription = getPushSubscriptionFromStorage();
        if (subscription && Notification.permission === 'granted') {
            pushBtn.textContent = 'Notificações push ativas';
        } else {
            pushBtn.textContent = 'Inscrever notificações push';
        }
    }

    function getCycleNotificationEnabled() {
        return safeStorageGetItem('intimateHealthNotifyEnabled') === 'true';
    }

    function setCycleNotificationEnabled(enabled) {
        safeStorageSetItem('intimateHealthNotifyEnabled', enabled ? 'true' : 'false');
    }

    function showLocalNotification(title, body) {
        if (!isNotificationSupported() || Notification.permission !== 'granted') return;
        var options = {
            body: body,
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png',
            vibrate: [100, 50, 100],
            data: { timestamp: Date.now() }
        };
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(function(reg) {
                if (reg.showNotification) {
                    reg.showNotification(title, options);
                } else {
                    new Notification(title, options);
                }
            }).catch(function() {
                new Notification(title, options);
            });
        } else {
            new Notification(title, options);
        }
    }

    function requestCycleNotificationPermission(callback) {
        if (!isNotificationSupported()) {
            if (callback) callback(false);
            return;
        }
        var handled = false;
        function applyPermission(permission) {
            if (handled) return;
            handled = true;
            if (permission === 'granted') {
                setCycleNotificationEnabled(true);
                if (callback) callback(true);
            } else {
                setCycleNotificationEnabled(false);
                if (callback) callback(false);
            }
        }
        try {
            var maybePromise = Notification.requestPermission(function(permission) {
                applyPermission(permission);
            });
            if (maybePromise && typeof maybePromise.then === 'function') {
                maybePromise.then(function(permission) {
                    applyPermission(permission);
                }).catch(function() {
                    applyPermission('denied');
                });
            } else if (typeof maybePromise === 'string') {
                applyPermission(maybePromise);
            }
        } catch (e) {
            applyPermission(Notification.permission || 'denied');
        }
    }

    function renderCycleNotificationUI() {
        var banner = document.getElementById('cycle-notification-banner');
        var btn = document.getElementById('cycle-enable-notifications');
        if (!banner || !btn) return;
        if (!isNotificationSupported()) {
            banner.style.display = 'block';
            banner.textContent = 'Notificações não suportadas neste navegador. Teste Chrome/Edge no seu telefone para receber lembretes do ciclo.';
            btn.disabled = true;
            return;
        }
        var enabled = getCycleNotificationEnabled();
        banner.style.display = 'block';
        if (Notification.permission === 'denied') {
            banner.innerHTML = 'Notificações bloqueadas. Permitidas nas definições do navegador para receber alertas do ciclo.';
            btn.textContent = 'Restaurar notificações';
            return;
        }
        if (enabled) {
            banner.innerHTML = 'Notificações ativadas. Receba alertas de menstruação, janela fértil e ovulação sempre que abrir o app.';
            btn.textContent = 'Desativar notificações';
        } else {
            banner.innerHTML = 'Ative notificações para receber lembretes do ciclo menstrual, fertilidade e ovulação no seu dispositivo móvel.';
            btn.textContent = 'Ativar notificações';
        }
        updatePushSubscriptionButton();
    }

    function scheduleCycleNotification(state, metrics) {
        if (!state || !state.hasCycle || !getCycleNotificationEnabled() || Notification.permission !== 'granted') return;
        var todayKey = toLocalISODate(new Date());
        var lastSent = safeStorageGetItem('intimateHealthNotifyLastSent') || '';
        if (lastSent === todayKey) return;
        var title = 'Diário do Ciclo';
        var body = 'Atualize o seu diário do ciclo hoje e verifique as previsões de menstruação e fertilidade.';
        if (state.phase.code === 'menstrual') {
            body = 'Hoje está na fase menstrual. Registe sintomas, hidrate-se e monitore o fluxo.';
        } else if (state.phase.code === 'fertil') {
            body = 'Janela fértil ativa. Se não deseja gravidez, mantenha a proteção ou registe o seu estado.';
        } else if (toLocalISODate(state.ovulation) === todayKey) {
            body = 'Ovulação prevista hoje. Observe sinais de fertilidade e mantenha o registo do estado.';
        } else if (state.phase.code === 'lutea') {
            body = 'Fase lútea ativa. Cuide da nutrição e registe o humor e sintomas.';
        }
        showLocalNotification(title, body);
        safeStorageSetItem('intimateHealthNotifyLastSent', todayKey);
    }

    function updateCycleNotificationState(state, metrics) {
        renderCycleNotificationUI();
        scheduleCycleNotification(state, metrics);
    }

    tabBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            activateTab(btn.dataset.tab);
            safeScrollIntoView(btn, { behavior: 'smooth', block: 'nearest', inline: 'center' }, true);
        });
    });

    function scrollToNavigationTarget(targetId) {
        var targetEl = targetId ? document.getElementById(targetId) : null;
        var fallback = document.getElementById('tabs-container');
        window.setTimeout(function() {
            safeScrollIntoView(targetEl || fallback, { behavior: 'smooth', block: 'start' }, true);
        }, 0);
    }

    function getHashId() {
        var hash = window.location.hash || '';
        if (!hash || hash.length < 2) return '';
        try {
            return decodeURIComponent(hash.substring(1)).trim();
        } catch (e) {
            return hash.substring(1).trim();
        }
    }

    function routeHashToTab(shouldScroll) {
        var hashId = getHashId();
        if (!hashId) return;
        var mappedTab = tabAliases[hashId] || (document.getElementById('tab-' + hashId) ? hashId : '');
        if (!mappedTab) return;
        var tabId = activateTab(mappedTab, { skipHash: true });
        var targetId = hashId !== tabId && document.getElementById(hashId) ? hashId : null;
        if (shouldScroll) scrollToNavigationTarget(targetId);
    }

    window.addEventListener('hashchange', function() {
        routeHashToTab(true);
    });

    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            var navTab = this.dataset.navTab;
            var href = this.getAttribute('href');
            var targetId = href && href.length > 1 ? href.substring(1) : null;

            if (navTab) {
                e.preventDefault();
                activateTab(navTab, { targetId: document.getElementById(targetId) ? targetId : navTab });
                scrollToNavigationTarget(document.getElementById(targetId) ? targetId : null);
            } else if (targetId) {
                var targetEl = document.getElementById(targetId);
                if (targetEl) {
                    e.preventDefault();
                    safeScrollIntoView(targetEl, { behavior: 'smooth', block: 'start' }, true);
                }
            }
            var mobileMenuBtn = document.getElementById('mobile-menu-btn');
            var navList = document.querySelector('.nav-links');
            if (navList && mobileMenuBtn) {
                navList.classList.remove('show');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            }
        });
    });

    var mobileMenuBtn = document.getElementById('mobile-menu-btn');
    var mobileNav = document.querySelector('.nav-links');
    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', function() {
            var isOpen = mobileNav.classList.toggle('show');
            this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
        document.addEventListener('click', function(event) {
            if (!mobileNav.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
                mobileNav.classList.remove('show');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            }
        }, true);
    }

    // ── FAQ ACCORDION ──
    document.querySelectorAll('.faq-question').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var answer = this.nextElementSibling;
            var isOpen = answer.classList.contains('open');

            document.querySelectorAll('.faq-answer').forEach(function(a) { a.classList.remove('open'); });
            document.querySelectorAll('.faq-question').forEach(function(b) {
                b.classList.remove('open');
                b.setAttribute('aria-expanded', 'false');
            });

            if (!isOpen) {
                answer.classList.add('open');
                this.classList.add('open');
                this.setAttribute('aria-expanded', 'true');
                gaEvent('faq_open', 'engagement', this.textContent.trim().substring(0, 50));
                var inContraceptivesTab = !!this.closest('#tab-contracetivos');
                if (inContraceptivesTab) {
                    gaEvent('contraceptive_faq_open', 'contraceptivos', this.textContent.trim().substring(0, 50));
                }
            }
        });
    });

    // ── SCROLL REVEAL ──
    var revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(e) {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    observer.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });
        revealEls.forEach(function(el) { observer.observe(el); });
    } else {
        revealEls.forEach(function(el) { el.classList.add('visible'); });
    }

    // ── BACK TO TOP ──
    var backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        var scrollThreshold = 400;
        window.addEventListener('scroll', function() {
            if (window.scrollY > scrollThreshold) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        }, { passive: true });

        backToTopBtn.addEventListener('click', function() {
            safeScrollToTop();
            gaEvent('back_to_top', 'navigation', 'button_click', Math.round(window.scrollY));
        });
    }

    // ── GA: Page engagement ──
    var scrollDepth25 = false, scrollDepth50 = false, scrollDepth75 = false;
    window.addEventListener('scroll', function() {
        var total = document.body.scrollHeight - window.innerHeight;
        if (total <= 0) return;
        var pct = (window.scrollY / total) * 100;
        if (!scrollDepth25 && pct >= 25) { scrollDepth25 = true; gaEvent('scroll_depth', 'engagement', '25%', 25); }
        if (!scrollDepth50 && pct >= 50) { scrollDepth50 = true; gaEvent('scroll_depth', 'engagement', '50%', 50); }
        if (!scrollDepth75 && pct >= 75) { scrollDepth75 = true; gaEvent('scroll_depth', 'engagement', '75%', 75); }
    }, { passive: true });

    setTimeout(function() { gaEvent('time_on_page', 'engagement', '30s'); }, 30000);
    setTimeout(function() { gaEvent('time_on_page', 'engagement', '90s'); }, 90000);
    setTimeout(function() { gaEvent('time_on_page', 'engagement', '3min'); }, 180000);

    // ── UTILITÁRIOS DE ARMAZENAMENTO LOCAL ──
    var APP_STORAGE_KEYS = {
        cycles: 'intimateHealthCycles',
        dailyLogs: 'intimateHealthDailyLogs',
        vaultProfile: 'intimateHealthVault_Profile_v2',
        vaultRecords: 'intimateHealthVault_Records_v2',
        vaultMeds: 'intimateHealthVault_Meds_v2',
        vaultMedIntake: 'intimateHealthVault_MedIntake_v2',
        vaultDocMeta: 'intimateHealthVault_DocMeta_v2'
    };

    function safeJsonParse(raw, fallback) {
        if (!raw) return fallback;
        try { return JSON.parse(raw); } catch (e) { return fallback; }
    }

    function storageRead(key, fallback) {
        var raw = safeStorageGetItem(key);
        if (raw) return safeJsonParse(raw, fallback);
        var backupRaw = safeStorageGetItem(key + '_backup');
        if (!backupRaw) return fallback;
        var backup = safeJsonParse(backupRaw, null);
        if (backup && backup.data !== undefined) return backup.data;
        return fallback;
    }

    function storageWrite(key, value) {
        try {
            var mainStored = safeStorageSetItem(key, JSON.stringify(value));
            var backupStored = safeStorageSetItem(key + '_backup', JSON.stringify({
                savedAt: new Date().toISOString(),
                data: value
            }));
            var persisted = !!(mainStored && backupStored);
            window.portalState = window.portalState || {};
            window.portalState.storage = {
                ok: persisted,
                key: key,
                lastSaved: new Date().toISOString(),
                mode: persisted ? 'localStorage' : 'memory-fallback'
            };
            return persisted;
        } catch (e) {
            console.warn('Falha ao guardar dados locais:', key, e);
            window.portalState = window.portalState || {};
            window.portalState.storage = {
                ok: false,
                key: key,
                errorAt: new Date().toISOString()
            };
            return false;
        }
    }

    function initLocalDataPersistence() {
        if (!navigator.storage || !navigator.storage.persisted) return;
        navigator.storage.persisted().then(function(isPersistent) {
            window.portalState = window.portalState || {};
            window.portalState.storagePersistence = isPersistent ? 'persistent' : 'best-effort';
            if (isPersistent) {
                gaEvent('storage_persistence_status', 'storage', 'persistent');
                return;
            }
            if (!navigator.storage.persist) {
                gaEvent('storage_persistence_status', 'storage', 'unsupported');
                return;
            }
            navigator.storage.persist().then(function(granted) {
                window.portalState.storagePersistence = granted ? 'persistent' : 'best-effort';
                gaEvent('storage_persistence_request', 'storage', granted ? 'granted' : 'denied');
            }).catch(function() {
                gaEvent('storage_persistence_request', 'storage', 'error');
            });
        }).catch(function() {
            gaEvent('storage_persistence_status', 'storage', 'error');
        });
    }

    function toLocalISODate(date) {
        var d = new Date(date);
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }

    function fromISODate(iso) {
        if (!iso) return null;
        var p = String(iso).split('-');
        if (p.length !== 3) return null;
        return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    }

    function addDays(date, days) {
        var d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    }

    function diffDays(a, b) {
        var d1 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
        var d2 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
        return Math.round((d1 - d2) / 86400000);
    }

    function average(list, fallback) {
        if (!Array.isArray(list) || list.length === 0) return fallback;
        return list.reduce(function(sum, v) { return sum + v; }, 0) / list.length;
    }

    function stdDev(list) {
        if (!Array.isArray(list) || list.length < 2) return 0;
        var mean = average(list, 0);
        var variance = average(list.map(function(v) { return Math.pow(v - mean, 2); }), 0);
        return Math.sqrt(variance);
    }

    function clamp(n, min, max) {
        return Math.min(max, Math.max(min, n));
    }

    function formatDatePT(date) {
        return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // ── DIÁRIO DO CICLO (VERSÃO MELHORADA) ──
    function initCycleTracker() {
        var form = document.getElementById('cycle-form');
        var dateInput = document.getElementById('period-start');
        var lengthInput = document.getElementById('period-length');
        var flowInput = document.getElementById('flow-intensity');
        var historyList = document.getElementById('cycle-history-list');
        var btnClear = document.getElementById('btn-clear-history');
        var btnSaveDaily = document.getElementById('cycle-save-day');
        var btnPregnant = document.getElementById('btn-pregnant-mode');
        var painInput = document.getElementById('cycle-pain');
        var energyInput = document.getElementById('cycle-energy');
        var painValue = document.getElementById('cycle-pain-value');
        var energyValue = document.getElementById('cycle-energy-value');
        var dayNote = document.getElementById('cycle-day-note');
        var dailyHistory = document.getElementById('cycle-daily-history');
        var notifyToggleBtn = document.getElementById('cycle-enable-notifications');
        var notifyTestBtn = document.getElementById('cycle-test-notification');
        var notifyPushBtn = document.getElementById('cycle-subscribe-push');
        var notifyBanner = document.getElementById('cycle-notification-banner');

        if (!form || !historyList) return;

        var cycles = storageRead(APP_STORAGE_KEYS.cycles, []);
        var dailyLogs = storageRead(APP_STORAGE_KEYS.dailyLogs, {});
        var cyclesSnapshotBeforeInit = '';
        var logsSnapshotBeforeInit = '';
        try { cyclesSnapshotBeforeInit = JSON.stringify(cycles || []); } catch (e) {}
        try { logsSnapshotBeforeInit = JSON.stringify(dailyLogs || {}); } catch (e) {}

        function normalizeCycles() {
            cycles = (Array.isArray(cycles) ? cycles : []).map(function(c) {
                return {
                    id: Number(c.id || Date.now()),
                    date: String(c.date || ''),
                    periodLength: clamp(Number(c.periodLength || 5), 1, 15),
                    flow: c.flow || 'Normal'
                };
            }).filter(function(c) {
                return /^\d{4}-\d{2}-\d{2}$/.test(c.date);
            });
        }

        function normalizeLogs() {
            if (!dailyLogs || typeof dailyLogs !== 'object') dailyLogs = {};
            Object.keys(dailyLogs).forEach(function(dayKey) {
                var e = dailyLogs[dayKey];
                if (Array.isArray(e)) {
                    dailyLogs[dayKey] = {
                        physical: e.slice(),
                        mood: [],
                        unusual: [],
                        pain: 0,
                        energy: 5,
                        note: '',
                        savedAt: null
                    };
                    return;
                }
                dailyLogs[dayKey] = {
                    physical: Array.isArray(e.physical) ? e.physical : [],
                    mood: Array.isArray(e.mood) ? e.mood : [],
                    unusual: Array.isArray(e.unusual) ? e.unusual : [],
                    pain: clamp(Number(e.pain || 0), 0, 10),
                    energy: clamp(Number(e.energy || 5), 0, 10),
                    note: String(e.note || ''),
                    savedAt: e.savedAt || null
                };
            });
        }

        function saveCycles() { storageWrite(APP_STORAGE_KEYS.cycles, cycles); }
        function saveLogs() { storageWrite(APP_STORAGE_KEYS.dailyLogs, dailyLogs); }
        var cycleUpdateQueued = false;
        function requestCycleUIUpdate() {
            if (cycleUpdateQueued) return;
            cycleUpdateQueued = true;
            var scheduler = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 16); };
            scheduler(function() {
                cycleUpdateQueued = false;
                updateUI();
            });
        }

        function ensureTodayEntry() {
            var key = toLocalISODate(new Date());
            if (!dailyLogs[key]) {
                dailyLogs[key] = { physical: [], mood: [], unusual: [], pain: 0, energy: 5, note: '', savedAt: null };
            }
            return { key: key, entry: dailyLogs[key] };
        }

        function sortedAsc() {
            return cycles.slice().sort(function(a, b) {
                return fromISODate(a.date) - fromISODate(b.date);
            });
        }

        function computeAccuracy(sorted) {
            if (sorted.length < 4) return { value: 65, samples: 0 };
            var scores = [];
            for (var i = 2; i < sorted.length; i++) {
                var hist = [];
                for (var j = Math.max(1, i - 6); j <= i - 1; j++) {
                    var c1 = fromISODate(sorted[j].date);
                    var c0 = fromISODate(sorted[j - 1].date);
                    if (!c1 || !c0) continue;
                    var len = diffDays(c1, c0);
                    if (len >= 18 && len <= 45) hist.push(len);
                }
                var prev = fromISODate(sorted[i - 1].date);
                var actual = fromISODate(sorted[i].date);
                if (!prev || !actual) continue;
                var avg = Math.round(average(hist, 28));
                var predicted = addDays(prev, avg);
                var err = Math.abs(diffDays(actual, predicted));
                var score = clamp(100 - (err * 10), 0, 100);
                scores.push(score);
            }
            if (scores.length === 0) return { value: 65, samples: 0 };
            return { value: Math.round(average(scores, 65)), samples: scores.length };
        }

        function computeMetrics() {
            var asc = sortedAsc();
            var lengths = [];
            for (var i = 1; i < asc.length; i++) {
                var a = fromISODate(asc[i].date);
                var b = fromISODate(asc[i - 1].date);
                if (!a || !b) continue;
                var len = diffDays(a, b);
                if (len >= 15 && len <= 60) lengths.push(len);
            }

            var avgCycle = Math.round(average(lengths, 28));
            var avgBleeding = Math.round(average(asc.map(function(c) { return Number(c.periodLength) || 5; }), 5));
            var variation = stdDev(lengths);
            var accuracy = computeAccuracy(asc);
            var irregular = avgCycle < 21 || avgCycle > 35 || variation >= 6 || lengths.filter(function(v) { return v < 21 || v > 35; }).length >= 2;
            var regularity = 'Baixa';
            if (variation <= 2.5) regularity = 'Alta';
            else if (variation <= 4.5) regularity = 'Média';

            return {
                avgCycle: avgCycle,
                avgBleeding: avgBleeding,
                irregular: irregular,
                regularity: regularity,
                accuracy: accuracy,
                delayThreshold: avgCycle + 7
            };
        }

        function phaseForDay(day, bleedDays, avgCycle) {
            var ovu = Math.max(10, avgCycle - 14);
            if (day <= bleedDays) return { code: 'menstrual', label: 'Fase menstrual', desc: 'Período de sangramento e maior sensibilidade.' };
            if (day < ovu - 4) return { code: 'folicular', label: 'Fase folicular', desc: 'Energia tende a aumentar nesta fase.' };
            if (day <= ovu + 1) return { code: 'fertil', label: 'Janela fértil / ovulação', desc: 'Maior probabilidade de gravidez.' };
            if (day <= avgCycle + 6) return { code: 'lutea', label: 'Fase lútea', desc: 'Oscilações hormonais podem causar TPM.' };
            return { code: 'atraso', label: 'Atraso menstrual provável', desc: 'Considere acompanhamento e teste de gravidez se necessário.' };
        }

        function getCurrentState(metrics) {
            var desc = cycles.slice().sort(function(a, b) { return fromISODate(b.date) - fromISODate(a.date); });
            if (desc.length === 0) return { hasCycle: false };
            var last = desc[0];
            var lastDate = fromISODate(last.date);
            var bleedDays = Number(last.periodLength || 5);
            var day = diffDays(new Date(), lastDate) + 1;
            var next = addDays(lastDate, metrics.avgCycle);
            var ovu = addDays(next, -14);
            return {
                hasCycle: true,
                currentDay: day,
                phase: phaseForDay(day, bleedDays, metrics.avgCycle),
                lastDate: lastDate,
                bleedDays: bleedDays,
                flow: last.flow || 'Normal',
                nextPeriod: next,
                ovulation: ovu,
                fertileStart: addDays(ovu, -4),
                fertileEnd: addDays(ovu, 1)
            };
        }

        function renderMetrics(metrics) {
            var avgEl = document.getElementById('cycle-metric-avg');
            var bEl = document.getElementById('cycle-metric-bleeding');
            var rEl = document.getElementById('cycle-metric-regularity');
            var aEl = document.getElementById('cycle-metric-accuracy');
            var sEl = document.getElementById('cycle-metric-status');
            if (avgEl) avgEl.textContent = String(metrics.avgCycle);
            if (bEl) bEl.textContent = String(metrics.avgBleeding);
            if (rEl) rEl.textContent = metrics.regularity;
            if (aEl) aEl.textContent = String(metrics.accuracy.value) + '%';
            if (sEl) sEl.textContent = metrics.irregular ? 'Irregular' : 'Estável';
        }

        function renderNutrition(phaseCode, entry, state) {
            var list = document.getElementById('cycle-nutrition-list');
            if (!list) return;

            var tips = [];
            var dayInCycle = state ? Number(state.currentDay || 0) : 0;
            var bleedDays = state ? Number(state.bleedDays || 5) : 5;
            var flow = state ? String(state.flow || 'Normal') : 'Normal';

            if (phaseCode === 'menstrual') {
                if (dayInCycle <= 2) {
                    tips.push('Dia inicial da menstruação: combine ferro + vitamina C (feijão, fígado, espinafre com laranja) para repor perdas.');
                    tips.push('Priorize refeições leves e quentes: sopa de legumes com proteína e boa hidratação.');
                } else if (dayInCycle <= bleedDays) {
                    tips.push('Na segunda metade do sangramento, foque em proteína magra, folhas verdes e cereais integrais para recuperar energia.');
                    tips.push('Continue com água, água de coco e chás (gengibre/camomila) para aliviar cólicas e fadiga.');
                }
                if (flow === 'Intenso') {
                    tips.push('Fluxo intenso: reforçar ferro diariamente e considerar avaliação de hemoglobina se houver cansaço frequente.');
                }
            } else if (phaseCode === 'folicular') {
                tips.push('Fase folicular: proteínas magras, ovos, iogurte natural e legumes verdes ajudam no metabolismo hormonal.');
                tips.push('Inclua sementes (linhaça/chia) e gorduras boas (abacate/azeite) para suporte do eixo hormonal.');
            } else if (phaseCode === 'fertil') {
                tips.push('Janela fértil: alimentos ricos em folato e antioxidantes (folhas verdes, abacate, frutos vermelhos, peixe).');
                tips.push('Evite excesso de álcool e mantenha hidratação para melhor equilíbrio hormonal.');
            } else if (phaseCode === 'lutea') {
                tips.push('Fase lútea: magnésio e vitamina B6 (banana, aveia, grão-de-bico, cacau) ajudam na TPM.');
                tips.push('Reduza sal e açúcar refinado para diminuir inchaço e oscilações de humor.');
            } else {
                tips.push('Atraso menstrual: mantenha refeições equilibradas e registe sintomas até confirmação clínica.');
            }

            var physical = entry.physical || [];
            if (physical.includes('colicas')) {
                tips.push('Cólicas: aumente magnésio (sementes, amêndoas, feijão) e alimentos anti-inflamatórios (sardinha, gengibre).');
            }
            if (physical.includes('dor-cabeca')) {
                tips.push('Dor de cabeça: hidratação regular, reduzir jejum prolongado e preferir alimentos com riboflavina (ovos, iogurte).');
            }
            if (physical.includes('fadiga')) {
                tips.push('Fadiga: refeições com ferro + proteína + vitamina C (ex: carne magra + feijão + salada cítrica).');
            }
            if (physical.includes('inchaco')) {
                tips.push('Inchaço: reduzir sal/embutidos e aumentar potássio (banana, abóbora, água de coco).');
            }
            if (physical.includes('acne')) {
                tips.push('Acne: diminuir ultraprocessados e açúcar; priorizar zinco (sementes, feijão, ovos).');
            }
            if (physical.includes('dor-seios')) {
                tips.push('Dor mamária: reduzir cafeína e sal nos dias de maior sensibilidade.');
            }

            var unusual = entry.unusual || [];
            if (unusual.includes('sangramento-intenso') || unusual.includes('coagulos')) {
                tips.push('Sangramento intenso/coágulos: reforçar ferro e procurar avaliação clínica se persistir.');
            }

            var mood = entry.mood || [];
            if (mood.includes('ansiosa') || mood.includes('irritada')) {
                tips.push('Ansiedade/irritabilidade: incluir ómega-3 (peixe/sardinha), reduzir estimulantes e manter horário regular de refeições.');
            }
            if (mood.includes('triste')) {
                tips.push('Humor baixo: refeições com triptofano (banana, aveia, ovos) podem apoiar bem-estar emocional.');
            }

            list.innerHTML = tips.map(function(t) {
                return '<li><span style="color:var(--teal);font-weight:700;">•</span> ' + escapeHtml(t) + '</li>';
            }).join('');
        }

        function alertsForState(metrics, state, todayEntry) {
            var list = [];
            if (metrics.irregular) list.push('Padrão de ciclo irregular detetado automaticamente.');
            if (state.currentDay > metrics.delayThreshold) list.push('Atraso menstrual acima de 7 dias da média do seu ciclo.');
            if (Number(todayEntry.pain || 0) >= 8) list.push('Dor intensa registada (>=8/10).');
            if ((todayEntry.unusual || []).length > 0) list.push('Sintomas incomuns hoje: ' + todayEntry.unusual.join(', ') + '.');
            return list;
        }

        function renderAlerts(metrics, state, todayEntry) {
            var box = document.getElementById('cycle-smart-alerts');
            if (!box) return;
            var alerts = alertsForState(metrics, state, todayEntry);
            if (alerts.length === 0) {
                box.style.display = 'none';
                box.innerHTML = '';
                return;
            }
            box.style.display = 'block';
            box.innerHTML =
                '<h4 style="font-size:0.9rem;font-weight:800;color:var(--rose);margin-bottom:8px;">Alertas automáticos</h4>' +
                '<ul style="margin:0;padding-left:1rem;color:#7a1828;font-size:0.85rem;line-height:1.5;">' +
                alerts.map(function(a) { return '<li>' + escapeHtml(a) + '</li>'; }).join('') +
                '</ul>';
        }

        function renderDailyHistory() {
            if (!dailyHistory) return;
            var insights = document.getElementById('cycle-daily-insights');
            var keys = Object.keys(dailyLogs).sort().reverse().slice(0, 8);
            if (keys.length === 0) {
                if (insights) insights.innerHTML = '';
                dailyHistory.innerHTML = '<p style="font-size:0.84rem;color:var(--slate);font-style:italic;">Sem registos diários ainda.</p>';
                return;
            }

            var recent7 = Object.keys(dailyLogs).sort().reverse().slice(0, 7).map(function(k) { return dailyLogs[k]; });
            var avgPain = Math.round(average(recent7.map(function(e) { return Number(e.pain || 0); }), 0) * 10) / 10;
            var avgEnergy = Math.round(average(recent7.map(function(e) { return Number(e.energy || 0); }), 5) * 10) / 10;

            function mostFrequent(arrays) {
                var freq = {};
                arrays.forEach(function(arr) {
                    (arr || []).forEach(function(v) { freq[v] = (freq[v] || 0) + 1; });
                });
                var best = '';
                var count = 0;
                Object.keys(freq).forEach(function(k) {
                    if (freq[k] > count) { best = k; count = freq[k]; }
                });
                return best ? (best + ' (' + count + 'x)') : 'Sem padrão';
            }

            var topPhysical = mostFrequent(recent7.map(function(e) { return e.physical; }));
            var topMood = mostFrequent(recent7.map(function(e) { return e.mood; }));
            var topUnusual = mostFrequent(recent7.map(function(e) { return e.unusual; }));
            var highRiskDays = recent7.filter(function(e) {
                return Number(e.pain || 0) >= 8 || (e.unusual || []).length > 0;
            }).length;

            if (insights) {
                insights.innerHTML =
                    '<div class="stat-box"><div class="stat-box-num">' + recent7.length + '</div><div class="stat-box-label">Dias registados (7d)</div></div>' +
                    '<div class="stat-box"><div class="stat-box-num">' + avgPain + '</div><div class="stat-box-label">Dor média (0-10)</div></div>' +
                    '<div class="stat-box"><div class="stat-box-num">' + avgEnergy + '</div><div class="stat-box-label">Energia média (0-10)</div></div>' +
                    '<div class="stat-box"><div class="stat-box-num">' + highRiskDays + '</div><div class="stat-box-label">Dias com alerta</div></div>' +
                    '<div class="stat-box"><div class="stat-box-label"><strong>Sintoma mais frequente:</strong> ' + escapeHtml(topPhysical) + '</div></div>' +
                    '<div class="stat-box"><div class="stat-box-label"><strong>Humor predominante:</strong> ' + escapeHtml(topMood) + '</div></div>' +
                    '<div class="stat-box"><div class="stat-box-label"><strong>Sintoma incomum:</strong> ' + escapeHtml(topUnusual) + '</div></div>';
            }

            dailyHistory.innerHTML = keys.map(function(k) {
                var e = dailyLogs[k];
                var tags = []
                    .concat(e.physical || [])
                    .concat(e.mood || [])
                    .concat(e.unusual || [])
                    .slice(0, 8);
                var risk = Number(e.pain || 0) >= 8 || (e.unusual || []).length > 0;
                return '<div style="padding:10px 0;border-bottom:1px solid var(--border);">' +
                    '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">' +
                    '<strong style="font-size:0.82rem;color:var(--ink);">' + escapeHtml(formatDatePT(fromISODate(k))) + '</strong>' +
                    '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' +
                    '<span style="font-size:0.76rem;color:var(--slate);">Dor ' + Number(e.pain || 0) + '/10 · Energia ' + Number(e.energy || 0) + '/10</span>' +
                    (risk ? '<span style="font-size:0.66rem;border:1px solid var(--rose);color:var(--rose);padding:2px 7px;border-radius:20px;">Atenção</span>' : '') +
                    '</div>' +
                    '</div>' +
                    '<div style="font-size:0.79rem;color:var(--slate);margin-top:2px;">' + (tags.length ? escapeHtml(tags.join(', ')) : 'Sem sintomas registados') + '</div>' +
                    (e.note ? '<div style="font-size:0.78rem;color:var(--ink-80);margin-top:4px;background:var(--paper-warm);padding:6px 8px;border-radius:6px;">Nota: ' + escapeHtml(e.note) + '</div>' : '') +
                    '</div>';
            }).join('');
        }

        function applyTodayToUI() {
            var today = ensureTodayEntry().entry;
            document.querySelectorAll('.tracker-btn[data-group][data-value]').forEach(function(btn) {
                var group = btn.dataset.group;
                var value = btn.dataset.value;
                var arr = Array.isArray(today[group]) ? today[group] : [];
                btn.classList.toggle('active', arr.includes(value));
            });
            if (painInput) painInput.value = today.pain;
            if (energyInput) energyInput.value = today.energy;
            if (painValue) painValue.textContent = String(today.pain);
            if (energyValue) energyValue.textContent = String(today.energy);
            if (dayNote) dayNote.value = today.note || '';
        }

        function renderHistory() {
            historyList.innerHTML = '';
            if (cycles.length === 0) {
                historyList.innerHTML = '<li style="color:var(--slate);font-style:italic;justify-content:center;">Sem histórico. Registe a sua última menstruação acima.</li>';
                if (btnClear) btnClear.style.display = 'none';
                return;
            }
            if (btnClear) btnClear.style.display = 'inline-block';
            var desc = cycles.slice().sort(function(a, b) { return fromISODate(b.date) - fromISODate(a.date); });
            desc.forEach(function(cycle, idx) {
                var item = document.createElement('li');
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.padding = '10px 0';
                item.style.borderBottom = idx === desc.length - 1 ? 'none' : '1px solid var(--border)';

                var cycleLen = '';
                if (idx < desc.length - 1) {
                    var curr = fromISODate(desc[idx].date);
                    var prev = fromISODate(desc[idx + 1].date);
                    cycleLen = ' · ciclo de ' + diffDays(curr, prev) + ' dias';
                }
                item.innerHTML =
                    '<div>' +
                        '<div style="font-size:0.9rem;font-weight:700;color:var(--ink);">' + escapeHtml(formatDatePT(fromISODate(cycle.date))) + '</div>' +
                        '<div style="font-size:0.78rem;color:var(--slate);">Sangramento: ' + Number(cycle.periodLength || 5) + ' dias · Fluxo: ' + escapeHtml(cycle.flow || 'Normal') + cycleLen + '</div>' +
                    '</div>' +
                    '<button type="button" data-delete-cycle="' + Number(cycle.id) + '" style="background:none;border:none;color:var(--border-strong);cursor:pointer;font-size:1.3rem;">×</button>';
                historyList.appendChild(item);
            });

            historyList.querySelectorAll('[data-delete-cycle]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var id = Number(this.getAttribute('data-delete-cycle'));
                    if (!confirm('Deseja remover este registo de ciclo?')) return;
                    cycles = cycles.filter(function(c) { return Number(c.id) !== id; });
                    saveCycles();
                    requestCycleUIUpdate();
                });
            });
        }

        function buildProjectedWindows(metrics, state, count) {
            var windows = [];
            if (!state || !state.hasCycle) return windows;
            var total = count || 12;
            var start = new Date(state.lastDate);
            for (var i = 0; i < total; i++) {
                var periodStart = new Date(start);
                var periodEnd = addDays(periodStart, Math.max(1, Number(state.bleedDays || 5)) - 1);
                var nextStart = addDays(periodStart, metrics.avgCycle);
                var ovulation = addDays(nextStart, -14);
                windows.push({
                    periodStart: periodStart,
                    periodEnd: periodEnd,
                    ovulation: ovulation,
                    fertileStart: addDays(ovulation, -4),
                    fertileEnd: addDays(ovulation, 1),
                    cycleStartNext: nextStart
                });
                start = nextStart;
            }
            return windows;
        }

        function renderUpcomingOverview(metrics, state) {
            var box = document.getElementById('cycle-upcoming-overview');
            if (!box || !state || !state.hasCycle) return;

            var rows = [];
            var start = new Date(state.nextPeriod);
            for (var i = 0; i < 6; i++) {
                var periodStart = new Date(start);
                var periodEnd = addDays(periodStart, Math.max(1, Number(state.bleedDays || 5)) - 1);
                var nextCycleStart = addDays(periodStart, metrics.avgCycle);
                var ovulation = addDays(nextCycleStart, -14);
                var fertileStart = addDays(ovulation, -4);
                var fertileEnd = addDays(ovulation, 1);
                rows.push({
                    monthLabel: periodStart.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }),
                    period: formatDatePT(periodStart) + ' a ' + formatDatePT(periodEnd),
                    ovulation: formatDatePT(ovulation),
                    fertile: formatDatePT(fertileStart) + ' a ' + formatDatePT(fertileEnd)
                });
                start = nextCycleStart;
            }

            box.innerHTML =
                '<h4 class="cycle-overview-title">Próximos ciclos previstos</h4>' +
                '<div class="cycle-overview-grid">' +
                rows.map(function(r) {
                    return '<article class="cycle-overview-card">' +
                        '<div class="cycle-overview-month">' + escapeHtml(r.monthLabel) + '</div>' +
                        '<p class="cycle-overview-line"><strong>Menstruação:</strong> ' + escapeHtml(r.period) + '</p>' +
                        '<p class="cycle-overview-line"><strong>Janela fértil:</strong> ' + escapeHtml(r.fertile) + '</p>' +
                        '<p class="cycle-overview-line"><strong>Ovulação:</strong> ' + escapeHtml(r.ovulation) + '</p>' +
                    '</article>';
                }).join('') +
                '</div>';
        }

        function renderMultiMonthView(metrics, state, recordedPeriods, projected) {
            var container = document.getElementById('cycle-multi-month-view');
            if (!container || !state || !state.hasCycle) return;

            function inRange(d, a, b) { return d >= a && d <= b; }
            function dayRole(date) {
                for (var i = 0; i < recordedPeriods.length; i++) {
                    if (inRange(date, recordedPeriods[i].start, recordedPeriods[i].end)) return 'recorded-period';
                }
                for (var j = 0; j < projected.length; j++) {
                    if (inRange(date, projected[j].periodStart, projected[j].periodEnd) && date >= new Date()) return 'predicted-period';
                    if (toLocalISODate(date) === toLocalISODate(projected[j].ovulation)) return 'ovulation';
                    if (inRange(date, projected[j].fertileStart, projected[j].fertileEnd)) return 'fertile';
                }
                return 'normal';
            }

            var monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
            var todayKey = toLocalISODate(new Date());
            var startMonth = new Date();
            startMonth = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1);

            var html = '';
            for (var m = 0; m < 4; m++) {
                var ref = new Date(startMonth.getFullYear(), startMonth.getMonth() + m, 1);
                var month = ref.getMonth();
                var year = ref.getFullYear();
                var daysInMonth = new Date(year, month + 1, 0).getDate();
                var offset = new Date(year, month, 1).getDay() - 1;
                if (offset < 0) offset = 6;

                var cells = [];
                for (var o = 0; o < offset; o++) {
                    cells.push('<span class="cycle-mini-day is-empty"></span>');
                }
                for (var d = 1; d <= daysInMonth; d++) {
                    var date = new Date(year, month, d);
                    var role = dayRole(date);
                    var cls = 'cycle-mini-day';
                    if (role === 'recorded-period') cls += ' is-recorded-period';
                    else if (role === 'predicted-period') cls += ' is-predicted-period';
                    else if (role === 'ovulation') cls += ' is-ovulation';
                    else if (role === 'fertile') cls += ' is-fertile';
                    if (toLocalISODate(date) === todayKey) cls += ' is-today';
                    cells.push('<span class="' + cls + '">' + d + '</span>');
                }

                html +=
                    '<div class="cycle-mini-month-card">' +
                    '<div class="cycle-mini-month-head">' +
                    '<strong class="cycle-mini-month-name">' + monthNames[month] + ' ' + year + '</strong>' +
                    '</div>' +
                    '<div class="cycle-mini-weekdays">' +
                    '<span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>' +
                    '</div>' +
                    '<div class="cycle-mini-days-grid">' + cells.join('') + '</div>' +
                    '</div>';
            }
            container.innerHTML = html;
        }

        function renderCalendar(metrics, state) {
            var calGrid = document.getElementById('calendar-days-grid');
            var calTitle = document.getElementById('calendar-month-title');
            var btnPrevMonth = document.getElementById('cal-prev-month');
            var btnNextMonth = document.getElementById('cal-next-month');
            if (!calGrid || !calTitle || !state || !state.hasCycle) return;
            if (!window.calDisplayDate) window.calDisplayDate = new Date();

            if (btnPrevMonth && !btnPrevMonth.hasAttribute('data-bound')) {
                btnPrevMonth.addEventListener('click', function() {
                    window.calDisplayDate = addDays(new Date(window.calDisplayDate.getFullYear(), window.calDisplayDate.getMonth(), 1), -1);
                    requestCycleUIUpdate();
                    gaEvent('cycle_calendar_nav', 'cycle_daily', 'prev_month');
                });
                btnPrevMonth.setAttribute('data-bound', '1');
            }
            if (btnNextMonth && !btnNextMonth.hasAttribute('data-bound')) {
                btnNextMonth.addEventListener('click', function() {
                    window.calDisplayDate = new Date(window.calDisplayDate.getFullYear(), window.calDisplayDate.getMonth() + 1, 1);
                    requestCycleUIUpdate();
                    gaEvent('cycle_calendar_nav', 'cycle_daily', 'next_month');
                });
                btnNextMonth.setAttribute('data-bound', '1');
            }

            var monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
            var month = window.calDisplayDate.getMonth();
            var year = window.calDisplayDate.getFullYear();
            calTitle.textContent = monthNames[month] + ' ' + year;
            calGrid.innerHTML = '';
            calGrid.setAttribute('role', 'grid');
            var calendarFragment = document.createDocumentFragment();

            var first = new Date(year, month, 1);
            var daysInMonth = new Date(year, month + 1, 0).getDate();
            var offset = first.getDay() - 1;
            if (offset < 0) offset = 6;
            for (var z = 0; z < offset; z++) {
                var empty = document.createElement('div');
                empty.className = 'calendar-day is-empty';
                empty.setAttribute('aria-hidden', 'true');
                empty.setAttribute('role', 'presentation');
                calendarFragment.appendChild(empty);
            }

            var todayKey = toLocalISODate(new Date());
            var todayDate = fromISODate(todayKey);
            var periods = cycles.map(function(c) {
                var s = fromISODate(c.date);
                var e = addDays(s, Number(c.periodLength || 5) - 1);
                return { start: s, end: e };
            });

            var projected = buildProjectedWindows(metrics, state, 14);

            function inRange(d, a, b) { return d >= a && d <= b; }

            for (var day = 1; day <= daysInMonth; day++) {
                var date = new Date(year, month, day);
                var key = toLocalISODate(date);
                var cell = document.createElement('div');
                cell.textContent = day;
                cell.className = 'calendar-day';
                cell.setAttribute('role', 'gridcell');
                var label = 'Dia ' + day + ' de ' + monthNames[month] + ' de ' + year;
                if (key === todayKey) {
                    cell.classList.add('is-today');
                }
                for (var p = 0; p < periods.length; p++) {
                    if (inRange(date, periods[p].start, periods[p].end)) {
                        cell.classList.add('is-recorded-period');
                        cell.title = 'Menstruação registada';
                        label += ' - Menstruação registada';
                        break;
                    }
                }
                if (!cell.title) {
                    for (var q = 0; q < projected.length; q++) {
                        if (inRange(date, projected[q].periodStart, projected[q].periodEnd) && date >= todayDate) {
                            cell.classList.add('is-predicted-period');
                            cell.title = 'Menstruação prevista';
                            label += ' - Menstruação prevista';
                            break;
                        }
                        if (toLocalISODate(projected[q].ovulation) === key) {
                            cell.classList.add('is-ovulation');
                            cell.title = 'Ovulação prevista';
                            label += ' - Ovulação prevista';
                            break;
                        }
                        if (inRange(date, projected[q].fertileStart, projected[q].fertileEnd)) {
                            cell.classList.add('is-fertile');
                            cell.title = 'Janela fértil prevista';
                            label += ' - Janela fértil prevista';
                            break;
                        }
                    }
                }
                cell.setAttribute('aria-label', label);
                calendarFragment.appendChild(cell);
            }
            calGrid.appendChild(calendarFragment);

            renderUpcomingOverview(metrics, state);
            renderMultiMonthView(metrics, state, periods, projected);
        }

        function bindTrackerButtons() {
            document.querySelectorAll('.tracker-btn[data-group][data-value]').forEach(function(btn) {
                if (btn.hasAttribute('data-bound')) return;
                btn.addEventListener('click', function() {
                    var today = ensureTodayEntry();
                    var group = this.dataset.group;
                    var value = this.dataset.value;
                    if (!Array.isArray(today.entry[group])) today.entry[group] = [];
                    if (today.entry[group].includes(value)) {
                        today.entry[group] = today.entry[group].filter(function(v) { return v !== value; });
                    } else {
                        today.entry[group].push(value);
                    }
                    saveLogs();
                    requestCycleUIUpdate();
                    gaEvent('cycle_daily_toggle', 'cycle_daily', group + '_' + value + '_' + (today.entry[group].includes(value) ? 'on' : 'off'));
                });
                btn.setAttribute('data-bound', '1');
            });
        }

        function updateUI() {
            normalizeCycles();
            normalizeLogs();
            renderHistory();
            renderDailyHistory();

            var metrics = computeMetrics();
            renderMetrics(metrics);
            var state = getCurrentState(metrics);

            var dashboard = document.getElementById('cycle-dynamic-dashboard');
            var calendarView = document.getElementById('cycle-calendar-view');
            if (!state.hasCycle) {
                if (dashboard) dashboard.style.display = 'none';
                if (calendarView) calendarView.style.display = 'none';
                window.portalState = window.portalState || {};
                window.portalState.cycle = {
                    hasCycleData: false,
                    irregular: false,
                    regularity: 'Sem dados',
                    currentDay: 0,
                    delayThreshold: metrics.delayThreshold,
                    phaseLabel: 'Sem registo',
                    isFertileWindow: false,
                    nextPeriod: null,
                    todayPain: 0,
                    todayUnusualCount: 0
                };
                if (typeof updateMainDashboard === 'function') updateMainDashboard();
                return;
            }

            if (dashboard) dashboard.style.display = 'block';
            if (calendarView) calendarView.style.display = 'block';

            var dEl = document.getElementById('cycle-current-day');
            var pEl = document.getElementById('cycle-current-phase');
            var nextEl = document.getElementById('cycle-next-period');
            var ovuEl = document.getElementById('cycle-next-ovulation');
            var fertileEl = document.getElementById('cycle-fertile-window');

            if (dEl) dEl.textContent = String(state.currentDay);
            if (pEl) pEl.textContent = state.phase.label + ' — ' + state.phase.desc;
            if (nextEl) nextEl.textContent = formatDatePT(state.nextPeriod);
            if (ovuEl) ovuEl.textContent = formatDatePT(state.ovulation);
            if (fertileEl) fertileEl.textContent = formatDatePT(state.fertileStart) + ' até ' + formatDatePT(state.fertileEnd);

            var today = ensureTodayEntry().entry;
            renderNutrition(state.phase.code, today, state);
            renderAlerts(metrics, state, today);
            updateCycleNotificationState(state, metrics);
            renderCalendar(metrics, state);
            applyTodayToUI();

            window.portalState = window.portalState || {};
            window.portalState.cycle = {
                hasCycleData: true,
                irregular: metrics.irregular,
                regularity: metrics.regularity,
                currentDay: state.currentDay,
                delayThreshold: metrics.delayThreshold,
                phaseLabel: state.phase.label,
                isFertileWindow: state.phase.code === 'fertil',
                nextPeriod: toLocalISODate(state.nextPeriod),
                todayPain: Number(today.pain || 0),
                todayUnusualCount: (today.unusual || []).length
            };
            if (typeof updateMainDashboard === 'function') updateMainDashboard();
        }

        normalizeCycles();
        normalizeLogs();
        var cyclesSnapshotAfterInit = '';
        var logsSnapshotAfterInit = '';
        try { cyclesSnapshotAfterInit = JSON.stringify(cycles || []); } catch (e) {}
        try { logsSnapshotAfterInit = JSON.stringify(dailyLogs || {}); } catch (e) {}
        if (cyclesSnapshotAfterInit !== cyclesSnapshotBeforeInit) saveCycles();
        if (logsSnapshotAfterInit !== logsSnapshotBeforeInit) saveLogs();
        if (dateInput) dateInput.value = toLocalISODate(new Date());

        if (form && !form.hasAttribute('data-bound')) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                var date = dateInput ? dateInput.value : '';
                var length = clamp(Number(lengthInput ? lengthInput.value : 5), 1, 15);
                var flow = flowInput ? flowInput.value : 'Normal';

                if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    alert('Selecione uma data válida para o início da menstruação.');
                    return;
                }
                var chosen = fromISODate(date);
                var today = fromISODate(toLocalISODate(new Date()));
                if (chosen > today) {
                    alert('A data não pode estar no futuro.');
                    return;
                }

                var existing = cycles.find(function(c) { return c.date === date; });
                if (existing) {
                    existing.periodLength = length;
                    existing.flow = flow;
                } else {
                    cycles.push({ id: Date.now(), date: date, periodLength: length, flow: flow });
                }
                saveCycles();
                form.reset();
                if (dateInput) dateInput.value = toLocalISODate(new Date());
                if (lengthInput) lengthInput.value = '5';
                if (flowInput) flowInput.value = 'Normal';
                requestCycleUIUpdate();
                gaEvent('cycle_added', 'cycle', date);
            });
            form.setAttribute('data-bound', '1');
        }

        if (btnClear && !btnClear.hasAttribute('data-bound')) {
            btnClear.addEventListener('click', function() {
                if (!confirm('Deseja apagar todo o histórico de ciclos?')) return;
                cycles = [];
                saveCycles();
                requestCycleUIUpdate();
            });
            btnClear.setAttribute('data-bound', '1');
        }

        if (painInput && !painInput.hasAttribute('data-bound')) {
            painInput.addEventListener('input', function() {
                if (painValue) painValue.textContent = this.value;
            });
            painInput.setAttribute('data-bound', '1');
        }
        if (energyInput && !energyInput.hasAttribute('data-bound')) {
            energyInput.addEventListener('input', function() {
                if (energyValue) energyValue.textContent = this.value;
            });
            energyInput.setAttribute('data-bound', '1');
        }

        if (btnSaveDaily && !btnSaveDaily.hasAttribute('data-bound')) {
            btnSaveDaily.addEventListener('click', function() {
                var today = ensureTodayEntry();
                today.entry.pain = clamp(Number(painInput ? painInput.value : 0), 0, 10);
                today.entry.energy = clamp(Number(energyInput ? energyInput.value : 5), 0, 10);
                today.entry.note = dayNote ? dayNote.value.trim() : '';
                today.entry.savedAt = new Date().toISOString();
                saveLogs();
                var old = btnSaveDaily.textContent;
                btnSaveDaily.textContent = 'Registo guardado';
                setTimeout(function() { btnSaveDaily.textContent = old; }, 1500);
                requestCycleUIUpdate();
                gaEvent('cycle_daily_saved', 'cycle', today.key);
            });
            btnSaveDaily.setAttribute('data-bound', '1');
        }

        if (btnPregnant && !btnPregnant.hasAttribute('data-bound')) {
            btnPregnant.addEventListener('click', function() {
                var pregnantField = document.getElementById('v-pregnant');
                if (pregnantField) pregnantField.value = 'sim';
                alert('Estado de gravidez marcado. Atualize o seu perfil e procure consulta pré-natal.');
                gaEvent('cycle_pregnancy_mode', 'cycle_daily', 'clicked');
            });
            btnPregnant.setAttribute('data-bound', '1');
        }

        if (notifyToggleBtn && !notifyToggleBtn.hasAttribute('data-bound')) {
            notifyToggleBtn.addEventListener('click', function() {
                if (getCycleNotificationEnabled()) {
                    setCycleNotificationEnabled(false);
                    renderCycleNotificationUI();
                    alert('Notificações do diário do ciclo foram desativadas.');
                    gaEvent('cycle_notifications', 'notification', 'disabled');
                } else {
                    requestCycleNotificationPermission(function(granted) {
                        renderCycleNotificationUI();
                        if (granted) {
                            showLocalNotification('Notificações ativadas', 'Receberá lembretes de menstruação, fertilidade e ovulação.');
                            requestCycleUIUpdate();
                        } else {
                            alert('Permissão de notificações não foi concedida.');
                        }
                    });
                    gaEvent('cycle_notifications', 'notification', 'requested');
                }
            });
            notifyToggleBtn.setAttribute('data-bound', '1');
        }

        if (notifyTestBtn && !notifyTestBtn.hasAttribute('data-bound')) {
            notifyTestBtn.addEventListener('click', function() {
                if (!getCycleNotificationEnabled()) {
                    requestCycleNotificationPermission(function(granted) {
                        renderCycleNotificationUI();
                        if (granted) {
                            showLocalNotification('Teste de notificação', 'Isto é um lembrete de ciclo enviado a partir do diário.');
                        }
                    });
                } else {
                    showLocalNotification('Teste de notificação', 'Isto é um lembrete de ciclo enviado a partir do diário.');
                }
                gaEvent('cycle_notification_test', 'notification', 'manual');
            });
            notifyTestBtn.setAttribute('data-bound', '1');
        }

        if (notifyPushBtn && !notifyPushBtn.hasAttribute('data-bound')) {
            notifyPushBtn.addEventListener('click', function() {
                if (Notification.permission === 'denied') {
                    alert('Notificações bloqueadas. Altere as permissões do navegador para continuar.');
                    return;
                }

                var currentSubscription = getPushSubscriptionFromStorage();
                if (currentSubscription && Notification.permission === 'granted') {
                    alert('Notificações push já estão inscritas neste dispositivo.');
                    return;
                }

                requestCycleNotificationPermission(function(granted) {
                    renderCycleNotificationUI();
                    if (!granted) {
                        alert('Permissão de notificações não foi concedida.');
                        return;
                    }

                    subscribeToPushNotifications().then(function() {
                        renderCycleNotificationUI();
                        alert('Inscrição push concluída. Agora o servidor pode enviar notificações ao seu dispositivo.');
                    }).catch(function(err) {
                        console.warn('Erro na inscrição push', err);
                        alert('Não foi possível inscrever notificações push. Veja o console para mais detalhes.');
                    });
                });
            });
            notifyPushBtn.setAttribute('data-bound', '1');
        }

        window.addEventListener('focus', function() {
            requestCycleUIUpdate();
        });

        bindTrackerButtons();
        updateUI();
    }

    // ── COFRE DE SAÚDE (VERSÃO MELHORADA) ──
    function initHealthVault() {
        var profileForm = document.getElementById('vault-profile-form');
        var recordsForm = document.getElementById('vault-record-form');
        var medsForm = document.getElementById('vault-med-form');
        var docsInput = document.getElementById('vault-doc-upload');
        var searchInput = document.getElementById('vault-search');
        var recordsList = document.getElementById('vault-records-list');
        var medsList = document.getElementById('vault-med-list');
        var docsList = document.getElementById('vault-doc-list');
        var recordCount = document.getElementById('vault-record-count');
        var docCount = document.getElementById('vault-doc-count');
        var saveMsg = document.getElementById('profile-save-msg');
        var exportJsonBtn = document.getElementById('btn-export-vault-json');
        var exportReportBtn = document.getElementById('btn-export-vault-report');
        var importBtn = document.getElementById('btn-import-vault');
        var importInput = document.getElementById('vault-import-file');

        if (!profileForm || !recordsList) return;

        var fieldIds = [
            'v-name','v-age','v-weight','v-height','v-phone','v-emergency','v-pregnant','v-blood','v-pressure',
            'v-menarche','v-gravida','v-para','v-abortions','v-contraception',
            'v-allergies','v-diseases','v-surgeries','v-vaccines','v-meds','v-gyneco'
        ];

        var defaultProfile = {};
        fieldIds.forEach(function(id) { defaultProfile[id] = ''; });
        defaultProfile['v-pregnant'] = 'nao';

        var profileData = Object.assign({}, defaultProfile, storageRead(APP_STORAGE_KEYS.vaultProfile, {}));
        var recordsData = storageRead(APP_STORAGE_KEYS.vaultRecords, []);
        var medsData = storageRead(APP_STORAGE_KEYS.vaultMeds, []);
        var medIntake = storageRead(APP_STORAGE_KEYS.vaultMedIntake, {});
        var docsMeta = storageRead(APP_STORAGE_KEYS.vaultDocMeta, []);
        var vaultNeedsInitialSave = false;
        var vaultSnapshotBefore = '';
        try {
            vaultSnapshotBefore = JSON.stringify({
                profileData: profileData,
                recordsData: recordsData,
                medsData: medsData,
                medIntake: medIntake,
                docsMeta: docsMeta
            });
        } catch (e) {}

        var oldProfile = storageRead('intimateHealthVault_Profile', null);
        if (oldProfile && !profileData['v-allergies'] && !profileData['v-meds']) {
            profileData['v-blood'] = oldProfile.blood || '';
            profileData['v-allergies'] = oldProfile.allergies || '';
            profileData['v-meds'] = oldProfile.meds || '';
            vaultNeedsInitialSave = true;
        }

        var oldExams = storageRead('intimateHealthVault_Exams', []);
        if (Array.isArray(oldExams) && oldExams.length > 0 && (!Array.isArray(recordsData) || recordsData.length === 0)) {
            recordsData = oldExams.map(function(ex) {
                return {
                    id: Number(ex.id || Date.now()),
                    category: 'exame',
                    title: ex.type || 'Exame',
                    date: ex.date || toLocalISODate(new Date()),
                    professional: '',
                    status: ex.result || 'concluido',
                    tags: 'migração',
                    notes: ex.notes || ''
                };
            });
            vaultNeedsInitialSave = true;
        }

        function normalizeRecords(list) {
            return (Array.isArray(list) ? list : []).map(function(r) {
                return {
                    id: Number(r.id || Date.now()),
                    category: r.category || 'outro',
                    title: String(r.title || 'Sem título'),
                    date: r.date || toLocalISODate(new Date()),
                    professional: String(r.professional || ''),
                    status: String(r.status || 'ativo'),
                    tags: String(r.tags || ''),
                    notes: String(r.notes || '')
                };
            });
        }
        function normalizeMeds(list) {
            return (Array.isArray(list) ? list : []).map(function(m) {
                return {
                    id: Number(m.id || Date.now()),
                    name: String(m.name || ''),
                    dose: String(m.dose || ''),
                    frequency: String(m.frequency || ''),
                    start: String(m.start || ''),
                    end: String(m.end || ''),
                    notes: String(m.notes || ''),
                    active: m.active !== false
                };
            }).filter(function(m) { return m.name.trim().length > 0; });
        }
        function normalizeDocs(list) {
            return (Array.isArray(list) ? list : []).map(function(d) {
                return {
                    id: Number(d.id || Date.now()),
                    name: String(d.name || 'documento'),
                    type: String(d.type || 'application/octet-stream'),
                    size: Number(d.size || 0),
                    createdAt: d.createdAt || new Date().toISOString()
                };
            });
        }

        recordsData = normalizeRecords(recordsData);
        medsData = normalizeMeds(medsData);
        docsMeta = normalizeDocs(docsMeta);
        var vaultSnapshotAfter = '';
        try {
            vaultSnapshotAfter = JSON.stringify({
                profileData: profileData,
                recordsData: recordsData,
                medsData: medsData,
                medIntake: medIntake,
                docsMeta: docsMeta
            });
        } catch (e) {}
        if (vaultSnapshotAfter !== vaultSnapshotBefore) vaultNeedsInitialSave = true;

        function saveAll() {
            storageWrite(APP_STORAGE_KEYS.vaultProfile, profileData);
            storageWrite(APP_STORAGE_KEYS.vaultRecords, recordsData);
            storageWrite(APP_STORAGE_KEYS.vaultMeds, medsData);
            storageWrite(APP_STORAGE_KEYS.vaultMedIntake, medIntake);
            storageWrite(APP_STORAGE_KEYS.vaultDocMeta, docsMeta);
        }

        function updateKPIs() {
            function setText(id, value) {
                var el = document.getElementById(id);
                if (el) el.textContent = String(value);
            }
            var totalRecords = recordsData.length;
            var examCountVal = recordsData.filter(function(r) { return r.category === 'exame'; }).length;
            var consultCountVal = recordsData.filter(function(r) { return r.category === 'consulta'; }).length;
            var docsCountVal = docsMeta.length;
            var activeMedsCount = medsData.filter(function(m) { return m.active; }).length;
            var keyToday = toLocalISODate(new Date());
            var todayIntake = medIntake[keyToday] || {};
            var notTakenToday = medsData.filter(function(m) {
                return m.active && !todayIntake[m.id];
            }).length;

            setText('vault-kpi-records', totalRecords);
            setText('vault-kpi-exams', examCountVal);
            setText('vault-kpi-consultas', consultCountVal);
            setText('vault-kpi-docs', docsCountVal);
            setText('vault-kpi-meds', activeMedsCount);

            window.portalState = window.portalState || {};
            window.portalState.vault = {
                recordsCount: totalRecords,
                activeMeds: activeMedsCount,
                docsCount: docsCountVal,
                notTakenToday: notTakenToday,
                hasProfile: !!(profileData['v-name'] || profileData['v-phone'] || profileData['v-blood'])
            };
            if (typeof updateMainDashboard === 'function') updateMainDashboard();
        }

        function categoryLabel(cat) {
            var labels = {
                consulta: 'Consulta',
                diagnostico: 'Diagnóstico',
                exame: 'Exame',
                receita: 'Receita médica',
                vacina: 'Vacina',
                cirurgia: 'Cirurgia',
                ginecologico: 'Histórico ginecológico',
                doenca: 'Doença/condição',
                outro: 'Outro'
            };
            return labels[cat] || cat;
        }

        function getQuery() {
            return (searchInput && searchInput.value ? searchInput.value.trim().toLowerCase() : '');
        }
        function matchesQuery(parts, query) {
            if (!query) return true;
            return parts.join(' ').toLowerCase().includes(query);
        }

        function loadProfile() {
            fieldIds.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.value = profileData[id] || '';
            });
        }

        function saveProfile() {
            fieldIds.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) profileData[id] = String(el.value || '').trim();
            });
            storageWrite(APP_STORAGE_KEYS.vaultProfile, profileData);
            if (saveMsg) {
                saveMsg.style.display = 'block';
                setTimeout(function() { saveMsg.style.display = 'none'; }, 2500);
            }
            updateKPIs();
            gaEvent('vault_profile_saved', 'vault', 'profile');
        }

        function renderRecords() {
            var query = getQuery();
            var sorted = recordsData.slice().sort(function(a, b) { return fromISODate(b.date) - fromISODate(a.date); });
            var filtered = sorted.filter(function(r) {
                return matchesQuery([r.category, r.title, r.professional, r.status, r.tags, r.notes], query);
            });
            if (recordCount) recordCount.textContent = filtered.length + ' registos';
            if (filtered.length === 0) {
                recordsList.innerHTML = '<div style="text-align:center;padding:1.6rem;color:var(--slate);font-style:italic;background:var(--paper-warm);border-radius:var(--r-sm);border:1px solid var(--border);">Sem registos para apresentar.</div>';
                return;
            }
            recordsList.innerHTML = filtered.map(function(r) {
                var date = fromISODate(r.date);
                var statusColor = r.status === 'concluido' ? 'var(--teal)' : (r.status === 'seguimento' ? 'var(--gold)' : 'var(--rose)');
                return '<div style="background:var(--paper-card);border:1px solid var(--border);border-radius:var(--r-sm);padding:1rem 1.1rem;margin-bottom:10px;">' +
                    '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">' +
                    '<div>' +
                    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
                    '<span style="font-size:0.7rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--teal);">' + escapeHtml(categoryLabel(r.category)) + '</span>' +
                    '<span style="font-size:0.68rem;border:1px solid ' + statusColor + ';color:' + statusColor + ';padding:2px 8px;border-radius:20px;">' + escapeHtml(r.status) + '</span>' +
                    '</div>' +
                    '<h4 style="font-size:0.98rem;color:var(--ink);margin:4px 0 3px 0;">' + escapeHtml(r.title) + '</h4>' +
                    '<div style="font-size:0.79rem;color:var(--slate);">' + escapeHtml(date ? formatDatePT(date) : r.date) + (r.professional ? ' · ' + escapeHtml(r.professional) : '') + '</div>' +
                    (r.tags ? '<div style="font-size:0.76rem;color:var(--slate);margin-top:3px;">Tags: ' + escapeHtml(r.tags) + '</div>' : '') +
                    '</div>' +
                    '<button type="button" data-record-delete="' + Number(r.id) + '" style="border:none;background:rgba(12,14,22,0.05);color:var(--rose);width:30px;height:30px;border-radius:50%;cursor:pointer;">×</button>' +
                    '</div>' +
                    (r.notes ? '<p style="font-size:0.84rem;color:var(--ink-80);margin-top:8px;line-height:1.55;">' + escapeHtml(r.notes) + '</p>' : '') +
                    '</div>';
            }).join('');

            recordsList.querySelectorAll('[data-record-delete]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var id = Number(this.getAttribute('data-record-delete'));
                    if (!confirm('Remover este registo clínico?')) return;
                    recordsData = recordsData.filter(function(r) { return Number(r.id) !== id; });
                    storageWrite(APP_STORAGE_KEYS.vaultRecords, recordsData);
                    renderRecords();
                    updateKPIs();
                    gaEvent('vault_record_delete', 'vault', 'record');
                });
            });
        }

        function medTakenToday(id) {
            var key = toLocalISODate(new Date());
            var bucket = medIntake[key] || {};
            return !!bucket[id];
        }
        function medAdherence(id, windowDays) {
            var days = windowDays || 14;
            var taken = 0;
            for (var i = 0; i < days; i++) {
                var key = toLocalISODate(addDays(new Date(), -i));
                var bucket = medIntake[key] || {};
                if (bucket[id]) taken++;
            }
            return Math.round((taken / days) * 100);
        }

        function renderMeds() {
            var query = getQuery();
            var filtered = medsData.filter(function(m) {
                return matchesQuery([m.name, m.dose, m.frequency, m.notes], query);
            });
            if (filtered.length === 0) {
                medsList.innerHTML = '<div style="font-size:0.82rem;color:var(--slate);padding:0.8rem 0;">Sem medicamentos guardados.</div>';
                return;
            }
            medsList.innerHTML = filtered.map(function(m) {
                var adh = medAdherence(m.id, 14);
                return '<div style="border:1px solid var(--border);border-radius:var(--r-xs);padding:0.75rem;margin-bottom:8px;background:var(--paper-warm);">' +
                    '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">' +
                    '<div>' +
                    '<strong style="font-size:0.9rem;color:var(--ink);">' + escapeHtml(m.name) + '</strong>' +
                    '<div style="font-size:0.78rem;color:var(--slate);">' + escapeHtml(m.dose || 'Sem dose definida') + ' · ' + escapeHtml(m.frequency || 'Sem frequência') + '</div>' +
                    '<div style="font-size:0.74rem;color:var(--slate);">' + (m.start ? escapeHtml(m.start) : '--') + ' até ' + (m.end ? escapeHtml(m.end) : '--') + '</div>' +
                    (m.notes ? '<div style="font-size:0.76rem;color:var(--ink-80);margin-top:2px;">' + escapeHtml(m.notes) + '</div>' : '') +
                    '<div style="font-size:0.74rem;color:var(--teal-dark);margin-top:3px;">Adesão (14 dias): ' + adh + '%</div>' +
                    '</div>' +
                    '<div style="display:flex;gap:6px;">' +
                    '<button type="button" data-med-toggle="' + Number(m.id) + '" style="border:none;background:rgba(12,14,22,0.08);padding:5px 8px;border-radius:8px;cursor:pointer;font-size:0.72rem;">' + (m.active ? 'Ativo' : 'Inativo') + '</button>' +
                    '<button type="button" data-med-delete="' + Number(m.id) + '" style="border:none;background:rgba(192,52,74,0.14);color:var(--rose);padding:5px 8px;border-radius:8px;cursor:pointer;font-size:0.72rem;">Apagar</button>' +
                    '</div>' +
                    '</div>' +
                    '<label style="display:flex;gap:8px;align-items:center;font-size:0.78rem;color:var(--ink);margin-top:6px;">' +
                    '<input type="checkbox" data-med-intake="' + Number(m.id) + '" ' + (medTakenToday(m.id) ? 'checked' : '') + '> Tomado hoje' +
                    '</label>' +
                    '</div>';
            }).join('');

            medsList.querySelectorAll('[data-med-toggle]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var id = Number(this.getAttribute('data-med-toggle'));
                    var med = medsData.find(function(x) { return Number(x.id) === id; });
                    if (!med) return;
                    med.active = !med.active;
                    storageWrite(APP_STORAGE_KEYS.vaultMeds, medsData);
                    renderMeds();
                    updateKPIs();
                    gaEvent('vault_med_toggle', 'vault', med.active ? 'active' : 'inactive');
                });
            });
            medsList.querySelectorAll('[data-med-delete]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var id = Number(this.getAttribute('data-med-delete'));
                    if (!confirm('Remover este medicamento?')) return;
                    medsData = medsData.filter(function(x) { return Number(x.id) !== id; });
                    storageWrite(APP_STORAGE_KEYS.vaultMeds, medsData);
                    renderMeds();
                    updateKPIs();
                    gaEvent('vault_med_delete', 'vault', 'medication');
                });
            });
            medsList.querySelectorAll('[data-med-intake]').forEach(function(chk) {
                chk.addEventListener('change', function() {
                    var id = Number(this.getAttribute('data-med-intake'));
                    var key = toLocalISODate(new Date());
                    if (!medIntake[key]) medIntake[key] = {};
                    medIntake[key][id] = !!this.checked;
                    storageWrite(APP_STORAGE_KEYS.vaultMedIntake, medIntake);
                    renderMeds();
                    updateKPIs();
                    gaEvent('vault_med_intake', 'vault', this.checked ? 'taken' : 'untaken');
                });
            });
        }

        var DB_NAME = 'SaudeIntimaVaultDB';
        var DB_VERSION = 1;
        var DB_STORE = 'documents';
        var vaultDbUnavailable = false;
        var vaultDbWarned = false;

        function warnVaultDbUnavailable() {
            if (vaultDbWarned) return;
            vaultDbWarned = true;
            alert('O armazenamento avançado de anexos está limitado neste navegador. O Cofre continua funcional para perfil, registos e medicação.');
        }

        function openVaultDB() {
            return new Promise(function(resolve, reject) {
                if (vaultDbUnavailable || !window.indexedDB) {
                    vaultDbUnavailable = true;
                    reject(new Error('IndexedDB indisponível'));
                    return;
                }
                var req = indexedDB.open(DB_NAME, DB_VERSION);
                var settled = false;
                var timeoutId = setTimeout(function() {
                    if (settled) return;
                    settled = true;
                    vaultDbUnavailable = true;
                    try { if (req.result && req.result.close) req.result.close(); } catch (ignored) {}
                    reject(new Error('Tempo excedido ao abrir armazenamento local'));
                }, 5000);
                req.onupgradeneeded = function() {
                    var db = req.result;
                    if (!db.objectStoreNames.contains(DB_STORE)) {
                        db.createObjectStore(DB_STORE, { keyPath: 'id' });
                    }
                };
                req.onsuccess = function() {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeoutId);
                    resolve(req.result);
                };
                req.onerror = function() {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeoutId);
                    vaultDbUnavailable = true;
                    reject(req.error || new Error('Erro ao abrir IndexedDB'));
                };
                req.onblocked = function() {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeoutId);
                    vaultDbUnavailable = true;
                    reject(new Error('Abertura do IndexedDB bloqueada'));
                };
            });
        }

        function dbPut(doc) {
            return openVaultDB().then(function(db) {
                return new Promise(function(resolve, reject) {
                    var tx = db.transaction(DB_STORE, 'readwrite');
                    tx.objectStore(DB_STORE).put(doc);
                    tx.oncomplete = function() { db.close(); resolve(true); };
                    tx.onerror = function() { db.close(); reject(tx.error || new Error('Erro a gravar')); };
                });
            }).catch(function(err) {
                warnVaultDbUnavailable();
                throw err;
            });
        }

        function dbGet(id) {
            return openVaultDB().then(function(db) {
                return new Promise(function(resolve, reject) {
                    var tx = db.transaction(DB_STORE, 'readonly');
                    var req = tx.objectStore(DB_STORE).get(id);
                    req.onsuccess = function() { db.close(); resolve(req.result || null); };
                    req.onerror = function() { db.close(); reject(req.error || new Error('Erro a ler')); };
                });
            }).catch(function(err) {
                warnVaultDbUnavailable();
                throw err;
            });
        }

        function dbDel(id) {
            return openVaultDB().then(function(db) {
                return new Promise(function(resolve, reject) {
                    var tx = db.transaction(DB_STORE, 'readwrite');
                    tx.objectStore(DB_STORE).delete(id);
                    tx.oncomplete = function() { db.close(); resolve(true); };
                    tx.onerror = function() { db.close(); reject(tx.error || new Error('Erro a apagar')); };
                });
            }).catch(function(err) {
                warnVaultDbUnavailable();
                throw err;
            });
        }

        function readAsDataUrl(file) {
            return new Promise(function(resolve, reject) {
                var reader = new FileReader();
                reader.onload = function() { resolve(reader.result); };
                reader.onerror = function() { reject(reader.error || new Error('Erro de leitura')); };
                reader.readAsDataURL(file);
            });
        }

        function renderDocs() {
            var query = getQuery();
            var sorted = docsMeta.slice().sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
            var filtered = sorted.filter(function(d) {
                return matchesQuery([d.name, d.type], query);
            });
            if (docCount) docCount.textContent = filtered.length + ' anexos';
            if (filtered.length === 0) {
                docsList.innerHTML = '<div style="font-size:0.8rem;color:var(--slate);padding:0.7rem 0;">Sem documentos anexados.</div>';
                return;
            }
            docsList.innerHTML = filtered.map(function(d) {
                var kb = Math.max(1, Math.round((d.size || 0) / 1024));
                return '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);">' +
                    '<div style="min-width:0;">' +
                    '<div style="font-size:0.82rem;color:var(--ink);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">' + escapeHtml(d.name) + '</div>' +
                    '<div style="font-size:0.72rem;color:var(--slate);">' + escapeHtml(d.type) + ' · ' + kb + ' KB</div>' +
                    '</div>' +
                    '<div style="display:flex;gap:6px;">' +
                    '<button type="button" data-doc-download="' + Number(d.id) + '" style="border:none;background:rgba(12,14,22,0.06);padding:5px 8px;border-radius:8px;cursor:pointer;font-size:0.72rem;">Baixar</button>' +
                    '<button type="button" data-doc-delete="' + Number(d.id) + '" style="border:none;background:rgba(192,52,74,0.14);color:var(--rose);padding:5px 8px;border-radius:8px;cursor:pointer;font-size:0.72rem;">Apagar</button>' +
                    '</div>' +
                    '</div>';
            }).join('');

            docsList.querySelectorAll('[data-doc-download]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var id = Number(this.getAttribute('data-doc-download'));
                    dbGet(id).then(function(doc) {
                        if (!doc || !doc.dataUrl) {
                            alert('Documento não encontrado no armazenamento local.');
                            return;
                        }
                        var a = document.createElement('a');
                        a.href = doc.dataUrl;
                        a.download = doc.name || ('documento-' + id);
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        gaEvent('vault_doc_download', 'vault', doc.type || 'file');
                    }).catch(function() {
                        alert('Não foi possível descarregar este documento.');
                    });
                });
            });

            docsList.querySelectorAll('[data-doc-delete]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var id = Number(this.getAttribute('data-doc-delete'));
                    if (!confirm('Eliminar este documento?')) return;
                    dbDel(id).finally(function() {
                        docsMeta = docsMeta.filter(function(d) { return Number(d.id) !== id; });
                        storageWrite(APP_STORAGE_KEYS.vaultDocMeta, docsMeta);
                        renderDocs();
                        updateKPIs();
                        gaEvent('vault_doc_delete', 'vault', 'document');
                    });
                });
            });
        }

        function handleUpload(files) {
            var list = Array.from(files || []);
            if (list.length === 0) return;
            var chain = Promise.resolve();
            list.forEach(function(file) {
                chain = chain.then(function() {
                    var valid = file.type.indexOf('image/') === 0 || file.type === 'application/pdf';
                    if (!valid) {
                        alert('Tipo de ficheiro não suportado: ' + file.name);
                        return;
                    }
                    if (file.size > 8 * 1024 * 1024) {
                        alert('Ficheiro muito grande (>8MB): ' + file.name);
                        return;
                    }
                    return readAsDataUrl(file).then(function(dataUrl) {
                        var id = Date.now() + Math.floor(Math.random() * 100000);
                        return dbPut({
                            id: id,
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            createdAt: new Date().toISOString(),
                            dataUrl: dataUrl
                        }).then(function() {
                            docsMeta.push({
                                id: id,
                                name: file.name,
                                type: file.type,
                                size: file.size,
                                createdAt: new Date().toISOString()
                            });
                        });
                    }).catch(function() {
                        alert('Falha ao guardar documento: ' + file.name);
                    });
                });
            });
            chain.then(function() {
                storageWrite(APP_STORAGE_KEYS.vaultDocMeta, docsMeta);
                renderDocs();
                updateKPIs();
                gaEvent('vault_docs_upload', 'vault', 'count_' + list.length);
            });
        }

        function exportBackupJson() {
            var payload = {
                version: 2,
                exportedAt: new Date().toISOString(),
                profile: profileData,
                records: recordsData,
                medications: medsData,
                medicationIntake: medIntake,
                documentsMeta: docsMeta,
                cycles: storageRead(APP_STORAGE_KEYS.cycles, []),
                dailyCycleLogs: storageRead(APP_STORAGE_KEYS.dailyLogs, {})
            };
            var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'cofre-saude-backup-' + toLocalISODate(new Date()) + '.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            gaEvent('vault_backup_export', 'vault', 'json');
        }

        function exportReportHtml() {
            var rowsRecords = recordsData.slice().sort(function(a, b) { return fromISODate(b.date) - fromISODate(a.date); }).map(function(r) {
                return '<tr><td>' + escapeHtml(r.date) + '</td><td>' + escapeHtml(categoryLabel(r.category)) + '</td><td>' + escapeHtml(r.title) + '</td><td>' + escapeHtml(r.professional || '-') + '</td><td>' + escapeHtml(r.status) + '</td><td>' + escapeHtml(r.notes || '-') + '</td></tr>';
            }).join('');
            var rowsMeds = medsData.map(function(m) {
                return '<tr><td>' + escapeHtml(m.name) + '</td><td>' + escapeHtml(m.dose || '-') + '</td><td>' + escapeHtml(m.frequency || '-') + '</td><td>' + escapeHtml(m.start || '-') + '</td><td>' + escapeHtml(m.end || '-') + '</td><td>' + (m.active ? 'Ativo' : 'Inativo') + '</td></tr>';
            }).join('');
            var rowsDocs = docsMeta.map(function(d) {
                return '<tr><td>' + escapeHtml(d.name) + '</td><td>' + escapeHtml(d.type) + '</td><td>' + Math.round((d.size || 0) / 1024) + ' KB</td><td>' + escapeHtml(d.createdAt || '-') + '</td></tr>';
            }).join('');
            var html =
                '<!DOCTYPE html><html lang="pt-PT"><head><meta charset="utf-8"><title>Relatório Cofre de Saúde</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1,h2{margin:0 0 8px}table{border-collapse:collapse;width:100%;margin:8px 0 18px}th,td{border:1px solid #ccc;padding:6px 8px;font-size:12px;vertical-align:top}th{background:#f2f2f2;text-align:left}.box{background:#f9f9f9;border:1px solid #ddd;padding:10px;margin-bottom:14px}</style></head><body>' +
                '<h1>Relatório do Cofre de Saúde</h1>' +
                '<p><strong>Data de exportação:</strong> ' + escapeHtml(new Date().toLocaleString('pt-PT')) + '</p>' +
                '<div class="box"><h2>Perfil</h2>' +
                '<p><strong>Nome:</strong> ' + escapeHtml(profileData['v-name'] || '-') + '</p>' +
                '<p><strong>Idade:</strong> ' + escapeHtml(profileData['v-age'] || '-') + ' | <strong>Peso:</strong> ' + escapeHtml(profileData['v-weight'] || '-') + ' kg | <strong>Altura:</strong> ' + escapeHtml(profileData['v-height'] || '-') + ' cm</p>' +
                '<p><strong>Gravidez:</strong> ' + escapeHtml(profileData['v-pregnant'] || '-') + ' | <strong>Grupo sanguíneo:</strong> ' + escapeHtml(profileData['v-blood'] || '-') + '</p>' +
                '<p><strong>Alergias:</strong> ' + escapeHtml(profileData['v-allergies'] || '-') + '</p>' +
                '<p><strong>Doenças:</strong> ' + escapeHtml(profileData['v-diseases'] || '-') + '</p>' +
                '<p><strong>Cirurgias:</strong> ' + escapeHtml(profileData['v-surgeries'] || '-') + '</p>' +
                '<p><strong>Vacinas:</strong> ' + escapeHtml(profileData['v-vaccines'] || '-') + '</p>' +
                '<p><strong>Histórico ginecológico:</strong> ' + escapeHtml(profileData['v-gyneco'] || '-') + '</p></div>' +
                '<h2>Registos Clínicos</h2><table><thead><tr><th>Data</th><th>Categoria</th><th>Título</th><th>Profissional</th><th>Estado</th><th>Notas</th></tr></thead><tbody>' + (rowsRecords || '<tr><td colspan="6">Sem registos</td></tr>') + '</tbody></table>' +
                '<h2>Medicamentos</h2><table><thead><tr><th>Medicamento</th><th>Dose</th><th>Frequência</th><th>Início</th><th>Fim</th><th>Estado</th></tr></thead><tbody>' + (rowsMeds || '<tr><td colspan="6">Sem medicamentos</td></tr>') + '</tbody></table>' +
                '<h2>Documentos</h2><table><thead><tr><th>Nome</th><th>Tipo</th><th>Tamanho</th><th>Criado em</th></tr></thead><tbody>' + (rowsDocs || '<tr><td colspan="4">Sem documentos</td></tr>') + '</tbody></table>' +
                '</body></html>';
            var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'cofre-saude-relatorio-' + toLocalISODate(new Date()) + '.html';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            gaEvent('vault_report_export', 'vault', 'html');
        }

        function importBackup() {
            if (!importInput || !importInput.files || !importInput.files[0]) {
                alert('Selecione um ficheiro de backup .json primeiro.');
                return;
            }
            var file = importInput.files[0];
            var reader = new FileReader();
            reader.onload = function() {
                try {
                    var parsed = JSON.parse(reader.result);
                    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid');
                    if (parsed.profile && typeof parsed.profile === 'object') {
                        profileData = Object.assign({}, defaultProfile, parsed.profile);
                    }
                    if (Array.isArray(parsed.records)) recordsData = normalizeRecords(parsed.records);
                    if (Array.isArray(parsed.medications)) medsData = normalizeMeds(parsed.medications);
                    if (parsed.medicationIntake && typeof parsed.medicationIntake === 'object') medIntake = parsed.medicationIntake;
                    if (Array.isArray(parsed.documentsMeta)) docsMeta = normalizeDocs(parsed.documentsMeta);
                    saveAll();
                    loadProfile();
                    renderAll();
                    alert('Backup importado com sucesso.');
                    gaEvent('vault_backup_import', 'vault', 'success');
                } catch (e) {
                    alert('Não foi possível importar este backup. Verifique o ficheiro JSON.');
                    gaEvent('vault_backup_import', 'vault', 'error');
                }
            };
            reader.readAsText(file);
        }

        function renderAll() {
            renderRecords();
            renderMeds();
            renderDocs();
            updateKPIs();
        }

        if (!profileForm.hasAttribute('data-bound')) {
            var saveBtn = document.getElementById('btn-save-profile');
            if (saveBtn) saveBtn.addEventListener('click', saveProfile);
            profileForm.setAttribute('data-bound', '1');
        }

        if (recordsForm && !recordsForm.hasAttribute('data-bound')) {
            var rc = document.getElementById('r-category');
            var rt = document.getElementById('r-title');
            var rd = document.getElementById('r-date');
            var rp = document.getElementById('r-professional');
            var rs = document.getElementById('r-status');
            var rg = document.getElementById('r-tags');
            var rn = document.getElementById('r-notes');
            if (rd) rd.value = toLocalISODate(new Date());

            recordsForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var title = rt ? rt.value.trim() : '';
                if (!title) {
                    alert('Informe um título para o registo clínico.');
                    return;
                }
                recordsData.push({
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    category: rc ? rc.value : 'outro',
                    title: title,
                    date: (rd && rd.value) ? rd.value : toLocalISODate(new Date()),
                    professional: rp ? rp.value.trim() : '',
                    status: rs ? rs.value : 'ativo',
                    tags: rg ? rg.value.trim() : '',
                    notes: rn ? rn.value.trim() : ''
                });
                storageWrite(APP_STORAGE_KEYS.vaultRecords, recordsData);
                recordsForm.reset();
                if (rd) rd.value = toLocalISODate(new Date());
                renderRecords();
                updateKPIs();
                gaEvent('vault_record_added', 'vault', 'record');
            });
            recordsForm.setAttribute('data-bound', '1');
        }

        if (medsForm && !medsForm.hasAttribute('data-bound')) {
            var mn = document.getElementById('m-name');
            var md = document.getElementById('m-dose');
            var mf = document.getElementById('m-frequency');
            var ms = document.getElementById('m-start');
            var me = document.getElementById('m-end');
            var mnote = document.getElementById('m-notes');
            medsForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var name = mn ? mn.value.trim() : '';
                if (!name) {
                    alert('Informe o nome do medicamento.');
                    return;
                }
                medsData.push({
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    name: name,
                    dose: md ? md.value.trim() : '',
                    frequency: mf ? mf.value.trim() : '',
                    start: ms ? ms.value : '',
                    end: me ? me.value : '',
                    notes: mnote ? mnote.value.trim() : '',
                    active: true
                });
                storageWrite(APP_STORAGE_KEYS.vaultMeds, medsData);
                medsForm.reset();
                renderMeds();
                updateKPIs();
                gaEvent('vault_med_added', 'vault', 'medication');
            });
            medsForm.setAttribute('data-bound', '1');
        }

        if (docsInput && !docsInput.hasAttribute('data-bound')) {
            docsInput.addEventListener('change', function() {
                handleUpload(this.files);
                this.value = '';
            });
            docsInput.setAttribute('data-bound', '1');
        }

        if (searchInput && !searchInput.hasAttribute('data-bound')) {
            var searchRenderTimer = null;
            var searchTrackTimer = null;
            searchInput.addEventListener('input', function() {
                if (searchRenderTimer) clearTimeout(searchRenderTimer);
                searchRenderTimer = setTimeout(function() {
                    renderRecords();
                    renderMeds();
                    renderDocs();
                }, 90);
                if (searchTrackTimer) clearTimeout(searchTrackTimer);
                var value = this.value ? this.value.trim() : '';
                searchTrackTimer = setTimeout(function() {
                    if (!value || value.length >= 2) gaEvent('vault_search', 'vault', value || 'clear');
                }, 350);
            });
            searchInput.setAttribute('data-bound', '1');
        }

        if (exportJsonBtn && !exportJsonBtn.hasAttribute('data-bound')) {
            exportJsonBtn.addEventListener('click', exportBackupJson);
            exportJsonBtn.setAttribute('data-bound', '1');
        }
        if (exportReportBtn && !exportReportBtn.hasAttribute('data-bound')) {
            exportReportBtn.addEventListener('click', exportReportHtml);
            exportReportBtn.setAttribute('data-bound', '1');
        }
        if (importBtn && !importBtn.hasAttribute('data-bound')) {
            importBtn.addEventListener('click', importBackup);
            importBtn.setAttribute('data-bound', '1');
        }

        loadProfile();
        if (vaultNeedsInitialSave) saveAll();
        renderAll();
    }

    // Inicializar experiência geral
    initLocalDataPersistence();
    initDashboardActions();
    initContraceptiveTracking();
    initPWAInstall();

    window.portalState = window.portalState || {};
    if (!window.portalState.cycle) {
        window.portalState.cycle = {
            hasCycleData: false,
            irregular: false,
            regularity: 'Sem dados',
            currentDay: 0,
            delayThreshold: 35,
            phaseLabel: 'Sem registo',
            isFertileWindow: false,
            nextPeriod: null,
            todayPain: 0,
            todayUnusualCount: 0
        };
    }
    if (!window.portalState.vault) {
        window.portalState.vault = {
            recordsCount: 0,
            activeMeds: 0,
            docsCount: 0,
            notTakenToday: 0,
            hasProfile: false
        };
    }

    routeHashToTab(false);

    function prewarmMobileModules() {
        requestIdleCallback(function() {
            ensureFeatureModules('calendario');
            updateMainDashboard();
        }, { timeout: 1200 });
        requestIdleCallback(function() {
            ensureFeatureModules('cofre');
            updateMainDashboard();
        }, { timeout: 2400 });
    }

    prewarmMobileModules();
    updateMainDashboard();

})();
