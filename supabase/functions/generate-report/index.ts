import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

interface Vulnerability {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  likelihood: string;
  owasp_category: string | null;
  owasp_item: string | null;
  cvss_score: number | null;
  tool: string | null;
  execution_command: string | null;
  detailed_description: string | null;
  remediation: string | null;
  affected_assets: string[] | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  environment: string | null;
  model_external: string | null;
  model_internal: string | null;
  rules_of_engagement: string | null;
  scope: any;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  client_id?: string | null;
  client?: {
    branding?: {
      company_name?: string;
      company_logo_url?: string;
      target_display_name?: string;
      target_logo_url?: string;
      company_website?: string;
      contact_email?: string;
      contact_phone?: string;
      assessor_company_name?: string;
      assessor_company_logo_url?: string;
      assessor_company_website?: string;
      assessor_contact_email?: string;
      assessor_contact_phone?: string;
      assessor_tagline?: string;
      cover_badge_text?: string;
      footer_company_text?: string;
      report_title?: string;
      report_subtitle?: string;
      cover_image_url?: string;
      watermark_text?: string;
      primary_color?: string;
      secondary_color?: string;
      accent_color?: string;
      font_family?: string;
      footer_text?: string;
      confidentiality_text?: string;
      show_confidential?: boolean;
      show_footer_branding?: boolean;
    };
    company_name?: string | null;
    company_logo_url?: string | null;
    company_website?: string | null;
  };
  branding?: {
    company_name?: string;
    company_logo_url?: string;
    target_display_name?: string;
    target_logo_url?: string;
    company_website?: string;
    contact_email?: string;
    contact_phone?: string;
    assessor_company_name?: string;
    assessor_company_logo_url?: string;
    assessor_company_website?: string;
    assessor_contact_email?: string;
    assessor_contact_phone?: string;
    assessor_tagline?: string;
    cover_badge_text?: string;
    footer_company_text?: string;
    report_title?: string;
    report_subtitle?: string;
    cover_image_url?: string;
    watermark_text?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    font_family?: string;
    footer_text?: string;
    confidentiality_text?: string;
    show_confidential?: boolean;
    show_footer_branding?: boolean;
  };
}

type Language = 'en' | 'ru';

