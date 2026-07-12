import { SarvamAIClient } from 'sarvamai';

const apiKey = process.env.SARVAM_API_KEY;
const USE_REAL_SARVAM = apiKey && apiKey !== "YOUR_SARVAM_KEY";

console.log("[Sarvam AI] Voice Service initialized. USE_REAL_SARVAM:", !!USE_REAL_SARVAM);

export async function transcribeAudio(audioBlobUrl: string): Promise<string> {
  console.log("[Sarvam AI] transcribeAudio. USE_REAL_SARVAM:", !!USE_REAL_SARVAM);

  if (!USE_REAL_SARVAM) {
    // Fallback Mock Transcript
    return "Simulated speech transcript";
  }

  try {
    const responseBlob = await fetch(audioBlobUrl);
    const blob = await responseBlob.blob();
    const file = new File([blob], "recording.wav", { type: "audio/wav" });

    const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });
    const res = await client.speechToText.transcribe({
      file: file as any,
      model: "saaras:v3",
      language_code: "unknown" // auto-detect language
    });

    console.log("[Sarvam AI] transcribeAudio. PATH: REAL API success");
    return res.transcript || "";
  } catch (error: any) {
    console.log(`[Sarvam AI] transcribeAudio. PATH: REAL API error: ${error.message}`);
    console.log("[Sarvam AI] transcribeAudio. PATH: MOCK fallback");
    return "Simulated speech transcript";
  }
}

export async function synthesizeSpeech(text: string, language: "en" | "mr" = "en"): Promise<void> {
  console.log("[Sarvam AI] synthesizeSpeech. USE_REAL_SARVAM:", !!USE_REAL_SARVAM);

  if (!USE_REAL_SARVAM) {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === "mr" ? "mr-IN" : "en-IN";
        
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(language === "mr" ? "mr" : "en"));
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      } else {
        console.log(`TTS Mock [${language}]: ${text}`);
        resolve();
      }
    });
  }

  try {
    const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });
    const target_lang = language === "mr" ? "mr-IN" : "en-IN";

    const res = await client.textToSpeech.convert({
      text,
      target_language_code: target_lang,
      model: "bulbul:v3",
      speaker: "shruti"
    });

    console.log("[Sarvam AI] synthesizeSpeech. PATH: REAL API success");

    if (res.audios && res.audios.length > 0) {
      const base64Audio = res.audios[0];
      if (typeof window !== "undefined") {
        const audioSrc = `data:audio/wav;base64,${base64Audio}`;
        const audio = new Audio(audioSrc);
        return new Promise((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch((err) => {
            console.error("Audio playback error:", err);
            resolve();
          });
        });
      }
    }
  } catch (error: any) {
    console.log(`[Sarvam AI] synthesizeSpeech. PATH: REAL API error: ${error.message}`);
    console.log("[Sarvam AI] synthesizeSpeech. PATH: MOCK fallback");
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === "mr" ? "mr-IN" : "en-IN";
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      } else {
        resolve();
      }
    });
  }
}

// Continuous Listening Web Speech API Fallback
export function startContinuousListening(
  onResult: (text: string) => void,
  onError: (err: string) => void,
  language: "en" | "mr" = "en"
): { stop: () => void } {
  if (typeof window !== "undefined") {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === "mr" ? "mr-IN" : "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      };

      recognition.onerror = (event: any) => {
        onError(event.error);
      };

      recognition.start();
      return {
        stop: () => {
          try {
            recognition.stop();
          } catch(e) {}
        }
      };
    }
  }

  console.warn("SpeechRecognition not supported in this environment");
  return { stop: () => {} };
}

// WebSocket Streaming STT wrapper for Call Mode
export async function startStreamingSTT(
  onTranscript: (text: string) => void,
  onError: (err: any) => void,
  language: "en" | "mr" = "en"
): Promise<{ sendAudioChunk: (base64Audio: string) => void; stop: () => void }> {
  console.log("[Sarvam AI] startStreamingSTT. USE_REAL_SARVAM:", !!USE_REAL_SARVAM);

  if (!USE_REAL_SARVAM) {
    let intervalId = setInterval(() => {
      onTranscript("Simulated continuous speech");
    }, 5000);
    return {
      sendAudioChunk: (base64) => {},
      stop: () => clearInterval(intervalId)
    };
  }

  try {
    const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });
    const target_lang = language === "mr" ? "mr-IN" : "en-IN";

    const socket = await client.speechToTextStreaming.connect({
      "language-code": target_lang as any,
      "Api-Subscription-Key": apiKey || ""
    });

    socket.on('message', (msg: any) => {
      if (msg.type === "transcription" || msg.type === "transcript") {
        onTranscript(msg.data?.transcript || "");
      }
    });

    socket.on('error', (err: any) => {
      onError(err);
    });

    socket.connect();

    return {
      sendAudioChunk: (base64Audio: string) => {
        socket.transcribe({ audio: base64Audio });
      },
      stop: () => {
        socket.close();
      }
    };
  } catch (error: any) {
    console.error("Streaming STT connection error:", error);
    onError(error);
    return {
      sendAudioChunk: () => {},
      stop: () => {}
    };
  }
}

// WebSocket Streaming TTS wrapper for Call Mode
export async function startStreamingTTS(
  onAudioData: (base64Audio: string) => void,
  onError: (err: any) => void,
  language: "en" | "mr" = "en"
): Promise<{ sendText: (text: string) => void; stop: () => void }> {
  console.log("[Sarvam AI] startStreamingTTS. USE_REAL_SARVAM:", !!USE_REAL_SARVAM);

  if (!USE_REAL_SARVAM) {
    return {
      sendText: (text) => console.log(`Streaming TTS mock: ${text}`),
      stop: () => {}
    };
  }

  try {
    const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });
    const target_lang = language === "mr" ? "mr-IN" : "en-IN";

    const socket = await client.textToSpeechStreaming.connect({
      "Api-Subscription-Key": apiKey || ""
    });

    socket.on('message', (msg: any) => {
      if (msg.type === "audio") {
        onAudioData(msg.data?.audio || "");
      }
    });

    socket.on('error', (err: any) => {
      onError(err);
    });

    socket.connect();
    socket.configureConnection({
      target_language_code: target_lang as any,
      speaker: "shruti" as any,
      output_audio_codec: "linear16" as any
    });

    return {
      sendText: (text: string) => {
        socket.convert(text);
      },
      stop: () => {
        socket.close();
      }
    };
  } catch (error: any) {
    console.error("Streaming TTS connection error:", error);
    onError(error);
    return {
      sendText: () => {},
      stop: () => {}
    };
  }
}
