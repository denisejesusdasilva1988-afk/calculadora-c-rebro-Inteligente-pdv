import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Save,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Share2,
  ArrowLeft,
  KeyRound,
  FileText,
  Clock,
  Check,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Play,
  Pause,
  Square,
  Paperclip,
  Music,
  Image as ImageIcon,
  Download,
  Eye,
  X,
  AlertCircle,
  UploadCloud,
  Shield,
  FileCheck,
  Camera,
  Mail,
  MessageCircle,
  Send,
  ExternalLink,
  Cloud,
  CloudDownload,
  CloudUpload,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { refineSpeechText, applyLocalDictionaryCorrections } from "../utils/speechRefiner";

export interface NotepadAttachment {
  id: string;
  name: string;
  type: "document" | "image" | "audio" | "music";
  mimeType: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface MasterPinProfile {
  pin: string;
  cpf: string;
  email: string;
  createdAt: string;
}

interface StandardNotepadProps {
  freeNotesText: string;
  setFreeNotesText: (val: string) => void;
  savedNotes: any[];
  handleSaveNote: (
    textOverride?: string,
    signatureImg?: string,
    folderName?: string,
    pagesOverride?: string[],
    pinOverride?: string,
    imagesOverride?: string[],
    imageSizesOverride?: number[],
    attachmentsOverride?: any[]
  ) => void;
  handleDeleteSavedNote: (id: string) => void;
  handleUpdateNotePin?: (id: string, newPin: string) => void;
  showNotification: (msg: string, type: "success" | "error" | "info") => void;
  user?: any;
}

export const StandardNotepad: React.FC<StandardNotepadProps> = ({
  freeNotesText,
  setFreeNotesText,
  savedNotes,
  handleSaveNote,
  handleDeleteSavedNote,
  handleUpdateNotePin,
  showNotification,
  user,
}) => {
  // Local editor text
  const [text, setText] = useState<string>(freeNotesText || "");
  const textRef = useRef<string>(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    // Only update local text if external text changed drastically (e.g. loaded a note)
    if (freeNotesText !== textRef.current) {
      setText(freeNotesText || "");
    }
  }, [freeNotesText]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    setFreeNotesText(val);
  };

  // View state: 'editor' or 'saved'
  const [viewTab, setViewTab] = useState<"editor" | "saved">("editor");

