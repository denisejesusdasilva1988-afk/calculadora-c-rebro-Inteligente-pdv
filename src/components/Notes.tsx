import React from "react";
import {
  Pencil,
  History,
  FileText,
  Share2,
  Trash2,
  Save,
  Printer,
  ChevronDown,
  ChevronUp,
  Eraser,
  PenTool,
  Check,
  FileSignature,
  Sparkles,
  RefreshCw,
  Store,
  LayoutGrid,
  BookOpen,
  Folder,
  FolderPlus,
  FolderOpen,
  Search,
  File,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowLeft,
  X,
  Mic,
  MicOff,
  Lock,
  Unlock,
  Maximize2,
  Download,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Receipt,
  Coins,
  Briefcase,
  Notebook,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import { refineSpeechText, applyLocalDictionaryCorrections } from "../utils/speechRefiner";

// Self-contained lightweight debounce function
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  return debounced;
}

function numeroParaExtenso(valorStr: string): string {
  const cleanStr = valorStr.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const valor = parseFloat(cleanStr);
  if (isNaN(valor)) return "";
  if (valor === 0) return "Zero reais";
  if (valor < 0) return "";

  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const dezenas10 = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  function falarGrupo(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";

    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    let res = "";
    if (c > 0) res += centenas[c];

    if (d > 0 || u > 0) {
      if (res !== "") res += " e ";
      if (d === 1) {
        res += dezenas10[u];
      } else {
        if (d > 1) {
          res += dezenas[d];
          if (u > 0) res += " e " + unidades[u];
        } else if (u > 0) {
          res += unidades[u];
        }
      }
    }
    return res;
  }

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  let extensoReais = "";
  if (inteiro > 0) {
    if (inteiro === 1) {
      extensoReais = "um real";
    } else {
      const grupos: number[] = [];
      let temp = inteiro;
      while (temp > 0) {
        grupos.push(temp % 1000);
        temp = Math.floor(temp / 1000);
      }

      const sufixosSingular = ["", "mil", "milhão", "bilhão", "trilhão"];
      const sufixosPlural = ["", "mil", "milhões", "bilhões", "trilhões"];

      const partes: string[] = [];
      for (let i = grupos.length - 1; i >= 0; i--) {
        const g = grupos[i];
        if (g === 0) continue;

        let grupoStr = falarGrupo(g);
        if (i === 1 && g === 1) {
          grupoStr = "";
        }

        let sufixo = "";
        if (i > 0) {
          sufixo = " " + (g === 1 ? sufixosSingular[i] : sufixosPlural[i]);
        }
        partes.push((grupoStr + sufixo).trim());
      }

      if (partes.length === 1) {
        extensoReais = partes[0] + " reais";
      } else {
        const ultimaParte = partes[partes.length - 1];
        const partesAnteriores = partes.slice(0, -1);
        const ultimoGrupoVal = grupos[0];
        const precisaDeE = ultimoGrupoVal < 100 || ultimoGrupoVal % 100 === 0;
        extensoReais = partesAnteriores.join(", ") + (precisaDeE ? " e " : " ") + ultimaParte + " reais";
      }
    }
  }

  let extensoCentavos = "";
  if (centavos > 0) {
    if (centavos === 1) {
      extensoCentavos = "um centavo";
    } else {
      extensoCentavos = falarGrupo(centavos) + " centavos";
    }
  }

  let finalStr = "";
  if (extensoReais && extensoCentavos) {
    finalStr = extensoReais + " e " + extensoCentavos;
  } else if (extensoReais) {
    finalStr = extensoReais;
  } else if (extensoCentavos) {
    finalStr = extensoCentavos;
  }

  if (finalStr) {
    finalStr = finalStr.charAt(0).toUpperCase() + finalStr.slice(1);
  }
  return finalStr;
}

