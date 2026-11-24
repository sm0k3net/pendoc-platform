export interface KnowledgeBaseSection {
  title: string;
  summary?: string;
  paragraphs: string[];
  bullets?: string[];
  steps?: string[];
  highlights?: string[];
  image?: {
    src: string;
    alt: string;
    caption?: string;
    sourceLabel?: string;
    sourceHref?: string;
  };
  flow?: {
    title: string;
    steps: string[];
  };
  schema?: {
    title: string;
    items: Array<{ name: string; description: string }>;
  };
  callout?: {
    title: string;
    tone: 'info' | 'success' | 'warning';
    content: string;
  };
}

export interface KnowledgeBaseEntry {
  slug: string;
  category: 'guide' | 'article';
  audience: 'Pentesters' | 'Clients' | 'Public';
  title: string;
  titleRu?: string;
  summary: string;
  summaryRu?: string;
  description: string;
  keywords: string;
  updatedAt: string;
  readingTime: string;
  highlights?: string[];
  heroImage?: {
    src: string;
    alt: string;
    caption?: string;
    sourceLabel?: string;
    sourceHref?: string;
  };
  sections: KnowledgeBaseSection[];
  sectionsRu?: KnowledgeBaseSection[];
  references: Array<{ label: string; href: string }>;
  hashtags: string[];
}