  // Speech Recognition states
  const [isListening, setIsListening] = useState(false);
  const [micLang, setMicLang] = useState<string>(() => {
    try {
      return localStorage.getItem("std_notepad_mic_lang") || "pt-BR";
    } catch {
      return "pt-BR";
    }
  });
  const [aiCorrectionActive, setAiCorrectionActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("std_notepad_ai_active");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });
  const [isRefining, setIsRefining] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedSpeechRef = useRef<string>("");
  const consecutiveMicErrorsRef = useRef<number>(0);
  const polishAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("std_notepad_mic_lang", micLang);
    } catch {}
  }, [micLang]);

  useEffect(() => {
    try {
      localStorage.setItem("std_notepad_ai_active", String(aiCorrectionActive));
    } catch {}
  }, [aiCorrectionActive]);

  // Audio / Speech Synthesis (Smooth, chunked, non-freezing with pause/resume support)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [speakingNoteId, setSpeakingNoteId] = useState<string | null>(null);

  const speechChunksRef = useRef<string[]>([]);
  const speechChunkIndexRef = useRef<number>(0);
  const speechLangRef = useRef<string>("pt-BR");

  // Helper to split text into safe, smooth sentence chunks to prevent browser freeze
  const splitTextIntoSpeechChunks = (inputText: string): string[] => {
    const clean = inputText.replace(/\n*--- PÁGINA \d+ ---\n*/g, " ").trim();
    if (!clean) return [];

    const rawSegments = clean.split(/(?<=[.?!;:\n])\s+/);
    const result: string[] = [];
    for (const seg of rawSegments) {
      const s = seg.trim();
      if (!s) continue;
      if (s.length <= 160) {
        result.push(s);
      } else {
        const commaSegs = s.split(/(?<=[,])\s+/);
        let currentChunk = "";
        for (const cs of commaSegs) {
          if ((currentChunk + " " + cs).length <= 160) {
            currentChunk = currentChunk ? `${currentChunk} ${cs}` : cs;
          } else {
            if (currentChunk) result.push(currentChunk.trim());
            currentChunk = cs;
          }
        }
        if (currentChunk.trim()) result.push(currentChunk.trim());
      }
    }
    return result.length > 0 ? result : [clean];
  };

  const stopSpeaking = () => {
    speechChunksRef.current = [];
    speechChunkIndexRef.current = 0;
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsSpeaking(false);
    setIsAudioPaused(false);
    setSpeakingNoteId(null);
  };

  const handlePauseSpeaking = () => {
    if (window.speechSynthesis && isSpeaking && !isAudioPaused) {
      try {
        window.speechSynthesis.pause();
      } catch {}
      setIsAudioPaused(true);
    }
  };

  const handleResumeSpeaking = () => {
    if (window.speechSynthesis && isSpeaking && isAudioPaused) {
      try {
        window.speechSynthesis.resume();
      } catch {}
      setIsAudioPaused(false);
    }
  };

  const playSpeechChunk = (index: number) => {
    if (!window.speechSynthesis) {
      stopSpeaking();
      return;
    }
    const chunks = speechChunksRef.current;
    if (index >= chunks.length) {
      stopSpeaking();
      return;
    }

    const chunkText = chunks[index];
    const utterance = new SpeechSynthesisUtterance(chunkText);
    utterance.lang = speechLangRef.current;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const match = voices.find((v) => {
        const vLang = v.lang.toLowerCase().replace("_", "-");
        return (
          vLang.includes("pt-br") ||
          (speechLangRef.current.startsWith("pt") && vLang.startsWith("pt")) ||
          (speechLangRef.current.startsWith("es") && vLang.startsWith("es")) ||
          (speechLangRef.current.startsWith("en") && vLang.startsWith("en"))
        );
      });
      if (match) utterance.voice = match;
    }

    utterance.onend = () => {
      speechChunkIndexRef.current = index + 1;
      playSpeechChunk(index + 1);
    };

    utterance.onerror = (e: any) => {
      if (e.error === "canceled" || e.error === "interrupted") {
        return;
      }
      speechChunkIndexRef.current = index + 1;
      playSpeechChunk(index + 1);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSpeak = (textToRead: string, noteId: string | null = null) => {
    if (!window.speechSynthesis) {
      showNotification("Navegador não suporta leitura de áudio.", "error");
      return;
    }

    // Toggle pause/resume if already speaking this exact note/text
    if (isSpeaking && speakingNoteId === noteId) {
      if (isAudioPaused) {
        handleResumeSpeaking();
      } else {
        handlePauseSpeaking();
      }
      return;
    }

    stopSpeaking();

    const chunks = splitTextIntoSpeechChunks(textToRead);
    if (chunks.length === 0) {
      showNotification("Nenhum texto para ler.", "info");
      return;
    }

    speechChunksRef.current = chunks;
    speechChunkIndexRef.current = 0;
    speechLangRef.current = micLang;

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {}

    setIsSpeaking(true);
    setIsAudioPaused(false);
    setSpeakingNoteId(noteId);

    playSpeechChunk(0);
  };

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (polishAbortControllerRef.current) {
        polishAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Omni Microphone handlers
  const appendText = (prev: string, addition: string) => {
    const pTrim = prev.trim();
    const aTrim = addition.trim();
    if (!pTrim) return aTrim;
    if (!aTrim) return pTrim;
    return `${pTrim} ${aTrim}`;
  };

  const stopListening = () => {
    isManuallyStoppedRef.current = true;
    consecutiveMicErrorsRef.current = 0;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");

    // If AI correction is active and speech was captured, refine it with abortable signal
    const segment = accumulatedSpeechRef.current.trim();
    if (aiCorrectionActive && segment.length > 3) {
      accumulatedSpeechRef.current = "";
      const abortController = new AbortController();
      polishAbortControllerRef.current = abortController;
      setIsRefining(true);

      refineSpeechText(segment, micLang, abortController.signal)
        .then((refined) => {
          if (refined && refined.trim() && !abortController.signal.aborted) {
            const current = textRef.current;
            const idx = current.lastIndexOf(segment);
            if (idx !== -1) {
              const updated =
                current.slice(0, idx) +
                refined.trim() +
                current.slice(idx + segment.length);
              setText(updated);
              setFreeNotesText(updated);
            }
          }
        })
        .finally(() => {
          setIsRefining(false);
          polishAbortControllerRef.current = null;
        });
    } else {
      accumulatedSpeechRef.current = "";
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showNotification(
        "Seu navegador não suporta reconhecimento de voz.",
        "error"
      );
      return;
    }

    stopSpeaking();
    isManuallyStoppedRef.current = false;
    accumulatedSpeechRef.current = "";

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = micLang;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript("");
        consecutiveMicErrorsRef.current = 0;
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
        recognitionRef.current = null;

        // Auto restart if not stopped manually and not error spamming
        if (!isManuallyStoppedRef.current && consecutiveMicErrorsRef.current < 3) {
          setTimeout(() => {
            if (!isManuallyStoppedRef.current) {
              startListening();
            }
          }, 350);
        }
      };

      recognition.onresult = (event: any) => {
        let finalChunk = "";
        let interimChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript;
          } else {
            interimChunk += res[0].transcript;
          }
        }

        if (finalChunk.trim()) {
          const preCorrected = applyLocalDictionaryCorrections(finalChunk.trim());
          const updated = appendText(textRef.current, preCorrected);
          setText(updated);
          setFreeNotesText(updated);

          accumulatedSpeechRef.current = accumulatedSpeechRef.current
            ? `${accumulatedSpeechRef.current} ${preCorrected}`
            : preCorrected;
        }

        setInterimTranscript(interimChunk);
      };

      recognition.onerror = (event: any) => {
        if (event.error === "no-speech" || event.error === "aborted") {
          return;
        }
        console.warn("Reconhecimento de voz:", event.error);
        consecutiveMicErrorsRef.current++;
        if (event.error === "not-allowed") {
          isManuallyStoppedRef.current = true;
          setIsListening(false);
        }
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Pause / Cancel Polish button handler
  const handlePauseOrCancelPolish = () => {
    if (polishAbortControllerRef.current) {
      polishAbortControllerRef.current.abort();
      polishAbortControllerRef.current = null;
    }
    setIsRefining(false);
    showNotification("Polimento pausado / cancelado com sucesso. ⏸️", "info");
  };

  // Manual Polish button
  const handlePolishText = async () => {
    if (!text.trim()) {
      showNotification("Escreva algo antes de polir com a IA!", "info");
      return;
    }
    if (isRefining) {
      handlePauseOrCancelPolish();
      return;
    }

    const abortController = new AbortController();
    polishAbortControllerRef.current = abortController;
    setIsRefining(true);
    try {
      const polished = await refineSpeechText(text, micLang, abortController.signal);
      if (polished && polished.trim() && !abortController.signal.aborted) {
        setText(polished.trim());
        setFreeNotesText(polished.trim());
        showNotification("Texto polido e corrigido com IA! ✨", "success");
      }
    } catch (err: any) {
      if (abortController.signal.aborted) {
        showNotification("Polimento pausado.", "info");
      } else {
        showNotification("Erro ao polir texto com IA.", "error");
      }
    } finally {
      setIsRefining(false);
      polishAbortControllerRef.current = null;
    }
  };

  // --- ATTACHMENTS STATE & HELPERS ---
  const [attachments, setAttachments] = useState<NotepadAttachment[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Direct Audio Note Voice Recorder for Attachments
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordSeconds, setAudioRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioRecordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatRecordingTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const compressImageFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (
    files: FileList | null,
    forcedType?: NotepadAttachment["type"]
  ) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    for (const file of fileList) {
      if (file.size > 15 * 1024 * 1024) {
        showNotification(
          `Arquivo "${file.name}" excede o limite de 15MB!`,
          "error"
        );
        continue;
      }

      let detectedType: NotepadAttachment["type"] = forcedType || "document";
      const mime = (file.type || "").toLowerCase();
      const ext = (file.name.split(".").pop() || "").toLowerCase();

      if (forcedType) {
        detectedType = forcedType;
      } else if (
        mime.startsWith("image/") ||
        ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext)
      ) {
        detectedType = "image";
      } else if (
        mime.startsWith("audio/") ||
        ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)
      ) {
        detectedType = "music";
      } else {
        detectedType = "document";
      }

      try {
        let dataUrl = "";
        if (detectedType === "image") {
          dataUrl = await compressImageFile(file);
        } else {
          dataUrl = await readFileAsDataUrl(file);
        }

        const newAttachment: NotepadAttachment = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          name: file.name,
          type: detectedType,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
          uploadedAt: new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setAttachments((prev) => [...prev, newAttachment]);
        showNotification(`Anexo "${file.name}" adicionado com sucesso! 📎`, "success");
      } catch (err) {
        console.error("Erro ao carregar anexo:", err);
        showNotification(`Falha ao ler o arquivo "${file.name}".`, "error");
      }
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleStartAudioRecording = async () => {
    try {
      if (isListening) {
        stopListening();
      }
      if (isSpeaking) {
        stopSpeaking();
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification("Seu navegador não suporta gravação de áudio direta.", "error");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (audioBlob.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const now = new Date();
            const timeStr = now.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }).replace(/:/g, "-");
            const newAtt: NotepadAttachment = {
              id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              name: `Áudio_Voz_${timeStr}.webm`,
              type: "audio",
              mimeType: audioBlob.type || "audio/webm",
              size: audioBlob.size,
              dataUrl,
              uploadedAt: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            };
            setAttachments((prev) => [...prev, newAtt]);
            showNotification("Áudio gravado e anexado com sucesso! 🎙️", "success");
          };
          reader.readAsDataURL(audioBlob);
        }
      };

      recorder.start(250);
      setIsRecordingAudio(true);
      setAudioRecordSeconds(0);

      audioRecordTimerRef.current = setInterval(() => {
        setAudioRecordSeconds((prev) => prev + 1);
      }, 1000);
      showNotification("Gravando áudio... Fale ao microfone 🎙️", "info");
    } catch (err: any) {
      console.error("Erro ao iniciar gravação de áudio:", err);
      showNotification("Permissão de microfone necessária para gravar áudio.", "error");
    }
  };

  const handleStopAudioRecording = () => {
    if (audioRecordTimerRef.current) {
      clearInterval(audioRecordTimerRef.current);
      audioRecordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    setIsRecordingAudio(false);
  };

  const handleCancelAudioRecording = () => {
    if (audioRecordTimerRef.current) {
      clearInterval(audioRecordTimerRef.current);
      audioRecordTimerRef.current = null;
    }
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    setIsRecordingAudio(false);
    setAudioRecordSeconds(0);
    showNotification("Gravação de áudio cancelada.", "info");
  };

  useEffect(() => {
    return () => {
      if (audioRecordTimerRef.current) clearInterval(audioRecordTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // --- MASTER PIN PROFILE & SECURITY (CPF + E-MAIL) ---
  const [masterPinProfile, setMasterPinProfile] = useState<MasterPinProfile | null>(() => {
    try {
      const saved = localStorage.getItem("std_notepad_security_profile");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const formatCpf = (val: string): string => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const cleanCpf = (val: string): string => val.replace(/\D/g, "");

  const saveMasterSecurityProfile = (pin: string, cpf: string, email: string) => {
    const profile: MasterPinProfile = {
      pin,
      cpf: cpf.trim(),
      email: email.trim().toLowerCase(),
      createdAt: new Date().toLocaleDateString("pt-BR"),
    };
    try {
      localStorage.setItem("std_notepad_security_profile", JSON.stringify(profile));
    } catch {}
    setMasterPinProfile(profile);
    return profile;
  };

  // Save Modal States
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveCategory, setSaveCategory] = useState("Notas Pessoais");
  const [protectChoice, setProtectChoice] = useState<"no" | "yes">("no");
  const [useCustomPinInput, setUseCustomPinInput] = useState(false);
  const [customPinValue, setCustomPinValue] = useState("");

  // Registration in Save Modal (first time)
  const [regPin, setRegPin] = useState("");
  const [regPinConfirm, setRegPinConfirm] = useState("");
  const [regCpf, setRegCpf] = useState("");
  const [regEmail, setRegEmail] = useState(user?.email || "");

  // Update regEmail when user changes
  useEffect(() => {
    if (user?.email && !regEmail) {
      setRegEmail(user.email);
    }
  }, [user]);

  // Recovery Modal States
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoverCpf, setRecoverCpf] = useState("");
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverStep, setRecoverStep] = useState<"verify" | "new_pin">("verify");
  const [recoverNewPin, setRecoverNewPin] = useState("");
  const [recoverNewPinConfirm, setRecoverNewPinConfirm] = useState("");
  const [recoverError, setRecoverError] = useState("");

  const handleOpenRecovery = (targetNoteId?: string) => {
    if (targetNoteId) {
      setActiveUnlockNoteId(targetNoteId);
    }
    setRecoverStep("verify");
    setRecoverCpf("");
    setRecoverEmail(user?.email || "");
    setRecoverNewPin("");
    setRecoverNewPinConfirm("");
    setRecoverError("");
    setShowRecoverModal(true);
  };

  const handleVerifyRecovery = () => {
    setRecoverError("");
    if (!masterPinProfile) {
      setRecoverError("Nenhum PIN cadastrado neste dispositivo para recuperar.");
      return;
    }
    const enteredCpfClean = cleanCpf(recoverCpf);
    const savedCpfClean = cleanCpf(masterPinProfile.cpf);
    const enteredEmailNorm = recoverEmail.trim().toLowerCase();
    const savedEmailNorm = masterPinProfile.email.trim().toLowerCase();

    if (!enteredCpfClean || enteredCpfClean.length !== 11) {
      setRecoverError("Digite um CPF válido com 11 números.");
      return;
    }
    if (!enteredEmailNorm || !enteredEmailNorm.includes("@")) {
      setRecoverError("Digite um e-mail válido.");
      return;
    }

    if (enteredCpfClean !== savedCpfClean) {
      setRecoverError("CPF incorreto! Não coincide com o cadastro de segurança.");
      return;
    }
    if (enteredEmailNorm !== savedEmailNorm) {
      setRecoverError("E-mail incorreto! Não coincide com o cadastro de segurança.");
      return;
    }

    // Success: advance to create new pin
    setRecoverStep("new_pin");
    showNotification("Dados de segurança confirmados! Crie seu novo PIN.", "success");
  };

  const handleConfirmNewRecoveredPin = () => {
    setRecoverError("");
    if (recoverNewPin.length !== 4) {
      setRecoverError("O novo PIN deve ter exatamente 4 dígitos numéricos.");
      return;
    }
    if (recoverNewPin !== recoverNewPinConfirm) {
      setRecoverError("Os dois novos PINs digitados não são iguais.");
      return;
    }

    if (masterPinProfile) {
      saveMasterSecurityProfile(recoverNewPin, masterPinProfile.cpf, masterPinProfile.email);
    } else {
      saveMasterSecurityProfile(recoverNewPin, cleanCpf(recoverCpf), recoverEmail);
    }

    // Update existing saved notes to use the new PIN if they had a PIN
    if (handleUpdateNotePin) {
      savedNotes.forEach((n) => {
        if (n.pin) {
          handleUpdateNotePin(n.id, recoverNewPin);
        }
      });
    }

    // If user was unlocking a specific note, unlock it now
    if (activeUnlockNoteId) {
      setUnlockedNoteIds((prev) => [...prev, activeUnlockNoteId]);
      setActiveUnlockNoteId(null);
    }

    setShowRecoverModal(false);
    showNotification("PIN redefinido com sucesso! Novo PIN ativo 🛡️", "success");
  };

  // Confirm Save Note
  const handleConfirmSave = () => {
    if (!text.trim() && attachments.length === 0) {
      showNotification("Não é possível salvar uma nota vazia sem texto ou anexos!", "error");
      return;
    }

    let finalPin = "";

    if (protectChoice === "yes") {
      if (masterPinProfile) {
        // User already has registered PIN
        if (useCustomPinInput) {
          if (customPinValue.length !== 4) {
            showNotification("O PIN de segurança deve ter 4 dígitos!", "error");
            return;
          }
          finalPin = customPinValue;
        } else {
          finalPin = masterPinProfile.pin;
        }
      } else {
        // Initial registration
        if (regPin.length !== 4) {
          showNotification("O PIN de segurança deve ter 4 números!", "error");
          return;
        }
        if (regPin !== regPinConfirm) {
          showNotification("Os dois PINs digitados não são iguais!", "error");
          return;
        }
        const cleaned = cleanCpf(regCpf);
        if (cleaned.length !== 11) {
          showNotification("Informe um CPF válido com 11 dígitos para segurança!", "error");
          return;
        }
        if (!regEmail.trim() || !regEmail.includes("@")) {
          showNotification("Informe um e-mail válido para recuperação do PIN!", "error");
          return;
        }

        saveMasterSecurityProfile(regPin, cleaned, regEmail);
        finalPin = regPin;
      }
    }

    const finalTextToSave = text.trim()
      ? text
      : attachments.length > 0
      ? `[Anotação com ${attachments.length} anexo(s)]`
      : "";

    handleSaveNote(
      finalTextToSave,
      "",
      saveCategory,
      [finalTextToSave],
      finalPin,
      attachments.filter((a) => a.type === "image").map((a) => a.dataUrl),
      attachments.filter((a) => a.type === "image").map(() => 100),
      attachments
    );

    setShowSaveModal(false);
    setAttachments([]);
    setProtectChoice("no");
    setCustomPinValue("");
    showNotification(
      finalPin
        ? "Nota importante salva com proteção de PIN 🔒!"
        : "Nota salva com sucesso 💾!",
      "success"
    );
  };

  // Unlocking and managing saved notes
  const [unlockedNoteIds, setUnlockedNoteIds] = useState<string[]>([]);
  const [activeUnlockNoteId, setActiveUnlockNoteId] = useState<string | null>(null);
  const [unlockPinInput, setUnlockPinInput] = useState("");
  const [unlockError, setUnlockError] = useState(false);

  const handleAttemptUnlock = (note: any) => {
    if (note.pin === unlockPinInput || (masterPinProfile && masterPinProfile.pin === unlockPinInput)) {
      setUnlockedNoteIds((prev) => [...prev, note.id]);
      setActiveUnlockNoteId(null);
      setUnlockPinInput("");
      setUnlockError(false);
      showNotification("Nota desbloqueada com sucesso! 🔓", "success");
    } else {
      setUnlockError(true);
    }
  };

  // --- SHARE & SEND STATES & HELPERS (WHATSAPP & E-MAIL) ---
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedShareNote, setSelectedShareNote] = useState<any | null>(null);
  const [sharePhoneInput, setSharePhoneInput] = useState("");
  const [shareEmailInput, setShareEmailInput] = useState("");

  const formatNoteShareText = (note: any): string => {
    let output = `📝 *ANOTAÇÃO DO BLOCO DE NOTAS*\n`;
    if (note.date) output += `📅 Data: ${note.date}\n`;
    if (note.folder) output += `📁 Categoria: ${note.folder}\n`;
    output += `\n${note.text || "(Anotação com anexos)"}\n`;

    const atts: NotepadAttachment[] = Array.isArray(note.attachments)
      ? note.attachments
      : [];
    if (atts.length > 0) {
      output += `\n📎 *Anexos inclusos (${atts.length}):*\n`;
      atts.forEach((a, i) => {
        const typeLabel =
          a.type === "image"
            ? "🖼️ Imagem/Foto"
            : a.type === "music"
            ? "🎵 Música"
            : a.type === "audio"
            ? "🎙️ Áudio de Voz"
            : "📄 Documento";
        output += `${i + 1}. ${typeLabel}: ${a.name} (${formatFileSize(a.size)})\n`;
      });
    }

    return output.trim();
  };

  const handleSendWhatsApp = (note: any, phoneOverride?: string) => {
    const rawMsg = formatNoteShareText(note);
    const encodedMsg = encodeURIComponent(rawMsg);
    let target = (phoneOverride !== undefined ? phoneOverride : sharePhoneInput).replace(/\D/g, "");
    if (target && (target.length === 10 || target.length === 11)) {
      target = `55${target}`;
    }

    const url = target
      ? `https://api.whatsapp.com/send?phone=${target}&text=${encodedMsg}`
      : `https://api.whatsapp.com/send?text=${encodedMsg}`;

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Abrindo WhatsApp para enviar anotação 💬", "success");
    if (showShareModal) setShowShareModal(false);
  };

  const handleSendEmail = (note: any, emailOverride?: string) => {
    const subject = encodeURIComponent(
      `Anotação - ${note.folder || "Bloco de Notas"} (${note.date || ""})`
    );
    let bodyText = `Olá,\n\nSegue anotação salva do Bloco de Notas:\n\n`;
    if (note.date) bodyText += `Data: ${note.date}\n`;
    if (note.folder) bodyText += `Categoria: ${note.folder}\n`;
    bodyText += `\n${note.text || ""}\n\n`;

    const atts: NotepadAttachment[] = Array.isArray(note.attachments)
      ? note.attachments
      : [];
    if (atts.length > 0) {
      bodyText += `--- ANEXOS NA NOTA (${atts.length}) ---\n`;
      atts.forEach((a, i) => {
        bodyText += `${i + 1}. [${a.type.toUpperCase()}] ${a.name} (${formatFileSize(a.size)})\n`;
      });
      bodyText += `\n(Os arquivos completos estão salvos no Bloco de Notas)\n`;
    }

    const targetEmail = (emailOverride !== undefined ? emailOverride : shareEmailInput).trim();
    const mailtoUrl = `mailto:${targetEmail}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;

    const link = document.createElement("a");
    link.href = mailtoUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Abrindo aplicativo de E-mail ✉️", "success");
    if (showShareModal) setShowShareModal(false);
  };

  const handleOpenShareModal = (note: any) => {
    setSelectedShareNote(note);
    setSharePhoneInput("");
    setShareEmailInput("");
    setShowShareModal(true);
  };

  // Word count & char count
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 text-slate-100 font-sans pb-16">
      {/* Top Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-amber-500/20 p-4 rounded-3xl backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide uppercase flex items-center gap-2">
              📝 Bloco de Notas Normal
            </h2>
            <p className="text-[11px] text-amber-200/70 font-medium">
              Ditado por voz impecável, leitura em áudio e proteção por PIN opcional.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenRecovery()}
            className={`px-3 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border shadow-sm ${
              masterPinProfile
                ? "bg-slate-800 hover:bg-slate-750 text-amber-300 border-amber-500/30"
                : "bg-slate-800 hover:bg-slate-750 text-slate-300 border-white/10"
            }`}
            title="Gerenciar PIN e Segurança com CPF e E-mail"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>{masterPinProfile ? "PIN Ativo 🛡️" : "Criar PIN 🔑"}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab("editor")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              viewTab === "editor"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]"
                : "bg-slate-800 text-slate-300 hover:bg-slate-750"
            }`}
          >
            <span>Escrever</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab("saved")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer relative ${
              viewTab === "saved"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]"
                : "bg-slate-800 text-slate-300 hover:bg-slate-750"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Notas Salvas</span>
            {savedNotes.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950 text-amber-400 font-bold border border-amber-500/30">
                {savedNotes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {viewTab === "editor" ? (
        <div className="space-y-4">
          {/* Omni Microphone & Audio Action Bar */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            {/* Mic Toggle Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                  isListening
                    ? "bg-red-600 hover:bg-red-700 text-white animate-pulse border border-red-400"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40"
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Microfone: Gravando 🔴</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Ligar Microfone 🎙️</span>
                  </>
                )}
              </button>

              {/* Language Selector */}
              <div className="flex items-center bg-slate-950 border border-white/10 rounded-xl p-1 gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setMicLang("pt-BR")}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    micLang === "pt-BR"
                      ? "bg-amber-500 text-slate-950 font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🇧🇷 PT-BR
                </button>
                <button
                  type="button"
                  onClick={() => setMicLang("es-ES")}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    micLang === "es-ES"
                      ? "bg-amber-500 text-slate-950 font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🇪🇸 ES
                </button>
                <button
                  type="button"
                  onClick={() => setMicLang("en-US")}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    micLang === "en-US"
                      ? "bg-amber-500 text-slate-950 font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🇺🇸 EN
                </button>
              </div>

              {/* AI Auto-Correct toggle */}
              <button
                type="button"
                onClick={() => setAiCorrectionActive(!aiCorrectionActive)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase transition-all border ${
                  aiCorrectionActive
                    ? "bg-purple-950/40 border-purple-500/40 text-purple-300"
                    : "bg-slate-950 border-white/5 text-slate-500"
                }`}
              >
                <Sparkles
                  className={`w-3.5 h-3.5 ${
                    aiCorrectionActive ? "text-purple-400 animate-pulse" : ""
                  }`}
                />
                <span>Corretor IA: {aiCorrectionActive ? "ON" : "OFF"}</span>
              </button>
            </div>

            {/* Audio Deplauve & Polish buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Polish manual button with pause/cancel capability */}
              {isRefining ? (
                <button
                  type="button"
                  onClick={handlePauseOrCancelPolish}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg animate-pulse transition-all cursor-pointer"
                  title="Clique para pausar / cancelar o polimento de texto"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pausar Polimento ⏸️</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePolishText}
                  disabled={!text.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Polir texto com inteligência artificial"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                  <span>Polir Texto ✨</span>
                </button>
              )}

              {/* Read Aloud / Audio Reader with Pause and Stop */}
              {isSpeaking && !speakingNoteId ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={isAudioPaused ? handleResumeSpeaking : handlePauseSpeaking}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer ${
                      isAudioPaused
                        ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black"
                        : "bg-amber-600 hover:bg-amber-500 text-white"
                    }`}
                    title={isAudioPaused ? "Continuar áudio" : "Pausar áudio"}
                  >
                    {isAudioPaused ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Continuar ▶️</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pausar Áudio ⏸️</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
                    title="Parar reprodução de voz"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Parar</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSpeak(text)}
                  disabled={!text.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-sky-600 hover:bg-sky-500 text-white"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Ouvir Áudio 🔊</span>
                </button>
              )}

              {/* Save Note button */}
              <button
                type="button"
                onClick={() => setShowSaveModal(true)}
                disabled={!text.trim() && attachments.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Nota 💾</span>
              </button>

              {/* Quick WhatsApp Send from Editor */}
              <button
                type="button"
                onClick={() => {
                  if (!text.trim() && attachments.length === 0) {
                    showNotification("Escreva algo ou adicione anexos para enviar!", "error");
                    return;
                  }
                  handleSendWhatsApp({
                    text,
                    date: new Date().toLocaleString("pt-BR"),
                    folder: "Anotação Rápida",
                    attachments,
                  });
                }}
                disabled={!text.trim() && attachments.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Enviar anotação atual para o WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              {/* Quick E-mail Send from Editor */}
              <button
                type="button"
                onClick={() => {
                  if (!text.trim() && attachments.length === 0) {
                    showNotification("Escreva algo ou adicione anexos para enviar!", "error");
                    return;
                  }
                  handleSendEmail({
                    text,
                    date: new Date().toLocaleString("pt-BR"),
                    folder: "Anotação Rápida",
                    attachments,
                  });
                }}
                disabled={!text.trim() && attachments.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Enviar anotação atual por E-mail"
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">E-mail</span>
              </button>
            </div>
          </div>

          {/* Polishing In-Progress Banner with immediate Pause / Cancel */}
          <AnimatePresence>
            {isRefining && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-purple-950/80 border border-purple-500/50 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold text-purple-200 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>
                      ✨ Polindo pontuação e concordância com IA... Travou? Você pode pausar ou cancelar agora mesmo.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePauseOrCancelPolish}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-black uppercase rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1 shrink-0 ml-2"
                  >
                    <Pause className="w-3 h-3 fill-current" />
                    <span>Pausar</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Real-time Listening Banner */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-red-950/60 border border-red-500/40 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold text-red-200">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span>
                      🎙️ Microfone ouvindo em tempo real ({micLang}). Fale normalmente...
                    </span>
                  </div>
                  {interimTranscript && (
                    <span className="italic text-slate-300 truncate max-w-xs">
                      "{interimTranscript}"
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Notepad Writing Area */}
          <div className="bg-slate-900 border-2 border-white/10 rounded-3xl p-5 sm:p-7 space-y-4 relative shadow-2xl focus-within:border-amber-500/40 transition-colors">
            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={docInputRef}
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv,.odt,application/*,text/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFileUpload(e.target.files, "document");
                e.target.value = "";
              }}
            />
            <input
              type="file"
              ref={audioInputRef}
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFileUpload(e.target.files, "audio");
                e.target.value = "";
              }}
            />
            <input
              type="file"
              ref={musicInputRef}
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.wma"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFileUpload(e.target.files, "music");
                e.target.value = "";
              }}
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handleFileUpload(e.target.files, "image");
                e.target.value = "";
              }}
            />
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFileUpload(e.target.files, "image");
                e.target.value = "";
              }}
            />

            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder="Comece a escrever suas anotações aqui ou clique em Ligar Microfone para ditar por voz..."
              className="w-full min-h-[340px] sm:min-h-[400px] bg-transparent text-slate-100 placeholder:text-slate-600 text-base sm:text-lg leading-relaxed font-sans font-medium outline-none resize-y"
            />

            {/* Attachments Section in Editor */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-black uppercase text-amber-400 mr-1 flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Anexar:</span>
                  </span>

                  {/* 1. Arquivos / Documentos */}
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-white/10 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Anexar arquivos e documentos (PDF, Word, TXT, Planilhas)"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Arquivos (Documentos)</span>
                  </button>

                  {/* 2. Gravar Áudio do Microfone */}
                  {isRecordingAudio ? (
                    <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500/70 px-3 py-1 rounded-xl text-red-200 text-xs font-black shadow-md animate-pulse">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <span>Gravando Áudio {formatRecordingTime(audioRecordSeconds)}</span>
                      <button
                        type="button"
                        onClick={handleStopAudioRecording}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-black uppercase ml-1 cursor-pointer transition-all shadow-sm"
                        title="Finalizar gravação e anexar"
                      >
                        Anexar ⏹️
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelAudioRecording}
                        className="p-1 hover:text-white cursor-pointer ml-0.5"
                        title="Cancelar gravação"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleStartAudioRecording}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-white/10 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                        title="Gravar recado de voz diretamente pelo microfone e anexar à nota"
                      >
                        <Mic className="w-3.5 h-3.5 text-rose-400" />
                        <span>Gravar Áudio 🎙️</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        className="px-2 py-1.5 bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-white/10 rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                        title="Subir arquivo de áudio gravado"
                      >
                        Subir Áudio
                      </button>
                    </div>
                  )}

                  {/* 3. Músicas */}
                  <button
                    type="button"
                    onClick={() => musicInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-white/10 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Anexar músicas e faixas sonoras (MP3, WAV, etc.)"
                  >
                    <Music className="w-3.5 h-3.5 text-purple-400" />
                    <span>Músicas 🎵</span>
                  </button>

                  {/* 4. Fotos (Câmera Direta) */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-white/10 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Tirar foto diretamente com a câmera do dispositivo"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Fotos (Câmera) 📸</span>
                  </button>

                  {/* 5. Imagens (Galeria) */}
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-white/10 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Selecionar imagens e fotos da galeria"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Imagens 🖼️</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                  <span>{charCount} caracteres</span>
                  <span>•</span>
                  <span>{wordCount} palavras</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Deseja realmente limpar o bloco de notas?")) {
                        setText("");
                        setFreeNotesText("");
                        setAttachments([]);
                      }
                    }}
                    disabled={!text && attachments.length === 0}
                    className="hover:text-red-400 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 ml-2"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpar</span>
                  </button>
                </div>
              </div>

              {/* Attachments Preview Grid in Editor */}
              {attachments.length > 0 && (
                <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black uppercase text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" />
                      Anexos Prontos para Salvar ({attachments.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments([])}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase cursor-pointer"
                    >
                      Remover Todos
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="bg-slate-900 border border-white/10 rounded-xl p-2.5 flex flex-col justify-between gap-2 shadow-sm relative group"
                      >
                        {/* Top: info & remove */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            {att.type === "image" ? (
                              <div
                                onClick={() => setZoomedImage(att.dataUrl)}
                                className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-950 border border-white/10 cursor-pointer relative group/img"
                              >
                                <img
                                  src={att.dataUrl}
                                  alt={att.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </div>
                            ) : att.type === "music" || att.type === "audio" ? (
                              <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                                <Music className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}

                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-white truncate max-w-[140px]" title={att.name}>
                                {att.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {formatFileSize(att.size)} • {att.type.toUpperCase()}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="text-slate-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                            title="Remover anexo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Player for Audio / Music */}
                        {(att.type === "music" || att.type === "audio") && (
                          <div className="w-full pt-1">
                            <audio
                              controls
                              src={att.dataUrl}
                              className="w-full h-7 rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Saved Notes Section */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-white/10 p-4 rounded-3xl">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-black uppercase text-white tracking-wider">
                Suas Anotações Salvas ({savedNotes.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setViewTab("editor")}
              className="px-3 py-1.5 bg-amber-500 text-slate-950 font-black text-xs uppercase rounded-xl hover:bg-amber-400 transition-all cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Editor</span>
            </button>
          </div>

          {savedNotes.length === 0 ? (
            <div className="bg-slate-900 border border-dashed border-white/10 rounded-3xl p-12 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">
                Nenhuma nota salva no momento.
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Escreva suas anotações no editor, anexe documentos, áudios, músicas e fotos, e clique em{" "}
                <strong className="text-amber-400">Salvar Nota 💾</strong>. Você pode
                proteger notas importantes com PIN e recuperá-lo com CPF e E-mail!
              </p>
              <button
                type="button"
                onClick={() => setViewTab("editor")}
                className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Abrir Bloco de Notas
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedNotes.map((note) => {
                const isLocked = !!note.pin && !unlockedNoteIds.includes(note.id);
                const hasAttachments =
                  (note.attachments && note.attachments.length > 0) ||
                  (note.images && note.images.length > 0);

                return (
                  <div
                    key={note.id}
                    className={`p-5 rounded-3xl border transition-all space-y-3 shadow-lg ${
                      isLocked
                        ? "bg-slate-900/90 border-amber-500/30"
                        : "bg-slate-900 border-white/10"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {note.pin ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Protegida por PIN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">
                            Nota Comum
                          </span>
                        )}
                        {hasAttachments && (
                          <span className="px-2 py-0.5 rounded-md bg-sky-950/60 text-sky-300 border border-sky-500/30 text-[10px] font-bold uppercase flex items-center gap-1">
                            <Paperclip className="w-2.5 h-2.5" />
                            Anexos
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 font-medium">
                          {note.date}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Deseja realmente excluir esta anotação salva?"
                            )
                          ) {
                            handleDeleteSavedNote(note.id);
                          }
                        }}
                        className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer p-1"
                        title="Excluir nota"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Content */}
                    {isLocked ? (
                      <div className="py-6 text-center space-y-3 bg-slate-950/40 rounded-2xl border border-white/5 p-4">
                        <Lock className="w-8 h-8 text-amber-400 mx-auto animate-pulse" />
                        <div>
                          <p className="text-xs font-black uppercase text-amber-300 tracking-wider">
                            Nota Importante Trancada
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                            Digite seu PIN de 4 dígitos para visualizar o texto e os anexos.
                          </p>
                        </div>

                        {activeUnlockNoteId === note.id ? (
                          <div className="space-y-2 pt-2 max-w-xs mx-auto">
                            <input
                              type="password"
                              maxLength={4}
                              placeholder="••••"
                              value={unlockPinInput}
                              onChange={(e) => {
                                setUnlockPinInput(e.target.value.replace(/\D/g, ""));
                                setUnlockError(false);
                              }}
                              className="w-32 mx-auto text-center font-mono font-black text-2xl bg-slate-900 border-2 border-amber-500/50 rounded-xl py-2 px-3 text-white outline-none tracking-[0.4em] focus:border-amber-400"
                              autoFocus
                            />
                            {unlockError && (
                              <p className="text-[10px] text-red-400 font-bold uppercase">
                                ❌ PIN Incorreto!
                              </p>
                            )}
                            <div className="flex justify-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveUnlockNoteId(null);
                                  setUnlockPinInput("");
                                  setUnlockError(false);
                                }}
                                className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAttemptUnlock(note)}
                                disabled={unlockPinInput.length !== 4}
                                className="px-4 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase rounded-lg disabled:opacity-40 cursor-pointer"
                              >
                                Desbloquear
                              </button>
                            </div>
                            {/* Recovery button */}
                            <button
                              type="button"
                              onClick={() => handleOpenRecovery(note.id)}
                              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-bold mt-2 cursor-pointer flex items-center justify-center gap-1 mx-auto"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>Esqueceu o PIN? Recuperar com CPF e E-mail 🔑</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveUnlockNoteId(note.id);
                                setUnlockPinInput("");
                                setUnlockError(false);
                              }}
                              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Digitar PIN para Abrir</span>
                            </button>
                            <br />
                            <button
                              type="button"
                              onClick={() => handleOpenRecovery(note.id)}
                              className="text-[11px] text-slate-400 hover:text-amber-300 underline font-medium cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Esqueceu o PIN? Recuperar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 max-h-56 overflow-y-auto space-y-3">
                          {note.text ? (
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                              {note.text}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500 italic">
                              (Nota salva sem texto escrito)
                            </p>
                          )}

                          {/* Saved Attachments Rendering */}
                          {hasAttachments && (
                            <div className="pt-2 border-t border-white/5 space-y-2">
                              <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                                <Paperclip className="w-3 h-3" />
                                Anexos Salvos:
                              </span>

                              {/* Typed attachments */}
                              {note.attachments && Array.isArray(note.attachments) && note.attachments.length > 0 && (
                                <div className="space-y-2">
                                  {/* Images Grid */}
                                  {note.attachments.filter((a: any) => a.type === "image").length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                                      {note.attachments.filter((a: any) => a.type === "image").map((att: any) => (
                                        <div
                                          key={att.id}
                                          onClick={() => setZoomedImage(att.dataUrl)}
                                          className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-white/10 cursor-pointer group shadow-sm"
                                        >
                                          <img
                                            src={att.dataUrl}
                                            alt={att.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                          />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Eye className="w-4 h-4 text-white" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Audio & Music Players */}
                                  {note.attachments.filter((a: any) => a.type === "music" || a.type === "audio").map((att: any) => (
                                    <div
                                      key={att.id}
                                      className="p-2 bg-slate-900/90 border border-purple-500/20 rounded-xl space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between text-[11px] font-bold text-purple-300">
                                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                                          <Music className="w-3.5 h-3.5 shrink-0" />
                                          {att.name}
                                        </span>
                                        <a
                                          href={att.dataUrl}
                                          download={att.name}
                                          className="text-slate-400 hover:text-white flex items-center gap-0.5 text-[10px]"
                                          title="Baixar áudio"
                                        >
                                          <Download className="w-3 h-3" />
                                          <span>{formatFileSize(att.size)}</span>
                                        </a>
                                      </div>
                                      <audio
                                        controls
                                        src={att.dataUrl}
                                        className="w-full h-7 rounded-lg"
                                      />
                                    </div>
                                  ))}

                                  {/* Documents List */}
                                  {note.attachments.filter((a: any) => a.type === "document").map((att: any) => (
                                    <div
                                      key={att.id}
                                      className="p-2 bg-slate-900/90 border border-blue-500/20 rounded-xl flex items-center justify-between gap-2"
                                    >
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                                        <div className="overflow-hidden">
                                          <p className="text-xs font-bold text-white truncate max-w-[150px]">
                                            {att.name}
                                          </p>
                                          <p className="text-[10px] text-slate-400">
                                            {formatFileSize(att.size)}
                                          </p>
                                        </div>
                                      </div>
                                      <a
                                        href={att.dataUrl}
                                        download={att.name}
                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 shrink-0"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>Baixar</span>
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Backward-compatibility fallback for notes with note.images */}
                              {(!note.attachments || note.attachments.length === 0) && note.images && note.images.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                                  {note.images.map((img: string, i: number) => (
                                    <div
                                      key={i}
                                      onClick={() => setZoomedImage(img)}
                                      className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-white/10 cursor-pointer group"
                                    >
                                      <img
                                        src={img}
                                        alt={`Imagem ${i + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Eye className="w-4 h-4 text-white" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Note Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              setText(note.text);
                              setFreeNotesText(note.text);
                              if (note.attachments && Array.isArray(note.attachments)) {
                                setAttachments(note.attachments);
                              } else if (note.images && Array.isArray(note.images)) {
                                setAttachments(
                                  note.images.map((img: string, idx: number) => ({
                                    id: `img_${idx}_${Date.now()}`,
                                    name: `Foto_${idx + 1}.jpg`,
                                    type: "image",
                                    mimeType: "image/jpeg",
                                    size: Math.round(img.length * 0.75),
                                    dataUrl: img,
                                    uploadedAt: note.date || "",
                                  }))
                                );
                              } else {
                                setAttachments([]);
                              }
                              setViewTab("editor");
                              showNotification("Nota e anexos carregados no editor!", "info");
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
                          >
                            Editar no Bloco ✍️
                          </button>

                          <div className="flex items-center gap-1.5">
                            {isSpeaking && speakingNoteId === note.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={isAudioPaused ? handleResumeSpeaking : handlePauseSpeaking}
                                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                    isAudioPaused
                                      ? "bg-amber-500 text-slate-950 border-amber-400"
                                      : "bg-amber-600 text-white border-amber-500"
                                  }`}
                                  title={isAudioPaused ? "Continuar áudio" : "Pausar áudio"}
                                >
                                  {isAudioPaused ? (
                                    <Play className="w-4 h-4 fill-current" />
                                  ) : (
                                    <Pause className="w-4 h-4 fill-current" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={stopSpeaking}
                                  className="p-2 rounded-xl border bg-red-600 hover:bg-red-500 text-white border-red-500 transition-all cursor-pointer"
                                  title="Parar áudio"
                                >
                                  <Square className="w-4 h-4 fill-current" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSpeak(note.text, note.id)}
                                className="p-2 rounded-xl border bg-slate-800 hover:bg-slate-750 text-slate-300 border-white/10 transition-all cursor-pointer"
                                title="Ouvir esta nota em voz alta"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Enviar para o WhatsApp */}
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(note)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                              title="Enviar esta anotação salva para o WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-current" />
                              <span>WhatsApp</span>
                            </button>

                            {/* Enviar por E-mail */}
                            <button
                              type="button"
                              onClick={() => handleSendEmail(note)}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                              title="Enviar esta anotação salva por E-mail"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>E-mail</span>
                            </button>

                            {/* Copiar texto formatado com anexos */}
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(formatNoteShareText(note));
                                showNotification("Texto e detalhes da anotação copiados! 📋", "success");
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl border border-white/10 transition-all cursor-pointer"
                              title="Copiar texto da anotação"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            {/* Opções avançadas de envio */}
                            <button
                              type="button"
                              onClick={() => handleOpenShareModal(note)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl border border-white/10 transition-all cursor-pointer"
                              title="Opções de envio (com número específico ou e-mail de destino)"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Save Note with PIN Modal (Option to save with PIN: Sim ou Não) */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Save className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-white tracking-wide">
                      Salvar Anotação
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {attachments.length > 0
                        ? `Texto + ${attachments.length} anexo(s) inclusos`
                        : "Salve no seu dispositivo"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Salvar com PIN: Sim ou Não */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="text-center space-y-1">
                  <label className="text-xs font-black uppercase text-amber-300 tracking-wider block">
                    Salvar com PIN de Segurança? (Sim ou Não)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Ative o PIN apenas se for uma nota importante que deseje proteger com senha.
                  </p>
                </div>

                {/* Yes / No Toggle Selector */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setProtectChoice("no");
                      setUseCustomPinInput(false);
                    }}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      protectChoice === "no"
                        ? "bg-slate-800 text-white shadow-md border border-white/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>Não 📄 (Livre)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProtectChoice("yes")}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      protectChoice === "yes"
                        ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Sim 🔒 (Com PIN)</span>
                  </button>
                </div>

                {/* When User Chose SIM */}
                {protectChoice === "yes" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-2 border-t border-white/10 space-y-3"
                  >
                    {masterPinProfile ? (
                      /* Master PIN is ALREADY registered: quick use */
                      <div className="bg-slate-900/80 p-3.5 rounded-xl border border-amber-500/30 space-y-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-black text-amber-300 uppercase">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span>PIN Cadastrado Ativo 🔒</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Esta nota será salva com a proteção do seu PIN cadastrado.
                        </p>

                        {!useCustomPinInput ? (
                          <div className="space-y-1.5 pt-1">
                            <div className="py-2 px-3 bg-slate-950 rounded-xl border border-white/10 text-xs font-mono font-black text-amber-400 tracking-[0.3em]">
                              •••• (PIN gravado)
                            </div>
                            <div className="flex justify-between items-center text-[10px] pt-1">
                              <button
                                type="button"
                                onClick={() => setUseCustomPinInput(true)}
                                className="text-slate-400 hover:text-amber-300 underline cursor-pointer"
                              >
                                Digitar outro PIN
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowSaveModal(false);
                                  handleOpenRecovery();
                                }}
                                className="text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
                              >
                                Esqueci / Recuperar PIN 🔑
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1">
                            <label className="text-[10px] font-bold text-slate-300 uppercase block">
                              Digite o PIN específico (4 números):
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              placeholder="••••"
                              value={customPinValue}
                              onChange={(e) =>
                                setCustomPinValue(e.target.value.replace(/\D/g, ""))
                              }
                              className="w-32 mx-auto text-center font-mono font-black text-2xl bg-slate-950 border-2 border-amber-500/50 rounded-xl py-2 px-3 text-white outline-none tracking-[0.4em] focus:border-amber-400"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setUseCustomPinInput(false)}
                              className="text-[10px] text-slate-400 hover:text-white underline block mx-auto cursor-pointer"
                            >
                              Voltar ao PIN padrão cadastrado
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Initial Master PIN Registration with CPF and E-mail */
                      <div className="bg-slate-900/90 p-3.5 rounded-xl border border-amber-500/40 space-y-3 text-left">
                        <div className="text-center space-y-0.5">
                          <p className="text-xs font-black uppercase text-amber-300 flex items-center justify-center gap-1">
                            <KeyRound className="w-3.5 h-3.5" />
                            Cadastrar PIN de Segurança
                          </p>
                          <p className="text-[10px] text-slate-400 leading-tight">
                            Cadastre uma vez. Seu CPF e E-mail serão usados caso precise recuperar o PIN futuramente.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300 uppercase">
                              Novo PIN (4 dígitos):
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              placeholder="••••"
                              value={regPin}
                              onChange={(e) =>
                                setRegPin(e.target.value.replace(/\D/g, ""))
                              }
                              className="w-full text-center font-mono font-black text-xl bg-slate-950 border border-white/20 rounded-xl py-1.5 text-white outline-none tracking-[0.3em] focus:border-amber-400"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300 uppercase">
                              Confirmar PIN:
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              placeholder="••••"
                              value={regPinConfirm}
                              onChange={(e) =>
                                setRegPinConfirm(e.target.value.replace(/\D/g, ""))
                              }
                              className="w-full text-center font-mono font-black text-xl bg-slate-950 border border-white/20 rounded-xl py-1.5 text-white outline-none tracking-[0.3em] focus:border-amber-400"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-300 uppercase">
                            Seu CPF (para recuperação de segurança):
                          </label>
                          <input
                            type="text"
                            maxLength={14}
                            placeholder="000.000.000-00"
                            value={regCpf}
                            onChange={(e) => setRegCpf(formatCpf(e.target.value))}
                            className="w-full font-mono text-xs bg-slate-950 border border-white/20 rounded-xl py-2 px-3 text-white outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-300 uppercase">
                            Seu E-mail (para recuperação):
                          </label>
                          <input
                            type="email"
                            placeholder="seuemail@exemplo.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="w-full text-xs bg-slate-950 border border-white/20 rounded-xl py-2 px-3 text-white outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveModal(false);
                    setProtectChoice("no");
                  }}
                  className="py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95"
                >
                  Confirmar e Salvar 💾
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recover PIN Modal (with CPF and E-mail) */}
      <AnimatePresence>
        {showRecoverModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-white tracking-wide">
                      Recuperar PIN de Segurança
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Validação segura por CPF e E-mail
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecoverModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {recoverError && (
                <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-xl flex items-center gap-2 text-xs text-red-200">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{recoverError}</span>
                </div>
              )}

              {recoverStep === "verify" ? (
                <div className="space-y-3.5">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Informe o <strong>CPF</strong> e o <strong>E-mail</strong> que você cadastrou no bloco de notas para confirmar sua identidade e redefinir o PIN:
                  </p>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      CPF Cadastrado:
                    </label>
                    <input
                      type="text"
                      maxLength={14}
                      placeholder="000.000.000-00"
                      value={recoverCpf}
                      onChange={(e) => setRecoverCpf(formatCpf(e.target.value))}
                      className="w-full font-mono text-sm bg-slate-950 border border-white/20 rounded-xl py-2 px-3 text-white outline-none focus:border-amber-400"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      E-mail Cadastrado:
                    </label>
                    <input
                      type="email"
                      placeholder="seuemail@exemplo.com"
                      value={recoverEmail}
                      onChange={(e) => setRecoverEmail(e.target.value)}
                      className="w-full text-sm bg-slate-950 border border-white/20 rounded-xl py-2 px-3 text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRecoverModal(false)}
                      className="py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-black uppercase cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyRecovery}
                      className="py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase cursor-pointer shadow-md font-sans"
                    >
                      Verificar Dados 🛡️
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Set New PIN */
                <div className="space-y-3.5 text-center">
                  <p className="text-xs text-emerald-300 font-bold">
                    ✅ Identidade confirmada com sucesso! Crie agora seu novo PIN de 4 dígitos:
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300 uppercase block">
                        Novo PIN:
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={recoverNewPin}
                        onChange={(e) =>
                          setRecoverNewPin(e.target.value.replace(/\D/g, ""))
                        }
                        className="w-full text-center font-mono font-black text-2xl bg-slate-950 border border-amber-500/50 rounded-xl py-2 text-white outline-none tracking-[0.3em] focus:border-amber-400"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300 uppercase block">
                        Confirmar:
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={recoverNewPinConfirm}
                        onChange={(e) =>
                          setRecoverNewPinConfirm(e.target.value.replace(/\D/g, ""))
                        }
                        className="w-full text-center font-mono font-black text-2xl bg-slate-950 border border-amber-500/50 rounded-xl py-2 text-white outline-none tracking-[0.3em] focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRecoverStep("verify")}
                      className="py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-black uppercase cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmNewRecoveredPin}
                      disabled={recoverNewPin.length !== 4 || recoverNewPin !== recoverNewPinConfirm}
                      className="py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 rounded-xl text-xs font-black uppercase cursor-pointer shadow-md"
                    >
                      Salvar Novo PIN 🔒
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share / Send Modal for Saved Notes (WhatsApp & E-mail) */}
      <AnimatePresence>
        {showShareModal && selectedShareNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 my-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-white tracking-wide">
                      Enviar Anotação Salva 📤
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Envie para o WhatsApp ou E-mail com 1 clique
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Note Preview Box */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold">
                  <span>📅 {selectedShareNote.date || "Data não registrada"}</span>
                  {selectedShareNote.folder && (
                    <span className="text-slate-400">📁 {selectedShareNote.folder}</span>
                  )}
                </div>
                <p className="text-xs text-slate-200 line-clamp-4 font-mono whitespace-pre-wrap">
                  {selectedShareNote.text || "(Anotação com anexos)"}
                </p>
                {selectedShareNote.attachments && selectedShareNote.attachments.length > 0 && (
                  <div className="pt-1.5 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-sky-400">
                    <Paperclip className="w-3 h-3" />
                    <span>{selectedShareNote.attachments.length} anexo(s) incluído(s) no resumo</span>
                  </div>
                )}
              </div>

              {/* Option 1: WhatsApp */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase">
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>Enviar para o WhatsApp</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-medium">
                    Web & Celular
                  </span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Número com DDD (opcional):
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: (11) 98765-4321 ou deixe em branco para escolher"
                    value={sharePhoneInput}
                    onChange={(e) => setSharePhoneInput(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-900 border border-white/15 rounded-xl py-2 px-3 text-white outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Se deixar em branco, o WhatsApp abrirá com sua lista de contatos para você escolher quem vai receber.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(selectedShareNote, sharePhoneInput)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-950 cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Abrir WhatsApp e Enviar 💬</span>
                </button>
              </div>

              {/* Option 2: E-mail */}
              <div className="bg-blue-950/40 border border-blue-500/30 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase">
                    <Mail className="w-4 h-4" />
                    <span>Enviar por E-mail</span>
                  </div>
                  <span className="text-[10px] text-blue-300 font-medium">
                    Gmail / Outlook / Apple
                  </span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    E-mail de destino (opcional):
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: destinatario@exemplo.com ou deixe em branco"
                    value={shareEmailInput}
                    onChange={(e) => setShareEmailInput(e.target.value)}
                    className="w-full text-xs font-sans bg-slate-900 border border-white/15 rounded-xl py-2 px-3 text-white outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Se deixar em branco, o seu aplicativo de e-mail abrirá com o texto preenchido para você escolher os destinatários.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendEmail(selectedShareNote, shareEmailInput)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-950 cursor-pointer active:scale-95"
                >
                  <Mail className="w-4 h-4" />
                  <span>Abrir E-mail e Enviar ✉️</span>
                </button>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(formatNoteShareText(selectedShareNote));
                    showNotification("Texto da anotação copiado com sucesso! 📋", "success");
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/10 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Texto Completo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
            onClick={() => setZoomedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={zoomedImage}
                alt="Foto ampliada"
                className="max-w-full max-h-[82vh] rounded-2xl object-contain shadow-2xl border border-white/10"
              />
              <div className="flex items-center gap-3 mt-3">
                <a
                  href={zoomedImage}
                  download="foto_anexo.jpg"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Foto</span>
                </a>
                <button
                  type="button"
                  onClick={() => setZoomedImage(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Fechar</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