// Translations for report content
const translations = {
  en: {
    // Cover page
    penetrationTestReport: 'PENETRATION TEST REPORT',
    securityAssessmentFindings: 'Security Assessment Findings',
    engagementSnapshot: 'Engagement Snapshot',
    within24h: 'Within 24 hours',
    within7d: 'Within 7 days',
    within30d: 'Within 30 days',
    within60d: 'Within 30–60 days',
    plannedCycle: 'Planned maintenance cycle',
    assessmentPeriod: 'Assessment Period',
    environment: 'Environment',
    confidentialNotice: 'CONFIDENTIAL - FOR AUTHORIZED PERSONNEL ONLY',
    
    // Table of contents
    tableOfContents: 'Table of Contents',
    projectOverview: 'Project Overview',
    scopeOfWork: 'Scope of Work',
    executiveSummary: 'Executive Summary',
    severityLikelihoodDefinitions: 'Severity & Likelihood Definitions',
    detailedFindings: 'Detailed Findings',
    testingMethodology: 'Testing Methodology',
    remediationPriority: 'Remediation Priority',
    toolsUsed: 'Tools Used',
    
    // Project Overview
    projectOverviewDescription: 'This report presents the findings of a penetration testing engagement conducted to identify security vulnerabilities and assess the overall security posture of the target environment.',
    parameter: 'Parameter',
    details: 'Details',
    projectName: 'Project Name',
    environmentType: 'Environment Type',
    externalTestingModel: 'External Testing Model',
    internalTestingModel: 'Internal Testing Model',
    totalVulnerabilities: 'Total Vulnerabilities',
    rulesOfEngagement: 'Rules of Engagement',
    
    // Scope
    scopeDescription: 'The following assets were included in the scope of this penetration testing engagement:',
    fqdns: 'FQDNs',
    urls: 'URLs',
    ipAddresses: 'IP Addresses',
    mobileApplications: 'Mobile Applications',
    emailsSocialEngineering: 'Email Addresses (Social Engineering)',
    phoneSocialEngineering: 'Phone Numbers (Social Engineering)',
    noScopeItems: 'No specific scope items were defined for this project.',
    
    // Executive Summary
    executiveSummaryDescription: 'This executive summary provides a high-level overview of the security assessment findings. During the engagement, a total of',
    vulnerabilitiesIdentified: 'vulnerabilities were identified across the target environment.',
    vulnerabilityStatistics: 'Vulnerability Statistics',
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    informational: 'Informational',
    total: 'Total',
    severityDistribution: 'Severity Distribution',
    vulnerabilitiesBySeverity: 'Vulnerabilities by Severity',
    info: 'Info',
    vulnerabilitySummary: 'Vulnerability Summary',
    ref: 'Ref',
    title: 'Title',
    severity: 'Severity',
    owasp: 'OWASP',
    cvss: 'CVSS',
    owaspComplianceChecklists: 'OWASP Compliance Checklists',
    assessmentStandards: 'Assessment Standards & Scoring',
    assessmentProvider: 'Assessment Provider',
    assessedOrganization: 'Assessed Organization',
    engagementModels: 'Engagement Model',
    rulesOfEngagementSummary: 'Rules of Engagement',
    executiveRiskStatement: 'The assessment identified control gaps that can be chained into realistic attack paths. Priority remediation should focus first on externally reachable and high-confidence weaknesses that enable initial access, privilege escalation, or sensitive data exposure.',
    reportGeneratedOn: 'Report generated on',
    executedBy: 'Assessment executed by',
    remediationPriorityOverview: 'Remediation Priority Overview',
    recommendedWindow: 'Recommended Window',
    priorityRationale: 'Priority Rationale',
    prioritizationMethod: 'Prioritization Method',
    prioritizedBy: 'Findings are prioritized using severity, exploit likelihood, and CVSS context to create an execution-focused remediation queue.',
    owaspTop10Web: 'OWASP Top 10 - Web Application Security',
    owaspApiTop10: 'OWASP API Security Top 10',
    owaspMobileTop10: 'OWASP Mobile Top 10',
    owaspLlmTop10: 'OWASP Top 10 for LLM/AI Applications',
    id: 'ID',
    category: 'Category',
    status: 'Status',
    count: 'Count',
    found: 'Found',
    notFound: 'Not Found',
    
    // Severity & Likelihood Definitions
    severityLevels: 'Severity Levels',
    level: 'Level',
    cvssRange: 'CVSS Range',
    description: 'Description',
    criticalDescription: 'Vulnerabilities that pose an immediate and severe risk to the confidentiality, integrity, or availability of systems. Exploitation is trivial and could result in complete system compromise, significant data breach, or major business impact.',
    highDescription: 'Vulnerabilities that could allow an attacker to gain significant access or cause substantial damage. These issues require immediate attention and should be addressed as a high priority.',
    mediumDescription: 'Vulnerabilities that could be exploited under certain conditions or provide attackers with useful information for further attacks. These should be remediated in a reasonable timeframe.',
    lowDescription: 'Minor vulnerabilities that pose limited risk on their own but may contribute to a larger attack chain. Remediation should be considered as part of regular security maintenance.',
    infoDescription: 'Informational findings that do not pose a direct security risk but may indicate configuration issues, deviation from best practices, or areas for security improvement.',
    likelihoodLevels: 'Likelihood Levels',
    highLikelihoodDescription: 'The vulnerability is easily exploitable with publicly available tools and techniques. An attacker with basic skills could successfully exploit this issue. The attack surface is broad and exploitation requires minimal prerequisites.',
    mediumLikelihoodDescription: 'Exploitation requires some technical skill, specific conditions, or limited access. The attack may require chaining with other vulnerabilities or social engineering. Publicly available exploits may exist but require modification.',
    lowLikelihoodDescription: 'Exploitation is difficult and requires advanced skills, significant prerequisites, or specific environmental conditions. The attack surface is limited and successful exploitation may require extensive resources or insider access.',
    
    // Detailed Findings
    detailedFindingsDescription: 'This section provides comprehensive details for each vulnerability identified during the assessment.',
    likelihood: 'Likelihood',
    cvssScore: 'CVSS Score',
    owaspCategory: 'OWASP Category',
    owaspItem: 'OWASP Item',
    affectedTargets: 'Affected Target(s)',
    technicalDetails: 'Technical Details',
    proofOfConcept: 'Proof of Concept',
    toolUsed: 'Tool Used',
    remediation: 'Remediation',
    na: 'N/A',
    
    // Testing Methodology
    testingMethodologyDescription: 'The penetration testing engagement was conducted following industry-standard methodologies and best practices. The assessment approach was tailored based on the project scope and requirements.',
    assessmentApproach: 'Assessment Approach',
    configuration: 'Configuration',
    testingPhases: 'Testing Phases',
    phase1Title: 'Reconnaissance & Information Gathering',
    phase1Description: 'Collection of publicly available information about the target, including domain enumeration, network mapping, and technology fingerprinting.',
    phase2Title: 'Vulnerability Assessment',
    phase2Description: 'Systematic identification of potential security weaknesses using automated scanning tools and manual testing techniques.',
    phase3Title: 'Exploitation & Validation',
    phase3Description: 'Safe exploitation of identified vulnerabilities to confirm their existence and assess actual impact. All testing was conducted within the defined scope and rules of engagement.',
    phase4Title: 'Post-Exploitation Analysis',
    phase4Description: 'Assessment of potential lateral movement, privilege escalation, and data access opportunities following initial compromise.',
    phase5Title: 'Reporting & Documentation',
    phase5Description: 'Comprehensive documentation of all findings, including technical details, evidence, and actionable remediation guidance.',
    
    // Remediation Priority
    remediationPriorityDescription: 'The following table presents vulnerabilities prioritized by severity and likelihood to assist with remediation planning.',
    priority: 'Priority',
    immediate: 'Immediate',
    
    // Tools Used
    toolsUsedDescription: 'The following tools were utilized during the penetration testing engagement:',
    toolName: 'Tool Name',
    usedIn: 'Used In',
    finding: 'finding',
    findings: 'findings',
    noToolsRecorded: 'No tools were recorded for this engagement.',
    
    // Footer
    confidential: 'CONFIDENTIAL',
    footerNotice: 'This report is intended solely for the use of the organization that commissioned the assessment.',
    generatedBy: 'Generated by PenDoc on',
    
    // Models and environments
    blackBox: 'Black Box',
    grayBox: 'Gray Box',
    whiteBox: 'White Box',
    external: 'External',
    internal: 'Internal',
    both: 'External & Internal',
    notSpecified: 'Not specified',
  },
  ru: {
    // Cover page
    penetrationTestReport: 'ОТЧЁТ О ТЕСТИРОВАНИИ НА ПРОНИКНОВЕНИЕ',
    securityAssessmentFindings: 'Результаты оценки безопасности',
    engagementSnapshot: 'Сводка тестирования',
    within24h: 'В течение 24 часов',
    within7d: 'В течение 7 дней',
    within30d: 'В течение 30 дней',
    within60d: 'В течение 30–60 дней',
    plannedCycle: 'В рамках планового цикла',
    assessmentPeriod: 'Период оценки',
    environment: 'Среда',
    confidentialNotice: 'КОНФИДЕНЦИАЛЬНО - ТОЛЬКО ДЛЯ УПОЛНОМОЧЕННОГО ПЕРСОНАЛА',
    
    // Table of contents
    tableOfContents: 'Содержание',
    projectOverview: 'Обзор проекта',
    scopeOfWork: 'Область работ',
    executiveSummary: 'Краткое резюме',
    severityLikelihoodDefinitions: 'Определения критичности и вероятности',
    detailedFindings: 'Детальные результаты',
    testingMethodology: 'Методология тестирования',
    remediationPriority: 'Приоритет устранения',
    toolsUsed: 'Использованные инструменты',
    
    // Project Overview
    projectOverviewDescription: 'Данный отчёт представляет результаты тестирования на проникновение, проведённого для выявления уязвимостей безопасности и оценки общего состояния безопасности целевой среды.',
    parameter: 'Параметр',
    details: 'Детали',
    projectName: 'Название проекта',
    environmentType: 'Тип среды',
    externalTestingModel: 'Модель внешнего тестирования',
    internalTestingModel: 'Модель внутреннего тестирования',
    totalVulnerabilities: 'Всего уязвимостей',
    rulesOfEngagement: 'Правила взаимодействия',
    
    // Scope
    scopeDescription: 'Следующие активы были включены в область данного тестирования на проникновение:',
    fqdns: 'FQDN',
    urls: 'URL-адреса',
    ipAddresses: 'IP-адреса',
    mobileApplications: 'Мобильные приложения',
    emailsSocialEngineering: 'Email-адреса (Социальная инженерия)',
    phoneSocialEngineering: 'Телефонные номера (Социальная инженерия)',
    noScopeItems: 'Для данного проекта не определены конкретные элементы области.',
    
    // Executive Summary
    executiveSummaryDescription: 'Данное краткое резюме предоставляет общий обзор результатов оценки безопасности. В ходе работы было выявлено',
    vulnerabilitiesIdentified: 'уязвимостей в целевой среде.',
    vulnerabilityStatistics: 'Статистика уязвимостей',
    critical: 'Критический',
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий',
    informational: 'Информационный',
    total: 'Всего',
    severityDistribution: 'Распределение по критичности',
    vulnerabilitiesBySeverity: 'Уязвимости по критичности',
    info: 'Инфо',
    vulnerabilitySummary: 'Сводка уязвимостей',
    ref: 'Ссылка',
    title: 'Название',
    severity: 'Критичность',
    owasp: 'OWASP',
    cvss: 'CVSS',
    owaspComplianceChecklists: 'Контрольные списки соответствия OWASP',
    assessmentStandards: 'Стандарты и система оценки',
    assessmentProvider: 'Исполнитель оценки',
    assessedOrganization: 'Проверяемая организация',
    engagementModels: 'Модель тестирования',
    rulesOfEngagementSummary: 'Правила взаимодействия',
    executiveRiskStatement: 'В ходе оценки были выявлены пробелы в контролях, которые могут быть объединены в реалистичные цепочки атак. Приоритетное устранение следует сосредоточить на внешне доступных и высокодостоверных слабостях, обеспечивающих первоначальный доступ, повышение привилегий или раскрытие чувствительных данных.',
    reportGeneratedOn: 'Отчёт сформирован',
    executedBy: 'Оценка выполнена компанией',
    remediationPriorityOverview: 'Обзор приоритетов устранения',
    recommendedWindow: 'Рекомендуемое окно',
    priorityRationale: 'Обоснование приоритета',
    prioritizationMethod: 'Метод приоритизации',
    prioritizedBy: 'Находки приоритизированы по критичности, вероятности эксплуатации и контексту CVSS для формирования практической очереди устранения.',
    owaspTop10Web: 'OWASP Top 10 - Безопасность веб-приложений',
    owaspApiTop10: 'OWASP API Security Top 10',
    owaspMobileTop10: 'OWASP Mobile Top 10',
    owaspLlmTop10: 'OWASP Top 10 для LLM/AI приложений',
    id: 'ID',
    category: 'Категория',
    status: 'Статус',
    count: 'Количество',
    found: 'Найдено',
    notFound: 'Не найдено',
    
    // Severity & Likelihood Definitions
    severityLevels: 'Уровни критичности',
    level: 'Уровень',
    cvssRange: 'Диапазон CVSS',
    description: 'Описание',
    criticalDescription: 'Уязвимости, представляющие непосредственную и серьёзную угрозу конфиденциальности, целостности или доступности систем. Эксплуатация тривиальна и может привести к полной компрометации системы, значительной утечке данных или серьёзному влиянию на бизнес.',
    highDescription: 'Уязвимости, которые могут позволить злоумышленнику получить значительный доступ или нанести существенный ущерб. Эти проблемы требуют немедленного внимания и должны быть устранены в первоочередном порядке.',
    mediumDescription: 'Уязвимости, которые могут быть использованы при определённых условиях или предоставить злоумышленникам полезную информацию для дальнейших атак. Их следует устранить в разумные сроки.',
    lowDescription: 'Незначительные уязвимости, представляющие ограниченный риск сами по себе, но могущие способствовать более крупной цепочке атак. Устранение следует рассматривать как часть регулярного обслуживания безопасности.',
    infoDescription: 'Информационные находки, не представляющие прямой угрозы безопасности, но могущие указывать на проблемы конфигурации, отклонение от лучших практик или области для улучшения безопасности.',
    likelihoodLevels: 'Уровни вероятности',
    highLikelihoodDescription: 'Уязвимость легко эксплуатируется с помощью общедоступных инструментов и техник. Злоумышленник с базовыми навыками может успешно использовать эту проблему. Поверхность атаки широка, а эксплуатация требует минимальных предварительных условий.',
    mediumLikelihoodDescription: 'Эксплуатация требует некоторых технических навыков, определённых условий или ограниченного доступа. Атака может потребовать объединения с другими уязвимостями или социальной инженерии. Публично доступные эксплойты могут существовать, но требуют модификации.',
    lowLikelihoodDescription: 'Эксплуатация сложна и требует продвинутых навыков, значительных предварительных условий или специфических условий среды. Поверхность атаки ограничена, и успешная эксплуатация может потребовать значительных ресурсов или инсайдерского доступа.',
    
    // Detailed Findings
    detailedFindingsDescription: 'Данный раздел содержит подробную информацию о каждой уязвимости, выявленной в ходе оценки.',
    likelihood: 'Вероятность',
    cvssScore: 'Оценка CVSS',
    owaspCategory: 'Категория OWASP',
    owaspItem: 'Пункт OWASP',
    affectedTargets: 'Затронутые цели',
    technicalDetails: 'Технические детали',
    proofOfConcept: 'Доказательство концепции',
    toolUsed: 'Использованный инструмент',
    remediation: 'Рекомендации по устранению',
    na: 'Н/Д',
    
    // Testing Methodology
    testingMethodologyDescription: 'Тестирование на проникновение было проведено в соответствии с отраслевыми стандартами и лучшими практиками. Подход к оценке был адаптирован с учётом области и требований проекта.',
    assessmentApproach: 'Подход к оценке',
    configuration: 'Конфигурация',
    testingPhases: 'Этапы тестирования',
    phase1Title: 'Разведка и сбор информации',
    phase1Description: 'Сбор публично доступной информации о цели, включая перечисление доменов, картирование сети и идентификацию технологий.',
    phase2Title: 'Оценка уязвимостей',
    phase2Description: 'Систематическая идентификация потенциальных уязвимостей безопасности с использованием автоматизированных инструментов сканирования и ручных методов тестирования.',
    phase3Title: 'Эксплуатация и валидация',
    phase3Description: 'Безопасная эксплуатация выявленных уязвимостей для подтверждения их существования и оценки фактического воздействия. Всё тестирование проводилось в рамках определённой области и правил взаимодействия.',
    phase4Title: 'Пост-эксплуатационный анализ',
    phase4Description: 'Оценка возможностей латерального перемещения, повышения привилегий и доступа к данным после первоначальной компрометации.',
    phase5Title: 'Отчётность и документирование',
    phase5Description: 'Комплексное документирование всех находок, включая технические детали, доказательства и практические рекомендации по устранению.',
    
    // Remediation Priority
    remediationPriorityDescription: 'Следующая таблица представляет уязвимости, приоритизированные по критичности и вероятности, для помощи в планировании устранения.',
    priority: 'Приоритет',
    immediate: 'Немедленно',
    
    // Tools Used
    toolsUsedDescription: 'Следующие инструменты были использованы в ходе тестирования на проникновение:',
    toolName: 'Название инструмента',
    usedIn: 'Использован в',
    finding: 'находка',
    findings: 'находок',
    noToolsRecorded: 'Для данного проекта инструменты не были зафиксированы.',
    
    // Footer
    confidential: 'КОНФИДЕНЦИАЛЬНО',
    footerNotice: 'Данный отчёт предназначен исключительно для использования организацией, заказавшей оценку.',
    generatedBy: 'Сгенерировано PenDoc',
    
    // Models and environments
    blackBox: 'Чёрный ящик',
    grayBox: 'Серый ящик',
    whiteBox: 'Белый ящик',
    external: 'Внешнее',
    internal: 'Внутреннее',
    both: 'Внешнее и внутреннее',
    notSpecified: 'Не указано',
  }
};

const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const likelihoodOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatInlineMarkup(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

// Detect content that came from a WYSIWYG / rich-text editor (stored as HTML).
function looksLikeRichHtml(value: string): boolean {
  return /<(p|br\s*\/?>|div|ul|ol|li|h[1-6]|strong|em|b|i|span|table|tr|td|th|blockquote|pre|code|a)\b[^>]*>/i.test(value.slice(0, 2000));
}

// Strip only dangerous constructs; preserve safe formatting HTML from rich-text editors.
function sanitizeRichHtml(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '#');
}

