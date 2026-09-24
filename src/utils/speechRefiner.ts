/**
 * Helper to refine spoken/dictated text using the server-side Gemini API.
 */

export interface DictionaryEntry {
  phonetic: string[]; // Common phonetic/misspelled spoken variations from speech recognition
  correct: string;    // The correct brand name or product term
  category: string;   // Category for contextual organization
}

// Comprehensive custom dictionary for grocery shopping items and brand names (primarily PT-BR)
export const SHOPPING_DICTIONARY: DictionaryEntry[] = [
  // Cleaning / Laundry / Household
  { phonetic: ["o mo", "omo multiação", "homeo", "homo"], correct: "Omo", category: "Limpeza" },
  { phonetic: ["bombril", "bom bril", "bom brio", "bombrilco"], correct: "Bombril", category: "Limpeza" },
  { phonetic: ["ipe", "ipê", "detergente ipe", "detergente ipê"], correct: "Ypê", category: "Limpeza" },
  { phonetic: ["veja", "veja multiuso", "vexa"], correct: "Veja", category: "Limpeza" },
  { phonetic: ["tixan", "tixan ipe", "tichan"], correct: "Tixan", category: "Limpeza" },
  { phonetic: ["ariel", "ariel líquido"], correct: "Ariel", category: "Limpeza" },
  { phonetic: ["comfort", "confort", "confor"], correct: "Comfort", category: "Limpeza" },
  { phonetic: ["downy", "dauni", "daune"], correct: "Downy", category: "Limpeza" },
  { phonetic: ["brilhante", "sabonete brilhante"], correct: "Brilhante", category: "Limpeza" },
  { phonetic: ["vanish", "venis", "vanis", "venish"], correct: "Vanish", category: "Limpeza" },
  { phonetic: ["pato purificador", "pato de banheiro", "pato"], correct: "Pato", category: "Limpeza" },
  { phonetic: ["lysoform", "lisoforme", "lisoform"], correct: "Lysoform", category: "Limpeza" },
  { phonetic: ["colgate", "colgati", "pasta colgate", "pasta colgati"], correct: "Colgate", category: "Higiene" },
  { phonetic: ["sorriso", "pasta sorriso"], correct: "Sorriso", category: "Higiene" },
  { phonetic: ["gillette", "gilete", "gilet"], correct: "Gillette", category: "Higiene" },
  { phonetic: ["pampers", "fralda pampers"], correct: "Pampers", category: "Higiene" },
  { phonetic: ["huggin", "huggies", "hugis", "fralda huggies"], correct: "Huggies", category: "Higiene" },
  { phonetic: ["dove", "dofe", "sabonete dove"], correct: "Dove", category: "Higiene" },
  { phonetic: ["rexona", "desodorante rexona"], correct: "Rexona", category: "Higiene" },
  { phonetic: ["pantene", "xampu pantene", "shampoo pantene"], correct: "Pantene", category: "Higiene" },
  { phonetic: ["elseve", "elseeve", "shampoo elseve"], correct: "Elseve", category: "Higiene" },
  { phonetic: ["loreal", "l'oréal", "loreal paris"], correct: "L'Oréal", category: "Higiene" },
  { phonetic: ["sensodyne", "sensodine"], correct: "Sensodyne", category: "Higiene" },
  { phonetic: ["monange", "hidratante monange"], correct: "Monange", category: "Higiene" },
  { phonetic: ["palmolive", "palmolivi"], correct: "Palmolive", category: "Higiene" },
  { phonetic: ["nivea", "nívea"], correct: "Nívea", category: "Higiene" },

  // Food / Beverages / Matinais
  { phonetic: ["nescau", "nescal", "achocolatado nescau"], correct: "Nescau", category: "Alimentos" },
  { phonetic: ["toddy", "todi", "tody"], correct: "Toddy", category: "Alimentos" },
  { phonetic: ["danone", "danoninho", "iogurte danone"], correct: "Danone", category: "Alimentos" },
  { phonetic: ["qualy", "quali", "margarina quali", "margarina qualy"], correct: "Qualy", category: "Alimentos" },
  { phonetic: ["tang", "tangue", "suco tang", "suco tangue"], correct: "Tang", category: "Alimentos" },
  { phonetic: ["maionese réu mas", "maionese réumas", "maionese helmans", "maionese hellmans", "helmas", "hellmanns"], correct: "maionese Hellmann's", category: "Alimentos" },
  { phonetic: ["leite moça", "moça", "leite moço"], correct: "Leite Moça", category: "Alimentos" },
  { phonetic: ["itambe", "itambé", "leite itambé"], correct: "Itambé", category: "Alimentos" },
  { phonetic: ["nestle", "nestlé", "chocolate nestle"], correct: "Nestlé", category: "Alimentos" },
  { phonetic: ["garoto", "chocolate garoto"], correct: "Garoto", category: "Alimentos" },
  { phonetic: ["lacta", "chocolate lacta"], correct: "Lacta", category: "Alimentos" },
  { phonetic: ["sazon", "sazón", "tempero sazon"], correct: "Sazón", category: "Alimentos" },
  { phonetic: ["knorr", "knor", "quinor", "caldo knor", "caldo quinor"], correct: "Knorr", category: "Alimentos" },
  { phonetic: ["doriana", "margarina doriana"], correct: "Doriana", category: "Alimentos" },
  { phonetic: ["claybom", "cleibom"], correct: "Claybom", category: "Alimentos" },
  { phonetic: ["becel"], correct: "Becel", category: "Alimentos" },
  { phonetic: ["piraquê", "piraque", "biscoito piraque"], correct: "Piraquê", category: "Alimentos" },
  { phonetic: ["bauducco", "bauduco", "balduco"], correct: "Bauducco", category: "Alimentos" },
  { phonetic: ["mabel"], correct: "Mabel", category: "Alimentos" },
  { phonetic: ["marilan", "marila"], correct: "Marilan", category: "Alimentos" },
  { phonetic: ["renata", "macarrão renata"], correct: "Renata", category: "Alimentos" },
  { phonetic: ["adria", "macarrão adria"], correct: "Adria", category: "Alimentos" },
  { phonetic: ["barilla", "barila", "macarrão barilla"], correct: "Barilla", category: "Alimentos" },
  { phonetic: ["pilão", "pilao", "café pilão", "café pilao"], correct: "Pilão", category: "Alimentos" },
  { phonetic: ["melitta", "melita", "filtro melita"], correct: "Melitta", category: "Alimentos" },
  { phonetic: ["três corações", "tres coracoes", "café três corações"], correct: "Três Corações", category: "Alimentos" },
  { phonetic: ["coqueiro", "atum coqueiro", "sardinha coqueiro"], correct: "Coqueiro", category: "Alimentos" },
  { phonetic: ["gomes da costa", "gomes de costa"], correct: "Gomes da Costa", category: "Alimentos" },
  { phonetic: ["sadia", "presunto sadia", "salsicha sadia"], correct: "Sadia", category: "Alimentos" },
  { phonetic: ["perdigão", "perdigao", "salsicha perdigão"], correct: "Perdigão", category: "Alimentos" },
  { phonetic: ["seara", "presunto seara", "salsicha seara"], correct: "Seara", category: "Alimentos" },
  { phonetic: ["friboi", "carne friboi"], correct: "Friboi", category: "Alimentos" },
  { phonetic: ["panco", "pão panco"], correct: "Panco", category: "Alimentos" },
  { phonetic: ["pullman", "pulman", "pão pullman"], correct: "Pullman", category: "Alimentos" },
  { phonetic: ["wickbold", "uicbold", "pão wickbold"], correct: "Wickbold", category: "Alimentos" },
  { phonetic: ["activia", "ativa"], correct: "Activia", category: "Alimentos" },
  { phonetic: ["yakult", "iaqult", "jacult"], correct: "Yakult", category: "Alimentos" },
  { phonetic: ["vigor", "iogurte vigor"], correct: "Vigor", category: "Alimentos" },
  { phonetic: ["tirolez", "queijo tirolez"], correct: "Tirolez", category: "Alimentos" },
  { phonetic: ["polenghi", "polenguinho"], correct: "Polenghi", category: "Alimentos" },
  { phonetic: ["catupiry", "catupiri"], correct: "Catupiry", category: "Alimentos" },
  { phonetic: ["elegê", "elege", "leite elege"], correct: "Elegê", category: "Alimentos" },
  { phonetic: ["mococa", "leite condensado mococa"], correct: "Mococa", category: "Alimentos" },
  { phonetic: ["piracanjuba", "leite piracanjuba"], correct: "Piracanjuba", category: "Alimentos" },
  { phonetic: ["jussara", "leite jussara"], correct: "Jussara", category: "Alimentos" },
  { phonetic: ["shefa", "chefa"], correct: "Shefa", category: "Alimentos" },
  { phonetic: ["ninho", "leite ninho", "leite em pó ninho"], correct: "Ninho", category: "Alimentos" },
  { phonetic: ["molico", "leite molico", "molico desnatado"], correct: "Molico", category: "Alimentos" },
  { phonetic: ["quaker", "aveia quaker", "aveia queiquer"], correct: "Quaker", category: "Alimentos" },
  { phonetic: ["maizena", "maisena", "amido de milho maisena"], correct: "Maizena", category: "Alimentos" },
  { phonetic: ["royal", "fermento royal"], correct: "Royal", category: "Alimentos" },
  { phonetic: ["dona benta", "farinha dona benta"], correct: "Dona Benta", category: "Alimentos" },
  { phonetic: ["tio joão", "tio joao", "arroz tio joão"], correct: "Tio João", category: "Alimentos" },
  { phonetic: ["camil", "arroz camil", "feijão camil"], correct: "Camil", category: "Alimentos" },
  { phonetic: ["prato fino", "arroz prato fino"], correct: "Prato Fino", category: "Alimentos" },
  { phonetic: ["gallo", "azeite gallo"], correct: "Gallo", category: "Alimentos" },
  { phonetic: ["andorinha", "azeite andorinha"], correct: "Andorinha", category: "Alimentos" },
  { phonetic: ["liza", "óleo liza"], correct: "Liza", category: "Alimentos" },
  { phonetic: ["soya", "óleo soya"], correct: "Soya", category: "Alimentos" }
];

