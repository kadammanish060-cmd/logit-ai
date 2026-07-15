import { createAudioPlayer, AudioModule, requestRecordingPermissionsAsync, setAudioModeAsync, RecordingPresets } from 'expo-audio';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import * as FileSystem from 'expo-file-system/legacy';
import { EncodingType } from 'expo-file-system';
import { Platform } from 'react-native';

const apiKey = process.env.EXPO_PUBLIC_SARVAM_API_KEY || process.env.SARVAM_API_KEY;
const USE_REAL_SARVAM = apiKey && apiKey !== "YOUR_SARVAM_KEY";

console.log("[Sarvam AI] Voice Service initialized. USE_REAL_SARVAM:", !!USE_REAL_SARVAM);

export async function transcribeAudio(audioBlobUrl: string): Promise<string> {
  console.log("[Sarvam AI] transcribeAudio. USE_REAL_SARVAM:", !!USE_REAL_SARVAM);

  if (!USE_REAL_SARVAM) {
    console.log("[Sarvam AI] transcribeAudio. PATH: MOCK fallback");
    return "Simulated speech transcript";
  }

  try {
    if (Platform.OS === 'web') {
      console.log("[Sarvam AI] Web Mode: Fetching blob from URI:", audioBlobUrl);
      const responseBlob = await fetch(audioBlobUrl);
      const blob = await responseBlob.blob();
      console.log("[Sarvam AI] Web Blob size:", blob.size, "bytes");

      const formData = new FormData();
      formData.append("file", blob, "recording.wav");
      formData.append("model", "saaras:v3");
      formData.append("language_code", "unknown");

      console.log("[Sarvam AI] Sending STT REST request to Sarvam API...");
      const response = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: {
          "api-subscription-key": apiKey || ""
        },
        body: formData
      });

      console.log("[Sarvam AI] STT Response received. Status:", response.status);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      console.log("[Sarvam AI] transcribeAudio. PATH: REAL API success");
      console.log("[Sarvam AI] STT Transcribed text:", JSON.stringify(data.transcript));
      return data.transcript || "";
    } else {
      console.log("[Sarvam AI] Native Mode: Uploading local URI via FileSystem.uploadAsync:", audioBlobUrl);
      
      const result = await uploadAsync(
        "https://api.sarvam.ai/speech-to-text",
        audioBlobUrl,
        {
          headers: {
            "api-subscription-key": apiKey || ""
          },
          httpMethod: "POST" as any,
          uploadType: FileSystemUploadType.MULTIPART,
          fieldName: "file",
          mimeType: "audio/wav",
          parameters: {
            model: "saaras:v3",
            language_code: "unknown"
          }
        }
      );

      console.log("[Sarvam AI] STT Response received. Status:", result.status);
      const data = JSON.parse(result.body);
      if (result.status < 200 || result.status >= 300) {
        throw new Error(data.message || `HTTP ${result.status}`);
      }

      console.log("[Sarvam AI] transcribeAudio. PATH: REAL API success");
      console.log("[Sarvam AI] STT Transcribed text:", JSON.stringify(data.transcript));
      return data.transcript || "";
    }
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
        speaker: "shruti",
        output_audio_codec: "mp3"
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
          const audioSrc = `data:audio/mp3;base64,${base64Audio}`;
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
          const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
          const tempUri = `${cacheDir}temp_tts.mp3`;
          const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, "");
          
          await FileSystem.writeAsStringAsync(tempUri, base64Data, {
            encoding: EncodingType.Base64,
          });

          const player = createAudioPlayer(tempUri);
          return new Promise<void>((resolve) => {
            const subscription = player.addListener('playbackStatusUpdate', (status: any) => {
              if (status.didJustFinish) {
                subscription.remove();
                player.release();
                resolve();
              }
            });
            player.play();
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

// Continuous Listening Web Speech API Fallback (with Expo AudioRecorder on Native Mobile)
export function startContinuousListening(
  onResult: (text: string) => void,
  onError: (err: any) => void,
  language: "en" | "mr" = "en"
): { stop: () => void } {
  if (Platform.OS === 'web') {
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
  } else {
    // Native mobile build (Android / iOS) using expo-audio's recording API
    let recorderInstance: any = null;
    let isStopped = false;

    const startRecording = async () => {
      try {
        const permission = await requestRecordingPermissionsAsync();
        console.log("[Sarvam AI] Microphone permission status:", permission.status, "granted:", permission.granted);
        if (!permission.granted) {
          onError("Microphone permission not granted");
          return;
        }

        // Configure audio mode for recording
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        console.log("[Sarvam AI] Audio session configured for recording.");

        const recorder = new AudioModule.AudioRecorder({
          ...RecordingPresets.HIGH_QUALITY,
          android: {
            ...RecordingPresets.HIGH_QUALITY.android,
            audioSource: 'voice_communication'
          }
        });
        recorderInstance = recorder;

        console.log("[Sarvam AI] Preparing AudioRecorder...");
        await recorder.prepareToRecordAsync();
        if (isStopped) {
          console.log("[Sarvam AI] Recording was stopped before it could start.");
          return;
        }
        recorder.record();
        console.log("[Sarvam AI] Native recording started.");
      } catch (err: any) {
        console.error("[Sarvam AI] Audio recording preparation error:", err);
        onError(err.message || err);
      }
    };

    startRecording();

    return {
      stop: () => {
        isStopped = true;
        const performStop = async () => {
          try {
            if (recorderInstance) {
              console.log("[Sarvam AI] Stopping Native recording...");
              await recorderInstance.stop();
              console.log("[Sarvam AI] Native recording stopped.");
              const uri = recorderInstance.uri;
              console.log("[Sarvam AI] Recording URI captured:", uri);
              if (uri) {
                try {
                  const fileInfo = await FileSystem.getInfoAsync(uri);
                  if (fileInfo.exists) {
                    console.log("[Sarvam AI] Recording file info: exists=true, size=" + fileInfo.size + " bytes");
                  } else {
                    console.log("[Sarvam AI] Recording file info: exists=false");
                  }
                } catch (fiErr) {
                  console.error("[Sarvam AI] Error getting recording file info:", fiErr);
                }

                // Call transcribeAudio to transcribe with Sarvam AI REST API
                const transcript = await transcribeAudio(uri);
                onResult(transcript);
              } else {
                onError("No recording URI found");
              }
            }
          } catch (err: any) {
            console.error("[Sarvam AI] Stop recording and transcribe error:", err);
            onError(err.message || err);
          } finally {
            // Reset audio mode back to playback
            await setAudioModeAsync({
              allowsRecording: false,
            }).catch(() => {});
            console.log("[Sarvam AI] Audio session reset back to playback.");
          }
        };
        performStop();
      }
    };
  }
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