function renderNarrativeContent(value: string | null | undefined): string {
  if (!value) return '';

  // If the value is HTML from a rich-text editor, sanitize and pass through directly.
  if (looksLikeRichHtml(value)) {
    return sanitizeRichHtml(value);
  }

  const normalized = value.replace(/\r\n/g, '\n').replace(/```[\w-]*\n?/g, '').replace(/```/g, '').trim();
  if (!normalized) return '';

  return normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);

      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul class="rich-list">${lines
          .map((line) => `<li>${formatInlineMarkup(line.replace(/^[-*]\s+/, ''))}</li>`)
          .join('')}</ul>`;
      }

      if (lines.every((line) => /^\d+\.\s+/.test(line))) {
        return `<ol class="rich-list rich-list--ordered">${lines
          .map((line) => `<li>${formatInlineMarkup(line.replace(/^\d+\.\s+/, ''))}</li>`)
          .join('')}</ol>`;
      }

      return `<p>${lines.map((line) => formatInlineMarkup(line)).join('<br />')}</p>`;
    })
    .join('');
}

function looksTechnicalContent(value: string): boolean {
  const sample = value.trim();
  return /(<\/?[a-z][^>]*>|^\s*(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\S+|HTTP\/\d\.\d|^[A-Za-z-]+:\s.+|^\s*[\[{].*[\]}]\s*$|<\?xml|\bcurl\b|\bnmap\b|\bnessus\b|\bnikto\b|\bSELECT\b|\bUNION\b|\bContent-Type\b|\bServer\b)/im.test(sample);
}

function renderCodeBlock(value: string | null | undefined): string {
  if (!value) return '';
  const normalized = value.replace(/\r\n/g, '\n').replace(/```[\w-]*\n?/g, '').replace(/```/g, '').trim();
  if (!normalized) return '';
  return `<div class="code-block-wrapper"><div class="code-block-header"><div class="code-block-dot" style="background:#ef4444"></div><div class="code-block-dot" style="background:#f59e0b"></div><div class="code-block-dot" style="background:#10b981"></div></div><pre class="code-block"><code>${escapeHtml(normalized)}</code></pre></div>`;
}

function renderTechnicalContent(value: string | null | undefined): string {
  if (!value) return '';

  // Rich HTML from a WYSIWYG editor — sanitize and render directly.
  if (looksLikeRichHtml(value)) {
    return `<div class="detail-stack"><div class="detail-panel"><div class="detail-panel-body">${sanitizeRichHtml(value)}</div></div></div>`;
  }

  const normalized = value.replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';

  const sectionPattern = /\*\*([^*]+)\*\*\s*([\s\S]*?)(?=(?:\*\*[^*]+\*\*\s*)|$)/g;
  const sections: Array<{ label: string; body: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = sectionPattern.exec(normalized)) !== null) {
    const label = match[1].replace(/:\s*$/, '').trim();
    const body = match[2].trim();
    if (label && body) {
      sections.push({ label, body });
    }
  }

  if (sections.length > 0) {
    return `<div class="detail-stack">${sections
      .map(({ label, body }) => {
        const technicalLabel = /output|request|response|header|payload|xml|json|html|command|evidence|proof|plugin/i.test(label);
        const bodyHtml = technicalLabel || looksTechnicalContent(body)
          ? renderCodeBlock(body)
          : renderNarrativeContent(body);
        return `
          <div class="detail-panel">
            <div class="detail-panel-label">${escapeHtml(label)}</div>
            <div class="detail-panel-body">${bodyHtml}</div>
          </div>
        `;
      })
      .join('')}</div>`;
  }

  return looksTechnicalContent(normalized) ? renderCodeBlock(normalized) : renderNarrativeContent(normalized);
}

function getBrandMonogram(name: string | null | undefined): string {
  const source = (name || 'PenDoc').trim();
  const tokens = source.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  return tokens.slice(0, 2).map((token) => token[0]).join('').toUpperCase();
}

function formatDate(dateStr: string | null, lang: Language): string {
  if (!dateStr) return translations[lang].na;
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  return new Date(dateStr).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#d97706',
    low: '#2563eb',
    info: '#6b7280',
  };
  return colors[severity] || colors.info;
}

function getSeverityBg(severity: string): string {
  const colors: Record<string, string> = {
    critical: '#fef2f2',
    high: '#fff7ed',
    medium: '#fffbeb',
    low: '#eff6ff',
    info: '#f9fafb',
  };
  return colors[severity] || colors.info;
}

function getLikelihoodColor(likelihood: string): string {
  const colors: Record<string, string> = {
    high: '#dc2626',
    medium: '#d97706',
    low: '#2563eb',
  };
  return colors[likelihood] || colors.medium;
}

function getModelLabel(model: string | null, lang: Language): string {
  const t = translations[lang];
  const labels: Record<string, string> = {
    black_box: t.blackBox,
    gray_box: t.grayBox,
    white_box: t.whiteBox,
  };
  return model ? labels[model] || model : t.notSpecified;
}

function getEnvironmentLabel(env: string | null, lang: Language): string {
  const t = translations[lang];
  const labels: Record<string, string> = {
    external: t.external,
    internal: t.internal,
    both: t.both,
  };
  return env ? labels[env] || env : t.notSpecified;
}

function getSeverityLabel(severity: string, lang: Language): string {
  const t = translations[lang];
  const labels: Record<string, string> = {
    critical: t.critical,
    high: t.high,
    medium: t.medium,
    low: t.low,
    info: t.informational,
  };
  return labels[severity] || severity;
}

function getLikelihoodLabel(likelihood: string, lang: Language): string {
  const t = translations[lang];
  const labels: Record<string, string> = {
    high: t.high,
    medium: t.medium,
    low: t.low,
  };
  return labels[likelihood] || likelihood;
}

function getPriorityMeta(vulnerability: Vulnerability, lang: Language) {
  const t = translations[lang];
  const severityWeight: Record<string, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
  };
  const likelihoodWeight: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const severityScore = severityWeight[vulnerability.severity] || 1;
  const likelihoodScore = likelihoodWeight[vulnerability.likelihood] || 1;
  const cvssScore = vulnerability.cvss_score || 0;
  const normalizedCvss = cvssScore >= 9 ? 3 : cvssScore >= 7 ? 2 : cvssScore >= 4 ? 1 : 0;
  const priorityScore = severityScore * 3 + likelihoodScore * 2 + normalizedCvss;

  const key = priorityScore >= 20 ? 'immediate' : priorityScore >= 16 ? 'high' : priorityScore >= 10 ? 'medium' : 'low';
  const label = key === 'immediate' ? t.immediate : key === 'high' ? t.high : key === 'medium' ? t.medium : t.low;
  const window = key === 'immediate'
    ? t.within7d
    : key === 'high'
      ? t.within30d
      : key === 'medium'
        ? t.within60d
        : t.plannedCycle;
  const color = key === 'immediate' ? '#dc2626' : key === 'high' ? '#ea580c' : key === 'medium' ? '#d97706' : '#2563eb';
  const bg = key === 'immediate' ? '#fef2f2' : key === 'high' ? '#fff7ed' : key === 'medium' ? '#fffbeb' : '#eff6ff';
  const rationale = [
    `${getSeverityLabel(vulnerability.severity, lang)} ${t.severity.toLowerCase()}`,
    `${getLikelihoodLabel(vulnerability.likelihood, lang)} ${t.likelihood.toLowerCase()}`,
    vulnerability.cvss_score !== null ? `CVSS ${vulnerability.cvss_score.toFixed(1)}` : 'CVSS N/A',
  ].join(' • ');

  return { key, label, window, color, bg, score: priorityScore, rationale };
}

function getUsedStandards(project: Project, owaspCategories: string[], lang: Language): string[] {
  const standards = [
    'PTES',
    'OWASP Testing Guide',
    'NIST SP 800-115',
    'OSSTMM',
    'NIST CVSS v3.1',
  ];

  if (owaspCategories.includes('web')) standards.push(lang === 'ru' ? 'OWASP Top 10 (Web)' : 'OWASP Top 10 (Web)');
  if (owaspCategories.includes('api')) standards.push('OWASP API Security Top 10');
  if (owaspCategories.includes('mobile')) standards.push('OWASP Mobile Top 10');
  if (owaspCategories.includes('ai')) standards.push('OWASP Top 10 for LLM Applications');

  if (project.model_external || project.model_internal) {
    standards.push(lang === 'ru' ? 'Модель взаимодействия: Black/Gray/White Box' : 'Engagement model: Black/Gray/White Box');
  }

  return standards;
}

function generateOwaspChecklist(vulnerabilities: Vulnerability[], category: string, lang: Language): string {
  const t = translations[lang];
  const owaspItems: Record<string, Record<string, string>> = {
    web: {
      'A01': 'Broken Access Control',
      'A02': 'Cryptographic Failures',
      'A03': 'Injection',
      'A04': 'Insecure Design',
      'A05': 'Security Misconfiguration',
      'A06': 'Vulnerable and Outdated Components',
      'A07': 'Identification and Authentication Failures',
      'A08': 'Software and Data Integrity Failures',
      'A09': 'Security Logging and Monitoring Failures',
      'A10': 'Server-Side Request Forgery',
    },
    api: {
      'API1': 'Broken Object Level Authorization',
      'API2': 'Broken Authentication',
      'API3': 'Broken Object Property Level Authorization',
      'API4': 'Unrestricted Resource Consumption',
      'API5': 'Broken Function Level Authorization',
      'API6': 'Unrestricted Access to Sensitive Business Flows',
      'API7': 'Server Side Request Forgery',
      'API8': 'Security Misconfiguration',
      'API9': 'Improper Inventory Management',
      'API10': 'Unsafe Consumption of APIs',
    },
    mobile: {
      'M1': 'Improper Platform Usage',
      'M2': 'Insecure Data Storage',
      'M3': 'Insecure Communication',
      'M4': 'Insecure Authentication',
      'M5': 'Insufficient Cryptography',
      'M6': 'Insecure Authorization',
      'M7': 'Client Code Quality',
      'M8': 'Code Tampering',
      'M9': 'Reverse Engineering',
      'M10': 'Extraneous Functionality',
    },
    ai: {
      'LLM01': 'Prompt Injection',
      'LLM02': 'Insecure Output Handling',
      'LLM03': 'Training Data Poisoning',
      'LLM04': 'Model Denial of Service',
      'LLM05': 'Supply Chain Vulnerabilities',
      'LLM06': 'Sensitive Information Disclosure',
      'LLM07': 'Insecure Plugin Design',
      'LLM08': 'Excessive Agency',
      'LLM09': 'Overreliance',
      'LLM10': 'Model Theft',
    },
  };

  const items = owaspItems[category] || {};
  const categoryVulns = vulnerabilities.filter(v => v.owasp_category === category);
  
  let html = '';
  for (const [code, name] of Object.entries(items)) {
    const found = categoryVulns.filter(v => v.owasp_item?.startsWith(code));
    const status = found.length > 0 ? t.found : t.notFound;
    const statusColor = found.length > 0 ? '#dc2626' : '#16a34a';
    const statusBg = found.length > 0 ? '#fef2f2' : '#f0fdf4';
    html += `
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${code}</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${name}</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb;"><span style="display:inline-flex; align-items:center; padding: 4px 10px; border-radius: 999px; background: ${statusBg}; color: ${statusColor}; font-weight: 700; font-size: 8.5pt;">${status}</span></td>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${found.length}</td>
      </tr>
    `;
  }
  return html;
}

function generateReport(project: Project, vulnerabilities: Vulnerability[], lang: Language = 'en'): string {
  const t = translations[lang];
  const htmlLang = lang === 'ru' ? 'ru' : 'en';
  
  const sortedVulns = [...vulnerabilities].sort((a, b) => {
    const sevDiff = (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
    if (sevDiff !== 0) return sevDiff;
    return (likelihoodOrder[a.likelihood] || 2) - (likelihoodOrder[b.likelihood] || 2);
  });

  const stats = {
    total: vulnerabilities.length,
    critical: vulnerabilities.filter(v => v.severity === 'critical').length,
    high: vulnerabilities.filter(v => v.severity === 'high').length,
    medium: vulnerabilities.filter(v => v.severity === 'medium').length,
    low: vulnerabilities.filter(v => v.severity === 'low').length,
    info: vulnerabilities.filter(v => v.severity === 'info').length,
  };

  const owaspCategories = [...new Set(vulnerabilities.map(v => v.owasp_category).filter(Boolean))];
  const tools = [...new Set(vulnerabilities.map(v => v.tool).filter(Boolean))];
  const scope = project.scope || {};
  
  // Branding settings (client-level overrides project-level)
  const projectBranding = project.branding || {};
  const clientBranding = project.client?.branding || {};
  const branding = { ...projectBranding, ...clientBranding };
  const primaryColor = branding.primary_color || '#10b981';
  const secondaryColor = branding.secondary_color || '#0f172a';
  const accentColor = branding.accent_color || '#3b82f6';
  const fontFamily = branding.font_family || 'Inter';
  const reportTitle = branding.report_title || t.penetrationTestReport;
  const reportSubtitle = branding.report_subtitle || t.securityAssessmentFindings;
  const coverImageUrl = branding.cover_image_url || '';
  const watermarkText = branding.watermark_text || '';
  const targetCompanyName = branding.target_display_name || branding.company_name || project.client?.company_name || project.name || 'Client Environment';
  const targetCompanyLogo = branding.target_logo_url || branding.company_logo_url || project.client?.company_logo_url || '';
  const assessorCompanyName = branding.assessor_company_name || 'PenDoc';
  const assessorCompanyLogo = branding.assessor_company_logo_url || '';
  const assessorCompanyWebsite = branding.assessor_company_website || '';
  const assessorContactEmail = branding.assessor_contact_email || '';
  const assessorContactPhone = branding.assessor_contact_phone || '';
  const assessorTagline = branding.assessor_tagline || 'Security reporting and offensive security workflows';
  const coverBadgeText = branding.cover_badge_text || reportSubtitle;
  const confidentialityText = branding.confidentiality_text || t.confidentialNotice;
  const footerText = branding.footer_text || t.footerNotice;
  const showConfidential = branding.show_confidential !== false;
  const showFooterBranding = branding.show_footer_branding !== false;
  const footerCompanyText = branding.footer_company_text || assessorCompanyName || 'PenDoc';

  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const reportDate = new Date().toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const brandMonogram = getBrandMonogram(assessorCompanyName || 'PenDoc');
  const targetBrandMonogram = getBrandMonogram(targetCompanyName || project.name || 'Client');
  const findingsPageEstimate = Math.max(1, Math.ceil(sortedVulns.length / 2));
  const methodologyStartPage = 7 + findingsPageEstimate;
  const remediationStartPage = methodologyStartPage + 1;
  const toolsStartPage = remediationStartPage + 1;
  const topFindings = sortedVulns.slice(0, 5);
  const usedStandards = getUsedStandards(project, owaspCategories as string[], lang);
  const engagementModels = [
    project.environment === 'external' || project.environment === 'both' ? getModelLabel(project.model_external, lang) : null,
    project.environment === 'internal' || project.environment === 'both' ? getModelLabel(project.model_internal, lang) : null,
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);
  const prioritizedFindings = sortedVulns
    .map((vulnerability, index) => ({
      vulnerability,
      ref: `V-${String(index + 1).padStart(3, '0')}`,
      priority: getPriorityMeta(vulnerability, lang),
    }))
    .sort((a, b) => b.priority.score - a.priority.score || (severityOrder[a.vulnerability.severity] || 5) - (severityOrder[b.vulnerability.severity] || 5));
  const remediationStats = prioritizedFindings.reduce(
    (acc, item) => {
      acc[item.priority.key] += 1;
      return acc;
    },
    { immediate: 0, high: 0, medium: 0, low: 0 },
  );

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.penetrationTestReport} - ${escapeHtml(project.name)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Sans+3:wght@400;600;700&family=Roboto:wght@400;500;700&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary-color: ${primaryColor};
      --secondary-color: ${secondaryColor};
      --accent-color: ${accentColor};
      --font-family: '${fontFamily}', 'Source Sans 3', 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      --heading-font: 'Inter', '${fontFamily}', 'Source Sans 3', sans-serif;
    }
    @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
    @media print {
      .page-break, .report-section { page-break-before: always; break-before: page; }
      .cover, .toc-page { page-break-after: always; break-after: page; }
      .no-break, .vuln-card, .summary-highlight-card { page-break-inside: avoid; break-inside: avoid; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: var(--font-family);
      background: #ffffff;
      color: #1f2937;
      line-height: 1.7;
      font-size: 11pt;
    }
    h1, h2, h3, .cover-title, .cover-project { font-family: var(--heading-font); }
    a { color: inherit; text-decoration: none; }
    .watermark {
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-20deg);
      font-size: 60pt;
      color: rgba(15, 23, 42, 0.06);
      font-weight: 700;
      letter-spacing: 6px;
      text-transform: uppercase;
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
    }
    .container { max-width: 210mm; margin: 0 auto; padding: 0 4mm 10mm; position: relative; z-index: 1; }
    .report-section { position: relative; padding-top: 2mm; }
    .section-shell {
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 22px 24px;
      background: linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, #ffffff 100%);
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
    }
    
    /* Cover Page */
    .cover { 
      min-height: calc(297mm - 36mm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(145deg, var(--secondary-color) 0%, ${secondaryColor}ee 58%, var(--accent-color) 160%);
      color: #ffffff;
      padding: 18mm 18mm 16mm;
      margin: 0 0 14mm;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .cover::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: ${coverImageUrl ? `url('${escapeHtml(coverImageUrl)}')` : 'none'};
      background-size: cover;
      background-position: center;
      opacity: 0.12;
    }
    .cover::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 28%),
        linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
    }
    .cover > * { position: relative; z-index: 1; }
    .cover-topbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
    }
    .cover-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 44px;
    }
    .cover-logo { max-height: 74px; max-width: 180px; object-fit: contain; }
    .cover-logo--sm { max-height: 42px; max-width: 120px; object-fit: contain; }
    .cover-logo-placeholder {
      width: 78px;
      height: 78px;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #e2e8f0;
      font-size: 19pt;
      font-weight: 800;
      background: rgba(255,255,255,0.06);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
    }
    .cover-company { font-size: 11pt; color: #cbd5e1; text-transform: uppercase; letter-spacing: 2px; }
    .cover-brand-meta { display: grid; gap: 2px; }
    .cover-brand-name { font-size: 10pt; color: #e2e8f0; font-weight: 700; letter-spacing: 0.3px; }
    .cover-brand-tagline { font-size: 8.5pt; color: #94a3b8; }
    .cover-badge {
      display: inline-flex;
      align-items: center;
      padding: 7px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.14);
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #e2e8f0;
      font-weight: 700;
    }
    .cover-body {
      display: grid;
      grid-template-columns: 1.35fr 0.95fr;
      gap: 24px;
      align-items: end;
      margin-top: 20mm;
    }
    .cover-main {
      padding-right: 12px;
    }
    .cover-title { font-size: 28pt; line-height: 1.12; font-weight: 800; margin: 16px 0 10px; color: #ffffff; letter-spacing: 0.4px; }
    .cover-subtitle { font-size: 15pt; color: #dbeafe; margin-bottom: 18px; max-width: 460px; }
    .cover-project { font-size: 22pt; font-weight: 700; margin-bottom: 10px; color: var(--primary-color); }
    .cover-date { font-size: 10pt; color: #cbd5e1; }
    .cover-sidepanel {
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(15, 23, 42, 0.22);
      backdrop-filter: blur(8px);
      border-radius: 22px;
      padding: 18px;
      box-shadow: 0 20px 40px rgba(2, 6, 23, 0.16);
    }
    .cover-sidepanel-title {
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 12px;
      font-weight: 700;
    }
    .cover-meta-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }
    .cover-meta-card {
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 12px 14px;
      background: rgba(255,255,255,0.04);
    }
    .cover-meta-label { font-size: 8pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
    .cover-meta-value { font-size: 10.5pt; color: #f8fafc; font-weight: 700; }
    .cover-meta { margin-top: 24px; font-size: 9pt; color: #cbd5e1; display: flex; justify-content: space-between; gap: 16px; align-items: end; }
    .cover-contact {
      font-size: 9pt;
      color: #dbeafe;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: flex-start;
    }
    
    /* Headers */
    h1 { font-size: 22pt; color: #0f172a; margin: 0 0 18px; border-bottom: 3px solid var(--primary-color); padding-bottom: 10px; }
    h2 { font-size: 16pt; color: #1e293b; margin: 24px 0 12px; }
    h3 { font-size: 13pt; color: #374151; margin: 20px 0 10px; }
    
    /* Content */
    p { margin-bottom: 12px; text-align: justify; }
    .lead-copy { font-size: 11.5pt; color: #334155; }
    
    /* Tables */
    table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 12px 0 22px; font-size: 10pt; overflow: hidden; border-radius: 14px; border: 1px solid #dbe4ef; }
    th { background: linear-gradient(180deg, #f1f5f9 0%, #e8eef5 100%); color: #0f172a; padding: 13px 16px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 800; letter-spacing: 0.2px; font-size: 9.5pt; }
    th:first-child { border-radius: 14px 0 0 0; }
    th:last-child { border-radius: 0 14px 0 0; }
    td { padding: 11px 16px; border-bottom: 1px solid #e8eef5; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }
    tr:last-child td:first-child { border-radius: 0 0 0 14px; }
    tr:last-child td:last-child { border-radius: 0 0 14px 0; }
    
    /* Stats Cards */
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
    .stat-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 20px; text-align: center; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06); position: relative; overflow: hidden; }
    .stat-card::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; border-radius: 0 0 18px 18px; }
    .stat-value { font-size: 30pt; font-weight: 800; line-height: 1; margin-bottom: 4px; }
    .stat-label { font-size: 8.5pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; }
    .executive-summary-intro {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 20px;
      padding: 22px 24px;
      margin-bottom: 18px;
      box-shadow: 0 14px 30px rgba(15, 23, 42, 0.05);
    }
    .summary-highlight-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 18px 0 22px; }
    .summary-highlight-card {
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 18px;
      background: #ffffff;
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.04);
    }
    .summary-highlight-label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.9px; color: #64748b; font-weight: 700; margin-bottom: 8px; }
    .summary-highlight-value { font-size: 18pt; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
    .summary-highlight-copy { font-size: 9.5pt; color: #475569; }
    .summary-table-shell, .summary-panel-shell {
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      background: #ffffff;
      padding: 18px 18px 6px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
      margin-bottom: 18px;
    }
    .governance-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      margin-bottom: 18px;
    }
    .governance-card {
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #ffffff;
      padding: 18px;
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.04);
    }
    .governance-title {
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      font-weight: 800;
      margin-bottom: 10px;
    }
    .pill-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill {
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid #dbe4ef;
      background: #f8fafc;
      color: #1e293b;
      font-size: 8.5pt;
      font-weight: 700;
    }
    .summary-note {
      border-left: 4px solid var(--accent-color);
      background: #f8fbff;
      border-radius: 0 16px 16px 0;
      padding: 16px 18px;
      color: #334155;
      margin-bottom: 18px;
    }
    
    /* Severity Badge */
    .severity-badge { 
      display: inline-block;
      padding: 5px 12px; 
      border-radius: 999px; 
      font-size: 9pt; 
      font-weight: 700; 
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    
    /* Vulnerability Card */
    .vuln-card { 
      border: 1px solid #dbe4ef; 
      border-radius: 16px; 
      margin: 20px 0; 
      overflow: hidden;
      page-break-inside: avoid;
      background: #ffffff;
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
      border-left-width: 5px;
    }
    .vuln-card-critical { border-left-color: #dc2626; }
    .vuln-card-high { border-left-color: #ea580c; }
    .vuln-card-medium { border-left-color: #d97706; }
    .vuln-card-low { border-left-color: #2563eb; }
    .vuln-card-info { border-left-color: #6b7280; }
    .vuln-header { 
      background: #f8fafc;
      padding: 16px 20px; 
      border-bottom: 1px solid #e8eef5;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
    }
    .vuln-ref { 
      font-size: 9pt; 
      color: #64748b; 
      font-weight: 700;
      background: #dce7f3;
      padding: 6px 10px;
      border-radius: 999px;
    }
    .vuln-title { font-size: 14pt; font-weight: 700; color: #0f172a; flex: 1; margin: 0; }
    .vuln-meta { 
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      padding: 16px 22px;
      background: #ffffff;
      border-bottom: 1px solid #e8eef5;
      font-size: 9pt;
    }
    .meta-item { border: 1px solid #edf2f7; border-radius: 14px; padding: 12px; background: #f8fafc; }
    .meta-label { color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; font-size: 8.2pt; }
    .meta-value { color: #1e293b; font-weight: 700; margin-top: 6px; }
    .vuln-body { padding: 22px; }
    .vuln-section { margin-bottom: 22px; }
    .vuln-section:last-child { margin-bottom: 0; }
    .vuln-section-title { 
      font-size: 9pt; 
      font-weight: 700; 
      color: var(--accent-color); 
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .vuln-section-content { color: #334155; }
    .rich-list { margin: 0; padding-left: 18px; }
    .rich-list li { margin: 6px 0; color: #334155; }
    .rich-list--ordered { padding-left: 20px; }
    .detail-stack { display: grid; gap: 14px; }
    .detail-panel {
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      overflow: hidden;
      background: #ffffff;
    }
    .detail-panel-label {
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
      padding: 10px 14px;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #475569;
      font-weight: 800;
    }
    .detail-panel-body { padding: 14px; }
    .code-block-wrapper { 
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(148, 163, 184, 0.2);
      margin: 4px 0;
    }
    .code-block-header {
      background: #1e293b;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .code-block-dot { width: 10px; height: 10px; border-radius: 50%; }
    .code-block {
      background: #0f172a;
      color: #e2e8f0;
      padding: 14px 18px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 9pt;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.7;
      margin: 0;
    }
    
    /* Scope Section */
    .scope-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 18px 0 8px; }
    .scope-card { background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border: 1px solid #e2e8f0; border-radius: 18px; padding: 16px; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04); }
    .scope-title { font-size: 9pt; font-weight: 800; color: #1e293b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.8px; }
    .scope-list { list-style: none; font-size: 10pt; }
    .scope-list li { padding: 4px 0; color: #374151; border-bottom: 1px solid #f1f5f9; }
    .scope-list li:last-child { border-bottom: none; }
    
    /* Chart placeholder */
    .chart-container { 
      display: flex; 
      gap: 30px; 
      margin: 20px 0;
      flex-wrap: wrap;
    }
    .chart { 
      flex: 1;
      min-width: 250px;
      background: #f8fafc; 
      border: 1px solid #e2e8f0; 
      border-radius: 8px; 
      padding: 20px;
    }
    .chart-title { font-size: 11pt; font-weight: 600; margin-bottom: 15px; color: #1e293b; }
    .chart-bar { 
      display: flex; 
      align-items: center; 
      margin: 10px 0;
      font-size: 10pt;
      gap: 10px;
    }
    .chart-bar-label { width: 72px; color: #475569; font-weight: 600; font-size: 9pt; flex-shrink: 0; }
    .chart-bar-track { flex: 1; height: 28px; background: #f1f5f9; border-radius: 8px; overflow: hidden; position: relative; border: 1px solid #e2e8f0; }
    .chart-bar-fill { height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; color: white; font-weight: 700; font-size: 9pt; border-radius: 8px; min-width: 32px; transition: width 0.3s ease; }
    .chart-bar-fill-count { font-size: 9pt; font-weight: 800; }
    .chart-bar-pct { font-size: 8pt; opacity: 0.85; }
    .chart-bar-value { width: 28px; text-align: right; font-weight: 700; color: #1e293b; font-size: 9.5pt; flex-shrink: 0; }
    
    /* Info boxes */
    .info-box { 
      background: linear-gradient(135deg, #f0fdf4, #ecfdf5); 
      border: 1px solid #bbf7d0;
      border-left: 4px solid #10b981; 
      padding: 14px 18px; 
      margin: 14px 0;
      border-radius: 0 14px 14px 0;
      color: #064e3b;
    }
    .warning-box { 
      background: linear-gradient(135deg, #fffbeb, #fef9c3); 
      border: 1px solid #fde68a;
      border-left: 4px solid #f59e0b; 
      padding: 14px 18px; 
      margin: 14px 0;
      border-radius: 0 14px 14px 0;
      color: #78350f;
    }
    
    /* Testing Phases - Professional Timeline */
    .timeline {
      position: relative;
      margin: 28px 0 10px;
      padding-left: 28px;
    }
    .timeline::before {
      content: '';
      position: absolute;
      left: 12px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(180deg, var(--primary-color), var(--accent-color));
      opacity: 0.5;
    }
    .timeline-item {
      position: relative;
      display: flex;
      gap: 16px;
      padding: 14px 0 24px;
    }
    .timeline-icon {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
      flex-shrink: 0;
      margin-left: -6px;
      border: 2px solid #ffffff;
    }
    .timeline-icon svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: white;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .timeline-content {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px 18px;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
      flex: 1;
    }
    .timeline-meta {
      font-size: 8.5pt;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .timeline-title {
      font-size: 12pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .timeline-description {
      font-size: 10pt;
      color: #475569;
      line-height: 1.6;
    }
    
    /* TOC */
    .toc-page { page-break-after: always; break-after: page; }
    .toc-page .section-shell { padding-bottom: 24px; }
    .toc { margin: 12px 0 0; }
    .toc-item { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      gap: 16px;
      padding: 12px 0; 
      border-bottom: 1px solid #e5e7eb;
      font-size: 10pt;
    }
    .toc-item-number {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(16, 185, 129, 0.08);
      color: var(--primary-color);
      font-weight: 800;
      font-size: 8.5pt;
      flex-shrink: 0;
    }
    .toc-item-text { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .toc-item-title { flex: 1; color: #0f172a; font-weight: 600; }
    .toc-item-page { font-weight: 800; color: #475569; min-width: 24px; text-align: right; }
    .toc-item-rule { flex: 1; height: 1px; border-bottom: 1px dashed #cbd5e1; margin-top: 2px; }
    
    /* Footer */
    .footer { 
      text-align: center; 
      padding: 30px; 
      color: #64748b; 
      font-size: 9pt; 
      border-top: 1px solid #e5e7eb;
      margin-top: 40px;
    }
    .page-footer {
      margin-top: 32px;
      border-top: 1px solid #dbe4ef;
      padding-top: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      color: #64748b;
      font-size: 8.5pt;
    }
    .page-footer-brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .page-footer-logo {
      max-height: 20px;
      max-width: 56px;
      object-fit: contain;
    }
    .page-footer-monogram {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      font-weight: 800;
      background: #e2e8f0;
      color: #0f172a;
    }
    .priority-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin: 18px 0 20px;
    }
    .priority-card {
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #ffffff;
      padding: 18px;
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.04);
    }
    .priority-card-value { font-size: 20pt; font-weight: 800; margin-bottom: 4px; }
    .priority-card-label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; font-weight: 800; }
    @media screen and (max-width: 960px) {
      .cover-body,
      .summary-highlight-grid,
      .stats-grid,
      .governance-grid,
      .priority-grid,
      .scope-grid,
      .vuln-meta { grid-template-columns: repeat(2, 1fr); }
    }
    @media screen and (max-width: 720px) {
      .container { padding: 0 0 10mm; }
      .cover { padding: 12mm; border-radius: 20px; }
      .cover-topbar,
      .cover-body,
      .cover-meta { display: block; }
      .cover-sidepanel { margin-top: 16px; }
      .summary-highlight-grid,
      .stats-grid,
      .governance-grid,
      .priority-grid,
      .scope-grid,
      .vuln-meta { grid-template-columns: 1fr; }
      .vuln-header { flex-direction: column; }
      .page-footer { display: block; }
    }
    @media print {
      body { padding-bottom: 20mm; }
      .page-footer {
        position: fixed;
        left: 16mm;
        right: 16mm;
        bottom: 8mm;
        margin-top: 0;
        background: #ffffff;
      }
    }
  </style>
</head>
<body>
  ${watermarkText ? `<div class="watermark">${escapeHtml(watermarkText)}</div>` : ''}
  <!-- Cover Page -->
  <div class="cover">
    <div class="cover-topbar">
      <div class="cover-brand">
        ${assessorCompanyLogo ? `<img src="${escapeHtml(assessorCompanyLogo)}" alt="${escapeHtml(assessorCompanyName || 'Assessment Provider')} Logo" class="cover-logo cover-logo--sm" />` : `<div class="cover-logo-placeholder" style="width:44px;height:44px;font-size:11pt;border-radius:14px;">${brandMonogram}</div>`}
        <div class="cover-brand-meta">
          <div class="cover-brand-name">${escapeHtml(assessorCompanyName || footerCompanyText)}</div>
          ${assessorTagline ? `<div class="cover-brand-tagline">${escapeHtml(assessorTagline)}</div>` : ''}
        </div>
      </div>
      <div class="cover-badge">${escapeHtml(coverBadgeText)}</div>
      ${showConfidential ? `<div class="cover-badge">${escapeHtml(confidentialityText)}</div>` : ''}
    </div>

    <div class="cover-body">
      <div class="cover-main">
        ${targetCompanyName ? `<div class="cover-company">${escapeHtml(targetCompanyName)}</div>` : ''}
        <div class="cover-title">${escapeHtml(reportTitle)}</div>
        <div class="cover-subtitle">${escapeHtml(reportSubtitle)}</div>
        <div class="cover-date">${reportDate}</div>
        ${(assessorCompanyWebsite || assessorContactEmail || assessorContactPhone) ? `
        <div class="cover-contact">
          ${assessorCompanyWebsite ? `<span>${escapeHtml(assessorCompanyWebsite)}</span>` : ''}
          ${assessorContactEmail ? `<span>${escapeHtml(assessorContactEmail)}</span>` : ''}
          ${assessorContactPhone ? `<span>${escapeHtml(assessorContactPhone)}</span>` : ''}
        </div>
        ` : ''}
      </div>

      <div class="cover-sidepanel">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px;">
          ${targetCompanyLogo ? `<img src="${escapeHtml(targetCompanyLogo)}" alt="${escapeHtml(targetCompanyName || 'Company')} Logo" class="cover-logo" />` : `<div class="cover-logo-placeholder">${targetBrandMonogram}</div>`}
          <svg viewBox="0 0 24 24" style="width:42px;height:42px;stroke:${primaryColor};fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;opacity:.9;"><path d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z"/><path d="m9.5 12 1.7 1.7L15 10"/></svg>
        </div>
        <div class="cover-sidepanel-title">${t.engagementSnapshot}</div>
        <div class="cover-meta-grid">
          <div class="cover-meta-card">
            <div class="cover-meta-label">${t.assessedOrganization}</div>
            <div class="cover-meta-value">${escapeHtml(targetCompanyName)}</div>
          </div>
          <div class="cover-meta-card">
            <div class="cover-meta-label">${t.assessmentPeriod}</div>
            <div class="cover-meta-value">${formatDate(project.start_date, lang)} - ${formatDate(project.end_date, lang)}</div>
          </div>
          <div class="cover-meta-card">
            <div class="cover-meta-label">${t.environment}</div>
            <div class="cover-meta-value">${getEnvironmentLabel(project.environment, lang)}</div>
          </div>
          <div class="cover-meta-card">
            <div class="cover-meta-label">${t.totalVulnerabilities}</div>
            <div class="cover-meta-value">${stats.total}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="cover-meta">
      <div>${escapeHtml(project.description || t.projectOverviewDescription)}</div>
      <div>${escapeHtml(footerText)}</div>
    </div>
  </div>

  <div class="container">
    <!-- Table of Contents -->
    <section class="toc-page">
      <div class="section-shell">
        <h1>${t.tableOfContents}</h1>
        <div class="toc">
          <div class="toc-item"><div class="toc-item-text"><span class="toc-item-number">1</span><span class="toc-item-title">${t.projectOverview}</span><span class="toc-item-rule"></span></div><span class="toc-item-page">3</span></div>
          <div class="toc-item"><div class="toc-item-text"><span class="toc-item-number">2</span><span class="toc-item-title">${t.scopeOfWork}</span><span class="toc-item-rule"></span></div><span class="toc-item-page">3</span></div>
          <div class="toc-item"><div class="toc-item-text"><span class="toc-item-number">3</span><span class="toc-item-title">${t.executiveSummary}</span><span class="toc-item-rule"></span></div><span class="toc-item-page">4</span></div>
          <div class="toc-item"><div class="toc-item-text"><span class="toc-item-number">4</span><span class="toc-item-title">${t.severityLikelihoodDefinitions}</span><span class="toc-item-rule"></span></div><span class="toc-item-page">5</span></div>
          <div class="toc-item"><div class="toc-item-text"><span class="toc-item-number">5</span><span class="toc-item-title">${t.detailedFindings}</span><span class="toc-item-rule"></span></div><span class="toc-item-page">6</span></div>
          <div class="toc-item"><div class="toc-item-text"><span class="toc-item-number">6</span><span class="toc-item-title">${t.testingMethodology}</span><span class="toc-item-rule"></span></div><span class="toc-item-page">${methodologyStartPage}</span></div>
          <div class="toc-item"><div class="toc-item-text"><span class="toc-item-number">7</span><span class="toc-item-title">${t.remediationPriority}</span><span class="toc-item-rule"></span></div><span class="toc-item-page">${remediationStartPage}</span></div>
          <div class="toc-item"><div class="toc-item-text"><span class="toc-item-number">8</span><span class="toc-item-title">${t.toolsUsed}</span><span class="toc-item-rule"></span></div><span class="toc-item-page">${toolsStartPage}</span></div>
        </div>
      </div>
    </section>

    <!-- Section 1 & 2: Project Overview and Scope -->
    <section class="report-section">
    <div class="section-shell">
    <h1>1. ${t.projectOverview}</h1>
    <p class="lead-copy">${project.description ? escapeHtml(project.description) : t.projectOverviewDescription}</p>
    
    <table>
      <tr>
        <th style="width: 30%;">${t.parameter}</th>
        <th>${t.details}</th>
      </tr>
      <tr>
        <td><strong>${t.projectName}</strong></td>
        <td>${escapeHtml(project.name)}</td>
      </tr>
      <tr>
        <td><strong>${t.assessmentPeriod}</strong></td>
        <td>${formatDate(project.start_date, lang)} - ${formatDate(project.end_date, lang)}</td>
      </tr>
      <tr>
        <td><strong>${t.environmentType}</strong></td>
        <td>${getEnvironmentLabel(project.environment, lang)}</td>
      </tr>
      ${project.environment === 'external' || project.environment === 'both' ? `
      <tr>
        <td><strong>${t.externalTestingModel}</strong></td>
        <td>${getModelLabel(project.model_external, lang)}</td>
      </tr>
      ` : ''}
      ${project.environment === 'internal' || project.environment === 'both' ? `
      <tr>
        <td><strong>${t.internalTestingModel}</strong></td>
        <td>${getModelLabel(project.model_internal, lang)}</td>
      </tr>
      ` : ''}
      <tr>
        <td><strong>${t.totalVulnerabilities}</strong></td>
        <td>${stats.total}</td>
      </tr>
    </table>

    ${project.rules_of_engagement ? `
    <h2>${t.rulesOfEngagement}</h2>
    <div class="info-box">
      <p style="white-space: pre-wrap;">${escapeHtml(project.rules_of_engagement)}</p>
    </div>
    ` : ''}

    <!-- Section 2: Scope of Work -->
    <h1>2. ${t.scopeOfWork}</h1>
    <p>${t.scopeDescription}</p>
    
    <div class="scope-grid">
      ${scope.fqdns?.length > 0 ? `
      <div class="scope-card">
        <div class="scope-title">${t.fqdns}</div>
        <ul class="scope-list">
          ${scope.fqdns.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${scope.urls?.length > 0 ? `
      <div class="scope-card">
        <div class="scope-title">${t.urls}</div>
        <ul class="scope-list">
          ${scope.urls.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${scope.ips?.length > 0 ? `
      <div class="scope-card">
        <div class="scope-title">${t.ipAddresses}</div>
        <ul class="scope-list">
          ${scope.ips.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${scope.mobile_apps?.length > 0 ? `
      <div class="scope-card">
        <div class="scope-title">${t.mobileApplications}</div>
        <ul class="scope-list">
          ${scope.mobile_apps.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${scope.emails?.length > 0 ? `
      <div class="scope-card">
        <div class="scope-title">${t.emailsSocialEngineering}</div>
        <ul class="scope-list">
          ${scope.emails.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${scope.phone_numbers?.length > 0 ? `
      <div class="scope-card">
        <div class="scope-title">${t.phoneSocialEngineering}</div>
        <ul class="scope-list">
          ${scope.phone_numbers.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    </div>

    ${!scope.fqdns?.length && !scope.urls?.length && !scope.ips?.length && !scope.mobile_apps?.length && !scope.emails?.length && !scope.phone_numbers?.length ? `
    <div class="warning-box">
      <p>${t.noScopeItems}</p>
    </div>
    ` : ''}
    </div>
    </section>

    <!-- Section 3: Executive Summary -->
    <section class="report-section">
    <div class="section-shell">
    <h1>3. ${t.executiveSummary}</h1>
    <div class="executive-summary-intro">
      <p>${t.executiveSummaryDescription} <strong>${stats.total} ${t.vulnerabilitiesIdentified}</strong></p>
      <p style="margin-top:10px;">${t.executiveRiskStatement}</p>
    </div>
    <div class="summary-highlight-grid">
      <div class="summary-highlight-card">
        <div class="summary-highlight-label">${t.critical}</div>
        <div class="summary-highlight-value" style="color:#dc2626;">${stats.critical}</div>
        <div class="summary-highlight-copy">Immediate remediation recommended for issues with the highest likelihood of material impact.</div>
      </div>
      <div class="summary-highlight-card">
        <div class="summary-highlight-label">${t.high}</div>
        <div class="summary-highlight-value" style="color:#ea580c;">${stats.high}</div>
        <div class="summary-highlight-copy">Priority findings that should be addressed in the first remediation wave.</div>
      </div>
      <div class="summary-highlight-card">
        <div class="summary-highlight-label">${t.total}</div>
        <div class="summary-highlight-value" style="color:var(--primary-color);">${stats.total}</div>
        <div class="summary-highlight-copy">Confirmed findings included in this engagement and reflected throughout the report.</div>
      </div>
    </div>

    <div class="governance-grid">
      <div class="governance-card">
        <div class="governance-title">${t.assessedOrganization}</div>
        <p><strong>${escapeHtml(targetCompanyName)}</strong></p>
        ${targetCompanyLogo ? `<p style="margin-top:10px;"><img src="${escapeHtml(targetCompanyLogo)}" alt="${escapeHtml(targetCompanyName)} Logo" class="cover-logo cover-logo--sm" /></p>` : ''}
      </div>
      <div class="governance-card">
        <div class="governance-title">${t.assessmentProvider}</div>
        <p><strong>${escapeHtml(assessorCompanyName || footerCompanyText)}</strong></p>
        <p style="margin-top:8px; color:#475569;">${t.executedBy} ${escapeHtml(assessorCompanyName || footerCompanyText)}</p>
      </div>
      <div class="governance-card">
        <div class="governance-title">${t.assessmentStandards}</div>
        <div class="pill-list">
          ${usedStandards.map((standard) => `<span class="pill">${escapeHtml(standard)}</span>`).join('')}
        </div>
      </div>
      <div class="governance-card">
        <div class="governance-title">${t.engagementModels}</div>
        <div class="pill-list">
          ${(engagementModels.length > 0 ? engagementModels : [t.notSpecified]).map((model) => `<span class="pill">${escapeHtml(model)}</span>`).join('')}
        </div>
      </div>
    </div>

    <div class="summary-note">
      <strong>${t.rulesOfEngagementSummary}:</strong>
      <span style="margin-left:6px;">${project.rules_of_engagement ? escapeHtml(project.rules_of_engagement) : escapeHtml(lang === 'ru' ? 'Тестирование проводилось в согласованных рамках проекта и только в пределах утверждённой области.' : 'Testing was conducted within the agreed project boundaries and only against the approved in-scope assets.')}</span>
    </div>
    
    <h2>3.1 ${t.vulnerabilityStatistics}</h2>
    <div class="stats-grid">
      <div class="stat-card" style="border-top: 4px solid #dc2626;">
        <div class="stat-value" style="color: #dc2626;">${stats.critical}</div>
        <div class="stat-label">${t.critical}</div>
      </div>
      <div class="stat-card" style="border-top: 4px solid #ea580c;">
        <div class="stat-value" style="color: #ea580c;">${stats.high}</div>
        <div class="stat-label">${t.high}</div>
      </div>
      <div class="stat-card" style="border-top: 4px solid #d97706;">
        <div class="stat-value" style="color: #d97706;">${stats.medium}</div>
        <div class="stat-label">${t.medium}</div>
      </div>
      <div class="stat-card" style="border-top: 4px solid #2563eb;">
        <div class="stat-value" style="color: #2563eb;">${stats.low}</div>
        <div class="stat-label">${t.low}</div>
      </div>
      <div class="stat-card" style="border-top: 4px solid #6b7280;">
        <div class="stat-value" style="color: #6b7280;">${stats.info}</div>
        <div class="stat-label">${t.informational}</div>
      </div>
      <div class="stat-card" style="border-top: 4px solid #10b981;">
        <div class="stat-value" style="color: #10b981;">${stats.total}</div>
        <div class="stat-label">${t.total}</div>
      </div>
    </div>

    <h2>3.2 ${t.severityDistribution}</h2>
    <div class="summary-panel-shell">
    <div class="chart-container">
      <div class="chart">
        <div class="chart-title">${t.vulnerabilitiesBySeverity}</div>
        <div class="chart-bar">
          <span class="chart-bar-label">${t.critical}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${stats.total > 0 ? Math.max(stats.critical / stats.total * 100, stats.critical > 0 ? 6 : 0) : 0}%; background: linear-gradient(90deg, #b91c1c, #dc2626);">
              ${stats.critical > 0 ? `<span class="chart-bar-fill-count">${stats.critical}</span><span class="chart-bar-pct">${Math.round(stats.critical / stats.total * 100)}%</span>` : ''}
            </div>
          </div>
          <span class="chart-bar-value">${stats.critical}</span>
        </div>
        <div class="chart-bar">
          <span class="chart-bar-label">${t.high}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${stats.total > 0 ? Math.max(stats.high / stats.total * 100, stats.high > 0 ? 6 : 0) : 0}%; background: linear-gradient(90deg, #c2410c, #ea580c);">
              ${stats.high > 0 ? `<span class="chart-bar-fill-count">${stats.high}</span><span class="chart-bar-pct">${Math.round(stats.high / stats.total * 100)}%</span>` : ''}
            </div>
          </div>
          <span class="chart-bar-value">${stats.high}</span>
        </div>
        <div class="chart-bar">
          <span class="chart-bar-label">${t.medium}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${stats.total > 0 ? Math.max(stats.medium / stats.total * 100, stats.medium > 0 ? 6 : 0) : 0}%; background: linear-gradient(90deg, #b45309, #d97706);">
              ${stats.medium > 0 ? `<span class="chart-bar-fill-count">${stats.medium}</span><span class="chart-bar-pct">${Math.round(stats.medium / stats.total * 100)}%</span>` : ''}
            </div>
          </div>
          <span class="chart-bar-value">${stats.medium}</span>
        </div>
        <div class="chart-bar">
          <span class="chart-bar-label">${t.low}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${stats.total > 0 ? Math.max(stats.low / stats.total * 100, stats.low > 0 ? 6 : 0) : 0}%; background: linear-gradient(90deg, #1d4ed8, #2563eb);">
              ${stats.low > 0 ? `<span class="chart-bar-fill-count">${stats.low}</span><span class="chart-bar-pct">${Math.round(stats.low / stats.total * 100)}%</span>` : ''}
            </div>
          </div>
          <span class="chart-bar-value">${stats.low}</span>
        </div>
        <div class="chart-bar">
          <span class="chart-bar-label">${t.info}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${stats.total > 0 ? Math.max(stats.info / stats.total * 100, stats.info > 0 ? 6 : 0) : 0}%; background: linear-gradient(90deg, #4b5563, #6b7280);">
              ${stats.info > 0 ? `<span class="chart-bar-fill-count">${stats.info}</span><span class="chart-bar-pct">${Math.round(stats.info / stats.total * 100)}%</span>` : ''}
            </div>
          </div>
          <span class="chart-bar-value">${stats.info}</span>
        </div>
      </div>
    </div>
    </div>

    <h2>3.3 ${t.vulnerabilitySummary}</h2>
    ${topFindings.length > 0 ? `
    <div class="summary-highlight-grid">
      ${topFindings.map((v, i) => `
      <div class="summary-highlight-card">
        <div class="summary-highlight-label">V-${String(i + 1).padStart(3, '0')}</div>
        <div class="summary-highlight-value" style="font-size:14pt; color:${getSeverityColor(v.severity)};">${escapeHtml(v.title)}</div>
        <div class="summary-highlight-copy">${getSeverityLabel(v.severity, lang)} • ${v.cvss_score !== null ? `CVSS ${v.cvss_score.toFixed(1)}` : 'CVSS N/A'}${v.owasp_item ? ` • ${escapeHtml(v.owasp_item)}` : ''}</div>
      </div>
      `).join('')}
    </div>
    ` : ''}
    <div class="summary-table-shell">
    <table>
      <tr>
        <th style="width: 8%;">${t.ref}</th>
        <th>${t.title}</th>
        <th style="width: 12%;">${t.severity}</th>
        <th style="width: 15%;">${t.owasp}</th>
        <th style="width: 10%;">${t.cvss}</th>
      </tr>
      ${sortedVulns.map((v, i) => `
      <tr>
        <td><strong>V-${String(i + 1).padStart(3, '0')}</strong></td>
        <td>${escapeHtml(v.title)}</td>
        <td><span class="severity-badge" style="background: ${getSeverityBg(v.severity)}; color: ${getSeverityColor(v.severity)};">${getSeverityLabel(v.severity, lang)}</span></td>
        <td>${v.owasp_item ? escapeHtml(v.owasp_item) : '-'}</td>
        <td>${v.cvss_score !== null ? v.cvss_score.toFixed(1) : '-'}</td>
      </tr>
      `).join('')}
    </table>
    </div>

    ${owaspCategories.length > 0 ? `
    <h2>3.4 ${t.owaspComplianceChecklists}</h2>
    ${owaspCategories.includes('web') ? `
    <h3>${t.owaspTop10Web}</h3>
    <table>
      <tr>
        <th style="width: 10%;">${t.id}</th>
        <th>${t.category}</th>
        <th style="width: 15%;">${t.status}</th>
        <th style="width: 10%;">${t.count}</th>
      </tr>
      ${generateOwaspChecklist(vulnerabilities, 'web', lang)}
    </table>
    ` : ''}
    ${owaspCategories.includes('api') ? `
    <h3>${t.owaspApiTop10}</h3>
    <table>
      <tr>
        <th style="width: 10%;">${t.id}</th>
        <th>${t.category}</th>
        <th style="width: 15%;">${t.status}</th>
        <th style="width: 10%;">${t.count}</th>
      </tr>
      ${generateOwaspChecklist(vulnerabilities, 'api', lang)}
    </table>
    ` : ''}
    
    ${owaspCategories.includes('mobile') ? `
    <h3>${t.owaspMobileTop10}</h3>
    <table>
      <tr>
        <th style="width: 10%;">${t.id}</th>
        <th>${t.category}</th>
        <th style="width: 15%;">${t.status}</th>
        <th style="width: 10%;">${t.count}</th>
      </tr>
      ${generateOwaspChecklist(vulnerabilities, 'mobile', lang)}
    </table>
    ` : ''}
    
    ${owaspCategories.includes('ai') ? `
    <h3>${t.owaspLlmTop10}</h3>
    <table>
      <tr>
        <th style="width: 10%;">${t.id}</th>
        <th>${t.category}</th>
        <th style="width: 15%;">${t.status}</th>
        <th style="width: 10%;">${t.count}</th>
      </tr>
      ${generateOwaspChecklist(vulnerabilities, 'ai', lang)}
    </table>
    ` : ''}
    ` : ''}
    </div>
    </section>

    <!-- Section 4: Severity & Likelihood Definitions -->
    <section class="report-section">
    <div class="section-shell">
    <h1>4. ${t.severityLikelihoodDefinitions}</h1>
    
    <h2>4.1 ${t.severityLevels}</h2>
    <table>
      <tr>
        <th style="width: 15%;">${t.level}</th>
        <th style="width: 15%;">${t.cvssRange}</th>
        <th>${t.description}</th>
      </tr>
      <tr>
        <td><span class="severity-badge" style="background: #fef2f2; color: #dc2626;">${t.critical.toUpperCase()}</span></td>
        <td>9.0 - 10.0</td>
        <td>${t.criticalDescription}</td>
      </tr>
      <tr>
        <td><span class="severity-badge" style="background: #fff7ed; color: #ea580c;">${t.high.toUpperCase()}</span></td>
        <td>7.0 - 8.9</td>
        <td>${t.highDescription}</td>
      </tr>
      <tr>
        <td><span class="severity-badge" style="background: #fffbeb; color: #d97706;">${t.medium.toUpperCase()}</span></td>
        <td>4.0 - 6.9</td>
        <td>${t.mediumDescription}</td>
      </tr>
      <tr>
        <td><span class="severity-badge" style="background: #eff6ff; color: #2563eb;">${t.low.toUpperCase()}</span></td>
        <td>0.1 - 3.9</td>
        <td>${t.lowDescription}</td>
      </tr>
      <tr>
        <td><span class="severity-badge" style="background: #f9fafb; color: #6b7280;">${t.info.toUpperCase()}</span></td>
        <td>0.0</td>
        <td>${t.infoDescription}</td>
      </tr>
    </table>

    <h2>4.2 ${t.likelihoodLevels}</h2>
    <table>
      <tr>
        <th style="width: 15%;">${t.level}</th>
        <th>${t.description}</th>
      </tr>
      <tr>
        <td style="color: #dc2626; font-weight: 600;">${t.high.toUpperCase()}</td>
        <td>${t.highLikelihoodDescription}</td>
      </tr>
      <tr>
        <td style="color: #d97706; font-weight: 600;">${t.medium.toUpperCase()}</td>
        <td>${t.mediumLikelihoodDescription}</td>
      </tr>
      <tr>
        <td style="color: #2563eb; font-weight: 600;">${t.low.toUpperCase()}</td>
        <td>${t.lowLikelihoodDescription}</td>
      </tr>
    </table>
    </div>
    </section>

    <!-- Section 5: Detailed Findings -->
    <section class="report-section">
    <div class="section-shell">
    <h1>5. ${t.detailedFindings}</h1>
    <p class="lead-copy">${t.detailedFindingsDescription}</p>
    
    ${sortedVulns.map((vuln, index) => `
    <div class="vuln-card vuln-card-${(vuln.severity || 'info').toLowerCase()} no-break">
      <div class="vuln-header">
        <span class="vuln-ref">V-${String(index + 1).padStart(3, '0')}</span>
        <span class="vuln-title">${escapeHtml(vuln.title)}</span>
        <span class="severity-badge" style="background: ${getSeverityBg(vuln.severity)}; color: ${getSeverityColor(vuln.severity)};">${getSeverityLabel(vuln.severity, lang)}</span>
      </div>
      <div class="vuln-meta">
        <div class="meta-item">
          <div class="meta-label">${t.likelihood}</div>
          <div class="meta-value" style="color: ${getLikelihoodColor(vuln.likelihood)};">${vuln.likelihood ? getLikelihoodLabel(vuln.likelihood, lang).toUpperCase() : t.na}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">${t.cvssScore}</div>
          <div class="meta-value">${vuln.cvss_score !== null ? vuln.cvss_score.toFixed(1) : t.na}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">${t.owaspCategory}</div>
          <div class="meta-value">${vuln.owasp_category ? vuln.owasp_category.toUpperCase() : t.na}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">${t.owaspItem}</div>
          <div class="meta-value">${vuln.owasp_item || t.na}</div>
        </div>
      </div>
      <div class="vuln-body">
        ${vuln.affected_assets && vuln.affected_assets.length > 0 ? `
        <div class="vuln-section">
          <div class="vuln-section-title">${t.affectedTargets}</div>
          <div class="vuln-section-content">
            <ul style="margin: 0; padding-left: 20px;">
              ${vuln.affected_assets.map(asset => `<li style="font-family: monospace; font-size: 10pt;">${escapeHtml(asset)}</li>`).join('')}
            </ul>
          </div>
        </div>
        ` : ''}
        
        ${vuln.description ? `
        <div class="vuln-section">
          <div class="vuln-section-title">${t.description}</div>
          <div class="vuln-section-content">${renderNarrativeContent(vuln.description)}</div>
        </div>
        ` : ''}
        
        ${vuln.detailed_description ? `
        <div class="vuln-section">
          <div class="vuln-section-title">${t.technicalDetails}</div>
          <div class="vuln-section-content">${renderTechnicalContent(vuln.detailed_description)}</div>
        </div>
        ` : ''}
        
        ${vuln.execution_command ? `
        <div class="vuln-section">
          <div class="vuln-section-title">${t.proofOfConcept}</div>
          ${renderCodeBlock(vuln.execution_command)}
        </div>
        ` : ''}
        
        ${vuln.tool ? `
        <div class="vuln-section">
          <div class="vuln-section-title">${t.toolUsed}</div>
          <div class="vuln-section-content">${renderNarrativeContent(vuln.tool)}</div>
        </div>
        ` : ''}
        
        ${vuln.remediation ? `
        <div class="vuln-section">
          <div class="vuln-section-title">${t.remediation}</div>
          <div class="vuln-section-content">${renderNarrativeContent(vuln.remediation)}</div>
        </div>
        ` : ''}
      </div>
    </div>
    `).join('')}
    </div>
    </section>

    <!-- Section 6: Testing Methodology -->
    <section class="report-section">
    <div class="section-shell">
    <h1>6. ${t.testingMethodology}</h1>
    <p class="lead-copy">${t.testingMethodologyDescription}</p>
    
    <h2>6.1 ${t.assessmentApproach}</h2>
    <table>
      <tr>
        <th style="width: 30%;">${t.parameter}</th>
        <th>${t.configuration}</th>
      </tr>
      <tr>
        <td><strong>${t.environment}</strong></td>
        <td>${getEnvironmentLabel(project.environment, lang)}</td>
      </tr>
      ${project.environment === 'external' || project.environment === 'both' ? `
      <tr>
        <td><strong>${t.externalTestingModel}</strong></td>
        <td>${getModelLabel(project.model_external, lang)}</td>
      </tr>
      ` : ''}
      ${project.environment === 'internal' || project.environment === 'both' ? `
      <tr>
        <td><strong>${t.internalTestingModel}</strong></td>
        <td>${getModelLabel(project.model_internal, lang)}</td>
      </tr>
      ` : ''}
    </table>

    <h2>6.2 ${t.testingPhases}</h2>
    
    <div class="timeline">
      <div class="timeline-item">
        <div class="timeline-icon">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <div class="timeline-content">
          <div class="timeline-meta">Phase 01</div>
          <div class="timeline-title">${t.phase1Title}</div>
          <div class="timeline-description">${t.phase1Description}</div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        </div>
        <div class="timeline-content">
          <div class="timeline-meta">Phase 02</div>
          <div class="timeline-title">${t.phase2Title}</div>
          <div class="timeline-description">${t.phase2Description}</div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4 2.5 7L12 16l-7 4 2.5-7L2 9h7l3-7z"/></svg>
        </div>
        <div class="timeline-content">
          <div class="timeline-meta">Phase 03</div>
          <div class="timeline-title">${t.phase3Title}</div>
          <div class="timeline-description">${t.phase3Description}</div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-icon">
          <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div class="timeline-content">
          <div class="timeline-meta">Phase 04</div>
          <div class="timeline-title">${t.phase4Title}</div>
          <div class="timeline-description">${t.phase4Description}</div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-icon">
          <svg viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <div class="timeline-content">
          <div class="timeline-meta">Phase 05</div>
          <div class="timeline-title">${t.phase5Title}</div>
          <div class="timeline-description">${t.phase5Description}</div>
        </div>
      </div>
    </div>
    </div>
    </section>

    <!-- Section 7: Remediation Priority -->
    <section class="report-section">
    <div class="section-shell">
    <h1>7. ${t.remediationPriority}</h1>
    <p class="lead-copy">${t.remediationPriorityDescription}</p>
    <div class="summary-note">${t.prioritizedBy}</div>
    <div class="priority-grid">
      <div class="priority-card">
        <div class="priority-card-label">${t.immediate}</div>
        <div class="priority-card-value" style="color:#dc2626;">${remediationStats.immediate}</div>
      </div>
      <div class="priority-card">
        <div class="priority-card-label">${t.high}</div>
        <div class="priority-card-value" style="color:#ea580c;">${remediationStats.high}</div>
      </div>
      <div class="priority-card">
        <div class="priority-card-label">${t.medium}</div>
        <div class="priority-card-value" style="color:#d97706;">${remediationStats.medium}</div>
      </div>
      <div class="priority-card">
        <div class="priority-card-label">${t.low}</div>
        <div class="priority-card-value" style="color:#2563eb;">${remediationStats.low}</div>
      </div>
    </div>
    
    <table>
      <tr>
        <th style="width: 10%;">${t.ref}</th>
        <th>${t.title}</th>
        <th style="width: 12%;">${t.severity}</th>
        <th style="width: 12%;">${t.likelihood}</th>
        <th style="width: 12%;">${t.priority}</th>
        <th style="width: 14%;">${t.recommendedWindow}</th>
        <th>${t.priorityRationale}</th>
      </tr>
      ${prioritizedFindings.map(({ vulnerability: v, ref, priority }) => {
        return `
      <tr>
        <td><strong>${ref}</strong></td>
        <td>${escapeHtml(v.title)}</td>
        <td><span class="severity-badge" style="background: ${getSeverityBg(v.severity)}; color: ${getSeverityColor(v.severity)};">${getSeverityLabel(v.severity, lang)}</span></td>
        <td style="color: ${getLikelihoodColor(v.likelihood)}; font-weight: 600;">${getLikelihoodLabel(v.likelihood, lang)}</td>
        <td><span class="severity-badge" style="background: ${priority.bg}; color: ${priority.color};">${priority.label}</span></td>
        <td>${priority.window}</td>
        <td>${escapeHtml(priority.rationale)}</td>
      </tr>
        `;
      }).join('')}
    </table>
    </div>
    </section>

    <!-- Section 8: Tools Used -->
    <section class="report-section">
    <div class="section-shell">
    <h1>8. ${t.toolsUsed}</h1>
    <p class="lead-copy">${t.toolsUsedDescription}</p>
    
    <table>
      <tr>
        <th style="width: 5%;">#</th>
        <th>${t.toolName}</th>
        <th style="width: 15%;">${t.usedIn}</th>
      </tr>
      ${tools.length > 0 ? tools.map((tool, i) => {
        const vulnsWithTool = vulnerabilities.filter(v => v.tool === tool);
        const findingsText = vulnsWithTool.length === 1 ? t.finding : t.findings;
        return `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(tool || '')}</td>
        <td>${vulnsWithTool.length} ${findingsText}</td>
      </tr>
        `;
      }).join('') : `
      <tr>
        <td colspan="3" style="text-align: center; color: #64748b;">${t.noToolsRecorded}</td>
      </tr>
      `}
    </table>

    <!-- Footer -->
    <div class="footer">
      <p><strong>${t.confidential}</strong></p>
      <p>${escapeHtml(footerText)}</p>
      <p>${t.reportGeneratedOn} ${reportDate}</p>
      <p>${t.executedBy} ${escapeHtml(assessorCompanyName || footerCompanyText)}</p>
    </div>
    </div>
    </section>
  </div>
  ${showFooterBranding ? `
  <div class="page-footer">
    <div class="page-footer-brand">
      ${assessorCompanyLogo ? `<img src="${escapeHtml(assessorCompanyLogo)}" alt="${escapeHtml(assessorCompanyName || footerCompanyText)} Logo" class="page-footer-logo" />` : `<span class="page-footer-monogram">${brandMonogram}</span>`}
      <span>${escapeHtml(footerCompanyText)}</span>
    </div>
    <div>${t.reportGeneratedOn} ${reportDate}</div>
  </div>
  ` : ''}
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Use anon key client with user's token to validate user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role client for database operations
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { projectId, format = 'html', language = 'en', shareWithClient = false } = await req.json();
    const lang: Language = language === 'ru' ? 'ru' : 'en';

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating ${format} report for project ${projectId} in ${lang}`);

    // Fetch project
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*, client:client_id (branding, company_name, company_logo_url, company_website)')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch vulnerabilities - exclude non-active statuses from reports
    const { data: vulnerabilities } = await supabaseClient
      .from('vulnerabilities')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('status', 'in', '(false_positive,fixed,accepted,ignored)')
      .order('severity', { ascending: true });

    console.log(`Found ${vulnerabilities?.length || 0} vulnerabilities`);

    // Generate HTML report with language
    const htmlContent = generateReport(project, vulnerabilities || [], lang);

    // Save report to database
    const reportName = `${project.name} - Report ${new Date().toISOString().split('T')[0]}`;
    const { data: savedReport, error: saveError } = await supabaseClient
      .from('project_reports')
      .insert({
        project_id: projectId,
        created_by: user.id,
        name: reportName,
        html_content: htmlContent,
        report_type: 'penetration_test',
        client_visible: Boolean(shareWithClient),
        file_size: new TextEncoder().encode(htmlContent).length,
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('Error saving report', { code: saveError.code });
      return Response.json({ error: 'The report could not be saved' }, { status: 500, headers: corsHeaders });
    } else {
      console.log(`Report saved with ID: ${savedReport?.id}`);
    }

    if (format === 'html') {
      return new Response(htmlContent, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_report.html"`,
        },
      });
    }

    // For PDF, return the HTML with a flag
    return new Response(JSON.stringify({ html: htmlContent, projectName: project.name, reportId: savedReport?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Report generation error:', error);
    const message = error instanceof Error ? error.message : 'Report generation failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