// Helper to escape regex special characters
const escapeRegExp = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Applies immediate local phonetic corrections based on the custom shopping dictionary.
 * This runs on the client-side to instantly correct highly recognizable phonetic errors.
 */
export const applyLocalDictionaryCorrections = (text: string): string => {
  if (!text || !text.trim()) return text;
  let corrected = text;

  // Iterate over each dictionary entry to perform replacement
  for (const entry of SHOPPING_DICTIONARY) {
    for (const phonetic of entry.phonetic) {
      if (phonetic.length < 2) continue; // Skip extremely short characters to prevent accidental matches
      
      // Build a case-insensitive regex matching complete words/phrases
      const regex = new RegExp(`\\b${escapeRegExp(phonetic)}\\b`, "gi");
      if (regex.test(corrected)) {
        corrected = corrected.replace(regex, entry.correct);
      }
    }
  }

  return corrected;
};

/**
 * Refines spoken/dictated text using the server-side Gemini API, passing the dictionary as context.
 */
export const refineSpeechText = async (text: string, lang: string): Promise<string> => {
  if (!text || !text.trim()) return "";

  // 1. Apply local immediate dictionary corrections first
  const preCorrectedText = applyLocalDictionaryCorrections(text);

  // System instruction specific to each language, optimized for high speed, beautiful articulation and native fluency
  let systemPrompt = "";
  if (lang === "pt-BR" || lang === "pt") {
    systemPrompt = 
      "Você é um revisor de texto e professor de português extremamente inteligente, gentil e atencioso. " +
      "O texto fornecido foi gerado via reconhecimento de voz e pode conter fala desorganizada, gaguejos, termos repetidos, erros graves de concordância, palavras mal pronunciadas ou trocadas, e vícios de linguagem repetitivos (como 'entendeu?', 'né?', 'tipo assim', 'sabe?', 'aí').\n\n" +
      "Sua missão é REESCREVER e POLIR a transcrição para que ela pareça ter sido dita por uma pessoa altamente fluente em português ou escrita por um professor de português, de forma elegante, clara, correta e natural. Siga estas diretrizes:\n" +
      "1. CORRIJA todos os erros de gramática, ortografia, concordância verbal/nominal e pontuação de forma impecável.\n" +
      "2. REMOVA repetições desnecessárias, gagueiras, palavras cortadas e vícios de linguagem repetitivos (como 'entendeu?', 'né?', 'sabe assim', 'tipo') que não agregam valor à frase.\n" +
      "3. REORGANIZE frases confusas, truncadas ou desconexas para que fiquem fluidas, lógicas, bem estruturadas e fáceis de ler.\n" +
      "4. PRESERVE INTEGRALMENTE a mensagem, as ideias centrais, o significado e os fatos descritos pelo usuário. Não resuma, não invente informações adicionais, não adicione comentários pessoais, nem explicações. Retorne APENAS o texto final polido e corrigido, sem aspas, sem introduções e sem notas explicativas.";
  } else if (lang === "es-ES" || lang === "es") {
    systemPrompt = 
      "Tu única tarea es actuar como un corrector y profesor de español experto, inteligente y atento. " +
      "El texto proporcionado fue generado mediante reconocimiento de voz y puede contener habla desorganizada, tartamudeos, términos repetidos, errores de concordancia o muletillas repetitivas (como '¿entiendes?', '¿no?', '¿sabes?', 'o sea', 'entonces').\n\n" +
      "Tu misión es REESCRIBIR y PULIR la transcripción para que parezca haber sido dicha por una persona altamente fluida en español, de manera clara, correcta, elegante y natural. Sigue estas pautas:\n" +
      "1. CORRIGE todos los errores de gramática, ortografía, concordancia y puntuación de manera impecable.\n" +
      "2. ELIMINA repeticiones innecesarias, tartamudeos, palabras cortadas y muletillas repetitivas que no agreguen valor a la oración.\n" +
      "3. REORGANIZA frases confusas, truncadas o inconexas para que sean fluidas, lógicas, bien estructuradas y fáciles de leer.\n" +
      "4. PRESERVA INTEGRALMENTE el mensaje, las ideas centrales y el significado del usuario. No resumas, no inventes información, no agregues comentarios personales ni explicaciones. Devuelve SOLO el texto pulido y corregido final, sin comillas ni notas.";
  } else {
    systemPrompt = 
      "You are an extremely intelligent, polite, and helpful text editor and language expert. " +
      "The input text was generated via speech recognition and may contain disorganized speech, stutters, repeated terms, severe grammatical/agreement errors, mispronounced words, or repetitive filler words (such as 'you know', 'right', 'like', 'understand?', 'so').\n\n" +
      "Your mission is to REWRITE and POLISH the transcription so that it reads as if spoken by a highly fluent, articulate native speaker, in an elegant, clear, correct, and natural manner. Follow these guidelines:\n" +
      "1. CORRECT all errors in grammar, spelling, verb agreement, and punctuation impeccably.\n" +
      "2. REMOVE unnecessary repetitions, stutters, cut-off words, and repetitive filler words that add no value to the sentence.\n" +
      "3. REORGANIZE confusing, truncated, or disjointed sentences so that they flow beautifully, logically, and are easy to read.\n" +
      "4. FULLY PRESERVE the core message, main ideas, and meaning intended by the user. Do not summarize, do not invent new information, and do not add personal comments or explanations. Return ONLY the final polished and corrected text, without quotes or footnotes.";
  }

  try {
    // 2. Call the backend Gemini endpoint, passing the dictionary and our precise systemPrompt
    const response = await fetch("/api/refine-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        text: preCorrectedText, 
        lang, 
        systemPrompt,
        customDictionary: SHOPPING_DICTIONARY 
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return data.correctedText || preCorrectedText;
  } catch (err) {
    console.error("Error refining speech with Gemini:", err);
    return preCorrectedText; // Fall back to the pre-corrected text on error
  }
};