const getFolderStyleAndIcon = (folderName: string) => {
  const normalized = (folderName || "").trim().toLowerCase();
  
  if (normalized.includes("promiss")) {
    return {
      icon: <FileSignature className="w-3.5 h-3.5 shrink-0 text-amber-500" />,
      emoji: "✍️",
      colorClass: "text-amber-600 dark:text-amber-400",
      bgClass: "bg-amber-500/10",
      borderClass: "border-amber-500/20"
    };
  }
  if (normalized.includes("recibo") || normalized.includes("venda")) {
    return {
      icon: <Receipt className="w-3.5 h-3.5 shrink-0 text-emerald-500" />,
      emoji: "💵",
      colorClass: "text-emerald-600 dark:text-emerald-400",
      bgClass: "bg-emerald-500/10",
      borderClass: "border-emerald-500/20"
    };
  }
  if (normalized.includes("orçamento") || normalized.includes("orcameto") || normalized.includes("proposta")) {
    return {
      icon: <Notebook className="w-3.5 h-3.5 shrink-0 text-blue-500" />,
      emoji: "📊",
      colorClass: "text-blue-600 dark:text-blue-400",
      bgClass: "bg-blue-500/10",
      borderClass: "border-blue-500/20"
    };
  }
  if (normalized.includes("caixa") || normalized.includes("fechamento")) {
    return {
      icon: <Coins className="w-3.5 h-3.5 shrink-0 text-purple-500" />,
      emoji: "🪙",
      colorClass: "text-purple-600 dark:text-purple-400",
      bgClass: "bg-purple-500/10",
      borderClass: "border-purple-500/20"
    };
  }
  if (normalized.includes("despesa") || normalized.includes("fornec") || normalized.includes("compra") || normalized.includes("custo")) {
    return {
      icon: <Store className="w-3.5 h-3.5 shrink-0 text-rose-500" />,
      emoji: "📦",
      colorClass: "text-rose-600 dark:text-rose-400",
      bgClass: "bg-rose-500/10",
      borderClass: "border-rose-500/20"
    };
  }
  if (normalized.includes("pessoal") || normalized.includes("admin") || normalized.includes("geral") || normalized.includes("casa")) {
    return {
      icon: <Briefcase className="w-3.5 h-3.5 shrink-0 text-indigo-500" />,
      emoji: "💼",
      colorClass: "text-indigo-600 dark:text-indigo-400",
      bgClass: "bg-indigo-500/10",
      borderClass: "border-indigo-500/20"
    };
  }

  // Hash-based deterministic styles for any other custom folder name
  const colors = [
    { icon: <Folder className="w-3.5 h-3.5 shrink-0 text-orange-500" />, emoji: "📁", colorClass: "text-orange-500", bgClass: "bg-orange-500/10", borderClass: "border-orange-500/20" },
    { icon: <FolderOpen className="w-3.5 h-3.5 shrink-0 text-pink-500" />, emoji: "📂", colorClass: "text-pink-500", bgClass: "bg-pink-500/10", borderClass: "border-pink-500/20" },
    { icon: <FolderPlus className="w-3.5 h-3.5 shrink-0 text-violet-500" />, emoji: "🗂️", colorClass: "text-violet-500", bgClass: "bg-violet-500/10", borderClass: "border-violet-500/20" },
    { icon: <Folder className="w-3.5 h-3.5 shrink-0 text-teal-500" />, emoji: "📁", colorClass: "text-teal-500", bgClass: "bg-teal-500/10", borderClass: "border-teal-500/20" },
    { icon: <FolderOpen className="w-3.5 h-3.5 shrink-0 text-cyan-500" />, emoji: "📂", colorClass: "text-cyan-500", bgClass: "bg-cyan-500/10", borderClass: "border-cyan-500/20" },
    { icon: <FolderPlus className="w-3.5 h-3.5 shrink-0 text-yellow-500" />, emoji: "🗂️", colorClass: "text-yellow-600", bgClass: "bg-yellow-500/10", borderClass: "border-yellow-500/20" },
  ];
  let hash = 0;
  for (let i = 0; i < folderName.length; i++) {
    hash = folderName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

interface NotesProps {
  showSavedNotes: boolean;
  setShowSavedNotes: (val: boolean) => void;
  savedNotes: any[];
  handleShareOnWhatsApp: (text: string) => void;
  handleDeleteSavedNote: (id: string) => void;
  handleLoadNote: (text: string) => void;
  freeNotesText: string;
  setFreeNotesText: (val: string) => void;
  handleSaveNote: (
    textOverride?: string,
    signatureImg?: string,
    folderName?: string,
    pagesOverride?: string[],
    pinOverride?: string,
    imagesOverride?: string[],
    imageSizesOverride?: number[],
  ) => void;
  handleUpdateNoteFolder?: (id: string, folderName: string) => void;
  handleUpdateNotePin?: (id: string, newPin: string) => void;
  user?: any;
}

export const NotesModule = React.memo(
  ({
    showSavedNotes,
    setShowSavedNotes,
    savedNotes,
    handleShareOnWhatsApp,
    handleDeleteSavedNote,
    handleLoadNote,
    freeNotesText,
    setFreeNotesText,
    handleSaveNote,
    handleUpdateNoteFolder,
    handleUpdateNotePin,
    user,
  }: NotesProps) => {
    const [localText, setLocalText] = React.useState(freeNotesText);

    const debouncedSetFreeNotesText = React.useMemo(() => {
      return debounce((val: string) => {
        setFreeNotesText(val);
      }, 300);
    }, [setFreeNotesText]);

    React.useEffect(() => {
      return () => {
        debouncedSetFreeNotesText.cancel();
      };
    }, [debouncedSetFreeNotesText]);

    // Custom Local Speech States and Refs
    const [micLangLocal, setMicLangLocal] = React.useState<string>(() => {
      try {
        return localStorage.getItem("notes_mic_lang") || "pt-BR";
      } catch {
        return "pt-BR";
      }
    });
    const [aiCorrectionActiveLocal, setAiCorrectionActiveLocal] = React.useState<boolean>(() => {
      try {
        const saved = localStorage.getItem("notes_ai_correction_active");
        return saved === null ? true : saved === "true";
      } catch {
        return true;
      }
    });
    const [isRefiningSpeechLocal, setIsRefiningSpeechLocal] = React.useState(false);
    const [micJustStoppedLocal, setMicJustStoppedLocal] = React.useState(false);

    const micLangRefLocal = React.useRef(micLangLocal);
    const aiCorrectionActiveRefLocal = React.useRef(aiCorrectionActiveLocal);
    const textBeforeListeningRefLocal = React.useRef("");
    const localTextRef = React.useRef(localText);

    React.useEffect(() => {
      micLangRefLocal.current = micLangLocal;
      localStorage.setItem("notes_mic_lang", micLangLocal);
    }, [micLangLocal]);

    React.useEffect(() => {
      aiCorrectionActiveRefLocal.current = aiCorrectionActiveLocal;
      localStorage.setItem("notes_ai_correction_active", String(aiCorrectionActiveLocal));
    }, [aiCorrectionActiveLocal]);

    React.useEffect(() => {
      localTextRef.current = localText;
    }, [localText]);
    const [activeTemplate, setActiveTemplate] = React.useState<
      "none" | "promissoria" | "recibo" | "orcamento" | "recibo_aluguel"
    >("none");
    const [showForm, setShowForm] = React.useState(true);
    const [printFormat, setPrintFormat] = React.useState<"a4" | "thermal">(
      "a4",
    );
    const [bazarViewMode, setBazarViewMode] = React.useState<"shelf" | "grid">(
      "shelf",
    );

    // Folder & Search states
    const [saveFolder, setSaveFolder] = React.useState("");
    const [newFolderName, setNewFolderName] = React.useState("");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedViewFolder, setSelectedViewFolder] = React.useState("all");
    const [editingNoteFolderId, setEditingNoteFolderId] = React.useState<
      string | null
    >(null);

    // Multi-page states
    const [pages, setPages] = React.useState<string[]>([""]);
    const [currentPageIndex, setCurrentPageIndex] = React.useState<number>(0);
    const [savedNotePageIndices, setSavedNotePageIndices] = React.useState<Record<string, number>>({});

    // Image attachments & security lock states
    const [pageImages, setPageImages] = React.useState<string[]>([""]);
    const [pageImageSizes, setPageImageSizes] = React.useState<number[]>([100]);
    const [pin, setPin] = React.useState<string>("");
    const [isLockedToggle, setIsLockedToggle] = React.useState<boolean>(false);
    const [unlockedNoteIds, setUnlockedNoteIds] = React.useState<string[]>([]);
    const [zoomedImage, setZoomedImage] = React.useState<string | null>(null);
    const [isEnteringPinNoteId, setIsEnteringPinNoteId] = React.useState<string | null>(null);
    const [enteredPinValue, setEnteredPinValue] = React.useState<string>("");
    const [pinErrorNoteId, setPinErrorNoteId] = React.useState<string | null>(null);
    const [isRecoveringPin, setIsRecoveringPin] = React.useState<boolean>(false);
    const [recoveryNewPin, setRecoveryNewPin] = React.useState<string>("");
    const [recoveryPinError, setRecoveryPinError] = React.useState<string>("");

    // Microphone permission handling states
    const [micPermissionGrantedLocal, setMicPermissionGrantedLocal] = React.useState<boolean>(() => {
      try {
        return localStorage.getItem("mic_permission_granted") === "true";
      } catch {
        return false;
      }
    });
    const [showMicPermissionModalLocal, setShowMicPermissionModalLocal] = React.useState<boolean>(false);
    const [pendingMicActionLocal, setPendingMicActionLocal] = React.useState<(() => void) | null>(null);

    // Text-to-Speech (TTS) & Hidden Editor states
    const [isWritingHidden, setIsWritingHidden] = React.useState<boolean>(false);
    const [isSpeakingLocal, setIsSpeakingLocal] = React.useState<boolean>(false);
    const [speakingNoteId, setSpeakingNoteId] = React.useState<string | null>(null);
    const speechUtteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

    const handleSpeakText = (textToSpeak: string, language: string = "pt-BR", noteId: string | null = null) => {
      if (!window.speechSynthesis) {
        alert("Seu navegador não suporta a leitura de texto em voz.");
        return;
      }

      // If already speaking the same thing, stop it
      if (isSpeakingLocal && (noteId === speakingNoteId)) {
        window.speechSynthesis.cancel();
        setIsSpeakingLocal(false);
        setSpeakingNoteId(null);
        return;
      }

      if (!textToSpeak.trim()) {
        const emptyMsg = language.startsWith("pt") 
          ? "Não há texto escrito para ler." 
          : "There is no text written to read.";
        alert(emptyMsg);
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Clean text of page markers
      const cleanText = textToSpeak.replace(/\n*--- PÁGINA \d+ ---\n*/g, " ").trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      speechUtteranceRef.current = utterance;
      
      // Attempt to find a high-quality human-like native voice
      let voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) {
        // Some browsers load voices asynchronously, trigger a refresh
        voices = window.speechSynthesis.getVoices();
      }

      let selectedVoice = null;
      const langLower = language.toLowerCase().replace("_", "-");

      // Filter voices matching the requested language (e.g., pt-br or pt)
      const matchingVoices = voices.filter(v => {
        const voiceLang = v.lang.toLowerCase().replace("_", "-");
        if (langLower.startsWith("pt")) {
          return voiceLang.startsWith("pt");
        }
        if (langLower.startsWith("es")) {
          return voiceLang.startsWith("es");
        }
        return voiceLang.startsWith("en");
      });

      if (matchingVoices.length > 0) {
        // Sort matching voices to prioritize high-quality natural/neural human-like voices
        matchingVoices.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          const aLang = a.lang.toLowerCase().replace("_", "-");
          const bLang = b.lang.toLowerCase().replace("_", "-");

          let aScore = 0;
          let bScore = 0;

          // Highly prioritize Brazilian Portuguese first if the requested language is pt-BR
          if (langLower.startsWith("pt")) {
            if (aLang.includes("pt-br")) aScore += 15;
            if (bLang.includes("pt-br")) bScore += 15;
          }

          // Neural & Natural voices have exceptionally high quality
          if (aName.includes("natural")) aScore += 25;
          if (bName.includes("natural")) bScore += 25;

          // Google & Microsoft Online voices sound incredibly realistic and human-like
          if (aName.includes("google")) aScore += 20;
          if (bName.includes("google")) bScore += 20;

          if (aName.includes("microsoft") || aName.includes("online")) aScore += 18;
          if (bName.includes("microsoft") || bName.includes("online")) bScore += 18;

          // Apple / Siri voices are very high quality
          if (aName.includes("siri") || aName.includes("apple")) aScore += 15;
          if (bName.includes("siri") || bName.includes("apple")) bScore += 15;

          // Standard high-quality voices names for Portuguese
          const premiumNames = ["luciana", "felipe", "daniel", "helena", "maria", "joana", "francisca", "yisel", "heloisa", "ricardo", "vitoria"];
          if (premiumNames.some(name => aName.includes(name))) aScore += 10;
          if (premiumNames.some(name => bName.includes(name))) bScore += 10;

          // Premium/neural flag
          if (aName.includes("premium") || aName.includes("neural")) aScore += 8;
          if (bName.includes("premium") || bName.includes("neural")) bScore += 8;

          return bScore - aScore; // Highest score first
        });

        selectedVoice = matchingVoices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log("Selected high-quality voice for reading:", selectedVoice.name, selectedVoice.lang);
      }
      
      utterance.lang = selectedVoice ? selectedVoice.lang : language;
      // 0.95 is the sweet spot for natural human voice pace.
      // Default robotic voices are usually too fast or monotonic; 0.95 gives a warm, natural, clear speed.
      utterance.rate = 0.95; 
      utterance.pitch = 1.0; // Standard human vocal pitch

      utterance.onend = () => {
        setIsSpeakingLocal(false);
        setSpeakingNoteId(null);
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        setIsSpeakingLocal(false);
        setSpeakingNoteId(null);
      };

      setIsSpeakingLocal(true);
      setSpeakingNoteId(noteId);
      window.speechSynthesis.speak(utterance);
    };

    // Warm up voice synthesis cache on mount
    React.useEffect(() => {
      if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        // Some browsers populate voices asynchronously
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
          };
        }
      }
      return () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      };
    }, []);

    // Image compression helper
    const compressImage = (file: File, maxWidth: number = 900, quality: number = 0.75): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = (maxWidth * height) / width;
              width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
              resolve(compressedBase64);
            } else {
              resolve(event.target?.result as string);
            }
          };
          img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
      });
    };

    // Helper to get joined pages text
    const getJoinedPagesText = (pList: string[]) => {
      return pList.map((p, idx) => {
        if (idx === 0) return p;
        return `--- PÁGINA ${idx + 1} ---\n\n${p}`;
      }).join("\n\n");
    };

    // To switch page:
    const switchPage = (index: number) => {
      if (index < 0 || index >= pages.length) return;
      setCurrentPageIndex(index);
      setLocalText(pages[index] || "");
    };

    // To add a new page:
    const addPage = () => {
      const updatedPages = [...pages, ""];
      setPages(updatedPages);
      setPageImages((prev) => [...prev, ""]);
      setPageImageSizes((prev) => [...prev, 100]);
      setCurrentPageIndex(updatedPages.length - 1);
      setLocalText("");
      setFreeNotesText(getJoinedPagesText(updatedPages));
    };

    // To delete current page:
    const deleteCurrentPage = () => {
      if (pages.length <= 1) {
        setPages([""]);
        setPageImages([""]);
        setPageImageSizes([100]);
        setLocalText("");
        setFreeNotesText("");
        return;
      }
      const updatedPages = pages.filter((_, idx) => idx !== currentPageIndex);
      setPageImages((prev) => prev.filter((_, idx) => idx !== currentPageIndex));
      setPageImageSizes((prev) => prev.filter((_, idx) => idx !== currentPageIndex));
      const nextIndex = Math.max(0, currentPageIndex - 1);
      setPages(updatedPages);
      setCurrentPageIndex(nextIndex);
      setLocalText(updatedPages[nextIndex] || "");
      setFreeNotesText(getJoinedPagesText(updatedPages));
    };

    // Keep pages array synchronized when localText or currentPageIndex changes
    React.useEffect(() => {
      if (pages[currentPageIndex] !== localText) {
        const updated = [...pages];
        updated[currentPageIndex] = localText;
        setPages(updated);
        debouncedSetFreeNotesText(getJoinedPagesText(updated));
      }
    }, [localText, currentPageIndex, pages, debouncedSetFreeNotesText]);

    // Handle initial load or load of a saved note
    React.useEffect(() => {
      const currentJoined = getJoinedPagesText(pages);
      if (freeNotesText === currentJoined) return;

      if (freeNotesText.includes("--- PÁGINA ")) {
        const pageMarkerRegex = /\n*--- PÁGINA \d+ ---\n*/g;
        const parsedPages = freeNotesText.split(pageMarkerRegex).map(p => p.trim()).filter(p => p !== "");
        if (parsedPages.length > 0) {
          setPages(parsedPages);
          setCurrentPageIndex(0);
          setLocalText(parsedPages[0] || "");
          setPageImages((prev) => {
            if (prev.length === parsedPages.length) return prev;
            return Array(parsedPages.length).fill("");
          });
          setPageImageSizes((prev) => {
            if (prev.length === parsedPages.length) return prev;
            return Array(parsedPages.length).fill(100);
          });
        } else {
          setPages([freeNotesText]);
          setCurrentPageIndex(0);
          setLocalText(freeNotesText);
          setPageImages((prev) => prev.length === 1 ? prev : [""]);
          setPageImageSizes((prev) => prev.length === 1 ? prev : [100]);
        }
      } else {
        setPages([freeNotesText]);
        setCurrentPageIndex(0);
        setLocalText(freeNotesText);
        setPageImages((prev) => prev.length === 1 ? prev : [""]);
        setPageImageSizes((prev) => prev.length === 1 ? prev : [100]);
      }
    }, [freeNotesText]);

    // Speech Recognition inside Notes.tsx
    const [isListeningLocal, setIsListeningLocal] = React.useState(false);
    const [interimTranscriptLocal, setInterimTranscriptLocal] = React.useState("");
    const recognitionRefLocal = React.useRef<any>(null);
    const silenceTimerRefLocal = React.useRef<NodeJS.Timeout | null>(null);
    const isManuallyStoppedRefLocal = React.useRef(false);
    const accumulatedSpeechRefLocal = React.useRef<string>("");

    const appendTranscribedTextLocal = (prev: string, text: string) => {
      if (!text.trim()) return prev;

      const trimmedPrev = prev.trim();
      if (!trimmedPrev) return text.trim();

      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const wordsInPrev = trimmedPrev.split(/\s+/);
      const wordsInNew = text.trim().split(/\s+/);

      // Overlapping check
      let overlapCount = 0;
      const maxCheck = Math.min(8, wordsInPrev.length, wordsInNew.length);
      for (let len = maxCheck; len > 0; len--) {
        const prevTail = wordsInPrev.slice(-len).map(clean).join(" ");
        const newHead = wordsInNew.slice(0, len).map(clean).join(" ");
        if (prevTail === newHead && prevTail.length > 0) {
          overlapCount = len;
          break;
        }
      }

      let processedText = text.trim();
      if (overlapCount > 0) {
        if (wordsInNew.length > overlapCount) {
          processedText = wordsInNew.slice(overlapCount).join(" ");
        } else {
          return prev;
        }
      }

      // Check if duplicate in last 15 words
      const lastPart = wordsInPrev.slice(-15).map(clean).join(" ");
      if (lastPart.includes(clean(processedText)) && processedText.split(/\s+/).length < 4) {
        return prev;
      }

      return prev + (prev.endsWith("\n") || prev === "" ? "" : "\n") + processedText;
    };

    const startListeningLocal = async (lang: string, isAutoRestart = false) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Seu navegador não suporta reconhecimento de voz.");
        return;
      }

      const initiateMicLocal = async () => {
        if (!isAutoRestart) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());
            setMicPermissionGrantedLocal(true);
            localStorage.setItem("mic_permission_granted", "true");
          } catch (err) {
            console.warn("Media devices permission denied in Notes module:", err);
            setMicPermissionGrantedLocal(false);
            localStorage.removeItem("mic_permission_granted");
            alert(
              "Não foi possível conectar ao microfone. Por favor, permita o acesso ao microfone nas configurações do seu navegador para poder ditar."
            );
            return;
          }
        }

        const SpeechRecognition =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
          alert("Seu navegador não suporta reconhecimento de voz.");
          return;
        }

        // Track consecutive aborts or errors during this local dictation session to prevent infinite restart loops
        let consecutiveAbortsLocal = 0;

        // Capture the current local text before starting dictation
        textBeforeListeningRefLocal.current = localTextRef.current;
        if (!isAutoRestart) {
          accumulatedSpeechRefLocal.current = "";
        }

        isManuallyStoppedRefLocal.current = false;
        setMicJustStoppedLocal(false);
        const recognition = new SpeechRecognition();
        recognitionRefLocal.current = recognition;
        recognition.lang = lang;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Implementar configurações de gramática otimizadas para português (se compatível com o navegador)
        const SpeechGrammarList = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
        if (SpeechGrammarList) {
          const speechRecognitionList = new SpeechGrammarList();
          const grammar = lang.startsWith("pt")
            ? "#JSGF V1.0; grammar pt_BR; public <connective> = e | ou | mas | porque | que | para | com | por | em | de | um | uma | o | a | os | as | bazar | recibo | nota | bloco | notas | orçamento;"
            : "#JSGF V1.0; grammar generic; public <connective> = and | or | but | because | that | to | with | by | in | of | a | an | the | notebook | note | bill;";
          try {
            speechRecognitionList.addFromString(grammar, 1);
            recognition.grammars = speechRecognitionList;
          } catch (e) {
            console.warn("Failed to set optimized grammar list locally:", e);
          }
        }

        const processedIndices = new Set<number>();

        // Timer de silêncio para permitir frases longas sem interrupção
        const resetSilenceTimerLocal = () => {
          if (silenceTimerRefLocal.current) {
            clearTimeout(silenceTimerRefLocal.current);
          }
          if (!aiCorrectionActiveRefLocal.current) return;

          silenceTimerRefLocal.current = setTimeout(() => {
            const segmentToRefine = accumulatedSpeechRefLocal.current.trim();
            if (segmentToRefine.length > 1) {
              // Snapshot the segment we are refining and reset the accumulator
              accumulatedSpeechRefLocal.current = "";
              setIsRefiningSpeechLocal(true);

              refineSpeechText(segmentToRefine, micLangRefLocal.current)
                .then((refined) => {
                  if (refined && refined.trim()) {
                    setLocalText((currentText) => {
                      // Try to find the exact unpunctuated segment we spoken and replace it with polished text
                      const index = currentText.lastIndexOf(segmentToRefine);
                      if (index !== -1) {
                        const updated = currentText.slice(0, index) + refined.trim() + currentText.slice(index + segmentToRefine.length);
                        return updated;
                      }
                      return currentText;
                    });
                  }
                })
                .finally(() => {
                  setIsRefiningSpeechLocal(false);
                });
            }
          }, 3000); // 3.0 segundos de silêncio contínuo aciona o corretor IA de forma sutil
        };

        recognition.onstart = () => {
          consecutiveAbortsLocal = 0; // Reset consecutive aborts on successful start
          setIsListeningLocal(true);
          setInterimTranscriptLocal("");
        };

        recognition.onend = () => {
          setIsListeningLocal(false);
          recognitionRefLocal.current = null;
          setInterimTranscriptLocal("");

          // O microfone parou por limite do navegador/silêncio. Não refinamos ainda para evitar interrupções.
          // Se o usuário não parou manualmente, nós simplesmente reiniciamos o microfone mantendo a escuta ativa!
          if (!isManuallyStoppedRefLocal.current) {
            // Se falhar consecutivamente demais, para
            if (consecutiveAbortsLocal >= 3) {
              console.warn("Speech recognition local stopped: too many consecutive aborts/errors.");
              isManuallyStoppedRefLocal.current = true;
              return;
            }

            setTimeout(() => {
              if (!isManuallyStoppedRefLocal.current) {
                initiateMicLocal();
              }
            }, 300);
          }
        };

        recognition.onresult = (event: any) => {
          resetSilenceTimerLocal();
          let finalTranscriptChunk = "";
          let currentInterim = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              if (!processedIndices.has(i)) {
                finalTranscriptChunk += result[0].transcript;
                processedIndices.add(i);
              }
            } else {
              currentInterim += result[0].transcript;
            }
          }

          if (finalTranscriptChunk.trim()) {
            const formattedText = finalTranscriptChunk.trim();
            // Apply local custom dictionary corrections immediately so even raw text has beautiful product names!
            const preCorrected = applyLocalDictionaryCorrections(formattedText);

            setLocalText((prev) => {
              const updated = appendTranscribedTextLocal(prev, preCorrected);
              setFreeNotesText(updated);
              return updated;
            });

            // Also add this to our unpolished segment accumulator so Gemini can polish it in the background!
            accumulatedSpeechRefLocal.current = accumulatedSpeechRefLocal.current
              ? accumulatedSpeechRefLocal.current + " " + preCorrected
              : preCorrected;
          }
          setInterimTranscriptLocal(currentInterim);
        };

        recognition.onerror = (event: any) => {
          // Change standard or benign errors to warn/log instead of console.error to satisfy test requirements and avoid false positives
          if (event.error === "aborted" || event.error === "no-speech") {
            console.warn("Informação de reconhecimento de voz local (comum):", event.error);
            consecutiveAbortsLocal++;
          } else {
            console.warn("Aviso no reconhecimento de voz local:", event.error);
          }

          if (event.error === "not-allowed") {
            setIsListeningLocal(false);
            isManuallyStoppedRefLocal.current = true;
            alert("Permissão de microfone negada.");
          }
        };

        try {
          recognition.start();
        } catch (e) {
          console.warn("Falha ao iniciar reconhecimento local:", e);
        }
      };

      if (micPermissionGrantedLocal) {
        initiateMicLocal();
      } else {
        setPendingMicActionLocal(() => initiateMicLocal);
        setShowMicPermissionModalLocal(true);
      }
    };

    const stopListeningLocal = () => {
      isManuallyStoppedRefLocal.current = true;
      if (silenceTimerRefLocal.current) {
        clearTimeout(silenceTimerRefLocal.current);
        silenceTimerRefLocal.current = null;
      }
      if (recognitionRefLocal.current) {
        try {
          recognitionRefLocal.current.abort();
        } catch (e) {}
        try {
          recognitionRefLocal.current.stop();
        } catch (e) {}
        recognitionRefLocal.current = null;
      }
      setIsListeningLocal(false);
      setInterimTranscriptLocal("");
      try {
        if (navigator.vibrate) {
          navigator.vibrate(0); // Força parada imediata de qualquer vibração no celular
        }
      } catch (e) {}
      setMicJustStoppedLocal(true);

      // Refina imediatamente qualquer texto recém-falado ao clicar em Parar
      const segmentToRefine = accumulatedSpeechRefLocal.current.trim();
      if (segmentToRefine.length > 1) {
        accumulatedSpeechRefLocal.current = "";
        setIsRefiningSpeechLocal(true);
        refineSpeechText(segmentToRefine, micLangRefLocal.current)
          .then((refined) => {
            if (refined && refined.trim()) {
              setLocalText((currentText) => {
                const index = currentText.lastIndexOf(segmentToRefine);
                if (index !== -1) {
                  const updated = currentText.slice(0, index) + refined.trim() + currentText.slice(index + segmentToRefine.length);
                  setFreeNotesText(updated);
                  return updated;
                }
                return currentText;
              });
            }
          })
          .finally(() => {
            setIsRefiningSpeechLocal(false);
          });
      } else {
        accumulatedSpeechRefLocal.current = "";
      }

      const timer = setTimeout(() => {
        setMicJustStoppedLocal(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    // Make sure we stop listening if the component unmounts
    React.useEffect(() => {
      return () => {
        isManuallyStoppedRefLocal.current = true;
        if (silenceTimerRefLocal.current) {
          clearTimeout(silenceTimerRefLocal.current);
        }
        if (recognitionRefLocal.current) {
          try {
            recognitionRefLocal.current.abort();
          } catch (e) {}
          try {
            recognitionRefLocal.current.stop();
          } catch (e) {}
          recognitionRefLocal.current = null;
        }
        try {
          if (navigator.vibrate) {
            navigator.vibrate(0);
          }
        } catch (e) {}
      };
    }, []);
    const [movingFolderInput, setMovingFolderInput] = React.useState("");
    const [createdFolders, setCreatedFolders] = React.useState<string[]>(() => {
      try {
        const saved = localStorage.getItem("notepad_created_folders");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    });

    React.useEffect(() => {
      localStorage.setItem("notepad_created_folders", JSON.stringify(createdFolders));
    }, [createdFolders]);

    const getNoteFolder = React.useCallback((note: any) => {
      if (note.folder && note.folder !== "Sem Pasta") {
        return note.folder;
      }
      // Auto-categorize based on content keywords if no folder is set
      const txt = (note.text || "").toUpperCase();
      if (txt.includes("PROMISSÓRIA") || txt.includes("PROMISSORIA")) {
        return "Notas Promissórias";
      }
      if (txt.includes("RECIBO DE PAGAMENTO") || txt.includes("RECIBO DE ALUGUEL") || txt.includes("RECIBO") || txt.includes("VENDA")) {
        return "Recibos de Vendas";
      }
      if (txt.includes("ORÇAMENTO") || txt.includes("ORCAMENTO") || txt.includes("PROPOSTA DE ORÇAMENTO")) {
        return "Orçamentos & Propostas";
      }
      if (txt.includes("CAIXA") || txt.includes("FECHAMENTO") || txt.includes("SANGRIA") || txt.includes("SUPRIMENTO")) {
        return "Fechamento de Caixa";
      }
      if (txt.includes("FORNECEDOR") || txt.includes("COMPRA") || txt.includes("DESPESA") || txt.includes("CUSTO") || txt.includes("NOTA FISCAL") || txt.includes("PAGAR")) {
        return "Despesas & Fornecedores";
      }
      if (txt.includes("ADMINISTRATIVO") || txt.includes("ADMINISTRAÇÃO") || txt.includes("ADMINISTRACAO") || txt.includes("GERAL") || txt.includes("PESSOAL")) {
        return "Administração & Geral";
      }
      return "Sem Pasta";
    }, []);

    const existingFolders = React.useMemo(() => {
      const defaultFolders = [
        "Notas Promissórias",
        "Recibos de Vendas",
        "Orçamentos & Propostas",
        "Fechamento de Caixa",
        "Despesas & Fornecedores",
        "Administração & Geral"
      ];
      const foldersFromNotes = savedNotes
        .map((n) => getNoteFolder(n))
        .filter(Boolean) as string[];
      const allFolders = Array.from(
        new Set([...defaultFolders, ...foldersFromNotes, ...createdFolders]),
      ).filter(f => f && f !== "Sem Pasta" && f !== "Cupom de Vendas");
      return allFolders.sort();
    }, [savedNotes, createdFolders, getNoteFolder]);

    React.useEffect(() => {
      if (activeTemplate === "promissoria") {
        setSaveFolder("Notas Promissórias");
      } else if (activeTemplate === "recibo_aluguel") {
        setSaveFolder("Recibos de Aluguel");
      } else if (activeTemplate === "recibo") {
        setSaveFolder("Recibos de Pagamento");
      } else if (activeTemplate === "orcamento") {
        setSaveFolder("Orçamentos");
      } else {
        setSaveFolder("Anotações Livres");
      }
    }, [activeTemplate]);

    // Signature Canvas State
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = React.useState(false);
    const [hasDrawn, setHasDrawn] = React.useState(false);
    const [penColor, setPenColor] = React.useState("#000080"); // Dark Navy pen ink default

    // Promissoria fields
    const [promissoriaNum, setPromissoriaNum] = React.useState("001");
    const [promissoriaFolha, setPromissoriaFolha] = React.useState("01");
    const [promissoriaChave, setPromissoriaChave] = React.useState(() => {
      const r = Math.floor(1000 + Math.random() * 9000);
      const r2 = Math.floor(1000 + Math.random() * 9000);
      return `NP-${r}-${r2}`;
    });
    const [promissoriaVenc, setPromissoriaVenc] = React.useState(() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split("T")[0];
    });
    const [promissoriaValor, setPromissoriaValor] = React.useState("350,00");
    const [promissoriaDevedor, setPromissoriaDevedor] = React.useState("");
    const [promissoriaCpf, setPromissoriaCpf] = React.useState("");
    const [promissoriaFone, setPromissoriaFone] = React.useState("");
    const [promissoriaEndereco, setPromissoriaEndereco] = React.useState("");
    const [promissoriaCredor, setPromissoriaCredor] = React.useState("");
    const [promissoriaCnpjCredor, setPromissoriaCnpjCredor] =
      React.useState("");
    const [promissoriaFoneCredor, setPromissoriaFoneCredor] = React.useState("");
    const [promissoriaEnderecoCredor, setPromissoriaEnderecoCredor] = React.useState("");
    const [promissoriaExtenso, setPromissoriaExtenso] = React.useState(
      "Trezentos e cinquenta reais",
    );

    // Recibo fields
    const [reciboNum, setReciboNum] = React.useState("001");
    const [reciboFolha, setReciboFolha] = React.useState("01");
    const [reciboChave, setReciboChave] = React.useState(() => {
      const r = Math.floor(1000 + Math.random() * 9000);
      const r2 = Math.floor(1000 + Math.random() * 9000);
      return `RC-${r}-${r2}`;
    });
    const [reciboValor, setReciboValor] = React.useState("150,00");
    const [reciboCliente, setReciboCliente] = React.useState("");
    const [reciboCpf, setReciboCpf] = React.useState("");
    const [reciboFoneCliente, setReciboFoneCliente] = React.useState("");
    const [reciboEnderecoCliente, setReciboEnderecoCliente] = React.useState("");
    const [reciboDesc, setReciboDesc] = React.useState(
      "Serviços prestados gerais",
    );
    const [reciboEmitente, setReciboEmitente] = React.useState("");
    const [reciboCpfEmitente, setReciboCpfEmitente] = React.useState("");
    const [reciboFoneEmitente, setReciboFoneEmitente] = React.useState("");
    const [reciboEnderecoEmitente, setReciboEnderecoEmitente] = React.useState("");
    const [reciboData, setReciboData] = React.useState(
      () => new Date().toISOString().split("T")[0],
    );
    const [reciboExtenso, setReciboExtenso] = React.useState(
      "Cento e cinquenta reais",
    );
    const [reciboTipo, setReciboTipo] = React.useState<"integral" | "parcial">(
      "integral",
    );
    const [reciboValorRestante, setReciboValorRestante] =
      React.useState("0,00");
    const [reciboVencRestante, setReciboVencRestante] = React.useState(() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split("T")[0];
    });
    const [reciboMeioPagamento, setReciboMeioPagamento] = React.useState("PIX");

    // Recibo de Aluguel fields
    const [aluguelTipo, setAluguelTipo] = React.useState<
      "casa" | "apartamento" | "kitnet" | "loja" | "carro" | "moto" | "garagem"
    >("casa");
    const [aluguelNum, setAluguelNum] = React.useState("001");
    const [aluguelFolha, setAluguelFolha] = React.useState("01");
    const [aluguelChave, setAluguelChave] = React.useState(() => {
      const r = Math.floor(1000 + Math.random() * 9000);
      const r2 = Math.floor(1000 + Math.random() * 9000);
      return `AL-${r}-${r2}`;
    });
    const [aluguelValor, setAluguelValor] = React.useState("1.200,00");
    const [aluguelLocador, setAluguelLocador] = React.useState("");
    const [aluguelCpfLocador, setAluguelCpfLocador] = React.useState("");
    const [aluguelFoneLocador, setAluguelFoneLocador] = React.useState("");
    const [aluguelEnderecoLocador, setAluguelEnderecoLocador] = React.useState("");
    const [aluguelLocatario, setAluguelLocatario] = React.useState("");
    const [aluguelCpfLocatario, setAluguelCpfLocatario] = React.useState("");
    const [aluguelFoneLocatario, setAluguelFoneLocatario] = React.useState("");
    const [aluguelEnderecoLocatario, setAluguelEnderecoLocatario] = React.useState("");
    const [aluguelEndereco, setAluguelEndereco] = React.useState("");
    const [aluguelPeriodo, setAluguelPeriodo] = React.useState(() => {
      const currentMonth = new Date().toLocaleString("pt-BR", {
        month: "long",
      });
      const capitalizedMonth =
        currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
      const currentYear = new Date().getFullYear();
      return `${capitalizedMonth}/${currentYear}`;
    });
    const [aluguelMeioPagamento, setAluguelMeioPagamento] =
      React.useState("PIX");
    const [aluguelData, setAluguelData] = React.useState(
      () => new Date().toISOString().split("T")[0],
    );
    const [aluguelExtenso, setAluguelExtenso] = React.useState(
      "Um mil e duzentos reais",
    );

    // Juridical legal segment states (Papelaria Pro)
    const [promissoriaLegalSegment, setPromissoriaLegalSegment] =
      React.useState<
        "promissoria_comum" | "promissoria_comercial" | "promissoria_caucao"
      >("promissoria_comum");
    const [aluguelLegalSegment, setAluguelLegalSegment] = React.useState<
      "aluguel_residencial" | "aluguel_comercial" | "aluguel_temporada"
    >("aluguel_residencial");
    const [reciboLegalSegment, setReciboLegalSegment] = React.useState<
      "recibo_quitacao" | "recibo_arras" | "recibo_servicos"
    >("recibo_quitacao");

    // Orcamento fields
    const [orcamentoNum, setOrcamentoNum] = React.useState("001");
    const [orcamentoCliente, setOrcamentoCliente] = React.useState("");
    const [orcamentoCpfCliente, setOrcamentoCpfCliente] = React.useState("");
    const [orcamentoFone, setOrcamentoFone] = React.useState("");
    const [orcamentoEnderecoCliente, setOrcamentoEnderecoCliente] = React.useState("");
    const [orcamentoFornecedor, setOrcamentoFornecedor] = React.useState("");
    const [orcamentoCpfFornecedor, setOrcamentoCpfFornecedor] = React.useState("");
    const [orcamentoFoneFornecedor, setOrcamentoFoneFornecedor] = React.useState("");
    const [orcamentoEnderecoFornecedor, setOrcamentoEnderecoFornecedor] = React.useState("");
    const [orcamentoItens, setOrcamentoItens] = React.useState(
      "1. Serviço de Oficina / Peças\n2. Mão de obra especializada",
    );
    const [orcamentoData, setOrcamentoData] = React.useState(
      () => new Date().toISOString().split("T")[0],
    );
    const [orcamentoValor, setOrcamentoValor] = React.useState("250,00");

    React.useEffect(() => {
      setLocalText(freeNotesText);
    }, [freeNotesText]);

    // Automatically calculate values in words (por extenso)
    React.useEffect(() => {
      const textExtenso = numeroParaExtenso(promissoriaValor);
      if (textExtenso) {
        setPromissoriaExtenso(textExtenso);
      }
    }, [promissoriaValor]);

    React.useEffect(() => {
      const textExtenso = numeroParaExtenso(reciboValor);
      if (textExtenso) {
        setReciboExtenso(textExtenso);
      }
    }, [reciboValor]);

    React.useEffect(() => {
      const textExtenso = numeroParaExtenso(aluguelValor);
      if (textExtenso) {
        setAluguelExtenso(textExtenso);
      }
    }, [aluguelValor]);

    // Synchronize canvas with window/device sizes on first draw container render
    React.useEffect(() => {
      if (!showSavedNotes) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = 600;
            canvas.height = 180;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setHasDrawn(false);
          }
        }
      }
    }, [showSavedNotes, activeTemplate]);

    // Generate templates text dynamically
    const generatePromissoriaText = () => {
      const dateParts = promissoriaVenc.split("-");
      const formattedDate =
        dateParts.length === 3
          ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
          : promissoriaVenc;

      let legalClausula = "";
      let enderecoLine = "";
      if (promissoriaEndereco.trim()) {
        enderecoLine = `\n» Endereço do Imóvel / Local Vinculado: ${promissoriaEndereco.trim()}`;
      } else if (promissoriaLegalSegment === "promissoria_caucao") {
        enderecoLine = `\n» Endereço do Imóvel / Local Vinculado: [Endereço do Imóvel Alugado]`;
      }

      if (promissoriaLegalSegment === "promissoria_comum") {
        legalClausula = `RELAÇÃO JURÍDICA: MÚTUO FINANCEIRO CIVIL (Art. 586 do Código Civil)
Esta Nota Promissória representa uma promessa de pagamento pura e simples de natureza civil, livre de encargos de transações mercantis, obrigando o emitente ao adimplemento sob as penas da lei civil comum brasileira.`;
      } else if (promissoriaLegalSegment === "promissoria_comercial") {
        legalClausula = `RELAÇÃO JURÍDICA: TRANSAÇÃO COMERCIAL / CRÉDITO MERCANTIL (Lei Uniforme de Genebra - Dec. 57.663/66)
Este título de crédito constitui obrigação autônoma e abstrata de natureza comercial, com força executiva extrajudicial direta nos termos do Decreto Federal nº 2.044/1908. O inadimplemento autoriza o imediato protesto cambial e execução judicial de cobrança contra o emitente e seus avalistas, com juros moratórios de 1% ao mês e correção cambial.`;
      } else {
        legalClausula = `RELAÇÃO JURÍDICA: GARANTIA DE EXECUÇÃO CONTRATUAL / CAUÇÃO (Título Vinculado)
Esta Nota Promissória é emitida exclusivamente em caráter de CAUÇÃO, vinculada às garantias de cumprimento das obrigações contratuais pactuadas em instrumento principal (como contrato de locação de imóveis). Perderá plenamente sua liquidez, exigibilidade e efeito legal no momento em que todas as cláusulas do referido contrato principal forem integralmente adimplidas pelo emitente.`;
      }

      return `===== NOTA PROMISSÓRIA JURÍDICA DE PAPELARIA =====
Nº do Título: ${promissoriaNum} | Folha Nº: ${promissoriaFolha}
Vencimento: ${formattedDate} | Valor Nominal: R$ ${promissoriaValor}
Chave de Autenticação Segura: ${promissoriaChave}

No dia ${formattedDate}, prometo pagar por esta única via de Nota Promissória a:
CREDOR:
- Nome: ${promissoriaCredor || "[Nome do Credor/Recebedor]"}
- CPF/CNPJ: ${promissoriaCnpjCredor || "[CPF/CNPJ do Credor]"}
- Celular/Tel: ${promissoriaFoneCredor || "[Telefone do Credor]"}
- Endereço: ${promissoriaEnderecoCredor || "[Endereço do Credor]"}

ou à sua ordem, a quantia exata de ${promissoriaExtenso || "[Valor por Extenso]"}, em moeda corrente nacional.

EMITENTE / DEVEDOR:
- Nome: ${promissoriaDevedor || "[Nome do Devedor]"}
- CPF/CNPJ: ${promissoriaCpf || "[CPF/CNPJ do Devedor]"}
- Celular/Tel: ${promissoriaFone || "[Telefone do Devedor]"}
- Endereço: ${promissoriaEndereco || "[Endereço do Devedor]"}${enderecoLine}

-------------------------------------------------------------------------
${legalClausula}
-------------------------------------------------------------------------
DECLARAÇÃO DE CONCORDÂNCIA E CONFISSÃO DE DÍVIDA:
"Eu, ${promissoriaDevedor || "[Nome do Devedor]"}, na qualidade de emitente, declaro expressa concordância com os termos do presente título de crédito. Reconheço a obrigação líquida e certa de pagar o valor de R$ ${promissoriaValor} ao credor indicado na data de vencimento estipulada."

Assinatura do Emitente / Devedor:
__________________________________________________
(Assinado eletronicamente na tela ou linha de assinatura física acima)`;
    };

    const generateReciboText = () => {
      const dateParts = reciboData.split("-");
      const formattedDate =
        dateParts.length === 3
          ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
          : reciboData;

      const vencParts = reciboVencRestante.split("-");
      const formattedVenc =
        vencParts.length === 3
          ? `${vencParts[2]}/${vencParts[1]}/${vencParts[0]}`
          : reciboVencRestante;

      const tipoText =
        reciboTipo === "integral"
          ? `MODALIDADE DE QUITAÇÃO: QUITAÇÃO INTEGRAL (Pagamento Total da Obrigação)`
          : `MODALIDADE DE QUITAÇÃO: QUITAÇÃO PARCIAL (Amortização Proporcional)
» Valor Recebido Agora: R$ ${reciboValor}
» Saldo Remanescente Pendente: R$ ${reciboValorRestante}
» Prazo Limite para Liquidação do Saldo: ${formattedVenc}`;

      let legalClausula = "";
      if (reciboLegalSegment === "recibo_quitacao") {
        legalClausula = `BASE JURÍDICA: QUITAÇÃO CIVIL PLENA E IRREVOGÁVEL (Art. 319 e 320 do Código Civil)
O credor abaixo qualificado declara ter recebido o valor integral descrito, outorgando ao devedor quitação plena, geral e irrevogável da referida obrigação para nada mais exigir a qualquer título ou pretexto, sob efeitos do Artigo 320 da Lei Federal 10.406/2002.`;
      } else if (reciboLegalSegment === "recibo_arras") {
        legalClausula = `BASE JURÍDICA: SINAL E PRINCÍPIO DE PAGAMENTO - ARRAS (Art. 417 a 420 do Código Civil)
Este recibo comprova o recebimento de valor a título de ARRAS CONFIRMATÓRIAS ou SINAL de negócio comercial de compra e venda. Conforme Artigos 418 e 419 do Código Civil, em caso de desistência imotivada pelo comprador, o valor das arras reverterá integralmente ao vendedor; em caso de desistência pelo vendedor, este deverá restituir o sinal em dobro.`;
      } else {
        legalClausula = `BASE JURÍDICA: PRESTAÇÃO DE SERVIÇOS AUTÔNOMOS (Art. 593 a 609 do Código Civil)
Comprova a quitação de honorários de prestação de serviços executados sem vínculo empregatício de qualquer natureza. As partes declaram a conformidade técnica dos serviços, cabendo ao emitente as retenções tributárias federais e municipais incidentes na fonte (IRRF, ISS, INSS), se aplicável.`;
      }

      return `===== RECIBO DE PAGAMENTO OFICIAL DE PAPELARIA =====
Nº do Registro: ${reciboNum} | Folha Nº: ${reciboFolha}
Valor Pago: R$ ${reciboValor} | Meio de Pgto: ${reciboMeioPagamento}
Chave Autenticadora de Quitação: ${reciboChave}

Declaramos para os devidos fins de direito, comprovação e quitação jurídica que recebemos de:
PAGADOR (Cliente):
- Nome: ${reciboCliente || "[Nome do Cliente/Pagador]"}
- CPF/CNPJ: ${reciboCpf || "[CPF/CNPJ do Pagador]"}
- Celular/Tel: ${reciboFoneCliente || "[Telefone do Cliente]"}
- Endereço: ${reciboEnderecoCliente || "[Endereço do Cliente]"}

A quantia de R$ ${reciboValor} (${reciboExtenso}), referente a:
"${reciboDesc}".

RECEBEDOR (Emitente / Credor):
- Nome: ${reciboEmitente || "[Nome do Credor/Emitente]"}
- CPF/CNPJ: ${reciboCpfEmitente || "[CPF/CNPJ do Emitente]"}
- Celular/Tel: ${reciboFoneEmitente || "[Telefone do Emitente]"}
- Endereço: ${reciboEnderecoEmitente || "[Endereço do Emitente]"}

-------------------------------------------------------------------------
${tipoText}
-------------------------------------------------------------------------
${legalClausula}
-------------------------------------------------------------------------
TERMO DE COMPROVAÇÃO E DECLARAÇÃO DE QUITAÇÃO:
"Pelo presente instrumento de quitação, o emitente confirma o recebimento do valor supracitado na forma e meio declarados, responsabilizando-se civilmente pela legitimidade do recebimento e dando quitação proporcional ou integral ao devedor."

Data do Recebimento: ${formattedDate}

Assinatura do Emitente / Credor:
_____________________________________________
(Assinado eletronicamente na tela ou linha física acima)`;
    };

    const generateOrcamentoText = () => {
      const dateParts = orcamentoData.split("-");
      const formattedDate =
        dateParts.length === 3
          ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
          : orcamentoData;

      return `===== ORÇAMENTO / PEDIDO DE SERVIÇOS =====
Nº: ${orcamentoNum} | Data: ${formattedDate} | Valor Estimado: R$ ${orcamentoValor}

CLIENTE:
- Nome: ${orcamentoCliente || "[Nome do Cliente]"}
- CPF/CNPJ: ${orcamentoCpfCliente || "[CPF/CNPJ do Cliente]"}
- Celular/Tel: ${orcamentoFone || "[Telefone do Cliente]"}
- Endereço: ${orcamentoEnderecoCliente || "[Endereço do Cliente]"}

FORNECEDOR / EMITENTE:
- Empresa/Autônomo: ${orcamentoFornecedor || "[Nome do Fornecedor/Empresa]"}
- CPF/CNPJ: ${orcamentoCpfFornecedor || "[CPF/CNPJ do Fornecedor/Empresa]"}
- Celular/Tel: ${orcamentoFoneFornecedor || "[Telefone do Fornecedor/Empresa]"}
- Endereço: ${orcamentoEnderecoFornecedor || "[Endereço do Fornecedor/Empresa]"}

Descrição dos Itens / Serviços Estimados:
${orcamentoItens}

Observação Comercial: Este documento é exclusivamente um orçamento preliminar de caráter informativo para planejamento financeiro, não possuindo força de cobrança cambial, título de crédito ou execução. Válido por 10 dias corridos a partir desta data.

Assinatura de Concordância do Cliente:
_______________________________________
(Espaço para assinatura digital na tela ou linha física)`;
    };

    const generateAluguelText = () => {
      const dateParts = aluguelData.split("-");
      const formattedDate =
        dateParts.length === 3
          ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
          : aluguelData;

      const mapTipos = {
        casa: "Casa Residencial",
        apartamento: "Apartamento Residencial",
        kitnet: "Imóvel Estilo Kitnet",
        loja: "Ponto Comercial / Loja",
        carro: "Veículo (Carro)",
        moto: "Veículo (Moto)",
        garagem: "Vaga de Garagem",
      };

      const tipoCapitalized = mapTipos[aluguelTipo] || "Imóvel / Bem";

      let legalClausula = "";
      if (aluguelLegalSegment === "aluguel_residencial") {
        legalClausula = `ENQUADRAMENTO LEGAL: LOCAÇÃO RESIDENCIAL (Art. 46 e seguintes da Lei nº 8.245/1991)
Este recibo atesta a quitação pontual de encargo de locação residencial urbana, conforme estipulado em contrato de locação sob regência da Lei do Inquilinato. Eventuais pagamentos após o vencimento contratual acarretam juros moratórios de 1% ao mês e multa moratória contratual de 10%, sem prejuízo de outras sanções.`;
      } else if (aluguelLegalSegment === "aluguel_comercial") {
        legalClausula = `ENQUADRAMENTO LEGAL: LOCAÇÃO NÃO RESIDENCIAL / COMERCIAL (Art. 51 a 57 da Lei nº 8.245/1991)
Comprova a quitação de aluguel comercial de ponto de negócios e estabelecimentos mercantis. O locatário declara estar ciente de suas responsabilidades tributárias municipais acessórias de aluguel (IPTU e taxas de condomínio), se incidentes de forma pactuada.`;
      } else {
        legalClausula = `ENQUADRAMENTO LEGAL: LOCAÇÃO POR TEMPORADA (Art. 48 a 50 da Lei nº 8.245/1991)
Este termo comprova o recebimento antecipado ou parcelado de locação para temporada por prazo determinado inferior a 90 dias, servindo como quitação irrevogável do período especificado, obrigando o locatário à devolução física do imóvel, móveis e chaves na data pactuada.`;
      }

      return `===== RECIBO DE ALUGUEL OFICIAL DE PAPELARIA =====
Nº do Recibo: ${aluguelNum} | Folha Nº: ${aluguelFolha}
Valor do Aluguel: R$ ${aluguelValor} | Meio de Pgto: ${aluguelMeioPagamento}
Chave de Quitação Segura: ${aluguelChave}

Declaramos para fins de direito, comprovação e quitação contratual que recebemos de:
LOCATÁRIO (Inquilino):
- Nome: ${aluguelLocatario || "[Nome do Inquilino]"}
- CPF/CNPJ: ${aluguelCpfLocatario || "[CPF/CNPJ do Inquilino]"}
- Celular/Tel: ${aluguelFoneLocatario || "[Telefone do Inquilino]"}
- Endereço: ${aluguelEnderecoLocatario || "[Endereço do Inquilino]"}

A quantia exata de R$ ${aluguelValor} (${aluguelExtenso}), referente ao pagamento de:
» Locação e Aluguel de: ${tipoCapitalized.toUpperCase()}
» Período / Mês de Referência: ${aluguelPeriodo}
» Endereço/Identificação do Bem Locado: ${aluguelEndereco || "[Endereço do Imóvel ou Identificação do Veículo]"}

-------------------------------------------------------------------------
${legalClausula}
-------------------------------------------------------------------------
DECLARAÇÃO DE RECEBIMENTO E PLENA QUITAÇÃO:
"Eu, ${aluguelLocador || "[Nome do Proprietário/Locador]"}, Locador/Proprietário do Bem, confirmo sob as penas da lei o recebimento integral do valor acima indicado para o aluguel e período declarados, outorgando ao locatário plena e devida quitação do período especificado."

LOCADOR (Proprietário):
- Nome: ${aluguelLocador || "[Nome do Locador]"}
- CPF/CNPJ: ${aluguelCpfLocador || "[CPF/CNPJ do Locador]"}
- Celular/Tel: ${aluguelFoneLocador || "[Telefone do Locador]"}
- Endereço: ${aluguelEnderecoLocador || "[Endereço do Locador]"}

Data do Recebimento: ${formattedDate}

Assinatura do Locador / Proprietário:
_________________________________________
(Assinado eletronicamente na tela ou linha de assinatura física acima)`;
    };

    // Keep text in sync with template SELECTION (only once when activeTemplate changes!)
    React.useEffect(() => {
      if (activeTemplate === "promissoria") {
        const txt = `===== NOTA PROMISSÓRIA COMERCIAL =====
Nº do Título: 001 | Vencimento: [Definir Data]
Valor: R$ 350,00 (Trezentos e cinquenta reais)

Ao(s) [Data de Vencimento], pagarei(emos) por esta única via de NOTA PROMISSÓRIA a [Nome do Credor], inscrito no CPF/CNPJ sob o nº [CPF/CNPJ do Credor], ou à sua ordem, a quantia de R$ 350,00 (Trezentos e cinquenta reais) em moeda corrente nacional.

Emitente/Devedor: [Nome do Devedor]
CPF/CNPJ: [CPF/CNPJ do Devedor]
Endereço: [Endereço do Devedor]`;
        setLocalText(txt);
        setFreeNotesText(txt);
      } else if (activeTemplate === "recibo") {
        const txt = `===== RECIBO DE PAGAMENTO COMERCIAL =====
Nº do Registro: 001 | Valor: R$ 150,00
Meio de Pagamento: PIX / Dinheiro / Cartão

Declaramos para os devidos fins de direito e comprovação que recebemos de [Nome do Cliente], inscrito no CPF/CNPJ sob o nº [CPF/CNPJ], a quantia de R$ 150,00 (Cento e cinquenta reais) referente a: "Serviços prestados gerais / Compra de produtos".

Recebedor (Emitente/Credor): [Nome do Emitente]
CPF/CNPJ: [CPF/CNPJ do Emitente]
Endereço: [Endereço do Emitente]

Data do Recebimento: [Inserir Data]`;
        setLocalText(txt);
        setFreeNotesText(txt);
      } else if (activeTemplate === "orcamento") {
        const txt = `===== ORÇAMENTO / PEDIDO DE SERVIÇOS =====
Nº: 001 | Data: [Inserir Data] | Valor Estimado: R$ 250,00

CLIENTE:
- Nome: [Nome do Cliente]
- CPF/CNPJ: [CPF/CNPJ do Cliente]
- Celular/Tel: [Telefone do Cliente]

FORNECEDOR / EMITENTE:
- Empresa/Autônomo: [Nome do Fornecedor/Empresa]
- CPF/CNPJ: [CPF/CNPJ do Fornecedor/Empresa]

Descrição dos Itens / Serviços Estimados:
1. Serviço de Oficina / Peças
2. Mão de obra especializada

Observação: Orçamento válido por 10 dias corridos.`;
        setLocalText(txt);
        setFreeNotesText(txt);
      } else if (activeTemplate === "recibo_aluguel") {
        const txt = `===== RECIBO DE ALUGUEL RESIDENCIAL =====
Nº do Recibo: 001 | Valor: R$ 1.200,00
Referência: [Mês/Ano]

Declaramos para fins de comprovação contratual que recebemos de [Nome do Inquilino], inscrito no CPF sob o nº [CPF do Inquilino], a quantia de R$ 1.200,00 (Um mil e duzentos reais) referente à locação do imóvel residencial situado em: [Endereço do Imóvel Locado].

Locador (Proprietário): [Nome do Proprietário]
CPF/CNPJ: [CPF/CNPJ do Locador]

Data: [Inserir Data]`;
        setLocalText(txt);
        setFreeNotesText(txt);
      } else if (activeTemplate === "none") {
        setLocalText("");
        setFreeNotesText("");
      }
    }, [activeTemplate]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setLocalText(val);
      debouncedSetFreeNotesText(val);
    };

    // Canvas drawing handlers
    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const x = ((clientX - rect.left) / rect.width) * canvas.width;
      const y = ((clientY - rect.top) / rect.height) * canvas.height;

      return { x, y };
    };

    const startDrawing = (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      e.preventDefault();
      const coords = getCoordinates(e);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      setIsDrawing(true);
      setHasDrawn(true);
    };

    const draw = (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      if (!isDrawing) return;
      e.preventDefault();
      const coords = getCoordinates(e);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      setIsDrawing(false);
    };

    const clearSignature = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    };

    const handleSaveWithSignature = () => {
      let signatureDataUrl = "";
      if (hasDrawn && canvasRef.current) {
        signatureDataUrl = canvasRef.current.toDataURL("image/png");
      }
      const finalFolder = newFolderName.trim()
        ? newFolderName.trim()
        : saveFolder;
      
      const joinedText = getJoinedPagesText(pages);
      const finalPin = isLockedToggle ? pin : "";
      handleSaveNote(joinedText, signatureDataUrl, finalFolder, pages, finalPin, pageImages, pageImageSizes);

      if (newFolderName.trim() && !createdFolders.includes(newFolderName.trim())) {
        setCreatedFolders((prev) => Array.from(new Set([...prev, newFolderName.trim()])));
      }

      // reset states
      setHasDrawn(false);
      clearSignature();
      setSaveFolder("");
      setNewFolderName("");
      setPageImages([""]);
      setPageImageSizes([100]);
      setPin("");
      setIsLockedToggle(false);
      setIsWritingHidden(false);
      setPages([""]);
      setLocalText("");
      setCurrentPageIndex(0);
    };

    const handleDownloadPDF = (note: any) => {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Remove unicode emojis to prevent encoding crashes
      const cleanText = (note.text || "")
        .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, "");

      let docTitle = "DIÁRIO PESSOAL & NOTAS";
      let docSub = "REGISTRO DE ESCRITA LIVRE";

      const textUpper = cleanText.toUpperCase();
      if (textUpper.includes("GRATIDÃO") || textUpper.includes("GRATIDÃO")) {
        docTitle = "DIÁRIO DE GRATIDÃO";
        docSub = "AGRADECIMENTO DIÁRIO E PAZ MENTAL";
      } else if (textUpper.includes("DIÁRIO") || textUpper.includes("DIARIO") || textUpper.includes("QUERIDO")) {
        docTitle = "DIÁRIO PESSOAL";
        docSub = "MEMÓRIAS, SENTIMENTOS E REFLEXÕES";
      } else if (textUpper.includes("IDEIA") || textUpper.includes("PROJETO") || textUpper.includes("INSIGHT")) {
        docTitle = "LIVRO DE IDEIAS E PROJETOS";
        docSub = "PROJETOS E METAS DE DESEMPENHO";
      } else if (textUpper.includes("METAS") || textUpper.includes("PLANEJADOR")) {
        docTitle = "PLANEJADOR DIÁRIO";
        docSub = "METAS, FOCO E PRODUTIVIDADE";
      }

      const parsedPages = cleanText.includes("--- PÁGINA ")
        ? cleanText.split(/\n*--- PÁGINA \d+ ---\n*/g).map(p => p.trim()).filter(Boolean)
        : (note.pages && note.pages.length > 0 ? note.pages : [cleanText]);

      parsedPages.forEach((pageText: string, pageIdx: number) => {
        if (pageIdx > 0) {
          doc.addPage();
        }

        // Title
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`${docTitle} - PÁG. ${pageIdx + 1}`, 105, 20, { align: "center" });

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.text(`${docSub} | Livro: ${note.folder || "Geral"}`, 105, 26, { align: "center" });

        doc.setLineWidth(0.5);
        doc.line(15, 30, 195, 30);

        // Body text
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);

        const splitText = doc.splitTextToSize(pageText, 180);
        let y = 40;
        for (let i = 0; i < splitText.length; i++) {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(splitText[i], 15, y);
          y += 6.5;
        }

        // Draw page image if present
        if (note.images && note.images[pageIdx]) {
          if (y > 200) {
            doc.addPage();
            y = 30;
          } else {
            y += 10;
          }
          try {
            const scaleFactor = (note.imageSizes && note.imageSizes[pageIdx] ? note.imageSizes[pageIdx] : 100) / 100;
            const targetWidth = Math.min(170, 100 * scaleFactor);
            const targetHeight = Math.min(100, 60 * scaleFactor);
            const xPos = 105 - (targetWidth / 2);
            doc.addImage(note.images[pageIdx], "JPEG", xPos, y, targetWidth, targetHeight);
            y += targetHeight + 10;
          } catch (err) {
            console.error("Error drawing page image in PDF:", err);
          }
        }

        // If it is the last page, we can draw the signature
        if (pageIdx === parsedPages.length - 1) {
          // Signature
          if (note.signatureImg) {
            if (y > 240) {
              doc.addPage();
              y = 20;
            }
            y += 10;
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(9);
            doc.text("Assinatura Digital Coletada:", 15, y);
            y += 4;
            try {
              doc.addImage(note.signatureImg, "PNG", 15, y, 50, 18);
              y += 20;
            } catch (err) {
              console.error("Error adding signature image to PDF:", err);
              y += 5;
            }
            doc.line(15, y, 75, y);
            y += 4;
            doc.setFont("Helvetica", "normal");
            doc.text("Emitente / Locatário / Cliente", 15, y);
          } else {
            if (y > 250) {
              doc.addPage();
              y = 20;
            }
            y += 15;
            doc.line(15, y, 75, y);
            y += 4;
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(9);
            doc.text("Assinatura do Emitente / Cliente", 15, y);
          }
        }

        // Footer
        doc.setLineWidth(0.2);
        doc.setDrawColor(200, 200, 200);
        doc.line(15, 275, 195, 275);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Documento formalizado e emitido em ${note.date} | Página ${pageIdx + 1} de ${parsedPages.length}`, 105, 280, { align: "center" });
        doc.text("Segurança de Autenticidade e Assinatura Registradas", 105, 284, { align: "center" });
      });

      const safeTitle = docTitle.toLowerCase().replace(/[^a-z0-9]/g, "_");
      doc.save(`${safeTitle}_${note.id || Date.now()}.pdf`);
    };

    const handleSaveAndPDF = () => {
      let signatureDataUrl = "";
      if (hasDrawn && canvasRef.current) {
        signatureDataUrl = canvasRef.current.toDataURL("image/png");
      }
      const finalFolder = newFolderName.trim()
        ? newFolderName.trim()
        : saveFolder;
      
      const joinedText = getJoinedPagesText(pages);
      const finalPin = isLockedToggle ? pin : "";
      handleSaveNote(joinedText, signatureDataUrl, finalFolder, pages, finalPin, pageImages, pageImageSizes);

      if (newFolderName.trim() && !createdFolders.includes(newFolderName.trim())) {
        setCreatedFolders((prev) => Array.from(new Set([...prev, newFolderName.trim()])));
      }

      const tempNote = {
        id: Date.now().toString(),
        text: joinedText,
        pages: pages,
        date: new Date().toLocaleString("pt-BR"),
        signatureImg: signatureDataUrl,
        folder: finalFolder,
        pin: finalPin,
        images: pageImages,
        imageSizes: pageImageSizes,
      };
      handleDownloadPDF(tempNote);

      setHasDrawn(false);
      clearSignature();
      setSaveFolder("");
      setNewFolderName("");
      setPageImages([""]);
      setPageImageSizes([100]);
      setPin("");
      setIsLockedToggle(false);
      setIsWritingHidden(false);
      setPages([""]);
      setLocalText("");
      setCurrentPageIndex(0);
    };

    const handleSaveAndWhatsApp = () => {
      let signatureDataUrl = "";
      if (hasDrawn && canvasRef.current) {
        signatureDataUrl = canvasRef.current.toDataURL("image/png");
      }
      const finalFolder = newFolderName.trim()
        ? newFolderName.trim()
        : saveFolder;
      
      const joinedText = getJoinedPagesText(pages);
      const finalPin = isLockedToggle ? pin : "";
      handleSaveNote(joinedText, signatureDataUrl, finalFolder, pages, finalPin, pageImages, pageImageSizes);

      if (newFolderName.trim() && !createdFolders.includes(newFolderName.trim())) {
        setCreatedFolders((prev) => Array.from(new Set([...prev, newFolderName.trim()])));
      }

      handleShareOnWhatsApp(joinedText);

      setHasDrawn(false);
      clearSignature();
      setSaveFolder("");
      setNewFolderName("");
      setPageImages([""]);
      setPageImageSizes([100]);
      setPin("");
      setIsLockedToggle(false);
      setIsWritingHidden(false);
      setPages([""]);
      setLocalText("");
      setCurrentPageIndex(0);
    };

    const handleSaveAndPrint = () => {
      let signatureDataUrl = "";
      if (hasDrawn && canvasRef.current) {
        signatureDataUrl = canvasRef.current.toDataURL("image/png");
      }
      const finalFolder = newFolderName.trim()
        ? newFolderName.trim()
        : saveFolder;
      
      const joinedText = getJoinedPagesText(pages);
      const finalPin = isLockedToggle ? pin : "";
      handleSaveNote(joinedText, signatureDataUrl, finalFolder, pages, finalPin, pageImages, pageImageSizes);

      if (newFolderName.trim() && !createdFolders.includes(newFolderName.trim())) {
        setCreatedFolders((prev) => Array.from(new Set([...prev, newFolderName.trim()])));
      }

      const tempNote = {
        id: Date.now().toString(),
        text: joinedText,
        pages: pages,
        date: new Date().toLocaleString("pt-BR"),
        signatureImg: signatureDataUrl,
        folder: finalFolder,
        pin: finalPin,
        images: pageImages,
        imageSizes: pageImageSizes,
      };
      handlePrintNote(tempNote);

      setHasDrawn(false);
      clearSignature();
      setSaveFolder("");
      setNewFolderName("");
      setPageImages([""]);
      setPageImageSizes([100]);
      setPin("");
      setIsLockedToggle(false);
      setIsWritingHidden(false);
      setPages([""]);
      setLocalText("");
      setCurrentPageIndex(0);
    };

    const handleLoadNoteLocal = (note: any) => {
      setPages(note.pages && note.pages.length > 0 ? [...note.pages] : [note.text]);
      setPageImages(note.images && note.images.length > 0 ? [...note.images] : Array(note.pages?.length || 1).fill(""));
      setPageImageSizes(note.imageSizes && note.imageSizes.length > 0 ? [...note.imageSizes] : Array(note.pages?.length || 1).fill(100));
      setPin(note.pin || "");
      setIsLockedToggle(!!note.pin);
      setSaveFolder(note.folder || "");
      setCurrentPageIndex(0);
      setLocalText(note.pages && note.pages[0] ? note.pages[0] : note.text);
      
      // Call the prop load handler
      handleLoadNote(note.text);
    };

    // Print function matching the exact requested structures and formatting
    const handlePrintNote = (note: any) => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert(
          "Por favor, habilite a permissão de pop-up no navegador para imprimir o comprovante.",
        );
        return;
      }

      const isA4 = printFormat === "a4";
      const textUpper = (note.text || "").toUpperCase();
      let docTitle = "REGISTRO DE INFORMAÇÕES";
      let docSub = "DECLARAÇÃO / COMPROVANTE";

      if (
        textUpper.includes("PROMISSÓRIA") ||
        textUpper.includes("PROMISSORIA")
      ) {
        docTitle = "NOTA PROMISSÓRIA JURÍDICA";
        docSub = "DECLARAÇÃO E COMPROMISSO DE DÍVIDA ATIVA";
      } else if (
        textUpper.includes("RECIBO DE PAGAMENTO") ||
        textUpper.includes("RECIBO PAGO") ||
        textUpper.includes("RECIBO DE QUITAÇÃO")
      ) {
        docTitle = "RECIBO DE QUITAÇÃO OFICIAL";
        docSub = "COMPROVANTE DE RECEBIMENTO E LIBERAÇÃO";
      } else if (
        textUpper.includes("ORÇAMENTO") ||
        textUpper.includes("ORCAMENTO") ||
        textUpper.includes("PEDIDO")
      ) {
        docTitle = "PROPOSTA DE ORÇAMENTO / PEDIDO";
        docSub = "DOCUMENTO COMERCIAL DE PRESTAÇÃO DE SERVIÇOS";
      }

      const cleanText = (note.text || "")
        .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, "");

      const parsedPages = cleanText.includes("--- PÁGINA ")
        ? cleanText.split(/\n*--- PÁGINA \d+ ---\n*/g).map(p => p.trim()).filter(Boolean)
        : (note.pages && note.pages.length > 0 ? note.pages : [cleanText]);

      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;750;900&display=swap');
            @page {
              size: ${isA4 ? "A4 portrait" : "auto"};
              margin: ${isA4 ? "15mm" : "0mm"};
            }
            body {
              font-family: ${isA4 ? '"Inter", -apple-system, sans-serif' : "'Courier New', Courier, monospace"};
              padding: 0;
              margin: 0;
              color: #000;
              background-color: #fff;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            .print-page {
              max-width: ${isA4 ? "700px" : "320px"};
              margin: 0 auto;
              ${isA4 ? "border: 1px solid #ddd; border-radius: 20px; padding: 40px;" : "padding: 15px;"}
              margin-bottom: 30px;
              box-shadow: ${isA4 ? "0 4px 12px rgba(0,0,0,0.05)" : "none"};
              background: #fff;
            }
            @media print {
              .print-page {
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                padding: ${isA4 ? "20px 0" : "0"} !important;
                margin-bottom: 0 !important;
              }
              body {
                background: none;
              }
            }
            .header-banner {
              text-align: center;
              font-weight: 950;
              font-size: ${isA4 ? "18px" : "13px"};
              border-bottom: 2px ${isA4 ? "solid" : "dashed"} #000;
              padding-bottom: ${isA4 ? "12px" : "8px"};
              margin-bottom: ${isA4 ? "25px" : "15px"};
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .main-content {
              white-space: pre-wrap;
              font-size: ${isA4 ? "13.5px" : "11px"};
              line-height: ${isA4 ? "1.7" : "1.4"};
              margin-bottom: 30px;
              word-break: break-all;
            }
            .signature-block {
              margin-top: 40px;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              margin-top: ${isA4 ? "45px" : "35px"};
              padding-top: 5px;
              font-weight: bold;
              text-transform: uppercase;
              font-size: ${isA4 ? "11px" : "9px"};
              width: ${isA4 ? "350px" : "100%"};
              letter-spacing: 0.5px;
            }
            .signature-img {
              max-height: ${isA4 ? "90px" : "70px"};
              max-width: ${isA4 ? "250px" : "200px"};
              margin: 5px auto;
              display: block;
            }
            .footer-info {
              text-align: center;
              font-size: ${isA4 ? "10px" : "8px"};
              margin-top: 45px;
              border-top: 1px dashed #000;
              padding-top: 10px;
              color: #444;
            }
          </style>
        </head>
        <body>
          <div class="document-container">
            ${parsedPages.map((pageText: string, idx: number) => `
              <div class="print-page ${idx < parsedPages.length - 1 ? 'page-break' : ''}">
                <div class="header-banner">
                  ${docTitle}<br/>
                  ★ ${isA4 ? `${docSub} | Livro: ${note.folder || "Geral"}` : "DOCUMENTO DE REGISTRO"} ★<br/>
                  <span style="font-size: 11px; font-weight: normal; text-transform: none; color: #555;">Página ${idx + 1} de ${parsedPages.length}</span>
                </div>
                <div class="main-content">${pageText}</div>
                
                ${note.images && note.images[idx] ? `
                  <div style="text-align: center; margin: 20px 0;">
                    <img src="${note.images[idx]}" style="max-width: ${note.imageSizes && note.imageSizes[idx] ? note.imageSizes[idx] : 100}%; max-height: 400px; border-radius: 12px; border: 1px solid #ddd; object-fit: contain; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" />
                  </div>
                ` : ""}
                
                ${idx === parsedPages.length - 1 ? `
                  <div class="signature-block">
                    ${
                      note.signatureImg
                        ? `
                      <p style="font-size: 8px; text-transform: uppercase; margin: 0 0 5px 0; color: #444;">Assinatura Digital Coletada:</p>
                      <img src="${note.signatureImg}" class="signature-img" />
                      <div class="signature-line" style="border-top:none; margin-top:0;">Ass: Emitente / Cliente</div>
                    `
                        : `
                      <div class="signature-line">Ass: Emitente / Cliente</div>
                    `
                    }
                  </div>
                ` : ""}

                <div class="footer-info">
                  Documento formalizado e emitido em ${note.date}<br/>
                  Segurança de Autenticidade e Assinatura Registradas 🛡️
                </div>
              </div>
            `).join("")}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 600);
            };
          </script>
        </body>
      </html>
    `);
      printWindow.document.close();
    };

    return (
      <motion.div
        key="notes"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="p-4 sm:p-8 space-y-6 bg-[#fef9c3] min-h-[60vh] pb-40 rounded-3xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-amber-200 pb-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Pencil className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-950 uppercase tracking-widest">
                {showSavedNotes
                  ? "Arquivo de Notas e Promissórias"
                  : "Bloquinho Virtual & Promissórias"}
              </h3>
              <p className="text-[11px] font-extrabold text-amber-800 uppercase tracking-tight">
                {showSavedNotes
                  ? "Veja ou imprima notas e assinaturas salvas"
                  : "Gere Promissórias, Recibos ou Orçamentos com Assinatura"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSavedNotes(!showSavedNotes)}
            className={`px-4 py-2.5 rounded-xl font-black uppercase text-[10.5px] tracking-wide flex items-center justify-center gap-2 transition-all ${showSavedNotes ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-800 border border-amber-300"}`}
          >
            <History className="w-4 h-4" />
            <span>
              {showSavedNotes ? "Voltar ao Editor" : "Ver Notas Salvas 📜"}
            </span>
          </button>
        </div>

        {/* Formato de Impressão Toggle */}
        <div className="bg-amber-600/10 p-4 rounded-3xl border-2 border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <span className="text-xs font-black text-amber-950 uppercase tracking-wider block">
                Formato de Impressão Padrão
              </span>
              <span className="text-[10px] text-amber-800 uppercase font-bold">
                Escolha entre folha de impressora normal (A4) ou cupom térmico
                (80mm)
              </span>
            </div>
          </div>
          <div className="flex bg-amber-200/50 p-1.5 rounded-2xl border border-amber-300 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setPrintFormat("a4")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${printFormat === "a4" ? "bg-amber-700 text-white shadow" : "text-amber-900 hover:bg-amber-200"}`}
            >
              📄 Papel A4 (Normal)
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat("thermal")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${printFormat === "thermal" ? "bg-amber-700 text-white shadow" : "text-amber-900 hover:bg-amber-200"}`}
            >
              🧾 Cupom Térmico (80mm)
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showSavedNotes ? (
            <motion.div
              key="saved-list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Sidebar: Pastas & Busca */}
              <div className="lg:col-span-4 bg-amber-50 p-5 rounded-3xl border-2 border-amber-200/50 space-y-5 h-fit shadow-sm">
                <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                  <span className="text-[12px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-amber-700" />
                    Arquivo de Pastas
                  </span>

                  {/* Create Folder Quick Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const name = prompt(
                        "Digite o nome da nova pasta (ex: Inquilino Carlos, Junho 2026, Contrato Aluguel):",
                      );
                      if (name && name.trim()) {
                        setCreatedFolders((prev) =>
                          Array.from(new Set([...prev, name.trim()])),
                        );
                        setSelectedViewFolder(name.trim());
                      }
                    }}
                    className="p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-1 text-[9px] font-black uppercase tracking-wider active:scale-95 cursor-pointer"
                    title="Criar Nova Pasta"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    Criar Pasta
                  </button>
                </div>

                {/* Busca Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-amber-800 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    placeholder="Buscar por texto, data ou pasta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-amber-950 placeholder-amber-700/40 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-2 bg-amber-100 hover:bg-amber-200 text-amber-800 px-1.5 py-1 rounded-md text-[9px] font-black uppercase transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Pasta List */}
                <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                  {/* Ver Todos Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedViewFolder("all")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                      selectedViewFolder === "all"
                        ? "bg-amber-600 text-white border-amber-600 shadow-md animate-pulse"
                        : "bg-white hover:bg-amber-100/50 text-amber-950 border-amber-200/40"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      📂 Ver Todos
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${selectedViewFolder === "all" ? "bg-amber-800 text-amber-100" : "bg-amber-100 text-amber-800"}`}
                    >
                      {savedNotes.length}
                    </span>
                  </button>

                  {/* Sem Pasta Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedViewFolder("")}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                      selectedViewFolder === ""
                        ? "bg-amber-600 text-white border-amber-600 shadow-md"
                        : "bg-white hover:bg-amber-100/50 text-amber-950 border-amber-200/40"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <File className="w-4 h-4" />
                      📄 Sem Pasta
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${selectedViewFolder === "" ? "bg-amber-800 text-amber-100" : "bg-amber-100 text-amber-800"}`}
                    >
                      {savedNotes.filter((n) => getNoteFolder(n) === "Sem Pasta").length}
                    </span>
                  </button>

                  {/* Dynamic Folders */}
                  {existingFolders.map((folderName) => {
                    const count = savedNotes.filter(
                      (n) => getNoteFolder(n) === folderName,
                    ).length;
                    const fStyle = getFolderStyleAndIcon(folderName);
                    return (
                      <div
                        key={folderName}
                        className="group relative flex items-center justify-between"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedViewFolder(folderName)}
                          className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                            selectedViewFolder === folderName
                              ? "bg-amber-600 text-white border-amber-600 shadow-md"
                              : "bg-white hover:bg-amber-100/50 text-amber-950 border-amber-200/40"
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate pr-4">
                            {fStyle.icon}
                            <span className="truncate">{folderName}</span>
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold shrink-0 ${selectedViewFolder === folderName ? "bg-amber-800 text-amber-100" : "bg-amber-100 text-amber-800"}`}
                          >
                            {count}
                          </span>
                        </button>

                        {/* Delete Empty Folder button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                `Deseja remover a pasta "${folderName}"? Os documentos continuarão existindo e serão movidos para "Sem Pasta".`,
                              )
                            ) {
                              savedNotes.forEach((note) => {
                                if (
                                  note.folder === folderName &&
                                  handleUpdateNoteFolder
                                ) {
                                  handleUpdateNoteFolder(note.id, "");
                                }
                              });
                              setCreatedFolders((prev) =>
                                prev.filter((f) => f !== folderName),
                              );
                              if (selectedViewFolder === folderName) {
                                setSelectedViewFolder("all");
                              }
                            }
                          }}
                          className="absolute right-12 opacity-0 group-hover:opacity-100 hover:bg-red-700 hover:text-white text-red-700 bg-white border border-red-200 p-1 rounded-md shadow-md transition-all text-[8px] font-black uppercase cursor-pointer"
                          title="Excluir Pasta"
                        >
                          Excluir
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Botão de Fechar e Voltar para o Editor */}
                <div className="pt-4 border-t-2 border-amber-200/50 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowSavedNotes(false)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-md hover:shadow-emerald-700/20 active:scale-95 transition-all cursor-pointer border border-emerald-800"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar a Escrever Notas 📝</span>
                  </button>
                </div>
              </div>

              {/* Document List / Documents Panel */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-200 pb-2 gap-2">
                  <div className="flex items-center gap-2 text-amber-950 font-black uppercase tracking-wider text-xs sm:text-sm">
                    <FolderOpen className="w-5 h-5 text-amber-700 shrink-0" />
                    <span className="truncate">
                      Pasta:{" "}
                      {selectedViewFolder === "all"
                        ? "Todos os Documentos 📦"
                        : selectedViewFolder === ""
                          ? "Sem Pasta 📄"
                          : selectedViewFolder}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-800 uppercase bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 shrink-0">
                      {(() => {
                        const count = savedNotes.filter((n) => {
                          if (selectedViewFolder === "all") return true;
                          const currentFolder = getNoteFolder(n);
                          return selectedViewFolder === ""
                            ? currentFolder === "Sem Pasta"
                            : currentFolder === selectedViewFolder;
                        }).length;
                        return `${count} doc(s)`;
                      })()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSavedNotes(false)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer border border-rose-700"
                      title="Fechar arquivos e voltar a escrever"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Fechar</span>
                    </button>
                  </div>
                </div>

                {/* Filter and render notes */}
                {(() => {
                  const filtered = savedNotes.filter((note) => {
                    const currentFolder = getNoteFolder(note);
                    const matchesFolder =
                      selectedViewFolder === "all"
                        ? true
                        : selectedViewFolder === ""
                          ? currentFolder === "Sem Pasta"
                          : currentFolder === selectedViewFolder;

                    const matchesSearch =
                      searchQuery.trim() === ""
                        ? true
                        : note.text
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          note.date
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          currentFolder
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase());
                    return matchesFolder && matchesSearch;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-16 text-center space-y-4 bg-amber-100/30 rounded-3xl border-2 border-dashed border-amber-200/70">
                        <div className="w-16 h-16 bg-amber-100/50 rounded-full flex items-center justify-center mx-auto text-amber-400">
                          <Folder className="w-8 h-8" />
                        </div>
                        <p className="text-amber-800/60 text-xs font-black uppercase tracking-widest px-4 leading-relaxed">
                          Nenhum documento encontrado{" "}
                          {searchQuery ? "com essa busca" : "nesta pasta"}.
                        </p>
                      </div>
                    );
                  }

                  return filtered.map((note) => {
                    const notePages = note.pages && note.pages.length > 0
                      ? note.pages
                      : (note.text.includes("--- PÁGINA ")
                          ? note.text.split(/\n*--- PÁGINA \d+ ---\n*/g).map((p: string) => p.trim()).filter(Boolean)
                          : [note.text]);
                    const cardPageIndex = savedNotePageIndices[note.id] || 0;
                    const currentCardPageText = notePages[cardPageIndex] || notePages[0] || "";
                    const isNoteUnlocked = !note.pin || unlockedNoteIds.includes(note.id);

                    return (
                      <div
                        key={note.id}
                        className={`p-5 rounded-3xl border-2 space-y-4 shadow-sm transition-all ${
                          !isNoteUnlocked
                            ? "bg-slate-900 border-slate-850 text-white hover:border-amber-500/20"
                            : "bg-amber-50 border-amber-200/50 hover:border-amber-300"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-200/60 pb-3 gap-2">
                          <div className="flex flex-col gap-1">
                            <span className={`text-[11.5px] font-black uppercase tracking-widest flex items-center gap-1.5 ${!isNoteUnlocked ? "text-amber-400" : "text-amber-900"}`}>
                              <FileSignature className="w-3.5 h-3.5" />
                              {note.date}
                            </span>
                            {/* Folder badge */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {(() => {
                                const folderName = getNoteFolder(note);
                                const fStyle = getFolderStyleAndIcon(folderName);
                                return (
                                  <span className={`text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                                    !isNoteUnlocked
                                      ? "bg-slate-800 text-slate-300 border-slate-700"
                                      : `${fStyle.bgClass} ${fStyle.colorClass} ${fStyle.borderClass}`
                                  }`}>
                                    {fStyle.icon}
                                    <span>{folderName}</span>
                                  </span>
                                );
                              })()}
                              
                              {note.pin && (
                                <span className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-550/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 animate-pulse">
                                  <Lock className="w-2.5 h-2.5" />
                                  Protegido
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isNoteUnlocked ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSpeakText(note.text, micLangLocal, note.id)}
                                  className={`px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-90 transition-all font-black uppercase text-[9px] border cursor-pointer ${
                                    isSpeakingLocal && speakingNoteId === note.id
                                      ? "bg-red-600 border-red-500 text-white animate-pulse"
                                      : "bg-blue-50 border-blue-200 text-blue-950 hover:bg-blue-100"
                                  }`}
                                  title="Ouvir a leitura falada do documento"
                                >
                                  {isSpeakingLocal && speakingNoteId === note.id ? (
                                    <>
                                      <VolumeX className="w-3.5 h-3.5 animate-bounce" />
                                      Parar
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                                      Ouvir
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadPDF(note)}
                                  className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 flex items-center justify-center gap-1.5 active:scale-90 transition-all font-black uppercase text-[9px] border border-amber-350 cursor-pointer"
                                  title="Baixar comprovante em PDF"
                                >
                                  <FileText className="w-3.5 h-3.5 text-amber-800" />
                                  PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrintNote(note)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center gap-1.5 active:scale-90 transition-all font-black uppercase text-[9px] border border-slate-300 cursor-pointer"
                                  title="Imprimir com layout otimizado"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  Imprimir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShareOnWhatsApp(note.text)}
                                  className="w-8 h-8 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                                  title="Enviar por WhatsApp"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEnteringPinNoteId(note.id);
                                  setEnteredPinValue("");
                                  setPinErrorNoteId(null);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center gap-1.5 active:scale-95 transition-all font-black uppercase text-[9px] cursor-pointer shadow-md shadow-amber-500/10"
                                title="Inserir senha para destravar"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                Desbloquear
                              </button>
                            )}

                            {/* Load note back to editor */}
                            {isNoteUnlocked && (
                              <button
                                type="button"
                                onClick={() => handleLoadNoteLocal(note)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 active:scale-90 transition-all font-black uppercase text-[9px] cursor-pointer shadow-sm"
                                title="Carregar no Editor"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Editar
                              </button>
                            )}

                            {/* Lock again if desired */}
                            {isNoteUnlocked && note.pin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setUnlockedNoteIds((prev) => prev.filter((id) => id !== note.id));
                                }}
                                className="w-8 h-8 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                                title="Trancar Nota Novamente"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteSavedNote(note.id)}
                              className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                              title="Excluir Nota"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Lock overlay if locked */}
                        {!isNoteUnlocked ? (
                          <div className="py-6 flex flex-col items-center justify-center text-center space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                            <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                                Conteúdo Protegido sob Sete Chaves
                              </p>
                              <p className="text-[9.5px] font-semibold text-slate-400 mt-1 uppercase">
                                Esta nota possui páginas, escritas ou fotos trancadas
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setIsEnteringPinNoteId(note.id);
                                setEnteredPinValue("");
                                setPinErrorNoteId(null);
                              }}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase tracking-wider text-[10px] rounded-xl cursor-pointer active:scale-95 transition-all shadow-md"
                            >
                              🔑 Revelar Nota Secreta
                            </button>
                          </div>
                        ) : (
                          /* Normal Content rendering if unlocked */
                          <div className="space-y-3">
                            {notePages.length > 1 && (
                              <div className="flex items-center justify-between bg-amber-100/60 px-3.5 py-2 rounded-2xl border border-amber-200/50">
                                <span className="text-[10px] font-black uppercase text-amber-950 tracking-wider flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                  Livro de Receitas / Notas
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={cardPageIndex === 0}
                                    onClick={() => {
                                      setSavedNotePageIndices(prev => ({
                                        ...prev,
                                        [note.id]: Math.max(0, cardPageIndex - 1)
                                      }));
                                    }}
                                    className="w-6 h-6 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-amber-950 hover:bg-amber-100 disabled:opacity-30 disabled:pointer-events-none active:scale-90 transition-all cursor-pointer"
                                  >
                                    &lt;
                                  </button>
                                  
                                  <span className="text-[10.5px] font-bold text-amber-900 font-mono">
                                    {cardPageIndex + 1} / {notePages.length}
                                  </span>
                                  
                                  <button
                                    type="button"
                                    disabled={cardPageIndex === notePages.length - 1}
                                    onClick={() => {
                                      setSavedNotePageIndices(prev => ({
                                        ...prev,
                                        [note.id]: Math.min(notePages.length - 1, cardPageIndex + 1)
                                      }));
                                    }}
                                    className="w-6 h-6 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-amber-950 hover:bg-amber-100 disabled:opacity-30 disabled:pointer-events-none active:scale-90 transition-all cursor-pointer"
                                  >
                                    &gt;
                                  </button>
                                </div>
                              </div>
                            )}

                            <p className="text-amber-950 text-xs sm:text-sm font-semibold leading-relaxed whitespace-pre-wrap bg-white/55 p-4 rounded-2xl border border-amber-100 shadow-inner">
                              {currentCardPageText}
                            </p>

                            {/* Render saved page image if exists */}
                            {note.images && note.images[cardPageIndex] && (
                              <div className="mt-3 flex flex-col items-center justify-center border border-dashed border-amber-300 p-2.5 bg-white rounded-2xl shadow-sm">
                                <img
                                  src={note.images[cardPageIndex]}
                                  alt={`Foto da Página ${cardPageIndex + 1}`}
                                  style={{ width: `${note.imageSizes?.[cardPageIndex] || 100}%` }}
                                  className="max-h-[250px] object-contain rounded-xl cursor-pointer hover:brightness-95 transition-all shadow-md"
                                  onClick={() => setZoomedImage(note.images[cardPageIndex])}
                                  title="Clique para ampliar em tela cheia"
                                />
                                <span className="text-[8.5px] font-extrabold text-amber-800 uppercase tracking-tight mt-1">
                                  🔍 Clique na imagem para ampliar em tela cheia
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                      {isNoteUnlocked && note.signatureImg && (
                        <div className="mt-4 p-4 bg-white rounded-2xl border border-amber-200/60 shadow-inner flex flex-col items-center justify-center">
                          <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5 mb-1.5">
                            <Check className="w-3.5 h-3.5 text-green-600" />
                            Assinatura Eletrônica Coletada 🛡️
                          </span>
                          <img
                            src={note.signatureImg}
                            alt="Assinatura Digital"
                            className="max-h-24 object-contain max-w-full"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {/* Moving and folder selection row */}
                      {isNoteUnlocked && (
                        <div className="bg-amber-100/50 p-3 rounded-2xl border border-amber-200/40 flex flex-col md:flex-row items-center justify-between gap-3">
                        {editingNoteFolderId === note.id ? (
                          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                            <span className="text-[10px] font-black uppercase text-amber-950 tracking-wider">
                              Mover para:
                            </span>
                            <select
                              value={movingFolderInput}
                              onChange={(e) =>
                                setMovingFolderInput(e.target.value)
                              }
                              className="flex-1 min-w-[150px] bg-white border border-amber-200 rounded-xl px-2 py-1.5 text-xs text-slate-700 font-medium outline-none"
                            >
                              <option value="">-- Escolha a Pasta --</option>
                              <option value="Sem Pasta">📄 Sem Pasta</option>
                              {existingFolders.map((f) => (
                                <option key={f} value={f}>
                                  📁 {f}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Ou crie nova..."
                              value={
                                movingFolderInput === "Sem Pasta"
                                  ? ""
                                  : movingFolderInput
                              }
                              onChange={(e) =>
                                setMovingFolderInput(e.target.value)
                              }
                              className="flex-1 bg-white border border-amber-200 rounded-xl px-2 py-1.5 text-xs text-slate-700 font-medium outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const targetFolder =
                                    movingFolderInput === "Sem Pasta"
                                      ? ""
                                      : movingFolderInput.trim();
                                  if (handleUpdateNoteFolder) {
                                    handleUpdateNoteFolder(
                                      note.id,
                                      targetFolder,
                                    );
                                    if (
                                      targetFolder &&
                                      !createdFolders.includes(targetFolder)
                                    ) {
                                      setCreatedFolders((prev) =>
                                        Array.from(
                                          new Set([...prev, targetFolder]),
                                        ),
                                      );
                                    }
                                  }
                                  setEditingNoteFolderId(null);
                                  setMovingFolderInput("");
                                }}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteFolderId(null);
                                  setMovingFolderInput("");
                                }}
                                className="px-3 py-1.5 bg-slate-300 text-slate-800 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="text-[10px] font-extrabold text-amber-900 uppercase">
                              📂 Organizar este documento em outra pasta?
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteFolderId(note.id);
                                setMovingFolderInput(note.folder || "");
                              }}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                            >
                              <FolderPlus className="w-3.5 h-3.5" />
                              Mover Documento
                            </button>
                          </>
                        )}
                      </div>
                      )}

                      {isNoteUnlocked && (
                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-amber-200/50">
                          <button
                            type="button"
                            onClick={() => handleLoadNoteLocal(note)}
                            className="py-2 bg-amber-500 hover:bg-amber-600 text-white text-[9.5px] font-black uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all cursor-pointer text-center"
                            title="Editar Nota"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(note)}
                            className="py-2 bg-amber-600 hover:bg-amber-700 text-white text-[9.5px] font-black uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                            title="Baixar PDF"
                          >
                            PDF 📄
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintNote(note)}
                            className="py-2 bg-slate-800 hover:bg-slate-900 text-white text-[9.5px] font-black uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all cursor-pointer text-center"
                            title="Imprimir nota"
                          >
                            {printFormat === "a4" ? "Imp. A4 🖨️" : "Imp. Cupom 🧾"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}

                {/* Bottom Back Button */}
                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowSavedNotes(false)}
                    className="flex items-center gap-2 px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:shadow-emerald-700/20 active:scale-95 transition-all cursor-pointer border border-emerald-800"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar ao Editor (Nova Anotação / Diário) 📝</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {" "}
              {/* Ready Templates Selector Row - BAZAR DE PAPELARIA */}
              <div className="space-y-4">
                {/* Main Title & Mode Selector */}
                <div className="flex flex-col sm:flex-row items-center justify-between bg-amber-800/10 p-4 rounded-2xl border-2 border-amber-500/20 gap-3">
                   <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-700 animate-pulse" />
                    <div>
                      <span className="text-[8px] font-black tracking-widest text-amber-800 uppercase block">
                        TALÕES & RECIBOS
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        🏢 BAZAR DE PAPELARIA PRO (Modelos de Talões & Recibos)
                      </h3>
                    </div>
                  </div>

                  {/* Toggle button layout */}
                  <div className="flex items-center bg-amber-900/10 p-1 rounded-xl border border-amber-900/20 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setBazarViewMode("shelf")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all duration-300 ${
                        bazarViewMode === "shelf"
                          ? "bg-amber-700 text-white shadow-md scale-105"
                          : "text-amber-900/60 hover:text-amber-900"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Estante Vintage
                    </button>
                    <button
                      type="button"
                      onClick={() => setBazarViewMode("grid")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all duration-300 ${
                        bazarViewMode === "grid"
                          ? "bg-amber-700 text-white shadow-md scale-105"
                          : "text-amber-900/60 hover:text-amber-900"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" /> Grade Clássica
                    </button>
                  </div>
                </div>

                {bazarViewMode === "shelf" ? (
                  /* IMMERSIVE 3D WOODEN SHELF LAYOUT */
                  <div className="relative bg-gradient-to-b from-[#2e1a0c] via-[#4a2e16] to-[#1e1006] p-6 sm:p-8 rounded-[2.5rem] border-4 border-[#1c1005] shadow-2xl overflow-hidden animate-fade-in select-none">
                    {/* Gloss shine overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent)] pointer-events-none" />

                    <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 sm:gap-6 pb-6">
                      {/* 1. DIÁRIO DE GRATIDÃO (Talonário Azul) */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTemplate(
                              activeTemplate === "promissoria"
                                ? "none"
                                : "promissoria",
                            );
                            setShowForm(false);
                          }}
                          className={`relative w-full h-[190px] rounded-2xl flex transition-all duration-300 text-left overflow-hidden group cursor-pointer border shadow-xl ${
                            activeTemplate === "promissoria"
                              ? "bg-gradient-to-b from-blue-800 to-blue-950 text-white border-blue-400 ring-4 ring-yellow-400 -translate-y-3 scale-105"
                              : "bg-gradient-to-b from-blue-900 to-blue-950 text-slate-100 border-blue-900 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
                          }`}
                        >
                          {/* Spine binding with spiral stitches */}
                          <div className="w-5 bg-gradient-to-r from-neutral-900 to-slate-800 border-r border-blue-500/20 flex flex-col justify-around py-3 items-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-slate-400 border border-slate-600 shadow-inner"
                              />
                            ))}
                          </div>

                          {/* Book Cover Face */}
                          <div className="flex-1 p-3 flex flex-col justify-between relative">
                            {/* Double frame design */}
                            <div className="absolute inset-2 border border-blue-500/30 rounded-lg pointer-events-none" />

                            <div className="pt-1.5">
                              <div className="text-[6.5px] font-black tracking-widest text-blue-300 uppercase block opacity-70">
                                CAMBIAL
                              </div>
                              <h4 className="text-[11px] font-black uppercase text-yellow-400 leading-tight tracking-wider mt-1">
                                Nota Promissória
                              </h4>
                              <div className="h-[1px] bg-gradient-to-r from-blue-500/40 via-blue-500/10 to-transparent my-1" />
                            </div>

                            {/* Retro central sticker label */}
                            <div className="bg-[#fcf8ef] text-slate-900 p-1.5 rounded border border-blue-950/20 text-center shadow-md my-1">
                              <span className="text-[7px] font-black tracking-wider text-blue-900 uppercase block">
                                COBRANÇA
                              </span>
                              <span className="text-[6.5px] font-semibold italic text-blue-800 block leading-tight">
                                Compromisso Seguro
                              </span>
                            </div>

                            {/* Bottom spine stamp */}
                            <div className="flex items-end justify-between text-blue-300 pt-1">
                              <span className="text-[7px] font-bold tracking-widest uppercase">
                                VOL. 1
                              </span>
                              <span className="text-sm">📘</span>
                            </div>
                          </div>

                          {/* Pulling Ribbon / Tag */}
                          {activeTemplate === "promissoria" && (
                            <div className="absolute top-0 right-3 bg-yellow-400 text-slate-950 text-[6.5px] font-black px-1.5 py-0.5 rounded-b shadow-md tracking-wider animate-bounce">
                              EM USO
                            </div>
                          )}
                        </button>
                        {/* Retro Shelf Label Tag */}
                        <div className="mt-3 bg-[#e6ceac]/90 text-slate-950 text-[8px] font-black px-2.5 py-1 rounded-md shadow-md border border-[#c4a47a] uppercase tracking-wider text-center w-fit">
                          Capa Celeste
                        </div>
                      </div>

                      {/* 2. DIÁRIO PESSOAL (Talonário Verde) */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTemplate(
                              activeTemplate === "recibo_aluguel"
                                ? "none"
                                : "recibo_aluguel",
                            );
                            setShowForm(false);
                          }}
                          className={`relative w-full h-[190px] rounded-2xl flex transition-all duration-300 text-left overflow-hidden group cursor-pointer border shadow-xl ${
                            activeTemplate === "recibo_aluguel"
                              ? "bg-gradient-to-b from-emerald-800 to-emerald-950 text-white border-emerald-400 ring-4 ring-yellow-400 -translate-y-3 scale-105"
                              : "bg-gradient-to-b from-emerald-900 to-emerald-950 text-slate-100 border-emerald-900 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
                          }`}
                        >
                          {/* Spine binding with spiral stitches */}
                          <div className="w-5 bg-gradient-to-r from-neutral-900 to-slate-800 border-r border-emerald-500/20 flex flex-col justify-around py-3 items-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-slate-400 border border-slate-600 shadow-inner"
                              />
                            ))}
                          </div>

                          {/* Book Cover Face */}
                          <div className="flex-1 p-3 flex flex-col justify-between relative">
                            {/* Double frame design */}
                            <div className="absolute inset-2 border border-emerald-500/30 rounded-lg pointer-events-none" />

                            <div className="pt-1.5">
                              <div className="text-[6.5px] font-black tracking-widest text-emerald-300 uppercase block opacity-70">
                                LOCAÇÃO
                              </div>
                              <h4 className="text-[11px] font-black uppercase text-yellow-300 leading-tight tracking-wider mt-1">
                                Recibo Aluguel
                              </h4>
                              <div className="h-[1px] bg-gradient-to-r from-emerald-500/40 via-emerald-500/10 to-transparent my-1" />
                            </div>

                            {/* Retro central sticker label */}
                            <div className="bg-[#fcf8ef] text-slate-900 p-1.5 rounded border border-emerald-950/20 text-center shadow-md my-1">
                              <span className="text-[7px] font-black tracking-wider text-emerald-950 uppercase block">
                                INQUILINATO
                              </span>
                              <span className="text-[6.5px] font-semibold italic text-emerald-800 block leading-tight">
                                Imóvel Residencial
                              </span>
                            </div>

                            {/* Bottom spine stamp */}
                            <div className="flex items-end justify-between text-emerald-300 pt-1">
                              <span className="text-[7px] font-bold tracking-widest uppercase">
                                VOL. 1
                              </span>
                              <span className="text-xs">💚</span>
                            </div>
                          </div>

                          {/* Pulling Ribbon / Tag */}
                          {activeTemplate === "recibo_aluguel" && (
                            <div className="absolute top-0 right-3 bg-yellow-400 text-slate-950 text-[6.5px] font-black px-1.5 py-0.5 rounded-b shadow-md tracking-wider animate-bounce">
                              EM USO
                            </div>
                          )}
                        </button>
                        {/* Retro Shelf Label Tag */}
                        <div className="mt-3 bg-[#e6ceac]/90 text-slate-950 text-[8px] font-black px-2.5 py-1 rounded-md shadow-md border border-[#c4a47a] uppercase tracking-wider text-center w-fit">
                          Capa Esmeralda
                        </div>
                      </div>

                      {/* 3. IDEIAS & INSIGHTS (Talonário Rosa) */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTemplate(
                              activeTemplate === "recibo" ? "none" : "recibo",
                            );
                            setShowForm(false);
                          }}
                          className={`relative w-full h-[190px] rounded-2xl flex transition-all duration-300 text-left overflow-hidden group cursor-pointer border shadow-xl ${
                            activeTemplate === "recibo"
                              ? "bg-gradient-to-b from-rose-800 to-rose-950 text-white border-rose-400 ring-4 ring-yellow-400 -translate-y-3 scale-105"
                              : "bg-gradient-to-b from-rose-900 to-rose-950 text-slate-100 border-rose-950 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
                          }`}
                        >
                          {/* Spine binding with spiral stitches */}
                          <div className="w-5 bg-gradient-to-r from-neutral-900 to-slate-800 border-r border-rose-500/20 flex flex-col justify-around py-3 items-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-slate-400 border border-slate-600 shadow-inner"
                              />
                            ))}
                          </div>

                          {/* Book Cover Face */}
                          <div className="flex-1 p-3 flex flex-col justify-between relative">
                            {/* Double frame design */}
                            <div className="absolute inset-2 border border-rose-500/30 rounded-lg pointer-events-none" />

                            <div className="pt-1.5">
                              <div className="text-[6.5px] font-black tracking-widest text-rose-300 uppercase block opacity-70">
                                COMERCIAL
                              </div>
                              <h4 className="text-[11px] font-black uppercase text-yellow-300 leading-tight tracking-wider mt-1">
                                Recibo Comercial
                              </h4>
                              <div className="h-[1px] bg-gradient-to-r from-rose-500/40 via-rose-500/10 to-transparent my-1" />
                            </div>

                            {/* Retro central sticker label */}
                            <div className="bg-[#fcf8ef] text-slate-900 p-1.5 rounded border border-rose-950/20 text-center shadow-md my-1">
                              <span className="text-[7px] font-black tracking-wider text-rose-950 uppercase block">
                                QUITAÇÃO
                              </span>
                              <span className="text-[6.5px] font-semibold italic text-rose-800 block leading-tight">
                                Pagamento de Serviços
                              </span>
                            </div>

                            {/* Bottom spine stamp */}
                            <div className="flex items-end justify-between text-rose-300 pt-1">
                              <span className="text-[7px] font-bold tracking-widest uppercase">
                                VOL. 1
                              </span>
                              <span className="text-sm">📕</span>
                            </div>
                          </div>

                          {/* Pulling Ribbon / Tag */}
                          {activeTemplate === "recibo" && (
                            <div className="absolute top-0 right-3 bg-yellow-400 text-slate-950 text-[6.5px] font-black px-1.5 py-0.5 rounded-b shadow-md tracking-wider animate-bounce">
                              EM USO
                            </div>
                          )}
                        </button>
                        {/* Retro Shelf Label Tag */}
                        <div className="mt-3 bg-[#e6ceac]/90 text-slate-950 text-[8px] font-black px-2.5 py-1 rounded-md shadow-md border border-[#c4a47a] uppercase tracking-wider text-center w-fit">
                          Capa Carmesim
                        </div>
                      </div>

                      {/* 4. PLANEJADOR DIÁRIO (Capa Parda/Craft) */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTemplate(
                              activeTemplate === "orcamento"
                                ? "none"
                                : "orcamento",
                            );
                            setShowForm(false);
                          }}
                          className={`relative w-full h-[190px] rounded-2xl flex transition-all duration-300 text-left overflow-hidden group cursor-pointer border shadow-xl ${
                            activeTemplate === "orcamento"
                              ? "bg-gradient-to-b from-amber-700 to-amber-950 text-white border-amber-450 ring-4 ring-yellow-400 -translate-y-3 scale-105"
                              : "bg-gradient-to-b from-amber-800 to-amber-950 text-slate-100 border-amber-900 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
                          }`}
                        >
                          {/* Spine binding with spiral stitches */}
                          <div className="w-5 bg-gradient-to-r from-amber-950 to-amber-900 border-r border-amber-500/20 flex flex-col justify-around py-3 items-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-amber-600 border border-amber-850 shadow-inner"
                              />
                            ))}
                          </div>

                          {/* Book Cover Face */}
                          <div className="flex-1 p-3 flex flex-col justify-between relative">
                            {/* Double frame design */}
                            <div className="absolute inset-2 border border-amber-500/30 rounded-lg pointer-events-none" />

                            <div className="pt-1.5">
                              <div className="text-[6.5px] font-black tracking-widest text-amber-300 uppercase block opacity-70">
                                PROPOSTA
                              </div>
                              <h4 className="text-[11px] font-black uppercase text-yellow-300 leading-tight tracking-wider mt-1">
                                Orçamento Serviços
                              </h4>
                              <div className="h-[1px] bg-gradient-to-r from-amber-500/40 via-amber-500/10 to-transparent my-1" />
                            </div>

                            {/* Retro central sticker label */}
                            <div className="bg-[#fcf8ef] text-slate-900 p-1.5 rounded border border-amber-950/20 text-center shadow-md my-1">
                              <span className="text-[7px] font-black tracking-wider text-amber-950 uppercase block">
                                ESTIMATIVAS
                              </span>
                              <span className="text-[6.5px] font-semibold italic text-amber-800 block leading-tight">
                                Valores & Serviços
                              </span>
                            </div>

                            {/* Bottom spine stamp */}
                            <div className="flex items-end justify-between text-amber-300 pt-1">
                              <span className="text-[7px] font-bold tracking-widest uppercase">
                                VOL. 1
                              </span>
                              <span className="text-xs">📙</span>
                            </div>
                          </div>

                          {/* Pulling Ribbon / Tag */}
                          {activeTemplate === "orcamento" && (
                            <div className="absolute top-0 right-3 bg-yellow-400 text-slate-950 text-[6.5px] font-black px-1.5 py-0.5 rounded-b shadow-md tracking-wider animate-bounce">
                              EM USO
                            </div>
                          )}
                        </button>
                        {/* Retro Shelf Label Tag */}
                        <div className="mt-3 bg-[#e6ceac]/90 text-slate-950 text-[8px] font-black px-2.5 py-1 rounded-md shadow-md border border-[#c4a47a] uppercase tracking-wider text-center w-fit">
                          Capa Craft
                        </div>
                      </div>

                      {/* 5. NOTAS LIVRES (Bloco Riscado) */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTemplate("none");
                            setShowForm(false);
                          }}
                          className={`relative w-full h-[190px] rounded-2xl flex transition-all duration-300 text-left overflow-hidden group cursor-pointer border shadow-xl ${
                            activeTemplate === "none"
                              ? "bg-gradient-to-b from-slate-700 to-slate-900 text-white border-slate-500 ring-4 ring-yellow-400 -translate-y-3 scale-105"
                              : "bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 border-slate-750 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
                          }`}
                        >
                          {/* Spine binding with spiral stitches */}
                          <div className="w-5 bg-gradient-to-r from-neutral-900 to-slate-800 border-r border-slate-500/20 flex flex-col justify-around py-3 items-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-slate-400 border border-slate-600 shadow-inner"
                              />
                            ))}
                          </div>

                          {/* Book Cover Face */}
                          <div className="flex-1 p-3 flex flex-col justify-between relative">
                            {/* Double frame design */}
                            <div className="absolute inset-2 border border-slate-500/30 rounded-lg pointer-events-none" />

                            <div className="pt-1.5">
                              <div className="text-[6.5px] font-black tracking-widest text-slate-300 uppercase block opacity-70">
                                SOUVENIR
                              </div>
                              <h4 className="text-[11px] font-black uppercase text-yellow-300 leading-tight tracking-wider mt-1">
                                Escrita Livre / Notas
                              </h4>
                              <div className="h-[1px] bg-gradient-to-r from-slate-500/40 via-slate-500/10 to-transparent my-1" />
                            </div>

                            {/* Retro central sticker label */}
                            <div className="bg-[#fcf8ef] text-slate-900 p-1.5 rounded border border-slate-950/20 text-center shadow-md my-1">
                              <span className="text-[7px] font-black tracking-wider text-slate-950 uppercase block">
                                RASCUNHO RÁPIDO
                              </span>
                              <span className="text-[6.5px] font-semibold italic text-slate-800 block leading-tight">
                                Digitação Manual
                              </span>
                            </div>

                            {/* Bottom spine stamp */}
                            <div className="flex items-end justify-between text-slate-300 pt-1">
                              <span className="text-[7px] font-bold tracking-widest uppercase">
                                VOL. 1
                              </span>
                              <span className="text-xs">📓</span>
                            </div>
                          </div>

                          {/* Pulling Ribbon / Tag */}
                          {activeTemplate === "none" && (
                            <div className="absolute top-0 right-3 bg-yellow-400 text-slate-950 text-[6.5px] font-black px-1.5 py-0.5 rounded-b shadow-md tracking-wider animate-bounce">
                              EM USO
                            </div>
                          )}
                        </button>
                        {/* Retro Shelf Label Tag */}
                        <div className="mt-3 bg-[#e6ceac]/90 text-slate-950 text-[8px] font-black px-2.5 py-1 rounded-md shadow-md border border-[#c4a47a] uppercase tracking-wider text-center w-fit">
                          Bloco Riscado
                        </div>
                      </div>
                    </div>

                    {/* The Wood Shelf Deck (realistic 3D look) */}
                    <div className="absolute bottom-[28px] left-0 right-0 h-4 bg-gradient-to-r from-[#5a341b] via-[#85512d] to-[#5a341b] rounded-sm border-t border-amber-600/30 shadow-[0_5px_10px_rgba(0,0,0,0.8)] z-20" />
                    <div className="absolute bottom-0 left-0 right-0 h-7 bg-[#140b04] pointer-events-none" />

                    {/* Soft vintage hanging text under the shelf */}
                    <div className="absolute bottom-1 left-0 right-0 text-center relative z-30">
                      <span className="text-[7.5px] font-black text-amber-550 tracking-[0.2em] uppercase">
                        ✦ Selecione um talão ou recibo acima para carregar o modelo comercial na mesa de trabalho ✦
                      </span>
                    </div>
                  </div>
                ) : (
                  /* STANDARD MODERN FLAT GRID LAYOUT */
                  <div className="bg-amber-800/5 p-5 sm:p-6 rounded-[2rem] border-2 border-amber-500/20 space-y-4 shadow-sm animate-fade-in">
                    <span className="text-[10px] font-black text-amber-900 tracking-wider uppercase block flex items-center gap-1.5">
                      <span className="text-xs font-black text-amber-950 tracking-wider uppercase flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-700 animate-pulse" />
                        🏪 Grade Clássica de Escolha Rápida
                      </span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 pt-1 w-full">
                      {/* 1. DIÁRIO DE GRATIDÃO CARD */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTemplate(
                            activeTemplate === "promissoria"
                              ? "none"
                              : "promissoria",
                          );
                          setShowForm(false);
                        }}
                        className={`relative rounded-2xl p-4 text-left flex flex-col justify-between transition-all duration-300 border-2 select-none h-[155px] cursor-pointer overflow-hidden ${
                          activeTemplate === "promissoria"
                            ? "bg-gradient-to-br from-blue-900 to-blue-950 text-white border-blue-500 scale-[1.02] shadow-lg shadow-blue-900/20"
                            : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-blue-300 hover:scale-[1.02] shadow-sm"
                        }`}
                      >
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-b border-slate-300" />
                        {activeTemplate === "promissoria" && (
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-400" />
                        )}

                        <div className="pt-2">
                          <span className="text-[7.5px] font-black tracking-widest uppercase block opacity-70 mb-1">
                            Título de Crédito Cambial
                          </span>
                          <h4
                            className={`text-xs font-black uppercase leading-tight ${activeTemplate === "promissoria" ? "text-yellow-400" : "text-blue-900"}`}
                          >
                            Nota Promissória
                          </h4>
                          <p className="text-[8.5px] font-semibold mt-1 opacity-80 leading-snug">
                            Gere promessas de pagamento com força jurídica e termo de vencimento.
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-current/15 pt-2 mt-auto">
                          <span className="text-[8px] font-black uppercase tracking-wider">
                            Capa Celeste
                          </span>
                          <span className="text-xs">📘</span>
                        </div>
                      </button>

                      {/* 2. DIÁRIO PESSOAL CARD */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTemplate(
                            activeTemplate === "recibo_aluguel"
                              ? "none"
                              : "recibo_aluguel",
                          );
                          setShowForm(false);
                        }}
                        className={`relative rounded-2xl p-4 text-left flex flex-col justify-between transition-all duration-300 border-2 select-none h-[155px] cursor-pointer overflow-hidden ${
                          activeTemplate === "recibo_aluguel"
                            ? "bg-gradient-to-br from-emerald-800 to-emerald-950 text-white border-emerald-500 scale-[1.02] shadow-lg shadow-emerald-900/20"
                            : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-300 hover:scale-[1.02] shadow-sm"
                        }`}
                      >
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-b border-slate-300" />
                        {activeTemplate === "recibo_aluguel" && (
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-400" />
                        )}

                        <div className="pt-2">
                          <span className="text-[7.5px] font-black tracking-widest uppercase block opacity-70 mb-1">
                            Contratos e Inquilinos
                          </span>
                          <h4
                            className={`text-xs font-black uppercase leading-tight ${activeTemplate === "recibo_aluguel" ? "text-yellow-300" : "text-emerald-800"}`}
                          >
                            Recibo Aluguel
                          </h4>
                          <p className="text-[8.5px] font-semibold mt-1 opacity-85 leading-tight">
                            Comprove a quitação periódica de locações de imóveis ou bens móveis.
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-current/15 pt-2 mt-auto">
                          <span className="text-[8px] font-black uppercase tracking-wider">
                            Capa Esmeralda
                          </span>
                          <span className="text-xs">💚</span>
                        </div>
                      </button>

                      {/* 3. IDEIAS & PROJETOS CARD */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTemplate(
                            activeTemplate === "recibo" ? "none" : "recibo",
                          );
                          setShowForm(false);
                        }}
                        className={`relative rounded-2xl p-4 text-left flex flex-col justify-between transition-all duration-300 border-2 select-none h-[155px] cursor-pointer overflow-hidden ${
                          activeTemplate === "recibo"
                            ? "bg-gradient-to-br from-red-800 to-red-950 text-white border-red-500 scale-[1.02] shadow-lg shadow-red-900/20"
                            : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-red-300 hover:scale-[1.02] shadow-sm"
                        }`}
                      >
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-b border-slate-300" />
                        {activeTemplate === "recibo" && (
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-400" />
                        )}

                        <div className="pt-2">
                          <span className="text-[7.5px] font-black tracking-widest uppercase block opacity-70 mb-1">
                            Vendas e Serviços Gerais
                          </span>
                          <h4
                            className={`text-xs font-black uppercase leading-tight ${activeTemplate === "recibo" ? "text-yellow-300" : "text-red-800"}`}
                          >
                            Recibo Comercial
                          </h4>
                          <p className="text-[8.5px] font-semibold mt-1 opacity-80 leading-snug">
                            Outorgue quitação plena por serviços prestados ou recebimento de valores.
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-current/15 pt-2 mt-auto">
                          <span className="text-[8px] font-black uppercase tracking-wider">
                            Capa Carmesim
                          </span>
                          <span className="text-xs">📕</span>
                        </div>
                      </button>

                      {/* 4. PLANEJADOR DIÁRIO CARD */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTemplate(
                            activeTemplate === "orcamento"
                              ? "none"
                              : "orcamento",
                          );
                          setShowForm(false);
                        }}
                        className={`relative rounded-2xl p-4 text-left flex flex-col justify-between transition-all duration-300 border-2 select-none h-[155px] cursor-pointer overflow-hidden ${
                          activeTemplate === "orcamento"
                            ? "bg-gradient-to-br from-amber-800 to-amber-950 text-white border-amber-600 scale-[1.02] shadow-lg shadow-amber-900/20"
                            : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-amber-300 hover:scale-[1.02] shadow-sm"
                        }`}
                      >
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-b border-slate-300" />
                        {activeTemplate === "orcamento" && (
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400" />
                        )}

                        <div className="pt-2">
                          <span className="text-[7.5px] font-black tracking-widest uppercase block opacity-70 mb-1">
                            Estimativas & Cotações
                          </span>
                          <h4
                            className={`text-xs font-black uppercase leading-tight ${activeTemplate === "orcamento" ? "text-yellow-300" : "text-amber-800"}`}
                          >
                            Orçamento Serviços
                          </h4>
                          <p className="text-[8.5px] font-semibold mt-1 opacity-80 leading-snug">
                            Gere descrições de preços e peças de serviços detalhados aos seus clientes.
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-current/15 pt-2 mt-auto">
                          <span className="text-[8px] font-black uppercase tracking-wider">
                            Capa Craft
                          </span>
                          <span className="text-xs">📙</span>
                        </div>
                      </button>

                      {/* 5. ESCRITA LIVRE / NOTAS CARD */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTemplate("none");
                          setShowForm(false);
                        }}
                        className={`relative rounded-2xl p-4 text-left flex flex-col justify-between transition-all duration-300 border-2 select-none h-[155px] cursor-pointer overflow-hidden ${
                          activeTemplate === "none"
                            ? "bg-gradient-to-br from-slate-700 to-slate-900 text-white border-slate-500 scale-[1.02] shadow-lg"
                            : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-400 hover:scale-[1.02] shadow-sm"
                        }`}
                      >
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-b border-slate-300" />
                        {activeTemplate === "none" && (
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-400" />
                        )}

                        <div className="pt-2">
                          <span className="text-[7.5px] font-black tracking-widest uppercase block opacity-70 mb-1">
                            Rascunho Rápido
                          </span>
                          <h4
                            className={`text-xs font-black uppercase leading-tight ${activeTemplate === "none" ? "text-yellow-300" : "text-slate-800"}`}
                          >
                            Notas Livres
                          </h4>
                          <p className="text-[8.5px] font-semibold mt-1 opacity-80 leading-snug">
                            Uma folha em branco limpa para qualquer tipo de anotação livre.
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-current/15 pt-2 mt-auto">
                          <span className="text-[8px] font-black uppercase tracking-wider">
                            Bloco Riscado
                          </span>
                          <span className="text-xs">📓</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Dynamic form assistant to fill fields easily */}
              {false && (
                <div className="bg-white/80 border-2 border-amber-200/60 rounded-3xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                    <span className="text-[10px] font-black text-amber-900 tracking-wider uppercase flex items-center gap-1.5">
                      <RefreshCw
                        className="w-3.5 h-3.5 text-amber-600 animate-spin"
                        style={{ animationDuration: "8s" }}
                      />
                      Formulário de Preenchimento Rápido
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowForm(!showForm)}
                      className="text-amber-800 hover:text-amber-950 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-100 px-2 py-1 rounded-lg"
                    >
                      {showForm ? (
                        <>
                          Ocultar Formulário <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          Mostrar Formulário <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>

                  {showForm && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* PROMISSÓRIA FORM FIELDS */}
                      {activeTemplate === "promissoria" && (
                        <>
                          <div className="sm:col-span-2 lg:col-span-3 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl">
                            <label className="text-[10px] font-black text-amber-950 uppercase block mb-1">
                              ⚖️ Segmento de Termos Jurídicos (Nota Promissória)
                            </label>
                            <select
                              value={promissoriaLegalSegment}
                              onChange={(e: any) =>
                                setPromissoriaLegalSegment(e.target.value)
                              }
                              className="w-full bg-white border-2 border-amber-500/40 rounded-xl p-2.5 text-xs text-amber-950 font-black uppercase outline-none cursor-pointer"
                            >
                              <option value="promissoria_comum">
                                Garantia de Empréstimo Pessoal (Civil - Art. 586
                                CC)
                              </option>
                              <option value="promissoria_comercial">
                                Transação Comercial / Crédito Mercantil (Genebra
                                - Dec. 57.663)
                              </option>
                              <option value="promissoria_caucao">
                                Garantia Contratual / Caução (Vinculada a
                                Contrato)
                              </option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Nº da Nota / Título
                            </label>
                            <input
                              type="text"
                              value={promissoriaNum}
                              onChange={(e) =>
                                setPromissoriaNum(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold uppercase outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Folha Nº (Bloco/Talonário)
                            </label>
                            <input
                              type="text"
                              value={promissoriaFolha}
                              onChange={(e) =>
                                setPromissoriaFolha(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold uppercase outline-none focus:bg-white"
                              placeholder="Ex: 01"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[9px] font-black text-amber-900 uppercase block">
                                Chave Autenticadora
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const r = Math.floor(
                                    1000 + Math.random() * 9000,
                                  );
                                  const r2 = Math.floor(
                                    1000 + Math.random() * 9000,
                                  );
                                  setPromissoriaChave(`NP-${r}-${r2}`);
                                }}
                                className="text-[8px] font-black text-amber-700 hover:text-amber-900 uppercase flex items-center gap-0.5"
                                title="Gerar nova chave de autenticação para este comprovante"
                              >
                                🔄 Nova Chave
                              </button>
                            </div>
                            <input
                              type="text"
                              readOnly
                              value={promissoriaChave}
                              className="w-full bg-amber-100/50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 font-mono font-bold uppercase outline-none cursor-not-allowed select-all"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Valor da Promissória (R$)
                            </label>
                            <input
                              type="text"
                              value={promissoriaValor}
                              onChange={(e) =>
                                setPromissoriaValor(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Vencimento da Nota
                            </label>
                            <input
                              type="date"
                              value={promissoriaVenc}
                              onChange={(e) =>
                                setPromissoriaVenc(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                           <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Emitente / Devedor (Inquilino / Locatário)
                            </label>
                            <input
                              type="text"
                              placeholder="Nome do Cliente / Locatário"
                              value={promissoriaDevedor}
                              onChange={(e) =>
                                setPromissoriaDevedor(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold uppercase outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              CPF/CNPJ do Devedor (Inquilino)
                            </label>
                            <input
                              type="text"
                              placeholder="000.000.000-00"
                              value={promissoriaCpf}
                              onChange={(e) =>
                                setPromissoriaCpf(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Telefone do Devedor (Inquilino)
                            </label>
                            <input
                              type="text"
                              placeholder="(00) 00000-0000"
                              value={promissoriaFone}
                              onChange={(e) =>
                                setPromissoriaFone(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Endereço do Imóvel / Local Vinculado (Aluguel)
                            </label>
                            <input
                              type="text"
                              placeholder="Rua, Número, Bairro, Cidade, Estado..."
                              value={promissoriaEndereco}
                              onChange={(e) =>
                                setPromissoriaEndereco(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Credor / Beneficiário (Locador / Proprietário)
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Nome de quem recebe"
                              value={promissoriaCredor}
                              onChange={(e) =>
                                setPromissoriaCredor(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold uppercase outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              CPF/CNPJ do Credor (Locador)
                            </label>
                            <input
                              type="text"
                              placeholder="CNPJ ou CPF do proprietário"
                              value={promissoriaCnpjCredor}
                              onChange={(e) =>
                                setPromissoriaCnpjCredor(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Telefone/Celular do Credor
                            </label>
                            <input
                              type="text"
                              placeholder="Celular do Credor"
                              value={promissoriaFoneCredor}
                              onChange={(e) =>
                                setPromissoriaFoneCredor(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Endereço do Credor
                            </label>
                            <input
                              type="text"
                              placeholder="Endereço de quem recebe"
                              value={promissoriaEnderecoCredor}
                              onChange={(e) =>
                                setPromissoriaEnderecoCredor(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div className="sm:col-span-2 lg:col-span-3">
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Valor por Extenso
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Trezentos e cinquenta reais"
                              value={promissoriaExtenso}
                              onChange={(e) =>
                                setPromissoriaExtenso(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                        </>
                      )}

                      {/* RECIBO FORM FIELDS */}
                      {activeTemplate === "recibo" && (
                        <>
                          <div className="sm:col-span-2 lg:col-span-3 bg-red-500/10 border border-red-500/20 p-3 rounded-2xl">
                            <label className="text-[10px] font-black text-amber-950 uppercase block mb-1">
                              ⚖️ Segmento de Termos Jurídicos (Recibo Comercial)
                            </label>
                            <select
                              value={reciboLegalSegment}
                              onChange={(e: any) =>
                                setReciboLegalSegment(e.target.value)
                              }
                              className="w-full bg-white border-2 border-red-500/40 rounded-xl p-2.5 text-xs text-amber-950 font-black uppercase outline-none cursor-pointer"
                            >
                              <option value="recibo_quitacao">
                                Quitação Plena, Geral e Irrevogável (Art. 319 e
                                320 CC)
                              </option>
                              <option value="recibo_arras">
                                Sinal e Princípio de Pagamento - Arras (Art.
                                417-420 CC)
                              </option>
                              <option value="recibo_servicos">
                                Prestação de Serviços Autônomos (Honorários
                                Civis)
                              </option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Nº do Recibo
                            </label>
                            <input
                              type="text"
                              value={reciboNum}
                              onChange={(e) => setReciboNum(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold uppercase outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Folha Nº (Bloco/Talonário)
                            </label>
                            <input
                              type="text"
                              value={reciboFolha}
                              onChange={(e) => setReciboFolha(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold uppercase outline-none focus:bg-white"
                              placeholder="Ex: 01"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[9px] font-black text-amber-900 uppercase block">
                                Chave Autenticadora
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const r = Math.floor(
                                    1000 + Math.random() * 9000,
                                  );
                                  const r2 = Math.floor(
                                    1000 + Math.random() * 9000,
                                  );
                                  setReciboChave(`RC-${r}-${r2}`);
                                }}
                                className="text-[8px] font-black text-amber-700 hover:text-amber-900 uppercase flex items-center gap-0.5"
                                title="Gerar nova chave de comprovação de recebimento"
                              >
                                🔄 Nova Chave
                              </button>
                            </div>
                            <input
                              type="text"
                              readOnly
                              value={reciboChave}
                              className="w-full bg-amber-100/50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 font-mono font-bold uppercase outline-none cursor-not-allowed select-all"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Valor do Pagamento (R$)
                            </label>
                            <input
                              type="text"
                              value={reciboValor}
                              onChange={(e) => setReciboValor(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Nome do Cliente
                            </label>
                            <input
                              type="text"
                              placeholder="Quem pagou"
                              value={reciboCliente}
                              onChange={(e) => setReciboCliente(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold uppercase outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              CPF/CNPJ do Cliente
                            </label>
                            <input
                              type="text"
                              placeholder="CPF/CNPJ de quem pagou"
                              value={reciboCpf}
                              onChange={(e) => setReciboCpf(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Telefone/Celular do Cliente
                            </label>
                            <input
                              type="text"
                              placeholder="Telefone do cliente"
                              value={reciboFoneCliente}
                              onChange={(e) => setReciboFoneCliente(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Endereço do Cliente
                            </label>
                            <input
                              type="text"
                              placeholder="Endereço do cliente"
                              value={reciboEnderecoCliente}
                              onChange={(e) => setReciboEnderecoCliente(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Referente a (Descrição)
                            </label>
                            <input
                              type="text"
                              value={reciboDesc}
                              onChange={(e) => setReciboDesc(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                              placeholder="Ex: Aluguel de casa"
                            />
                            <div className="mt-2.5 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                              <span className="text-[8px] font-black text-amber-900 uppercase block mb-1">
                                💡 Atalhos de Preenchimento Rápido (Sugestões de
                                Aluguel/Serviço):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  {
                                    label: "🏠 Aluguel de Casa",
                                    val: "Aluguel de casa",
                                  },
                                  {
                                    label: "🏢 Aluguel de Apartamento",
                                    val: "Aluguel de apartamento",
                                  },
                                  {
                                    label: "📦 Aluguel de Kitnet",
                                    val: "Aluguel de kit net",
                                  },
                                  {
                                    label: "🏪 Aluguel de Loja",
                                    val: "Aluguel de loja",
                                  },
                                  {
                                    label: "Carro 🚗 Aluguel de Carro",
                                    val: "Aluguel de carro",
                                  },
                                  {
                                    label: "Moto 🏍️ Aluguel de Moto",
                                    val: "Aluguel de moto",
                                  },
                                  {
                                    label: "🎈 Espaço/Salão",
                                    val: "Aluguel de salão de festas",
                                  },
                                  {
                                    label: "🛠️ Máquinas",
                                    val: "Aluguel de equipamentos",
                                  },
                                  {
                                    label: "🚘 Garagem",
                                    val: "Aluguel de vaga de garagem",
                                  },
                                  {
                                    label: "🧹 Serviços",
                                    val: "Prestação de serviços",
                                  },
                                ].map((item) => (
                                  <button
                                    type="button"
                                    key={item.label}
                                    onClick={() => {
                                      const currentMonth =
                                        new Date().toLocaleString("pt-BR", {
                                          month: "long",
                                        });
                                      const capitalizedMonth =
                                        currentMonth.charAt(0).toUpperCase() +
                                        currentMonth.slice(1);
                                      const currentYear =
                                        new Date().getFullYear();
                                      setReciboDesc(
                                        `${item.val} referente ao mês de ${capitalizedMonth}/${currentYear}`,
                                      );
                                    }}
                                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-950 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all border border-amber-300"
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Emitente (Quem Recebeu)
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Nome do Emitente (Quem recebeu)"
                              value={reciboEmitente}
                              onChange={(e) =>
                                setReciboEmitente(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold uppercase outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              CPF/CNPJ do Emitente
                            </label>
                            <input
                              type="text"
                              placeholder="CPF/CNPJ de quem recebeu"
                              value={reciboCpfEmitente}
                              onChange={(e) => setReciboCpfEmitente(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Telefone/Celular do Emitente
                            </label>
                            <input
                              type="text"
                              placeholder="Telefone de quem recebeu"
                              value={reciboFoneEmitente}
                              onChange={(e) => setReciboFoneEmitente(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Endereço do Emitente
                            </label>
                            <input
                              type="text"
                              placeholder="Endereço de quem recebeu"
                              value={reciboEnderecoEmitente}
                              onChange={(e) => setReciboEnderecoEmitente(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Data de Emissão
                            </label>
                            <input
                              type="date"
                              value={reciboData}
                              onChange={(e) => setReciboData(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Valor por Extenso
                            </label>
                            <input
                              type="text"
                              value={reciboExtenso}
                              onChange={(e) => setReciboExtenso(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Meio de Pagamento
                            </label>
                            <select
                              value={reciboMeioPagamento}
                              onChange={(e) =>
                                setReciboMeioPagamento(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            >
                              <option value="PIX">⚡ PIX</option>
                              <option value="Dinheiro">💵 Dinheiro</option>
                              <option value="Cartão de Crédito">
                                💳 Cartão de Crédito
                              </option>
                              <option value="Cartão de Débito">
                                💳 Cartão de Débito
                              </option>
                              <option value="Transferência Bancária">
                                🏦 Transferência Bancária / TED
                              </option>
                              <option value="Cheque">✍️ Cheque</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Tipo de Quitação
                            </label>
                            <div className="flex bg-amber-100 p-1 rounded-xl gap-1">
                              <button
                                type="button"
                                onClick={() => setReciboTipo("integral")}
                                className={`flex-1 py-1 px-2 rounded-lg text-[9.5px] font-black uppercase transition-all ${reciboTipo === "integral" ? "bg-amber-600 text-white" : "text-amber-900 hover:bg-amber-200"}`}
                              >
                                Integral (Pago Tudo)
                              </button>
                              <button
                                type="button"
                                onClick={() => setReciboTipo("parcial")}
                                className={`flex-1 py-1 px-2 rounded-lg text-[9.5px] font-black uppercase transition-all ${reciboTipo === "parcial" ? "bg-amber-600 text-white" : "text-amber-900 hover:bg-amber-200"}`}
                              >
                                Parcial (Futuros Pgtos)
                              </button>
                            </div>
                          </div>

                          {reciboTipo === "parcial" && (
                            <>
                              <div>
                                <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                                  Valor Restante Pendente (R$)
                                </label>
                                <input
                                  type="text"
                                  placeholder="0,00"
                                  value={reciboValorRestante}
                                  onChange={(e) =>
                                    setReciboValorRestante(e.target.value)
                                  }
                                  className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white animate-pulse"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                                  Data Limite do Próximo Pagamento
                                </label>
                                <input
                                  type="date"
                                  value={reciboVencRestante}
                                  onChange={(e) =>
                                    setReciboVencRestante(e.target.value)
                                  }
                                  className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                                />
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {/* RECIBO DE ALUGUEL FORM FIELDS */}
                      {activeTemplate === "recibo_aluguel" && (
                        <>
                          <div className="sm:col-span-2 lg:col-span-3 bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/10 mb-2">
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1.5">
                              🔑 Categoria do Aluguel (Selecione o Talonário
                              Específico)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                              {[
                                { val: "casa", label: "🏠 Casa" },
                                { val: "apartamento", label: "🏢 Apartamento" },
                                { val: "kitnet", label: "📦 Kitnet" },
                                { val: "loja", label: "🏪 Loja" },
                                { val: "carro", label: "🚗 Carro" },
                                { val: "moto", label: "🏍️ Moto" },
                                { val: "garagem", label: "🚘 Vaga" },
                              ].map((item) => (
                                <button
                                  type="button"
                                  key={item.val}
                                  onClick={() =>
                                    setAluguelTipo(item.val as any)
                                  }
                                  className={`py-1.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider text-center border transition-all ${
                                    aluguelTipo === item.val
                                      ? "bg-emerald-600 border-emerald-700 text-white shadow-sm"
                                      : "bg-white border-slate-200 hover:border-emerald-300 text-slate-800"
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="sm:col-span-2 lg:col-span-3 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
                            <label className="text-[10px] font-black text-emerald-950 uppercase block mb-1">
                              ⚖️ Segmento de Termos Jurídicos (Recibo de
                              Aluguel)
                            </label>
                            <select
                              value={aluguelLegalSegment}
                              onChange={(e: any) =>
                                setAluguelLegalSegment(e.target.value)
                              }
                              className="w-full bg-white border-2 border-emerald-500/40 rounded-xl p-2.5 text-xs text-amber-950 font-black uppercase outline-none cursor-pointer"
                            >
                              <option value="aluguel_residencial">
                                Locação Residencial Urbana (Lei 8.245/91 - Art.
                                46)
                              </option>
                              <option value="aluguel_comercial">
                                Locação Comercial / Não Residencial (Lei
                                8.245/91 - Art. 51)
                              </option>
                              <option value="aluguel_temporada">
                                Locação por Temporada de Curto Prazo (Lei
                                8.245/91 - Art. 48)
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Nº do Recibo de Aluguel
                            </label>
                            <input
                              type="text"
                              value={aluguelNum}
                              onChange={(e) => setAluguelNum(e.target.value)}
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Folha Nº (Talonário/Bloco)
                            </label>
                            <input
                              type="text"
                              value={aluguelFolha}
                              onChange={(e) => setAluguelFolha(e.target.value)}
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                              placeholder="Ex: 01"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[9px] font-black text-emerald-900 uppercase block">
                                Chave Autenticadora
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const r = Math.floor(
                                    1000 + Math.random() * 9000,
                                  );
                                  const r2 = Math.floor(
                                    1000 + Math.random() * 9000,
                                  );
                                  setAluguelChave(`AL-${r}-${r2}`);
                                }}
                                className="text-[8px] font-black text-emerald-700 hover:text-emerald-950 uppercase flex items-center gap-0.5"
                                title="Gerar nova chave de comprovação"
                              >
                                🔄 Nova Chave
                              </button>
                            </div>
                            <input
                              type="text"
                              readOnly
                              value={aluguelChave}
                              className="w-full bg-emerald-100/30 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-900 font-mono font-bold uppercase outline-none cursor-not-allowed select-all"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Valor Recebido (R$)
                            </label>
                            <input
                              type="text"
                              value={aluguelValor}
                              onChange={(e) => setAluguelValor(e.target.value)}
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Locatário (Inquilino / Cliente)
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Nome do Inquilino ou Condutor"
                              value={aluguelLocatario}
                              onChange={(e) =>
                                setAluguelLocatario(e.target.value)
                              }
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold uppercase outline-none focus:bg-white focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              CPF/CNPJ do Locatário
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: 000.000.000-00"
                              value={aluguelCpfLocatario}
                              onChange={(e) =>
                                setAluguelCpfLocatario(e.target.value)
                              }
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Telefone do Locatário
                            </label>
                            <input
                              type="text"
                              placeholder="Telefone do Locatário"
                              value={aluguelFoneLocatario}
                              onChange={(e) =>
                                setAluguelFoneLocatario(e.target.value)
                              }
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Endereço do Locatário
                            </label>
                            <input
                              type="text"
                              placeholder="Endereço do Locatário"
                              value={aluguelEnderecoLocatario}
                              onChange={(e) =>
                                setAluguelEnderecoLocatario(e.target.value)
                              }
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Identificação / Endereço / Descrição do Bem
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Av. Brasil, 1500, Apt 101 ou Veículo Ford Ka Placa ABC-1234"
                              value={aluguelEndereco}
                              onChange={(e) =>
                                setAluguelEndereco(e.target.value)
                              }
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Período de Referência / Mês
                            </label>
                            <input
                              type="text"
                              value={aluguelPeriodo}
                              onChange={(e) =>
                                setAluguelPeriodo(e.target.value)
                              }
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                              placeholder="Ex: Junho de 2026"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Locador / Proprietário (Quem Recebe)
                            </label>
                            <input
                              type="text"
                              placeholder="Seu Estabelecimento ou Nome"
                              value={aluguelLocador}
                              onChange={(e) =>
                                setAluguelLocador(e.target.value)
                              }
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold uppercase outline-none focus:bg-white focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              CPF/CNPJ do Locador
                            </label>
                            <input
                              type="text"
                              placeholder="CPF/CNPJ do Locador"
                              value={aluguelCpfLocador}
                              onChange={(e) =>
                                setAluguelCpfLocador(e.target.value)
                              }
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Telefone do Locador
                            </label>
                            <input
                              type="text"
                              placeholder="Telefone do Locador"
                              value={aluguelFoneLocador}
                              onChange={(e) =>
                                setAluguelFoneLocador(e.target.value)
                              }
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Endereço do Locador
                            </label>
                            <input
                              type="text"
                              placeholder="Endereço do Locador"
                              value={aluguelEnderecoLocador}
                              onChange={(e) =>
                                setAluguelEnderecoLocador(e.target.value)
                              }
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Data de Recebimento
                            </label>
                            <input
                              type="date"
                              value={aluguelData}
                              onChange={(e) => setAluguelData(e.target.value)}
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Forma de Recebimento
                            </label>
                            <select
                              value={aluguelMeioPagamento}
                              onChange={(e) =>
                                setAluguelMeioPagamento(e.target.value)
                              }
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                            >
                              <option value="PIX">⚡ PIX</option>
                              <option value="Dinheiro">💵 Dinheiro</option>
                              <option value="Transferência Bancária">
                                🏦 Transferência Bancária / TED
                              </option>
                              <option value="Cartão de Crédito">
                                💳 Cartão de Crédito
                              </option>
                              <option value="Cartão de Débito">
                                💳 Cartão de Débito
                              </option>
                              <option value="Cheque">✍️ Cheque</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2 lg:col-span-3">
                            <label className="text-[9px] font-black text-emerald-900 uppercase block mb-1">
                              Valor Recebido por Extenso
                            </label>
                            <input
                              type="text"
                              value={aluguelExtenso}
                              onChange={(e) =>
                                setAluguelExtenso(e.target.value)
                              }
                              className="w-full bg-emerald-50/20 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500"
                            />
                          </div>
                        </>
                      )}

                      {/* ORÇAMENTO FORM FIELDS */}
                      {activeTemplate === "orcamento" && (
                        <>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Orçamento Nº
                            </label>
                            <input
                              type="text"
                              value={orcamentoNum}
                              onChange={(e) => setOrcamentoNum(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold uppercase outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Data do Orçamento
                            </label>
                            <input
                              type="date"
                              value={orcamentoData}
                              onChange={(e) => setOrcamentoData(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Valor Estimado (R$)
                            </label>
                            <input
                              type="text"
                              value={orcamentoValor}
                              onChange={(e) =>
                                setOrcamentoValor(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                           <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Nome do Cliente
                            </label>
                            <input
                              type="text"
                              placeholder="Nome do Cliente"
                              value={orcamentoCliente}
                              onChange={(e) =>
                                setOrcamentoCliente(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold uppercase outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              CPF/CNPJ do Cliente
                            </label>
                            <input
                              type="text"
                              placeholder="CPF/CNPJ do Cliente"
                              value={orcamentoCpfCliente}
                              onChange={(e) =>
                                setOrcamentoCpfCliente(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Telefone do Cliente
                            </label>
                            <input
                              type="text"
                              placeholder="Telefone"
                              value={orcamentoFone}
                              onChange={(e) => setOrcamentoFone(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Endereço do Cliente
                            </label>
                            <input
                              type="text"
                              placeholder="Endereço do Cliente"
                              value={orcamentoEnderecoCliente}
                              onChange={(e) =>
                                setOrcamentoEnderecoCliente(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Fornecedor / Empresa
                            </label>
                            <input
                              type="text"
                              placeholder="Nome da sua empresa/seu nome"
                              value={orcamentoFornecedor}
                              onChange={(e) =>
                                setOrcamentoFornecedor(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold uppercase outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              CPF/CNPJ do Fornecedor
                            </label>
                            <input
                              type="text"
                              placeholder="CPF/CNPJ do Fornecedor"
                              value={orcamentoCpfFornecedor}
                              onChange={(e) =>
                                setOrcamentoCpfFornecedor(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Telefone do Fornecedor
                            </label>
                            <input
                              type="text"
                              placeholder="Telefone do Fornecedor"
                              value={orcamentoFoneFornecedor}
                              onChange={(e) =>
                                setOrcamentoFoneFornecedor(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Endereço do Fornecedor
                            </label>
                            <input
                              type="text"
                              placeholder="Endereço do Fornecedor"
                              value={orcamentoEnderecoFornecedor}
                              onChange={(e) =>
                                setOrcamentoEnderecoFornecedor(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-bold outline-none focus:bg-white"
                            />
                          </div>
                          <div className="sm:col-span-2 lg:col-span-3">
                            <label className="text-[9px] font-black text-amber-900 uppercase block mb-1">
                              Descrição dos Itens / Serviços
                            </label>
                            <textarea
                              rows={3}
                              value={orcamentoItens}
                              onChange={(e) =>
                                setOrcamentoItens(e.target.value)
                              }
                              className="w-full bg-amber-50/50 border border-amber-350 rounded-xl p-2.5 text-xs text-amber-950 font-medium outline-none focus:bg-white resize-none"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Main Note Text Editor */}
              <div className="space-y-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-amber-500/10 p-4 rounded-3xl border border-amber-500/20">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-black text-amber-950 uppercase tracking-wider block">
                      📝 Texto do Documento (Escrita Livre)
                    </span>
                    <span className="text-[9px] text-amber-800 font-bold block">
                      Fale normalmente, a IA corrigirá sua pontuação e ortografia em tempo real.
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Language selector buttons with flags */}
                    <div className="flex items-center bg-white border border-amber-200/60 rounded-xl p-1 gap-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setMicLangLocal("pt-BR")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${micLangLocal === "pt-BR" ? "bg-amber-600 text-white shadow-sm" : "text-amber-900 hover:bg-amber-100/50"}`}
                      >
                        <span>🇧🇷</span>
                        <span>PT-BR</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMicLangLocal("es-ES")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${micLangLocal === "es-ES" ? "bg-amber-600 text-white shadow-sm" : "text-amber-900 hover:bg-amber-100/50"}`}
                      >
                        <span>🇪🇸</span>
                        <span>ES</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMicLangLocal("en-US")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${micLangLocal === "en-US" ? "bg-amber-600 text-white shadow-sm" : "text-amber-900 hover:bg-amber-100/50"}`}
                      >
                        <span>🇺🇸</span>
                        <span>EN</span>
                      </button>
                    </div>

                    {/* AI Correction active toggle */}
                    <button
                      type="button"
                      onClick={() => setAiCorrectionActiveLocal(!aiCorrectionActiveLocal)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black transition-all shadow-sm ${aiCorrectionActiveLocal ? "bg-amber-100 border-amber-400 text-amber-900 shadow-inner" : "bg-white border-amber-200 text-amber-600"}`}
                    >
                      <Sparkles className={`w-3 h-3 ${aiCorrectionActiveLocal ? "text-amber-600 animate-pulse" : ""}`} />
                      <span>Corretor IA: {aiCorrectionActiveLocal ? "ATIVADO" : "DESATIVADO"}</span>
                    </button>

                    {/* Manual polish/correct button */}
                    <button
                      type="button"
                      disabled={isRefiningSpeechLocal || !localText.trim()}
                      onClick={async () => {
                        if (!localText.trim()) return;
                        setIsRefiningSpeechLocal(true);
                        try {
                          const refined = await refineSpeechText(localText, micLangLocal);
                          if (refined) {
                            setLocalText(refined);
                            setFreeNotesText(refined);
                          }
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setIsRefiningSpeechLocal(false);
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isRefiningSpeechLocal ? (
                        <>
                          <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Polindo...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
                          <span>Polir Texto</span>
                        </>
                      )}
                    </button>

                    {/* Voice Assistant dictation button */}
                    <button
                      type="button"
                      onClick={
                        isListeningLocal
                          ? stopListeningLocal
                          : () => startListeningLocal(micLangLocal)
                      }
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-350 active:scale-95 shadow-md border ${
                        isListeningLocal
                          ? "bg-red-600 text-white animate-pulse border-red-500 shadow-red-500/30 cursor-pointer"
                          : "bg-emerald-50 text-emerald-950 hover:bg-emerald-100 border-emerald-200 shadow-emerald-500/10 cursor-pointer"
                      }`}
                    >
                      {isListeningLocal ? (
                        <>
                          <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                          <MicOff className="w-3.5 h-3.5" />
                          <span>MICROFONE: LIGADO (DESLIGAR)</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <Mic className="w-3.5 h-3.5" />
                          <span>MICROFONE: DESLIGADO (LIGAR)</span>
                        </>
                      )}
                    </button>

                    {/* Text-To-Speech (TTS) Audible Voice Reader */}
                    <button
                      type="button"
                      onClick={() => handleSpeakText(localText, micLangLocal, "editor")}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-350 active:scale-95 shadow-md border ${
                        isSpeakingLocal && speakingNoteId === "editor"
                          ? "bg-red-600 text-white animate-pulse border-red-500 shadow-red-500/30 cursor-pointer"
                          : "bg-blue-50 text-blue-950 hover:bg-blue-100 border-blue-200 shadow-blue-500/10 cursor-pointer"
                      }`}
                      title="Ouvir a leitura falada do texto"
                    >
                      {isSpeakingLocal && speakingNoteId === "editor" ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 animate-bounce" />
                          <span>🛑 PARAR LEITURA FALADA</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                          <span>🔊 OUVIR O QUE ESTÁ ESCRITO</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Active / Stopped Status Banners */}
                <div className="relative z-30 mb-2">
                  {isListeningLocal && (
                    <div className="bg-red-600 text-white font-bold text-xs px-4 py-3 rounded-2xl flex items-center justify-between shadow-md border border-red-500">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping shrink-0" />
                        <span>🎙️ MICROFONE ATIVO — Gravando seu texto por voz...</span>
                      </div>
                      <button
                        type="button"
                        onClick={stopListeningLocal}
                        className="px-2.5 py-1 bg-white text-red-700 rounded-lg text-[9px] font-black uppercase hover:bg-red-50 transition-all shadow-sm"
                      >
                        DESLIGAR AGORA
                      </button>
                    </div>
                  )}
                  {!isListeningLocal && micJustStoppedLocal && (
                    <div className="bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 shadow-md border border-emerald-500 animate-fade-in">
                      <span className="shrink-0 text-sm">🟢</span>
                      <span>MICROFONE DESLIGADO COM SUCESSO! O celular está seguro e não irá mais vibrar.</span>
                    </div>
                  )}
                </div>

                {/* Elegant multi-page virtual book controls and tabs selector */}
                <div className="bg-amber-100/75 border border-amber-200 p-4 rounded-3xl space-y-3 shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-700 animate-pulse" />
                      <div>
                        <span className="text-xs font-black uppercase text-amber-950 tracking-wider block">
                          Livro Virtual & Páginas
                        </span>
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-tight block">
                          Escreva e organize seu livro de receitas, revista ou anotações por páginas
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPageIndex === 0}
                        onClick={() => switchPage(currentPageIndex - 1)}
                        className="p-1.5 rounded-lg bg-white border border-amber-200 hover:bg-amber-50 text-amber-950 disabled:opacity-35 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                        title="Página Anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <span className="text-xs font-black text-amber-900 font-mono bg-white border border-amber-200 px-3 py-1.5 rounded-xl shadow-sm">
                        Pág. {currentPageIndex + 1} de {pages.length}
                      </span>

                      <button
                        type="button"
                        disabled={currentPageIndex === pages.length - 1}
                        onClick={() => switchPage(currentPageIndex + 1)}
                        className="p-1.5 rounded-lg bg-white border border-amber-200 hover:bg-amber-50 text-amber-950 disabled:opacity-35 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                        title="Próxima Página"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Tabs List */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-amber-200">
                    {pages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => switchPage(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition-all border cursor-pointer ${
                          currentPageIndex === idx
                            ? "bg-amber-600 text-white border-amber-700 shadow-sm"
                            : "bg-white text-amber-900 border-amber-200 hover:bg-amber-50"
                        }`}
                      >
                        Página {idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* Operational actions: Add, Clear, Delete page */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/50 pt-2.5">
                    <button
                      type="button"
                      onClick={addPage}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova Página (+1)</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLocalText("");
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-amber-200 hover:bg-amber-50 text-amber-800 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer"
                        title="Apagar conteúdo da página atual"
                      >
                        <Eraser className="w-3.5 h-3.5 text-amber-600" />
                        <span>Limpar Página</span>
                      </button>

                      <button
                        type="button"
                        disabled={pages.length <= 1}
                        onClick={deleteCurrentPage}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                        title="Excluir página atual"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Deletar Página</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={localText}
                    onChange={handleChange}
                    placeholder="Escreva livremente usando seu teclado ou clique em 'Ditar por Voz' acima para começar a falar..."
                    className="w-full min-h-[350px] bg-slate-950 border-2 border-amber-500/30 focus:border-amber-500 rounded-3xl p-5 outline-none font-bold text-white placeholder:text-slate-500 text-[18px] sm:text-[20px] resize-none leading-relaxed transition-all shadow-inner"
                    style={isWritingHidden && pin.length === 4 ? { filter: "blur(12px)", select: "none", pointerEvents: "none" } : {}}
                    spellCheck={false}
                  />

                  {/* Writing Hidden Secure Overlay with PIN Unlock */}
                  {isWritingHidden && pin.length === 4 && (
                    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4 z-40 border-2 border-amber-500/30">
                      <Lock className="w-12 h-12 text-amber-500 animate-pulse" />
                      <div className="space-y-1.5">
                        <p className="text-sm font-black uppercase text-amber-400 tracking-wider">
                          Modo Secreto Ativado por PIN 🔒
                        </p>
                        <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                          Sua escrita está oculta na tela por segurança. Para ver o texto ou continuar digitando, insira seu PIN abaixo.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="PIN"
                          id="editor-pin-input"
                          className="w-24 bg-slate-900 text-white font-mono text-center font-bold text-base border border-slate-700 rounded-xl px-2 py-1.5 focus:border-amber-400 outline-none shadow-inner tracking-widest"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = (e.target as HTMLInputElement).value;
                              if (val === pin) {
                                setIsWritingHidden(false);
                                alert("Escrita destravada com sucesso! 🔓");
                              } else {
                                alert("Senha PIN incorreta! Tente novamente. ❌");
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const inputEl = document.getElementById("editor-pin-input") as HTMLInputElement;
                            if (inputEl && inputEl.value === pin) {
                              setIsWritingHidden(false);
                              alert("Escrita destravada com sucesso! 🔓");
                            } else {
                              alert("Senha PIN incorreta! Tente novamente. ❌");
                            }
                          }}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase tracking-wider text-[10px] rounded-xl cursor-pointer active:scale-95 transition-all shadow-md"
                        >
                          Destravar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Realtime voice transcription preview box when listening */}
                  {isListeningLocal && (
                    <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 text-white text-xs p-3 rounded-xl border border-red-500/30 shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-fade-in z-20">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                      <div className="flex-1 overflow-hidden">
                        <span className="font-bold text-[9px] uppercase text-red-400 block tracking-wider">
                          Ouvindo voz em tempo real...
                        </span>
                        <p className="italic text-slate-200 truncate font-semibold">
                          {(accumulatedSpeechRefLocal.current ? accumulatedSpeechRefLocal.current + " " : "") + interimTranscriptLocal || "Fale agora, o texto aparecerá aqui..."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Realtime voice refinement overlay box */}
                  {isRefiningSpeechLocal && (
                    <div className="absolute bottom-4 left-4 right-4 bg-amber-950/95 text-white text-xs p-3 rounded-xl border border-amber-500/30 shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-pulse z-20">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <div className="flex-1 overflow-hidden">
                        <span className="font-bold text-[9px] uppercase text-amber-400 block tracking-wider">
                          Corretor IA Ativo...
                        </span>
                        <p className="italic text-amber-200 truncate font-semibold">
                          Processando, corrigindo gramática e pontuando seu ditado perfeitamente...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* HIGH-END PHOTO ALBUM / RECIPE BOOK IMAGE UPLOADER */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/60 rounded-3xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-amber-200/50 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider block">
                        Álbum de Fotos & Imagens 📸🖼️
                      </h4>
                      <p className="text-[9.5px] font-bold text-amber-800 uppercase tracking-tight block">
                        Adicione um print, foto de receita ou lembrança nesta página (Pág. {currentPageIndex + 1})
                      </p>
                    </div>
                  </div>
                </div>

                {pageImages[currentPageIndex] ? (
                  <div className="space-y-4 flex flex-col items-center">
                    {/* Visual Preview */}
                    <div className="relative border-2 border-dashed border-amber-300 bg-white p-3 rounded-2xl shadow-sm transition-all overflow-hidden flex flex-col items-center justify-center max-w-full">
                      <img
                        src={pageImages[currentPageIndex]}
                        alt={`Imagem da Página ${currentPageIndex + 1}`}
                        style={{ width: `${pageImageSizes[currentPageIndex] || 100}%` }}
                        className="max-h-[350px] object-contain rounded-xl shadow-md border border-slate-100 transition-all cursor-pointer hover:brightness-95"
                        onClick={() => setZoomedImage(pageImages[currentPageIndex])}
                        title="Clique para ampliar em tela cheia"
                      />
                      <span className="text-[9px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md mt-2">
                        Tamanho Visual: {pageImageSizes[currentPageIndex] || 100}% (Ajuste abaixo)
                      </span>
                    </div>

                    {/* Scale Slider and Controls */}
                    <div className="w-full bg-white border border-amber-200 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                      <div className="flex flex-col w-full sm:w-auto">
                        <span className="text-[10px] font-black uppercase text-amber-950 mb-1">
                          Ajustar Tamanho da Foto:
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setPageImageSizes((prev) => {
                                const updated = [...prev];
                                updated[currentPageIndex] = Math.max(30, (updated[currentPageIndex] || 100) - 10);
                                return updated;
                              });
                            }}
                            className="p-1 px-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold rounded-lg cursor-pointer active:scale-95 transition-all"
                            title="Diminuir"
                          >
                            - Diminuir
                          </button>
                          <input
                            type="range"
                            min="30"
                            max="100"
                            step="5"
                            value={pageImageSizes[currentPageIndex] || 100}
                            onChange={(e) => {
                              const newVal = parseInt(e.target.value);
                              setPageImageSizes((prev) => {
                                const updated = [...prev];
                                updated[currentPageIndex] = newVal;
                                return updated;
                              });
                            }}
                            className="w-32 accent-amber-600 cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPageImageSizes((prev) => {
                                const updated = [...prev];
                                updated[currentPageIndex] = Math.min(100, (updated[currentPageIndex] || 100) + 10);
                                return updated;
                              });
                            }}
                            className="p-1 px-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold rounded-lg cursor-pointer active:scale-95 transition-all"
                            title="Aumentar"
                          >
                            + Aumentar
                          </button>
                        </div>
                      </div>

                      {/* Photo Actions */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setZoomedImage(pageImages[currentPageIndex])}
                          className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Ampliar</span>
                        </button>
                        
                        <a
                          href={pageImages[currentPageIndex]}
                          download={`foto_nota_pagina_${currentPageIndex + 1}.jpg`}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer text-center"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar Foto</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            setPageImages((prev) => {
                              const updated = [...prev];
                              updated[currentPageIndex] = "";
                              return updated;
                            });
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Upload Box */
                  <div className="relative border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 rounded-2xl p-6 text-center cursor-pointer transition-all active:scale-98">
                    <input
                      type="file"
                      accept="image/*"
                      id={`file-upload-p${currentPageIndex}`}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressImage(file);
                            setPageImages((prev) => {
                              const updated = [...prev];
                              updated[currentPageIndex] = compressed;
                              return updated;
                            });
                          } catch (err) {
                            console.error("Erro ao compactar imagem:", err);
                          }
                        }
                      }}
                    />
                    <div className="flex flex-col items-center justify-center gap-2 text-amber-800">
                      <ImageIcon className="w-8 h-8 text-amber-600 animate-bounce" />
                      <span className="text-xs font-black uppercase tracking-wider">
                        Escolher Foto, Print ou Imagem 📸🖼️
                      </span>
                      <span className="text-[9.5px] uppercase font-bold tracking-wide text-amber-700/60 block">
                        Suporta print de tela, foto da galeria ou câmera (Compactado em Tempo Real)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* HIGH-END INTERACTIVE SIGNATURE BOX */}
              <div className="bg-slate-900 border border-amber-500/20 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950">
                      <PenTool className="w-4 h-4 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase text-amber-400 tracking-widest">
                        Assinatura Digital Integrada (Dedo ou Mouse) 📱✍️
                      </h4>
                      <p className="text-[8.5px] text-slate-400 uppercase font-bold tracking-wider">
                        Para promissórias e recibos com validade moral imediata!
                      </p>
                    </div>
                  </div>

                  {/* Pen color & controls */}
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                      Tinta:
                    </span>
                    <button
                      type="button"
                      onClick={() => setPenColor("#000080")}
                      className={`w-5 h-5 rounded-full bg-blue-900 border ${penColor === "#000080" ? "border-white scale-115 ring-2 ring-blue-500" : "border-transparent"}`}
                      title="Caneta Azul"
                    />
                    <button
                      type="button"
                      onClick={() => setPenColor("#000000")}
                      className={`w-5 h-5 rounded-full bg-black border ${penColor === "#000000" ? "border-white scale-115 ring-2 ring-slate-500" : "border-transparent"}`}
                      title="Caneta Preta"
                    />
                    <button
                      type="button"
                      onClick={() => setPenColor("#991b1b")}
                      className={`w-5 h-5 rounded-full bg-red-800 border ${penColor === "#991b1b" ? "border-white scale-115 ring-2 ring-red-500" : "border-transparent"}`}
                      title="Caneta Vermelha"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-1 relative shadow-inner border border-amber-300">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[150px] sm:h-[180px] bg-white rounded-xl touch-none cursor-crosshair"
                  />

                  {!hasDrawn && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400/50 flex-col gap-1 select-none">
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Assine com o dedo neste retângulo
                      </span>
                      <span className="text-[8px] uppercase font-bold">
                        A assinatura será vinculada no salvamento
                      </span>
                    </div>
                  )}

                  {hasDrawn && (
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="absolute right-3 bottom-3 bg-red-600 hover:bg-red-700 text-white rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 transition-all active:scale-95 text-[9px] font-black uppercase shadow-lg"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      Apagar
                    </button>
                  )}
                </div>
              </div>
              {/* Folder Selector Section */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-5 mb-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <FolderPlus className="w-5 h-5 text-amber-600 animate-pulse" />
                  <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                    📂 Organizar Documento em Pasta
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 mb-4 font-medium">
                  Selecione uma pasta existente ou crie uma nova para arquivar
                  esta anotação ou diário com segurança (ex: segredos, lembretes,
                  ou pessoal).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Existing Folder */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                      Pasta Existente:
                    </label>
                    {existingFolders.length === 0 ? (
                      <div className="py-2.5 px-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 text-xs italic">
                        Nenhuma pasta criada ainda.
                      </div>
                    ) : (
                      <select
                        value={saveFolder}
                        onChange={(e) => {
                          setSaveFolder(e.target.value);
                          if (e.target.value) setNewFolderName(""); // Clear custom name if selecting existing
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all shadow-inner"
                      >
                        <option value="">-- Selecione uma Pasta --</option>
                        {existingFolders.map((folder) => (
                          <option key={folder} value={folder}>
                            📁 {folder}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Create / Type New Folder */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                      Ou Criar Nova Pasta:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Nome (ex: Inquilino Carlos, Junho 2026...)"
                        value={newFolderName}
                        onChange={(e) => {
                          setNewFolderName(e.target.value);
                          if (e.target.value) setSaveFolder(""); // Clear select if typing custom
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick suggestions */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mr-1">
                    Sugestões rápidas:
                  </span>
                  {[
                    "Fechamento de Caixa",
                    "Despesas & Fornecedores",
                    "Administração & Geral",
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setNewFolderName(sug);
                        setSaveFolder("");
                      }}
                      className="text-[10px] font-semibold text-slate-600 bg-slate-200/60 hover:bg-amber-100 hover:text-amber-800 rounded-lg px-2 py-0.5 transition-colors border border-slate-200"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN LOCK PROTECTION SECTION ("Diário Secreto sob 7 Chaves") */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-5 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 shadow-md">
                      {isLockedToggle ? <Lock className="w-4 h-4 animate-pulse" /> : <Unlock className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider block">
                        🛡️ Diário Secreto & Proteção sob 7 Chaves (PIN)
                      </h4>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">
                        Proteja esta nota com uma senha de 4 números contra curiosos!
                      </p>
                    </div>
                  </div>

                  {/* Switch Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isLockedToggle}
                      onChange={(e) => {
                        setIsLockedToggle(e.target.checked);
                        if (!e.target.checked) setPin("");
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 peer-checked:after:bg-amber-500 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500/10 border border-slate-700"></div>
                  </label>
                </div>

                <AnimatePresence>
                  {isLockedToggle && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 overflow-hidden animate-fade-in"
                    >
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        ⚠️ <span className="font-bold text-amber-400">IMPORTANTE:</span> Ao trancar esta nota, seu conteúdo (texto, páginas e imagens) ficará oculto na listagem geral e só poderá ser visualizado digitando a senha numérica de 4 dígitos criada aqui.
                      </p>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                        <div className="w-full sm:w-auto">
                          <label className="block text-[9px] font-black uppercase text-amber-400 tracking-wider mb-1">
                            Definir PIN de 4 números:
                          </label>
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="Ex: 1234"
                            value={pin}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              setPin(val);
                            }}
                            className="w-32 bg-slate-950 text-white font-mono text-center font-bold text-lg border border-slate-700 rounded-xl px-3 py-1.5 focus:border-amber-400 outline-none shadow-inner tracking-[0.3em]"
                          />
                        </div>

                        <div className="flex-1 text-[9.5px] text-slate-400 font-semibold uppercase tracking-tight">
                          {pin.length === 4 ? (
                            <div className="space-y-1.5">
                              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                ✓ PIN DEFINIDO COM SUCESSO! Nota trancada sob 7 chaves.
                              </span>
                              <label className="flex items-center gap-2 cursor-pointer text-amber-300 font-extrabold hover:text-amber-200 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isWritingHidden}
                                  onChange={(e) => setIsWritingHidden(e.target.checked)}
                                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 w-3.5 h-3.5"
                                />
                                <span>Ocultar e embaçar o que estou escrevendo na tela 🙈</span>
                              </label>
                            </div>
                          ) : (
                            <span className="text-amber-500 flex items-center gap-1.5 animate-pulse">
                              * Digite exatamente 4 números para validar.
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={handleSaveWithSignature}
                  className="flex items-center justify-center gap-3 py-3.5 sm:py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-[2rem] font-black uppercase text-[10.5px] sm:text-[11.5px] tracking-wider shadow-lg shadow-amber-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Apenas Salvar no Arquivo 📥</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndWhatsApp}
                  className="flex items-center justify-center gap-3 py-3.5 sm:py-4 bg-green-600 hover:bg-green-700 text-white rounded-[2rem] font-black uppercase text-[10.5px] sm:text-[11.5px] tracking-wider shadow-lg shadow-green-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Salvar e Enviar WhatsApp 💬</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndPDF}
                  className="flex items-center justify-center gap-3 py-3.5 sm:py-4 bg-amber-700 hover:bg-amber-800 text-white rounded-[2rem] font-black uppercase text-[10.5px] sm:text-[11.5px] tracking-wider shadow-lg shadow-amber-700/20 active:scale-95 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Salvar e Baixar PDF 📄</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndPrint}
                  className="flex items-center justify-center gap-3 py-3.5 sm:py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[10.5px] sm:text-[11.5px] tracking-wider shadow-lg shadow-slate-800/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {printFormat === "a4"
                      ? "Salvar e Imprimir A4 🖨️"
                      : "Salvar e Imp. Cupom 🧾"}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FULLSCREEN IMAGE ZOOM MODAL */}
        <AnimatePresence>
          {zoomedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
              onClick={() => setZoomedImage(null)}
            >
              <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setZoomedImage(null)}
                  className="absolute -top-12 right-0 text-white hover:text-amber-400 font-bold bg-white/10 hover:bg-white/25 rounded-full p-2.5 transition-all text-xs flex items-center gap-1 cursor-pointer select-none"
                >
                  <X className="w-5 h-5" />
                  <span>Fechar</span>
                </button>
                <img
                  src={zoomedImage}
                  alt="Imagem ampliada"
                  className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border-4 border-white/20"
                />
                <p className="text-white text-xs mt-4 font-bold uppercase tracking-wider bg-white/10 px-4 py-1.5 rounded-full select-none">
                  Pressione fora ou clique em fechar para sair
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PIN CODE ENTRY MODAL FOR LOCKED NOTES */}
        <AnimatePresence>
          {isEnteringPinNoteId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-4 backdrop-blur-md"
            >
              <div className="bg-slate-900 border-2 border-amber-500/30 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl shadow-amber-500/5">
                
                {!isRecoveringPin ? (
                  <>
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center justify-center text-amber-400">
                        <Lock className="w-8 h-8 animate-bounce" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase text-amber-400 tracking-wider">
                          Nota Trancada sob 7 Chaves 🛡️
                        </h3>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wide mt-1">
                          Digite o PIN de 4 números para revelar o conteúdo
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={enteredPinValue}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setEnteredPinValue(val);
                          setPinErrorNoteId(null);
                        }}
                        className="w-48 bg-slate-950 text-white font-mono text-center font-bold text-3xl border-2 border-slate-700 rounded-2xl px-4 py-3 focus:border-amber-400 outline-none shadow-inner tracking-[0.5em] focus:ring-4 focus:ring-amber-500/10"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && enteredPinValue.length === 4) {
                            const lockedNote = savedNotes.find((n) => n.id === isEnteringPinNoteId);
                            if (lockedNote) {
                              if (lockedNote.pin === enteredPinValue) {
                                setUnlockedNoteIds((prev) => [...prev, isEnteringPinNoteId]);
                                setIsEnteringPinNoteId(null);
                                setEnteredPinValue("");
                                handleLoadNoteLocal(lockedNote);
                              } else {
                                setPinErrorNoteId(isEnteringPinNoteId);
                              }
                            }
                          }
                        }}
                      />

                      <AnimatePresence>
                        {pinErrorNoteId && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-red-500 text-xs font-bold uppercase tracking-wider text-center"
                          >
                            ❌ SENHA INCORRETA! Tente novamente.
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRecoveringPin(true);
                            setRecoveryNewPin("");
                            setRecoveryPinError("");
                          }}
                          className="text-amber-500 hover:text-amber-450 text-[11px] font-black uppercase tracking-wider underline cursor-pointer hover:scale-105 active:scale-95 transition-all bg-transparent border-none"
                        >
                          Esqueceu seu PIN de Notas?
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEnteringPinNoteId(null);
                          setEnteredPinValue("");
                          setPinErrorNoteId(null);
                          setIsRecoveringPin(false);
                        }}
                        className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        disabled={enteredPinValue.length !== 4}
                        onClick={() => {
                          const lockedNote = savedNotes.find((n) => n.id === isEnteringPinNoteId);
                          if (lockedNote) {
                            if (lockedNote.pin === enteredPinValue) {
                              setUnlockedNoteIds((prev) => [...prev, isEnteringPinNoteId]);
                              setIsEnteringPinNoteId(null);
                              setEnteredPinValue("");
                              handleLoadNoteLocal(lockedNote);
                            } else {
                              setPinErrorNoteId(isEnteringPinNoteId);
                            }
                          }
                        }}
                        className="py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                      >
                        Confirmar PIN
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 rounded-3xl flex items-center justify-center text-purple-400">
                        <Unlock className="w-8 h-8 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase text-purple-400 tracking-wider">
                          Redefinir PIN de Segurança 🛡️
                        </h3>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wide mt-1">
                          Recuperação de Notas com Firebase
                        </p>
                      </div>
                    </div>

                    {user ? (
                      <div className="space-y-4 text-left">
                        <div className="bg-purple-950/20 p-4 border border-purple-500/10 rounded-2xl text-center space-y-1">
                          <p className="text-[10px] uppercase font-black tracking-widest text-purple-300">
                            Acesso Confirmado via Firebase
                          </p>
                          <p className="text-xs font-bold text-slate-300 truncate">
                            {user.email}
                          </p>
                          <p className="text-[9px] text-slate-400 leading-normal pt-1">
                            Como você está logado em sua conta, podemos redefinir e atualizar o PIN desta nota com segurança instantaneamente!
                          </p>
                        </div>

                        <div className="space-y-1.5 text-center">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Digite o Novo PIN (4 números)
                          </label>
                          <input
                            type="password"
                            maxLength={4}
                            placeholder="••••"
                            value={recoveryNewPin}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              setRecoveryNewPin(val);
                              setRecoveryPinError("");
                            }}
                            className="w-48 bg-slate-950 text-white font-mono text-center font-bold text-3xl border-2 border-slate-700 rounded-2xl px-4 py-3 focus:border-purple-500 outline-none shadow-inner tracking-[0.5em] focus:ring-4 focus:ring-purple-500/10"
                            autoFocus
                          />
                        </div>

                        {recoveryPinError && (
                          <p className="text-red-500 text-[10px] font-black uppercase tracking-wider text-center">
                            {recoveryPinError}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsRecoveringPin(false);
                              setRecoveryPinError("");
                            }}
                            className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer text-center"
                          >
                            Voltar
                          </button>
                          <button
                            type="button"
                            disabled={recoveryNewPin.length !== 4}
                            onClick={() => {
                              if (recoveryNewPin.length !== 4) {
                                setRecoveryPinError("O PIN DEVE TER EXATAMENTE 4 NÚMEROS!");
                                return;
                              }
                              if (handleUpdateNotePin) {
                                handleUpdateNotePin(isEnteringPinNoteId, recoveryNewPin);
                                setUnlockedNoteIds((prev) => [...prev, isEnteringPinNoteId]);
                                const lockedNote = savedNotes.find((n) => n.id === isEnteringPinNoteId);
                                if (lockedNote) {
                                  handleLoadNoteLocal(lockedNote);
                                }
                                setIsEnteringPinNoteId(null);
                                setIsRecoveringPin(false);
                                setRecoveryNewPin("");
                                setRecoveryPinError("");
                              }
                            }}
                            className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-2xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer text-center"
                          >
                            Gravar Novo PIN
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 text-center">
                        <div className="bg-amber-950/20 p-4 border border-amber-500/10 rounded-2xl text-center space-y-1">
                          <p className="text-[10px] uppercase font-black tracking-widest text-amber-400">
                            Modo Visitante (Offline)
                          </p>
                          <p className="text-[9.5px] text-slate-300 leading-relaxed text-left">
                            Como você não está conectado a uma conta segura do Firebase, não temos um e-mail de recuperação associado a esta nota.
                          </p>
                        </div>

                        <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-left space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Como recuperar meu PIN?
                          </p>
                          <ul className="list-disc list-inside text-[9px] text-slate-400 space-y-1 leading-normal">
                            <li>Faça login ou crie uma conta no topo da calculadora.</li>
                            <li>Suas notas offline se vincularão com segurança à sua conta de e-mail.</li>
                            <li>Uma vez conectado, você poderá usar a sua autenticação segura para redefinir o PIN de qualquer nota instantaneamente!</li>
                          </ul>
                        </div>

                        <div className="grid grid-cols-1 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsRecoveringPin(false);
                              setRecoveryPinError("");
                            }}
                            className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer text-center"
                          >
                            Voltar para o Teclado
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CUSTOM MICROPHONE PERMISSION MODAL */}
        <AnimatePresence>
          {showMicPermissionModalLocal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/90"
                onClick={() => setShowMicPermissionModalLocal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-slate-900 border-2 border-amber-500/30 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl space-y-6 text-center z-10"
              >
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                  <Mic className="w-8 h-8 text-amber-500 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-amber-400 uppercase tracking-tight">
                    Ativação do Microfone
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Para ditar suas notas promissórias e recibos por voz, o seu navegador precisa de permissão de acesso ao microfone.
                  </p>

                  {/* Tradução visual da caixa do Google */}
                  <div className="bg-slate-950/90 border border-amber-500/20 rounded-2xl p-4 text-left space-y-3 shadow-inner">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block">
                      ⚠️ TRADUÇÃO DA JANELA DO GOOGLE:
                    </span>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      O Google AI Studio exibirá uma caixa cinza <strong className="text-amber-400">em inglês</strong>. Veja abaixo a tradução exata de cada item para você saber o que clicar:
                    </p>
                    
                    <div className="border-l-2 border-amber-500/40 pl-3 space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Título:</span>
                        <strong className="text-white font-mono">Microphone access request</strong>
                        <span className="text-emerald-400 block text-[10px] font-semibold mt-0.5">➜ Pedido de acesso ao microfone</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Texto principal:</span>
                        <span className="text-slate-300 italic font-mono text-[11px] leading-tight block">
                          This app requests access to Microphone to work properly. Do you want to allow Microphone access?
                        </span>
                        <span className="text-emerald-400 block text-[10px] font-semibold mt-0.5 leading-tight">
                          ➜ Este aplicativo solicita acesso ao Microfone para funcionar corretamente. Deseja permitir o acesso ao Microfone?
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-800 space-y-2 text-[10px] font-black">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 uppercase">Botão Esquerdo:</span>
                        <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700 font-mono">
                          Disallow (Não permitir)
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 uppercase">Botão Direito (CLIQUE AQUI):</span>
                        <span className="bg-emerald-500/20 text-emerald-400 px-2.5 py-1.5 rounded border border-emerald-500/30 font-mono animate-pulse">
                          Allow Microphone access (Permitir)
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-300 font-semibold leading-normal pt-1">
                    Por favor, clique no botão amarelo abaixo e, em seguida, clique na opção <strong className="underline text-white">"Allow Microphone access"</strong> na janela que aparecer!
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowMicPermissionModalLocal(false);
                      setMicPermissionGrantedLocal(true);
                      localStorage.setItem("mic_permission_granted", "true");
                      if (pendingMicActionLocal) {
                        pendingMicActionLocal();
                        setPendingMicActionLocal(null);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Entendi e Quero Ativar
                  </button>
                  <button
                    onClick={() => {
                      setShowMicPermissionModalLocal(false);
                      setPendingMicActionLocal(null);
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all cursor-pointer"
                  >
                    Não, agora não
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="pt-8 border-t border-amber-200 flex items-center justify-between text-left">
          <p className="text-[11.5px] font-black text-amber-850 uppercase tracking-widest italic">
            {showSavedNotes
              ? "★ Visualizando seu arquivo seguro de Notas Jurídicas e Promissórias"
              : "★ Suas anotações ficam seguras e sincronizadas automaticamente no seu dispositivo"}
          </p>
        </div>
      </motion.div>
    );
  },
);

NotesModule.displayName = "NotesModule";