const baseKnowledgeBaseGuides: KnowledgeBaseEntry[] = [
  {
    slug: 'pentester-guide',
    category: 'guide',
    audience: 'Pentesters',
    title: 'PenDoc for Penetration Testers',
    titleRu: 'PenDoc для пентестеров',
    summary: 'End-to-end operating guide for consultants, internal red teams, and security engineers using PenDoc to manage assessments, evidence, AI workflows, and reporting.',
    summaryRu: 'Полное руководство по работе в PenDoc для консультантов, внутренних red team и специалистов по безопасности: управление проектами, доказательствами, ИИ-инструментами и отчётностью.',
    description: 'Comprehensive PenDoc guide for penetration testers covering project setup, findings management, scanner imports, AI workflows, remediation planning, report generation, collaboration, auditability, and delivery best practices.',
    keywords: 'PenDoc pentester guide, penetration testing workflow, vulnerability reporting platform, attack vector generation, remediation strategy documentation',
    updatedAt: '2026-04-29',
    readingTime: '18 min read',
    sections: [
      {
        title: 'Platform overview',
        paragraphs: [
          'PenDoc is designed to support the full lifecycle of a penetration test: planning, data intake, evidence management, vulnerability triage, attack-path modeling, remediation planning, report production, and client communication.',
          'The pentester workspace centralizes project folders, notes, raw scanner exports, structured vulnerabilities, generated artifacts, client sharing controls, and report history so that an engagement can move from raw technical output to a professional deliverable without fragmented tooling.',
        ],
        bullets: [
          'Project-centric workspace with folders, files, vulnerabilities, and generated reports.',
          'Support for raw scanner imports and normalized finding workflows.',
          'AI-assisted artifact generation for attack vectors, recommendations, remediation strategy, and report quality review.',
          'Client visibility controls so pentesters decide exactly what is exposed in the client portal.',
        ],
      },
      {
        title: 'Creating and structuring projects',
        paragraphs: [
          'Each engagement begins with a project that acts as the operational container for scope, evidence, findings, generated artifacts, and client-facing outputs. A well-structured project makes downstream reporting and collaboration significantly easier.',
          'PenDoc supports both internal and external assessment models, along with descriptive metadata that helps teams separate engagements by customer, environment, assessment style, and delivery status.',
        ],
        steps: [
          'Create the project and define the customer, environment, and testing model.',
          'Document rules of engagement, timeline, and scope identifiers such as URLs, IP ranges, FQDNs, or internal segments.',
          'Create or organize folders for reconnaissance notes, evidence, raw exports, screenshots, payloads, and draft reporting material.',
          'Invite collaborators or establish project sharing if more than one tester or reviewer will work in the workspace.',
        ],
      },
      {
        title: 'Importing scanner data and normalizing findings',
        paragraphs: [
          'PenDoc accelerates documentation by ingesting outputs from common tools such as Nessus, Acunetix, Burp Suite, and Nmap. Imported content should still be validated by a human tester before it is promoted to a formal finding.',
          'The objective of import workflows is not to replace analyst judgment. Instead, imports reduce repetitive transcription, preserve fidelity, and give the tester a structured starting point for triage, enrichment, and reporting.',
        ],
        bullets: [
          'Store scanner exports inside Raw Exports for traceability and future review.',
          'Promote verified issues into vulnerabilities only after confirming exploitability, impact, and business relevance.',
          'Use descriptions and detailed descriptions to separate executive-level explanation from technical evidence.',
          'Record tool provenance, execution commands, affected assets, and status to maintain defensible assessment records.',
        ],
      },
      {
        title: 'Managing vulnerabilities',
        paragraphs: [
          'The vulnerability record is the core reporting object in PenDoc. It should contain a concise title, accurate severity, realistic likelihood, affected assets, technical detail, evidence, and remediation guidance that is actionable for the client.',
          'Statuses such as open, fixed, accepted, ignored, retest, or validated make it easier to reflect remediation progress over time. Comments and retest workflows help maintain an audit trail between the pentesting team and the client.',
        ],
        bullets: [
          'Use the main description for a clear business-facing explanation of the issue and impact.',
          'Use technical details for reproducibility, proof, payloads, headers, attack paths, and evidence references.',
          'Use remediation for precise corrective action, compensating controls, and retest considerations.',
          'Keep vulnerability records updated as evidence improves or remediation changes the state of risk.',
        ],
      },
      {
        title: 'AI-generated artifacts',
        paragraphs: [
          'PenDoc includes several AI workflows intended to compress analysis time while keeping the tester in control of final output. These workflows should be treated as analyst accelerators, not as autonomous truth sources.',
          'Generated artifacts become especially valuable when they are reviewed, corrected, and shared selectively as part of the final client package.',
        ],
        bullets: [
          'Attack Vector Analysis models likely attacker progression, phased activity, supplementary diagrams, and MITRE ATT&CK mappings.',
          'Recommendations organize improvement opportunities into implementation-ready actions with effort, rationale, and benefits.',
          'Remediation Strategy converts multiple findings into a prioritized program map, timeline, quick wins, and long-term security objectives.',
          'AI Report Analysis reviews generated reports for documentation gaps, prioritization weaknesses, and client-readiness issues.',
        ],
      },
      {
        title: 'Controlling client visibility',
        paragraphs: [
          'Client sharing in PenDoc is explicit. Pentesters can choose which reports and AI-generated artifacts are visible in the client portal. This makes it possible to maintain internal drafts, working notes, and analyst-only artifacts without exposing them prematurely.',
          'Sharing decisions should be part of delivery governance. Before enabling visibility, verify technical accuracy, review tone, ensure no internal-only notes remain, and confirm that the content matches the agreed communication strategy for the client.',
        ],
        steps: [
          'Review the final state of the artifact or report.',
          'Use the client portal visibility toggle for the report or artifact.',
          'Confirm the shared content renders correctly in the client portal.',
          'Revoke visibility if the content requires correction or replacement.',
        ],
      },
      {
        title: 'Generating reports',
        paragraphs: [
          'Generated reports should be the output of disciplined analyst review. PenDoc helps transform structured vulnerability data into branded HTML reports, gap-analysis reports, comparison reports, and related deliverables.',
          'A professional report requires more than technical correctness. It should also be internally consistent, readable by different stakeholders, and aligned with the client’s decision-making needs.',
        ],
        bullets: [
          'Ensure vulnerability titles, severities, and remediation language are consistent before generating reports.',
          'Review executive summaries, scope, methodology, and appendices for completeness.',
          'Run Gap Analysis before delivery to identify editorial and prioritization gaps.',
          'Use Comparison reports to illustrate change over time, remediation progress, and posture improvement between reporting periods.',
        ],
      },
      {
        title: 'Client collaboration and retesting',
        paragraphs: [
          'The client portal supports ongoing engagement, not just static delivery. Clients can review findings, comment, and request retests from within their portal view.',
          'For pentesters, this creates a structured communications channel tied directly to the underlying vulnerability record. This reduces ambiguity and preserves context for future remediation cycles.',
        ],
        bullets: [
          'Respond to client comments inside the vulnerability workflow to preserve auditability.',
          'Use retest status fields to indicate waiting, completed, or related validation states.',
          'Update findings immediately after retest to avoid stale portal views.',
          'Use shared artifacts to explain attack paths and remediation sequencing when the client needs more than a list of findings.',
        ],
      },
      {
        title: 'Operational hygiene and governance',
        paragraphs: [
          'High-quality delivery requires more than fast analysis. Maintain clean folder hygiene, consistent naming, evidence labeling, and documented version changes for important artifacts such as attack vectors or generated reports.',
          'PenDoc’s audit-oriented features make it easier to demonstrate who changed what, when visibility was enabled, and how outputs evolved across the engagement.',
        ],
        bullets: [
          'Store raw evidence separately from client-facing summaries.',
          'Use version history for major artifacts when iterations materially change the narrative or risk interpretation.',
          'Review access controls, API tokens, and audit logs regularly.',
          'Keep exported or generated deliverables aligned with the latest vulnerability states.',
        ],
      },
      {
        title: 'Recommended workflow blueprint',
        paragraphs: [
          'A mature PenDoc workflow usually follows a repeated operational rhythm: ingest, validate, enrich, model, prioritize, deliver, and retest. Teams that formalize this sequence get higher reporting quality and fewer delivery surprises.',
        ],
        steps: [
          'Ingest evidence and scanner outputs into the project workspace.',
          'Validate findings manually and normalize them into well-structured vulnerabilities.',
          'Generate AI artifacts, then review and refine them with analyst judgment.',
          'Build client-visible reports and artifacts only after editorial review and publication checks.',
          'Use the client portal for communication, retests, and follow-up reporting.',
        ],
      },
    ],
    references: [
      { label: 'PenDoc API Documentation', href: '/api-docs' },
      { label: 'OWASP Web Security Testing Guide', href: 'https://owasp.org/www-project-web-security-testing-guide/' },
      { label: 'NIST SP 800-115', href: 'https://csrc.nist.gov/publications/detail/sp/800-115/final' },
    ],
    sectionsRu: [
      {
        title: 'Обзор платформы',
        paragraphs: [
          'PenDoc охватывает полный жизненный цикл пентеста: планирование, сбор данных, управление доказательствами, триаж уязвимостей, построение путей атаки, подготовка отчётов и взаимодействие с клиентом.',
          'Рабочее пространство пентестера централизует папки проекта, заметки, экспорты сканеров, структурированные уязвимости, сгенерированные артефакты и историю отчётов — без разрозненных инструментов.',
        ],
        bullets: [
          'Проектная среда с папками, файлами, уязвимостями и отчётами.',
          'Поддержка импорта из сканеров и нормализация находок.',
          'ИИ-инструменты: векторы атак, рекомендации, стратегия ремедиации, анализ пробелов.',
          'Контроль видимости: вы решаете, что открыто клиенту через портал.',
        ],
      },
      {
        title: 'Создание и структурирование проектов',
        paragraphs: [
          'Каждый проект — это операционный контейнер для скоупа, доказательств, находок, сгенерированных артефактов и клиентских материалов. Хорошо структурированный проект существенно упрощает последующую отчётность.',
          'PenDoc поддерживает внешние и внутренние оценки с метаданными, которые помогают разделять проекты по клиенту, среде, типу оценки и статусу работ.',
        ],
        steps: [
          'Создайте проект, укажите клиента, среду и модель тестирования.',
          'Задокументируйте правила взаимодействия, сроки и идентификаторы скоупа.',
          'Создайте папки для разведки, доказательств, экспортов сканеров, скриншотов и черновиков.',
          'Пригласите коллег или настройте общий доступ при командной работе.',
        ],
      },
      {
        title: 'Импорт данных сканеров',
        paragraphs: [
          'PenDoc ускоряет документирование за счёт импорта из Nessus, Acunetix, Burp Suite и Nmap. Импортированные данные должны быть проверены аналитиком перед добавлением в формальные находки.',
          'Цель импорта — устранить ручной перенос и дать аналитику структурированную отправную точку для триажа и обогащения данных.',
        ],
        bullets: [
          'Храните экспорты сканеров в отдельных папках для трассируемости.',
          'Переводите находки в уязвимости только после подтверждения эксплуатируемости и релевантности.',
          'Указывайте инструмент, команды запуска, затронутые активы и статус находки.',
        ],
      },
      {
        title: 'Управление уязвимостями',
        paragraphs: [
          'Запись об уязвимости — основной объект отчётности в PenDoc. Она должна содержать чёткое название, точный severity, вероятность, затронутые активы, технические детали, доказательства и рекомендации.',
          'Статусы (открыта, исправлена, принята, игнорируется, ретест, подтверждена) упрощают отслеживание прогресса. Комментарии создают аудиторский след между командой и клиентом.',
        ],
        bullets: [
          'Описание — для понятного бизнес-объяснения проблемы и её влияния.',
          'Технические детали — для воспроизведения, доказательств и путей атаки.',
          'Ремедиация — для конкретных корректирующих действий и рекомендаций по ретесту.',
          'Обновляйте записи при появлении новых доказательств или изменении статуса.',
        ],
      },
      {
        title: 'ИИ-артефакты',
        paragraphs: [
          'PenDoc включает ИИ-инструменты для сокращения времени анализа при сохранении контроля аналитика над финальным результатом. Рассматривайте их как ускорители, а не автономные источники истины.',
          'Сгенерированные артефакты наиболее ценны после проверки, уточнения и избирательного включения в финальный клиентский пакет.',
        ],
        bullets: [
          'Анализ вектора атаки: цепочки атак, диаграммы, фазы и маппинг MITRE ATT&CK.',
          'Рекомендации: приоритизированные улучшения с усилием, обоснованием и преимуществами.',
          'Стратегия ремедиации: программа устранения с быстрыми победами и долгосрочными целями.',
          'Анализ пробелов: проверка отчёта на полноту, приоритеты и готовность к передаче.',
        ],
      },
      {
        title: 'Управление видимостью для клиента',
        paragraphs: [
          'Публикация в клиентский портал в PenDoc явная. Пентестер выбирает, какие отчёты и артефакты видны клиенту, сохраняя внутренние черновики и рабочие материалы скрытыми.',
          'Перед открытием доступа убедитесь в точности, тоне материала и отсутствии внутренних заметок.',
        ],
        steps: [
          'Проверьте финальное состояние артефакта или отчёта.',
          'Включите переключатель видимости для клиента.',
          'Убедитесь в корректном отображении контента в клиентском портале.',
          'Отзовите доступ, если контент требует исправлений или замены.',
        ],
      },
      {
        title: 'Генерация отчётов',
        paragraphs: [
          'Сгенерированные отчёты должны быть результатом тщательного аналитического обзора. PenDoc преобразует структурированные данные об уязвимостях в брендированные HTML-отчёты, анализы пробелов и сравнения.',
          'Качественный отчёт требует не только технической точности, но и внутренней последовательности, читабельности для разных аудиторий.',
        ],
        bullets: [
          'Проверьте консистентность названий, severity и рекомендаций перед генерацией.',
          'Просмотрите executive summary, скоуп, методологию и приложения.',
          'Запустите Gap Analysis перед передачей для обнаружения пробелов.',
          'Используйте Comparison-отчёты для демонстрации прогресса между периодами.',
        ],
      },
      {
        title: 'Совместная работа с клиентом и ретесты',
        paragraphs: [
          'Клиентский портал поддерживает постоянное взаимодействие, а не только статичную передачу материалов. Клиенты могут просматривать находки, комментировать и запрашивать ретесты.',
          'Для пентестера это структурированный канал коммуникации, привязанный напрямую к записи об уязвимости.',
        ],
        bullets: [
          'Отвечайте на комментарии клиента в рабочем процессе уязвимости для сохранения аудитируемости.',
          'Используйте статусы ретеста: ожидание, завершён и связанные состояния.',
          'Обновляйте находки сразу после ретеста, чтобы портал не устарел.',
        ],
      },
      {
        title: 'Операционная гигиена',
        paragraphs: [
          'Качественная работа требует чистой организации папок, консистентных имён, маркировки доказательств и документированных изменений ключевых артефактов.',
          'Функции аудита PenDoc упрощают демонстрацию того, кто и когда внёс изменения и как менялись результаты на протяжении проекта.',
        ],
        bullets: [
          'Храните исходные доказательства отдельно от клиентских резюме.',
          'Используйте историю версий для ключевых артефактов при значительных изменениях.',
          'Регулярно проверяйте права доступа, API-токены и журналы аудита.',
        ],
      },
      {
        title: 'Рекомендуемая схема работы',
        paragraphs: [
          'Зрелый рабочий процесс PenDoc строится на повторяющемся цикле: сбор данных, валидация, обогащение, моделирование, приоритизация, передача, ретест. Команды, формализующие эту последовательность, получают более высокое качество отчётности.',
        ],
        steps: [
          'Загрузите доказательства и экспорты сканеров в рабочее пространство проекта.',
          'Вручную проверьте находки и нормализуйте их в структурированные уязвимости.',
          'Сгенерируйте ИИ-артефакты, затем проверьте и уточните с аналитическим суждением.',
          'Создайте клиентские отчёты и артефакты только после редакторской проверки.',
          'Используйте клиентский портал для коммуникации, ретестов и повторной отчётности.',
        ],
      },
    ],
    hashtags: ['#PenDoc', '#Pentesting', '#SecurityReporting', '#AttackPathAnalysis', '#RemediationPlanning'],
  },
  {
    slug: 'client-portal-guide',
    category: 'guide',
    audience: 'Clients',
    title: 'PenDoc Client Portal Guide',
    titleRu: 'Руководство по клиентскому порталу PenDoc',
    summary: 'Comprehensive guide for client-side users who consume reports, track remediation, collaborate with consultants, and request retests through the PenDoc client portal.',
    summaryRu: 'Полное руководство для пользователей на стороне клиента: изучение отчётов, отслеживание исправлений, взаимодействие с консультантами и запросы на ретест через клиентский портал.',
    description: 'Detailed PenDoc client portal documentation covering dashboard navigation, vulnerability review, artifact interpretation, comments, retests, reports, and remediation tracking.',
    keywords: 'PenDoc client portal guide, client vulnerability portal, remediation tracking, pentest client dashboard, report review platform',
    updatedAt: '2026-04-29',
    readingTime: '14 min read',
    sections: [
      {
        title: 'What the client portal is for',
        paragraphs: [
          'The client portal is a focused interface for customer stakeholders who need visibility into assessment results, remediation progress, shared reports, and analyst-approved supporting artifacts.',
          'Unlike the pentester workspace, the client portal is intentionally selective. It shows only content that the pentesting team has chosen to share, which helps keep the experience clear and delivery-ready.',
        ],
        bullets: [
          'Review open and remediated vulnerabilities across projects.',
          'Read shared reports and AI-generated supporting artifacts.',
          'Track remediation progress and retest states.',
          'Comment on specific findings and request retests when fixes are complete.',
        ],
      },
      {
        title: 'Dashboard and project navigation',
        paragraphs: [
          'The overview dashboard summarizes open findings, remediation progress, criticality distribution, and project activity. This is the fastest way for stakeholders to understand the current state of risk across all visible engagements.',
          'Project navigation then narrows the view to a single assessment so that teams can examine findings, deliverables, and actions in context.',
        ],
        bullets: [
          'Use the overview to understand overall exposure and remediation momentum.',
          'Open a project to review engagement-specific findings and shared deliverables.',
          'Use recent activity and notifications to follow consultant feedback and retest events.',
        ],
      },
      {
        title: 'Reading vulnerability records',
        paragraphs: [
          'Each vulnerability page is intended to support both technical and managerial readers. The title, severity, likelihood, affected assets, and lifecycle status establish the basic risk context, while description and technical details explain what was found and how it matters.',
          'Well-maintained findings should tell a complete story: what the issue is, how it could be abused, what systems are affected, what the operational impact is, and how to remediate it.',
        ],
        bullets: [
          'Description sections explain the issue in clear business and technical language.',
          'Technical Details provide supporting evidence, reproduction guidance, headers, payloads, or analyst notes appropriate for engineering teams.',
          'Remediation sections explain what to change, in what order, and what to verify after the fix.',
          'Comments preserve communication history between the client and the consulting team.',
        ],
      },
      {
        title: 'Understanding shared artifacts',
        paragraphs: [
          'Shared artifacts complement the report by showing how findings connect into a broader attack story or remediation plan. These artifacts are especially useful when leadership, engineers, and security teams need a common understanding of priority and sequence.',
        ],
        bullets: [
          'Attack Vector Analysis explains likely attacker progression, supporting diagrams, timeline phases, and mapped adversary behaviors.',
          'Remediation Strategy translates multiple issues into a phased program with quick wins, workstreams, and strategic outcomes.',
          'Recommendations present prioritized improvements with effort, rationale, and implementation guidance.',
        ],
      },
      {
        title: 'Using reports effectively',
        paragraphs: [
          'Reports remain the formal delivery artifact for many organizations. In the client portal, reports can be reviewed directly and downloaded for internal circulation, governance review, or remediation planning meetings.',
          'When using reports operationally, clients should compare them against the live portal state because retests and follow-up updates may change the latest condition of specific findings.',
        ],
        bullets: [
          'Use the report for formal sign-off, governance, or executive review.',
          'Use the portal for live operational status, comments, and retest coordination.',
          'Review shared artifacts when engineering teams need more detail than the executive report provides.',
        ],
      },
      {
        title: 'Comments and retest workflow',
        paragraphs: [
          'The portal supports a practical remediation loop: discuss the finding, implement a change, request a retest, and review the updated state. This keeps remediation coordination tied directly to the original finding instead of spreading context across emails or tickets.',
        ],
        steps: [
          'Open the vulnerability and confirm the proposed fix addresses the described weakness.',
          'Leave a comment if clarification is needed or if evidence should be reviewed by the consultant.',
          'Request a retest once the remediation has been deployed and is ready for validation.',
          'Track the retest status until the consulting team confirms the outcome.',
        ],
      },
      {
        title: 'How to interpret remediation progress',
        paragraphs: [
          'Remediation progress metrics should be read as directional indicators rather than standalone proof of security maturity. What matters most is the closure of high-impact weaknesses, the elimination of exploitable attack paths, and the institutionalization of lasting improvements.',
          'The best use of the portal is to combine metric trends with the content of shared remediation strategy and recommendation artifacts.',
        ],
        bullets: [
          'Prioritize critical and high-severity issues first unless business context requires a different sequence.',
          'Use quick wins for immediate risk reduction and long-term goals for structural security improvement.',
          'Treat recurring findings as indicators of process or architectural weakness, not isolated defects.',
        ],
      },
      {
        title: 'Security and confidentiality considerations',
        paragraphs: [
          'The client portal contains sensitive security information and should be governed accordingly. Access should be limited to stakeholders with a legitimate business need, and exported reports should be stored in controlled internal repositories.',
        ],
        bullets: [
          'Do not share portal access credentials or copied findings outside approved channels.',
          'Store downloaded reports in authorized document management systems.',
          'Coordinate internal distribution of artifacts to avoid uncontrolled spread of exploit detail.',
        ],
      },
      {
        title: 'Recommended client operating model',
        paragraphs: [
          'Organizations that get the most value from the portal usually establish a simple internal operating model: security owns triage, engineering owns remediation, leadership owns prioritization decisions, and the consulting team validates outcomes.',
        ],
        steps: [
          'Review new findings quickly after report publication.',
          'Assign owners and deadlines for priority remediation actions.',
          'Use comments for clarification and evidence exchange.',
          'Request retests only after changes are deployed and observable.',
          'Use follow-up reports and comparisons to demonstrate posture improvement over time.',
        ],
      },
    ],
    references: [
      { label: 'PenDoc Privacy Policy', href: '/privacy' },
      { label: 'PenDoc Cookies Policy', href: '/cookies' },
      { label: 'OWASP Top 10', href: 'https://owasp.org/www-project-top-ten/' },
    ],
    sectionsRu: [
      {
        title: 'Назначение клиентского портала',
        paragraphs: [
          'Клиентский портал — это целевой интерфейс для представителей заказчика, которым нужна видимость результатов оценки, прогресса устранения уязвимостей, общих отчётов и одобренных аналитиком артефактов.',
          'В отличие от рабочего пространства пентестера, портал намеренно избирателен: он показывает только контент, который команда тестирования решила открыть для клиента.',
        ],
        bullets: [
          'Просматривайте открытые и исправленные уязвимости по всем проектам.',
          'Читайте общие отчёты и вспомогательные ИИ-артефакты.',
          'Отслеживайте прогресс устранения и статусы ретестов.',
          'Комментируйте конкретные находки и запрашивайте ретесты.',
        ],
      },
      {
        title: 'Дашборд и навигация',
        paragraphs: [
          'Дашборд обзора суммирует открытые находки, прогресс устранения, распределение критичности и активность проекта — это самый быстрый способ понять текущее состояние рисков.',
          'Навигация по проекту сужает представление до одной оценки для детального анализа находок, материалов и действий.',
        ],
        bullets: [
          'Используйте обзор для понимания общей картины рисков и динамики устранения.',
          'Откройте проект для изучения специфичных находок и общих материалов.',
          'Следите за уведомлениями о новой обратной связи консультанта и обновлениях ретестов.',
        ],
      },
      {
        title: 'Чтение записей об уязвимостях',
        paragraphs: [
          'Каждая страница уязвимости предназначена для технических и управленческих читателей. Заголовок, severity, вероятность, затронутые активы и статус формируют базовый контекст риска.',
          'Хорошо поддерживаемые находки рассказывают полную историю: что за проблема, как использовать, какие системы затронуты и как исправить.',
        ],
        bullets: [
          'Описание объясняет проблему на бизнес-языке.',
          'Технические детали — для инженерных команд с доказательствами и инструкциями воспроизведения.',
          'Ремедиация — что изменить, в каком порядке и что проверить после исправления.',
          'Комментарии сохраняют историю общения между клиентом и консультантом.',
        ],
      },
      {
        title: 'Понимание общих артефактов',
        paragraphs: [
          'Общие артефакты дополняют отчёт, показывая, как находки складываются в более широкую картину атаки или план устранения. Они особенно полезны, когда руководству, инженерам и командам безопасности нужно единое понимание приоритетов.',
        ],
        bullets: [
          'Анализ вектора атаки — вероятные пути атакующего, диаграммы и поведение злоумышленника.',
          'Стратегия ремедиации — программа устранения с быстрыми победами и стратегическими целями.',
          'Рекомендации — приоритизированные улучшения с обоснованием и руководством по внедрению.',
        ],
      },
      {
        title: 'Эффективная работа с отчётами',
        paragraphs: [
          'Отчёты — основной формальный артефакт для многих организаций. В клиентском портале их можно просматривать и скачивать для внутреннего распространения, согласования или планирования устранения.',
          'При оперативном использовании сравнивайте отчёты с актуальным состоянием портала, так как ретесты могут изменить статус конкретных находок.',
        ],
        bullets: [
          'Используйте отчёт для официального согласования, управленческого обзора или аудита.',
          'Используйте портал для оперативного статуса и координации ретестов.',
          'Обращайтесь к общим артефактам, когда инженерным командам нужно больше деталей.',
        ],
      },
      {
        title: 'Комментарии и ретесты',
        paragraphs: [
          'Портал поддерживает практический цикл устранения: обсудите находку, внедрите исправление, запросите ретест, проверьте результат. Это привязывает взаимодействие напрямую к исходной записи, а не распределяет контекст по письмам и тикетам.',
        ],
        steps: [
          'Откройте уязвимость и убедитесь, что исправление устраняет описанную слабость.',
          'Оставьте комментарий, если требуется уточнение или проверка доказательств.',
          'Запросите ретест после развёртывания исправления.',
          'Отслеживайте статус ретеста до подтверждения результата консультантом.',
        ],
      },
      {
        title: 'Интерпретация прогресса устранения',
        paragraphs: [
          'Показатели прогресса устранения следует читать как индикаторы направления, а не как самостоятельное доказательство зрелости безопасности. Наибольшее значение имеет закрытие высокоимпактных уязвимостей.',
          'Лучше всего использовать портал в сочетании с артефактами стратегии ремедиации и рекомендаций.',
        ],
        bullets: [
          'Приоритизируйте критические и высокие уязвимости, если бизнес-контекст не требует иного порядка.',
          'Используйте быстрые победы для немедленного снижения рисков, долгосрочные цели — для структурных улучшений.',
          'Рассматривайте повторяющиеся находки как признак системных слабостей, а не изолированных дефектов.',
        ],
      },
      {
        title: 'Безопасность и конфиденциальность',
        paragraphs: [
          'Клиентский портал содержит конфиденциальные данные безопасности и должен управляться соответственно. Доступ должен быть ограничен стейкхолдерами с законными бизнес-потребностями.',
        ],
        bullets: [
          'Не передавайте учётные данные портала или скопированные находки за пределы утверждённых каналов.',
          'Храните скачанные отчёты в авторизованных системах управления документами.',
          'Координируйте внутреннее распространение артефактов, чтобы не допустить бесконтрольного распространения деталей эксплойтов.',
        ],
      },
      {
        title: 'Рекомендуемая операционная модель',
        paragraphs: [
          'Организации, получающие максимум от портала, обычно устанавливают простую модель: безопасность владеет триажем, инженерия — устранением, руководство — решениями о приоритетах, а консультанты — валидацией результатов.',
        ],
        steps: [
          'Быстро просматривайте новые находки после публикации отчёта.',
          'Назначайте ответственных и сроки для приоритетных действий по устранению.',
          'Используйте комментарии для уточнений и обмена доказательствами.',
          'Запрашивайте ретесты только после развёртывания и проверки изменений.',
          'Используйте повторные отчёты и сравнения для демонстрации улучшения безопасности.',
        ],
      },
    ],
    hashtags: ['#PenDoc', '#ClientPortal', '#RemediationTracking', '#SecurityGovernance', '#RiskManagement'],
  },
];

