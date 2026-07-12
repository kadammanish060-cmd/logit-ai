import { Audio as ExpoAudio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const apiKey = process.env.EXPO_PUBLIC_SARVAM_API_KEY || process.env.SARVAM_API_KEY;
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

    const formData = new FormData();
    formData.append("file", blob, "recording.wav");
    formData.append("model", "saaras:v3");
    formData.append("language_code", "unknown");

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey || ""
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    console.log("[Sarvam AI] transcribeAudio. PATH: REAL API success");
    return data.transcript || "";
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
    const target_lang = language === "mr" ? "mr-IN" : "en-IN";
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey || "",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        target_language_code: target_lang,
        model: "bulbul:v3",
        speaker: "shruti"
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    console.log("[Sarvam AI] synthesizeSpeech. PATH: REAL API success");

    if (data.audios && data.audios.length > 0) {
      const base64Audio = data.audios[0];
      if (Platform.OS === 'web') {
        if (typeof Audio !== "undefined") {
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
      } else {
        // Native mobile build (Android / iOS)
        try {
          const tempUri = `${FileSystem.cacheDirectory}temp_tts.wav`;
          const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, "");
          await FileSystem.writeAsStringAsync(tempUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const { sound } = await ExpoAudio.Sound.createAsync({ uri: tempUri });
          return new Promise((resolve) => {
            sound.setOnPlaybackStatusUpdate((status: any) => {
              if (status.didJustFinish) {
                sound.unloadAsync().catch(() => {});
                resolve();
              }
            });
            sound.playAsync().catch((err) => {
              console.error("Native playAsync error:", err);
              sound.unloadAsync().catch(() => {});
              resolve();
            });
          });
        } catch (err) {
          console.error("Native audio playback error:", err);
        }
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

  if (Platform.OS === 'web') {
    console.warn("SpeechRecognition not supported in this environment");
  }
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
    const target_lang = language === "mr" ? "mr-IN" : "en-IN";
    const wsUrl = `wss://api.sarvam.ai/speech-to-text/ws?language-code=${target_lang}`;
    const protocols = [`api-subscription-key.${apiKey}`];

    const ws = new WebSocket(wsUrl, protocols);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "transcription" || msg.type === "transcript") {
          onTranscript(msg.data?.transcript || "");
        }
      } catch (err) {
        console.error("STT message parse error:", err);
      }
    };

    ws.onerror = (event: any) => {
      onError(event.error || new Error("WebSocket error"));
    };

    ws.onclose = () => {
      console.log("[Sarvam AI] Streaming STT connection closed");
    };

    return {
      sendAudioChunk: (base64Audio: string) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ audio: base64Audio }));
        }
      },
      stop: () => {
        ws.close();
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
    const target_lang = language === "mr" ? "mr-IN" : "en-IN";
    const wsUrl = `wss://api.sarvam.ai/text-to-speech/ws`;
    const protocols = [`api-subscription-key.${apiKey}`];

    const ws = new WebSocket(wsUrl, protocols);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        target_language_code: target_lang,
        speaker: "shruti",
        output_audio_codec: "linear16"
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "audio") {
          onAudioData(msg.data?.audio || "");
        }
      } catch (err) {
        console.error("TTS message parse error:", err);
      }
    };

    ws.onerror = (event: any) => {
      onError(event.error || new Error("WebSocket error"));
    };

    ws.onclose = () => {
      console.log("[Sarvam AI] Streaming TTS connection closed");
    };

    return {
      sendText: (text: string) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ text }));
        }
      },
      stop: () => {
        ws.close();
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
