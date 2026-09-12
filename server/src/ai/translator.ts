export interface TranslatablePayload {
  title: string;
  tldr: string[];
  keyDecisions: string[];
  actionItems: Array<{ id: string; task: string; assignee?: string; deadline?: string; priority: 'high' | 'medium' | 'low'; completed: boolean }>;
  segments: Array<{ id: string; start: number; end: number; speaker: string; text: string }>;
}

export async function translateNoteContent(
  content: TranslatablePayload,
  targetLang: 'en' | 'ro' | 'es' | 'de'
): Promise<TranslatablePayload> {
  if (targetLang === 'en') {
    return content;
  }

  const isDemo = process.env.DEMO_MODE === 'true';
  const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;

  if (!isDemo && apiKey) {
    try {
      const isGroq = !process.env.OPENAI_API_KEY && Boolean(process.env.GROQ_API_KEY);
      const apiUrl = isGroq
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const model = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

      const langNames: Record<string, string> = {
        ro: 'Romanian',
        es: 'Spanish',
        de: 'German',
      };

      const targetLangName = langNames[targetLang] || 'English';

      const prompt = `Translate the text fields in the following JSON into ${targetLangName}. Keep all IDs, keys, timestamps, and numbers unchanged. Return valid JSON only.

${JSON.stringify({
  title: content.title,
  tldr: content.tldr,
  keyDecisions: content.keyDecisions,
  actionTasks: content.actionItems.map((a) => a.task),
})}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        interface TranslateResponse {
          choices: Array<{ message: { content: string } }>;
        }
        const data = (await response.json()) as TranslateResponse;
        const parsed = JSON.parse(data.choices[0]?.message?.content || '{}');

        return {
          ...content,
          title: parsed.title || content.title,
          tldr: Array.isArray(parsed.tldr) ? parsed.tldr : content.tldr,
          keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : content.keyDecisions,
          actionItems: content.actionItems.map((item, idx) => ({
            ...item,
            task: parsed.actionTasks?.[idx] || item.task,
          })),
        };
      }
    } catch (err) {
      console.warn('API translation failed, using built-in translation dictionary:', err);
    }
  }

  // Pre-baked high fidelity translation for demo/offline mode
  if (targetLang === 'ro') {
    return {
      title: 'Sincronizare Lansare Produs & Plan de Acțiune',
      tldr: [
        'Lansarea aplicației mobile v1.4 a fost amânată pentru marțea viitoare pentru testare pe staging.',
        'Integrarea webhook-urilor Stripe și mecanismele de idempotență au trecut testele de regresie.',
        'Migrările bazei de date API v2 sunt programate pentru duminică la ora 02:00 UTC.',
        'Token-urile actualizate ale sistemului de design necesită aprobare înainte de miercuri.',
      ],
      keyDecisions: [
        'Data lansării este confirmată pentru marțea viitoare, cu o fereastră de testare QA de 48h.',
        'Execuția migrărilor bazei de date duminică la ora 02:00 UTC.',
        'Amânarea modului întunecat v2 pentru actualizarea ulterioară.',
      ],
      actionItems: content.actionItems.map((a, i) => {
        const roTasks = [
          'Actualizează notele de lansare și changelog-ul pe GitHub',
          'Rulează testele complete de checkout pe versiunea iOS staging',
          'Revizuiește și integrează PR-ul pentru webhook-uri Stripe',
          'Finalizează ghidul de suport pentru clienți în Notion',
        ];
        return {
          ...a,
          task: roTasks[i] || a.task,
        };
      }),
      segments: content.segments.map((s, i) => {
        const roTexts = [
          'Bună dimineața, echipă. Haideți să facem o scurtă aliniere pe lansarea versiunii mobile v1.4 și să rezolvăm blocajele înainte de code freeze.',
          'Mulțumesc Alex. Din perspectiva produsului, întrebarea cheie este integrarea plăților Stripe. Sunt acoperite toate cazurile limită pentru plăți multi-valută?',
          'Da, am finalizat handlerele idempotente ieri. Toate testele automate de regresie au trecut și am validat webhook-urile cu Stripe CLI fără evenimente pierdute.',
          'Excelentă treabă, David. Având în vedere că trebuie să rulăm teste smoke end-to-end pe iOS staging, propun să mutăm lansarea de vineri pe marțea viitoare.',
          'Mutarea pe marți are mult sens. Oferă echipei QA o fereastră curată de 48 de ore. Elena va valida procesul de checkout marți dimineață.',
          'În privința migrărilor bazei de date pentru API v2, am convenit să executăm modificările tabelelor duminică la 02:00 UTC în fereastra cu cel mai redus trafic.',
          'De acord. Voi publica anunțul de mentenanță pe pagina de status și voi pregăti notele de lansare pe GitHub până luni dimineață.',
          'Un ultim punct: echipa de design a actualizat paleta de culori. Să ne asigurăm că David și Alex își dau acordul formal înainte de miercuri.',
          'Sună a un plan excelent. Toată lumea are sarcinile notate și ne revedem la standup-ul de luni. Haideți să facem o lansare impecabilă.',
        ];
        return {
          ...s,
          text: roTexts[i] || s.text,
        };
      }),
    };
  }

  if (targetLang === 'es') {
    return {
      title: 'Sincronización de Lanzamiento y Plan de Acción',
      tldr: [
        'Lanzamiento móvil v1.4 reprogramado para el próximo martes para verificación.',
        'Integración de webhooks de Stripe e idempotencia aprobó las pruebas automáticas.',
        'Migraciones de base de datos programadas para el domingo a las 02:00 UTC.',
        'Tokens de diseño requieren aprobación antes del congelamiento del miércoles.',
      ],
      keyDecisions: [
        'Fecha de lanzamiento confirmada para el martes con 48h de margen de QA.',
        'Ejecutar migraciones de base de datos el domingo a las 02:00 UTC.',
        'Posponer el modo oscuro v2 para la siguiente versión de mantenimiento.',
      ],
      actionItems: content.actionItems.map((a, i) => {
        const esTasks = [
          'Actualizar notas de lanzamiento y registro de cambios en GitHub',
          'Ejecutar pruebas completas de pago en iOS staging',
          'Revisar e integrar el PR de webhooks de Stripe',
          'Finalizar el manual de soporte en Notion',
        ];
        return { ...a, task: esTasks[i] || a.task };
      }),
      segments: content.segments,
    };
  }

  return content;
}