const baseKnowledgeBaseArticles: KnowledgeBaseEntry[] = [
  {
    slug: 'what-is-penetration-testing',
    category: 'article',
    audience: 'Public',
    title: 'What Is Penetration Testing?',
    summary: 'A complete explanation of penetration testing, why it matters, how it differs from scanning, and how organizations should use it to improve security.',
    description: 'Comprehensive SEO article explaining penetration testing, assessment objectives, testing types, methodology, outcomes, and how PenDoc supports professional delivery and reporting.',
    keywords: 'what is penetration testing, penetration testing explained, pentest meaning, cybersecurity assessment, penetration testing report',
    updatedAt: '2026-04-29',
    readingTime: '11 min read',
    sections: [
      {
        title: 'Definition and purpose',
        paragraphs: [
          'Penetration testing is an authorized, simulated attack against systems, applications, networks, or infrastructure. A qualified tester attempts to do what a real attacker would: find entry points, exploit weaknesses, and show how far access can extend.',
          'The goal is not a list of CVEs. It\'s an honest answer to the question: "If someone with a motive targeted this environment, what could they actually do?" A good pentest answers that question with evidence.',
        ],
      },
      {
        title: 'What a penetration test actually evaluates',
        paragraphs: [
          'Beyond finding individual issues, a pentest evaluates whether weaknesses can be chained. A single misconfiguration might be low risk on its own. Paired with an exposed service and a weak credential policy, it becomes a path to domain compromise.',
        ],
        bullets: [
          'Exposed attack surface and unpatched services.',
          'Authentication and authorization flaws.',
          'Security misconfigurations and default settings.',
          'Privilege escalation and lateral movement opportunities.',
          'Detection and response capability gaps.',
        ],
      },
      {
        title: 'Common types of penetration testing',
        paragraphs: [
          'Not all pentests are the same. The scope, depth, and starting assumptions differ depending on what the organization needs to understand.',
        ],
        bullets: [
          'External — testing internet-facing infrastructure and applications from an outsider perspective.',
          'Internal — simulating an attacker who already has a foothold inside the network.',
          'Web application and API — focused on application logic, authentication, and implementation flaws.',
          'Cloud and identity — IAM misconfigurations, tenant isolation issues, and deployment security.',
          'Red team — adversary simulation with realistic objectives, stealth requirements, and detection pressure.',
        ],
      },
      {
        title: 'How it differs from automated scanning',
        paragraphs: [
          'Scanners are fast and scalable, but they match signatures. They cannot reason about whether a finding is actually exploitable in this specific environment, or how two low-severity issues could be combined into a meaningful attack path.',
          'Penetration testing fills that gap. The value is in the analyst judgment: what was validated, what was chained, and what the real business impact would be if someone exploited it.',
        ],
      },
      {
        title: 'What clients should expect as outputs',
        paragraphs: [
          'A mature pentest delivers more than a list of findings. Clients should expect clearly rated vulnerabilities with evidence, business-contextualized impact statements, actionable remediation guidance, and ideally an attack-path narrative that shows how the issues fit together.',
          'Platforms like PenDoc help structure this: raw findings are normalized into vulnerability records, AI workflows generate attack vector analysis and remediation strategy, and the final report is produced from that structured data rather than assembled from scratch.',
        ],
      },
      {
        title: 'Conclusion',
        paragraphs: [
          'Penetration testing is most valuable when it drives decisions. The test is the means; the outcome is a prioritized remediation plan and a clearer understanding of what\'s actually at risk.',
        ],
      },
    ],
    references: [
      { label: 'NIST SP 800-115', href: 'https://csrc.nist.gov/publications/detail/sp/800-115/final' },
      { label: 'OWASP Testing Guide', href: 'https://owasp.org/www-project-web-security-testing-guide/' },
      { label: 'PenDoc Platform', href: '/' },
    ],
    hashtags: ['#PenetrationTesting', '#Pentest', '#Cybersecurity', '#SecurityAssessment', '#PenDoc'],
  },
  {
    slug: 'how-to-do-penetration-testing',
    category: 'article',
    audience: 'Public',
    title: 'How to Do Penetration Testing',
    summary: 'A structured guide to planning, executing, validating, and reporting a penetration test in a professional and ethical way.',
    description: 'Detailed article on how to perform penetration testing from planning and scoping through evidence collection, exploitation, reporting, and remediation validation.',
    keywords: 'how to do penetration testing, penetration testing process, pentest methodology, penetration testing workflow, writing pentest report',
    updatedAt: '2026-04-29',
    readingTime: '13 min read',
    sections: [
      {
        title: 'Start with authorization and scope',
        paragraphs: [
          'Before any technical work begins, get written authorization. This is not bureaucracy — it\'s what separates a professional assessment from unauthorized access. Scope defines what\'s in bounds, what\'s excluded, and what the rules of engagement are if something goes wrong during testing.',
        ],
        bullets: [
          'Define in-scope assets, environments, and testing window.',
          'Document allowed techniques, exclusions, and emergency contacts.',
          'Agree on black-box, gray-box, or white-box starting assumptions.',
        ],
      },
      {
        title: 'Perform reconnaissance and attack-surface review',
        paragraphs: [
          'Good recon is the difference between targeted, efficient testing and aimless scanning. Map exposed services, identify the technology stack, locate trust boundaries, and form hypotheses about where weaknesses are likely before trying to exploit anything.',
        ],
      },
      {
        title: 'Validate weaknesses — don\'t just collect tool output',
        paragraphs: [
          'Scanners generate noise. The tester\'s job is to separate signal from false positives and determine what is actually exploitable in this specific context. A critical CVE with a compensating control in place has a very different risk profile than the same CVE running on an exposed, unpatched internet-facing system.',
          'Use scanner data as a starting point. Normalize and enrich confirmed findings in a structured platform like PenDoc, so the final finding reflects reality rather than raw tool output.',
        ],
      },
      {
        title: 'Document evidence continuously',
        paragraphs: [
          'Documentation written during testing is always better than documentation written after. Reproduction steps captured in the moment are accurate. Steps reconstructed a week later often aren\'t.',
        ],
        bullets: [
          'Capture headers, payloads, screenshots, and timestamps as you work.',
          'Store raw exports and working notes separately from final report language.',
          'Keep findings structured so they can feed directly into reports and retest workflows.',
        ],
      },
      {
        title: 'Translate results into a delivery package',
        paragraphs: [
          'The technical work is done, but the job isn\'t. Clients need findings in a format that helps them act: clear vulnerability descriptions, severity ratings with business context, step-by-step remediation, and where appropriate, an attack-path narrative showing how issues connect.',
          'PenDoc handles this by generating attack vector analysis, remediation strategy, and gap analysis from structured vulnerability data — so the report is built from organized findings, not assembled from fragmented notes.',
        ],
      },
      {
        title: 'Conclusion',
        paragraphs: [
          'Quality penetration testing requires more than technical skill. Discipline in scoping, evidence handling, validation, and communication is what separates an assessment that improves security from one that just fills an audit requirement.',
        ],
      },
    ],
    references: [
      { label: 'PTES Technical Guidelines', href: 'http://www.pentest-standard.org/index.php/PTES_Technical_Guidelines' },
      { label: 'OWASP Web Security Testing Guide', href: 'https://owasp.org/www-project-web-security-testing-guide/' },
      { label: 'PenDoc Documentation', href: '/docs/pentester-guide' },
    ],
    hashtags: ['#HowToPentest', '#PentestWorkflow', '#SecurityTesting', '#CybersecurityOperations', '#PenDoc'],
  },
  {
    slug: 'what-is-vulnerability-assessment',
    category: 'article',
    audience: 'Public',
    title: 'What Is Vulnerability Assessment?',
    summary: 'A practical explanation of vulnerability assessments, what they measure, how they differ from penetration tests, and how they support risk management.',
    description: 'Detailed article on vulnerability assessments, assessment objectives, scanning and validation, prioritization, and programmatic use in enterprise security.',
    keywords: 'what is vulnerability assessment, vulnerability assessment meaning, vulnerability management, vulnerability review, cybersecurity assessment',
    updatedAt: '2026-04-29',
    readingTime: '10 min read',
    sections: [
      {
        title: 'Core definition',
        paragraphs: [
          'A vulnerability assessment is a structured process for identifying, classifying, and prioritizing security weaknesses across systems, applications, or infrastructure. The emphasis is on broad coverage and triage — not adversarial exploitation depth.',
          'Think of it as answering: "What known weaknesses exist, and which ones matter most?" That\'s a different question than penetration testing asks, and it\'s no less useful.',
        ],
      },
      {
        title: 'Typical assessment lifecycle',
        paragraphs: [
          'A mature vulnerability assessment program isn\'t a one-time scan — it\'s a repeating cycle. Organizations that run it continuously catch regressions, track remediation, and build an accurate picture of exposure over time.',
        ],
        bullets: [
          'Asset identification and scoping.',
          'Automated scanning for known issues.',
          'Human validation to remove false positives and add business context.',
          'Prioritization by severity and exploitability.',
          'Remediation tracking and rescan to confirm closure.',
        ],
      },
      {
        title: 'How it differs from penetration testing',
        paragraphs: [
          'Vulnerability assessment prioritizes breadth. Penetration testing prioritizes depth and adversarial realism — it asks whether weaknesses are actually exploitable and what an attacker could accomplish with them. Both are useful, but they answer different questions and serve different organizational needs.',
        ],
      },
      {
        title: 'Why reporting quality matters',
        paragraphs: [
          'A scan that produces 400 findings nobody acts on has accomplished nothing. The value of a vulnerability assessment comes from turning raw results into organized, prioritized, actionable documentation that engineering and security governance teams can actually use.',
          'PenDoc helps with this by converting validated findings into structured records, generating remediation guidance, and tracking progress over time — so assessments feed directly into an operational workflow rather than collecting dust in a spreadsheet.',
        ],
      },
      {
        title: 'Conclusion',
        paragraphs: [
          'A vulnerability assessment is one of the most practical tools available for understanding systemic exposure. Done consistently with disciplined triage and reporting, it becomes the operational foundation for continuous risk reduction.',
        ],
      },
    ],
    references: [
      { label: 'CISA Known Exploited Vulnerabilities Catalog', href: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog' },
      { label: 'CVSS Specification', href: 'https://www.first.org/cvss/' },
      { label: 'PenDoc Platform', href: '/' },
    ],
    hashtags: ['#VulnerabilityAssessment', '#VulnerabilityManagement', '#RiskReduction', '#CyberDefense', '#PenDoc'],
  },
  {
    slug: 'what-is-vulnerability-scanning',
    category: 'article',
    audience: 'Public',
    title: 'What Is Vulnerability Scanning?',
    summary: 'A detailed look at vulnerability scanning, how scanners work, where they fit, and why scanning alone is not enough for mature security assurance.',
    description: 'SEO article about vulnerability scanning, scanner operation, false positives, validation, scheduling, and how scanning supports continuous security programs.',
    keywords: 'what is vulnerability scanning, vulnerability scanner, automated security scanning, scanning vs pentesting, vulnerability detection',
    updatedAt: '2026-04-29',
    readingTime: '10 min read',
    sections: [
      {
        title: 'Definition',
        paragraphs: [
          'Vulnerability scanning is the automated process of probing systems, services, and applications to detect known weaknesses. Scanners check for outdated software, exposed ports, missing patches, dangerous default configurations, and a wide range of other predictable security issues.',
          'The key word is "known." Scanners are excellent at finding things that already have a signature. They are not designed to reason about novel attack paths or understand business context.',
        ],
      },
      {
        title: 'How scanners work',
        paragraphs: [
          'Most scanners start with discovery (finding what\'s there), then fingerprinting (identifying what it is), then checking against a database of known issues. Some checks require authentication to find internal weaknesses; others run externally and assess what an outsider can see.',
        ],
      },
      {
        title: 'Strengths and limitations',
        paragraphs: [
          'Scanners are fast, scalable, and essential for covering large environments consistently. But they also generate false positives, miss application-logic flaws entirely, and can\'t explain how a collection of low-severity findings might combine into a serious attack path. Treat scanner output as a starting point, not a conclusion.',
        ],
        bullets: [
          'Strong for scale, frequency, consistency, and known-issue detection.',
          'Weak for contextual exploitability, logic flaws, and attack-path reasoning.',
        ],
      },
      {
        title: 'From scan data to operational value',
        paragraphs: [
          'Raw scan output is rarely useful as-is. It needs validation — someone has to confirm whether a finding is real, exploitable, and worth the remediation effort. That validated data then needs to be tracked, communicated, and re-checked after fixes are applied.',
          'PenDoc handles this layer: raw scanner exports can be imported and stored for traceability, confirmed issues are promoted into structured vulnerability records, and those records feed directly into reports and remediation workflows.',
        ],
      },
      {
        title: 'Conclusion',
        paragraphs: [
          'Scanning is a core building block — but the value isn\'t in running the scan. It\'s in what happens after: validation, triage, structured documentation, and consistent follow-through on remediation.',
        ],
      },
    ],
    references: [
      { label: 'OWASP Vulnerability Management Guide', href: 'https://owasp.org/www-project-vulnerability-management-guide/' },
      { label: 'PenDoc Pentester Guide', href: '/docs/pentester-guide' },
    ],
    hashtags: ['#VulnerabilityScanning', '#ScannerOperations', '#ContinuousSecurity', '#ExposureManagement', '#PenDoc'],
  },
  {
    slug: 'vulnerability-vs-security-misconfiguration',
    category: 'article',
    audience: 'Public',
    title: 'What Is the Difference Between a Vulnerability and a Security Misconfiguration?',
    summary: 'Clarifies the overlap and differences between vulnerabilities and misconfigurations, with examples and practical reporting guidance.',
    description: 'Detailed article explaining the difference between vulnerabilities and security misconfigurations, including examples, reporting considerations, and prioritization guidance.',
    keywords: 'vulnerability vs security misconfiguration, security misconfiguration explained, cybersecurity terminology, application security weakness',
    updatedAt: '2026-04-29',
    readingTime: '9 min read',
    sections: [
      {
        title: 'The basic distinction',
        paragraphs: [
          'A vulnerability is a weakness that can be exploited to compromise confidentiality, integrity, or availability. A security misconfiguration is a specific category of weakness caused by insecure settings, missing hardening, unnecessary exposure, or poor operational defaults.',
          'In practice, many security misconfigurations are vulnerabilities. The distinction matters because the root cause and remediation path may differ from a code defect or architecture flaw.',
        ],
      },
      {
        title: 'Examples',
        paragraphs: [
          'Examples of vulnerabilities include SQL injection, broken access control, insecure deserialization, or weak session management. Examples of misconfigurations include open admin panels, default credentials, missing TLS hardening, exposed storage buckets, or overly permissive IAM rules.',
        ],
      },
      {
        title: 'Why the distinction matters in reporting',
        paragraphs: [
          'Clients need to know not just that something is wrong, but what operational team can fix it. A code vulnerability may belong to developers, while a misconfiguration may belong to DevOps, infrastructure, cloud engineering, or system administration.',
        ],
      },
      {
        title: 'How to document both clearly',
        paragraphs: [
          'A good report explains the affected asset, root cause, exploitability, impact, and remediation owner. PenDoc’s structured finding model makes it easier to describe these dimensions consistently and to turn them into prioritized remediation work.',
        ],
      },
      {
        title: 'Conclusion',
        paragraphs: [
          'The most useful question is not whether an issue is “just” a misconfiguration, but whether it is exploitable, impactful, and remediable. Clear classification helps, but actionable documentation is what drives improvement.',
        ],
      },
    ],
    references: [
      { label: 'OWASP Top 10 - Security Misconfiguration', href: 'https://owasp.org/Top10/' },
      { label: 'PenDoc Platform', href: '/' },
    ],
    hashtags: ['#SecurityMisconfiguration', '#VulnerabilityManagement', '#OWASP', '#SecurityEngineering', '#PenDoc'],
  },
  {
    slug: 'penetration-testing-standards-and-guidelines',
    category: 'article',
    audience: 'Public',
    title: 'Penetration Testing Standards and Guidelines',
    summary: 'A practical survey of the major penetration testing standards and guidance sources teams should know and use.',
    description: 'Comprehensive article covering PTES, NIST SP 800-115, OWASP WSTG, OSSTMM, and other guidance used in professional penetration testing programs.',
    keywords: 'penetration testing standards, PTES, NIST 800-115, OWASP testing guide, penetration testing methodology',
    updatedAt: '2026-04-29',
    readingTime: '12 min read',
    sections: [
      {
        title: 'Why standards matter',
        paragraphs: [
          'Standards don\'t make testing better on their own. What they do is provide a baseline so that coverage, evidence quality, and reporting don\'t vary wildly between practitioners, engagements, or clients.',
          'For organizations procuring testing, standards also make it easier to evaluate whether the work was thorough. For testers, they provide a defensible framework for methodology decisions and scope discussions.',
        ],
      },
      {
        title: 'Key frameworks and guidance',
        paragraphs: [
          'No single framework covers every situation, and most experienced practitioners draw from multiple sources rather than following one rigidly.',
        ],
        bullets: [
          'PTES — solid structure for the full engagement lifecycle, from pre-engagement through reporting.',
          'NIST SP 800-115 — government-aligned guidance focused on planning, execution, and technical testing governance.',
          'OWASP WSTG — the practical standard for web application testing depth and methodology.',
          'OWASP ASVS — useful for verification-level requirements when application testing has formal acceptance criteria.',
          'OSSTMM — a more measurement-oriented methodology for teams that want quantifiable assurance.',
        ],
      },
      {
        title: 'Choosing the right standard for the job',
        paragraphs: [
          'A web application test will lean hard on OWASP. An enterprise infrastructure test might follow NIST or PTES more closely. Red team engagements often use MITRE ATT&CK as a framework for adversary behavior modeling rather than a traditional testing standard.',
          'The important thing is having a conscious rationale for your methodology decisions — and documenting it clearly in the report.',
        ],
      },
      {
        title: 'How standards improve deliverables',
        paragraphs: [
          'Standards don\'t just influence how testing is done — they also shape what gets documented. PTES and WSTG both include guidance on reporting expectations. Using a recognized standard makes it easier to explain scope completeness, methodology rationale, and evidence quality to clients and auditors.',
          'PenDoc helps operationalize this consistency: structured findings, clear evidence management, and report generation that reflects disciplined methodology across every engagement.',
        ],
      },
      {
        title: 'Conclusion',
        paragraphs: [
          'Standards are scaffolding, not a substitute for skill. The best teams use them to ensure coverage, defend methodology choices, and communicate clearly — then apply their own judgment for everything else.',
        ],
      },
    ],
    references: [
      { label: 'PTES', href: 'http://www.pentest-standard.org/' },
      { label: 'NIST SP 800-115', href: 'https://csrc.nist.gov/publications/detail/sp/800-115/final' },
      { label: 'OWASP WSTG', href: 'https://owasp.org/www-project-web-security-testing-guide/' },
    ],
    hashtags: ['#PentestStandards', '#PTES', '#NIST800115', '#OWASPWSTG', '#PenDoc'],
  },
  {
    slug: 'pentester-tools-and-scanners-free-and-paid',
    category: 'article',
    audience: 'Public',
    title: 'Pentester Tools and Scanners: Free and Paid',
    summary: 'A practical overview of common pentesting tools, where they fit, and how free and paid options compare in real workflows.',
    description: 'Detailed article comparing free and paid pentesting tools across reconnaissance, web testing, network testing, exploitation support, and reporting workflows.',
    keywords: 'pentester tools, free pentesting tools, paid security scanners, vulnerability scanners, penetration testing toolkit',
    updatedAt: '2026-04-29',
    readingTime: '12 min read',
    sections: [
      {
        title: 'Tool categories that matter most',
        paragraphs: [
          'No single tool does everything. A realistic engagement toolkit combines reconnaissance utilities, scanning infrastructure, an intercepting proxy, exploitation support tools, and a documentation platform. Most of the work happens in the spaces between tools — in the analyst\'s judgment about what the output actually means.',
        ],
      },
      {
        title: 'Free and open-source options',
        paragraphs: [
          'Open-source tools remain the backbone of most practitioners\' toolkits. They\'re transparent, scriptable, and constantly updated by the community. Nmap for network discovery, Burp Suite Community for HTTP interception, ffuf and feroxbuster for content discovery, nuclei for template-based scanning, sqlmap for injection testing, amass for subdomain enumeration — these cover a huge portion of what gets used in real assessments.',
          'The limitation isn\'t capability; it\'s usually polish. Free tools require more configuration and workflow discipline to use efficiently at scale.',
        ],
      },
      {
        title: 'Commercial tools and where they help',
        paragraphs: [
          'Commercial scanners earn their cost through maintained signature databases, authenticated checks, better false-positive handling, and polished reporting pipelines. Nessus covers infrastructure and compliance scanning well. Burp Suite Pro adds active scanning, automation, and extension support. Acunetix and similar tools are strong for web application coverage.',
          'For teams that run many engagements, the time saved on manual scanning and triage is often worth the investment.',
        ],
      },
      {
        title: 'Why documentation tooling matters',
        paragraphs: [
          'This is the underappreciated part of the toolkit. Finding a vulnerability takes minutes. Documenting it clearly, with accurate severity, business context, reproduction steps, and actionable remediation guidance, takes longer — and that documentation is what the client actually receives.',
          'PenDoc sits in this layer: it ingests scanner data, organizes validated findings, generates AI-assisted attack vector analysis and remediation strategy, and produces the final client report from structured data rather than a from-scratch document.',
        ],
      },
      {
        title: 'Conclusion',
        paragraphs: [
          'The best toolkit is the one that fits your workflow and produces defensible, reproducible results. Free tools handle most situations well when used with discipline. Commercial tools add coverage and efficiency at scale. And documentation platforms are what turn technical findings into client outcomes.',
        ],
      },
    ],
    references: [
      { label: 'Nmap', href: 'https://nmap.org/' },
      { label: 'Burp Suite', href: 'https://portswigger.net/burp' },
      { label: 'PenDoc Platform', href: '/' },
    ],
    hashtags: ['#PentestTools', '#SecurityScanners', '#BurpSuite', '#Nmap', '#PenDoc'],
  },
  {
    slug: 'how-to-write-penetration-testing-report',
    category: 'article',
    audience: 'Public',
    title: 'How to Write a Penetration Testing Report',
    summary: 'A comprehensive guide to writing penetration testing reports that are technical, credible, actionable, and suitable for both engineers and executives.',
    description: 'Detailed article on writing professional penetration testing reports, including structure, severity, evidence, remediation guidance, executive communication, and QA review.',
    keywords: 'how to write penetration testing report, pentest report writing, security report template, remediation guidance, executive summary',
    updatedAt: '2026-04-29',
    readingTime: '14 min read',
    sections: [
      {
        title: 'Why report quality matters',
        paragraphs: [
          'The report is what the client has when the engagement is over. Everything else — the scanning, the exploitation, the late nights — feeds into it. A weak report doesn\'t just waste the testing work; it can actively mislead clients about what matters and leave them without the guidance to fix anything.',
          'The best technical work deserves a report that communicates it clearly.',
        ],
      },
      {
        title: 'Core report structure',
        paragraphs: [
          'Professional reports don\'t need to be long to be good, but they do need to be complete. Every section exists to answer a different reader\'s question: the executive wants to understand risk; the engineer wants to reproduce and fix the issue; the QA reviewer wants to verify it was addressed.',
        ],
        bullets: [
          'Executive summary: what happened, what matters most, what should be done.',
          'Scope, dates, and methodology: sets expectations and documents the boundaries of coverage.',
          'Individual findings: severity, affected assets, evidence, reproduction steps, and remediation.',
          'Overall risk themes and remediation priorities: connects findings into a coherent picture.',
        ],
      },
      {
        title: 'What makes a finding strong',
        paragraphs: [
          'A strong finding answers five questions: what is wrong, where it exists, how it can be abused, why it matters to this organization, and exactly how to fix it. The answers should be specific to this environment — not copy-pasted from a scanner template.',
          'Reproducibility is non-negotiable. If an engineer can\'t replicate the finding from the report alone, the report hasn\'t done its job.',
        ],
      },
      {
        title: 'Common reporting mistakes',
        paragraphs: [
          'Vague titles like "SSL Issues" or "Misconfiguration Found" tell clients nothing actionable. Generic remediation like "update your software" without specifying what, where, or how is nearly useless. Severity ratings that don\'t match the described impact undermine trust.',
          'PenDoc\'s structured finding workflows and AI Gap Analysis help catch these issues before delivery — reviewing for completeness, severity consistency, and editorial gaps before the report reaches the client.',
        ],
      },
      {
        title: 'Using AI and automation responsibly',
        paragraphs: [
          'AI can draft attack narratives, suggest remediation language, and flag gaps in coverage faster than any manual process. That\'s genuinely useful. But the analyst owns the final output. An AI-generated attack vector that misrepresents the risk or a remediation plan that skips a key step does more damage than no AI at all.',
          'Use automation to accelerate first drafts and catch what you might miss. Then apply judgment before anything reaches the client.',
        ],
      },
      {
        title: 'Conclusion',
        paragraphs: [
          'The report is what the client acts on. Technical excellence in testing means nothing if the report obscures findings, buries priorities, or leaves remediation guidance too vague to follow. PenDoc brings findings, AI-assisted analysis, QA review, and client delivery into one structured workflow — so good testing leads to good reports, every time.',
        ],
      },
    ],
    references: [
      { label: 'OWASP Reporting Cheat Sheet', href: 'https://cheatsheetseries.owasp.org/' },
      { label: 'PenDoc Gap Analysis Workflow', href: '/docs/pentester-guide' },
      { label: 'PenDoc Platform', href: '/' },
    ],
    hashtags: ['#PentestReport', '#ReportWriting', '#SecurityDocumentation', '#ExecutiveSummary', '#PenDoc'],
  },
  {
    slug: 'owasp-top-10-web-application-security-risks',
    category: 'article',
    audience: 'Public',
    title: 'OWASP Top 10: Understanding the Most Critical Web Application Security Risks',
    summary: 'A comprehensive breakdown of the OWASP Top 10 web application security risks — what each category means, how attackers exploit it, and what developers and testers should do about it.',
    description: 'In-depth article covering all OWASP Top 10 web application security risks with attack scenarios, real-world impact, detection approaches, and remediation guidance for security teams and developers.',
    keywords: 'OWASP Top 10, web application security, injection attacks, broken authentication, XSS, IDOR, security misconfiguration, vulnerability categories, web security risks',
    updatedAt: '2026-08-31',
    readingTime: '15 min read',
    sections: [
      {
        title: 'What is the OWASP Top 10?',
        paragraphs: [
          'The OWASP Top 10 is a standard awareness document published by the Open Web Application Security Project (OWASP) that identifies the ten most critical security risks to web applications. Updated periodically based on data from hundreds of organizations and thousands of applications, it serves as the industry-standard reference for prioritizing application security efforts.',
          'The list is not a compliance checklist — it is a risk-based framework that helps development teams, security engineers, and penetration testers understand where the most impactful and common weaknesses live, and what to do about them. Understanding the OWASP Top 10 is foundational for anyone involved in building, auditing, or securing web applications.',
        ],
        bullets: [
          'Based on real-world data from CVEs, penetration test findings, and security audits.',
          'Organized by risk category, not individual CVEs, making it applicable across technologies.',
          'Used as a baseline for web application penetration tests, code reviews, and security certifications.',
          'Referenced by PCI DSS, SOC 2, and many enterprise security standards.',
        ],
      },
      {
        title: 'A01: Broken Access Control',
        paragraphs: [
          'Broken Access Control moved to the top of the OWASP list in 2021 and remains the most prevalent category. It covers failures in enforcing restrictions on what authenticated users are allowed to do. Common manifestations include Insecure Direct Object References (IDOR) where users can access other users\' data by modifying a parameter, privilege escalation where a normal user accesses admin functionality, and CORS misconfigurations that allow cross-origin data exposure.',
          'In practice, broken access control is easy to exploit and often goes undetected because it doesn\'t produce obvious errors — the application works as designed, just not as authorized. A user who changes their account ID from 1001 to 1002 in an API call and receives another user\'s data has exploited a broken access control vulnerability. The business impact ranges from data exposure to full account takeover and financial fraud.',
        ],
        bullets: [
          'IDOR — accessing resources by manipulating object identifiers (IDs, UUIDs, filenames).',
          'Privilege escalation — accessing admin panels, privileged APIs, or management functions.',
          'Forced browsing — accessing URLs or endpoints not linked in the UI.',
          'JWT/token claims manipulation to gain elevated permissions.',
        ],
      },
      {
        title: 'A02: Cryptographic Failures',
        paragraphs: [
          'Formerly known as "Sensitive Data Exposure," Cryptographic Failures covers weaknesses in how data is protected at rest and in transit. This includes the use of deprecated protocols such as TLS 1.0/1.1, weak cipher suites, missing HTTPS enforcement, hardcoded credentials, improper key management, and storing passwords in plaintext or using fast hashing algorithms like MD5 or SHA-1 without salting.',
          'The impact of cryptographic failures is often invisible until a breach occurs. An application that transmits session tokens over HTTP, stores passwords with MD5, or uses ECB mode for encryption may appear to function correctly while being fundamentally insecure. Attackers who intercept or obtain encrypted data can often recover plaintext due to weak algorithm choices, regardless of the application-level logic.',
        ],
        bullets: [
          'Insecure TLS configuration: outdated protocols, weak ciphers, self-signed certificates.',
          'Passwords stored with weak/unsalted hashes: MD5, SHA-1, unsalted SHA-256.',
          'Sensitive data transmitted over HTTP or logged in cleartext.',
          'Hardcoded credentials or cryptographic keys in source code.',
        ],
      },
      {
        title: 'A03: Injection',
        paragraphs: [
          'Injection flaws occur when untrusted data is sent to an interpreter as part of a command or query. The interpreter — an SQL database, OS shell, LDAP server, XML parser, or template engine — cannot distinguish between intended commands and attacker-controlled data. SQL injection remains the most widely known form, but injection categories include command injection, LDAP injection, XPath injection, template injection (SSTI), and NoSQL injection.',
          'A classic SQL injection example: an application builds a query as \`SELECT * FROM users WHERE username=\'\` + input + \`\'\`. If the input is \`admin\'--\`, the query becomes \`SELECT * FROM users WHERE username=\'admin\'--\'\`, which bypasses the password check entirely. Injection vulnerabilities are highly dangerous because they can lead to full database exfiltration, authentication bypass, and in command injection cases, remote code execution on the server.',
        ],
        bullets: [
          'SQL injection — manipulating SQL queries to extract data, bypass auth, or execute commands.',
          'OS command injection — injecting shell commands through application functions.',
          'SSTI — injecting template directives to achieve code execution (e.g., in Jinja2, Twig).',
          'NoSQL injection — manipulating MongoDB operators or CouchDB query structures.',
        ],
      },
      {
        title: 'A04: Insecure Design',
        paragraphs: [
          'Insecure Design represents a category of weaknesses rooted in architectural and design decisions rather than implementation bugs. The distinction matters: a secure implementation of an insecure design is still insecure. Examples include designing a password reset flow that sends the new password in the reset email, building a multi-tenant system without tenant isolation, or designing an API that returns full user records when only a user ID is needed.',
          'This category calls for threat modeling during design, secure design patterns, and security-focused requirements — not just code-level review. A web application that allows unlimited concurrent sessions by design, has no fraud detection logic in its payment flow, or shares a single API key across all customers has insecure design regardless of how well the code is written.',
        ],
        bullets: [
          'Missing rate limiting at the design level for sensitive operations.',
          'Password/account recovery flows that introduce secondary authentication weaknesses.',
          'Business logic that lacks fraud controls or tamper-evident audit trails.',
          'Data architecture that doesn\'t enforce tenant isolation or data minimization.',
        ],
      },
      {
        title: 'A05: Security Misconfiguration',
        paragraphs: [
          'Security Misconfiguration is the broadest category and one of the most common findings in penetration tests. It covers default credentials left in place, unnecessary services enabled, permissive CORS configurations, debug interfaces exposed to production, verbose error messages revealing stack traces, missing HTTP security headers (CSP, HSTS, X-Frame-Options), and cloud storage buckets with public access.',
          'Misconfiguration vulnerabilities are particularly common because they are created by omission rather than action — they exist because someone didn\'t do something (harden the configuration) rather than because someone made an active mistake. Automated tools like Nessus, Burp Suite, or cloud-native security scanners catch many of these, but interpreting their real-world exploitability still requires analyst judgment.',
        ],
        bullets: [
          'Default credentials on admin panels, databases, or management consoles.',
          'Publicly accessible S3 buckets, Azure blobs, or GCS containers.',
          'Verbose error messages exposing framework versions, file paths, or stack traces.',
          'Missing security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options.',
        ],
      },
      {
        title: 'A06: Vulnerable and Outdated Components',
        paragraphs: [
          'Modern applications are built on dozens or hundreds of third-party libraries, frameworks, and runtime dependencies. Each unpatched component is a potential attack vector. This category covers scenarios where applications use components with known CVEs — the Log4Shell vulnerability (CVE-2021-44228) is the canonical example, where a logging library present in millions of applications was exploitable for unauthenticated remote code execution.',
          'Component vulnerabilities are unique because the attack vector is often well-documented, exploit code is publicly available, and the only variable is whether the target is running the vulnerable version. Organizations with no software asset inventory or dependency management process are particularly exposed — they often don\'t know what components they\'re running, let alone whether those components are patched.',
        ],
        bullets: [
          'Outdated npm, pip, Maven, or NuGet packages with known CVEs.',
          'Unpatched web application frameworks (Spring, Struts, Django, Rails).',
          'End-of-life runtime environments (PHP 7.x, Python 2.7, Java 8 with expired support).',
          'Server software: Apache HTTPD, nginx, OpenSSL at vulnerable versions.',
        ],
      },
      {
        title: 'A07: Identification and Authentication Failures',
        paragraphs: [
          'Authentication failures encompass weaknesses in how applications verify identity and manage sessions. Common issues include weak or default passwords, missing account lockout on brute force attempts, improper session token generation, insecure credential transmission, missing MFA for sensitive operations, and unsafe session management (session IDs in URLs, non-expiring tokens, missing logout).',
          'The impact of authentication failures can be catastrophic — a single exploitable authentication weakness can give an attacker access to any account in the system. Credential stuffing attacks (using credentials from other breaches) are highly automated and effective against applications without rate limiting or multi-factor requirements.',
        ],
        bullets: [
          'Weak passwords permitted; no complexity requirements or breach-password blocking.',
          'Missing account lockout or CAPTCHA on login, allowing brute force or credential stuffing.',
          'Session tokens that don\'t expire, aren\'t invalidated on logout, or are predictable.',
          'Missing MFA for privileged accounts or sensitive transaction flows.',
        ],
      },
      {
        title: 'A08: Software and Data Integrity Failures',
        paragraphs: [
          'This category covers situations where code and infrastructure do not protect against integrity violations. The most high-profile scenario is supply chain attacks — where malicious code is introduced through a compromised third-party dependency, update mechanism, or CI/CD pipeline. The 2020 SolarWinds compromise is the landmark example: an attacker injected malicious code into a signed software update that was then distributed to thousands of organizations.',
          'At the application level, integrity failures include insecure deserialization (accepting serialized objects from untrusted sources), using auto-update features without signature verification, and trusting data from unverified CDN or npm packages. Applications that pull dependencies from public registries without pinning versions or verifying checksums are silently exposed to supply chain risks.',
        ],
        bullets: [
          'CI/CD pipelines without integrity checks on build artifacts or dependencies.',
          'Insecure deserialization: accepting serialized Java/PHP/.NET objects from clients.',
          'Auto-updates delivered without cryptographic signature verification.',
          'Critical logic executed from third-party CDN-hosted scripts without SRI hashes.',
        ],
      },
      {
        title: 'A09: Security Logging and Monitoring Failures',
        paragraphs: [
          'Applications that do not adequately log security-relevant events — authentication attempts, access control failures, input validation errors, privilege changes — leave defenders blind to attacks in progress. The average time to detect a breach remains measured in months; much of this gap is attributable to insufficient logging and monitoring.',
          'This category doesn\'t describe a directly exploitable vulnerability but represents a critical control gap. An application that generates no alerts for hundreds of failed login attempts, doesn\'t log which admin performed which action, or sends all logs to a syslog endpoint that nobody monitors is not providing the detection capability necessary to respond to incidents. During a pentest, reviewers should check what events are logged, whether logs are protected from tampering, and whether alerting is configured.',
        ],
        bullets: [
          'No logging of authentication failures, privilege changes, or access control violations.',
          'Log data stored locally on the application server with no offsite copy.',
          'Alerts not configured for anomalous patterns: bulk data access, repeated failures.',
          'Logs contain sensitive data (passwords, tokens) in cleartext.',
        ],
      },
      {
        title: 'A10: Server-Side Request Forgery (SSRF)',
        paragraphs: [
          'SSRF vulnerabilities occur when an application fetches a remote resource based on user-supplied input without adequate validation. An attacker who can control the URL used in a server-side HTTP request can cause the server to make requests to internal services, metadata endpoints (such as the AWS Instance Metadata Service at 169.254.169.254), or other hosts that are unreachable from the public internet.',
          'SSRF became prominent enough to earn a dedicated Top 10 slot due to the explosion of cloud deployments and microservice architectures where internal APIs, metadata services, and management endpoints are accessible from the application tier. A single SSRF vulnerability in a cloud-hosted application can expose IAM credentials, internal API tokens, or pivot to other internal services with no direct exposure.',
        ],
        bullets: [
          'File importers, URL-preview features, and webhook endpoints that fetch attacker-controlled URLs.',
          'Cloud metadata service access: AWS 169.254.169.254, GCP metadata.google.internal.',
          'Internal API or service discovery through blind SSRF.',
          'SSRF to RCE via internal services with unauthenticated administrative interfaces.',
        ],
      },
      {
        title: 'Using the OWASP Top 10 in penetration testing',
        paragraphs: [
          'The OWASP Top 10 provides a practical lens for prioritizing pentest coverage. Testing should address all ten categories as a minimum baseline, with depth calibrated to the application\'s threat model. A payment application requires deeper testing of authentication, cryptographic failures, and business logic than a static marketing site.',
          'PenDoc supports structured vulnerability management aligned to OWASP categories: findings can be tagged with OWASP classification, and generated reports automatically surface category coverage, distribution, and risk themes. This gives clients a clear view of how their assessment results map to the industry-standard risk taxonomy — and what remediation should be prioritized first.',
        ],
      },
    ],
    references: [
      { label: 'OWASP Top 10 Official', href: 'https://owasp.org/www-project-top-ten/' },
      { label: 'OWASP Testing Guide', href: 'https://owasp.org/www-project-web-security-testing-guide/' },
      { label: 'CWE Top 25', href: 'https://cwe.mitre.org/top25/' },
      { label: 'NVD CVE Database', href: 'https://nvd.nist.gov/' },
      { label: 'PenDoc Platform', href: '/' },
    ],
    hashtags: ['#OWASP', '#WebSecurity', '#Top10', '#ApplicationSecurity', '#PenetrationTesting', '#PenDoc'],
  },
  {
    slug: 'api-security-testing-guide',
    category: 'article',
    audience: 'Public',
    title: 'API Security Testing: How to Find and Report API Vulnerabilities',
    summary: 'A practical guide to API security testing — covering authentication weaknesses, authorization flaws, injection, mass assignment, rate limiting bypass, and how to structure findings for professional delivery.',
    description: 'Comprehensive guide to API security testing covering REST and GraphQL APIs, OWASP API Top 10 categories, common attack patterns, testing methodology, tooling, and professional vulnerability reporting.',
    keywords: 'API security testing, REST API vulnerabilities, GraphQL security, OWASP API Top 10, broken object level authorization, API penetration testing, authentication testing',
    updatedAt: '2026-08-31',
    readingTime: '14 min read',
    sections: [
      {
        title: 'Why API security testing matters',
        paragraphs: [
          'APIs have become the primary attack surface for web applications. Modern applications — mobile apps, single-page applications, third-party integrations — communicate almost exclusively through APIs. Yet security testing practices developed for traditional web applications don\'t always translate cleanly to API contexts, and many organizations test their web UI thoroughly while leaving their API endpoints largely unreviewed.',
          'The OWASP API Security Top 10 exists precisely because API vulnerabilities have distinct characteristics from web application vulnerabilities. Authorization logic is more granular, authentication mechanisms differ, and the lack of a rendered UI makes it harder for automated scanners to identify business logic flaws. API security testing requires deliberate methodology and manual validation.',
        ],
      },
      {
        title: 'Understanding your API attack surface',
        paragraphs: [
          'Before testing begins, map the full API attack surface. This means collecting all available endpoints, HTTP methods, authentication mechanisms, and parameter schemas. API documentation (OpenAPI/Swagger, Postman collections, GraphQL introspection) is the ideal starting point, but real-world applications often have undocumented endpoints — legacy versions, internal endpoints exposed to public networks, or shadow APIs created by development teams without security review.',
          'API discovery techniques include analyzing JavaScript bundles for hardcoded API paths, intercepting mobile app traffic, examining API gateway configurations, running endpoint fuzzing against common naming patterns, and querying GraphQL introspection endpoints. The goal is to understand the complete scope of what can be called before testing what can be abused.',
        ],
        bullets: [
          'Collect OpenAPI / Swagger specifications and import into Burp Suite or Postman.',
          'Enable GraphQL introspection queries to enumerate schema, types, mutations, and queries.',
          'Intercept mobile application traffic to discover undocumented endpoints.',
          'Fuzz endpoint paths using wordlists based on common REST naming conventions.',
          'Check for versioned APIs: /v1/, /v2/, /api/v1/ — older versions may lack security controls.',
        ],
      },
      {
        title: 'Broken Object Level Authorization (BOLA / IDOR)',
        paragraphs: [
          'Broken Object Level Authorization (BOLA) — equivalent to IDOR in traditional web applications — is consistently the most prevalent and impactful API vulnerability class. It occurs when an API endpoint accepts object identifiers from clients without verifying whether the requesting user is authorized to access or modify that specific object.',
          'Testing for BOLA requires creating multiple test accounts with different permission levels and observing whether one account can access another\'s resources by substituting identifiers. Modern APIs use UUIDs rather than sequential integers, but UUIDs don\'t prevent BOLA — they only make discovery harder. The authorization check must be explicit server-side: "does this user have permission to access resource X?" not just "does resource X exist?"',
        ],
        bullets: [
          'Substitute your user ID with another user\'s ID in path, query, and body parameters.',
          'Test access to resources across different accounts: orders, files, messages, settings.',
          'Try UUID enumeration using predictable seeding patterns or leaked values.',
          'Test verb tampering: a GET endpoint might be protected while DELETE is not.',
        ],
      },
      {
        title: 'Broken Authentication and Authorization',
        paragraphs: [
          'API authentication vulnerabilities are distinct from traditional web auth issues. APIs commonly use JWTs, API keys, OAuth tokens, or short-lived session tokens. Testing focuses on whether these mechanisms are implemented correctly: Are JWT signatures verified? Are tokens bound to specific clients or scopes? Are API keys rate-limited and revocable? Are expired tokens rejected?',
          'Function Level Authorization (BFLA) is authorization testing at the function/action level rather than the object level. Can a regular user call admin functions? Can a read-only API key trigger write operations? Can a customer-tier account reach endpoints intended for partner or internal use? These checks require mapping the permission model of the application and testing boundary cases manually, since automated scanners lack the context to reason about intended access levels.',
        ],
        bullets: [
          'Decode JWT headers — check for alg:none attack, RS256 to HS256 key confusion.',
          'Test long-lived API keys: Do they expire? Can they be scoped? Are they rotatable?',
          'Access admin-tier endpoints with non-admin tokens (BFLA).',
          'Test whether token revocation actually invalidates ongoing sessions.',
          'Verify OAuth scopes are enforced server-side, not just validated at issuance.',
        ],
      },
      {
        title: 'Injection and data validation in APIs',
        paragraphs: [
          'APIs are not immune to injection vulnerabilities — SQL injection, NoSQL injection, command injection, and SSTI are all present in API contexts. The difference is that API request bodies are structured (JSON, XML, form data) rather than URL query strings, which means payloads need to be adapted to the serialization format.',
          'Mass assignment (a.k.a. over-posting or auto-binding) is a common API-specific vulnerability where an API endpoint accepts all fields in a JSON body without filtering, allowing attackers to set properties that should not be user-controlled — such as a role field, isAdmin flag, or internal status. Testing requires comparing what fields the API accepts against what fields the documentation says are allowed.',
        ],
        bullets: [
          'Test JSON body parameters for SQL injection: {"search": "test\' OR 1=1--"}.',
          'Test NoSQL operators: {"username": {"$gt": ""}, "password": {"$gt": ""}}.',
          'Test mass assignment: add undocumented fields (role, isAdmin, verified) to request body.',
          'Test file upload endpoints for content-type bypass, path traversal in filenames.',
          'Test XML/SOAP endpoints for XXE injection.',
        ],
      },
      {
        title: 'Rate limiting, resource exhaustion, and DoS',
        paragraphs: [
          'API rate limiting protects against brute force, credential stuffing, and resource exhaustion attacks. Testing checks whether limits are enforced, whether they can be bypassed, and what happens when they are exceeded. Bypass techniques include rotating IP addresses, using different API keys, modifying request headers (X-Forwarded-For), or slightly varying request parameters to defeat simple key-based rate limiters.',
          'Beyond rate limiting, API security testing should evaluate resource exhaustion risks: Does a paginated API enforce maximum page sizes? Can you request an endpoint that triggers expensive database queries repeatedly? Does a GraphQL API allow deeply nested queries that cause exponential resource consumption? These aren\'t just DoS risks — they can affect all users of a shared service.',
        ],
        bullets: [
          'Test login endpoint rate limiting: allow 1000 attempts per minute?',
          'Test X-Forwarded-For bypass for IP-based rate limits.',
          'GraphQL: send deeply nested queries or queries requesting large datasets.',
          'Test bulk/batch operation endpoints for missing per-operation limits.',
          'Test file processing endpoints (PDF generation, image resize) for resource abuse.',
        ],
      },
      {
        title: 'GraphQL-specific security testing',
        paragraphs: [
          'GraphQL introduces a different security profile from REST APIs. The flexible query language gives clients significant control over what data they retrieve, which creates both access control challenges and the potential for introspection-based reconnaissance. If introspection is enabled in production, an attacker can enumerate the complete data model — all types, fields, mutations, and subscriptions — without any prior knowledge of the API.',
          'Testing should cover: introspection enabled in production, BOLA/BFLA in resolver logic (can you access another user\'s nested objects via your own query?), query batching for rate limit bypass (many operations in one HTTP request), aliasing to bypass field-level rate limits, and nested queries designed to trigger N+1 database queries.',
        ],
        bullets: [
          'Test introspection: {__schema { types { name fields { name } } }}.',
          'Test nested object access: does your user\'s Order include another user\'s PaymentMethod?',
          'Test mutation authorization: can you execute mutations on objects you don\'t own?',
          'Use query batching to perform hundreds of operations in one request.',
          'Test for information disclosure in error messages: field names, type errors, stack traces.',
        ],
      },
      {
        title: 'Tooling and workflow for API testing',
        paragraphs: [
          'Burp Suite Professional is the primary tool for API testing, with its ability to intercept, modify, and replay HTTP requests, perform active scans on API endpoints, and import OpenAPI specifications for systematic coverage. Postman and the REST Client VS Code extension are useful for building and maintaining test collections. For GraphQL-specific testing, tools like InQL (a Burp extension) and GraphQL Voyager provide schema visualization and batch-request capabilities.',
          'Automated scanners catch a portion of API vulnerabilities — injection, headers, TLS configuration — but authorization testing requires manual effort because only a human can reason about whether a specific access is legitimately permitted for a given account type. The most efficient workflow combines automated scanning for discovery and low-hanging fruit with targeted manual testing for authorization, business logic, and data exposure.',
        ],
        bullets: [
          'Burp Suite: intercept, replay, scan, and import OpenAPI specs for coverage tracking.',
          'Postman: build and share API test collections; use environment variables for auth tokens.',
          'InQL Burp extension: GraphQL introspection, query generation, and batch testing.',
          'jwt.io and jwt_tool: decode and manipulate JWT tokens.',
          'ffuf / feroxbuster: endpoint discovery and parameter fuzzing.',
        ],
      },
      {
        title: 'Documenting and reporting API findings',
        paragraphs: [
          'API vulnerability findings should follow the same documentation standard as traditional web findings: clear title, affected endpoint and HTTP method, reproduction steps with actual request/response, business impact statement, and specific remediation guidance. The key differentiator for API findings is that the reproduction steps must include exact HTTP requests — not just "navigate to the URL" but the complete request headers, body, and parameters required to reproduce the issue.',
          'Authorization findings (BOLA, BFLA) deserve particular attention in the report. The description should clearly explain what the expected behavior should have been — which user should have access, under what conditions — so the development team understands not just what went wrong but what the correct authorization model looks like. PenDoc\'s structured finding workflow makes it straightforward to capture this context and generate professional deliverables, including AI-assisted attack vector analysis and remediation strategy, without assembling reports from scratch.',
        ],
        callout: {
          title: 'Pentest tip',
          tone: 'info',
          content: 'For BOLA findings, always demonstrate the impact with real data: show that Account A was able to retrieve Account B\'s sensitive records. Theoretical BOLA without demonstrated evidence is often downgraded in severity during review. Concrete evidence of data exposure is non-negotiable for high and critical ratings.',
        },
      },
    ],
    references: [
      { label: 'OWASP API Security Top 10', href: 'https://owasp.org/www-project-api-security/' },
      { label: 'PortSwigger Web Security Academy — API Testing', href: 'https://portswigger.net/web-security/api-testing' },
      { label: 'HackTricks API Security', href: 'https://book.hacktricks.xyz/network-services-pentesting/pentesting-web/graphql' },
      { label: 'NVD CVE Database', href: 'https://nvd.nist.gov/' },
      { label: 'PenDoc Platform', href: '/' },
    ],
    hashtags: ['#APISecurity', '#APITesting', '#OWASP', '#REST', '#GraphQL', '#PenetrationTesting', '#PenDoc'],
  },
];

type KnowledgeBaseEnhancement = {
  highlights?: string[];
  heroImage?: KnowledgeBaseEntry['heroImage'];
  sections?: KnowledgeBaseSection[];
};

const knowledgeBaseEnhancements: Record<string, KnowledgeBaseEnhancement> = {
  'pentester-guide': {
    highlights: [
      'Use one project workspace to keep scope, raw evidence, normalized findings, generated artifacts, and final reports aligned.',
      'Treat imports and AI assistance as acceleration layers, then validate everything with analyst judgment before client delivery.',
      'Share only the artifacts a client needs, while retaining internal notes, QA context, and working material privately.',
      'Build a repeatable engagement lifecycle that covers execution, review, remediation follow-up, and auditability.',
    ],
    heroImage: {
      src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
      alt: 'Security team collaborating around laptops during a documentation workflow.',
      caption: 'High-performing assessment teams rely on consistent workflows, evidence quality, and clean delivery practices.',
      sourceLabel: 'Photo by Christina @ wocintechchat.com on Unsplash',
      sourceHref: 'https://unsplash.com/photos/people-sitting-beside-table-inside-room-Q80LYxv_Tbs',
    },
    sections: [
      {
        title: 'Recommended pentester operating flow',
        summary: 'A practical engagement sequence for using PenDoc as a delivery system instead of a passive repository.',
        paragraphs: [
          'The strongest teams use PenDoc as the operational backbone of an engagement. Instead of waiting until the end of a test to write up findings, they capture evidence continuously, normalize issues as they are validated, and review draft artifacts throughout the engagement.',
          'This operating flow reduces missed context, improves evidence quality, and makes the final reporting phase materially faster because the report reflects work that is already structured rather than reconstructed from scattered notes.',
        ],
        flow: {
          title: 'Assessment workflow in PenDoc',
          steps: [
            'Define scope, targets, delivery milestones, and stakeholder expectations before testing starts.',
            'Collect evidence and import scanner output into project folders so raw artifacts remain traceable.',
            'Promote validated issues into structured vulnerabilities with business impact, proof, and remediation.',
            'Generate attack vectors, recommendations, or remediation drafts to accelerate analyst review.',
            'Run internal QA and report analysis before sharing polished client-facing artifacts.',
            'Publish only approved findings and reports to the client portal, then track remediation and retests.',
          ],
        },
        callout: {
          title: 'Operational tip',
          tone: 'info',
          content: 'If a tester cannot answer where a statement came from, which asset it affected, and when it was validated, that data is not ready for delivery. Use folders, comments, and evidence references to keep every claim defensible.',
        },
      },
      {
        title: 'Schema of a delivery-ready project',
        paragraphs: [
          'A mature project structure separates raw evidence, validated findings, generated analysis, and client-approved deliverables. That separation helps the team move fast internally without overexposing unfinished material to the client portal.',
        ],
        schema: {
          title: 'Core PenDoc project components',
          items: [
            {
              name: 'Scope and metadata',
              description: 'Client, environment, assessment type, dates, and target identifiers that anchor the engagement and make reports consistent.',
            },
            {
              name: 'Evidence repository',
              description: 'Raw exports, screenshots, commands, notes, payloads, and supporting files that preserve traceability.',
            },
            {
              name: 'Normalized vulnerabilities',
              description: 'Structured findings with severity, affected assets, technical detail, remediation, status, and comments.',
            },
            {
              name: 'Generated artifacts',
              description: 'AI-assisted attack vectors, remediation strategies, QA outputs, diagrams, and report drafts reviewed by analysts.',
            },
            {
              name: 'Client-visible deliverables',
              description: 'Only the reports, findings, and supporting artifacts explicitly approved for external visibility.',
            },
            {
              name: 'Retest history',
              description: 'Versioned updates that show what changed, what was fixed, and what remains open after remediation.',
            },
          ],
        },
        image: {
          src: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1400&q=80',
          alt: 'Developer workstation with code and analytics on multiple monitors.',
          caption: 'Good delivery discipline starts with a project structure that remains readable under pressure.',
          sourceLabel: 'Photo by ThisisEngineering on Unsplash',
          sourceHref: 'https://unsplash.com/photos/person-using-computer-laptop-displaying-code-SvN3LnJvBqM',
        },
      },
    ],
  },
  'client-portal-guide': {
    highlights: [
      'The client portal gives stakeholders a governed view of findings, reports, and remediation context without exposing internal pentester notes.',
      'Use the portal to understand business impact, assign engineering actions, comment on issues, and coordinate retests from one place.',
      'A predictable portal experience shortens the gap between assessment delivery and measurable remediation progress.',
    ],
    heroImage: {
      src: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1400&q=80',
      alt: 'Team reviewing dashboards and project information together.',
      caption: 'A strong client portal turns a static report into an actionable remediation workflow.',
      sourceLabel: 'Photo by Austin Distel on Unsplash',
      sourceHref: 'https://unsplash.com/photos/wawEfYdpkag',
    },
    sections: [
      {
        title: 'Client workflow from intake to retest',
        paragraphs: [
          'For clients, the portal should feel like a guided remediation workspace rather than a file dump. Decision-makers need a quick picture of current risk, while engineers need enough technical detail to reproduce and fix issues efficiently.',
          'PenDoc supports that split by keeping summaries, findings, statuses, comments, and approved artifacts in one place so security, engineering, and leadership can all work from a shared source of truth.',
        ],
        flow: {
          title: 'Typical client-side remediation flow',
          steps: [
            'Review the assessment summary and understand the most important risk themes first.',
            'Open each finding, confirm affected assets, and translate remediation guidance into internal tickets or work items.',
            'Use comments to ask clarifying questions, request evidence, or coordinate timing with the testing team.',
            'Update remediation progress and prepare environments for retesting once fixes are ready.',
            'Validate closure after retesting and keep the portal as a history of security improvement over time.',
          ],
        },
        callout: {
          title: 'Recommended governance practice',
          tone: 'success',
          content: 'Assign a client-side owner for each high-severity finding. Ownership reduces ambiguity and speeds up decisions when multiple teams must collaborate on a fix.',
        },
      },
      {
        title: 'Schema of client-visible information',
        paragraphs: [
          'Only material approved for external visibility should appear in the client portal. That keeps the experience focused, reduces confusion, and avoids exposing unfinished analyst work.',
        ],
        schema: {
          title: 'What clients typically see',
          items: [
            { name: 'Executive summary', description: 'Overall scope, risk themes, priorities, and business-facing context for leadership stakeholders.' },
            { name: 'Approved findings', description: 'Validated vulnerabilities with impact, evidence, remediation guidance, and current status.' },
            { name: 'Shared artifacts', description: 'Only the attack vectors, diagrams, or supporting notes that the pentester explicitly marked as client-visible.' },
            { name: 'Comments and retest updates', description: 'Threaded collaboration that helps both parties track clarification requests and remediation progress.' },
            { name: 'Report history', description: 'Published versions and exports that document what was delivered and when.' },
          ],
        },
      },
    ],
  },
  'what-is-penetration-testing': {
    highlights: [
      'Penetration testing simulates real-world attacker behavior to validate whether security weaknesses can actually be chained into meaningful compromise.',
      'It is most valuable when it connects technical findings to business impact, scope assumptions, and remediation decisions.',
      'A mature pentest program treats testing as part of continuous risk management, not as a once-a-year checkbox.',
    ],
    heroImage: {
      src: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1400&q=80',
      alt: 'Cybersecurity analyst reviewing security data on laptop screens.',
      caption: 'Penetration testing is about proving real attack paths, not just collecting scanner output.',
      sourceLabel: 'Photo by Tima Miroshnichenko via Pexels mirror on Unsplash-style CDN',
      sourceHref: 'https://www.pexels.com/photo/person-using-laptop-computer-5380642/',
    },
    sections: [
      {
        title: 'How a real penetration test creates value',
        paragraphs: [
          'A penetration test creates value when it answers practical questions: can an attacker reach sensitive assets, can weak controls be bypassed, what impact would compromise have, and which fixes reduce the most risk first.',
          'That means the best pentests are contextual. They consider architecture, trust boundaries, identity models, internet exposure, and how weaknesses may combine. A list of isolated issues is rarely enough to show leadership what truly matters.',
        ],
        highlights: [
          'Validates exploitability rather than assuming every finding is equally dangerous.',
          'Reveals chained attack paths across applications, identities, hosts, and misconfigurations.',
          'Produces evidence and prioritization that engineering teams can actually use.',
          'Helps leadership understand residual risk after remediation decisions are made.',
        ],
      },
      {
        title: 'Penetration testing process schema',
        paragraphs: [
          'Although every engagement is different, most mature testing programs follow a recognizable progression from scope definition to remediation validation.',
        ],
        flow: {
          title: 'Typical pentest lifecycle',
          steps: [
            'Set scope, legal authorization, objectives, timelines, and success criteria.',
            'Perform reconnaissance and enumerate attack surface across targets in scope.',
            'Validate weaknesses with manual analysis and safe exploitation techniques.',
            'Document evidence, impact, and remediation guidance as findings are confirmed.',
            'Deliver reports, walkthroughs, and remediation support to stakeholders.',
            'Retest fixes and confirm whether risk has been reduced to an acceptable level.',
          ],
        },
        schema: {
          title: 'People involved in a successful engagement',
          items: [
            { name: 'Security testers', description: 'Execute technical testing, validate exploitability, and produce evidence-driven findings.' },
            { name: 'Technical owners', description: 'Provide environmental context and implement remediation across systems or applications.' },
            { name: 'Business stakeholders', description: 'Use the report to understand material risk, timelines, and decision points.' },
            { name: 'Program managers', description: 'Coordinate scheduling, scope approval, and tracking of remediation outcomes.' },
          ],
        },
      },
    ],
  },
  'how-to-do-penetration-testing': {
    highlights: [
      'A repeatable pentest methodology balances rigor, safety, depth, and evidence quality from start to finish.',
      'The strongest testers continuously document their rationale, not just their exploits.',
      'Methodology matters because a reproducible process scales better across clients, reviewers, and compliance needs.',
    ],
    heroImage: {
      src: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1400&q=80',
      alt: 'Laptop with dense code and terminal output used during a technical engagement.',
      caption: 'Good testing combines structured methodology with analyst creativity.',
      sourceLabel: 'Photo by Markus Spiske on Unsplash',
      sourceHref: 'https://unsplash.com/photos/iar-afB0QQw',
    },
    sections: [
      {
        title: 'Methodology that keeps the engagement under control',
        paragraphs: [
          'Effective penetration testing starts before the first command is executed. Scoping, constraints, credentials, communication plans, maintenance windows, and testing rules all determine whether the engagement will produce high-confidence results without avoidable operational friction.',
          'Once testing begins, the analyst should move deliberately: enumerate first, form hypotheses, validate weaknesses carefully, and capture reproducible proof immediately. Clean notes and disciplined evidence handling often matter as much as technical depth.',
        ],
        flow: {
          title: 'Execution model for a disciplined pentest',
          steps: [
            'Clarify scope boundaries, prohibited actions, credentials, escalation contacts, and reporting expectations.',
            'Build an attack surface inventory and map trust relationships between systems or users.',
            'Prioritize hypotheses based on exposure, business criticality, and likelihood of exploitable weakness.',
            'Validate exploitation paths safely, collecting screenshots, payloads, logs, and timestamps.',
            'Draft findings while context is fresh, then review severity, business impact, and remediation quality.',
          ],
        },
      },
      {
        title: 'Evidence collection schema',
        paragraphs: [
          'Evidence quality is often the difference between a report that gets actioned and one that gets challenged. Every finding should include enough proof to support severity and reproduce the issue safely.',
        ],
        schema: {
          title: 'Evidence checklist per finding',
          items: [
            { name: 'Target context', description: 'Affected host, application, role, endpoint, parameter, or system component.' },
            { name: 'Reproduction path', description: 'Commands, requests, inputs, credentials, or conditions required to recreate the issue.' },
            { name: 'Observed result', description: 'Actual output, screenshots, response data, or behavioral evidence that proves the weakness.' },
            { name: 'Impact statement', description: 'Why this matters to confidentiality, integrity, availability, or business operations.' },
            { name: 'Fix guidance', description: 'Specific corrective actions and compensating controls, not vague best-practice language.' },
          ],
        },
      },
    ],
  },
  'what-is-vulnerability-assessment': {
    highlights: [
      'A vulnerability assessment identifies, contextualizes, and prioritizes security weaknesses across a defined scope.',
      'It is broader and often more scalable than a pentest, but usually less focused on demonstrating real exploitation chains.',
      'Strong assessments still require human validation, environmental context, and remediation prioritization.',
    ],
    heroImage: {
      src: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1400&q=80',
      alt: 'Security and engineering screens used for assessment and triage work.',
      caption: 'Vulnerability assessment is about visibility and prioritization across a broad attack surface.',
      sourceLabel: 'Photo by Tran Mau Tri Tam on Unsplash',
      sourceHref: 'https://unsplash.com/photos/KvTn1eW2S40',
    },
    sections: [
      {
        title: 'When an assessment is the right choice',
        paragraphs: [
          'Organizations often choose vulnerability assessments when they need wide coverage, baseline visibility, or recurring measurement across infrastructure, applications, and cloud assets. Assessments are especially useful for identifying patterns of outdated software, exposed services, weak configurations, and missing security controls at scale.',
          'They are not a substitute for every security objective, but they are highly effective for building remediation backlogs, validating hygiene programs, and informing where deeper manual testing should be applied next.',
        ],
        callout: {
          title: 'Assessment does not mean low value',
          tone: 'info',
          content: 'Many high-impact breaches begin with basic exposure that a solid assessment program could have surfaced earlier. Breadth and consistency can be strategically more important than exploitation depth in some environments.',
        },
      },
      {
        title: 'Assessment program schema',
        paragraphs: [
          'A mature assessment program combines discovery, validation, prioritization, remediation tracking, and remeasurement. Without that full loop, the organization accumulates data but not risk reduction.',
        ],
        schema: {
          title: 'Components of a useful vulnerability assessment program',
          items: [
            { name: 'Asset inventory', description: 'Defined scope that includes servers, applications, cloud services, identities, and supporting infrastructure.' },
            { name: 'Detection coverage', description: 'Scanners, checks, and review methods that can surface software flaws, missing patches, and configuration weaknesses.' },
            { name: 'Analyst validation', description: 'Human review that removes false positives, adds context, and groups related issues.' },
            { name: 'Risk prioritization', description: 'Decision logic that considers exploitability, exposure, asset value, and compensating controls.' },
            { name: 'Remediation lifecycle', description: 'Ownership, deadlines, retesting, and reporting that prove weaknesses were addressed.' },
          ],
        },
      },
    ],
  },
  'what-is-vulnerability-scanning': {
    highlights: [
      'Vulnerability scanning automates detection of known weaknesses, missing patches, insecure configurations, and exposed services.',
      'Scanning is powerful for scale and frequency, but it does not replace human validation or adversarial reasoning.',
      'The best programs use scanning as a continuous signal feeding triage, testing, and remediation workflows.',
    ],
    heroImage: {
      src: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1400&q=80',
      alt: 'Terminal and dashboard view showing ongoing security monitoring activity.',
      caption: 'Scanning gives teams coverage and cadence, but signal still needs context.',
      sourceLabel: 'Photo by Campaign Creators on Unsplash',
      sourceHref: 'https://unsplash.com/photos/gMsnXqILjp4',
    },
    sections: [
      {
        title: 'Where scanning fits in a security program',
        paragraphs: [
          'Scanning is the operational heartbeat of many security programs because it can be scheduled, repeated, and measured over time. It is excellent for finding known issues at scale and ensuring that patching and hardening efforts do not drift silently.',
          'However, scanning should be interpreted as signal generation. Results must be validated, deduplicated, and prioritized before they become meaningful work for engineering teams or evidence for leadership reporting.',
        ],
        flow: {
          title: 'From scan output to action',
          steps: [
            'Run authenticated or unauthenticated scans against an accurate and current asset inventory.',
            'Filter false positives, confirm exposure, and group related findings into meaningful remediation themes.',
            'Prioritize items based on exploitability, business context, and asset criticality.',
            'Track remediation progress and confirm whether fixes actually removed the underlying condition.',
          ],
        },
      },
      {
        title: 'Scanning limitations schema',
        paragraphs: [
          'Understanding scanner limitations prevents teams from over-trusting automated output or underestimating risk that a scanner cannot see clearly.',
        ],
        schema: {
          title: 'What scanners often miss or misstate',
          items: [
            { name: 'Business context', description: 'Scanners rarely know whether an exposed issue is on a crown-jewel system or an isolated low-value asset.' },
            { name: 'Attack chaining', description: 'Individual low-severity weaknesses may become serious when combined, which automation may not model well.' },
            { name: 'Custom logic flaws', description: 'Authorization issues, workflow abuse, and application-specific business flaws usually need manual testing.' },
            { name: 'Environmental nuance', description: 'Compensating controls, segmentation, and identity boundaries can make real risk higher or lower than scanner severity implies.' },
          ],
        },
      },
    ],
  },
  'vulnerability-vs-security-misconfiguration': {
    highlights: [
      'A vulnerability usually refers to a flaw that can be exploited; a security misconfiguration is a deployment or hardening weakness that creates avoidable exposure.',
      'The distinction matters because root cause, remediation owner, and recurrence pattern are often different.',
      'Many incidents involve both: a vulnerable component plus a misconfigured environment that makes exploitation easier.',
    ],
    heroImage: {
      src: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80',
      alt: 'Circuit board close-up representing underlying system weaknesses and configuration states.',
      caption: 'Security risk often emerges from both flawed software and weak implementation choices.',
      sourceLabel: 'Photo by Kevin Ku on Unsplash',
      sourceHref: 'https://unsplash.com/photos/w7ZyuGYNpRQ',
    },
    sections: [
      {
        title: 'Why the distinction matters in practice',
        paragraphs: [
          'When teams confuse vulnerabilities with misconfigurations, remediation quality tends to suffer. A code flaw may need a vendor patch, library upgrade, or secure coding change. A misconfiguration may need hardening, access restriction, network segmentation, or safer defaults in infrastructure-as-code.',
          'Separating these categories also helps trend analysis. If a program repeatedly suffers from misconfigurations, the root issue may be operational discipline or weak deployment guardrails rather than software defect density.',
        ],
        schema: {
          title: 'Side-by-side comparison',
          items: [
            { name: 'Vulnerability', description: 'A flaw in software, logic, or implementation that can be exploited when reachable under the right conditions.' },
            { name: 'Misconfiguration', description: 'An unsafe setting, default, permission, or deployment choice that exposes systems unnecessarily.' },
            { name: 'Typical owner', description: 'Vulnerabilities often involve development or vendors; misconfigurations often involve operations, cloud, DevOps, or platform teams.' },
            { name: 'Typical fix', description: 'Patching, code changes, control redesign, hardening, least privilege, or secure deployment changes.' },
          ],
        },
      },
      {
        title: 'Combined attack-path examples',
        paragraphs: [
          'Real incidents often combine both categories. For example, an exploitable service vulnerability may remain internet-accessible because a security group is too permissive. Or a minor application flaw may become serious because administrative functions are exposed without proper network restrictions.',
        ],
        highlights: [
          'Outdated software plus unrestricted exposure',
          'Weak IAM role design plus vulnerable automation component',
          'Default credentials plus missing segmentation',
          'Business logic flaw plus over-privileged user roles',
        ],
      },
    ],
  },
  'penetration-testing-standards-and-guidelines': {
    highlights: [
      'Standards do not replace skill, but they create consistency, defensibility, and common expectations for delivery quality.',
      'Mature teams map their methodology to recognized guidance while still adapting depth to the client environment.',
      'The best use of standards is operational: scope planning, evidence handling, quality review, and reporting consistency.',
    ],
    heroImage: {
      src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80',
      alt: 'Professional team discussing documents and frameworks at a conference table.',
      caption: 'Standards help teams deliver consistent results across engagements and reviewers.',
      sourceLabel: 'Photo by Scott Graham on Unsplash',
      sourceHref: 'https://unsplash.com/photos/5fNmWej4tAA',
    },
    sections: [
      {
        title: 'Using standards without becoming rigid',
        paragraphs: [
          'A good methodology borrows from PTES, OWASP, NIST, OSSTMM, and sector-specific guidance where appropriate. The goal is not to cite frameworks for appearance, but to ensure that scoping, execution, evidence handling, and reporting follow a defensible pattern that clients can trust.',
          'Teams should document which standards influenced the engagement and where customizations were made for cloud-native targets, modern identity systems, APIs, or internal network constraints.',
        ],
        flow: {
          title: 'How to operationalize a standard',
          steps: [
            'Select the framework or guidance that best aligns with the engagement type and regulatory expectations.',
            'Map its phases to your internal workflow, templates, and evidence collection standards.',
            'Train analysts and reviewers so the methodology shows up in daily execution, not just in statements of work.',
            'Use QA checks to confirm that final reports reflect the chosen standard consistently.',
          ],
        },
      },
      {
        title: 'Standards reference schema',
        paragraphs: [
          'Different frameworks serve different purposes. Understanding their strengths helps teams pick the right reference point for each engagement.',
        ],
        schema: {
          title: 'Common guidance and where it helps most',
          items: [
            { name: 'PTES', description: 'Useful for a practical end-to-end testing lifecycle, from pre-engagement to reporting.' },
            { name: 'OWASP Testing Guide', description: 'Strong reference for application and web testing scenarios, including modern web risks.' },
            { name: 'NIST SP 800-115', description: 'Helpful for formal assessment planning and alignment with broader enterprise governance.' },
            { name: 'OSSTMM', description: 'Useful for organizations that want a deeply structured operational security testing framework.' },
          ],
        },
      },
    ],
  },
  'pentester-tools-and-scanners-free-and-paid': {
    highlights: [
      'No single tool stack covers every engagement; effectiveness comes from combining scanners, proxies, exploitation utilities, and disciplined analyst workflow.',
      'Tool selection should follow scope, environment, testing depth, budget, and reporting needs.',
      'Paid tools can improve scale and efficiency, but free tools remain essential in mature testing tradecraft.',
    ],
    heroImage: {
      src: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80',
      alt: 'Technical workspace with code editor and terminal windows used by a tester.',
      caption: 'A strong toolkit mixes automation, manual validation, and reliable documentation.',
      sourceLabel: 'Photo by Clem Onojeghuo on Unsplash',
      sourceHref: 'https://unsplash.com/photos/LgQMxj_DhKc',
    },
    sections: [
      {
        title: 'How to build a practical tool stack',
        paragraphs: [
          'Tooling should support the way the team actually works. That usually means combining broad discovery tools, specialized validation tools, workflow accelerators, and a documentation system that can preserve evidence and reasoning from the engagement.',
          'Teams often overspend on detection breadth but underinvest in workflow quality. A smaller, well-understood tool stack paired with disciplined documentation usually outperforms a larger stack that produces noisy output nobody curates properly.',
        ],
        schema: {
          title: 'Tool categories that matter most',
          items: [
            { name: 'Discovery and scanning', description: 'Examples include Nmap, Nessus, OpenVAS, and web scanners used to map exposure quickly.' },
            { name: 'Application testing', description: 'Proxying, replay, fuzzing, and manual validation tools such as Burp Suite and related extensions.' },
            { name: 'Exploitation and verification', description: 'Purpose-built utilities, scripts, or frameworks used to confirm impact safely.' },
            { name: 'Cloud and identity assessment', description: 'Tools that enumerate permissions, cloud posture, and identity attack paths in modern environments.' },
            { name: 'Documentation and delivery', description: 'Platforms like PenDoc that normalize evidence, findings, remediation, and client deliverables.' },
          ],
        },
      },
      {
        title: 'Tool evaluation flow',
        paragraphs: [
          'Before standardizing on a tool, evaluate signal quality, export options, analyst adoption, and how well it fits into the rest of the engagement workflow.',
        ],
        flow: {
          title: 'Questions to ask before adopting a tool',
          steps: [
            'Does it improve coverage or save significant analyst time?',
            'Can the team validate and explain its output confidently?',
            'Does it export data cleanly for evidence retention and reporting?',
            'Will it scale operationally across different engagement types and reviewers?',
          ],
        },
      },
    ],
  },
  'how-to-write-penetration-testing-report': {
    highlights: [
      'A strong report is structured for multiple audiences at once: leadership, security teams, and engineers responsible for fixes.',
      'The best reports reduce ambiguity by making scope, severity rationale, evidence, and remediation crisp and consistent.',
      'Report quality improves when teams write during the engagement instead of reconstructing details at the end.',
    ],
    heroImage: {
      src: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=80',
      alt: 'Notebook and laptop used for writing and refining professional deliverables.',
      caption: 'Reporting quality is where technical work becomes client value.',
      sourceLabel: 'Photo by Green Chameleon on Unsplash',
      sourceHref: 'https://unsplash.com/photos/s9CC2SKySJM',
    },
    sections: [
      {
        title: 'Report narrative that drives action',
        paragraphs: [
          'The most effective reports are not simply technically correct; they are operationally useful. They tell a coherent story about the environment tested, the risk discovered, the evidence supporting each conclusion, and the remediation decisions that should happen next.',
          'This means good writing is part of security quality. Analysts should aim for direct language, stable terminology, and findings that are specific enough for engineers to act on without requiring a follow-up workshop to decode the intent.',
        ],
        flow: {
          title: 'Drafting sequence for a strong report',
          steps: [
            'Start with scope, methodology, and business context so readers understand the limits of the engagement.',
            'Group findings logically and maintain consistent severity, naming, and risk language throughout the report.',
            'For each issue, show what was observed, why it matters, and how to fix it in practical terms.',
            'Finish with risk themes, remediation priorities, and any assumptions or constraints that affected testing.',
          ],
        },
      },
      {
        title: 'Report section schema',
        paragraphs: [
          'A reusable report structure improves quality control and helps clients compare outcomes across assessments or over time.',
        ],
        schema: {
          title: 'Sections every pentest report should handle well',
          items: [
            { name: 'Executive summary', description: 'High-level risk narrative, major themes, and priority decisions for leadership.' },
            { name: 'Scope and methodology', description: 'Targets, timelines, constraints, and the testing approach used during the engagement.' },
            { name: 'Finding details', description: 'Evidence-rich issues with reproducible steps, impact, and tailored remediation.' },
            { name: 'Remediation priorities', description: 'A practical order of operations that helps teams reduce the most risk first.' },
            { name: 'Appendices or evidence references', description: 'Supplementary proof, screenshots, raw outputs, and supporting technical detail when needed.' },
          ],
        },
        callout: {
          title: 'Editorial quality check',
          tone: 'warning',
          content: 'Before delivery, verify that every severity rating is defensible, every remediation recommendation is specific, and every screenshot or payload still matches the final text. These small consistency checks have outsized impact on client trust.',
        },
      },
    ],
  },
};

function enrichKnowledgeBaseEntry(entry: KnowledgeBaseEntry): KnowledgeBaseEntry {
  const enhancement = knowledgeBaseEnhancements[entry.slug];

  if (!enhancement) {
    return entry;
  }

  return {
    ...entry,
    highlights: enhancement.highlights ?? entry.highlights,
    heroImage: enhancement.heroImage ?? entry.heroImage,
    sections: [...entry.sections, ...(enhancement.sections ?? [])],
  };
}

export const knowledgeBaseGuides: KnowledgeBaseEntry[] = baseKnowledgeBaseGuides.map(enrichKnowledgeBaseEntry);

export const knowledgeBaseArticles: KnowledgeBaseEntry[] = baseKnowledgeBaseArticles.map(enrichKnowledgeBaseEntry);

export const knowledgeBaseEntries: KnowledgeBaseEntry[] = [...knowledgeBaseGuides, ...knowledgeBaseArticles];

export function getKnowledgeBaseEntry(slug: string) {
  return knowledgeBaseEntries.find((entry) => entry.slug === slug);
}
